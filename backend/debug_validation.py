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
        ProductOut(**doc)
    except Exception as e:
        print(f"Error in doc {doc.get('sku_id')}: {e}")
