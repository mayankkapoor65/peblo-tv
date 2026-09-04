FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for Pillow and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose FastAPI port
EXPOSE 8000

# Script to run migrations, seeding on first run, and start uvicorn
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed_data.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
