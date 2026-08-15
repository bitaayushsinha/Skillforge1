import requests
import datetime
import uuid
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 5: LIVE SESSIONS & COMMUNICATION ===")
    
    # 0. Setup: Admin Token & Student Setup
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    sys.path.append('.')
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    # We will need a specialization and an institution for isolation tests
    inst = db.query(models.Institution).first()
    inst_id = inst.id if inst else 1
    
    spec1 = db.query(models.Specialization).first()
    spec1_id = spec1.id if spec1 else 1
    spec2_id = 9999
    # Ensure a second spec exists
    if not db.query(models.Specialization).filter_by(id=spec2_id).first():
        spec2 = models.Specialization(id=spec2_id, name="Test Spec 2", code="TS2")
        db.add(spec2)
        db.commit()
        
    student_email = f"audit_sec5_{uuid.uuid4().hex[:8]}@skillforge.com"
    student_pwd = "password123"
    
    # Create test student for spec 1
    res_student = requests.post(f"{BASE_URL}/api/admin/students", json={
        "name": "Audit Sec5 Student",
        "email": student_email,
        "password": student_pwd,
        "institution_id": inst_id,
        "specialization": spec1.name if spec1 else "AI"
    }, headers=admin_headers)
    student_id = res_student.json()["id"]
    
    student_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_pwd})
    student_token = student_login.json().get("access_token")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    print("\n1. Admin Create Live Session (Zoom Integration Check)")
    # Test creating a session. Notice we must provide the zoom_join_url ourselves.
    payload_spec1 = {
        "title": "Spec 1 Live Class",
        "host_name": "Admin Expert",
        "session_datetime": (datetime.datetime.utcnow() + datetime.timedelta(days=1)).isoformat() + "Z",
        "duration_minutes": 60,
        "zoom_join_url": "https://zoom.us/j/fake123",
        "target_institution_id": inst_id,
        "target_specialization_id": spec1_id
    }
    create_res = requests.post(f"{BASE_URL}/api/communications/live-sessions", json=payload_spec1, headers=admin_headers)
    print(f"Create session spec 1 status: {create_res.status_code}")
    if create_res.status_code == 201:
        print("Session created. Flag: Zoom link is manually passed by Admin. Backend does NOT integrate with Zoom API.")
        
    # Create another session for spec 2
    payload_spec2 = payload_spec1.copy()
    payload_spec2["title"] = "Spec 2 Live Class"
    payload_spec2["target_specialization_id"] = spec2_id
    payload_spec2["zoom_join_url"] = "https://zoom.us/j/fake999"
    requests.post(f"{BASE_URL}/api/communications/live-sessions", json=payload_spec2, headers=admin_headers)
    
    print("\n2. Student Fetch Live Sessions (Isolation Check)")
    # Student in Spec 1 should only see Spec 1 sessions (or institution-wide ones)
    list_res = requests.get(f"{BASE_URL}/api/communications/live-sessions", headers=student_headers)
    print(f"Fetch sessions status: {list_res.status_code}")
    if list_res.status_code == 200:
        sessions = list_res.json()
        titles = [s['title'] for s in sessions]
        print(f"Sessions visible to student: {titles}")
        if "Spec 2 Live Class" in titles:
            print("VULNERABILITY: Specialization isolation is FAKED. Student sees sessions for other specializations.")
        else:
            print("Isolation successful: Student only sees appropriate sessions.")
            
    db.close()

if __name__ == "__main__":
    run_tests()
