import csv
import io
import os
import uuid
import time
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import schemas

client = TestClient(app)

import os

# Force SMTP variables so it doesn't use the mock fallback
os.environ["SMTP_HOST"] = "smtp.gmail.com"
os.environ["SMTP_PORT"] = "587"
os.environ["SMTP_USER"] = "test@example.com"
os.environ["SMTP_PASSWORD"] = "wrong_password_intentionally"

def verify_emails():
    print("--- STARTING EMAIL VERIFICATION ---")
    
    # 1. Login as admin
    response = client.post("/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    if response.status_code != 200:
        print("Login failed:", response.json())
        return
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    db = SessionLocal()
    
    # Helper to get the latest email log
    def get_latest_email_log(email: str):
        return db.query(models.EmailLog).filter(models.EmailLog.recipient == email).order_by(models.EmailLog.sent_at.desc()).first()

    # 2. Test Sub-Admin Creation
    print("\n[1/4] Testing Sub-Admin Creation...")
    subadmin_email = f"subadmin_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": subadmin_email,
        "name": "Test SubAdmin",
        "password": "Password123!",
        "role": "sub_admin",
        "privileges": {"manage_students": True}
    }
    res = client.post("/api/admin/subadmins", headers=headers, json=payload)
    if res.status_code == 201:
        print("  Sub-Admin created successfully.")
        log = get_latest_email_log(subadmin_email)
        if log:
            print(f"  EmailLog status: {log.status} (Template: {log.template_type})")
        else:
            print("  FAIL: No EmailLog found.")
    else:
        print("  FAIL: Sub-Admin creation failed.", res.json())

    # 3. Test Student Creation
    print("\n[2/4] Testing Single Student Creation...")
    student_email = f"student_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": student_email,
        "name": "Test Student",
        "password": "Password123!"
    }
    res = client.post("/api/admin/students", headers=headers, json=payload)
    if res.status_code == 201:
        print("  Student created successfully.")
        log = get_latest_email_log(student_email)
        if log:
            print(f"  EmailLog status: {log.status} (Template: {log.template_type})")
        else:
            print("  FAIL: No EmailLog found.")
    else:
        print("  FAIL: Student creation failed.", res.json())

    # 4. Test Bulk Upload (Background tasks)
    print("\n[3/4] Testing Bulk Upload...")
    csv_content = f"""name,email,password
Bulk 1,bulk1_{uuid.uuid4().hex[:4]}@example.com,pass1
Bulk 2,bulk2_{uuid.uuid4().hex[:4]}@example.com,pass2
Bulk 3,bulk3_{uuid.uuid4().hex[:4]}@example.com,pass3
"""
    files = {'file': ('test_bulk.csv', csv_content, 'text/csv')}
    res = client.post("/api/admin/students/bulk-upload", headers=headers, files=files)
    if res.status_code == 200:
        print("  Bulk upload triggered successfully. Waiting 3 seconds for background tasks...")
        time.sleep(3) # Wait for background tasks
        for line in csv_content.strip().split('\\n')[1:]:
            email = line.split(',')[1]
            log = get_latest_email_log(email)
            if log:
                print(f"  EmailLog for {email}: {log.status}")
            else:
                print(f"  FAIL: No EmailLog found for {email}")
    else:
        print("  FAIL: Bulk upload failed.", res.json())

    # 5. Test Failure Handling
    print("\n[4/4] Testing Error Handling (SMTP Failure)...")
    
    fail_email = f"fail_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": fail_email,
        "name": "Fail Test",
        "password": "Password123!"
    }
    res = client.post("/api/admin/students", headers=headers, json=payload)
    if res.status_code == 201:
        warning = res.json().get("warning")
        print(f"  Student created. Warning field returned: '{warning}'")
        if not warning:
            print("  FAIL: Warning field was not returned in the API response!")
            
        log = get_latest_email_log(fail_email)
        if log:
            print(f"  EmailLog status: {log.status}, Error: {log.error_message}")
            if log.status != "failed":
                print("  FAIL: EmailLog status should be 'failed'.")
        else:
            print("  FAIL: No EmailLog found.")
    else:
        print("  FAIL: Student creation failed unexpectedly.", res.json())

    print("\n--- VERIFICATION COMPLETE ---")
    db.close()

if __name__ == "__main__":
    verify_emails()
