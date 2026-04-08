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
                
    # Fair Continuous Scoring Logic:
    # 1.0 is a perfect score.
    # Fractional scores are allowed (e.g., 0.5 if you caught half the tokens).
    # Small penalty (0.1) for over-redaction.
    
    total_sensitive = sum(1 for flag in task["sensitive"] if flag)
    
    if total_sensitive == 0:
        return 1.0 if over == 0 else 0.5
        
    base_score = correct / total_sensitive
    over_redaction_penalty = (over * 0.1) / total_sensitive
    
    final_score = base_score - over_redaction_penalty
    
    # Clip between 0 and 1
    return float(max(0.0, min(1.0, final_score)))
