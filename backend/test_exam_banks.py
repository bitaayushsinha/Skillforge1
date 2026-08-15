import requests

url = "http://localhost:8000/api/exam-banks/"
try:
    res = requests.get(url)
    print(f"Status Code: {res.status_code}")
    print(res.text)
except Exception as e:
    print(f"Exception: {e}")
