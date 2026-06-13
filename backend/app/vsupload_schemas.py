"""
VSUpload — Pydantic schemas for request validation and response serialization.

Covers: Job lifecycle, batch tracking, product records, and all API request/response models.
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal


# ── Enums ────────────────────────────────────────────────────────

class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    UNDER_REVIEW = "under_review"
    PUBLISHED = "published"
    REJECTED = "rejected"
    FAILED = "failed"


# ── Nested Models ────────────────────────────────────────────────

class GeneratedImage(BaseModel):
    """A single AI-generated model photo."""
    image_id: str
    angle: str  # "front", "3quarter", "back"
    url: str    # "/api/images/{id}"


class AIMetadata(BaseModel):
    """Structured metadata extracted by Gemini/Groq from the garment photo."""
    name: str = ""
    description: str = ""
    color: str = ""
    style: str = ""
    occasion: List[str] = []
    sleeve: str = ""
    neckline: str = ""
    fabric: str = ""
    length: str = ""


# ── Job Responses ────────────────────────────────────────────────

class JobOut(BaseModel):
    """Response model for a single VSUpload job."""
    job_id: str
    batch_id: str
    group_name: str
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    raw_photo_count: int = 0
    generated_images: List[GeneratedImage] = []
    ai_metadata: Optional[AIMetadata] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    retry_count: int = 0


# ── Batch Responses ──────────────────────────────────────────────

class BatchOut(BaseModel):
    """Response model for a batch of jobs."""
    batch_id: str
    name: str
    submitted_by: str
    created_at: Optional[str] = None
    total_jobs: int = 0
    status_counts: dict = {}


class BatchSubmitResponse(BaseModel):
    """Response after successfully submitting a batch."""
    batch_id: str
    job_ids: List[str]
    total_jobs: int


class BatchListResponse(BaseModel):
    """Paginated list of batches."""
    items: List[BatchOut]
    total: int
    page: int


# ── Product Models ───────────────────────────────────────────────

class ProductOut(BaseModel):
    """Full product listing with AI-generated + admin-filled fields."""
    id: str
    job_id: str
    batch_id: str
    title: str
    description: str = ""
    color: Optional[str] = None
    style: Optional[str] = None
    occasion: List[str] = []
    sleeve: Optional[str] = None
    neckline: Optional[str] = None
    fabric: Optional[str] = None
    length: Optional[str] = None
    image_ids: List[str] = []
    image_urls: List[str] = []
    raw_photo_urls: List[str] = []
    price: Optional[float] = None
    stock_count: Optional[int] = None
    sizes: List[str] = []
    category: Optional[str] = None
    sku: Optional[str] = None
    status: str = "under_review"
    created_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    published_at: Optional[str] = None


class ProductUpdateRequest(BaseModel):
    """Payload for PATCH /api/vsupload/products/{product_id}."""
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    style: Optional[str] = None
    occasion: Optional[List[str]] = None
    sleeve: Optional[str] = None
    neckline: Optional[str] = None
    fabric: Optional[str] = None
    length: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    stock_count: Optional[int] = Field(None, ge=0)
    sizes: Optional[List[str]] = None
    category: Optional[str] = None
    sku: Optional[str] = None


class RejectRequest(BaseModel):
    """Payload for POST /api/vsupload/products/{product_id}/reject."""
    reason: str = ""


# ── Review Queue ─────────────────────────────────────────────────

class ReviewQueueResponse(BaseModel):
    """Paginated review queue listing."""
    items: List[ProductOut]
    total: int
    page: int


# ── Dashboard ────────────────────────────────────────────────────

class VSDashboardStats(BaseModel):
    """Summary statistics for the VSUpload dashboard."""
    in_review: int = 0
    published_today: int = 0
    processing: int = 0
    failed: int = 0
    total_published: int = 0
    total_rejected: int = 0
    total_jobs: int = 0
