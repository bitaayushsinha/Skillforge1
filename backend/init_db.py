import logging
from database import engine, Base
import models  # This will trigger the import of all models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    logger.info("Creating new tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully created tables.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
