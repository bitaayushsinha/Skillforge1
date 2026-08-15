import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    try:
        with engine.begin() as conn:
            # 1. Registration cycles table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS registration_cycles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR NOT NULL UNIQUE,
                    is_active BOOLEAN DEFAULT 0,
                    start_date DATETIME,
                    end_date DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            # create index on name
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_registration_cycles_name ON registration_cycles (name)"))
            logger.info("Created registration_cycles table")

            # 2. Leaderboard snapshots table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cycle_year VARCHAR NOT NULL,
                    tier VARCHAR NOT NULL,
                    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
                    avg_score FLOAT NOT NULL DEFAULT 0.0,
                    pass_rate FLOAT NOT NULL DEFAULT 0.0,
                    total_students INTEGER NOT NULL DEFAULT 0,
                    total_passed INTEGER NOT NULL DEFAULT 0,
                    rank INTEGER NOT NULL,
                    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_leaderboard_snapshots_cycle_year ON leaderboard_snapshots (cycle_year)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_leaderboard_snapshots_tier ON leaderboard_snapshots (tier)"))
            logger.info("Created leaderboard_snapshots table")

            # 3. Add verify_assessments to subadmin_privileges
            try:
                conn.execute(text("ALTER TABLE subadmin_privileges ADD COLUMN verify_assessments BOOLEAN DEFAULT 0"))
                logger.info("Added verify_assessments to subadmin_privileges")
            except Exception as e:
                logger.info(f"Skipped adding verify_assessments: {e}")

            # 4. Add is_archived to student_registrations
            try:
                conn.execute(text("ALTER TABLE student_registrations ADD COLUMN is_archived BOOLEAN DEFAULT 0"))
                logger.info("Added is_archived to student_registrations")
            except Exception as e:
                logger.info(f"Skipped adding is_archived: {e}")

            # 5. Add verification fields to exam_results
            try:
                conn.execute(text("ALTER TABLE exam_results ADD COLUMN verified_by_poc BOOLEAN DEFAULT 0"))
                conn.execute(text("ALTER TABLE exam_results ADD COLUMN verified_at DATETIME"))
                conn.execute(text("ALTER TABLE exam_results ADD COLUMN verified_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
                logger.info("Added verification fields to exam_results")
            except Exception as e:
                logger.info(f"Skipped adding verification fields to exam_results: {e}")

    except Exception as e:
        logger.error(f"Migration Error: {e}")

if __name__ == "__main__":
    migrate()
