import os
import sys
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging

# Add project root to path for local imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from environment import PrivacyEnv
from agent import QLearningAgent
from schemas import Action

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Privacy Redaction API")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/")
async def root_check():
    # If frontend is not built, this provides a fallback
    FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend/dist")
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AI Privacy Redaction API is running. Frontend not found.", "health": "/health"}


# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
env = PrivacyEnv(level="medium")
q_agent = QLearningAgent()
training_rewards = []

@app.post("/reset")
async def reset_env(request: Request):
    try:
        data = await request.json()
    except:
        data = {}
    
    level = data.get("level", env.level)
    env.level = level
    obs = env.reset()
    return obs.model_dump()


@app.post("/step")
async def step_env(request: Request):
    try:
        action_data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON")

    if "type" not in action_data or "token_index" not in action_data:
        raise HTTPException(status_code=400, detail="Invalid action format")

    
    action = Action(**action_data)
    obs, reward, done, info = env.step(action)
    response_data = {
        "observation": obs.model_dump(),
        "reward": float(reward),
        "done": done,
        "info": info.model_dump()
    }
    
    if done and info.final_score is not None:
        response_data["final_score"] = info.final_score
        
    return response_data

@app.get("/state")
async def get_state():
    return env.state().model_dump()

@app.post("/train")
async def train_model(request: Request):
    data = await request.json()
    episodes = data.get("episodes", 100)
    level = data.get("level", "medium")
    
    # Store old level
    old_level = env.level
    env.level = level
    
    global training_rewards
    training_rewards = []
    
    for ep in range(episodes):
        obs = env.reset()
        done = False
        ep_reward = 0.0
        while not done:
            idx = obs.current_index
            token = obs.tokens[idx]
            is_sensitive = env.sensitive_flags[idx]
            
            act_dict = q_agent.select_action(token, is_sensitive)
            act_dict["token_index"] = idx
            
            action = Action(**act_dict)
            obs, reward, done, info = env.step(action)
            ep_reward += reward
            q_agent.update(token, is_sensitive, action.type, reward)
            
        q_agent.decay_epsilon()
        # Normalize reward loosely for frontend graphing (assumes length ~15 tokens, bounds roughly -15 to +15)
        # Normalize between 0 and 1
        max_possible_reward = len(env.tokens) * 1.0  # +1 per token
        min_possible_reward = len(env.tokens) * -1.0 # -1 per token
        normalized = (ep_reward - min_possible_reward) / (max_possible_reward - min_possible_reward + 0.0001)
        normalized = max(0.0, min(1.0, normalized))
        training_rewards.append(normalized)
        
    env.level = old_level
    env.reset()
    
    return {"status": "success", "rewards": training_rewards}

@app.get("/training_stats")
async def get_training_stats():
    return {"rewards": training_rewards}

# Serve React App
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend/dist")

if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"msg": "Frontend not built yet! Run 'npm run build' in frontend directory."}

def main():
    uvicorn.run("server.app:app", host="0.0.0.0", port=7860, reload=False)

if __name__ == "__main__":
    main()

