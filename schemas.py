from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class Policy(BaseModel):
    redact: List[str]
    preserve: List[str]

class Observation(BaseModel):
    document: str
    tokens: List[str]
    current_index: int
    policy: Policy

class Action(BaseModel):
    type: Literal["redact", "keep", "replace"]
    token_index: int
    replacement: Optional[str] = None

class StepInfo(BaseModel):
    token: str
    action: str
    is_sensitive: bool
    final_score: Optional[int] = None

class StepResult(BaseModel):
    observation: Observation
    reward: float
    done: bool
    info: StepInfo
