import requests

BASE_URL = "https://v0-shree-ji-e-commerce.onrender.com"

def test_live():
    # 1. Login
    login_data = {
        "username": "admin@shreeji.com",
        "password": "admin@123"
    }
    r = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    if r.status_code != 200:
        print("Login failed:", r.status_code, r.text)
        return
    
    token = r.json()["access_token"]
    print("Logged in successfully.")

    # 2. Get Stats
    headers = {"Authorization": f"Bearer {token}"}
    r2 = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
    print("Stats Status:", r2.status_code)
    print("Stats Response:", r2.text)

if __name__ == "__main__":
    test_live()
