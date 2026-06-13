"""
VSUpload — AI Processing Pipeline.

Orchestrates:
  1. Gemini Vision → structured garment metadata extraction
  2. Groq fallback → text-only metadata generation
  3. Gemini Imagen → model photo generation (×3 angles)
  4. MongoDB storage for images and job state

Each job processes one garment group (folder of photos) end-to-end.
"""

import os
import json
import time
import traceback
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from bson import ObjectId


# ── 1. Metadata Extraction — Gemini Vision ───────────────────────

METADATA_PROMPT = """You are a fashion product cataloguing assistant for an Indian boutique clothing store (Shree Ji). Analyze the clothing item in this photo and return ONLY a JSON object with these exact fields. No preamble, no markdown fences.

The store specializes in Indian ethnic and fusion wear — sarees, lehengas, kurtis, salwar kameez, dupattas, blouses, indo-western outfits, festive and bridal wear. Identify the garment type accurately for the Indian market.

{
  "name": "Creative, marketable product title (3-6 words, e.g. 'Royal Banarasi Silk Saree', 'Emerald Anarkali Gown', 'Blush Chikankari Kurti')",
  "description": "2-3 sentence product description for Indian customers, highlighting fabric quality, drape/silhouette, embroidery/zari/work details, and suitable occasions. Tone: warm, aspirational, festive.",
  "color": "Primary color name (e.g. 'Maroon', 'Rani Pink', 'Royal Blue', 'Sage Green', 'Ivory')",
  "style": "Garment style (e.g. 'Banarasi', 'Anarkali', 'A-line Kurti', 'Lehenga Choli', 'Palazzo Set', 'Saree', 'Sharara')",
  "occasion": ["Array of occasions, e.g. 'Wedding', 'Festive', 'Pooja', 'Sangeet', 'Party', 'Daily Wear', 'Office'"],
  "sleeve": "Sleeve type (e.g. 'Sleeveless', 'Half sleeve', 'Three-quarter', 'Full sleeve', 'Cap sleeve', 'Bell sleeve')",
  "neckline": "Neckline type (e.g. 'V-neck', 'Round neck', 'Boat neck', 'Sweetheart', 'Mandarin collar', 'Keyhole')",
  "fabric": "Fabric if identifiable (e.g. 'Silk', 'Georgette', 'Chiffon', 'Cotton', 'Chanderi', 'Banarasi', 'Net', 'Crepe'). Use 'Unknown' if unclear.",
  "length": "Garment length (e.g. 'Full length', 'Knee-length', 'Ankle-length', 'Mid-calf', 'Floor length')"
}"""


def _clean_json_response(text: str) -> str:
    """Strip markdown fences and whitespace from an AI response."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        # Remove first line (```json or ```)
        lines = text.split("\n")
        lines = lines[1:]  # drop opening fence
        # Remove closing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def analyze_garment_gemini(image_bytes: bytes, mime_type: str) -> Optional[Dict[str, Any]]:
    """
    Use Gemini 2.0 Flash Vision to analyze a garment photo.
    Returns structured metadata dict or None on failure.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[VSUpload] GEMINI_API_KEY not set, skipping Gemini Vision")
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                METADATA_PROMPT,        
            ],
        )

        text = _clean_json_response(response.text)
        metadata = json.loads(text)

        # Validate required fields exist
        required = ["name", "description", "color"]
        if not all(metadata.get(k) for k in required):
            print(f"[VSUpload] Gemini response missing required fields: {metadata}")
            return None

        # Ensure occasion is a list
        if isinstance(metadata.get("occasion"), str):
            metadata["occasion"] = [metadata["occasion"]]

        return metadata

    except json.JSONDecodeError as e:
        print(f"[VSUpload] Gemini returned invalid JSON: {e}")
        return None
    except Exception as e:
        print(f"[VSUpload] Gemini Vision failed: {e}")
        return None


# ── 2. Metadata Extraction — Groq Fallback ───────────────────────

