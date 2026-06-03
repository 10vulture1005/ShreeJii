"""
Database configuration — PyMongo client and dependency.
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Database URL: override via environment variable for production
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(MONGO_URI)
db = client.shreeji_db

def get_db():
    """FastAPI dependency that provides the MongoDB database instance."""
    yield db
