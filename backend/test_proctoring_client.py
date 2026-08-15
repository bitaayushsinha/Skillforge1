import asyncio
from playwright.async_api import async_playwright
from sqlalchemy import create_engine, text
import json
import time
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+pg8000://'))

def get_db_violations(session_id):
    with engine.connect() as conn:
        result = conn.execute(text('SELECT violation_type, severity, message FROM exam_violation_logs WHERE session_id = :s ORDER BY id DESC'), {'s': session_id})
        return result.fetchall()

async def test_proctoring():
    with engine.connect() as conn:
        subject = conn.execute(text('SELECT id, name FROM subjects LIMIT 1')).fetchone()
        subject_id = subject[0] if subject else 1
        
        uid = str(time.time()).replace('.','')
        
        user_id = conn.execute(text('INSERT INTO users (email, name, hashed_password, role, is_active) VALUES (:e, :n, :h, :r, :a) RETURNING id'), 
                       {'e': f'proctor_{uid}@example.com', 'n': 'Test Proctor', 'h': 'hash', 'r': 'student', 'a': 1}).fetchone()[0]
        
        session_id = conn.execute(text('INSERT INTO exam_sessions (session_ref, student_id, subject_id, level, booking_ref, status, remaining_duration) VALUES (:sr, :si, :sub, :lvl, :b, :st, :rd) RETURNING id'),
                       {'sr': f'sess_{uid}', 'si': user_id, 'sub': subject_id, 'lvl': 'District', 'b': f'book_{uid}', 'st': 'pending', 'rd': 3600}).fetchone()[0]
        
        temp_user_id = conn.execute(text('INSERT INTO exam_credentials (session_id, temp_user_id, temp_password_hash, expires_at, status) VALUES (:si, :tui, :tph, CURRENT_TIMESTAMP + interval \'1 day\', :st) RETURNING temp_user_id'),
                       {'si': session_id, 'tui': f'cred_{uid}', 'tph': 'hash', 'st': 'issued'}).fetchone()[0]
        
        bank_id = conn.execute(text('INSERT INTO exam_question_banks (subject_id, level, name, bank_type) VALUES (:sub, :lvl, :n, :bt) RETURNING id'), 
                       {'sub': subject_id, 'lvl': 'District', 'n': 'Test Bank', 'bt': 'formal'}).fetchone()[0]
        
        options = json.dumps(["A", "B"])
        conn.execute(text('INSERT INTO exam_questions (bank_id, text, options, correct_answer) VALUES (:bi, :t, :o, :ca)'), 
                       {'bi': bank_id, 't': 'Q1', 'o': options, 'ca': 0})
                       
        conn.execute(text('UPDATE exam_configs SET requires_screenshare = TRUE WHERE subject_id = :sub AND level = :lvl'), {'sub': subject_id, 'lvl': 'District'})
        if conn.execute(text('SELECT COUNT(*) FROM exam_configs WHERE subject_id = :sub AND level = :lvl'), {'sub': subject_id, 'lvl': 'District'}).fetchone()[0] == 0:
            conn.execute(text('INSERT INTO exam_configs (subject_id, level, requires_screenshare, duration_minutes, question_count) VALUES (:sub, :lvl, TRUE, 60, 50)'), {'sub': subject_id, 'lvl': 'District'})
        
        conn.commit()

    print(f'Created session {session_id} with credential {temp_user_id}')
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        )
        context = await browser.new_context(permissions=['camera', 'clipboard-read', 'clipboard-write'])
        page = await context.new_page()
        
        url = f'http://localhost:3000/exam/take/{temp_user_id}'
        print('Navigating to', url)
        
        # We need to intercept the screen sharing stream creation so we can artificially fire 'ended'
        await page.add_init_script("""
            window._screenTracks = [];
            const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
            navigator.mediaDevices.getDisplayMedia = async function(constraints) {
                const stream = await originalGetDisplayMedia.call(this, constraints);
                window._screenTracks.push(...stream.getVideoTracks());
                return stream;
            };
        """)
        
        await page.goto(url)
        
        # Wait for the compliance UI to render the new screen share warning
        await page.wait_for_selector('text=This exam requires you to share your screen', timeout=10000)
        print('Compliance UI correctly shows screen share requirement.')
        
        # Click start exam
        await page.wait_for_selector('button:has-text("Start Exam")')
        await page.click('button:has-text("Start Exam")')
        
        # Wait for exam to start (Proctoring Active message)
        await page.wait_for_selector('text=Proctoring Active', timeout=10000)
        print('Exam started, screen share and camera granted.')
        
        # Test a) Screen share drop
        print('Testing Screen share drop...')
        await page.evaluate('''
            if (window._screenTracks && window._screenTracks.length > 0) {
                const track = window._screenTracks[0];
                track.dispatchEvent(new Event('ended'));
            }
        ''')
        await asyncio.sleep(1)
        
        # Print DB logs
        logs = get_db_violations(session_id)
        print('--- Database Violation Logs ---')
        for log in logs:
            print(f'Type: {log[0]}, Severity: {log[1]}, Message: {log[2]}')
        
        await browser.close()

asyncio.run(test_proctoring())
