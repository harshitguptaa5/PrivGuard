FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11
WORKDIR /app

# Copy dependency metadata
COPY pyproject.toml ./

# Install dependencies using standard pip (supports pyproject.toml natively)
# We use '.' to install the current project and its dependencies
RUN pip install --no-cache-dir .

# Copy source code
COPY . .

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

# Starting the server
CMD ["python", "server.py"]
