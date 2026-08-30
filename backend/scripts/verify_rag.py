"""Verify that lower-grade catalog products have exact greener RAG matches."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.vector_service import _client, find_greener_alternatives

if __name__ == "__main__":
    products = _client().table("products").select(
        "id,name,eco_grade,comparison_group"
    ).eq("is_active", True).in_("eco_grade", ["B", "C", "D", "E", "F"]).execute().data or []
    checks = []
    for product in products:
        matches = find_greener_alternatives(product["id"], limit=1)
        checks.append({
            "product": product["name"],
            "group": product["comparison_group"],
            "recommendation": matches[0]["name"] if matches else None,
            "recommendation_grade": matches[0]["eco_grade"] if matches else None,
        })
    print(json.dumps(checks, indent=2))
