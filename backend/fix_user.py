import sqlite3
from datetime import datetime

conn = sqlite3.connect('skillforge.db')
c = conn.cursor()

# Get the active cycle
c.execute('SELECT name FROM registration_cycles WHERE is_active=1')
cycle = c.fetchone()
print('Active cycle:', cycle)

cycle_name = cycle[0] if cycle else '2026-2027'

# Check if Vineeth (user_id=5) has a registration
c.execute('SELECT id FROM student_registrations WHERE user_id=5')
existing = c.fetchone()

if existing:
    print('Registration already exists:', existing)
    # Also ensure the specialization is 1 so he can see Federated Learning & Edge AI which is specialization_id 1
    c.execute('UPDATE student_registrations SET specialization_id = 1 WHERE user_id = 5')
    conn.commit()
    print('Updated specialization to 1')
else:
    c.execute('SELECT id FROM institutions LIMIT 1')
    inst = c.fetchone()
    inst_id = inst[0] if inst else 1
    # Insert new registration with specialization_id 1
    c.execute('INSERT INTO student_registrations (user_id, cycle_year, current_tier, access_status, is_archived, specialization_id, institution_id) VALUES (5, ?, "District", "active", 0, 1, ?)', (cycle_name, inst_id))
    conn.commit()
    print('Created registration for Vineeth (user 5) in cycle:', cycle_name)

conn.close()
