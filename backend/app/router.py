"""
API route handlers for the Shree Ji Inventory System.

Endpoints:
    POST /api/admin/inventory/restock  — Inward & restock products
    GET  /api/products                 — Public product catalog
    POST /api/checkout                 — Checkout with stock deduction
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from pymongo.database import Database
from pymongo import ReturnDocument
from bson import ObjectId
import base64

from app.database import get_db
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
def restock_inventory(payload: RestockRequest, db: Database = Depends(get_db)):
    """
    Accept a bulk shipment and update inventory.

    - Generates a standardized SKU from source_name, clothing_type, and color.
    - Uses upsert and $inc to atomically create the product or increment stock.
    - Returns the updated product data with current stock balance.
    """
    sku_id = generate_sku(payload.source_name, payload.clothing_type, payload.color)
    collection = db.products

    # Atomically upsert the product and increment the stock count
    updated_product = collection.find_one_and_update(
        {"sku_id": sku_id},
        {
            "$setOnInsert": {
                "name": payload.name,
                "source_name": payload.source_name,
                "clothing_type": payload.clothing_type,
                "color": payload.color,
                "price": float(payload.price), # PyMongo works best with float
                "image_url": payload.image_url,
            },
            "$inc": {"stock_count": payload.quantity_to_add}
        },
        upsert=True,
        return_document=ReturnDocument.AFTER
    )

    return RestockResponse(
        sku_id=updated_product["sku_id"],
        name=updated_product["name"],
        source_name=updated_product["source_name"],
        clothing_type=updated_product["clothing_type"],
        color=updated_product["color"],
        price=updated_product["price"],
        image_url=updated_product.get("image_url"),
        stock_count=updated_product["stock_count"],
        message=f"Successfully restocked {payload.quantity_to_add} units. Total stock: {updated_product['stock_count']}",
    )


# ── 2. Client Catalog ───────────────────────────────────────────

@router.get(
    "/api/products",
    response_model=list[ProductOut],
    summary="Get product catalog",
    tags=["Catalog"],
)
def get_products(db: Database = Depends(get_db)):
    """
    Fetch all products that are currently in stock (stock_count > 0).
    """
    collection = db.products
    results = collection.find({"stock_count": {"$gt": 0}})

    return [
        ProductOut(
            sku_id=row["sku_id"],
            name=row["name"],
            source_name=row["source_name"],
            clothing_type=row["clothing_type"],
            color=row["color"],
            price=row["price"],
            image_url=row.get("image_url"),
            stock_count=row["stock_count"],
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
def checkout(payload: CheckoutRequest, db: Database = Depends(get_db)):
    """
    Process a purchase by atomically deducting stock.

    Uses MongoDB's find_one_and_update to safely deduct the requested quantity,
    ensuring that the stock count never drops below 0 natively.
    """
    collection = db.products

    # Check existence and stock level in one atomic step
    updated_product = collection.find_one_and_update(
        {
            "sku_id": payload.sku_id,
            "stock_count": {"$gte": payload.quantity_purchased}
        },
        {
            "$inc": {"stock_count": -payload.quantity_purchased}
        },
        return_document=ReturnDocument.AFTER
    )

    if not updated_product:
        # If no document was matched and updated, it's either out of stock or doesn't exist
        product = collection.find_one({"sku_id": payload.sku_id})
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with SKU '{payload.sku_id}' not found in inventory.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for SKU '{payload.sku_id}'. "
                    f"Available: {product.get('stock_count', 0)}, "
                    f"Requested: {payload.quantity_purchased}."
                ),
            )

    return CheckoutResponse(
        sku_id=payload.sku_id,
        remaining_stock=updated_product["stock_count"],
        message=f"Successfully purchased {payload.quantity_purchased} unit(s). Remaining: {updated_product['stock_count']}.",
    )


# ── 4. Image Upload ─────────────────────────────────────────────

@router.post(
    "/api/admin/upload-image",
    summary="Upload image to database",
    tags=["Admin"],
)
def upload_image(file: UploadFile = File(...), db: Database = Depends(get_db)):
    """
    Upload an image file directly to MongoDB and return a local URL to access it.
    """
    try:
        file_bytes = file.file.read()
        
        # Insert image into a new 'images' collection
        result = db.images.insert_one({
            "filename": file.filename,
            "content_type": file.content_type,
            "data": file_bytes
        })
        
        # Return the public URL that points to our GET endpoint
        image_id = str(result.inserted_id)
        # Using a relative path so it works seamlessly whether on localhost or Render
        return {"image_url": f"/api/images/{image_id}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )

@router.get(
    "/api/images/{image_id}",
    summary="Get image by ID",
    tags=["Catalog"],
)
def get_image(image_id: str, db: Database = Depends(get_db)):
    """
    Serve an image stored in MongoDB.
    """
    try:
        obj_id = ObjectId(image_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid image ID")
        
    image_doc = db.images.find_one({"_id": obj_id})
    if not image_doc:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return Response(content=image_doc["data"], media_type=image_doc["content_type"] or "image/jpeg")
