from database import SessionLocal
import traceback
from routes.exam_credentials import book_slot
import schemas
import uuid

db = SessionLocal()

request = schemas.SlotBookRequest(
    booking_reference=f"BKG-{uuid.uuid4().hex[:6].upper()}",
    student_id=32,
    student_name="Test User",
    student_email="test@example.com",
    subject_id=5,
    subject_code="SUB-5",
    subject_name="Federated Learning",
    level="District",
    slot_date="2026-07-14",
    slot_time="09:00 AM - 10:00 AM",
    slot_datetime="2026-07-14T09:00:00.000Z",
    webhook_callback_url="http://localhost:8000/api/webhooks/exam-engine"
)

try:
    res = book_slot(request=request, db=db)
    print("Success:")
    print(res)
except Exception as e:
    print("Error:")
    traceback.print_exc()
finally:
    db.close()
