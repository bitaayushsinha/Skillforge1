import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('skillforge.db')
        cursor = conn.cursor()
        
        try:
            cursor.execute("ALTER TABLE exam_question_banks ADD COLUMN bank_type VARCHAR DEFAULT 'formal'")
            print("Added bank_type to exam_question_banks")
        except sqlite3.OperationalError as e:
            print(f"exam_question_banks alter error: {e}")
            
        try:
            cursor.execute("ALTER TABLE exam_configs ADD COLUMN randomize_questions BOOLEAN DEFAULT 1")
            print("Added randomize_questions to exam_configs")
        except sqlite3.OperationalError as e:
            print(f"exam_configs alter error: {e}")
            
        conn.commit()
        conn.close()
        print("Migration complete")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    migrate()
