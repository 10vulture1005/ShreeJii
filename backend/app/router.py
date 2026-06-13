"""
API route handlers for the Shree Ji Inventory System.

Endpoints:
    POST /api/admin/inventory/restock  — Inward & restock products
    GET  /api/products                 — Public product catalog
    POST /api/checkout                 — Checkout with stock deduction
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.database import Database
from pymongo import ReturnDocument
from bson import ObjectId
from pydantic import BaseModel
import base64
import io
import qrcode
from datetime import datetime
import os
from app.ai_utils import generate_product_description

from app.database import get_db
from app.schemas import (
    RestockRequest, RestockResponse,
    ProductOut,
    CheckoutRequest, CheckoutResponse,
    UpdateRequest, BulkCheckoutResponse,
    UserCreate, UserOut, Token, DashboardStats,
    CreateOrderRequest, CreateOrderResponse,
    VerifyPaymentRequest, VerifyPaymentResponse,
    AddressCreate, AddressOut,
    CartSyncRequest, CartSyncResponse,
    WishlistSyncRequest, WishlistSyncResponse,
)
from app.sku_utils import generate_sku
from app.auth_utils import verify_password, get_password_hash, create_access_token
from app.auth_deps import get_current_user, get_admin_user
import razorpay
import hmac
import hashlib

router = APIRouter()

# ── Razorpay Client ──────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ── 0. Auth & Users ─────────────────────────────────────────────

@router.post("/api/auth/register", response_model=UserOut, tags=["Auth"])
def register(user: UserCreate, db: Database = Depends(get_db)):
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.model_dump()
    user_dict["password"] = get_password_hash(user_dict.pop("password"))
    user_dict["role"] = "user"
    
    result = db.users.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return user_dict

@router.post("/api/auth/login", response_model=Token, tags=["Auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Database = Depends(get_db)):
    user = db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"], "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/api/auth/me", response_model=UserOut, tags=["Auth"])
def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ── 0b. Address Management ───────────────────────────────────────

@router.post(
    "/api/user/address",
    response_model=AddressOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new delivery address",
    tags=["User"],
)
def add_address(
    payload: AddressCreate,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Save a new delivery address for the authenticated user.
    The address document is linked to the user via their ObjectId.
    """
    address_doc = {
        "user_id": ObjectId(current_user["id"]),
        "full_name": payload.full_name,
        "phone": payload.phone,
        "address_line1": payload.address_line1,
        "address_line2": payload.address_line2,
        "city": payload.city,
        "state": payload.state,
        "pincode": payload.pincode,
        "created_at": datetime.utcnow(),
    }
    result = db.addresses.insert_one(address_doc)
    return AddressOut(
        id=str(result.inserted_id),
        full_name=payload.full_name,
        phone=payload.phone,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
    )


