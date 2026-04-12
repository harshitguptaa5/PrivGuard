import random
from typing import List, Dict, Any, Tuple

from tasks import TASKS
from grader import grade
from schemas import Observation, Action, Policy, StepInfo

class PrivacyEnv:
    def __init__(self, level: str = "easy"):
        self.level = level
        self.documents = TASKS
        self.current_task = {}
        self.current_index = 0
        self.tokens = []
        self.sensitive_flags = []
        self.policy = {}
        self.max_steps = 0
        self.document = ""
        self.redacted_tokens = []
        self.history = []
        self._load_document()

    def _load_document(self):
        # Pick a random task from the list of tasks for the current level
        task_list = self.documents.get(self.level, self.documents["easy"])
        self.current_task = random.choice(task_list)
        
        self.document = self.current_task["text"]
        self.tokens = self.current_task["tokens"].copy()
        self.sensitive_flags = self.current_task["sensitive"].copy()
        self.policy = self.current_task["policy"].copy()
        
        self.current_index = 0
        self.max_steps = len(self.tokens)
        self.redacted_tokens = [None] * len(self.tokens)
        self.history = []

    def reset(self) -> Observation:
        """Returns Observation object"""
        self._load_document()
        return self.state()

    def state(self) -> Observation:
        """Returns current observation object"""
        return Observation(
            document=self.document,
            tokens=self.tokens,
            current_index=self.current_index,
            policy=Policy(**self.policy)
        )

    def step(self, action: Action) -> Tuple[Observation, float, bool, StepInfo]:
        """
        takes typed Action
        returns observation, reward, done, info
        """
        if self.current_index >= self.max_steps:
             return self.state(), 0.0, True, StepInfo(token="", action="keep", is_sensitive=False, msg="Episode already finished")

        action_type = action.type
        # Ensure doing action on current index
        idx = self.current_index
        is_sensitive = self.sensitive_flags[idx]
        
        reward = 0.0
        
        if action_type == "redact" or action_type == "replace":
            self.redacted_tokens[idx] = "[REDACTED]" if action_type == "redact" else (action.replacement or "[REDACTED]")
            if is_sensitive:
                reward = 1.0 # correctly redacted sensitive token
            else:
                reward = -0.5 # over-redaction
        elif action_type == "keep":
            self.redacted_tokens[idx] = self.tokens[idx]
            if is_sensitive:
                reward = -1.0 # missed sensitive token
            else:
                reward = 0.2 # preserves readability
                
        self.current_index += 1
        done = self.current_index >= self.max_steps
        
        info_dict = {
            "token": self.tokens[idx],
            "action": action_type,
            "is_sensitive": is_sensitive
        }
        
        self.history.append(info_dict)
        
        final_sc = None
        if done:
            final_sc = grade(self.history, self.current_task)
            
        info = StepInfo(
            token=self.tokens[idx],
            action=action_type,
            is_sensitive=is_sensitive,
            final_score=final_sc
        )
        
        return self.state(), reward, done, info
