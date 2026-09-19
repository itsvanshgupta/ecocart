import json
import logging
from typing import Dict, Any, List, Optional, Tuple

import httpx

from app.config import GEMINI_API_KEY, GROQ_API_KEY

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.5-flash-lite"
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CHAT_ERROR_REPLY = "I'm having a brief connection delay with my AI engine, but I recommend choosing plastic-free and refillable alternatives whenever possible!"

# Initialize Gemini if key is provided.  The legacy google-generativeai SDK is
# deprecated; use the current Google GenAI SDK instead.
_gemini_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Google Gemini AI client configured successfully.")
    except Exception as e:
        logger.warning(f"Could not configure Google Gemini client: {e}")


GRADING_SYSTEM_PROMPT = """You are EcoCart's AI Sustainability Evaluator.
Your job is to objectively score consumer products across 5 core sustainability dimensions:
1. materials: Sourcing, renewable vs synthetic, toxicity, organic status.
2. packaging: Recyclability, plastic-free, compostability, minimal waste.
3. carbon: Estimated life-cycle emissions, manufacturing & transport intensity.
4. ethics: Labor standards, fair-trade, cruelty-free, animal welfare.
5. durability: Lifespan, repairability, circularity vs single-use.

Grading Scale for each dimension and composite: 'A' (Exceptional), 'B' (Good), 'C' (Average), 'D' (Poor), 'E'/'F' (Hazardous/Single-use heavy).

Composite score_100: integer 0-100.
Formulas:
- A = 85-100
- B = 70-84
- C = 50-69
- D = 35-49
- E/F = 0-34

Return ONLY valid JSON matching this schema:
{
  "composite_grade": "A",
  "score_100": 92,
  "dimensions": {
    "materials": "A",
    "packaging": "A",
    "carbon": "B",
    "ethics": "A",
    "durability": "A"
  },
  "explanation": "Detailed 2-sentence explanation of why it received this grade.",
  "top_strength": "e.g. 100% GOTS Organic Certified cotton with zero pesticide run-off",
  "top_concern": "e.g. Higher transport emissions from overseas shipping",
  "greener_swap_hint": "e.g. Consider locally woven jute or hemp alternatives"
}
"""

ECO_CHAT_SYSTEM_PROMPT = """You are EcoCart's AI Shopping Advisor ("EcoAdvisor").
You help consumers make informed, sustainable shopping decisions.
You have deep knowledge of eco-materials (bamboo, cork, organic cotton, hemp, stainless steel), recycling codes (PET 1, HDPE 2, PAP 20-22, etc.), carbon footprints, and circular economy.
Keep your responses friendly, concise (2-4 sentences max unless asked for detail), and actionable. Use bullet points when comparing products.
"""


def _heuristic_grade(product_name: str, material: str, packaging: str, certification: str = "", origin_country: str = "") -> Dict[str, Any]:
    """Reliable fallback rule engine when Gemini API key is not configured."""
    mat_lower = (material or "").lower()
    pkg_lower = (packaging or "").lower()
    cert_lower = (certification or "").lower()
    
    # Score materials
    mat_grade = "B"
    if any(k in mat_lower for k in ["organic", "gots", "bamboo", "cork", "plant-based", "hemp", "recycled"]):
        mat_grade = "A"
    elif any(k in mat_lower for k in ["plastic", "synthetic", "polyester", "pvc", "acrylic"]):
        mat_grade = "D"
        
    # Score packaging
    pkg_grade = "B"
    if any(k in pkg_lower for k in ["plastic-free", "compostable", "paper", "card", "aluminium", "refill", "reusable"]):
        pkg_grade = "A"
    elif any(k in pkg_lower for k in ["single-use plastic", "polybag", "bubble wrap", "styrofoam"]):
        pkg_grade = "D"

    # Score ethics & certifications
    eth_grade = "A" if any(k in cert_lower for k in ["fairtrade", "fair-trade", "gots", "cruelty free", "leaping bunny", "fsc", "oeko-tex"]) else "B"
    
    # Carbon & Durability
    carb_grade = "A" if "refill" in pkg_lower or "organic" in mat_lower else "B"
    dur_grade = "A" if any(k in mat_lower for k in ["cork", "steel", "aluminium", "glass", "cotton", "bamboo"]) else "B"

    # Convert to numeric
    val_map = {"A": 90, "B": 75, "C": 55, "D": 40, "E": 25, "F": 10}
    scores = [val_map[g] for g in [mat_grade, pkg_grade, carb_grade, eth_grade, dur_grade]]
    avg_score = int(sum(scores) / len(scores))
    comp_grade = "A" if avg_score >= 85 else ("B" if avg_score >= 70 else ("C" if avg_score >= 50 else "D"))

    return {
        "composite_grade": comp_grade,
        "score_100": avg_score,
        "dimensions": {
            "materials": mat_grade,
            "packaging": pkg_grade,
            "carbon": carb_grade,
            "ethics": eth_grade,
            "durability": dur_grade
        },
        "explanation": f"Grade {comp_grade}: {product_name} uses {material or 'verified components'} with {packaging or 'standard eco-packaging'} to reduce environmental footprint.",
        "top_strength": f"{material or 'Sustainable design'} with {certification or 'responsible sourcing'}.",
        "top_concern": "Ensure proper recycling or composting at product end-of-life.",
        "greener_swap_hint": "Pair with refillable or zero-packaging essentials to maximize your CO₂ savings.",
        "engine": "heuristic_fallback"
    }


