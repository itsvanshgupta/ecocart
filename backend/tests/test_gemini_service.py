import json

import app.services.gemini_service as gs


class FakeResponse:
    def __init__(self, text):
        self._text = text

    def raise_for_status(self):
        pass

    def json(self):
        return {"choices": [{"message": {"content": self._text}}]}


def _boom(*args, **kwargs):
    raise RuntimeError("503 UNAVAILABLE")


def test_heuristic_rewards_organic_and_plastic_free():
    grade = gs._heuristic_grade("Tee", "GOTS organic cotton", "Plastic-free paper wrap", "GOTS")
    assert grade["composite_grade"] == "A"
    assert grade["engine"] == "heuristic_fallback"


def test_heuristic_penalises_synthetic_single_use_plastic():
    grade = gs._heuristic_grade("Bag", "polyester", "single-use plastic polybag")
    assert grade["dimensions"]["materials"] == "D"
    assert grade["dimensions"]["packaging"] == "D"


def test_no_providers_means_rule_engine():
    assert gs.llm_providers() == []
    assert gs.active_engine() == "heuristic_fallback"


def test_active_engine_names_the_gemini_model(monkeypatch):
    monkeypatch.setattr(gs, "_gemini_client", object())
    assert gs.llm_providers() == ["gemini"]
    assert gs.active_engine() == "gemini_3.5_flash_lite"


def test_groq_takes_over_when_gemini_fails(monkeypatch):
    monkeypatch.setattr(gs, "_gemini_client", object())
    monkeypatch.setattr(gs, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(gs, "_gemini_generate", _boom)
    monkeypatch.setattr(gs.httpx, "post", lambda *a, **k: FakeResponse(" from groq "))

    assert gs._generate("hi") == ("from groq", "groq_llama")
    assert gs.llm_providers() == ["gemini", "groq"]


def test_groq_only_configuration(monkeypatch):
    monkeypatch.setattr(gs, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(gs.httpx, "post", lambda *a, **k: FakeResponse("ok"))
    assert gs.active_engine() == "groq_llama"
    assert gs._generate("hi") == ("ok", "groq_llama")


def test_groq_request_asks_for_json_when_grading(monkeypatch):
    sent = {}

    def fake_post(url, headers, json, timeout):
        sent.update(url=url, headers=headers, payload=json)
        return FakeResponse("{}")

    monkeypatch.setattr(gs, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(gs.httpx, "post", fake_post)
    gs._groq_generate("grade this", json_mode=True)

    assert sent["url"] == gs.GROQ_URL
    assert sent["headers"]["Authorization"] == "Bearer test-key"
    assert sent["payload"]["response_format"] == {"type": "json_object"}


def test_grade_uses_llm_json_and_labels_engine(monkeypatch):
    llm_json = json.dumps({"composite_grade": "A", "score_100": 93, "dimensions": {}})
    monkeypatch.setattr(gs, "_gemini_client", object())
    monkeypatch.setattr(gs, "_generate", lambda prompt, json_mode=False: (llm_json, "gemini_3.5_flash_lite"))

    grade = gs.grade_product("Tee", "hemp", "paper")
    assert grade["score_100"] == 93
    assert grade["engine"] == "gemini_3.5_flash_lite"


def test_grade_falls_back_when_llm_returns_garbage(monkeypatch):
    monkeypatch.setattr(gs, "_gemini_client", object())
    monkeypatch.setattr(gs, "_generate", lambda prompt, json_mode=False: ("not json", "gemini"))

    grade = gs.grade_product("Tee", "organic cotton", "paper")
    assert grade["engine"] == "llm_fallback_after_error"
    assert grade["composite_grade"] in {"A", "B", "C", "D"}


def test_chat_returns_friendly_message_when_all_providers_fail(monkeypatch):
    monkeypatch.setattr(gs, "_gemini_client", object())
    monkeypatch.setattr(gs, "_gemini_generate", _boom)
    assert gs.chat_eco_advisor("hello") == gs.CHAT_ERROR_REPLY


def test_chat_prompt_includes_context_and_recent_history(monkeypatch):
    seen = {}

    def fake_generate(prompt, json_mode=False):
        seen["prompt"] = prompt
        return "answer", "gemini"

    monkeypatch.setattr(gs, "_gemini_client", object())
    monkeypatch.setattr(gs, "_generate", fake_generate)
    gs.chat_eco_advisor(
        "and towels?",
        history=[{"role": "user", "content": f"turn {i}"} for i in range(6)],
        product_context="Viewing Cork Yoga Block",
    )
    prompt = seen["prompt"]
    assert "Viewing Cork Yoga Block" in prompt
    assert "turn 5" in prompt and "turn 2" in prompt
    assert "turn 1" not in prompt
    assert prompt.rstrip().endswith("User: and towels?")
