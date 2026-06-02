
import requests
res = requests.get('https://v0-shree-ji-e-commerce.onrender.com/api/products')
print('Status:', res.status_code)
print(res.text)
