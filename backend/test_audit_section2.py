import requests
import datetime
import uuid

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 2: STUDENT PORTAL EXPERIENCE ===")
    
    # 0. Setup: Create a fresh test student and an admin token
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get a real specialization and institution
    spec_res = requests.get(f"{BASE_URL}/api/learning/specializations")
    if spec_res.status_code == 200 and isinstance(spec_res.json(), list) and len(spec_res.json()) > 0:
        spec_name = spec_res.json()[0]['name']
    else:
        spec_name = "Artificial Intelligence & Autonomous Systems"
        
    inst_res = requests.get(f"{BASE_URL}/api/institutions")
    if inst_res.status_code == 200 and isinstance(inst_res.json(), list) and len(inst_res.json()) > 0:
        inst_id = inst_res.json()[0]['id']
    else:
        inst_id = 1
    
    # Generate unique test user
    uid = str(uuid.uuid4())[:8]
    student_email = f"audit_student_{uid}@skillforge.com"
    student_pwd = "password123"
    
    res_student = requests.post(f"{BASE_URL}/api/admin/students", json={
        "name": f"Audit Student {uid}",
        "email": student_email,
        "password": student_pwd,
        "institution_id": inst_id,
        "specialization": spec_name
    }, headers=admin_headers)
    
    if res_student.status_code not in [200, 201]:
        print(f"FAILED to create test student: {res_student.text}")
        return
        
    student_id = res_student.json()["id"]
    student_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_pwd})
    student_token = student_login.json().get("access_token")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    print("\n1. Subject access (Dynamic assignment vs implicit)")
    # First, student shouldn't see subjects they aren't explicitly assigned
    res_sub_before = requests.get(f"{BASE_URL}/api/learning/subjects", headers=student_headers)
    if res_sub_before.status_code == 200:
        print(f"Subjects before assignment: {len(res_sub_before.json())} subjects found")
    else:
        print(f"Subjects before assignment (Status {res_sub_before.status_code})")
    
    # Admin assigns a subject
    all_subs = requests.get(f"{BASE_URL}/api/admin/subadmins/subjects", headers=admin_headers)
    if all_subs.status_code == 200 and all_subs.json():
        test_sub_id = all_subs.json()[0]['id']
        assign_res = requests.post(f"{BASE_URL}/api/admin/students/bulk-subject-assignment", json={
            "student_ids": [student_id],
            "subject_id": test_sub_id
        }, headers=admin_headers)
        print(f"Subject assignment status: {assign_res.status_code}")
        
        # Check again
        res_sub_after = requests.get(f"{BASE_URL}/api/learning/subjects", headers=student_headers)
        if res_sub_after.status_code == 200:
            print(f"Subjects after assignment: {len(res_sub_after.json())} subjects found")
    else:
        print("Failed to get subjects to assign.")
        test_sub_id = 1
        
    print("\n2. Slot booking outside window enforcement")
    # Fetch exam window for the assigned subject (or a generic one)
    window_res = requests.get(f"{BASE_URL}/api/admin/subadmins/subjects/{test_sub_id}/exam-window", headers=admin_headers)
    
    if window_res.status_code == 200:
        # Setup window to be in the past
        past_start = (datetime.datetime.utcnow() - datetime.timedelta(days=10)).isoformat()
        past_end = (datetime.datetime.utcnow() - datetime.timedelta(days=2)).isoformat()
        
        upd_window = requests.patch(f"{BASE_URL}/api/admin/subadmins/subjects/{test_sub_id}/exam-window", json={
            "start_date": past_start,
            "end_date": past_end
        }, headers=admin_headers)
        
        # Student attempts to book
        book_res = requests.post(f"{BASE_URL}/api/learning/subjects/{test_sub_id}/slots/book", json={
            "subject_id": test_sub_id,
            "slot_date": (datetime.datetime.utcnow() + datetime.timedelta(days=1)).isoformat()[:10],
            "slot_time": "10:00 - 11:00"
        }, headers=student_headers)
        print(f"Book outside window status: {book_res.status_code} - {book_res.text}")
    else:
        print(f"Could not get/set exam window for subject {test_sub_id}")
        
    print("\n3. View/manage booked slots")
    # Ensure they can list their booked sessions
    list_book = requests.get(f"{BASE_URL}/api/learning/slots", headers=student_headers)
    print(f"List bookings status: {list_book.status_code}")
    
    print("\n4. Live classes (Isolation)")
    # Get live classes
    lc_res = requests.get(f"{BASE_URL}/api/communications/live-sessions", headers=student_headers)
    print(f"Live classes fetch status: {lc_res.status_code}")
    
    print("\n5. Mock exam results")
    # Check mock results endpoint (Does it exist?)
    mock_res = requests.get(f"{BASE_URL}/api/learning/my-mock-results", headers=student_headers)
    if mock_res.status_code == 404:
        print("Mock results endpoint missing or 404 (Not Built)")
    else:
        print(f"Mock results status: {mock_res.status_code}")
        
    print("\n6. AI exam attempt visibility (Server-side limit)")
    # Try to start mock exam
    attempts = []
    for i in range(4):
        start_res = requests.post(f"{BASE_URL}/api/learning/start-mock-exam", json={"subject_id": test_sub_id}, headers=student_headers)
        attempts.append(start_res.status_code)
    print(f"AI Mock start statuses across 4 attempts: {attempts} (404 implies Not Built)")
    
    print("\n7. Dashboard components (bookmarks, cert wallet, completion)")
    # Test bookmarks
    bm_res = requests.get(f"{BASE_URL}/api/learning/bookmarks", headers=student_headers)
    print(f"Bookmarks endpoint status: {bm_res.status_code} (404 implies Not Built)")
    
    # Test cert wallet
    cert_res = requests.get(f"{BASE_URL}/api/certificates/{student_id}", headers=student_headers)
    print(f"Cert wallet endpoint status: {cert_res.status_code}")

if __name__ == "__main__":
    run_tests()
