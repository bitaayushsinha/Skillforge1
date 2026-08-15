import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0"))
            logger.info("Added must_change_password to users")
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    migrate()
