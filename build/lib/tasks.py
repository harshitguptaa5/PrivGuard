TASKS = {
    "easy": {
        "text": "Contact Alice at alice@example.com or call 555-1234.",
        "tokens": ["Contact", "Alice", "at", "alice@example.com", "or", "call", "555-1234", "."],
        "sensitive": [False, False, False, True, False, False, True, False],
        "policy": {
            "redact": ["phone", "email"],
            "preserve": ["names", "general_text"]
        }
    },
    "medium": {
        "text": "Dr. John Doe can be reached at john.doe@hospital.org. Patient ID 99213 needs review.",
        "tokens": ["Dr.", "John", "Doe", "can", "be", "reached", "at", "john.doe@hospital.org", ".", "Patient", "ID", "99213", "needs", "review", "."],
        "sensitive": [False, False, False, False, False, False, False, True, False, False, False, True, False, False, False],
        "policy": {
            "redact": ["email", "IDs"],
            "preserve": ["names"]
        }
    },
    "hard": {
        "text": "My email is john at gmail dot com and my number is nine eight seven six five four three two one zero.",
        "tokens": ["My", "email", "is", "john", "at", "gmail", "dot", "com", "and", "my", "number", "is", "nine", "eight", "seven", "six", "five", "four", "three", "two", "one", "zero", "."],
        "sensitive": [False, False, False, True, True, True, True, True, False, False, False, False, True, True, True, True, True, True, True, True, True, True, False],
        "policy": {
            "redact": ["obfuscated email", "obfuscated phone"],
            "preserve": ["names"]
        }
    }
}
