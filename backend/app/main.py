"""
Shree Ji Inventory API — FastAPI Application Entry Point.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env before anything else
load_dotenv()

from app.router import router
from app.vsupload_router import vsupload_router
from app.database import db
from app.auth_utils import get_password_hash

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create admin user if it doesn't exist
    admin_email = "admin@shreeji.com"
    if not db.users.find_one({"email": admin_email}):
        db.users.insert_one({
            "name": "Admin",
            "email": admin_email,
            "password": get_password_hash("admin@123"),
            "role": "admin"
        })
    yield

app = FastAPI(
    title="Shree Ji Inventory API",
    description=(
        "Bulk retail inventory management and storefront API "
        "for the Shree Ji boutique clothing store."
    ),
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(vsupload_router)


@app.get("/", tags=["Health"])
def root():
    """Health-check endpoint."""
    return {
        "status": "healthy",
        "service": "Shree Ji Inventory API",
        "version": "1.0.0",
    }
