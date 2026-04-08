FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11
WORKDIR /app

# Step 1: Install core dependencies for faster caching
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefer-binary -r requirements.txt

# Step 2: Copy all project files (including README.md required by pyproject.toml)
COPY . .

# Step 3: Formal installation of the project and any remaining dependencies
RUN pip install --no-cache-dir .

# Step 4: Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 7860

# Command to run the server
CMD ["python", "app.py"]
