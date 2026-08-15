import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    columns_to_add = [
        ("course_proposals", "ai_summary", "TEXT"),
        ("course_proposals", "ai_category", "TEXT"),
        ("course_proposals", "risk_level", "TEXT"),
        ("course_proposals", "demand_score", "INTEGER"),
        ("course_proposals", "ai_recommendation", "TEXT"),
        ("course_proposals", "duplicate_status", "BOOLEAN DEFAULT FALSE"),
        ("course_proposals", "ai_flagged_reason", "TEXT"),
        ("course_proposals", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("course_proposals", "rejection_reason", "TEXT"),
        ("course_proposals", "reviewer_feedback", "TEXT"),
        ("course_proposals", "upvotes", "INTEGER DEFAULT 0"),
        ("course_proposals", "downvotes", "INTEGER DEFAULT 0"),
        ("course_proposals", "comment_count", "INTEGER DEFAULT 0"),
        ("users", "institution_id", "INTEGER"),
        ("users", "specialization", "VARCHAR(255)"),
        ("live_sessions", "host_id", "INTEGER"),
        ("live_sessions", "status", "VARCHAR(50) DEFAULT 'scheduled'"),
        ("live_sessions", "target_batch", "VARCHAR(100)"),
    ]

    for table, column, col_type in columns_to_add:
        try:
            with engine.begin() as conn:
                query = text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                conn.execute(query)
                logger.info(f"Successfully added column '{column}' to table '{table}'")
        except Exception as e:
            error_str = str(e).lower()
            if "duplicate column name" in error_str or "already exists" in error_str or "42701" in error_str:
                logger.info(f"Column '{column}' already exists in table '{table}', skipping.")
            else:
                logger.error(f"Failed to add column '{column}': {e}")

    logger.info("Migration completed.")

if __name__ == "__main__":
    migrate()
