import sqlite3
conn = sqlite3.connect('skillforge.db')
c = conn.cursor()
c.execute("UPDATE exam_slot_bookings SET link_status='confirmed', assessment_link='http://localhost:3000/mock-assessment/' || booking_reference WHERE link_status='pending'")
conn.commit()
conn.close()
print("Updated pending bookings to confirmed.")
