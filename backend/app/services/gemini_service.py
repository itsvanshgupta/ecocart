import json
import logging
from typing import Dict, Any, List, Optional
from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

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
        "engine": "heuristic_fallback" if not _gemini_client else "gemini_ai"
    }


def grade_product(product_name: str, material: str, packaging: str, origin_country: str = "", certification: str = "") -> Dict[str, Any]:
    """Grade a product using Gemini AI or fallback engine."""
    if not _gemini_client:
        return _heuristic_grade(product_name, material, packaging, certification, origin_country)
    
    try:
        user_prompt = f"""Evaluate this product:
Product Name: {product_name}
Materials: {material}
Packaging: {packaging}
Origin Country: {origin_country or 'Not specified'}
Certifications: {certification or 'None specified'}
"""
        response = _gemini_client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=f"{GRADING_SYSTEM_PROMPT}\n\n{user_prompt}",
            config={"response_mime_type": "application/json"},
        )
        
        raw_text = response.text.strip()
        data = json.loads(raw_text)
        data["engine"] = "gemini_3.5_flash_lite"
        return data
    except Exception as e:
        logger.error(f"Gemini API grading error: {e}. Falling back to rule engine.")
        res = _heuristic_grade(product_name, material, packaging, certification, origin_country)
        res["engine"] = "gemini_fallback_after_error"
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
    if not _gemini_client:
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
        
        response = _gemini_client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents="\n\n".join(prompt_parts),
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini chat error: {e}")
        return "I'm having a brief connection delay with my AI engine, but I recommend choosing plastic-free and refillable alternatives whenever possible!"
