import requests
import traceback

BASE_URL = "https://v0-shree-ji-e-commerce.onrender.com"

def test_endpoints():
    print("Testing /api/products")
    try:
        r = requests.get(f"{BASE_URL}/api/products")
        print(r.status_code, r.text[:200])
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    test_endpoints()
