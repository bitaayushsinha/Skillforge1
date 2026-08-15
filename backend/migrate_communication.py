import logging
from sqlalchemy import text
from database import engine, Base
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    try:
        # Create any missing tables (email_logs, announcement_reads, ticket_messages, etc.)
        Base.metadata.create_all(bind=engine)
        logger.info("Base.metadata.create_all completed successfully.")

        columns_to_add = [
            ("users", "force_password_change", "BOOLEAN DEFAULT FALSE"),
            ("live_sessions", "created_by", "INTEGER"),
        ]

        for table, column, col_type in columns_to_add:
            try:
                with engine.begin() as conn:
                    query = text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                    conn.execute(query)
                    logger.info(f"Successfully added column '{column}' to table '{table}'")
            except Exception as e:
                error_str = str(e).lower()
                if "duplicate column name" in error_str or "already exists" in error_str:
                    logger.info(f"Column '{column}' already exists in table '{table}', skipping.")
                else:
                    logger.warning(f"Note when adding column '{column}': {e}")

        logger.info("Communication & Live Sessions migration completed.")
    except Exception as e:
        logger.error(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
