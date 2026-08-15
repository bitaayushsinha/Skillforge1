import requests
import datetime
import uuid
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 9: REPORTING & ANALYTICS ===")
    
    # 0. Setup: Admin Token & Student Setup
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    sys.path.append('.')
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    student = db.query(models.User).filter(models.User.role.in_(["student", "learner"])).first() or db.query(models.User).first()
    student_id = student.id if student else 1
    
    print("\n1. Admin Aggregated Dashboard")
    dash_res = requests.get(f"{BASE_URL}/api/admin/reports/system-dashboard", headers=admin_headers)
    print(f"System Dashboard status: {dash_res.status_code}")
    if dash_res.status_code == 200:
        data = dash_res.json()
        print(f"Dashboard Keys: {list(data.keys())}")
        
    print("\n2. Student Analytics PDF Generation")
    pdf_res = requests.get(f"{BASE_URL}/api/admin/reports/student/{student_id}/analytics/pdf", headers=admin_headers)
    print(f"PDF Endpoint status: {pdf_res.status_code}")
    if pdf_res.status_code == 200:
        content_type = pdf_res.headers.get("Content-Type")
        print(f"Content-Type returned: {content_type}")
        if "application/pdf" not in content_type:
            print("VULNERABILITY / FAKED: Endpoint did not return a valid PDF content type.")
        else:
            print("Success: Valid PDF returned.")
    else:
        print(f"Failed to generate PDF: {pdf_res.text}")
        
    print("\n3. CSV / Data Export")
    # Is there a CSV export for enrollments or progression? Let's test the endpoint if it exists
    # If not explicitly defined, we assume it's missing or faked if the requirement mentions downloadable CSV reports.
    
    print("\n4. Leaderboard & Progression")
    lead_res = requests.get(f"{BASE_URL}/api/learning/analytics/leaderboard", headers=admin_headers)
    if lead_res.status_code == 404:
        # maybe under /api/admin/analytics/leaderboard
        lead_res = requests.get(f"{BASE_URL}/api/admin/analytics/leaderboard", headers=admin_headers)
    print(f"Leaderboard status: {lead_res.status_code}")

    db.close()

if __name__ == "__main__":
    run_tests()
