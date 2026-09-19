import pytest

import app.services.vector_service as vs


class FakeQuery:
    def __init__(self, data):
        self.data = data

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def single(self):
        return self

    def update(self, payload):
        self.updated = payload
        return self

    def execute(self):
        return self


class FakeClient:
    def __init__(self, product=None, matches=None):
        self.product = product
        self.matches = matches or []
        self.rpc_calls = []

    def table(self, name):
        return FakeQuery(self.product)

    def rpc(self, name, args):
        self.rpc_calls.append((name, args))
        return FakeQuery(self.matches)


def test_stored_string_embedding_is_reused_without_calling_gemini(monkeypatch):
    monkeypatch.setattr(vs, "embed_text", lambda text: pytest.fail("Gemini must not be called"))
    assert vs._stored_vector_literal({"id": "1", "embedding": "[0.1,0.2,0.3]"}) == "[0.1,0.2,0.3]"


def test_stored_list_embedding_is_formatted_as_pgvector_literal(monkeypatch):
    monkeypatch.setattr(vs, "embed_text", lambda text: pytest.fail("Gemini must not be called"))
    assert vs._stored_vector_literal({"id": "1", "embedding": [1.0, 0.5]}) == "[1.00000000,0.50000000]"


def test_missing_embedding_is_generated_once_and_saved(monkeypatch):
    monkeypatch.setattr(vs, "_client", lambda: FakeClient())
    calls = []
    monkeypatch.setattr(vs, "embed_text", lambda text: (calls.append(text), [0.25, 0.75])[1])

    literal = vs._stored_vector_literal({"id": "1", "name": "Cork Yoga Block", "embedding": None})
    assert literal == "[0.25000000,0.75000000]"
    assert len(calls) == 1 and "Cork Yoga Block" in calls[0]


def test_only_strictly_greener_alternatives_are_returned(monkeypatch):
    product = {"id": "me", "eco_grade": "B", "comparison_group": "t-shirt", "embedding": "[0.1]"}
    matches = [
        {"id": "me", "name": "Bamboo Tee", "eco_grade": "B"},
        {"id": "a", "name": "Hemp Tee", "eco_grade": "A"},
        {"id": "b", "name": "Cotton Tee", "eco_grade": "B"},
        {"id": "c", "name": "Poly Tee", "eco_grade": "C"},
    ]
    client = FakeClient(product, matches)
    monkeypatch.setattr(vs, "_client", lambda: client)
    monkeypatch.setattr(vs, "embed_text", lambda text: pytest.fail("Gemini must not be called"))

    result = vs.find_greener_alternatives("me")

    assert [m["name"] for m in result] == ["Hemp Tee"]
    name, args = client.rpc_calls[0]
    assert name == "match_products_in_group"
    assert args["target_group"] == "t-shirt"
    assert args["query_embedding"] == "[0.1]"


def test_alternatives_are_capped_at_the_limit(monkeypatch):
    product = {"id": "me", "eco_grade": "F", "comparison_group": "towels", "embedding": "[0.1]"}
    matches = [{"id": str(i), "name": f"Towel {i}", "eco_grade": "A"} for i in range(6)]
    monkeypatch.setattr(vs, "_client", lambda: FakeClient(product, matches))
    assert len(vs.find_greener_alternatives("me", limit=2)) == 2


@pytest.mark.parametrize("group", [None, "", "general"])
def test_products_without_a_curated_group_get_no_recommendations(monkeypatch, group):
    product = {"id": "me", "eco_grade": "B", "comparison_group": group, "embedding": "[0.1]"}
    client = FakeClient(product, [{"id": "a", "eco_grade": "A"}])
    monkeypatch.setattr(vs, "_client", lambda: client)
    assert vs.find_greener_alternatives("me") == []
    assert client.rpc_calls == []


def test_unknown_product_returns_empty_list(monkeypatch):
    monkeypatch.setattr(vs, "_client", lambda: FakeClient(product=None))
    assert vs.find_greener_alternatives("missing") == []


def test_lookup_by_name_resolves_the_catalog_id(monkeypatch):
    monkeypatch.setattr(vs, "_client", lambda: FakeClient(product=[{"id": "abc"}]))
    seen = {}
    monkeypatch.setattr(vs, "find_greener_alternatives", lambda pid, limit=3: seen.update(pid=pid, limit=limit) or ["ok"])

    assert vs.find_greener_alternatives_by_name("Bamboo Everyday Tee") == ["ok"]
    assert seen == {"pid": "abc", "limit": 3}


def test_lookup_by_unknown_name_returns_empty_list(monkeypatch):
    monkeypatch.setattr(vs, "_client", lambda: FakeClient(product=[]))
    assert vs.find_greener_alternatives_by_name("Nope") == []


def test_client_requires_supabase_configuration():
    with pytest.raises(RuntimeError, match="not configured"):
        vs._client()
