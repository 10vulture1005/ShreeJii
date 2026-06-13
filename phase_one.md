# VSUpload — Phase 1: Backend Pipeline

> **Completed**: Backend AI processing pipeline, all API endpoints, and test suite.

---

## What Was Built

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Render)                      │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │  vsupload_router.py  │  │ vsupload_pipeline.py │             │
│  │  11 API endpoints     │  │ AI orchestration     │             │
│  │  /api/vsupload/*     │  │ Gemini + Groq        │             │
│  └──────────┬───────────┘  └──────────┬───────────┘             │
│             │                          │                         │
│  ┌──────────▼───────────┐  ┌──────────▼───────────┐             │
│  │ vsupload_schemas.py  │  │   BackgroundTasks    │             │
│  │ Pydantic models      │  │ Async job processing │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │         MongoDB Atlas (shreeji_db)            │               │
│  │  vsupload_jobs │ vsupload_batches │ images   │               │
│  │  vsupload_products                           │               │
│  └──────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌──────────────┐ ┌──────────┐
   │ Gemini API  │ │ Gemini Imagen│ │ Groq API │
   │ Vision/Text │ │ Image Gen    │ │ Fallback │
   └─────────────┘ └──────────────┘ └──────────┘
```

### Files Created

| File | Purpose | Lines |
|---|---|---|
| `app/vsupload_schemas.py` | Pydantic models (Job, Batch, Product, API request/response) | ~140 |
| `app/vsupload_pipeline.py` | AI pipeline (Gemini Vision, Groq fallback, Imagen, orchestrator) | ~300 |
| `app/vsupload_router.py` | FastAPI router (11 admin-auth endpoints) | ~450 |
| `test_vsupload.py` | Integration tests (5 test classes, auto-skip without keys) | ~220 |

### Files Modified

| File | Change |
|---|---|
| `app/main.py` | Import + include `vsupload_router` |
| `requirements.txt` | Added `google-genai>=1.0.0` |
| `example.env` | Added `GEMINI_API_KEY`, `MAX_IMAGES_PER_JOB` |

---

## API Endpoints (11 total)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/vsupload/jobs/batch` | Submit batch of garment photo groups |
| `GET` | `/api/vsupload/jobs/{job_id}` | Poll job status + metadata |
| `POST` | `/api/vsupload/jobs/{job_id}/retry` | Retry a failed job |
| `GET` | `/api/vsupload/review-queue` | Paginated product review queue |
| `GET` | `/api/vsupload/products/{product_id}` | Get single product details |
| `PATCH` | `/api/vsupload/products/{product_id}` | Save draft edits |
| `POST` | `/api/vsupload/products/{product_id}/publish` | Approve & publish |
| `POST` | `/api/vsupload/products/{product_id}/reject` | Reject listing |
| `POST` | `/api/vsupload/products/{product_id}/regenerate` | Re-generate images (keep metadata) |
| `GET` | `/api/vsupload/batches` | Batch history with status counts |
| `GET` | `/api/vsupload/dashboard` | Dashboard summary statistics |

All endpoints require admin authentication (JWT Bearer token).

---

## AI Pipeline Flow

```
1. Admin uploads garment photos
         │
         ▼
2. Photos stored in MongoDB `images` collection
         │
         ▼
3. BackgroundTask starts → status: "processing"
         │
         ▼
4. Best photo selected (largest file size)
         │
         ▼
5. Gemini 2.0 Flash Vision → extract metadata JSON
   (retry 3× with 30s/60s/90s backoff)
         │
    ┌────┴─── fails ───┐
    ▼                   ▼
6a. Metadata OK    6b. Groq fallback
         │              │ (text-only)
         └──────┬───────┘
                ▼
7. Build 3 Imagen prompts (front / 3-quarter / back)
                │
                ▼
8. Gemini Imagen 3 × generate model photos
   (retry 3× with 60s/120s/180s backoff)
                │
                ▼
9. Store generated images in MongoDB
                │
                ▼
10. Create product doc → status: "under_review"
                │
                ▼
11. Job complete → visible in review queue
```

---

## MongoDB Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `vsupload_jobs` | Job state & AI results | job_id, batch_id, status, ai_metadata, generated_images |
| `vsupload_batches` | Batch tracking | batch_id, name, status_counts |
| `vsupload_products` | Product listings | title, description, price, sizes, sku, status |
| `images` | Binary image storage (shared) | filename, content_type, data |

---

## How to Test

```bash
# 1. Install new dependency
pip install google-genai>=1.0.0

# 2. Set your Gemini API key
set GEMINI_API_KEY=your-key-here

# 3. Run tests (from backend directory)
cd v0-shree-ji-e-commerce/backend
python test_vsupload.py

# Tests auto-skip if keys aren't set:
#   ✅ Schema validation — always runs
#   ✅ Prompt construction — always runs
#   ⏭️ Gemini Vision — requires GEMINI_API_KEY
#   ⏭️ Groq fallback — requires GROQ_API_KEY
#   ⏭️ Imagen generation — requires GEMINI_API_KEY
#   ⏭️ End-to-end pipeline — requires GEMINI_API_KEY
```

---

## Environment Variables

```bash
# Required for AI features
GEMINI_API_KEY=           # From https://aistudio.google.com/apikey
GROQ_API_KEY=             # Already configured in .env

# Optional
MAX_IMAGES_PER_JOB=3      # Number of model photos per garment
```

---

## Next: Phase 2 — Frontend Upload UI

- VSUpload admin layout with sidebar navigation
- Dashboard page with summary stat cards
- Upload panel with drag-and-drop folder support
- Batch history table
- API client (api-vsupload.ts)
