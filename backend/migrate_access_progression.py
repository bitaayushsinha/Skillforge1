import logging
from sqlalchemy import text
from database import engine, Base
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_access_progression")

def migrate():
    # 1. Create any new tables (payment_records, access_audit_logs)
    logger.info("Creating any missing tables via Base.metadata.create_all...")
    Base.metadata.create_all(bind=engine)

    # 2. Add columns to student_registrations if not present
    columns_to_add = [
        ("access_state", "VARCHAR DEFAULT 'active'"),
        ("status_started_at", "DATETIME NULL"),
        ("deactivates_at", "DATETIME NULL"),
        ("payment_required", "BOOLEAN DEFAULT 0"),
        ("badge_tier", "VARCHAR NULL"),
    ]

    with engine.begin() as conn:
        for col_name, col_def in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE student_registrations ADD COLUMN {col_name} {col_def}"))
                logger.info(f"Added column '{col_name}' to student_registrations table.")
            except Exception as e:
                # Column likely already exists
                logger.info(f"Column '{col_name}' already exists or could not be added: {e}")

    logger.info("Access progression schema migration completed successfully.")

if __name__ == "__main__":
    migrate()
