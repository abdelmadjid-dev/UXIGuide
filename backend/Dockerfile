FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and Poetry
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

RUN pip install --no-cache-dir poetry

# Install dependencies
COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root --without dev

# Copy backend code
COPY . .

# Expose standard Cloud Run port
EXPOSE 8080

# Command to run the FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
