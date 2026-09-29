def demo_chat_response(query: str):
    base = {
        "response_text": "This is a demo response from VitaTwin AI. Add a Gemini API key to enable live AI reasoning with grounded recommendations.",
        "personalized_observations": ["Your query indicates a need for personalized wellness guidance.", "The system is operating in demo mode while the live AI endpoint is not configured."],
        "recommendations": [
            "Keep sleep routines consistent and protect recovery time.",
            "Schedule physical activity in a realistic window that fits your current commitments.",
            "Track hydration and stress to refine your wellness habits."
        ],
        "rationale": "Demo mode prioritizes transparent, cautious guidance and avoids clinical claims.",
        "evidence_sources": [{"title": "General sleep hygiene", "publisher": "Demo knowledge base", "url": "https://example.com/demo"}],
        "uncertainty": "The system is in demo mode; no live Gemini or RAG evidence was used.",
        "safety_notice": "This is educational wellness guidance and not medical advice.",
        "follow_up_question": "Would you like a routine that fits your schedule better?",
    }
    if "morning" in query.lower() and "exercise" in query.lower():
        base["recommendations"] = [
            "A later- in-the-day workout may fit your school schedule more sustainably.",
            "Try keeping movement flexible and build a realistic weekly rhythm instead of forcing sunrise exercise."
        ]
        base["response_text"] = "A morning exercise routine may be inconvenient during college, so a later session or shorter activity block could be more sustainable."
    return base
