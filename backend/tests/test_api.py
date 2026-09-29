from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_and_login_flow():
    payload = {"email": "demo@example.com", "password": "secret123", "full_name": "Demo User"}
    register = client.post("/api/auth/register", json=payload)
    assert register.status_code == 200, register.text
    token = register.json()["access_token"]
    assert token

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "demo@example.com"


def test_health_log_and_wellness_summary():
    payload = {"email": "wellness@example.com", "password": "secret123", "full_name": "Wellness User"}
    register = client.post("/api/auth/register", json=payload)
    token = register.json()["access_token"]

    log = client.post(
        "/api/health/logs",
        json={"sleep_hours": 7.5, "steps": 9000, "hydration_liters": 2.5, "nutrition_score": 80, "stress_level": 35},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert log.status_code == 200, log.text
    summary = client.get("/api/health/summary", headers={"Authorization": f"Bearer {token}"})
    assert summary.status_code == 200
    assert summary.json()["average_index"] >= 0


def test_chat_demo_flow():
    payload = {"email": "chat@example.com", "password": "secret123", "full_name": "Chat User"}
    register = client.post("/api/auth/register", json=payload)
    token = register.json()["access_token"]

    session = client.post("/api/chat/sessions", json={"title": "Demo conversation"}, headers={"Authorization": f"Bearer {token}"})
    assert session.status_code == 200
    session_id = session.json()["id"]

    resp = client.post(f"/api/chat/sessions/{session_id}/messages", json={"content": "I have morning exercise issues due to college."}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert "response_text" in body
    assert "recommendations" in body
