import os
import sys
import json
import asyncio
from typing import List, Dict, Any
from openai import OpenAI
from environment import PrivacyEnv
from schemas import Action

def log_start(task: str, env: str, model: str):
    print(f"[START] {json.dumps({'task': task, 'env': env, 'model': model})}", flush=True)

def log_step(step: int, action: Any, reward: float, done: bool, error: Any = None):
    # Action could be a string or a dict. Convert to dict if needed for JSON.
    action_log = action.model_dump() if hasattr(action, "model_dump") else action
    print(f"[STEP] {json.dumps({'step': step, 'action': action_log, 'reward': reward, 'done': done, 'error': error})}", flush=True)

def log_end(success: bool, steps: int, score: float, rewards: List[float]):
    print(f"[END] {json.dumps({'success': success, 'steps': steps, 'score': score, 'rewards': rewards})}", flush=True)

async def main():
    api_key = os.getenv("HF_TOKEN") or os.getenv("OPENAI_API_KEY", "dummy-key")
    base_url = os.getenv("API_BASE_URL", "https://api.openai.com/v1")
    model_name = os.getenv("MODEL_NAME", "gpt-4o-mini")
    
    # Strictly initialize OpenAI client mapped to hackathon environment constraints
    client = OpenAI(base_url=base_url, api_key=api_key)

    tasks = ["easy", "medium", "hard"]
    
    for task_name in tasks:
        log_start(task=task_name, env="AI_Privacy_Redaction_Env", model=model_name)
        
        env = PrivacyEnv(level=task_name)
        obs = env.reset()
        
        rewards: List[float] = []
        steps_taken = 0
        success = False
        final_score = 0.0

        done = False
        
        while not done:
            steps_taken += 1
            idx = obs.current_index
            token = obs.tokens[idx]
            
            prompt = (
                f"You are a privacy redaction agent. Decide the action for the current token: '{token}' "
                f"based on this policy: Redact {obs.policy.redact}. Preserve {obs.policy.preserve}.\n"
                f"Return ONLY a strict valid JSON matching exactly: {{\"type\": \"redact\" or \"keep\" or \"replace\", \"token_index\": {idx}, \"replacement\": null}}"
            )
            
            action_obj = None
            error_val = None
            
            if "dummy" not in api_key:
                try:
                    res = client.chat.completions.create(
                        model=model_name,
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"},
                    )
                    act_json = json.loads(res.choices[0].message.content)
                    act_json["token_index"] = idx
                    if act_json.get("type") not in ["redact", "keep", "replace"]:
                        act_json["type"] = "keep"
                    action_obj = Action(**act_json)
                except Exception as e:
                    error_val = str(e)
                    print(f"[DEBUG] Model request failed: {e}", flush=True)
                    action_obj = Action(type="keep", token_index=idx, replacement=None)
            else:
                 # Fallback logic for CI testing where LLM might be unavailable
                 is_pii = "@" in token or token.isdigit() or len(token) > 8
                 action_obj = Action(type="redact" if is_pii else "keep", token_index=idx, replacement=None)
            
            obs, reward, done, info = env.step(action_obj)
            rewards.append(reward)
            
            log_step(step=steps_taken, action=action_obj, reward=reward, done=done, error=error_val)
            
            if done:
                final_score = info.final_score if info.final_score is not None else (sum(rewards) / len(rewards) if len(rewards) > 0 else 0)
                final_score = min(max(final_score, 0.0), 1.0) # Clamp 0.0 to 1.0
                success = final_score >= 0.75 # Threshold defining success
                break

        log_end(success=success, steps=steps_taken, score=final_score, rewards=rewards)

if __name__ == "__main__":
    asyncio.run(main())
