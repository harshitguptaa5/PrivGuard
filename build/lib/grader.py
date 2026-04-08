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
                
    # Normalizing score: (correct - penalty) / total_sensitive_tokens
    # Total sensitive tokens can be computed from the task directly
    total_sensitive = sum(1 for flag in task["sensitive"] if flag)
    
    if total_sensitive == 0:
        # Prevent division by zero if there's a task with no sensitive data
        return 1.0 if over == 0 else 0.0
        
    raw_score = correct - missed - over
    normalized = raw_score / total_sensitive
    
    # Clip between 0 and 1
    return max(0.0, min(1.0, normalized))
