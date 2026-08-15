import requests
import datetime
import uuid
import json

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 3: COURSE NAVIGATION & LEARNING ===")
    
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
    inst_id = inst_res.json()[0]['id'] if inst_res.status_code == 200 and isinstance(inst_res.json(), list) and len(inst_res.json()) > 0 else 1
    
    # Generate unique test user
    uid = str(uuid.uuid4())[:8]
    student_email = f"audit_student_sec3_{uid}@skillforge.com"
    student_pwd = "password123"
    
    res_student = requests.post(f"{BASE_URL}/api/admin/students", json={
        "name": f"Audit Sec3 Student {uid}",
        "email": student_email,
        "password": student_pwd,
        "institution_id": inst_id,
        "specialization": spec_name
    }, headers=admin_headers)
    
    student_id = res_student.json()["id"]
    student_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_pwd})
    student_token = student_login.json().get("access_token")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Get a subject and assign it to student
    all_subs = requests.get(f"{BASE_URL}/api/admin/subadmins/subjects", headers=admin_headers)
    test_sub_id = all_subs.json()[0]['id'] if all_subs.status_code == 200 and all_subs.json() else 1
    
    requests.post(f"{BASE_URL}/api/admin/students/bulk-subject-assignment", json={
        "student_ids": [student_id],
        "subject_id": test_sub_id
    }, headers=admin_headers)
    
    print("\n1. Fetch Subject Courses")
    courses_res = requests.get(f"{BASE_URL}/api/learning/subjects/{test_sub_id}/courses", headers=student_headers)
    
    import sys
    sys.path.append('.')
    from database import SessionLocal
    import models
    
    if courses_res.status_code == 200 and courses_res.json():
        test_course_id = courses_res.json()[0]['id']
        print(f"Fetch courses for assigned subject: 200 - Found {len(courses_res.json())} courses")
        
        # Create an unenrolled course for later
        db = SessionLocal()
        c2 = models.Course(title='Unenrolled Course', description='Test', category='Test')
        db.add(c2)
        db.commit()
        db.refresh(c2)
        unenrolled_course_id = c2.id
        db.close()
    else:
        print("No courses returned, creating one directly via SQLAlchemy...")
        db = SessionLocal()
        c1 = models.Course(title='Audit Course', description='Test', category='Test')
        c2 = models.Course(title='Unenrolled Course', description='Test', category='Test')
        db.add_all([c1, c2])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)
        
        test_course_id = c1.id
        unenrolled_course_id = c2.id
        
        mapping = models.SubjectCourseMapping(subject_id=test_sub_id, course_id=test_course_id, order_index=1)
        db.add(mapping)
        db.commit()
        db.close()
        
        # Re-fetch
        courses_res = requests.get(f"{BASE_URL}/api/learning/subjects/{test_sub_id}/courses", headers=student_headers)
        print(f"Fetch courses for assigned subject after DB insert: {courses_res.status_code} - Found {len(courses_res.json()) if courses_res.status_code==200 else 0} courses")
        
    print("\n2. Course Progress Tracking & Enforcement")
    # Test updating progress
    prog_payload = {
        "completed_items": ["module_1", "module_2", "module_99"], # Arbitrary, no server validation of items
        "quiz_answers": {"q1": "a", "q99": "b"}
    }
    prog_res = requests.put(f"{BASE_URL}/api/learning/courses/{test_course_id}/progress", json=prog_payload, headers=student_headers)
    print(f"Update progress status: {prog_res.status_code}")
    if prog_res.status_code == 200:
        print("Progress updated successfully. The API blindly accepted arbitrary modules without validating if they exist or if linear progression is followed.")
    else:
        print(f"Failed response: {prog_res.text}")
        
    print("\n3. Cross-course / Unenrolled course isolation")
    bad_prog_res = requests.put(f"{BASE_URL}/api/learning/courses/{unenrolled_course_id}/progress", json={"completed_items": []}, headers=student_headers)
    print(f"Update progress for unenrolled/non-existent course: {bad_prog_res.status_code}")
    if bad_prog_res.status_code == 200:
        print("VULNERABILITY: API allows saving progress for any course ID without checking registration or assignment.")
        
if __name__ == "__main__":
    run_tests()
