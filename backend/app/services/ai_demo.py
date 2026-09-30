def demo_chat_response(query: str, context_used: list[dict] | None = None):
    base = {
        "response_text": "EvoTwin is using its built-in example guide right now. Your profile and journal can still shape the suggestions you see.",
        "personalized_observations": ["Your question is about your well-being.", "Suggestions are based on the details available in your profile and journal."],
        "recommendations": [
            "Keep sleep routines consistent and protect recovery time.",
            "Schedule physical activity in a realistic window that fits your current commitments.",
            "Track hydration and stress to refine your wellness habits."
        ],
        "rationale": "These ideas are educational starting points, not medical advice.",
        "evidence_sources": [{"title": "General sleep hygiene", "publisher": "Demo knowledge base", "url": "https://example.com/demo"}],
        "uncertainty": "These suggestions come from EvoTwin’s built-in guide, not a live medical or AI service.",
        "safety_notice": "This is educational wellness guidance and not medical advice.",
        "follow_up_question": "Would you like a routine that fits your schedule better?",
    }
    if "morning" in query.lower() and "exercise" in query.lower():
        base["recommendations"] = [
            "A later workout may fit your schedule more easily.",
            "Try keeping movement flexible and build a realistic weekly rhythm instead of forcing sunrise exercise."
        ]
        base["response_text"] = "A morning workout may not fit your schedule. A later session or a shorter activity could be easier to keep up with."
    selected_context = context_used or []
    if selected_context:
        preferred = next((item["value"] for item in selected_context if item["label"] == "Preferred activities"), "")
        avoided = next((item["value"] for item in selected_context if item["label"] == "Activities to avoid"), "")
        if any(term in query.lower() for term in ("exercise", "workout", "activity", "movement", "training")):
            if preferred:
                base["response_text"] = f"Your profile says you enjoy {preferred}. Consider choosing one at a comfortable pace that fits your day."
            if avoided:
                base["personalized_observations"].insert(0, f"You told EvoTwin you prefer to avoid {avoided}, so this suggestion will respect that.")
        base["personalized_observations"].insert(0, f"I used {len(selected_context)} relevant profile, journal, or memory item(s) for this reply.")
        base["rationale"] = "Only details related to your question were used to shape this suggestion."
    return base
