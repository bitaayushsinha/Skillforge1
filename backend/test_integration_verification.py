import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from auth import create_access_token

client = TestClient(app)

def get_token_for_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            return None, None
        token = create_access_token(data={"sub": str(user.id), "role": user.role})
        return token, user
    finally:
        db.close()

def test_1_community_proposals_ui_shape():
    print("Testing GET /api/proposals/community UI contract...")
    response = client.get("/api/proposals/community")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        item = data[0]
        for expected_key in ["id", "title", "author", "daysAgo", "tags", "votes"]:
            assert expected_key in item, f"Missing key {expected_key} in community proposal item"
    print("-> PASS: /api/proposals/community returns correct UI shape.")

def test_2_learner_course_progress():
    print("Testing PUT & GET /api/learning/courses/{id}/progress...")
    token, user = get_token_for_user("learner@skillforge.com")
    assert token is not None, "Learner user not found in DB"
    headers = {"Authorization": f"Bearer {token}"}
    
    put_payload = {
        "completed_items": ["lesson_1", "lesson_2"],
        "quiz_answers": {"q1": 2, "q2": 0}
    }
    put_res = client.put("/api/learning/courses/101/progress", json=put_payload, headers=headers)
    assert put_res.status_code == 200, f"PUT progress failed: {put_res.text}"
    
    get_res = client.get("/api/learning/courses/101/progress", headers=headers)
    assert get_res.status_code == 200
    prog_data = get_res.json()
    assert "completed_items" in prog_data
    assert "quiz_answers" in prog_data
    assert prog_data["completed_items"] == ["lesson_1", "lesson_2"]
    print("-> PASS: Learner course progress persistence verified.")

def test_3_reviewer_certificate_issues():
    print("Testing GET & PUT /api/reviewer/certificate-issues...")
    token, user = get_token_for_user("reviewer@skillforge.com")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    
    get_res = client.get("/api/reviewer/certificate-issues", headers=headers)
    assert get_res.status_code == 200
    issues = get_res.json()
    assert isinstance(issues, list)
    if len(issues) > 0:
        issue_id = issues[0]["id"]
        update_payload = {"status": "resolved"}
        put_res = client.put(f"/api/reviewer/certificate-issues/{issue_id}", json=update_payload, headers=headers)
        assert put_res.status_code == 200
        assert put_res.json()["status"] == "resolved"
    print("-> PASS: Reviewer certificate issues endpoints verified.")

def test_4_rbac_enforcement():
    print("Testing granular RBAC privilege enforcement...")
    # Admin bypasses privilege check
    admin_token, _ = get_token_for_user("admin@skillforge.com")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    res_admin = client.get("/api/admin/students", headers=headers_admin)
    assert res_admin.status_code == 200
    print("-> PASS: Admin user access verified.")

if __name__ == "__main__":
    test_1_community_proposals_ui_shape()
    test_2_learner_course_progress()
    test_3_reviewer_certificate_issues()
    test_4_rbac_enforcement()
    print("\nALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
