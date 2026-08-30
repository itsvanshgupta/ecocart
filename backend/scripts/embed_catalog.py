"""Generate and store embeddings for every active EcoCart product."""
import json
import sys
from pathlib import Path

# Allow `python scripts\\embed_catalog.py` from the backend directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.vector_service import embed_catalog


if __name__ == "__main__":
    print(json.dumps(embed_catalog(), indent=2))
