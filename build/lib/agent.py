import json
import random
import numpy as np
import google.generativeai as genai
from typing import Dict, Any, List

class QLearningAgent:
    def __init__(self, actions: List[str] = ["keep", "redact", "replace"], epsilon: float = 1.0, alpha: float = 0.1, gamma: float = 0.9):
        self.q_table = {}
        self.actions = actions
        self.epsilon = epsilon
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.alpha = alpha
        self.gamma = gamma

    def get_state_key(self, token: str, is_sensitive: bool) -> str:
        return f"{token}_{is_sensitive}"

    def select_action(self, token: str, is_sensitive: bool) -> Dict[str, Any]:
        state = self.get_state_key(token, is_sensitive)
        
        # Epsilon-greedy
        if random.uniform(0, 1) < self.epsilon:
            act = random.choice(self.actions)
        else:
            if state not in self.q_table:
                self.q_table[state] = {a: 0.0 for a in self.actions}
            act = max(self.q_table[state], key=self.q_table[state].get)
        
        return {"type": act, "token_index": -1, "replacement": "[REDACTED]" if act in ["redact", "replace"] else None}

    def update(self, token: str, is_sensitive: bool, action_type: str, reward: float):
        state = self.get_state_key(token, is_sensitive)
        if state not in self.q_table:
            self.q_table[state] = {a: 0.0 for a in self.actions}
        
        current_q = self.q_table[state][action_type]
        # Since it's a 1-step MDP per token essentially without next_state transition (independent tokens),
        # standard Q-learning reduces to a bandit problem update per state.
        new_q = current_q + self.alpha * (reward - current_q)
        self.q_table[state][action_type] = new_q

    def decay_epsilon(self):
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay


class GeminiAgent:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-pro-latest")

    def select_action(self, obs: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f"""
You are a privacy redaction agent.
Observation: {json.dumps(obs)}

Based on the policy, decide the action for the token at current_index.
Output strictly in JSON format matching this schema without any markdown blocks or backticks if possible:
{{
  "type": "redact" | "keep" | "replace",
  "token_index": {obs['current_index']},
  "replacement": string | null
}}
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            data = json.loads(response.text)
            # Ensure valid index
            data["token_index"] = obs["current_index"]
            if data["type"] not in ["redact", "keep", "replace"]:
                data["type"] = "keep"
            return data
        except Exception as e:
            # Fallback if invalid
            print("Gemini Agent JSON Parse Error:", e)
            return {"type": "keep", "token_index": obs["current_index"], "replacement": None}
