from typing import List, Dict, Any

def grade(history: List[Dict[str, Any]], task: Dict[str, Any]) -> float:
    """
    history object structure expected:
    [
      { "token": str, "action": "keep"|"redact"|"replace", "is_sensitive": bool }
    ]
    """
    correct = 0.0
    missed = 0.0
    over = 0.0
    
    for step in history:
        action = step.get("action", "keep")
        is_sensitive = step.get("is_sensitive", False)
        
        if action in ["redact", "replace"]:
            if is_sensitive:
                correct += 1.0
            else:
                over += 0.5
        elif action == "keep":
            if is_sensitive:
                missed += 1.0
                
    # Strict Binary Scoring Logic:
    # 1 if every sensitive token is caught AND there is no over-redaction.
    # 0 otherwise.
    
    total_sensitive = sum(1 for flag in task["sensitive"] if flag)
    
    if total_sensitive == 0:
        return 1 if over == 0 else 0
        
    # Standard check: Did we catch everything without making mistakes?
    if missed == 0 and over == 0:
        return 1
    else:
        return 0
