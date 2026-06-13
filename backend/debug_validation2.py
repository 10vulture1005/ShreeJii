import os
from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient
client = MongoClient(os.getenv('MONGO_URI', 'mongodb://localhost:27017/'))
db = client['shreeji']
from pydantic import BaseModel
from typing import Optional, List

class ProductOut(BaseModel):
    sku_id: str
    name: str
    source_name: str
    clothing_type: str
    color: str
    price: float
    image_url: Optional[str] = None
    image_urls: List[str] = []
    qr_image_url: Optional[str] = None
    description: Optional[str] = None
    stock_count: int

for doc in db.products.find({'stock_count': {'$gt': 0}}):
    try:
        # Replicate EXACTLY what router.py does
        ProductOut(
            sku_id=doc["sku_id"],
            name=doc["name"],
            source_name=doc["source_name"],
            clothing_type=doc.get("clothing_type"),
            color=doc["color"],
            price=doc["price"],
            image_url=doc.get("image_url"),
            image_urls=doc.get("image_urls", []),
            qr_image_url=doc.get("qr_image_url"),
            description=doc.get("description"),
            stock_count=doc["stock_count"],
        )
    except Exception as e:
        print(f"Error doc: {doc}")
