"""
Shree Ji Inventory API — FastAPI Application Entry Point.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.router import router


app = FastAPI(
    title="Shree Ji Inventory API",
    description=(
        "Bulk retail inventory management and storefront API "
        "for the Shree Ji boutique clothing store."
    ),
    version="1.0.0",
)

# ── CORS Configuration (permissive for development) ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include API routes ───────────────────────────────────────────
app.include_router(router)


@app.get("/", tags=["Health"])
def root():
    """Health-check endpoint."""
    return {
        "status": "healthy",
        "service": "Shree Ji Inventory API",
        "version": "1.0.0",
    }