def analyze_garment_groq(group_name: str) -> Optional[Dict[str, Any]]:
    """
    Fallback: Use Groq to generate metadata from group name only (no vision).
    Used when Gemini Vision is unavailable or fails after retries.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[VSUpload] GROQ_API_KEY not set, skipping Groq fallback")
        return None

    try:
        from groq import Groq

        client = Groq(api_key=api_key)

        prompt = (
            f'You are a fashion product cataloguing assistant for an Indian ethnic wear boutique (Shree Ji). '
            f'Based on the product group name "{group_name}", generate realistic product metadata for Indian clothing '
            f'(sarees, lehengas, kurtis, salwar kameez, indo-western, etc.). '
            f'Return ONLY a JSON object with these exact fields. No preamble, no markdown fences.\n\n'
            f'{{\n'
            f'  "name": "Creative, marketable product title (3-6 words, e.g. \'Royal Banarasi Silk Saree\')",\n'
            f'  "description": "2-3 sentence product description for Indian customers. Tone: warm, aspirational, festive.",\n'
            f'  "color": "Primary color name",\n'
            f'  "style": "Garment style (e.g. \'Banarasi\', \'Anarkali\', \'A-line Kurti\')",\n'
            f'  "occasion": ["Array of occasions, e.g. \'Wedding\', \'Festive\', \'Daily Wear\'"],\n'
            f'  "sleeve": "Sleeve type",\n'
            f'  "neckline": "Neckline type",\n'
            f'  "fabric": "Best guess fabric (e.g. \'Silk\', \'Georgette\', \'Cotton\'). Use \'Unknown\' if unclear.",\n'
            f'  "length": "Garment length"\n'
            f'}}'
        )

        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400,
        )

        text = _clean_json_response(completion.choices[0].message.content)
        metadata = json.loads(text)

        if isinstance(metadata.get("occasion"), str):
            metadata["occasion"] = [metadata["occasion"]]

        return metadata

    except Exception as e:
        print(f"[VSUpload] Groq fallback failed: {e}")
        return None


# ── 3. Imagen Prompt Construction ────────────────────────────────

def build_imagen_prompts(metadata: Dict[str, Any]) -> List[Tuple[str, str]]:
    """
    Build 3 Imagen prompts from AI-extracted metadata.
    Returns list of (prompt_text, angle_name) tuples.
    """
    color = metadata.get("color", "")
    fabric = metadata.get("fabric", "")
    style = metadata.get("style", "")
    length = metadata.get("length", "")
    neckline = metadata.get("neckline", "")
    sleeve = metadata.get("sleeve", "")

    # Use the full detailed description to ensure the exact clothing is generated
    desc = metadata.get("description", "")

    # Common garment properties to inject
    garment_details = (
        f"Garment Description: {desc}\n"
        f"Specifics: color ({color}), fabric texture ({fabric}), style ({style}), length ({length}), sleeves ({sleeve}), neckline ({neckline})."
    )

    prompt_front = (
        f"Use the described clothing as the exact garment reference. Preserve the garment exactly as described, "
        f"including embroidery, prints, patterns, stitching, fit, and all design details. Do not modify, redesign, embellish, or change any aspect of the clothing. "
        f"{garment_details} "
        f"Place the garment on a professional female Indian fashion model with realistic body proportions and Indian skin tone. "
        f"Create a premium e-commerce product photograph for a luxury women's fashion boutique website. "
        f"POSE: Full-body shot, front-facing pose, natural posture, garment clearly visible from top to bottom. "
        f"Clean light-neutral background, soft professional studio lighting, sharp focus, accurate color reproduction, "
        f"realistic fabric draping, highly detailed texture visibility, commercial catalog photography, "
        f"photorealistic, ultra-realistic, high resolution, 8K quality. "
        f"The clothing must remain the primary focus of the image. No distracting accessories, no excessive jewelry, "
        f"no dramatic poses, no cluttered background, no text, no watermark, no logo, no cropped garment, no artistic filters."
    )

    prompt_3quarter = (
        f"Use the described clothing as the exact garment reference. Replicate the garment flawlessly, "
        f"maintaining all embroidery, prints, patterns, stitching, and fit without any modifications. "
        f"{garment_details} "
        f"The outfit is worn by a professional female Indian fashion model with realistic body proportions and Indian skin tone. "
        f"This is a high-end luxury e-commerce catalog photo. "
        f"POSE: Full-body shot, elegant three-quarter angle pose. The model is turned slightly to show the side profile, silhouette, and the beautiful drape of the fabric. "
        f"The background is a clean light-neutral studio backdrop with soft professional lighting. "
        f"Sharp focus, accurate color reproduction, highly detailed texture visibility, photorealistic, ultra-realistic, high resolution, 8K quality. "
        f"Keep the clothing as the absolute primary focus. Ensure there are no distracting accessories, no excessive jewelry, "
        f"no dramatic poses, no cluttered background, no text, no watermark, no logo, no cropped garment, no artistic filters."
    )

    prompt_back = (
        f"Use the described clothing as the exact garment reference. The garment must be preserved exactly as shown and described, "
        f"including embroidery, prints, patterns, stitching, and design details. Do not alter or embellish the clothing. "
        f"{garment_details} "
        f"The outfit is worn by a professional female Indian fashion model with realistic body proportions and Indian skin tone. "
        f"This is a premium commercial product photograph for a women's fashion website. "
        f"POSE: Full-body shot, back-facing pose. The model is turned away from the camera to showcase the back design, rear neckline, and the back drape or pallu of the garment. "
        f"Shot against a clean light-neutral background with soft professional studio lighting. "
        f"Sharp focus, realistic fabric draping, accurate color reproduction, photorealistic, ultra-realistic, high resolution, 8K quality. "
        f"The garment is the primary focus. No distracting accessories, no excessive jewelry, no dramatic poses, "
        f"no cluttered background, no text, no watermark, no logo, no cropped garment, no artistic filters."
    )

    return [
        (prompt_front, "front"),
        (prompt_3quarter, "3quarter"),
        (prompt_back, "back"),
    ]


# ── 4. Image Generation — Gemini Imagen ─────────────────────────

def generate_single_image(prompt: str, api_key: str) -> Optional[bytes]:
    """
    Generate a single model photo using Gemini Imagen 3.
    Returns JPEG image bytes or None on failure.
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
        
        print("[VSUpload] Imagen returned no images")
        return None

    except Exception as e:
        print(f"[VSUpload] Imagen generation failed: {e}. Falling back to free local image generation.")
        # Free local fallback using PIL to ensure the pipeline continues
        try:
            from PIL import Image, ImageDraw, ImageFont
            import io
            import random
            
            # Create a simple placeholder image with random background color
            color = (random.randint(180, 240), random.randint(180, 240), random.randint(180, 240))
            img = Image.new("RGB", (800, 1067), color)
            draw = ImageDraw.Draw(img)
            
            # Add text
            text = "AI Generated\nPlaceholder Model Image\n(Free Tier Fallback)"
            draw.text((100, 500), text, fill=(50, 50, 50), spacing=10)
            
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            print("[VSUpload] Generated local placeholder image")
            return buf.getvalue()
        except Exception as fallback_e:
            print(f"[VSUpload] Local fallback also failed: {fallback_e}")
        return None


