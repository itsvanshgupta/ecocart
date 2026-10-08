FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app
RUN addgroup --system ecocart && adduser --system --ingroup ecocart ecocart
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=ecocart:ecocart . .
USER ecocart
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
