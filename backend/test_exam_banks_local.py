from database import SessionLocal
import traceback
from routes.exam_banks import get_question_banks

db = SessionLocal()

try:
    res = get_question_banks(db=db)
    print("Success:")
    print(res)
except Exception as e:
    print("Error:")
    traceback.print_exc()
finally:
    db.close()
