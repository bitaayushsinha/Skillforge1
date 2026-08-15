import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('skillforge.db')
        cursor = conn.cursor()
        
        try:
            cursor.execute("ALTER TABLE exam_configs ADD COLUMN max_violations INTEGER DEFAULT 3")
            print("Added max_violations to exam_configs")
        except sqlite3.OperationalError as e:
            print(f"exam_configs alter error: {e}")
            
        try:
            cursor.execute("ALTER TABLE exam_sessions ADD COLUMN suspended_at DATETIME")
            print("Added suspended_at to exam_sessions")
        except sqlite3.OperationalError as e:
            print(f"exam_sessions alter error: {e}")
            
        conn.commit()
        conn.close()
        print("Migration complete")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    migrate()
