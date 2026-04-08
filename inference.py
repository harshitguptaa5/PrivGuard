import os
import sys
import json
import asyncio
from typing import List, Dict, Any, Optional
from openai import OpenAI
from environment import PrivacyEnv
from schemas import Action

# --- Constants & Config from Environment ---
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.openai.com/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o-mini")
API_KEY = os.getenv("HF_TOKEN") or os.getenv("OPENAI_API_KEY", "dummy-key")
MAX_STEPS = 50
SUCCESS_SCORE_THRESHOLD = 0.75

def log_start(task: str, env: str, model: str):
    print(f"[START] {json.dumps({'task': task, 'env': env, 'model': model})}", flush=True)

def log_step(step: int, action: Any, reward: float, done: bool, error: Optional[str] = None):
    # Ensure action is serialized correctly
    if hasattr(action, "model_dump"):
        action_val = action.model_dump()
    elif isinstance(action, dict):
        action_val = action
    else:
        action_val = str(action)
    print(f"[STEP] {json.dumps({'step': step, 'action': action_val, 'reward': reward, 'done': done, 'error': error})}", flush=True)

def log_end(success: bool, steps: int, score: float, rewards: List[float]):
    print(f"[END] {json.dumps({'success': success, 'steps': steps, 'score': score, 'rewards': rewards})}", flush=True)

def get_model_action(client: OpenAI, step: int, token: str, policy: Dict[str, Any], history: List[str]) -> Action:
    prompt = (
        f"Step {step}: You are a privacy redaction agent. Decide the action for the current token: '{token}'\n"
        f"Policy: Redact {policy.get('redact', [])}. Preserve {policy.get('preserve', [])}.\n"
        f"Return ONLY a strict valid JSON matching exactly: {{\"type\": \"redact\" | \"keep\" | \"replace\", \"token_index\": int, \"replacement\": string | null}}"
    )
    
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a precise data redaction assistant. Always respond in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
            max_tokens=150,
            response_format={"type": "json_object"}
        )
        text = (completion.choices[0].message.content or "").strip()
        data = json.loads(text)
        return Action(
            type=data.get("type", "keep"),
            token_index=data.get("token_index", 0),
            replacement=data.get("replacement")
        )
    except Exception as exc:
        print(f"[DEBUG] Model request failed: {exc}", flush=True)
        # Default fallback
        return Action(type="keep", token_index=0, replacement=None)

async def run_task(client: OpenAI, task_name: str):
    log_start(task=task_name, env="AI_Privacy_Redaction_Env", model=MODEL_NAME)
    
    env = PrivacyEnv(level=task_name)
    obs = env.reset()
    
    history: List[str] = []
    rewards: List[float] = []
    steps_taken = 0
    score = 0.0
    success = False

    try:
        last_reward = 0.0
        for step in range(1, MAX_STEPS + 1):
            if steps_taken >= len(obs.tokens):
                break
            
            idx = obs.current_index
            token = obs.tokens[idx]
            
            # Logic to handle if we are in dummy mode or not
            if "dummy" in API_KEY and "openai.com" in API_BASE_URL:
                 # Local testing fallback
                 is_pii = any(c.isdigit() for c in token) or "@" in token
                 action = Action(type="redact" if is_pii else "keep", token_index=idx)
            else:
                 action = get_model_action(client, step, token, obs.policy.model_dump(), history)
                 action.token_index = idx # force current index
            
            obs, reward, done, info = env.step(action)
            error = None
            
            rewards.append(reward)
            steps_taken = step
            last_reward = reward
            
            log_step(step=step, action=action, reward=reward, done=done, error=error)
            history.append(f"Step {step}: {token} -> {action.type} (reward {reward:+.2f})")
            
            if done:
                break
        
        # Calculate final normalized score
        # In our env, we have a grader that provides a final_score in info
        if hasattr(info, "final_score") and info.final_score is not None:
             score = info.final_score
        else:
             # Basic fallback
             score = sum(rewards) / len(rewards) if rewards else 0.0
             
        score = min(max(score, 0.0), 1.0)
        success = score >= SUCCESS_SCORE_THRESHOLD

    finally:
        log_end(success=success, steps=steps_taken, score=score, rewards=rewards)

async def main():
    client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)
    tasks = ["easy", "medium", "hard"]
    for t in tasks:
        await run_task(client, t)

if __name__ == "__main__":
    asyncio.run(main())


if __name__ == "__main__":
    asyncio.run(main())
