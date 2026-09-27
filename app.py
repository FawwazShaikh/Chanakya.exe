"""
Chanakya — Flask Application
Main entry point: serves the UI and handles /chat API calls.
Supports multiple LLM providers (Groq + Gemini) with automatic fallback.
"""

import os
import uuid
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from config import (
    GEMINI_API_KEY, GEMINI_MODEL_NAME,
    GROQ_API_KEY, GROQ_MODEL_NAME,
    LLM_PROVIDER, SYSTEM_PROMPT,
)
from services.language_service import LanguageDetector
from services.safety_service import SafetyService
from services.conversation_service import ConversationService
from services.llm.llm_service import LLMService

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Initialize Flask ---
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)
app.secret_key = uuid.uuid4().hex
CORS(app)

# --- Initialize Services ---
language_detector = LanguageDetector()
safety_service = SafetyService()
conversation_service = ConversationService()


def build_llm_provider():
    """
    Build the LLM provider based on configuration.
    Supports: 'groq', 'gemini', or 'auto' (fallback chain).
    """
    providers = []

    if LLM_PROVIDER in ("groq", "auto") and GROQ_API_KEY:
        from services.llm.groq_provider import GroqProvider
        providers.append(GroqProvider(api_key=GROQ_API_KEY, model_name=GROQ_MODEL_NAME))
        print(f"  [OK] Groq provider loaded (model: {GROQ_MODEL_NAME})")

    if LLM_PROVIDER in ("gemini", "auto") and GEMINI_API_KEY:
        from services.llm.gemini_provider import GeminiProvider
        providers.append(GeminiProvider(api_key=GEMINI_API_KEY, model_name=GEMINI_MODEL_NAME))
        print(f"  [OK] Gemini provider loaded (model: {GEMINI_MODEL_NAME})")

    if not providers:
        print("  [WARNING] No LLM provider configured! Add API keys to your .env file.")
        print("     -> Get a FREE Groq API key at: https://console.groq.com/keys")
        print("     -> Get a FREE Gemini API key at: https://aistudio.google.com/apikey")
        # Return a dummy provider that always returns an error
        from services.llm.llm_provider import LLMProvider

        class DummyProvider(LLMProvider):
            def generate_response(self, *args, **kwargs):
                return (
                    "⚠️ No API key is configured yet. Please add your API key to the `.env` file "
                    "and restart the server.\n\n"
                    "**Free options:**\n"
                    "• **Groq** (recommended): Get a free key at https://console.groq.com/keys\n"
                    "• **Gemini**: Get a free key at https://aistudio.google.com/apikey"
                )

        return DummyProvider()

    if len(providers) == 1:
        return providers[0]

    # Multiple providers → use fallback chain
    from services.llm.fallback_provider import FallbackProvider
    print(f"  [FALLBACK] Chain active: {len(providers)} providers")
    return FallbackProvider(providers)


# Build the LLM
print("[*] Configuring LLM providers...")
provider = build_llm_provider()
llm_service = LLMService(provider=provider, system_prompt=SYSTEM_PROMPT)


# --- Routes ---

@app.route("/")
def index():
    """Serve the main UI."""
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    """
    Handle a chat message.
    Expects JSON: { "message": "...", "session_id": "..." }
    Returns JSON: { "reply": "...", "detected_language": "...", "locale": "..." }
    """
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Missing 'message' field"}), 400

    user_message = data["message"].strip()
    session_id = data.get("session_id", "default")

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    # 1. Detect language
    detected_lang = language_detector.detect(user_message)
    language_tag = language_detector.format_language_tag(detected_lang)
    locale = language_detector.get_locale(detected_lang)

    # 2. Run safety checks
    safety_context = safety_service.build_safety_context(user_message, detected_lang)
    needs_disclaimer = safety_service.check_medical_flag(user_message)

    # 3. Get conversation history
    history = conversation_service.get_history(session_id)

    # 4. Get LLM response
    reply = llm_service.get_response(
        conversation_history=history,
        user_message=user_message,
        detected_language=detected_lang,
        language_tag=language_tag,
        safety_context=safety_context,
    )

    # 5. Append medical disclaimer if needed and not already present
    if needs_disclaimer:
        disclaimer = safety_service.get_medical_disclaimer(detected_lang)
        if disclaimer.strip() not in reply:
            reply += disclaimer

    # 6. Update conversation history
    conversation_service.add_user_message(session_id, user_message)
    conversation_service.add_assistant_message(session_id, reply)

    return jsonify({
        "reply": reply,
        "detected_language": detected_lang,
        "locale": locale,
    })


@app.route("/clear", methods=["POST"])
def clear():
    """Clear conversation history for a session."""
    data = request.get_json()
    session_id = data.get("session_id", "default") if data else "default"
    conversation_service.clear_session(session_id)
    return jsonify({"status": "cleared"})


@app.route("/chat/truncate", methods=["POST"])
def truncate():
    """
    Truncate conversation history for a session.
    Called by the frontend when the user edits a past message — everything
    after that message must be discarded so the backend stays in sync.
    Expects JSON: { "session_id": "...", "keep_before": <int> }
    keep_before is the 0-based index of the edited message; we keep
    messages[0:keep_before] (i.e. everything *before* the edited turn).
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing body"}), 400
    session_id = data.get("session_id", "default")
    keep_before = data.get("keep_before", None)
    if keep_before is None:
        return jsonify({"error": "Missing 'keep_before'"}), 400
    conversation_service.truncate(session_id, int(keep_before))
    return jsonify({"status": "truncated"})


# --- Main (local dev only — production uses gunicorn, which skips this block) ---

if __name__ == "__main__":
    import os
    print()
    print("Chanakya -- Indian Knowledge System Assistant")
    print("=" * 45)

    # Use HTTPS locally if pyopenssl is installed (needed for mic/clipboard)
    use_ssl = False
    try:
        import OpenSSL  # noqa: F401
        use_ssl = True
    except ImportError:
        pass

    if use_ssl:
        print("   Open https://localhost:5000 in your browser")
        print("   NOTE: Your browser will warn about the self-signed cert -- click 'Advanced > Proceed' to continue")
    else:
        print("   Open http://localhost:5000 in your browser")

    print("   (Chrome/Edge recommended for voice features)")
    print()

    app.run(
        debug=True,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        ssl_context="adhoc" if use_ssl else None,
    )
