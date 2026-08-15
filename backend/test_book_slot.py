import requests
import json
import uuid

url = "http://localhost:8000/api/v1/exam-engine/slots/book"
payload = {
    "booking_reference": f"BKG-{uuid.uuid4().hex[:6].upper()}",
    "student_id": 32,
    "student_name": "Test User",
    "student_email": "test@example.com",
    "registration_number": "REG-1234",
    "subject_id": 5,
    "subject_code": "SUB-1",
    "subject_name": "Federated Learning",
    "level": "District",
    "slot_date": "2026-07-14",
    "slot_time": "09:00 AM - 10:00 AM",
    "slot_datetime": "2026-07-14T09:00:00.000Z",
    "webhook_callback_url": "http://localhost:8000/api/webhooks/exam-engine"
}

res = requests.post(url, json=payload)
print(f"Status Code: {res.status_code}")
if res.status_code != 200:
    try:
        print(res.json())
    except:
        print(res.text)
