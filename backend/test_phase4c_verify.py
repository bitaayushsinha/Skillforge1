import requests
import sys

BASE_URL = "http://localhost:8000"

def verify_phase4c():
    print("=== VERIFYING PHASE 4c: STUDENT ANALYTICS PDF GENERATION ===")
    sys.path.append('.')
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    # Get real users from DB (including those with exam results)
    users = db.query(models.User).limit(2).all()
    test_ids = [u.id for u in users]
    results = db.query(models.ExamResult).all()
    if results:
        test_ids.append(results[0].student_id)
        
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    db.close()
    
    for uid in set(test_ids):
        print(f"\n--- Testing PDF Generation for User ID {uid} ---")
        res = requests.get(f"{BASE_URL}/api/admin/reports/student/{uid}/analytics/pdf", headers=headers)
        print(f"Status Code: {res.status_code}")
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        content_type = res.headers.get("Content-Type")
        print(f"Content-Type: {content_type}")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        assert len(res.content) > 1000, f"Expected non-empty PDF binary, got {len(res.content)} bytes"
        print(f"Success! Downloaded valid PDF of size {len(res.content)} bytes.")
        
    print("\nSUCCESS: Phase 4c PDF Generation verified perfectly across test candidates!")

if __name__ == "__main__":
    verify_phase4c()
