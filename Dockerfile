FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Install uv using pip for maximum compatibility
RUN pip install --no-cache-dir uv

# Copy only the dependency files first
COPY pyproject.toml uv.lock ./

# Install dependencies into the system environment
# This avoids virtualenv issues in simple Docker environments
RUN uv pip install --system --frozen -r pyproject.toml

# Copy source code
COPY . .

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

# Directly run the server to ensure high reliability
CMD ["python", "server.py"]
