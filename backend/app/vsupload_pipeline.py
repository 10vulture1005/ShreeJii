"""
VSUpload — AI Processing Pipeline.

Orchestrates:
  1. analyze_garment_gemini()  — Gemini Vision (primary, with retry)
  2. analyze_garment_groq()    — Groq/Llama text fallback (no vision)
  3. build_imagen_prompts()    — Build 3 Imagen prompts from metadata
  4. generate_prompts_from_vision() — Vision-driven prompt generation (advanced)
  5. generate_image_with_reference() — Imagen with subject reference image
  6. generate_single_image()   — Imagen text-to-image fallback
  7. process_job()             — Job orchestrator (MongoDB + background task)

Each job processes one garment group (folder of photos) end-to-end.
"""

import json
import os
import time
import traceback
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from bson import ObjectId


# ── Prompts ───────────────────────────────────────────────────────

# Vision prompt: sent to Gemini alongside the image bytes.
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
  "description": "2-3 sentences. Describe exact visual details: pattern, embroidery, color, drape, style. Tone: warm, aspirational, festive.",
  "color": "Dominant primary color, e.g. Maroon, Rani Pink, Royal Blue, Sage Green, Ivory",
  "style": "Exact garment style, e.g. Salwar Suit, Anarkali, A-line Kurti, Lehenga Choli, Saree",
  "occasion": ["occasion1", "occasion2"],
  "sleeve": "Sleeve type, e.g. Sleeveless, Half Sleeve, Three-Quarter, Full Sleeve, Bell Sleeve",
  "neckline": "Neckline type, e.g. Round Neck, V-Neck, Sweetheart, Boat Neck, Square Neck",
  "fabric": "Fabric if identifiable, e.g. Silk, Georgette, Cotton. Use Unknown if unclear.",
  "length": "Garment length, e.g. Full Length, Knee Length, Ankle Length, Midi"
}"""


# Text-only fallback prompt: sent to Groq when no image is available.
# Uses .format(group_name=...) at call time.
GROQ_FALLBACK_PROMPT = """\
You are a fashion product cataloguing assistant for Shree Ji, an Indian ethnic wear boutique \
(specialising in sarees, lehengas, kurtis, salwar kameez, and indo-western wear).

Given only the product group name below, infer realistic metadata for an Indian ethnic garment.
Return ONLY a valid JSON object — no preamble, no markdown, no trailing commas.

Product group name: "{group_name}"

{{
  "name": "3-6 word marketable product title",
  "description": "2-3 warm, aspirational sentences for Indian customers",
  "color": "Primary color",
  "style": "Garment style, e.g. Banarasi Saree, Anarkali, A-line Kurti",
  "occasion": ["occasion1", "occasion2"],
  "sleeve": "Sleeve type",
  "neckline": "Neckline type",
  "fabric": "Most likely fabric, or Unknown",
  "length": "Garment length"
}}"""


# Shared image-quality constraints appended to every Imagen prompt.
_IMAGEN_CONSTRAINTS = (
    "Clean light-neutral studio background. Soft professional lighting. "
    "Sharp focus, accurate color reproduction, realistic fabric draping, "
    "highly detailed texture. Photorealistic, ultra-realistic, 8K. "
    "No accessories, no text, no watermarks, no logo, no cropped garment, no artistic filters."
)

REQUIRED_METADATA_FIELDS = {"name", "description", "color", "style"}


# ── Helpers ───────────────────────────────────────────────────────

def _clean_json_response(text: str) -> str:
    """Strip markdown fences and leading/trailing whitespace from an AI response."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # drop opening fence (```json or ```)
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _normalize_metadata(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Coerce and clean metadata fields into expected types."""
    # occasion must always be a list
    if isinstance(raw.get("occasion"), str):
        raw["occasion"] = [raw["occasion"]]
    elif not isinstance(raw.get("occasion"), list):
        raw["occasion"] = []

    # Strip whitespace from every string field
    for key, val in raw.items():
        if isinstance(val, str):
            raw[key] = val.strip()

    return raw


def _validate_metadata(metadata: Dict[str, Any]) -> bool:
    """Return True only if all required fields are present and non-empty."""
    return all(metadata.get(f) for f in REQUIRED_METADATA_FIELDS)


# ── 1. Metadata Extraction — Gemini Vision (Primary) ─────────────

def analyze_garment_gemini(
    image_bytes: bytes,
    mime_type: str,
    max_retries: int = 2,
) -> Optional[Dict[str, Any]]:
    """
    Use Gemini Vision to analyze a garment photo and return structured metadata.
    Retries on JSON parse failures up to `max_retries` times.
    Returns a normalized metadata dict, or None on total failure.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[VSUpload] GEMINI_API_KEY not set — skipping Gemini Vision")
        return None

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("[VSUpload] google-genai not installed — pip install google-genai")
        return None

    client = genai.Client(api_key=api_key)

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    types.Part.from_text(text=METADATA_PROMPT),
                ],
                config=types.GenerateContentConfig(
                    temperature=0.2,        # low = consistent structured output
                    max_output_tokens=512,
                ),
            )

            raw = _clean_json_response(response.text)
            metadata = json.loads(raw)
            metadata = _normalize_metadata(metadata)

            if not _validate_metadata(metadata):
                print(f"[VSUpload] Gemini attempt {attempt}: missing required fields — {metadata}")
                continue  # retry

            return metadata

        except json.JSONDecodeError as e:
            print(f"[VSUpload] Gemini attempt {attempt}: invalid JSON — {e}")
            # JSON failure is recoverable; retry

        except Exception as e:
            print(f"[VSUpload] Gemini attempt {attempt}: fatal error — {e}")
            break  # auth / quota / network failures won't resolve on retry

    return None


