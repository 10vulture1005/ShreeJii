"""
API route handlers for the Shree Ji Inventory System.

Endpoints:
    POST /api/admin/inventory/restock  — Inward & restock products
    GET  /api/products                 — Public product catalog
    POST /api/checkout                 — Checkout with stock deduction
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models import Product, Inventory
from app.schemas import (
    RestockRequest, RestockResponse,
    ProductOut,
    CheckoutRequest, CheckoutResponse,
)
from app.sku_utils import generate_sku

router = APIRouter()


# ── 1. Inwarding & Restocking ───────────────────────────────────

@router.post(
    "/api/admin/inventory/restock",
    response_model=RestockResponse,
    status_code=status.HTTP_200_OK,
    summary="Restock inventory for a product",
    tags=["Admin"],
)
def restock_inventory(payload: RestockRequest, db: Session = Depends(get_db)):
    """
    Accept a bulk shipment and update inventory.

    - Generates a standardized SKU from source_name, clothing_type, and color.
    - Creates the product record if it doesn't already exist.
    - Increments the stock count (or creates the inventory record).
    - Returns the updated product data with current stock balance.
    """
    sku_id = generate_sku(payload.source_name, payload.clothing_type, payload.color)

    # ── Upsert Product ──
    product = db.query(Product).filter(Product.sku_id == sku_id).first()
    if product is None:
        product = Product(
            sku_id=sku_id,
            name=payload.name,
            source_name=payload.source_name,
            clothing_type=payload.clothing_type,
            color=payload.color,
            price=payload.price,
            image_url=payload.image_url,
        )
        db.add(product)
        db.flush()  # Ensure product exists before inventory FK

    # ── Upsert Inventory ──
    inventory = db.query(Inventory).filter(Inventory.sku_id == sku_id).first()
    if inventory is None:
        inventory = Inventory(
            sku_id=sku_id,
            stock_count=payload.quantity_to_add,
        )
        db.add(inventory)
    else:
        inventory.stock_count += payload.quantity_to_add
        inventory.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(product)
    db.refresh(inventory)

    return RestockResponse(
        sku_id=product.sku_id,
        name=product.name,
        source_name=product.source_name,
        clothing_type=product.clothing_type,
        color=product.color,
        price=product.price,
        image_url=product.image_url,
        stock_count=inventory.stock_count,
        message=f"Successfully restocked {payload.quantity_to_add} units. Total stock: {inventory.stock_count}",
    )


# ── 2. Client Catalog ───────────────────────────────────────────

@router.get(
    "/api/products",
    response_model=list[ProductOut],
    summary="Get product catalog",
    tags=["Catalog"],
)
def get_products(db: Session = Depends(get_db)):
    """
    Fetch all products that are currently in stock (stock_count > 0).

    Uses an INNER JOIN between products and inventory to ensure
    only stocked items are returned.
    """
    results = (
        db.query(
            Product.sku_id,
            Product.name,
            Product.source_name,
            Product.clothing_type,
            Product.color,
            Product.price,
            Product.image_url,
            Inventory.stock_count,
        )
        .join(Inventory, Product.sku_id == Inventory.sku_id)
        .filter(Inventory.stock_count > 0)
        .all()
    )

    return [
        ProductOut(
            sku_id=row.sku_id,
            name=row.name,
            source_name=row.source_name,
            clothing_type=row.clothing_type,
            color=row.color,
            price=row.price,
            image_url=row.image_url,
            stock_count=row.stock_count,
        )
        for row in results
    ]


# ── 3. Checkout Deductions ──────────────────────────────────────

@router.post(
    "/api/checkout",
    response_model=CheckoutResponse,
    summary="Purchase products (deduct stock)",
    tags=["Checkout"],
)
def checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    """
    Process a purchase by atomically deducting stock.

    Uses SELECT ... FOR UPDATE to acquire a row-level lock on the
    inventory row, preventing race conditions during simultaneous
    online/offline checkouts.
    """
    # Row-level lock to prevent overselling
    inventory = (
        db.query(Inventory)
        .filter(Inventory.sku_id == payload.sku_id)
        .with_for_update()
        .first()
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with SKU '{payload.sku_id}' not found in inventory.",
        )

    if inventory.stock_count < payload.quantity_purchased:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock for SKU '{payload.sku_id}'. "
                f"Available: {inventory.stock_count}, "
                f"Requested: {payload.quantity_purchased}."
            ),
        )

    # Deduct stock
    inventory.stock_count -= payload.quantity_purchased
    inventory.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(inventory)

    return CheckoutResponse(
        sku_id=payload.sku_id,
        remaining_stock=inventory.stock_count,
        message=f"Successfully purchased {payload.quantity_purchased} unit(s). Remaining: {inventory.stock_count}.",
    )
