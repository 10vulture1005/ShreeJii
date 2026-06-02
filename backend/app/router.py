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
import io
import qrcode

from app.database import get_db
from app.schemas import (
    RestockRequest, RestockResponse,
    ProductOut,
    CheckoutRequest, CheckoutResponse,
    UpdateRequest, BulkCheckoutResponse,
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

    # Check if product exists to avoid generating duplicate QR codes
    existing_product = collection.find_one({"sku_id": sku_id})
    qr_image_url = existing_product.get("qr_image_url") if existing_product else None

    # If it's a new product and has no QR code, generate one
    if not qr_image_url:
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(sku_id)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        
        qr_result = db.images.insert_one({
            "filename": f"{sku_id}_qr.png",
            "content_type": "image/png",
            "data": img_byte_arr.getvalue()
        })
        qr_image_url = f"/api/images/{qr_result.inserted_id}"

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
                "qr_image_url": qr_image_url,
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
        qr_image_url=updated_product.get("qr_image_url"),
        stock_count=updated_product["stock_count"],
        message=f"Successfully restocked {payload.quantity_to_add} units. Total stock: {updated_product['stock_count']}",
    )

@router.put(
    "/api/admin/inventory/product/{sku_id}",
    response_model=ProductOut,
    summary="Update basic product details",
    tags=["Admin"],
)
def update_product(sku_id: str, payload: UpdateRequest, db: Database = Depends(get_db)):
    """
    Update the basic details of a product (name, price, image).
    Changing SKU attributes (type, color) requires creating a new product.
    """
    collection = db.products
    updated = collection.find_one_and_update(
        {"sku_id": sku_id},
        {"$set": {
            "name": payload.name,
            "price": float(payload.price),
            "image_url": payload.image_url,
        }},
        return_document=ReturnDocument.AFTER
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return ProductOut(
        sku_id=updated["sku_id"],
        name=updated["name"],
        source_name=updated["source_name"],
        clothing_type=updated["clothing_type"],
        color=updated["color"],
        price=updated["price"],
        image_url=updated.get("image_url"),
        stock_count=updated["stock_count"],
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
    try:
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
                qr_image_url=row.get("qr_image_url"),
                stock_count=row["stock_count"],
            )
            for row in results
        ]
    except Exception as e:
        import traceback
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=traceback.format_exc(), status_code=500)


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

@router.post(
    "/api/checkout/bulk",
    response_model=BulkCheckoutResponse,
    summary="Bulk checkout multiple items",
    tags=["Checkout"],
)
def bulk_checkout(payloads: list[CheckoutRequest], db: Database = Depends(get_db)):
    """
    Process a checkout for an entire cart of items.
    Deducts stock for each item safely.
    """
    collection = db.products
    successful = []
    failed = []
    
    for item in payloads:
        updated = collection.find_one_and_update(
            {
                "sku_id": item.sku_id,
                "stock_count": {"$gte": item.quantity_purchased}
            },
            {"$inc": {"stock_count": -item.quantity_purchased}},
            return_document=ReturnDocument.AFTER
        )
        if updated:
            successful.append(item.sku_id)
        else:
            failed.append(item.sku_id)
            
    message = f"Checkout complete. {len(successful)} succeeded, {len(failed)} failed."
    if failed:
        message += " Failed items may be out of stock."
        
    return BulkCheckoutResponse(
        successful_skus=successful,
        failed_skus=failed,
        message=message
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
