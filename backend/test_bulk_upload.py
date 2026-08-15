import csv
import io
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import schemas
from auth import create_access_token

client = TestClient(app)

def test_bulk_upload():
    # 1. Login as admin to get token
    response = client.post("/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    if response.status_code != 200:
        print("Login failed:", response.json())
        return
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Prepare test CSV
    csv_content = """name,email,password,institution_code,specialization
Alice Test,alice.test1@example.com,secret123,STANFORD,AI & Machine Learning
Bob Test,bob.test1@example.com,password456,MIT,Data Science
Charlie Invalid,charlie.inv,,STANFORD,AI
Duplicate Email,alice.test1@example.com,pw123,MIT,Data Science
"""
    
    # 3. Post to /bulk-upload
    files = {'file': ('test_students.csv', csv_content, 'text/csv')}
    res = client.post("/api/admin/students/bulk-upload", headers=headers, files=files)
    print("Status:", res.status_code)
    print("Response:", res.json())

if __name__ == "__main__":
    test_bulk_upload()
