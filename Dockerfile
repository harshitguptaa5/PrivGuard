FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Install uv using pip
RUN pip install --no-cache-dir uv

# Copy configuration files
COPY pyproject.toml uv.lock ./

# Install dependencies using the correct uv sync command
# --no-install-project is used because source code is not yet present
RUN uv sync --frozen --no-install-project --no-dev

# Copy source code
COPY . .

# Final sync to install the project itself (entry points)
RUN uv sync --frozen --no-dev

# Copy frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

# Directly run the server to ensure high reliability
CMD ["python", "server.py"]
