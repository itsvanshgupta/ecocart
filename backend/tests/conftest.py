import os
import sys
from pathlib import Path

# Tests must never touch real services: blank the keys before the app is imported
# (load_dotenv does not override variables that are already set).
for name in ("GEMINI_API_KEY", "GROQ_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ[name] = ""
os.environ["ALLOWED_ORIGINS"] = "https://ecocart-delta.vercel.app,http://localhost:5500"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

import app.main as main


@pytest.fixture(autouse=True)
def reset_chat_state():
    main._chat_cache.clear()
    main._chat_hits.clear()
    yield
    main._chat_cache.clear()
    main._chat_hits.clear()