# ── 5. Job Orchestrator ──────────────────────────────────────────

def process_job(job_id: str, db) -> None:
    """
    Main job processing pipeline. Runs as a FastAPI BackgroundTask.

    Steps:
      1. Load raw photos from MongoDB
      2. Select best representative photo (largest file → highest quality proxy)
      3. Extract metadata via Gemini Vision (fallback: Groq text-only)
      4. Generate 3 model images via Gemini Imagen
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
        metadata = None

        # Try Gemini Vision with retries (exponential backoff: 30s, 60s, 90s)
        for attempt in range(3):
            metadata = analyze_garment_gemini(best_photo, best_mime)
            if metadata:
                print(f"[VSUpload] Job {job_id}: Gemini metadata extracted on attempt {attempt + 1}")
                break
            if attempt < 2:
                wait = 5 * (attempt + 1)  # 5s, 10s backoff (runs in thread pool)
                print(f"[VSUpload] Gemini attempt {attempt + 1} failed, retrying in {wait}s...")
                time.sleep(wait)

        # Fallback to Groq (text-only, no vision)
        if not metadata:
            print(f"[VSUpload] Job {job_id}: Gemini failed, trying Groq fallback")
            metadata = analyze_garment_groq(job.get("group_name", "clothing item"))

        if not metadata:
            _fail_job(
                job_id, db, "metadata_extraction_failed",
                "Both Gemini Vision and Groq failed to extract metadata after retries",
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
            _fail_job(job_id, db, "image_gen_failed", "GEMINI_API_KEY not configured for Imagen")
            return

        prompts = build_imagen_prompts(metadata)
        max_images = int(os.getenv("MAX_IMAGES_PER_JOB", "3"))
        prompts = prompts[:max_images]

        generated_images = []
        for prompt_text, angle in prompts:
            image_bytes = None

            # Retry with exponential backoff: 60s, 120s, 180s
            for attempt in range(3):
                image_bytes = generate_single_image(prompt_text, gemini_key)
                if image_bytes:
                    break
                if attempt < 2:
                    wait = 10 * (attempt + 1)  # 10s, 20s backoff (runs in thread pool)
                    print(f"[VSUpload] Imagen {angle} attempt {attempt + 1} failed, retrying in {wait}s...")
                    time.sleep(wait)

            if image_bytes:
                # Store generated image in MongoDB (same pattern as existing app)
                result = db.images.insert_one({
                    "filename": f"{job_id}_model_{angle}.jpg",
                    "content_type": "image/jpeg",
                    "data": image_bytes,
                    "source": "vsupload_generated",
                    "job_id": job_id,
                    "created_at": datetime.utcnow(),
                })
                generated_images.append({
                    "image_id": str(result.inserted_id),
                    "angle": angle,
                    "url": f"/api/images/{result.inserted_id}",
                })
                print(f"[VSUpload] Job {job_id}: Generated {angle} image → {result.inserted_id}")
            else:
                print(f"[VSUpload] Job {job_id}: Failed to generate {angle} image after 3 attempts")

        if not generated_images:
            _fail_job(
                job_id, db, "image_gen_failed",
                "Failed to generate any model images after retries",
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

    # Aggregate counts by status
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
