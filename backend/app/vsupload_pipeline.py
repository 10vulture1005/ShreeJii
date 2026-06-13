"""
VSUpload — AI Processing Pipeline (v2 — Reference-First Design).

Pipeline philosophy:
  The REFERENCE IMAGE is the source of truth for the garment.
  Text prompts describe ONLY the scene, pose, and photography style.
  This prevents Imagen's internal bias from overriding the actual garment.

Orchestrates:
  1. Gemini Vision  → structured metadata for the product catalog
  2. Imagen 4 + SubjectReference → model photos matching the exact garment
  3. Imagen 4 text-only → fallback when reference-based generation fails

Each job processes one garment group (folder of photos) end-to-end.
"""

import json
import os
import time
import traceback
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from bson import ObjectId


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PROMPTS & CONSTANTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

METADATA_PROMPT = """\
You are an expert fashion product cataloguing assistant for Shree Ji, an Indian ethnic wear boutique.
Analyze the clothing item in this photo with maximum precision.

━━━━━━━━━━━━ CRITICAL RULES ━━━━━━━━━━━━
1. GARMENT TYPE: Identify the exact type. A Salwar Suit / Kurti / Salwar Kameez is NOT a Saree.
   Valid types include: Saree, Lehenga Choli, Anarkali, Salwar Suit, A-line Kurti, Palazzo Set,
   Sharara Set, Indo-Western Gown, Dupatta, Blouse.
2. COLOR: Report the dominant primary color exactly as seen in the photo. Do not guess.
3. ACCURACY: Your output drives automated mockup generation. Wrong style or color breaks the pipeline.
4. UNKNOWNS: If any attribute is genuinely unclear, use "Unknown" — never guess.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a valid JSON object. No preamble, no markdown fences, no trailing commas.

{
  "name": "3-6 word marketable product title, e.g. Royal Banarasi Silk Saree",
  "description": "2-3 sentences. Describe exact visual details: pattern, embroidery, color, drape, style.",
  "color": "Dominant primary color, e.g. Maroon, Rani Pink, Royal Blue, Sage Green, Ivory",
  "style": "Exact garment style, e.g. Salwar Suit, Anarkali, A-line Kurti, Lehenga Choli, Saree",
  "occasion": ["occasion1", "occasion2"],
  "sleeve": "Sleeve type, e.g. Sleeveless, Half Sleeve, Three-Quarter, Full Sleeve, Bell Sleeve",
  "neckline": "Neckline type, e.g. Round Neck, V-Neck, Sweetheart, Boat Neck, Square Neck",
  "fabric": "Fabric if identifiable, e.g. Silk, Georgette, Cotton. Use Unknown if unclear.",
  "length": "Garment length, e.g. Full Length, Knee Length, Ankle Length, Midi"
}"""

REQUIRED_METADATA_FIELDS = {"name", "description", "color", "style"}

# ── Scene-only prompts for reference-based generation ────────────
# These deliberately do NOT describe the garment at all.
# The SubjectReferenceImage carries the garment identity.

