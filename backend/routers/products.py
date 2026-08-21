from fastapi import APIRouter, Query
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

@router.get("/products")
def get_products(
    category: str = Query(None),
    min_grade: str = Query(None),
    max_price: float = Query(None),
    limit: int = Query(20),
    offset: int = Query(0)
):
    # fetch products from supabase
    query = supabase.table("products").select(
        "*, eco_scores(composite_grade, composite_score)"
    )

    if category:
        query = query.eq("category", category)
    if max_price:
        query = query.lte("price", max_price)

    query = query.range(offset, offset + limit - 1)
    result = query.execute()
    return result.data


@router.get("/products/{product_id}")
def get_product(product_id: str):
    result = supabase.table("products").select(
        "*, eco_scores(*)"
    ).eq("id", product_id).single().execute()
    return result.data