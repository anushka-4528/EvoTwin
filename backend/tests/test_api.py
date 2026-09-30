from typing import Any
import uuid

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


def test_full_digital_twin_onboarding_memory_and_feedback_flow():
    email = f"flow-{uuid.uuid4().hex}@example.com"
    register = client.post("/api/auth/register", json={
        "email": email,
        "password": "initial-secret",
        "full_name": "Flow Test User",
    })
    assert register.status_code == 200, register.text
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert register.json()["user"]["onboarding_completed"] is False

    incomplete_onboarding = client.post("/api/auth/onboarding", headers=headers, json={
        "full_name": "Flow Test User",
        "age": 29,
        "gender": "Prefer not to say",
        "goals": ["Improve fitness"],
        "activity_level": "moderate",
        "lifestyle_summary": "Busy work and study schedule",
    })
    assert incomplete_onboarding.status_code == 422

    onboarding = client.post("/api/auth/onboarding", headers=headers, json={
        "full_name": "Flow Test User",
        "age": 29,
        "gender": "Prefer not to say",
        "goals": ["Improve fitness"],
        "activity_level": "moderate",
        "lifestyle_summary": "Busy work and study schedule",
        "dietary_preferences": ["Vegetarian"],
        "sleep_hours": 7.5,
        "exercise_preferences": ["Cycling"],
        "preferred_activities": ["Walking"],
        "avoided_activities": ["Running"],
    })
    assert onboarding.status_code == 200, onboarding.text
    assert onboarding.json()["onboarding_completed"] is True

    twin = client.get("/api/twin", headers=headers)
    assert twin.status_code == 200, twin.text
    twin_body = twin.json()
    assert twin_body["profile"]["activity_level"] == "moderate"
    assert any(memory["category"] == "preferred_activity" for memory in twin_body["long_term_memories"])

    dashboard = client.get("/api/dashboard/summary", headers=headers)
    assert dashboard.status_code == 200, dashboard.text
    assert dashboard.json()["goals"] == ["Improve fitness"]

    session = client.post("/api/chat/sessions", headers=headers, json={"title": "Exercise ideas"})
    assert session.status_code == 200, session.text
    session_id = session.json()["id"]
    response = client.post(
        f"/api/chat/sessions/{session_id}/messages",
        headers=headers,
        json={"content": "What exercise should I do today?"},
    )
    assert response.status_code == 200, response.text
    answer = response.json()
    assert "Walking" in answer["response_text"]
    context_labels = {item["label"] for item in answer["context_used"]}
    assert "Preferred activities" in context_labels
    assert "Dietary preferences" not in context_labels

    feedback = client.post(
        f"/api/chat/sessions/{session_id}/feedback",
        headers=headers,
        json={"rating": "not_helpful", "correction": "I don't like yoga either. I prefer cycling."},
    )
    assert feedback.status_code == 200, feedback.text
    evolved_twin = client.get("/api/twin", headers=headers).json()
    assert "Yoga" in evolved_twin["profile"]["avoided_activities"]
    assert "Yoga" not in evolved_twin["profile"]["preferred_activities"]
    assert "Cycling" in evolved_twin["profile"]["preferred_activities"]

    session_memory = client.post("/api/memory", headers=headers, json={
        "category": "mood",
        "content": "Feeling low energy today",
        "memory_type": "session",
    })
    assert session_memory.status_code == 200, session_memory.text
    assert len(client.get("/api/twin", headers=headers).json()["session_memories"]) == 1
    cleared = client.delete("/api/memory/session", headers=headers)
    assert cleared.status_code == 200, cleared.text
    assert client.get("/api/twin", headers=headers).json()["session_memories"] == []

    password_change = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "initial-secret",
        "new_password": "updated-secret",
    })
    assert password_change.status_code == 200, password_change.text
    login = client.post("/api/auth/login", json={"email": email, "password": "updated-secret"})
    assert login.status_code == 200, login.text
