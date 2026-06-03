import os
from pymongo import MongoClient
from dotenv import load_dotenv
from decimal import Decimal
import traceback
from datetime import datetime
from app.schemas import DashboardStats

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    MONGO_URI = "mongodb+srv://lcs2024016_db_user:G4JhlsQN4xhyoXwO@cluster0.lhk6jzz.mongodb.net/"

client = MongoClient(MONGO_URI)
db = client.shreeji_db

def test_stats():
    # fetch sales
    try:
        sales = list(db.sales.find().sort("timestamp", -1))
        
        total_revenue = sum(sale.get("total_amount", 0) for sale in sales)
        total_orders = len(sales)
        items_sold = sum(sale.get("quantity", 0) for sale in sales)

        online_sales = [s for s in sales if s.get("source") == "web"]
        offline_sales = [s for s in sales if s.get("source") != "web"]

        online_revenue = sum(s.get("total_amount", 0) for s in online_sales)
        offline_revenue = sum(s.get("total_amount", 0) for s in offline_sales)
        
        recent_sales = []
        for sale in sales[:10]:
            sale_dict = sale.copy()
            sale_dict["_id"] = str(sale_dict["_id"])
            sale_dict["timestamp"] = sale_dict["timestamp"].isoformat()
            sale_dict["source"] = sale_dict.get("source", "offline")
            recent_sales.append(sale_dict)
            
        stats = DashboardStats(
            total_revenue=total_revenue,
            total_orders=total_orders,
            items_sold=items_sold,
            online_revenue=online_revenue,
            offline_revenue=offline_revenue,
            online_orders=len(online_sales),
            offline_orders=len(offline_sales),
            recent_sales=recent_sales
        )
        print("Stats serialization successful.")
        print(stats.model_dump())
    except Exception as e:
        print("Error during stats computation:")
        traceback.print_exc()

if __name__ == "__main__":
    test_stats()
