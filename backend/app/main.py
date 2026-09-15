"""EcoCart AI Backend Service

FastAPI server powered by Google Gemini AI & Supabase pgvector architecture.
Provides real-time product eco-grading, AI EcoChat sustainability guidance, and greener swap recommendations.
"""
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.config import ALLOWED_ORIGINS, GEMINI_API_KEY
from app.services.gemini_service import grade_product, chat_eco_advisor
from app.services.vector_service import find_greener_alternatives, find_greener_alternatives_by_name

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
    product_name: str = Field(..., example="Cloud Cotton Towels")
    material: str = Field(..., example="GOTS organic cotton")
    packaging: str = Field(..., example="Plastic-free paper wrap")
    origin_country: Optional[str] = Field("India", example="India")
    certification: Optional[str] = Field("GOTS", example="GOTS")


class ChatRequest(BaseModel):
    message: str = Field(..., example="Why is bamboo better than conventional cotton?")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    product_context: Optional[str] = Field(None, example="Viewing Bamboo Everyday Tee")


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
        "engine": "gemini_3.5_flash_lite" if GEMINI_API_KEY else "heuristic_fallback",
        "allowed_origins": ALLOWED_ORIGINS
    }


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
def api_eco_chat(req: ChatRequest):
    """
    Interact with the EcoCart AI Sustainability Advisor.
    """
    try:
        reply = chat_eco_advisor(
            message=req.message,
            history=req.history,
            product_context=req.product_context
        )
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
