"""AWS Lambda entrypoint: wraps the FastAPI app for Lambda Function URLs via Mangum."""
from mangum import Mangum

from app.main import app

handler = Mangum(app, lifespan="off")
