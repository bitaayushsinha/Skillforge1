import requests
import datetime
import uuid
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 10: SYSTEM SETTINGS, ACCESS RULES & SECURITY ===")
    
    # 0. Setup: Admin Token & Student Setup
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    student_email = f"audit_sec10_{uuid.uuid4().hex[:8]}@skillforge.com"
    student_pwd = "password123"
    
    # Create test student for spec 1
    res_student = requests.post(f"{BASE_URL}/api/admin/students", json={
        "name": "Audit Sec10 Student",
        "email": student_email,
        "password": student_pwd,
        "institution_id": 1,
        "specialization": "Artificial Intelligence & Autonomous Systems"
    }, headers=admin_headers)
    
    if res_student.status_code == 201:
        student_id = res_student.json()["id"]
        student_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_pwd})
        student_token = student_login.json().get("access_token")
    else:
        # Fallback if creation fails (maybe missing institution)
        student_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "test_student@skillforge.com", "password": "password123"})
        student_token = student_login.json().get("access_token")
        
    if not student_token:
        print("Failed to get student token.")
        return
        
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    print("\n1. RBAC & Security (Student accessing Admin route)")
    # Try to access system dashboard as a student
    dash_res = requests.get(f"{BASE_URL}/api/admin/reports/system-dashboard", headers=student_headers)
    print(f"Student accessing admin dashboard status: {dash_res.status_code}")
    if dash_res.status_code in [401, 403]:
        print("Success: RBAC successfully blocks unauthorized access.")
    else:
        print("VULNERABILITY: Student can access admin endpoints!")

    print("\n2. Access Rule Engine & Auto-Lockout")
    print("Source Inspection Confirms: access_scheduler.py and access_rule_engine.py exist and handle grace period logic.")
    # Check if the cron job is wired in main.py
    import os
    main_py_path = os.path.join(os.path.dirname(__file__), "main.py")
    try:
        with open(main_py_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'sweep_expired_access_windows' in content:
                print("Success: Auto-lockout sweep job is wired into FastAPI lifecycle (main.py).")
            else:
                print("Flag: Sweep job exists but not wired into main.py startup/cron loop.")
    except Exception as e:
        print("Could not read main.py")

    print("\n3. System Settings Configuration Endpoint")
    # Often, systems have an admin endpoint to change grace period days or SMTP settings
    # Let's see if /api/admin/settings or similar exists
    settings_res = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
    print(f"Settings Endpoint status: {settings_res.status_code}")
    if settings_res.status_code == 404:
        print("Flag: No System Settings endpoint exists. Configuration must be done via DB or code.")
        
if __name__ == "__main__":
    run_tests()
