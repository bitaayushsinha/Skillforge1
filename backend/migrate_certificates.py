import logging
from database import engine
from models import Base, Certificate

# Create the certificates table
print("Creating new tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