SCENE_PROMPTS = [
    (
        "Professional e-commerce catalog photo. Full-body shot of a fashion model, "
        "front-facing, natural standing posture. The model is wearing the provided outfit. "
        "Clean white studio background. Soft diffused professional lighting. "
        "Sharp focus, natural skin tones, realistic fabric draping. "
        "Photorealistic, ultra-detailed, 8K resolution. "
        "No accessories, no jewelry, no props, no text, no watermark.",
        "front",
    ),
    (
        "Professional e-commerce catalog photo. Full-body shot of a fashion model, "
        "elegant three-quarter angle, turned slightly to show side profile and silhouette. "
        "The model is wearing the provided outfit. "
        "Clean white studio background. Soft diffused professional lighting. "
        "Sharp focus, natural skin tones, realistic fabric draping. "
        "Photorealistic, ultra-detailed, 8K resolution. "
        "No accessories, no jewelry, no props, no text, no watermark.",
        "3quarter",
    ),
    (
        "Professional e-commerce catalog photo. Full-body shot of a fashion model, "
        "back-facing pose, turned away from camera to show rear design and back details. "
        "The model is wearing the provided outfit. "
        "Clean white studio background. Soft diffused professional lighting. "
        "Sharp focus, natural skin tones, realistic fabric draping. "
        "Photorealistic, ultra-detailed, 8K resolution. "
        "No accessories, no jewelry, no props, no text, no watermark.",
        "back",
    ),
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _clean_json_response(text: str) -> str:
    """Strip markdown fences and leading/trailing whitespace from an AI response."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _normalize_metadata(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Coerce and clean metadata fields into expected types."""
    if isinstance(raw.get("occasion"), str):
        raw["occasion"] = [raw["occasion"]]
    elif not isinstance(raw.get("occasion"), list):
        raw["occasion"] = []
    for key, val in raw.items():
        if isinstance(val, str):
            raw[key] = val.strip()
    return raw


def _validate_metadata(metadata: Dict[str, Any]) -> bool:
    """Return True only if all required fields are present and non-empty."""
    return all(metadata.get(f) for f in REQUIRED_METADATA_FIELDS)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  1. METADATA EXTRACTION — Gemini Vision
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def analyze_garment_gemini(
    image_bytes: bytes,
    mime_type: str,
    max_retries: int = 3,
) -> Optional[Dict[str, Any]]:
    """
    Use Gemini Vision to analyze a garment photo and return structured metadata.
    This metadata is used for the product catalog, NOT for image generation.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[VSUpload] GEMINI_API_KEY not set — skipping Gemini Vision")
        return None

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("[VSUpload] google-genai not installed")
        return None

    client = genai.Client(api_key=api_key)

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    types.Part.from_text(text=METADATA_PROMPT),
                ],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=512,
                ),
            )

            raw = _clean_json_response(response.text)
            metadata = json.loads(raw)
            metadata = _normalize_metadata(metadata)

            if not _validate_metadata(metadata):
                print(f"[VSUpload] Gemini attempt {attempt}: missing required fields — {metadata}")
                continue

            return metadata

        except json.JSONDecodeError as e:
            print(f"[VSUpload] Gemini attempt {attempt}: invalid JSON — {e}")
        except Exception as e:
            print(f"[VSUpload] Gemini attempt {attempt}: fatal error — {e}")
            break

    return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  2. IMAGE GENERATION — Imagen 4 + Subject Reference (Primary)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def generate_image_with_reference(
    prompt: str, image_bytes: bytes, api_key: str
) -> Optional[bytes]:
    """
    Generate an image using Imagen 4, passing the original garment photo
    as a SubjectReferenceImage. The text prompt describes ONLY the scene/pose.
    The reference image carries the garment identity.
    """
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        subject_ref = types.SubjectReferenceImage(
            reference_image=types.Image(image_bytes=image_bytes),
            reference_id=0,
            reference_type="SUBJECT",
        )

        response = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            reference_images=[subject_ref],
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="3:4",
                person_generation="ALLOW_ADULT",
            ),
        )

        if response.generated_images:
            return response.generated_images[0].image.image_bytes

        print("[VSUpload] Reference gen: Imagen returned no images")
        return None

    except Exception as e:
        print(f"[VSUpload] Reference gen: exception — {e}")
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  3. IMAGE GENERATION — Imagen 4 Text-Only (Fallback)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def build_fallback_prompts(metadata: Dict[str, Any]) -> List[Tuple[str, str]]:
    """
    Build text-only prompts from metadata. Used ONLY when reference-based
    generation fails completely. These are less accurate but better than nothing.
    """
    color = metadata.get("color", "")
    style = metadata.get("style", "")
    fabric = metadata.get("fabric", "Unknown")
    desc = metadata.get("description", "")

    garment_desc = f"a {color} {style} made of {fabric}. {desc}"

    poses = [
        ("front-facing, natural standing posture, garment fully visible", "front"),
        ("elegant three-quarter angle, showing side profile and silhouette", "3quarter"),
        ("back-facing, showing rear design and back details", "back"),
    ]

    prompts = []
    for pose_desc, angle in poses:
        prompt = (
            f"Professional e-commerce catalog photo. Full-body shot of a fashion model "
            f"with South Asian features wearing {garment_desc}. "
            f"Pose: {pose_desc}. "
            f"Clean white studio background. Soft professional lighting. "
            f"Sharp focus, realistic fabric draping, photorealistic, 8K. "
            f"No accessories, no text, no watermark."
        )
        prompts.append((prompt, angle))

    return prompts


def generate_single_image(prompt: str, api_key: str) -> Optional[bytes]:
    """
    Generate a single model photo using Imagen 4 (text-to-image, no reference).
    Falls back to a local PIL placeholder if Imagen is unavailable.
    """
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        response = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="3:4",
                person_generation="ALLOW_ADULT",
            ),
        )

        if response.generated_images:
            return response.generated_images[0].image.image_bytes

        print("[VSUpload] Imagen text-only: returned no images")
        return None

    except Exception as e:
        print(f"[VSUpload] Imagen text-only: failed — {e}")
        try:
            from PIL import Image, ImageDraw
            import io
            import random

            bg = (random.randint(180, 240), random.randint(180, 240), random.randint(180, 240))
            img = Image.new("RGB", (800, 1067), bg)
            draw = ImageDraw.Draw(img)
            draw.text(
                (100, 500),
                "AI Generated\nPlaceholder Model Image\n(Imagen Fallback)",
                fill=(50, 50, 50),
                spacing=10,
            )
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            print("[VSUpload] Generated local placeholder image")
            return buf.getvalue()
        except Exception as fallback_e:
            print(f"[VSUpload] Local placeholder also failed: {fallback_e}")
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  JOB ORCHESTRATOR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def process_job(job_id: str, db) -> None:
    """
    Main job processing pipeline. Runs as a FastAPI BackgroundTask.

    Steps:
      1. Load raw photos from MongoDB
      2. Select best representative photo (largest file)
      3. Extract metadata via Gemini Vision (for product catalog)
      4. Generate 3 model images:
         PRIMARY:  Imagen 4 + SubjectReference (scene-only prompts)
         FALLBACK: Imagen 4 text-to-image (metadata-based prompts)
      5. Store generated images + product document
      6. Update job status → under_review
    """
    try:
        # ── Mark job as processing ───────────────────────────────
        db.vsupload_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "processing", "updated_at": datetime.utcnow()}},
        )
        _update_batch_counts(job_id, db)

        # ── Load job document ────────────────────────────────────
        job = db.vsupload_jobs.find_one({"job_id": job_id})
        if not job:
            print(f"[VSUpload] Job {job_id} not found in database")
            return

        # ── Step 1: Load raw photos ──────────────────────────────
        raw_photo_ids = job.get("raw_photo_ids", [])
        if not raw_photo_ids:
            _fail_job(job_id, db, "invalid_input", "No photos found in job")
            return

        # ── Step 2: Select best photo (largest = highest quality) ─
        best_photo = None
        best_size = 0
        best_mime = "image/jpeg"

        for photo_id_str in raw_photo_ids:
            try:
                img_doc = db.images.find_one({"_id": ObjectId(photo_id_str)})
                if img_doc and img_doc.get("data"):
                    data = img_doc["data"]
                    size = len(data)
                    if size > best_size:
                        best_size = size
                        best_photo = data
                        best_mime = img_doc.get("content_type", "image/jpeg")
            except Exception as e:
                print(f"[VSUpload] Error loading photo {photo_id_str}: {e}")

        if not best_photo:
            _fail_job(job_id, db, "invalid_input", "Could not load any valid photos")
            return

        print(f"[VSUpload] Job {job_id}: Selected best photo ({best_size} bytes, {best_mime})")

        # ── Step 3: Extract metadata (for catalog, NOT for image gen)
        metadata = analyze_garment_gemini(best_photo, best_mime)

        if not metadata:
            _fail_job(
                job_id, db, "metadata_extraction_failed",
                "Gemini Vision failed to extract metadata",
            )
            return

        db.vsupload_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"ai_metadata": metadata, "updated_at": datetime.utcnow()}},
        )

        # ── Step 4: Generate model images ────────────────────────
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            _fail_job(job_id, db, "image_gen_failed", "GEMINI_API_KEY not configured")
            return

        max_images = int(os.getenv("MAX_IMAGES_PER_JOB", "3"))
        generated_images = []

        # ── PRIMARY: Reference-based (scene-only prompts + garment photo)
        #    The text prompt says nothing about the garment.
        #    The SubjectReferenceImage IS the garment.
        print(f"[VSUpload] Job {job_id}: Generating with SubjectReference (reference-first)")

        scene_prompts = SCENE_PROMPTS[:max_images]
        for prompt_text, angle in scene_prompts:
            # Retry each angle up to 2 times
            for attempt in range(2):
                img_out = generate_image_with_reference(prompt_text, best_photo, gemini_key)
                if img_out:
                    result = db.images.insert_one({
                        "filename": f"{job_id}_model_{angle}.jpg",
                        "content_type": "image/jpeg",
                        "data": img_out,
                        "source": "vsupload_generated_reference",
                        "job_id": job_id,
                        "created_at": datetime.utcnow(),
                    })
                    generated_images.append({
                        "image_id": str(result.inserted_id),
                        "angle": angle,
                        "url": f"/api/images/{result.inserted_id}",
                    })
                    print(f"[VSUpload] Job {job_id}: Reference {angle} → {result.inserted_id}")
                    break
                else:
                    if attempt < 1:
                        print(f"[VSUpload] Job {job_id}: Reference {angle} attempt {attempt+1} failed, retrying...")
                        time.sleep(5)

        # ── FALLBACK: Text-to-image (only if reference produced nothing)
        if not generated_images:
            print(f"[VSUpload] Job {job_id}: Reference flow produced 0 images. Falling back to text-to-image.")

            fallback_prompts = build_fallback_prompts(metadata)
            fallback_prompts = fallback_prompts[:max_images]

            for prompt_text, angle in fallback_prompts:
                image_bytes_out = None
                for attempt in range(3):
                    image_bytes_out = generate_single_image(prompt_text, gemini_key)
                    if image_bytes_out:
                        break
                    if attempt < 2:
                        wait = 10 * (attempt + 1)
                        print(f"[VSUpload] Imagen {angle} attempt {attempt+1} failed, retrying in {wait}s...")
                        time.sleep(wait)

                if image_bytes_out:
                    result = db.images.insert_one({
                        "filename": f"{job_id}_model_{angle}.jpg",
                        "content_type": "image/jpeg",
                        "data": image_bytes_out,
                        "source": "vsupload_generated_fallback",
                        "job_id": job_id,
                        "created_at": datetime.utcnow(),
                    })
                    generated_images.append({
                        "image_id": str(result.inserted_id),
                        "angle": angle,
                        "url": f"/api/images/{result.inserted_id}",
                    })
                    print(f"[VSUpload] Job {job_id}: Fallback {angle} → {result.inserted_id}")
                else:
                    print(f"[VSUpload] Job {job_id}: Fallback {angle} failed after 3 attempts")

        if not generated_images:
            _fail_job(
                job_id, db, "image_gen_failed",
                "Failed to generate any model images",
            )
            return

        # ── Step 5: Upsert product document ──────────────────────
        db.vsupload_products.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "batch_id": job.get("batch_id"),
                    "title": metadata.get("name", "Untitled"),
                    "description": metadata.get("description", ""),
                    "color": metadata.get("color"),
                    "style": metadata.get("style"),
                    "occasion": metadata.get("occasion", []),
                    "sleeve": metadata.get("sleeve"),
                    "neckline": metadata.get("neckline"),
                    "fabric": metadata.get("fabric"),
                    "length": metadata.get("length"),
                    "image_ids": [img["image_id"] for img in generated_images],
                    "raw_photo_ids": raw_photo_ids,
                    "status": "under_review",
                    "reviewed_at": None,
                    "reviewed_by": None,
                    "published_at": None,
                },
                "$setOnInsert": {
                    "job_id": job_id,
                    "price": None,
                    "sizes": [],
                    "category": None,
                    "sku": None,
                    "created_at": datetime.utcnow(),
                },
            },
            upsert=True,
        )

        # ── Step 6: Update job status → under_review ─────────────
        db.vsupload_jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "under_review",
                    "generated_images": generated_images,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        _update_batch_counts(job_id, db)

        print(
            f"[VSUpload] ✅ Job {job_id} completed — "
            f"{len(generated_images)} images generated, metadata extracted. "
            f"Status: under_review"
        )

    except Exception as e:
        print(f"[VSUpload] ❌ Job {job_id} failed with unexpected error: {e}")
        traceback.print_exc()
        _fail_job(job_id, db, "unknown_error", str(e))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HELPERS — Job status management
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _fail_job(job_id: str, db, error_code: str, error_message: str) -> None:
    """Mark a job as failed with error details."""
    db.vsupload_jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": "failed",
                "error_code": error_code,
                "error": error_message,
                "updated_at": datetime.utcnow(),
            },
            "$inc": {"retry_count": 1},
        },
    )
    _update_batch_counts(job_id, db)
    print(f"[VSUpload] Job {job_id} marked failed: [{error_code}] {error_message}")


def _update_batch_counts(job_id: str, db) -> None:
    """Aggregate job statuses and update the parent batch document."""
    job = db.vsupload_jobs.find_one({"job_id": job_id}, {"batch_id": 1})
    if not job:
        return

    batch_id = job.get("batch_id")
    if not batch_id:
        return

    pipeline = [
        {"$match": {"batch_id": batch_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]

    counts = {
        "queued": 0,
        "processing": 0,
        "under_review": 0,
        "published": 0,
        "rejected": 0,
        "failed": 0,
    }

    for result in db.vsupload_jobs.aggregate(pipeline):
        status_key = result["_id"]
        if status_key in counts:
            counts[status_key] = result["count"]

    db.vsupload_batches.update_one(
        {"batch_id": batch_id},
        {"$set": {"status_counts": counts, "updated_at": datetime.utcnow()}},
    )
