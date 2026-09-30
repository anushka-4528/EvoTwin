from typing import Any, Dict, Iterable, Optional


TOPIC_TERMS = {
    "activity": ("exercise", "workout", "movement", "activity", "training", "run", "walk", "sport", "cycling", "fitness"),
    "sleep": ("sleep", "rest", "tired", "fatigue", "recovery"),
    "nutrition": ("food", "diet", "eat", "meal", "nutrition", "hydration", "water"),
    "stress": ("stress", "mood", "anxious", "overwhelmed", "mental", "feel"),
    "health": ("symptom", "pain", "health", "condition", "injury", "wellness"),
}


def _topics(text: str) -> set[str]:
    normalized = text.lower()
    return {topic for topic, terms in TOPIC_TERMS.items() if any(term in normalized for term in terms)}


def _value_text(value: Any) -> str:
    if isinstance(value, (list, tuple)):
        return ", ".join(str(item) for item in value if item)
    return str(value).strip() if value is not None else ""


def build_relevant_context(
    query: str,
    user: Dict[str, Any],
    latest_log: Optional[Dict[str, Any]],
    long_term_memories: Iterable[Dict[str, Any]],
    session_memories: Iterable[Dict[str, Any]],
) -> list[Dict[str, str]]:
    query_topics = _topics(query)
    context: list[Dict[str, str]] = []

    def add(label: str, value: Any, source: str, topic: Optional[str] = None) -> None:
        value_text = _value_text(value)
        if value_text and (topic is None or topic in query_topics):
            context.append({"label": label, "value": value_text, "source": source})

    add("Current goals", user.get("goals"), "profile")
    add("Activity level", user.get("activity_level"), "profile", "activity")
    add("Preferred activities", user.get("preferred_activities"), "profile", "activity")
    add("Activities to avoid", user.get("avoided_activities"), "profile", "activity")
    add("Exercise preferences", user.get("exercise_preferences"), "profile", "activity")
    add("Dietary preferences", user.get("dietary_preferences"), "profile", "nutrition")
    add("Typical sleep", f"{user.get('sleep_hours')} hours" if user.get("sleep_hours") is not None else None, "profile", "sleep")
    add("Lifestyle", user.get("lifestyle_summary"), "profile", "stress" if query_topics else None)
    add("Health history", user.get("health_history"), "profile", "health")

    if latest_log:
        log_labels = {
            "sleep_hours": ("Recent sleep", "sleep"),
            "steps": ("Recent activity", "activity"),
            "hydration_liters": ("Recent hydration", "nutrition"),
            "nutrition_score": ("Recent nutrition", "nutrition"),
            "stress_level": ("Recent stress", "stress"),
        }
        for field, (label, topic) in log_labels.items():
            value = latest_log.get(field)
            if value is not None:
                suffix = " hours" if field == "sleep_hours" else " L" if field == "hydration_liters" else ""
                add(label, f"{value}{suffix}", "recent journal", topic)

    for memory in long_term_memories:
        category = str(memory.get("category", "memory")).replace("_", " ").title()
        text = str(memory.get("content", ""))
        matching_topics = _topics(f"{category} {text}")
        is_goal = category.lower().startswith("goal")
        if matching_topics.intersection(query_topics) or (not query_topics and is_goal):
            add(category, text, "long-term memory")

    for memory in session_memories:
        category = str(memory.get("category", "session")).replace("_", " ").title()
        text = str(memory.get("content", ""))
        matching_topics = _topics(f"{category} {text}")
        if query_topics and matching_topics.intersection(query_topics):
            source = "current conversation" if category.startswith("Conversation ") else "session memory"
            add(f"Current {category.lower()}", text, source)

    unique_context: list[Dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for item in context:
        key = (item["label"], item["value"])
        if key not in seen:
            seen.add(key)
            unique_context.append(item)
    return unique_context[:12]