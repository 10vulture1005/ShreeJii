import io
import qrcode
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

def migrate():
    client = MongoClient(MONGO_URI)
    db = client.shreeji_db
    
    products = db.products.find({"qr_image_url": {"$exists": False}})
    
    count = 0
    for product in products:
        sku_id = product["sku_id"]
        
        print(f"Generating QR code for {sku_id}...")
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
        
        db.products.update_one(
            {"_id": product["_id"]},
            {"$set": {"qr_image_url": qr_image_url}}
        )
        count += 1
        
    print(f"Migration complete. Generated QR codes for {count} products.")

if __name__ == "__main__":
    migrate()