def active_engine() -> str:
    """Name of the first free LLM provider that will be tried."""
    if _gemini_client:
        return f"gemini_{GEMINI_MODEL.removeprefix('gemini-').replace('-', '_')}"
    if GROQ_API_KEY:
        return "groq_llama"
    return "heuristic_fallback"


def llm_providers() -> List[str]:
    return [name for name, on in (("gemini", bool(_gemini_client)), ("groq", bool(GROQ_API_KEY))) if on]


def _gemini_generate(prompt: str, json_mode: bool) -> str:
    config = {"response_mime_type": "application/json"} if json_mode else None
    response = _gemini_client.models.generate_content(model=GEMINI_MODEL, contents=prompt, config=config)
    return response.text.strip()


def _groq_generate(prompt: str, json_mode: bool) -> str:
    payload: Dict[str, Any] = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    response = httpx.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


def _generate(prompt: str, json_mode: bool = False) -> Tuple[str, str]:
    """Try each configured free provider in order; return (text, engine)."""
    errors: List[str] = []
    if _gemini_client:
        try:
            return _gemini_generate(prompt, json_mode), active_engine()
        except Exception as e:
            logger.warning(f"Gemini failed: {e}")
            errors.append(f"gemini: {e}")
    if GROQ_API_KEY:
        try:
            return _groq_generate(prompt, json_mode), "groq_llama"
        except Exception as e:
            logger.warning(f"Groq failed: {e}")
            errors.append(f"groq: {e}")
    raise RuntimeError("; ".join(errors) or "No LLM provider configured")


def grade_product(product_name: str, material: str, packaging: str, origin_country: str = "", certification: str = "") -> Dict[str, Any]:
    """Grade a product with a free LLM provider, falling back to the rule engine."""
    if not llm_providers():
        return _heuristic_grade(product_name, material, packaging, certification, origin_country)

    user_prompt = f"""Evaluate this product:
Product Name: {product_name}
Materials: {material}
Packaging: {packaging}
Origin Country: {origin_country or 'Not specified'}
Certifications: {certification or 'None specified'}
"""
    try:
        raw_text, engine = _generate(f"{GRADING_SYSTEM_PROMPT}\n\n{user_prompt}", json_mode=True)
        data = json.loads(raw_text)
        data["engine"] = engine
        return data
    except Exception as e:
        logger.error(f"LLM grading error: {e}. Falling back to rule engine.")
        res = _heuristic_grade(product_name, material, packaging, certification, origin_country)
        res["engine"] = "llm_fallback_after_error"
        return res


def embed_text(text: str) -> List[float]:
    """Create a 768-dimensional embedding for semantic product retrieval."""
    if not _gemini_client:
        raise RuntimeError("Gemini is not configured. Set GEMINI_API_KEY in backend/.env.")

    response = _gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config={"output_dimensionality": 768},
    )
    if not response.embeddings:
        raise RuntimeError("Gemini returned no embedding.")
    return list(response.embeddings[0].values)


def chat_eco_advisor(message: str, history: Optional[List[Dict[str, str]]] = None, product_context: Optional[str] = None) -> str:
    """Conversational AI Sustainability Advisor using Gemini or fallback."""
    if not llm_providers():
        # Fallback conversational responses
        msg_l = message.lower()
        if "recycle" in msg_l or "code" in msg_l:
            return "♻️ **Recycling Tip**: Look for PAP 20-22 (paper/cardboard) and HDPE 2 / PET 1 for highest municipal recycling rates. Always rinse containers before sorting!"
        elif "co2" in msg_l or "carbon" in msg_l:
            return "🌱 **Carbon Impact**: Swapping to concentrated refill bars and organic plant fibres saves an average of 0.6kg - 2.8kg of CO₂ per product compared to single-use plastics."
        elif "bamboo" in msg_l or "cork" in msg_l:
            return "🌿 **Material Insight**: Bamboo and cork are rapidly renewable resources that regenerate without replanting and absorb CO₂ during their growth cycle."
        else:
            return f"Hello! I am your EcoCart Advisor. I can help evaluate material sustainability, calculate CO₂ savings, or suggest greener alternatives for your cart. What product are you considering?"

    try:
        prompt_parts = [ECO_CHAT_SYSTEM_PROMPT]
        if product_context:
            prompt_parts.append(f"Current Product Context:\n{product_context}")
        
        if history:
            for turn in history[-4:]:
                prompt_parts.append(f"{turn.get('role', 'user')}: {turn.get('content', '')}")
                
        prompt_parts.append(f"User: {message}")
        
        reply, _engine = _generate("\n\n".join(prompt_parts))
        return reply
    except Exception as e:
        logger.error(f"LLM chat error: {e}")
        return CHAT_ERROR_REPLY
