FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Using full python image (not slim) to ensure all build-time dependencies are met
FROM python:3.11
WORKDIR /app

# Official uv installation method
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Verify uv installation
RUN uv --version

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
# Using --system to install directly into the container's python environment
RUN uv sync --frozen --no-install-project --no-dev --system

# Copy source code
COPY . .

# Final sync to install the project itself
RUN uv sync --frozen --no-dev --system

# Copy frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

# Starting the server
CMD ["python", "server.py"]
