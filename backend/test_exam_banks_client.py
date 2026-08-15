from fastapi.testclient import TestClient
from main import app
import traceback

client = TestClient(app)
try:
    response = client.get("/api/exam-banks/")
    print(response.status_code)
    print(response.json())
except Exception as e:
    traceback.print_exc()
