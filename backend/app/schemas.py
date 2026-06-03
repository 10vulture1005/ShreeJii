"""
Pydantic v2 schemas for request validation and response serialization.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

# ── Auth & Users ─────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ── Admin Dashboard ──────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_revenue: Decimal
    total_orders: int
    items_sold: int
    online_revenue: Decimal = Decimal("0")
    offline_revenue: Decimal = Decimal("0")
    online_orders: int = 0
    offline_orders: int = 0
    recent_sales: list[dict] = []


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
    image_urls: Optional[list[str]] = Field(None, examples=[["https://example.com/saree1.jpg", "https://example.com/saree2.jpg"]])


class RestockResponse(BaseModel):
    """Response after successful restocking."""

    sku_id: str
    name: str
    source_name: str
    clothing_type: str
    color: str
    price: Decimal
    image_url: Optional[str] = None
    image_urls: list[str] = []
    qr_image_url: Optional[str] = None
    description: Optional[str] = None
    stock_count: int
    message: str


# ── Catalog Endpoint ─────────────────────────────────────────────

class ProductOut(BaseModel):
    """A single product in the public catalog listing."""

    sku_id: str
    name: str
    source_name: str
    clothing_type: str
    color: str
    price: Decimal
    image_url: Optional[str] = None
    image_urls: list[str] = []
    qr_image_url: Optional[str] = None
    description: Optional[str] = None
    stock_count: int


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


class BulkCheckoutResponse(BaseModel):
    """Response after a bulk checkout operation."""
    
    successful_skus: list[str]
    failed_skus: list[str]
    message: str


# ── Update Endpoint ──────────────────────────────────────────────

class UpdateRequest(BaseModel):
    """Payload for PUT /api/admin/inventory/product/{sku_id}"""
    
    name: str = Field(..., min_length=1)
    price: Decimal = Field(..., gt=0)
    image_url: Optional[str] = None
    image_urls: Optional[list[str]] = None
    description: Optional[str] = None


# ── Payment Endpoint ─────────────────────────────────────────────

class OrderItem(BaseModel):
    """A single item in a payment order."""
    sku_id: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)


class CreateOrderRequest(BaseModel):
    """Payload for POST /api/payment/create-order"""
    items: list[OrderItem]
    delivery_charge: Decimal = Field(default=0, ge=0)


class CreateOrderResponse(BaseModel):
    """Response after creating a Razorpay order."""
    razorpay_order_id: str
    amount: int  # in paise
    currency: str
    key_id: str


class VerifyPaymentRequest(BaseModel):
    """Payload for POST /api/payment/verify"""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    """Response after verifying a Razorpay payment."""
    success: bool
    message: str
    order_id: Optional[str] = None
