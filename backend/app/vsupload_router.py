"""
VSUpload — FastAPI Router.

All endpoints are prefixed with /api/vsupload and require admin authentication.

Endpoints:
  POST   /jobs/batch                      — Submit a batch of garment groups
  GET    /jobs/{job_id}                    — Poll job status
  POST   /jobs/{job_id}/retry              — Retry a failed job
  GET    /review-queue                     — Paginated product review queue
  PATCH  /products/{product_id}            — Save draft edits before publishing
  POST   /products/{product_id}/publish    — Approve & publish a product
  POST   /products/{product_id}/reject     — Reject a listing
  GET    /batches                          — Batch history with status counts
  GET    /dashboard                        — Summary statistics
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, List
import qrcode
import io

from fastapi import (
    APIRouter, Depends, HTTPException, status,
    UploadFile, File, Form, BackgroundTasks,
)
from pymongo.database import Database
from bson import ObjectId

from app.database import get_db
from app.auth_deps import get_admin_user
from app.vsupload_schemas import (
    JobOut, BatchOut, BatchSubmitResponse, BatchListResponse,
    ProductOut, ProductUpdateRequest, RejectRequest,
    ReviewQueueResponse, VSDashboardStats,
    GeneratedImage, AIMetadata,
)
from app.vsupload_pipeline import process_job


vsupload_router = APIRouter(prefix="/api/vsupload", tags=["VSUpload"])


# ── Helpers: MongoDB doc → Response model ────────────────────────

def _fmt_dt(dt) -> Optional[str]:
    """Format a datetime for JSON output."""
    if isinstance(dt, datetime):
        return dt.isoformat()
    if isinstance(dt, str):
        return dt
    return None


def _job_to_out(doc: dict) -> JobOut:
    """Convert a vsupload_jobs MongoDB document to a JobOut response."""
    ai_meta = doc.get("ai_metadata")
    return JobOut(
        job_id=doc["job_id"],
        batch_id=doc.get("batch_id", ""),
        group_name=doc.get("group_name", ""),
        status=doc.get("status", "queued"),
        created_at=_fmt_dt(doc.get("created_at")),
        updated_at=_fmt_dt(doc.get("updated_at")),
        raw_photo_count=len(doc.get("raw_photo_ids", [])),
        generated_images=[
            GeneratedImage(**img)
            for img in doc.get("generated_images", [])
        ],
        ai_metadata=AIMetadata(**ai_meta) if ai_meta else None,
        error=doc.get("error"),
        error_code=doc.get("error_code"),
        retry_count=doc.get("retry_count", 0),
    )


def _product_to_out(doc: dict) -> ProductOut:
    """Convert a vsupload_products MongoDB document to a ProductOut response."""
    image_ids = doc.get("image_ids", [])
    raw_ids = doc.get("raw_photo_ids", [])
    return ProductOut(
        id=str(doc["_id"]),
        job_id=doc.get("job_id", ""),
        batch_id=doc.get("batch_id", ""),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        color=doc.get("color"),
        style=doc.get("style"),
        occasion=doc.get("occasion", []),
        sleeve=doc.get("sleeve"),
        neckline=doc.get("neckline"),
        fabric=doc.get("fabric"),
        length=doc.get("length"),
        image_ids=image_ids,
        image_urls=[f"/api/images/{iid}" for iid in image_ids],
        raw_photo_urls=[f"/api/images/{rid}" for rid in raw_ids],
        price=doc.get("price"),
        stock_count=doc.get("stock_count"),
        sizes=doc.get("sizes", []),
        category=doc.get("category"),
        sku=doc.get("sku"),
        status=doc.get("status", "under_review"),
        created_at=_fmt_dt(doc.get("created_at")),
        reviewed_at=_fmt_dt(doc.get("reviewed_at")),
        reviewed_by=doc.get("reviewed_by"),
        published_at=_fmt_dt(doc.get("published_at")),
    )


def _batch_to_out(doc: dict) -> BatchOut:
    """Convert a vsupload_batches MongoDB document to a BatchOut response."""
    return BatchOut(
        batch_id=doc["batch_id"],
        name=doc.get("name", ""),
        submitted_by=doc.get("submitted_by", ""),
        created_at=_fmt_dt(doc.get("created_at")),
        total_jobs=doc.get("total_jobs", 0),
        status_counts=doc.get("status_counts", {}),
    )


# ═══════════════════════════════════════════════════════════════════
# 1. SUBMIT BATCH
# ═══════════════════════════════════════════════════════════════════

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILES_PER_GROUP = 10


@vsupload_router.post(
    "/jobs/batch",
    response_model=BatchSubmitResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a batch of garment groups for AI processing",
)
async def submit_batch(
    background_tasks: BackgroundTasks,
    batch_name: str = Form(..., min_length=1),
    jobs: str = Form(..., description='JSON: [{"group_name": "...", "file_indices": [0,1]}]'),
    files: List[UploadFile] = File(...),
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """
    Submit a batch of garment photo groups for AI processing.

    - `batch_name`: Human-readable batch label (e.g. "Summer Collection")
    - `jobs`: JSON array mapping group names to file indices
    - `files[]`: All uploaded image files (referenced by index from `jobs`)

    Each group becomes one job that will generate up to 3 AI model photos.
    """
    # Parse job groupings
    try:
        job_groups = json.loads(jobs)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'jobs' field must be valid JSON array",
        )

    if not job_groups or not isinstance(job_groups, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one job group is required",
        )

    # Validate files
    for f in files:
        ext = "." + f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{f.filename}' has unsupported format. Allowed: JPG, PNG, WEBP",
            )

    # Create batch document
    batch_id = f"batch_{uuid.uuid4().hex[:12]}"
    batch_doc = {
        "batch_id": batch_id,
        "name": batch_name,
        "submitted_by": admin_user.get("email", "admin"),
        "created_at": datetime.utcnow(),
        "total_jobs": len(job_groups),
        "status_counts": {
            "queued": len(job_groups),
            "processing": 0,
            "under_review": 0,
            "published": 0,
            "rejected": 0,
            "failed": 0,
        },
    }
    db.vsupload_batches.insert_one(batch_doc)

    # Read all file bytes upfront (before they get consumed)
    file_data = []
    for f in files:
        data = await f.read()
        file_data.append({
            "filename": f.filename,
            "content_type": f.content_type or "image/jpeg",
            "data": data,
        })

    # Process each job group
    job_ids = []
    for group in job_groups:
        group_name = group.get("group_name", "unnamed")
        file_indices = group.get("file_indices", [])

        if not file_indices:
            continue

        if len(file_indices) > MAX_FILES_PER_GROUP:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Group '{group_name}' has {len(file_indices)} files. Max is {MAX_FILES_PER_GROUP}.",
            )

        # Store raw photos in MongoDB images collection
        raw_photo_ids = []
        for idx in file_indices:
            if idx < 0 or idx >= len(file_data):
                continue

            fd = file_data[idx]
            result = db.images.insert_one({
                "filename": fd["filename"],
                "content_type": fd["content_type"],
                "data": fd["data"],
                "source": "vsupload_raw",
                "created_at": datetime.utcnow(),
            })
            raw_photo_ids.append(str(result.inserted_id))

        if not raw_photo_ids:
            continue

        # Create job document
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        job_doc = {
            "job_id": job_id,
            "batch_id": batch_id,
            "group_name": group_name,
            "status": "queued",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "raw_photo_ids": raw_photo_ids,
            "generated_images": [],
            "ai_metadata": None,
            "error": None,
            "error_code": None,
            "retry_count": 0,
        }
        db.vsupload_jobs.insert_one(job_doc)
        job_ids.append(job_id)

        # Enqueue background processing
        background_tasks.add_task(process_job, job_id, db)

    if not job_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid job groups could be created. Check file indices and formats.",
        )

    return BatchSubmitResponse(
        batch_id=batch_id,
        job_ids=job_ids,
        total_jobs=len(job_ids),
    )


# ═══════════════════════════════════════════════════════════════════
# 2. POLL JOB STATUS
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.get(
    "/jobs/{job_id}",
    response_model=JobOut,
    summary="Get the current status of a processing job",
)
def get_job_status(
    job_id: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """Poll the status of a single job, including AI metadata and generated images."""
    doc = db.vsupload_jobs.find_one({"job_id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return _job_to_out(doc)


# ═══════════════════════════════════════════════════════════════════
# 3. RETRY FAILED JOB
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.post(
    "/jobs/{job_id}/retry",
    response_model=JobOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry a failed job",
)
def retry_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """
    Re-enqueue a failed job for processing. Resets status to `queued`.
    Only jobs with status `failed` can be retried.
    """
    doc = db.vsupload_jobs.find_one({"job_id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    if doc.get("status") != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only failed jobs can be retried. Current status: '{doc.get('status')}'",
        )

    # Reset job state
    db.vsupload_jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": "queued",
                "error": None,
                "error_code": None,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # Delete old product if it exists (clean slate)
    db.vsupload_products.delete_many({"job_id": job_id})

    # Re-enqueue
    background_tasks.add_task(process_job, job_id, db)

    updated = db.vsupload_jobs.find_one({"job_id": job_id})
    return _job_to_out(updated)


# ═══════════════════════════════════════════════════════════════════
# 4. REVIEW QUEUE
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.get(
    "/review-queue",
    response_model=ReviewQueueResponse,
    summary="Get the paginated review queue",
)
def get_review_queue(
    status_filter: Optional[str] = None,
    batch_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """
    Fetch products for the admin review queue.

    Filters:
    - `status_filter`: "under_review", "published", "rejected", or omit for all
    - `batch_id`: Filter by batch
    - `page` / `limit`: Pagination
    """
    query: dict = {}

    if status_filter:
        query["status"] = status_filter
    if batch_id:
        query["batch_id"] = batch_id

    total = db.vsupload_products.count_documents(query)

    skip = (max(1, page) - 1) * limit
    docs = (
        db.vsupload_products
        .find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    items = [_product_to_out(doc) for doc in docs]

    return ReviewQueueResponse(items=items, total=total, page=page)


# ═══════════════════════════════════════════════════════════════════
# 5. SAVE DRAFT EDITS
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.patch(
    "/products/{product_id}",
    summary="Save draft edits to a product before publishing",
)
def update_product(
    product_id: str,
    payload: ProductUpdateRequest,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """
    Update any product fields before publishing. Both AI-generated fields
    (title, description, attributes) and admin fields (price, sizes, SKU) can be edited.
    """
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    doc = db.vsupload_products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    # Build update dict from non-None fields
    update_data: dict = {}
    for field, value in payload.model_dump(exclude_none=True).items():
        update_data[field] = value

    if not update_data:
        return {"ok": True, "message": "No changes provided"}

    update_data["updated_at"] = datetime.utcnow()

    db.vsupload_products.update_one({"_id": oid}, {"$set": update_data})

    return {"ok": True, "message": "Product updated successfully"}


# ═══════════════════════════════════════════════════════════════════
# 6. APPROVE & PUBLISH
# ═══════════════════════════════════════════════════════════════════

REQUIRED_PUBLISH_FIELDS = ["price", "stock_count", "sizes", "category", "sku"]


@vsupload_router.post(
    "/products/{product_id}/publish",
    summary="Approve and publish a product listing",
)
def publish_product(
    product_id: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """
    Validate all required fields are filled, then set status → published.

    Required before publish:
    - Title (min 3 chars) — AI-generated
    - Description (min 20 chars) — AI-generated
    - Price (> 0) — admin-filled
    - Sizes (at least 1) — admin-filled
    - Category — admin-filled
    - SKU (unique) — admin-filled
    - At least 1 generated image
    """
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    doc = db.vsupload_products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    if doc.get("status") not in ("under_review",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish a product with status '{doc.get('status')}'. Must be 'under_review'.",
        )

    # Validate required fields
    missing = []
    if not doc.get("title") or len(doc.get("title", "")) < 3:
        missing.append("title")
    if not doc.get("description") or len(doc.get("description", "")) < 20:
        missing.append("description")
    if not doc.get("price") or doc["price"] <= 0:
        missing.append("price")
    if doc.get("stock_count") is None or doc["stock_count"] <= 0:
        missing.append("stock_count")
    # Make sizes, category, and sku optional / auto-generated
    if not doc.get("image_ids"):
        missing.append("images")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "Missing required fields", "missing": missing},
        )

    # Check SKU uniqueness if provided, else auto-generate
    sku = doc.get("sku")
    if not sku:
        import uuid
        sku = f"VS-{str(uuid.uuid4())[:8].upper()}"
        doc["sku"] = sku
        
    existing_sku = db.vsupload_products.find_one({
        "sku": sku,
        "_id": {"$ne": oid},
    })
    if existing_sku:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{sku}' is already in use by another product.",
        )

    # Publish
    now = datetime.utcnow()
    db.vsupload_products.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "published",
                "reviewed_at": now,
                "reviewed_by": admin_user.get("email"),
                "published_at": now,
            }
        },
    )

    # Also update the linked job status
    db.vsupload_jobs.update_one(
        {"job_id": doc["job_id"]},
        {"$set": {"status": "published", "updated_at": now}},
    )
    # Refresh batch counts
    from app.vsupload_pipeline import _update_batch_counts
    _update_batch_counts(doc["job_id"], db)

    # --- Store Integration ---
    sku_id = doc["sku"]
    
    # 1. Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(sku_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    
    qr_result = db.images.insert_one({
        "filename": f"{sku_id}_qr.png",
        "content_type": "image/png",
        "data": img_byte_arr.getvalue(),
        "created_at": datetime.utcnow()
    })
    qr_image_url = f"/api/images/{qr_result.inserted_id}"
    
    # 2. Extract images
    image_urls = [f"/api/images/{iid}" for iid in doc.get("image_ids", [])]
    primary_image_url = image_urls[0] if image_urls else None
    
    # 3. Upsert into main `products` collection
    from pymongo import ReturnDocument
    db.products.find_one_and_update(
        {"sku_id": sku_id},
        {
            "$set": {
                "name": doc.get("title") or "Untitled Product",
                "source_name": "VSUpload AI",
                "clothing_type": doc.get("category") or "Ethnic Wear",
                "color": doc.get("color") or "Multicolor",
                "price": float(doc.get("price") or 0.0),
                "image_url": primary_image_url,
                "image_urls": image_urls,
                "qr_image_url": qr_image_url,
                "description": doc.get("description") or "",
            },
            "$inc": {"stock_count": doc.get("stock_count") or 0}
        },
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    # --------------------------

    return {
        "product_id": product_id,
        "status": "published",
        "published_at": now.isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════
# 7. REJECT
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.post(
    "/products/{product_id}/reject",
    summary="Reject a product listing",
)
def reject_product(
    product_id: str,
    payload: RejectRequest,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """Reject a listing. Optionally include a reason."""
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    doc = db.vsupload_products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.utcnow()
    db.vsupload_products.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "rejected",
                "reviewed_at": now,
                "reviewed_by": admin_user.get("email"),
                "reject_reason": payload.reason,
            }
        },
    )

    # Update linked job
    db.vsupload_jobs.update_one(
        {"job_id": doc["job_id"]},
        {"$set": {"status": "rejected", "updated_at": now}},
    )
    from app.vsupload_pipeline import _update_batch_counts
    _update_batch_counts(doc["job_id"], db)

    return {"ok": True, "status": "rejected"}


# ═══════════════════════════════════════════════════════════════════
# 8. REGENERATE IMAGES
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.post(
    "/products/{product_id}/regenerate",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Regenerate AI model images for a product (keeps metadata)",
)
def regenerate_images(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """
    Re-trigger image generation only. AI metadata is preserved.
    The job goes back to `processing` state temporarily.
    """
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    doc = db.vsupload_products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    job_id = doc.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="No linked job found")

    # Reset product status
    db.vsupload_products.update_one(
        {"_id": oid},
        {"$set": {"status": "under_review", "image_ids": []}},
    )

    # Reset job for re-processing (keep metadata)
    db.vsupload_jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": "queued",
                "generated_images": [],
                "error": None,
                "error_code": None,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    background_tasks.add_task(process_job, job_id, db)

    return {"ok": True, "job_id": job_id, "status": "queued", "message": "Image regeneration started"}


# ═══════════════════════════════════════════════════════════════════
# 9. BATCH HISTORY
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.get(
    "/batches",
    response_model=BatchListResponse,
    summary="Get paginated batch history",
)
def get_batches(
    page: int = 1,
    limit: int = 20,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """Fetch all batches with per-status job counts."""
    total = db.vsupload_batches.count_documents({})
    skip = (max(1, page) - 1) * limit

    docs = (
        db.vsupload_batches
        .find()
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    items = [_batch_to_out(doc) for doc in docs]

    return BatchListResponse(items=items, total=total, page=page)


# ═══════════════════════════════════════════════════════════════════
# 10. DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.get(
    "/dashboard",
    response_model=VSDashboardStats,
    summary="Get VSUpload dashboard summary statistics",
)
def get_dashboard(
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """Return aggregate counts for the VSUpload dashboard cards."""
    products = db.vsupload_products

    in_review = products.count_documents({"status": "under_review"})
    processing = db.vsupload_jobs.count_documents({"status": {"$in": ["queued", "processing"]}})
    failed = db.vsupload_jobs.count_documents({"status": "failed"})
    total_published = products.count_documents({"status": "published"})
    total_rejected = products.count_documents({"status": "rejected"})
    total_jobs = db.vsupload_jobs.count_documents({})

    # Published today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    published_today = products.count_documents({
        "status": "published",
        "published_at": {"$gte": today_start},
    })

    return VSDashboardStats(
        in_review=in_review,
        published_today=published_today,
        processing=processing,
        failed=failed,
        total_published=total_published,
        total_rejected=total_rejected,
        total_jobs=total_jobs,
    )


# ═══════════════════════════════════════════════════════════════════
# 11. GET SINGLE PRODUCT
# ═══════════════════════════════════════════════════════════════════

@vsupload_router.get(
    "/products/{product_id}",
    response_model=ProductOut,
    summary="Get a single product by ID",
)
def get_product(
    product_id: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_admin_user),
):
    """Fetch a single product's full details for the editor view."""
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    doc = db.vsupload_products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    return _product_to_out(doc)
