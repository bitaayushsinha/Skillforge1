import sqlite3
conn = sqlite3.connect('skillforge.db')
c = conn.cursor()
c.execute("UPDATE exam_slot_bookings SET assessment_link = replace(assessment_link, 'https://skillforge.lms', 'http://localhost:3000')")
c.execute("UPDATE exam_slot_bookings SET assessment_link = replace(assessment_link, 'http://skillforge.lms', 'http://localhost:3000')")
conn.commit()
conn.close()
print("Updated database links successfully.")
