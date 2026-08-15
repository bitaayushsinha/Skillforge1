import sqlalchemy
from database import SessionLocal
import models
import json

db = SessionLocal()
try:
    prog = models.UserCourseProgress(
        user_id=1,
        course_id=1,
        completed_items="[]",
        quiz_answers="{}"
    )
    db.add(prog)
    db.commit()
    print("Success")
except Exception as e:
    print(f"Error: {e}")
