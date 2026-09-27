# 🕉️ Chanakya — Indian Knowledge System Conversational Assistant

A warm, scholarly conversational guide to the **Indian Knowledge System (IKS)** — spanning Vedas, Ayurveda, Yoga, Sanskrit, Jyotisha, Natya Shastra, and more.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0+-green?logo=flask)
![Gemini](https://img.shields.io/badge/Gemini_API-Powered-orange?logo=google)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎙️ **Voice Mode** | Speak your question, hear the answer read back (Web Speech API) |
| 🕉️ **Sanskrit Keypad** | On-screen Devanagari keyboard + ITRANS transliteration |
| 🌐 **Language Mirroring** | Auto-detects English / Hindi / Sanskrit / Hinglish and replies in kind |
| 🪟 **Glassmorphism UI** | Frosted-glass cards, mandala backgrounds, saffron-indigo palette |
| 🛡️ **Safety Guardrails** | Medical disclaimers for Ayurveda queries, off-topic redirection |
| 📚 **Domain Locked** | Stays focused on IKS — won't get pulled off-topic |

---

## 🚀 Quick Start

### 1. Clone & navigate
```bash
git clone <your-repo-url>
cd ChatBot
```

### 2. Create a virtual environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up your API key
```bash
copy .env.example .env
# Edit .env and paste your Gemini API key
```

Get a free Gemini API key at: https://aistudio.google.com/apikey

### 5. Run the app
```bash
python app.py
```

Open **http://localhost:5000** in your browser (Chrome/Edge recommended for voice features).

---

## 🏗️ Architecture

```
Browser (HTML/CSS/JS)
   ├── Chat UI (glass cards, message rendering)
   ├── Mic button ──> Web Speech API (STT) ──> fills input box
   ├── Speaker icon ──> Web Speech API (TTS) ──> reads bot reply aloud
   ├── Sanskrit Keypad ──> Built-in ITRANS transliteration
   │
   ▼  fetch POST /chat  { message, session_id }
Flask Backend
   ├── LanguageDetector   (Devanagari/Hinglish/English heuristic)
   ├── ConversationService (per-session history in memory)
   ├── SafetyService       (medical disclaimers, off-topic guard)
   ├── LLMService  ──>  LLMProvider (abstract)  ──>  GeminiProvider  ──>  Gemini API
   └── returns { reply, detected_language, locale }
```

---

## 📁 Project Structure

```
ChatBot/
├── app.py                  # Flask app — routes: / (UI), /chat (POST), /clear (POST)
├── config.py               # API keys, model config, safety keywords
├── prompts/
│   └── system_prompt.txt   # The master system prompt (Chanakya's "brain")
├── services/
│   ├── conversation_service.py
│   ├── safety_service.py
│   ├── language_service.py
│   └── llm/
│       ├── llm_provider.py      # Abstract base class
│       ├── llm_service.py       # Orchestrator
│       └── gemini_provider.py   # Gemini API implementation
├── static/
│   ├── css/
│   │   └── glass.css       # Glassmorphism styles + palette
│   └── js/
│       ├── chat.js          # Message rendering + /chat calls
│       ├── voice.js         # Speech-to-text + text-to-speech
│       └── sanskritKeypad.js # Devanagari keypad + ITRANS transliteration
├── templates/
│   └── index.html          # Single-page glass UI shell
├── .env.example
├── requirements.txt
└── README.md
```

---

## 🗣️ Supported Languages

The bot auto-detects and mirrors your language:
- **English** — type normally
- **Hindi** — type in Devanagari (हिंदी में टाइप करें)
- **Sanskrit** — use the built-in Sanskrit keypad or ITRANS transliteration
- **Hinglish** — Roman-script Hindi ("mujhe yoga ke baare mein batao")

---

## 📝 License

This project is for educational purposes.
