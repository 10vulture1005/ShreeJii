"""
Pydantic v2 schemas for request validation and response serialization.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


# ── Restock Endpoint ─────────────────────────────────────────────

class RestockRequest(BaseModel):
    """Payload for POST /api/admin/inventory/restock"""

    source_name: str = Field(..., min_length=1, examples=["Weaver A"])
    clothing_type: str = Field(..., min_length=1, examples=["Kanjivaram"])
    color: str = Field(..., min_length=1, examples=["Red"])
    name: str = Field(..., min_length=1, examples=["Silk Kanjivaram Saree"])
    price: Decimal = Field(..., gt=0, examples=[4500.00])
    quantity_to_add: int = Field(..., gt=0, examples=[25])
    image_url: Optional[str] = Field(None, examples=["https://example.com/saree.jpg"])


class RestockResponse(BaseModel):
    """Response after successful restocking."""

    sku_id: str
    name: str
    source_name: str
    clothing_type: str
    color: str
    price: Decimal
    image_url: Optional[str]
    stock_count: int
    message: str

    model_config = {"from_attributes": True}


# ── Catalog Endpoint ─────────────────────────────────────────────

class ProductOut(BaseModel):
    """A single product in the public catalog listing."""

    sku_id: str
    name: str
    source_name: str
    clothing_type: str
    color: str
    price: Decimal
    image_url: Optional[str]
    stock_count: int

    model_config = {"from_attributes": True}


# ── Checkout Endpoint ────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    """Payload for POST /api/checkout"""

    sku_id: str = Field(..., min_length=1, examples=["WEA-KAN-RED"])
    quantity_purchased: int = Field(..., gt=0, examples=[2])


class CheckoutResponse(BaseModel):
    """Response after successful checkout."""

    sku_id: str
    remaining_stock: int
    message: str