# ── 2. Metadata Extraction — Groq Fallback (Text Only) ───────────

def analyze_garment_groq(group_name: str) -> Optional[Dict[str, Any]]:
    """
    Text-only fallback: infer product metadata from the group name using Groq/Llama.
    Used when Gemini Vision is unavailable or exhausts its retries.
    Note: no image is analyzed here — accuracy depends entirely on the group name.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[VSUpload] GROQ_API_KEY not set — skipping Groq fallback")
        return None

    try:
        from groq import Groq
    except ImportError:
        print("[VSUpload] groq not installed — pip install groq")
        return None

    client = Groq(api_key=api_key)

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a fashion product cataloguing assistant for an Indian ethnic wear boutique. "
                        "Respond ONLY with a valid JSON object. No preamble, no markdown, no explanation."
                    ),
                },
                {
                    "role": "user",
                    "content": GROQ_FALLBACK_PROMPT.format(group_name=group_name),
                },
            ],
            temperature=0.3,
            max_tokens=512,
        )

        raw = _clean_json_response(completion.choices[0].message.content)
        metadata = json.loads(raw)
        metadata = _normalize_metadata(metadata)

        if not _validate_metadata(metadata):
            print(f"[VSUpload] Groq fallback: missing required fields — {metadata}")
            return None

        return metadata

    except json.JSONDecodeError as e:
        print(f"[VSUpload] Groq fallback: invalid JSON — {e}")
        return None
    except Exception as e:
        print(f"[VSUpload] Groq fallback: error — {e}")
        return None


# ── 3. Imagen Prompt Construction ────────────────────────────────

def build_imagen_prompts(metadata: Dict[str, Any]) -> List[Tuple[str, str]]:
    """
    Build 3 Imagen prompts (front, 3-quarter, back) from garment metadata.
    Returns list of (prompt_text, angle_name) tuples.
    Raises ValueError if required fields (color, style) are missing.
    """
    missing = [f for f in ("color", "style") if not metadata.get(f)]
    if missing:
        raise ValueError(f"build_imagen_prompts: missing required fields: {missing}")

    color    = metadata["color"]
    style    = metadata["style"]
    fabric   = metadata.get("fabric", "Unknown")
    length   = metadata.get("length", "")
    neckline = metadata.get("neckline", "")
    sleeve   = metadata.get("sleeve", "")
    desc     = metadata.get("description", "")

    # Garment identity block — shared across all three angles
    garment_spec = (
        f"Garment: {style}. Color: {color}. Fabric: {fabric}. "
        f"Length: {length}. Sleeve: {sleeve}. Neckline: {neckline}. "
        f"Details: {desc}"
    )

    # Common base shared across all three prompts
    base = (
        f"STRICT REQUIREMENT — render exactly a {style} in {color}. "
        f"Preserve ALL design details: embroidery, prints, patterns, stitching, and drape. "
        f"Do not alter, redesign, or embellish the garment. {garment_spec}. "
        f"Worn by a professional female fashion model with South Asian features and realistic proportions. "
        f"Premium luxury e-commerce catalog photo. "
    )

    poses = [
        (
            "POSE: Full-body, front-facing, natural standing posture. "
            "Garment fully visible from top to bottom.",
            "front",
        ),
        (
            "POSE: Full-body, elegant three-quarter angle. "
            "Model turned slightly to reveal side profile, silhouette, and fabric drape.",
            "3quarter",
        ),
        (
            "POSE: Full-body, back-facing. "
            "Model turned away from camera to showcase rear design, back neckline, and back drape or pallu.",
            "back",
        ),
    ]

    return [(base + pose + " " + _IMAGEN_CONSTRAINTS, angle) for pose, angle in poses]


# ── 4. Image Generation — Advanced Vision Flow ──────────────────

def generate_prompts_from_vision(
    image_bytes: bytes, mime_type: str, api_key: str
) -> Optional[List[Tuple[str, str]]]:
    """
    Uses Gemini Vision to analyze the garment photo and generate 3 highly detailed
    Imagen prompts tailored to the exact garment seen in the image.
    Returns list of (prompt_text, angle_name) or None on failure.
    """
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        prompt = (
            "You are an expert AI prompt engineer for fashion catalog image generation. "
            "Analyze the clothing item in this image with extreme precision. "
            "Write 3 highly detailed, photorealistic image generation prompts "
            "to recreate this EXACT garment on a professional fashion model with South Asian features. "
            "\n\n"
            "CRITICAL RULES:\n"
            "1. Identify the EXACT garment type (suit, kurti, lehenga, saree, etc.).\n"
            "2. If the garment is NOT a saree, you MUST include this phrase in EVERY prompt: "
            "'(This is strictly a [style], NOT a saree. Do NOT generate a saree.)'\n"
            "3. Specify the EXACT primary color as seen in the photo.\n"
            "4. Describe fabric texture, embroidery, prints, patterns, and all design details.\n"
            "5. Each prompt should specify a different angle: front, 3-quarter, and back.\n"
            "6. End each prompt with: 'Clean studio background, soft lighting, 8K, photorealistic.'\n"
            "\n"
            "Return ONLY a JSON array of exactly 3 prompt strings. No markdown fences.\n"
            'Example: ["Front view prompt...", "3-quarter view prompt...", "Back view prompt..."]'
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                types.Part.from_text(text=prompt),
            ],
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=1500,
            ),
        )

        text = _clean_json_response(response.text)
        prompts_list = json.loads(text)

        if isinstance(prompts_list, list) and len(prompts_list) >= 3:
            return [
                (str(prompts_list[0]), "front"),
                (str(prompts_list[1]), "3quarter"),
                (str(prompts_list[2]), "back"),
            ]
        print(f"[VSUpload] Vision prompt gen: expected 3 prompts, got {len(prompts_list) if isinstance(prompts_list, list) else type(prompts_list)}")
        return None

    except json.JSONDecodeError as e:
        print(f"[VSUpload] Vision prompt gen: invalid JSON — {e}")
        return None
    except Exception as e:
        print(f"[VSUpload] Vision prompt gen: failed — {e}")
        return None


# ── 5. Image Generation — Imagen with Subject Reference ──────────

def generate_image_with_reference(
    prompt: str, image_bytes: bytes, api_key: str
) -> Optional[bytes]:
    """
    Generate an image using Imagen 4 via REST API, passing the original
    garment photo as a Subject Reference so Imagen visually matches it.
    Returns JPEG bytes or None on failure.
    """
    try:
        import requests
        import base64

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"imagen-4.0-generate-001:predict?key={api_key}"
        )
        encoded_img = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "instances": [{"prompt": prompt}],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": "3:4",
                "personGeneration": "ALLOW_ADULT",
                "negativePrompt": "saree, sari, traditional wrap, messy, multiple people, ugly",
                "referenceImages": [
                    {
                        "referenceType": "SUBJECT",
                        "referenceImage": {
                            "bytesBase64Encoded": encoded_img,
                        },
                    }
                ],
            },
        }

        resp = requests.post(url, json=payload, timeout=120)
        if resp.status_code == 200:
            data = resp.json()
            predictions = data.get("predictions", [])
            if predictions:
                b64_out = predictions[0].get("bytesBase64Encoded")
                if b64_out:
                    return base64.b64decode(b64_out)
            print("[VSUpload] Reference image: API returned 200 but no image data")
        else:
            print(f"[VSUpload] Reference image: {resp.status_code} — {resp.text[:300]}")
        return None

    except Exception as e:
        print(f"[VSUpload] Reference image: exception — {e}")
        return None


# ── 6. Image Generation — Imagen Text-to-Image Fallback ─────────

def generate_single_image(prompt: str, api_key: str) -> Optional[bytes]:
    """
    Generate a single model photo using Imagen 4 (text-to-image, no reference).
    Falls back to a local PIL placeholder if Imagen is unavailable.
    Returns JPEG image bytes or None on total failure.
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
                negative_prompt="saree, sari, traditional wrap, messy, multiple people, ugly",
            ),
        )

        if response.generated_images:
            return response.generated_images[0].image.image_bytes

        print("[VSUpload] Imagen returned no images")
        return None

    except Exception as e:
        print(f"[VSUpload] Imagen failed: {e} — trying local placeholder")
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


