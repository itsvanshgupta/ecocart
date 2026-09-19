"""EcoCart AI Backend Service

FastAPI server powered by Google Gemini AI & Supabase pgvector architecture.
Provides real-time product eco-grading, AI EcoChat sustainability guidance, and greener swap recommendations.
"""
import time
from collections import OrderedDict, defaultdict, deque
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.config import ALLOWED_ORIGINS, GEMINI_API_KEY
from app.services.gemini_service import (
    CHAT_ERROR_REPLY, active_engine, chat_eco_advisor, grade_product, llm_providers,
)
from app.services.vector_service import (
    find_greener_alternatives, find_greener_alternatives_by_name, ping_database,
)

# Free-tier LLM quotas are small and this URL is public, so repeated questions
# are answered from cache and each client IP gets a modest chat allowance.
CHAT_CACHE_TTL_SECONDS = 3600
CHAT_CACHE_MAX_ENTRIES = 200
CHAT_LIMIT_PER_WINDOW = 20
CHAT_WINDOW_SECONDS = 600

_chat_cache: "OrderedDict[tuple, tuple]" = OrderedDict()
_chat_hits: Dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _chat_rate_limited(ip: str) -> bool:
    now = time.time()
    hits = _chat_hits[ip]
    while hits and now - hits[0] > CHAT_WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= CHAT_LIMIT_PER_WINDOW:
        return True
    hits.append(now)
    return False

app = FastAPI(
    title="EcoCart AI API",
    version="1.0.0",
    description="Intelligent Sustainable Commerce Backend with Gemini AI"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Schemas ──────────────────────────────────────────────
class GradeRequest(BaseModel):
    product_name: str = Field(..., json_schema_extra={"example": "Cloud Cotton Towels"})
    material: str = Field(..., json_schema_extra={"example": "GOTS organic cotton"})
    packaging: str = Field(..., json_schema_extra={"example": "Plastic-free paper wrap"})
    origin_country: Optional[str] = Field("India", json_schema_extra={"example": "India"})
    certification: Optional[str] = Field("GOTS", json_schema_extra={"example": "GOTS"})


class ChatRequest(BaseModel):
    message: str = Field(..., json_schema_extra={"example": "Why is bamboo better than conventional cotton?"})
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    product_context: Optional[str] = Field(None, json_schema_extra={"example": "Viewing Bamboo Everyday Tee"})


# ── API Endpoints ───────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "EcoCart AI API",
        "status": "online",
        "docs": "/docs",
        "gemini_active": bool(GEMINI_API_KEY)
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "llm_providers": llm_providers(),
        "engine": active_engine(),
        "allowed_origins": ALLOWED_ORIGINS
    }


@app.get("/health/db")
def health_db():
    try:
        ping_database()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unreachable: {exc}")
    return {"status": "ok"}


@app.post("/api/ai/grade")
def api_grade_product(req: GradeRequest):
    """
    Score a product across 5 sustainability dimensions:
    Materials, Packaging, Carbon, Ethics, Durability.
    """
    try:
        result = grade_product(
            product_name=req.product_name,
            material=req.material,
            packaging=req.packaging,
            origin_country=req.origin_country or "",
            certification=req.certification or ""
        )
        return {
            "success": True,
            "product": req.product_name,
            "grade_data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")


@app.post("/api/ai/chat")
def api_eco_chat(req: ChatRequest, request: Request):
    """
    Interact with the EcoCart AI Sustainability Advisor.
    """
    history = list(req.history or [])
    if history and history[-1].get("role") == "user" and history[-1].get("content") == req.message:
        history.pop()  # the client already appended the current message

    cache_key = None
    if not history:
        cache_key = (req.message.strip().lower(), req.product_context or "")
        cached = _chat_cache.get(cache_key)
        if cached and time.time() - cached[0] < CHAT_CACHE_TTL_SECONDS:
            _chat_cache.move_to_end(cache_key)
            return {"success": True, "reply": cached[1], "cached": True}

    if _chat_rate_limited(_client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail="You're chatting fast! Please wait a few minutes before asking more questions.",
        )

    try:
        reply = chat_eco_advisor(
            message=req.message,
            history=history,
            product_context=req.product_context
        )
        if cache_key and llm_providers() and reply != CHAT_ERROR_REPLY:
            _chat_cache[cache_key] = (time.time(), reply)
            while len(_chat_cache) > CHAT_CACHE_MAX_ENTRIES:
                _chat_cache.popitem(last=False)
        return {
            "success": True,
            "reply": reply
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.get("/api/ai/recommendations/by-name")
def api_recommendations_by_name(name: str):
    """Return RAG recommendations for a locally rendered catalog product."""
    try:
        return {"product_name": name, "recommendations": find_greener_alternatives_by_name(name)}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Recommendation search failed: {exc}")


@app.get("/api/ai/recommendations/{product_id}")
def api_recommendations(product_id: str):
    """
    Return semantically similar products with a higher EcoCart grade.
    """
    try:
        recommendations = find_greener_alternatives(product_id)
        return {"product_id": product_id, "recommendations": recommendations}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Recommendation search failed: {exc}")
