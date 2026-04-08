import os
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
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.enabled = bool(self.api_key)
        if self.enabled:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-1.5-pro-latest")

    def select_action(self, obs: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return {"type": "keep", "token_index": obs["current_index"], "replacement": None}

        # Context-aware prompt
        prompt = f"""
You are an expert AI Data Privacy Agent. Your task is to redact PII (Personally Identifiable Information) based on a specific policy.

CURRENT CONTEXT:
Document: {obs['document']}
Target Token: "{obs['tokens'][obs['current_index']]}" at index {obs['current_index']}
Policy: {json.dumps(obs['policy'])}

TASK:
Decide if the target token should be kept, redacted, or replaced.
If the token is part of a name, email, or phone number that the policy says to redact, use "redact".
Even if the token is an obfuscated word (like 'at' in 'john at gmail'), redact it if it forms a sensitive entity.

OUTPUT:
Strict JSON format:
{{
  "type": "redact" | "keep" | "replace",
  "token_index": {obs['current_index']},
  "replacement": "[REDACTED]" or null
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
            data["token_index"] = obs["current_index"]
            return data
        except Exception as e:
            print(f"Gemini Agent Error: {e}")
            return {"type": "keep", "token_index": obs["current_index"], "replacement": None}