# ── 7. Job Orchestrator ──────────────────────────────────────────

def process_job(job_id: str, db) -> None:
    """
    Main job processing pipeline. Runs as a FastAPI BackgroundTask.

    Steps:
      1. Load raw photos from MongoDB
      2. Select best representative photo (largest file → highest quality proxy)
      3. Extract metadata via Gemini Vision (fallback: Groq text-only)
      4. Generate 3 model images (advanced: vision + reference → fallback: text-to-image)
      5. Store generated images in MongoDB `images` collection
      6. Create product document in `vsupload_products`
      7. Update job status → under_review
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

        # ── Step 3: Extract metadata ─────────────────────────────
        metadata = analyze_garment_gemini(best_photo, best_mime)

        if not metadata:
            print(f"[VSUpload] Job {job_id}: Gemini failed, trying Groq fallback")
            metadata = analyze_garment_groq(job.get("group_name", "clothing item"))

        if not metadata:
            _fail_job(
                job_id, db, "metadata_extraction_failed",
                "Both Gemini Vision and Groq failed to extract metadata",
            )
            return

        # Save metadata to job document
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
        advanced_success = False

        # ── Advanced Flow: Vision-generated prompts + reference image
        print(f"[VSUpload] Job {job_id}: Attempting advanced Vision → Reference Image flow")
        vision_prompts = generate_prompts_from_vision(best_photo, best_mime, gemini_key)

        if vision_prompts:
            vision_prompts = vision_prompts[:max_images]
            for prompt_text, angle in vision_prompts:
                print(f"[VSUpload] Job {job_id}: Advanced generating {angle}...")
                img_out = generate_image_with_reference(prompt_text, best_photo, gemini_key)
                if img_out:
                    result = db.images.insert_one({
                        "filename": f"{job_id}_model_{angle}.jpg",
                        "content_type": "image/jpeg",
                        "data": img_out,
                        "source": "vsupload_generated_advanced",
                        "job_id": job_id,
                        "created_at": datetime.utcnow(),
                    })
                    generated_images.append({
                        "image_id": str(result.inserted_id),
                        "angle": angle,
                        "url": f"/api/images/{result.inserted_id}",
                    })
                    print(f"[VSUpload] Job {job_id}: Advanced {angle} → {result.inserted_id}")
                else:
                    print(f"[VSUpload] Job {job_id}: Advanced {angle} failed")

            if generated_images:
                advanced_success = True
                print(f"[VSUpload] Job {job_id}: Advanced flow succeeded — {len(generated_images)} images")

        # ── Fallback Flow: metadata-based prompts, text-to-image only
        if not advanced_success:
            print(f"[VSUpload] Job {job_id}: Advanced flow failed. Falling back to text-to-image.")
            generated_images = []

            try:
                prompts = build_imagen_prompts(metadata)
            except ValueError as e:
                _fail_job(job_id, db, "image_gen_failed", str(e))
                return

            prompts = prompts[:max_images]

            for prompt_text, angle in prompts:
                image_bytes_out = None

                for attempt in range(3):
                    image_bytes_out = generate_single_image(prompt_text, gemini_key)
                    if image_bytes_out:
                        break
                    if attempt < 2:
                        wait = 10 * (attempt + 1)
                        print(f"[VSUpload] Imagen {angle} attempt {attempt + 1} failed, retrying in {wait}s...")
                        time.sleep(wait)

                if image_bytes_out:
                    result = db.images.insert_one({
                        "filename": f"{job_id}_model_{angle}.jpg",
                        "content_type": "image/jpeg",
                        "data": image_bytes_out,
                        "source": "vsupload_generated",
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
                "Failed to generate any model images via advanced or fallback methods",
            )
            return

        # ── Step 5: Upsert product document (avoids duplicates on retry/regenerate)
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


# ── Helper: Mark job as failed ───────────────────────────────────

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


# ── Helper: Recalculate batch status counts ──────────────────────

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
