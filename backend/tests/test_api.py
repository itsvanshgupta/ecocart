import pytest
from fastapi.testclient import TestClient

import app.main as main
import app.services.gemini_service as gs

client = TestClient(main.app)


def test_health_without_keys_uses_rule_engine():
    body = client.get("/health").json()
    assert body["status"] == "healthy"
    assert body["llm_providers"] == []
    assert body["engine"] == "heuristic_fallback"


def test_grade_endpoint_returns_five_dimensions():
    res = client.post("/api/ai/grade", json={
        "product_name": "Cloud Cotton Towels",
        "material": "GOTS organic cotton",
        "packaging": "Plastic-free paper wrap",
        "certification": "GOTS",
    })
    assert res.status_code == 200
    grade = res.json()["grade_data"]
    assert grade["composite_grade"] in {"A", "B"}
    assert set(grade["dimensions"]) == {"materials", "packaging", "carbon", "ethics", "durability"}
    assert 0 <= grade["score_100"] <= 100


def test_chat_falls_back_to_tips_without_keys():
    res = client.post("/api/ai/chat", json={"message": "how do I recycle this?"})
    assert res.status_code == 200
    assert "Recycling Tip" in res.json()["reply"]


def test_chat_cache_answers_repeat_questions_once(monkeypatch):
    calls = []
    monkeypatch.setattr(main, "llm_providers", lambda: ["gemini"])
    monkeypatch.setattr(main, "chat_eco_advisor", lambda **kw: (calls.append(kw), "real answer")[1])

    # The browser appends the current message to history before sending it.
    body = {"message": "Is cork sustainable?", "history": [{"role": "user", "content": "Is cork sustainable?"}]}
    first = client.post("/api/ai/chat", json=body).json()
    second = client.post("/api/ai/chat", json=body).json()

    assert first["reply"] == second["reply"] == "real answer"
    assert second["cached"] is True
    assert len(calls) == 1
    assert calls[0]["history"] == []


def test_chat_error_reply_is_not_cached(monkeypatch):
    calls = []
    monkeypatch.setattr(main, "llm_providers", lambda: ["gemini"])
    monkeypatch.setattr(main, "chat_eco_advisor", lambda **kw: (calls.append(1), gs.CHAT_ERROR_REPLY)[1])

    client.post("/api/ai/chat", json={"message": "hello there"})
    client.post("/api/ai/chat", json={"message": "hello there"})
    assert len(calls) == 2


def test_chat_is_rate_limited_per_ip():
    statuses = [
        client.post("/api/ai/chat", json={"message": f"question {i}"}).status_code
        for i in range(main.CHAT_LIMIT_PER_WINDOW + 3)
    ]
    assert statuses.count(200) == main.CHAT_LIMIT_PER_WINDOW
    assert statuses.count(429) == 3


def test_rate_limit_is_tracked_separately_per_forwarded_ip():
    for i in range(main.CHAT_LIMIT_PER_WINDOW):
        client.post("/api/ai/chat", json={"message": f"q{i}"}, headers={"x-forwarded-for": "10.0.0.1"})
    blocked = client.post("/api/ai/chat", json={"message": "again"}, headers={"x-forwarded-for": "10.0.0.1"})
    other = client.post("/api/ai/chat", json={"message": "again"}, headers={"x-forwarded-for": "10.0.0.2"})
    assert blocked.status_code == 429
    assert other.status_code == 200


def test_cors_allows_configured_origin_only():
    allowed = client.options("/api/ai/chat", headers={
        "Origin": "https://ecocart-delta.vercel.app", "Access-Control-Request-Method": "POST"})
    denied = client.options("/api/ai/chat", headers={
        "Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://ecocart-delta.vercel.app"
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_database_endpoints_report_unconfigured_supabase():
    assert client.get("/health/db").status_code == 503
    assert client.get("/api/ai/recommendations/some-id").status_code == 503


@pytest.mark.parametrize("path", ["/", "/docs", "/openapi.json"])
def test_public_routes_respond(path):
    assert client.get(path).status_code == 200
