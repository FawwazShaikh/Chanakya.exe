import os
from dotenv import load_dotenv

load_dotenv()

# --- API Keys ---
def _clean_key(val: str) -> str:
    """Return empty string if the key is a placeholder."""
    if not val or "your_" in val.lower() or "_here" in val.lower():
        return ""
    return val.strip()

GEMINI_API_KEY = _clean_key(os.getenv("GEMINI_API_KEY", ""))
GROQ_API_KEY = _clean_key(os.getenv("GROQ_API_KEY", ""))

# --- Model Configuration ---
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3.8-flash")
GROQ_MODEL_NAME = os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-120b")

# --- Active Provider ---
# Options: "groq", "gemini", "auto" (tries Groq first, falls back to Gemini)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "auto")

# --- System Prompt ---
SYSTEM_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "system_prompt.txt")

def load_system_prompt():
    """Load the master system prompt from file."""
    with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()

SYSTEM_PROMPT = load_system_prompt()

# --- Session Configuration ---
MAX_CONVERSATION_HISTORY = 20  # Max turns to keep in memory per session

# --- Safety Keywords ---
# Ayurveda symptom keywords that trigger a medical disclaimer
AYURVEDA_SYMPTOM_KEYWORDS = [
    "symptom", "cure", "remedy", "treatment", "medicine", "dose", "dosage",
    "prescribe", "prescription", "diagnose", "diagnosis", "pain", "ache",
    "fever", "cold", "cough", "acidity", "indigestion", "headache",
    "insomnia", "anxiety", "depression", "infection", "disease", "illness",
    "roga", "chikitsa", "aushadhi", "dawa", "ilaj", "bimari", "rog",
    "upchar", "upchaar", "lakshan", "takleef", "taklif",
    "रोग", "चिकित्सा", "औषधि", "दवा", "इलाज", "बीमारी", "उपचार", "लक्षण", "तकलीफ"
]

# Off-topic keywords that signal non-IKS queries
OFF_TOPIC_KEYWORDS = [
    "python code", "javascript code", "write code", "programming",
    "football", "cricket score", "stock market", "bitcoin",
    "resume", "cover letter", "job application",
    "recipe for pizza", "movie review", "video game",
    "ignore your instructions", "pretend you are", "forget your rules"
]
