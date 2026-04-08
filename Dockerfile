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

# Install dependencies ONLY first to leverage Docker cache
# --no-install-project is vital because source code isn't copied yet
RUN uv sync --frozen --no-dev --no-install-project

# Copy source code
COPY . .

# Now install the project itself (entry points, etc.)
RUN uv sync --frozen --no-dev

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

# Use the 'privguard' executable defined in [project.scripts]
CMD ["uv", "run", "privguard"]
