import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file manually if it exists
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

# Fetch database URL from environment, default to postgresql or SQLite fallback
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL.startswith("postgresql://"):
    logger.info("Modifying postgresql:// schema to use pg8000 pure-Python driver.")
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

if not DATABASE_URL:
    logger.warning("DATABASE_URL env var not found. Falling back to SQLite local database.")
    DATABASE_URL = "sqlite:///./skillforge.db"

# Setup engine configuration
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        logger.info(f"Successfully connected to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
except Exception as e:
    logger.error(f"Failed to connect to database at {DATABASE_URL}. Error: {e}")
    logger.warning("Falling back to SQLite: sqlite:///./skillforge.db")
    DATABASE_URL = "sqlite:///./skillforge.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def run_auto_migrations(eng):
    from sqlalchemy import text
    try:
        with eng.connect() as conn:
            if "postgres" in str(eng.url):
                conn.execute(text("ALTER TABLE mock_test_attempts ADD COLUMN IF NOT EXISTS score FLOAT;"))
                conn.execute(text("ALTER TABLE mock_test_attempts ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 10;"))
                conn.execute(text("ALTER TABLE mock_test_attempts ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'completed';"))
            conn.commit()
    except Exception as e:
        logger.warning(f"Auto-migration check skipped or failed: {e}")

run_auto_migrations(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
