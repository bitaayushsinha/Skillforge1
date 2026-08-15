from database import SessionLocal
import models
import requests

def test_cert_lookup():
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.email == "alice.test1@example.com").first()
    student_id = str(user.id) if user else "1"
    db.close()
    
    # Test HTML
    res = requests.get(f"http://localhost:8000/api/verify/student/{student_id}")
    print(f"HTML Status for ID {student_id}:", res.status_code)
    
    # Test JSON
    res_json = requests.get(f"http://localhost:8000/api/verify/student/{student_id}", headers={"Accept": "application/json"})
    print(f"JSON Status for ID {student_id}:", res_json.status_code)
    if res_json.status_code == 200:
        print(res_json.json())

if __name__ == "__main__":
    test_cert_lookup()
