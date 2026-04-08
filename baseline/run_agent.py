import os
import sys
import json
from openai import OpenAI

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from environment import PrivacyEnv
from schemas import Action

def run_baseline():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Warning: OPENAI_API_KEY not found. Using a dummy baseline for testing.")
        client = None
    else:
        client = OpenAI(api_key=api_key)
        
    tasks = ["easy", "medium", "hard"]
    
    for task in tasks:
        env = PrivacyEnv(level=task)
        obs = env.reset()
        done = False
        
        print(f"\n--- Evaluating OpenEnv Task: {task.upper()} ---")
        
        while not done:
            idx = obs.current_index
            token = obs.tokens[idx]
            
            if client:
                prompt = (
                    f"You are a privacy redaction agent. Decide the action for '{token}' "
                    f"based on this policy: Redact {obs.policy.redact}. Preserve {obs.policy.preserve}.\n"
                    f"Return ONLY valid JSON like: {{\"type\": \"redact\"|\"keep\"|\"replace\", \"token_index\": {idx}, \"replacement\": null}}"
                )
                try:
                    res = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"},
                    )
                    act_json = json.loads(res.choices[0].message.content)
                    act_json["token_index"] = idx
                    if act_json.get("type") not in ["redact", "keep", "replace"]:
                        act_json["type"] = "keep"
                    action = Action(**act_json)
                except Exception as e:
                    print("LLM Error:", e)
                    action = Action(type="keep", token_index=idx, replacement=None)
            else:
                # Fallback if no key (so CI doesn't crash)
                is_pii = "@" in token or token.isdigit()
                action = Action(type="redact" if is_pii else "keep", token_index=idx, replacement=None)
            
            obs, reward, done, info = env.step(action)
            
            if done:
                print(f"[{task.upper()}] Final Normalized Score: {info.final_score}")

if __name__ == "__main__":
    run_baseline()
