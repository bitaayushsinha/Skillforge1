import requests
import sys
import json
import datetime

BASE_URL = "http://localhost:8000"

def verify_phase2():
    print("=== VERIFYING PHASE 2: COURSE PROGRESSION VULNERABILITY & LINEAR PROGRESSION ===")
    
    sys.path.append('.')
    from database import SessionLocal
    import models
    from auth import create_access_token
    
    db = SessionLocal()
    
    # 1. Setup a test course with 2 modules (`Module 1` and `Module 2`) mapped to a subject
    print("Setting up test course, subject, and student assignments...")
    
    # Find or create a specialization and institution
    spec = db.query(models.Specialization).first()
    if not spec:
        spec = models.Specialization(name="Test Spec P2", code="TS-P2")
        db.add(spec)
        db.commit()
        
    inst = db.query(models.Institution).first()
    if not inst:
        inst = models.Institution(name="Test Inst P2", code="TI-P2")
        db.add(inst)
        db.commit()
        
    # Create test course with structured modules_data
    test_course = models.Course(
        title="Federated Learning Masterclass (Phase 2 Test)",
        description="Testing course progression security and linear rules",
        category="AI",
        modules_data=[
            {
                "title": "Module 1: Fundamentals",
                "lessons": [
                    {
                        "id": "m1_lesson1",
                        "title": "Introduction to FL",
                        "contents": [
                            {"id": "c0", "type": "text", "text_content": "Welcome to FL"},
                            {"id": "c1", "type": "video", "content_url": "/static/vid1.mp4"}
                        ]
                    }
                ]
            },
            {
                "title": "Module 2: Advanced Aggregation",
                "lessons": [
                    {
                        "id": "m2_lesson1",
                        "title": "FedAvg Algorithm",
                        "contents": [
                            {"id": "c0", "type": "text", "text_content": "Let us explore FedAvg"}
                        ]
                    }
                ]
            }
        ]
    )
    db.add(test_course)
    db.commit()
    db.refresh(test_course)
    course_id = test_course.id
    print(f"Created Test Course ID: {course_id}")
    
    # Create two subjects: one assigned to the learner, one unassigned
    subj_assigned = models.Subject(specialization_id=spec.id, institution_id=inst.id, name="Assigned FL Subject")
    subj_unassigned = models.Subject(specialization_id=spec.id, institution_id=inst.id, name="Unassigned Secret Subject")
    db.add(subj_assigned)
    db.add(subj_unassigned)
    db.commit()
    db.refresh(subj_assigned)
    db.refresh(subj_unassigned)
    
    # Map the test course to BOTH subjects
    mapping1 = models.SubjectCourseMapping(subject_id=subj_assigned.id, course_id=course_id, order_index=1)
    db.add(mapping1)
    db.commit()
    
    # Create another course mapped ONLY to unassigned subject
    secret_course = models.Course(
        title="Top Secret Unassigned Course",
        description="No learner should touch this progress",
        category="Security",
        modules_data=[{"title": "M1", "lessons": [{"id": "sec_l1", "contents": [{"id": "c0", "type": "text"}]}]}]
    )
    db.add(secret_course)
    db.commit()
    db.refresh(secret_course)
    secret_course_id = secret_course.id
    mapping2 = models.SubjectCourseMapping(subject_id=subj_unassigned.id, course_id=secret_course_id, order_index=1)
    db.add(mapping2)
    db.commit()
    
    # Find or create a learner
    learner = db.query(models.User).filter(models.User.role == "learner").first()
    if not learner:
        learner = models.User(email="testlearner_p2@skillforge.com", name="Learner P2", hashed_password="hashedpassword", role="learner")
        db.add(learner)
        db.commit()
        db.refresh(learner)
        
    # Ensure active registration for learner
    reg = db.query(models.StudentRegistration).filter(models.StudentRegistration.user_id == learner.id).first()
    if not reg:
        reg = models.StudentRegistration(user_id=learner.id, institution_id=inst.id, specialization_id=spec.id, access_status="active")
        db.add(reg)
    else:
        reg.access_status = "active"
    db.commit()
    db.refresh(reg)
    
    # Assign ONLY subj_assigned to this learner
    db.query(models.StudentSubjectAssignment).filter(models.StudentSubjectAssignment.user_id == learner.id).delete()
    assign = models.StudentSubjectAssignment(user_id=learner.id, subject_id=subj_assigned.id, registration_id=reg.id)
    db.add(assign)
    
    # Clean up existing progress for these test courses
    db.query(models.UserCourseProgress).filter(
        models.UserCourseProgress.user_id == learner.id,
        models.UserCourseProgress.course_id.in_([course_id, secret_course_id])
    ).delete()
    db.commit()
    
    token = create_access_token({"sub": str(learner.id), "role": learner.role})
    headers = {"Authorization": f"Bearer {token}"}
    db.close()
    
    # Test 1: Try to access progress for `secret_course_id` which is NOT assigned to the learner -> Expect 403
    print(f"\n--- Test 1: Accessing unassigned course progress (Course ID {secret_course_id}) ---")
    res_unassigned = requests.get(f"{BASE_URL}/api/learning/courses/{secret_course_id}/progress", headers=headers)
    print(f"Status: {res_unassigned.status_code} - Response: {res_unassigned.text}")
    assert res_unassigned.status_code == 403, f"Expected 403 Forbidden for unassigned course, got {res_unassigned.status_code}"
    
    res_unassigned_put = requests.put(f"{BASE_URL}/api/learning/courses/{secret_course_id}/progress", json={"completed_items": ["sec_l1_c0"]}, headers=headers)
    print(f"PUT Status: {res_unassigned_put.status_code} - Response: {res_unassigned_put.text}")
    assert res_unassigned_put.status_code == 403, f"Expected 403 Forbidden for PUT on unassigned course, got {res_unassigned_put.status_code}"
    
    # Test 2: Try to access nonexistent course -> Expect 404
    print(f"\n--- Test 2: Accessing nonexistent course progress (Course ID 999999) ---")
    res_404 = requests.get(f"{BASE_URL}/api/learning/courses/999999/progress", headers=headers)
    print(f"Status: {res_404.status_code} - Response: {res_404.text}")
    assert res_404.status_code == 404, f"Expected 404 for nonexistent course, got {res_404.status_code}"
    
    # Test 3: Try submitting invalid/bogus item ID to assigned course (`course_id`) -> Expect 400
    print(f"\n--- Test 3: Submitting bogus item ID to assigned course (Course ID {course_id}) ---")
    res_bogus = requests.put(f"{BASE_URL}/api/learning/courses/{course_id}/progress", json={"completed_items": ["fake_module_999_c0"]}, headers=headers)
    print(f"Status: {res_bogus.status_code} - Response: {res_bogus.text}")
    assert res_bogus.status_code == 400, f"Expected 400 rejection for bogus item ID, got {res_bogus.status_code}"
    
    # Test 4: Try completing Module 2 item (`m2_lesson1_c0`) when Module 1 items (`m1_lesson1_c0`, `m1_lesson1_c1`) are NOT completed -> Expect 400 (Linear Progression Rule violation)
    print(f"\n--- Test 4: Skipping Module 1 and completing Module 2 item ---")
    res_skip = requests.put(f"{BASE_URL}/api/learning/courses/{course_id}/progress", json={"completed_items": ["m2_lesson1_c0"]}, headers=headers)
    print(f"Status: {res_skip.status_code} - Response: {res_skip.text}")
    assert res_skip.status_code == 400, f"Expected 400 rejection for skipping Module 1, got {res_skip.status_code}"
    assert "Linear progression rule violation" in res_skip.text, f"Expected linear progression error message, got {res_skip.text}"
    
    # Test 5: Complete Module 1 items (`m1_lesson1_c0`, `m1_lesson1_c1`) -> Expect 200 OK
    print(f"\n--- Test 5: Completing Module 1 items legitimately ---")
    res_m1 = requests.put(f"{BASE_URL}/api/learning/courses/{course_id}/progress", json={"completed_items": ["m1_lesson1_c0", "m1_lesson1_c1"]}, headers=headers)
    print(f"Status: {res_m1.status_code} - Response: {res_m1.text}")
    assert res_m1.ok, f"Expected 200 success for Module 1 completion, got {res_m1.status_code}"
    
    # Test 6: Now complete Module 2 item (`m2_lesson1_c0`) along with Module 1 items -> Expect 200 OK
    print(f"\n--- Test 6: Progressing to Module 2 after Module 1 is completed ---")
    res_m2 = requests.put(f"{BASE_URL}/api/learning/courses/{course_id}/progress", json={"completed_items": ["m1_lesson1_c0", "m1_lesson1_c1", "m2_lesson1_c0"]}, headers=headers)
    print(f"Status: {res_m2.status_code} - Response: {res_m2.text}")
    assert res_m2.ok, f"Expected 200 success for progressing to Module 2, got {res_m2.status_code}"
    
    print("\nSUCCESS: All Phase 2 Course Progression security and linear progression tests passed perfectly!")

if __name__ == "__main__":
    verify_phase2()
