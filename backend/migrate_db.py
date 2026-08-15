import os
import sys
from sqlalchemy import create_engine, text

# Load env vars
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./skillforge.db")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        # Create new tables
        from models import Base
        Base.metadata.create_all(bind=engine)
        print("New tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

    # Add institution_id to subjects if it doesn't exist
    try:
        conn.execute(text("ALTER TABLE subjects ADD COLUMN institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE;"))
        conn.execute(text("CREATE INDEX ix_subjects_institution_id ON subjects (institution_id);"))
        conn.commit()
        print("Added institution_id to subjects.")
    except Exception as e:
        print(f"Column might already exist or error: {e}")
        conn.rollback()

    # Drop exam_window_start and exam_window_end if using postgres
    try:
        conn.execute(text("ALTER TABLE subjects DROP COLUMN exam_window_start;"))
        conn.execute(text("ALTER TABLE subjects DROP COLUMN exam_window_end;"))
        conn.commit()
        print("Dropped exam_window_start and exam_window_end from subjects.")
    except Exception as e:
        print(f"Drop columns error: {e}")
        conn.rollback()

print("Migration completed.")
