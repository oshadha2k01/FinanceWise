from fastapi.testclient import TestClient
from main import app
import pytest

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_login_no_credentials():
    response = client.post("/api/auth/login", json={})
    assert response.status_code == 422 # Unprocessable Entity due to missing fields

def test_register_no_credentials():
    response = client.post("/api/auth/register", json={})
    assert response.status_code == 422

# You would add mocking for MongoDB and Gemini API here in a full test suite
