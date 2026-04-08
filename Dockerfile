FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Install uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy configuration files
COPY pyproject.toml uv.lock ./

# Install dependencies into a virtual environment
# We use --frozen to ensure parity with the local uv.lock
RUN uv sync --frozen --no-dev

# Copy source code
COPY . .

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

# Use the 'privguard' executable defined in [project.scripts]
# uv run ensures the virtual environment is used
CMD ["uv", "run", "privguard"]
