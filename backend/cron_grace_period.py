import logging
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_grace_periods():
    db: Session = SessionLocal()
    try:
        from services.access_scheduler import sweep_expired_access_windows
        summary = sweep_expired_access_windows(db)
        logger.info(f"Grace period sweep completed: {summary}")
    except Exception as e:
        logger.error(f"Error checking grace periods: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_grace_periods()