@router.get(
    "/api/user/address",
    response_model=list[AddressOut],
    summary="Get all saved delivery addresses",
    tags=["User"],
)
def get_addresses(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Fetch all saved delivery addresses for the authenticated user.
    """
    addresses = db.addresses.find({"user_id": ObjectId(current_user["id"])})
    return [
        AddressOut(
            id=str(addr["_id"]),
            full_name=addr["full_name"],
            phone=addr["phone"],
            address_line1=addr["address_line1"],
            address_line2=addr.get("address_line2"),
            city=addr["city"],
            state=addr["state"],
            pincode=addr["pincode"],
        )
        for addr in addresses
    ]


# ── 0c. Cart Synchronization ───────────────────────────────────────

@router.get(
    "/api/user/cart",
    response_model=CartSyncResponse,
    summary="Get user cart",
    tags=["User"],
)
def get_user_cart(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Fetch the saved cart for the authenticated user.
    """
    user_doc = db.users.find_one({"_id": ObjectId(current_user["id"])})
    cart_data = user_doc.get("cart", []) if user_doc else []
    return CartSyncResponse(cart=cart_data, message="Cart fetched successfully")


@router.put(
    "/api/user/cart",
    response_model=CartSyncResponse,
    summary="Save user cart",
    tags=["User"],
)
def save_user_cart(
    payload: CartSyncRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Update the saved cart for the authenticated user.
    """
    # We store the cart directly on the user document
    cart_data = [item.model_dump() for item in payload.cart]
    
    db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"cart": cart_data}}
    )
    
    return CartSyncResponse(cart=payload.cart, message="Cart saved successfully")


# ── 0d. Wishlist Synchronization ───────────────────────────────────

@router.get(
    "/api/user/wishlist",
    response_model=WishlistSyncResponse,
    summary="Get user wishlist",
    tags=["User"],
)
def get_user_wishlist(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Fetch the saved wishlist for the authenticated user.
    """
    user_doc = db.users.find_one({"_id": ObjectId(current_user["id"])})
    wishlist_data = user_doc.get("wishlist", []) if user_doc else []
    return WishlistSyncResponse(wishlist=wishlist_data, message="Wishlist fetched successfully")


@router.put(
    "/api/user/wishlist",
    response_model=WishlistSyncResponse,
    summary="Save user wishlist",
    tags=["User"],
)
def save_user_wishlist(
    payload: WishlistSyncRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Update the saved wishlist for the authenticated user.
    """
    db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"wishlist": payload.wishlist}}
    )
    
    return WishlistSyncResponse(wishlist=payload.wishlist, message="Wishlist saved successfully")


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
    description = existing_product.get("description") if existing_product else None

    # If it's a new product and has no QR code, generate one
    if not existing_product:
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
        
        # Generate description with AI for new products
        image_data_url = None
        if payload.image_url:
            if payload.image_url.startswith("/api/images/"):
                try:
                    image_id = payload.image_url.split("/")[-1]
                    image_doc = db.images.find_one({"_id": ObjectId(image_id)})
                    if image_doc:
                        b64 = base64.b64encode(image_doc["data"]).decode("utf-8")
                        mime = image_doc["content_type"] or "image/jpeg"
                        image_data_url = f"data:{mime};base64,{b64}"
                except Exception as e:
                    print(f"Failed to load internal image for AI generation: {e}")
            else:
                image_data_url = payload.image_url
                
        description = generate_product_description(payload.name, payload.clothing_type, payload.color, image_data_url)

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
                "image_urls": payload.image_urls or [],
                "qr_image_url": qr_image_url,
                "description": description,
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
        image_urls=updated_product.get("image_urls", []),
        qr_image_url=updated_product.get("qr_image_url"),
        description=updated_product.get("description"),
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
    
    update_data = {
        "name": payload.name,
        "price": float(payload.price),
    }
    if payload.image_url is not None:
        update_data["image_url"] = payload.image_url
    if payload.image_urls is not None:
        update_data["image_urls"] = payload.image_urls
    if payload.description is not None:
        update_data["description"] = payload.description
        
    updated = collection.find_one_and_update(
        {"sku_id": sku_id},
        {"$set": update_data},
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
        image_urls=updated.get("image_urls", []),
        description=updated.get("description"),
        stock_count=updated["stock_count"],
    )

class GenerateDescriptionResponse(BaseModel):
    description: str
    message: str

@router.post(
    "/api/admin/inventory/product/{sku_id}/generate-description",
    response_model=GenerateDescriptionResponse,
    tags=["Admin"],
)
def generate_description_endpoint(sku_id: str, db: Database = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    collection = db.products
    product = collection.find_one({"sku_id": sku_id})
    if not product:
        raise HTTPException(404, "Product not found")
        
    image_url = product.get("image_url")
    image_data_url = None
    if image_url:
        if image_url.startswith("/api/images/"):
            try:
                image_id = image_url.split("/")[-1]
                image_doc = db.images.find_one({"_id": ObjectId(image_id)})
                if image_doc:
                    b64 = base64.b64encode(image_doc["data"]).decode("utf-8")
                    mime = image_doc["content_type"] or "image/jpeg"
                    image_data_url = f"data:{mime};base64,{b64}"
            except Exception as e:
                print(f"Failed to load internal image for AI generation: {e}")
        else:
            image_data_url = image_url

    desc = generate_product_description(product["name"], product["clothing_type"], product["color"], image_data_url)
    collection.update_one({"sku_id": sku_id}, {"$set": {"description": desc}})
    return {"description": desc, "message": "Description generated successfully"}

@router.get(
    "/api/admin/inventory/products",
    response_model=list[ProductOut],
    summary="Get all products for admin",
    tags=["Admin"],
)
def get_all_products(db: Database = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """
    Fetch all products, including out of stock items. Requires Admin privileges.
    """
    collection = db.products
    results = collection.find()
    return [
        ProductOut(
            sku_id=row["sku_id"],
            name=row.get("name") or "Untitled Product",
            source_name=row.get("source_name") or "VSUpload AI",
            clothing_type=row.get("clothing_type") or "Ethnic Wear",
            color=row.get("color") or "Multicolor",
            price=row.get("price") or 0.0,
            image_url=row.get("image_url"),
            image_urls=row.get("image_urls", []),
            qr_image_url=row.get("qr_image_url"),
            description=row.get("description"),
            stock_count=row["stock_count"],
        )
        for row in results
    ]

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
                name=row.get("name") or "Untitled Product",
                source_name=row.get("source_name") or "VSUpload AI",
                clothing_type=row.get("clothing_type") or "Ethnic Wear",
                color=row.get("color") or "Multicolor",
                price=row.get("price") or 0.0,
                image_url=row.get("image_url"),
                image_urls=row.get("image_urls", []),
                qr_image_url=row.get("qr_image_url"),
                description=row.get("description"),
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

    # Record the sale
    db.sales.insert_one({
        "sku_id": payload.sku_id,
        "quantity": payload.quantity_purchased,
        "price": updated_product["price"],
        "total_amount": float(updated_product["price"]) * payload.quantity_purchased,
        "timestamp": datetime.utcnow()
    })

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
            db.sales.insert_one({
                "sku_id": item.sku_id,
                "quantity": item.quantity_purchased,
                "price": updated["price"],
                "total_amount": float(updated["price"]) * item.quantity_purchased,
                "timestamp": datetime.utcnow()
            })
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

# ── 5. Admin Dashboard ──────────────────────────────────────────

@router.get(
    "/api/admin/stats",
    response_model=DashboardStats,
    summary="Get admin dashboard statistics",
    tags=["Admin"],
)
def get_admin_stats(db: Database = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """
    Returns total revenue, total orders, total items sold, and recent sales.
    Includes online (web) vs offline (POS/app) breakdown.
    Requires Admin privileges.
    """
    sales = list(db.sales.find().sort("timestamp", -1))
    
    def safe_float(val):
        try:
            return float(val) if val is not None else 0.0
        except (ValueError, TypeError):
            return 0.0

    def safe_int(val):
        try:
            return int(val) if val is not None else 0
        except (ValueError, TypeError):
            return 0

    total_revenue = sum(safe_float(sale.get("total_amount", 0)) for sale in sales)
    total_orders = len(sales)
    items_sold = sum(safe_int(sale.get("quantity", 0)) for sale in sales)
    
    # Online vs Offline breakdown
    online_sales = [s for s in sales if s.get("source") == "web"]
    offline_sales = [s for s in sales if s.get("source") != "web"]
    
    online_revenue = sum(safe_float(s.get("total_amount", 0)) for s in online_sales)
    offline_revenue = sum(safe_float(s.get("total_amount", 0)) for s in offline_sales)
    
    recent_sales = []
    for sale in sales[:10]:
        sale_dict = sale.copy()
        sale_dict["_id"] = str(sale_dict["_id"])
        
        # Safely parse timestamp
        ts = sale_dict.get("timestamp")
        if isinstance(ts, datetime):
            sale_dict["timestamp"] = ts.isoformat()
        elif isinstance(ts, str):
            sale_dict["timestamp"] = ts
        else:
            sale_dict["timestamp"] = None
            
        # Ensure source field is present for frontend display
        sale_dict["source"] = sale_dict.get("source", "offline")
        recent_sales.append(sale_dict)
        
    return DashboardStats(
        total_revenue=total_revenue,
        total_orders=total_orders,
        items_sold=items_sold,
        online_revenue=online_revenue,
        offline_revenue=offline_revenue,
        online_orders=len(online_sales),
        offline_orders=len(offline_sales),
        recent_sales=recent_sales
    )


# ── 6. Razorpay Payment (Web Only) ──────────────────────────────

@router.post(
    "/api/payment/create-order",
    response_model=CreateOrderResponse,
    summary="Create a Razorpay order for web checkout",
    tags=["Payment"],
)
def create_razorpay_order(
    payload: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Step 1 of the web payment flow:
    - Verifies the user has a valid saved delivery address
    - Validates stock availability for every item
    - Calculates total amount (items + delivery charge)
    - Creates a Razorpay order via their API
    - Stores the order in the `orders` collection with user_id and address_id
    """
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        )

    # ── Verify address belongs to user ──────────────────────────
    try:
        address_oid = ObjectId(payload.address_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid address ID format.",
        )

    address = db.addresses.find_one({
        "_id": address_oid,
        "user_id": ObjectId(current_user["id"]),
    })
    if not address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid delivery address found. Please add a delivery address before placing an order.",
        )

    collection = db.products

    # Validate stock for each item
    for item in payload.items:
        product = collection.find_one({"sku_id": item.sku_id})
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with SKU '{item.sku_id}' not found.",
            )
        if product.get("stock_count", 0) < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product['name']}' (SKU: {item.sku_id}). "
                    f"Available: {product.get('stock_count', 0)}, Requested: {item.quantity}."
                ),
            )

    # Calculate total in paise (Razorpay expects amounts in smallest currency unit)
    items_total = sum(float(item.price) * item.quantity for item in payload.items)
    delivery = float(payload.delivery_charge)
    total_paise = int(round((items_total + delivery) * 100))

    # Create Razorpay order
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": total_paise,
            "currency": "INR",
            "payment_capture": 1,  # auto-capture payment
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create Razorpay order: {str(e)}",
        )

    # Store order in MongoDB with user and address linkage
    order_doc = {
        "razorpay_order_id": razorpay_order["id"],
        "user_id": ObjectId(current_user["id"]),
        "address_id": address_oid,
        "items": [
            {
                "sku_id": item.sku_id,
                "quantity": item.quantity,
                "price": float(item.price)
            }
            for item in payload.items
        ],
        "delivery_charge": delivery,
        "amount_paise": total_paise,
        "currency": "INR",
        "status": "created",
        "source": "web",
        "created_at": datetime.utcnow(),
    }
    db.orders.insert_one(order_doc)

    return CreateOrderResponse(
        razorpay_order_id=razorpay_order["id"],
        amount=total_paise,
        currency="INR",
        key_id=RAZORPAY_KEY_ID,
    )


