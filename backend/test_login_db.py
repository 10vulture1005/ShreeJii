import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.shreeji_db

def test_login_db():
    user = db.users.find_one({"email": "admin@shreeji.com"})
    print("User found:", user)
    if user:
        print("Role:", user.get("role"))
        print("Password:", user.get("password"))

if __name__ == "__main__":
    test_login_db()
