import requests
import sys

BASE_URL = "http://localhost:8000"

def verify_phase4b():
    print("=== VERIFYING PHASE 4b: BOOKMARKS ENDPOINTS ===")
    sys.path.append('.')
    from database import SessionLocal
    import models
    from auth import create_access_token
    
    db = SessionLocal()
    learner = db.query(models.User).filter(models.User.email == "test_bookmark_learner@skillforge.com").first()
    if not learner:
        learner = models.User(email="test_bookmark_learner@skillforge.com", name="Bookmark Learner", hashed_password="pwd", role="learner")
        db.add(learner)
        db.commit()
        db.refresh(learner)
        
    # Clean any existing bookmarks for this test user
    db.query(models.Bookmark).filter(models.Bookmark.user_id == learner.id).delete()
    db.commit()
    
    token = create_access_token({"sub": str(learner.id), "role": learner.role})
    headers = {"Authorization": f"Bearer {token}"}
    db.close()
    
    # Test 1: GET /api/learning/bookmarks (Should be empty initially)
    print("\n--- Test 1: GET /api/learning/bookmarks initially ---")
    res_empty = requests.get(f"{BASE_URL}/api/learning/bookmarks", headers=headers)
    print(f"Status: {res_empty.status_code} - Response: {res_empty.text}")
    assert res_empty.ok
    assert res_empty.json() == []
    
    # Test 2: POST /api/learning/bookmarks (Create bookmark)
    print("\n--- Test 2: POST /api/learning/bookmarks (Create 2 bookmarks) ---")
    bm1 = {"item_type": "course", "item_id": 101, "title": "Advanced AI Course", "url_path": "/courses/101"}
    bm2 = {"item_type": "lesson", "item_id": 202, "title": "Neural Networks Deep Dive", "url_path": "/lessons/202"}
    
    res1 = requests.post(f"{BASE_URL}/api/learning/bookmarks", json=bm1, headers=headers)
    print(f"BM1 Status: {res1.status_code} - Response: {res1.text}")
    assert res1.status_code == 201
    bm1_id = res1.json()["id"]
    
    res2 = requests.post(f"{BASE_URL}/api/learning/bookmarks", json=bm2, headers=headers)
    print(f"BM2 Status: {res2.status_code} - Response: {res2.text}")
    assert res2.status_code == 201
    bm2_id = res2.json()["id"]
    
    # Test 3: POST duplicate bookmark (Should return existing without creating another)
    print("\n--- Test 3: POST duplicate bookmark ---")
    res_dup = requests.post(f"{BASE_URL}/api/learning/bookmarks", json=bm1, headers=headers)
    print(f"Duplicate Status: {res_dup.status_code} - Response: {res_dup.text}")
    assert res_dup.status_code == 201
    assert res_dup.json()["id"] == bm1_id
    
    # Test 4: Verify GET returns exactly 2 bookmarks
    print("\n--- Test 4: GET /api/learning/bookmarks after additions ---")
    res_list = requests.get(f"{BASE_URL}/api/learning/bookmarks", headers=headers)
    print(f"Status: {res_list.status_code} - Count: {len(res_list.json())}")
    assert res_list.ok
    assert len(res_list.json()) == 2
    
    # Test 5: DELETE one bookmark and verify remaining count
    print("\n--- Test 5: DELETE /api/learning/bookmarks/{id} ---")
    res_del = requests.delete(f"{BASE_URL}/api/learning/bookmarks/{bm1_id}", headers=headers)
    print(f"Delete Status: {res_del.status_code}")
    assert res_del.status_code == 204
    
    res_after_del = requests.get(f"{BASE_URL}/api/learning/bookmarks", headers=headers)
    assert len(res_after_del.json()) == 1
    assert res_after_del.json()[0]["id"] == bm2_id
    print("Bookmark successfully deleted and list updated!")
    
    print("\nSUCCESS: Phase 4b Bookmarks Endpoints verified perfectly!")

if __name__ == "__main__":
    verify_phase4b()