@router.post(
    "/api/payment/create-test-order",
    response_model=CreateOrderResponse,
    summary="Create a ₹1 test order for Razorpay integration testing",
    tags=["Payment"],
)
def create_test_order(db: Database = Depends(get_db)):
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay is not configured.",
        )
    
    total_paise = 100 # Minimum ₹1

    try:
        razorpay_order = razorpay_client.order.create({
            "amount": total_paise,
            "currency": "INR",
            "payment_capture": 1,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create Razorpay order: {str(e)}",
        )

    # Store order as a test order
    order_doc = {
        "razorpay_order_id": razorpay_order["id"],
        "items": [],
        "delivery_charge": 0,
        "amount_paise": total_paise,
        "currency": "INR",
        "status": "created",
        "source": "web_test",
        "created_at": datetime.utcnow(),
    }
    db.orders.insert_one(order_doc)

    return CreateOrderResponse(
        razorpay_order_id=razorpay_order["id"],
        amount=total_paise,
        currency="INR",
        key_id=RAZORPAY_KEY_ID,
    )


@router.post(
    "/api/payment/verify",
    response_model=VerifyPaymentResponse,
    summary="Verify Razorpay payment and complete checkout",
    tags=["Payment"],
)
def verify_razorpay_payment(payload: VerifyPaymentRequest, db: Database = Depends(get_db)):
    """
    Step 2 of the web payment flow:
    - Verifies the Razorpay payment signature (HMAC SHA256)
    - On success: deducts stock, records sales (same collection as POS),
      and updates order status to "paid"
    - This ensures admin dashboard stats include web orders automatically
    """
    # 1. Verify the payment signature
    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if expected_signature != payload.razorpay_signature:
        # Update order status to failed
        db.orders.update_one(
            {"razorpay_order_id": payload.razorpay_order_id},
            {"$set": {"status": "failed", "updated_at": datetime.utcnow()}},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. Invalid signature.",
        )

    # 2. Look up the order
    order = db.orders.find_one({"razorpay_order_id": payload.razorpay_order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )
    if order.get("status") == "paid":
        return VerifyPaymentResponse(
            success=True,
            message="Payment was already verified.",
            order_id=payload.razorpay_order_id,
        )

    # 3. Deduct stock and record sales (same collection as app/POS)
    collection = db.products
    for item in order["items"]:
        updated = collection.find_one_and_update(
            {
                "sku_id": item["sku_id"],
                "stock_count": {"$gte": item["quantity"]},
            },
            {"$inc": {"stock_count": -item["quantity"]}},
            return_document=ReturnDocument.AFTER,
        )
        if updated:
            # Record sale — same format as POS/app sales for unified dashboard
            db.sales.insert_one({
                "sku_id": item["sku_id"],
                "quantity": item["quantity"],
                "price": float(item["price"]),
                "total_amount": float(item["price"]) * item["quantity"],
                "source": "web",
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "timestamp": datetime.utcnow(),
            })

    # 4. Update order status to paid
    db.orders.update_one(
        {"razorpay_order_id": payload.razorpay_order_id},
        {
            "$set": {
                "status": "paid",
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    return VerifyPaymentResponse(
        success=True,
        message="Payment verified successfully. Your order has been placed!",
        order_id=payload.razorpay_order_id,
    )
