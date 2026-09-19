"""Supabase pgvector operations for EcoCart's RAG recommendations."""
from typing import Any, Dict, List

from supabase import create_client

from app.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
from app.services.gemini_service import embed_text


GRADE_VALUE = {"A": 6, "B": 5, "C": 4, "D": 3, "E": 2, "F": 1}


def _client():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "Supabase is not configured. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def ping_database() -> None:
    """Cheap query used by the keep-alive workflow so the free Supabase project never pauses."""
    _client().table("products").select("id").limit(1).execute()


def _embedding_text(product: Dict[str, Any]) -> str:
    return " | ".join(
        str(value) for value in [
            product.get("name", ""),
            product.get("category", ""),
            product.get("description", ""),
            product.get("material", ""),
            product.get("packaging", ""),
            product.get("certification", ""),
            product.get("origin_country", ""),
        ] if value
    )


def _vector_literal(vector: List[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in vector) + "]"


def embed_product(product: Dict[str, Any]) -> List[float]:
    vector = embed_text(_embedding_text(product))
    _client().table("products").update({"embedding": _vector_literal(vector)}).eq(
        "id", product["id"]
    ).execute()
    return vector


def _stored_vector_literal(product: Dict[str, Any]) -> str:
    """Reuse the pgvector embedding already in Postgres; only call Gemini if it is missing."""
    stored = product.get("embedding")
    if isinstance(stored, str) and stored:
        return stored
    if isinstance(stored, list) and stored:
        return _vector_literal(stored)
    return _vector_literal(embed_product(product))


def embed_catalog() -> Dict[str, int]:
    client = _client()
    result = client.table("products").select("*").eq("is_active", True).execute()
    products = result.data or []
    completed = 0
    failed = 0
    for product in products:
        try:
            embed_product(product)
            completed += 1
        except Exception:
            failed += 1
    return {"total": len(products), "embedded": completed, "failed": failed}


def find_greener_alternatives(product_id: str, limit: int = 3) -> List[Dict[str, Any]]:
    client = _client()
    product_result = client.table("products").select("*").eq("id", product_id).single().execute()
    product = product_result.data
    if not product:
        return []

    comparison_group = product.get("comparison_group")
    if not comparison_group or comparison_group == "general":
        return []

    matches = client.rpc(
        "match_products_in_group",
        {
            "query_embedding": _stored_vector_literal(product),
            "target_group": comparison_group,
            "match_count": limit + 1,
        },
    ).execute().data or []

    current_grade = GRADE_VALUE.get(product.get("eco_grade"), 0)
    return [
        match for match in matches
        if match["id"] != product_id
        and GRADE_VALUE.get(match.get("eco_grade"), 0) > current_grade
    ][:limit]


def find_greener_alternatives_by_name(product_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Resolve a locally rendered product name to its Supabase catalog record."""
    result = _client().table("products").select("id").eq("name", product_name).limit(1).execute()
    products = result.data or []
    if not products:
        return []
    return find_greener_alternatives(products[0]["id"], limit)
