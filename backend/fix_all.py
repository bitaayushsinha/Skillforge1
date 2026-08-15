import sqlite3

conn = sqlite3.connect('skillforge.db')
c = conn.cursor()

# Enforce default values for existing raw insert records which are causing 500
c.execute("""
UPDATE student_registrations 
SET 
    payment_status = COALESCE(payment_status, 'unpaid'),
    total_paid_amount = COALESCE(total_paid_amount, 0.0),
    innovation_hub_eligible = COALESCE(innovation_hub_eligible, 0),
    participation_cert_status = COALESCE(participation_cert_status, 'pending_approval')
""")

# Also find any user who is role='learner' but has no registration and add one
c.execute('''
SELECT id, specialization, institution_id FROM users 
WHERE role='learner' 
AND id NOT IN (SELECT user_id FROM student_registrations)
''')
missing_users = c.fetchall()

if missing_users:
    # get active cycle
    c.execute('SELECT name FROM registration_cycles WHERE is_active=1')
    cycle = c.fetchone()
    cycle_name = cycle[0] if cycle else '2026-2027'
    
    for u in missing_users:
        uid, spec_name, inst_id = u
        # get spec id
        c.execute('SELECT id FROM specializations WHERE name=?', (spec_name,))
        spec = c.fetchone()
        spec_id = spec[0] if spec else 1
        
        inst = inst_id if inst_id else 1
        
        c.execute('''
            INSERT INTO student_registrations 
            (user_id, cycle_year, current_tier, access_status, is_archived, specialization_id, institution_id, payment_status, total_paid_amount, innovation_hub_eligible, participation_cert_status)
            VALUES (?, ?, 'District', 'active', 0, ?, ?, 'unpaid', 0.0, 0, 'pending_approval')
        ''', (uid, cycle_name, spec_id, inst))
        
conn.commit()
conn.close()
print(f"Fixed {len(missing_users)} learners missing registration.")
