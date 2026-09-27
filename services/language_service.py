"""
Language detection service for Chanakya.
Detects whether the user's message is in English, Hindi, Sanskrit, or Hinglish
using Unicode range checks and keyword heuristics.
"""

import re
import unicodedata


# Devanagari Unicode range: U+0900 - U+097F
DEVANAGARI_PATTERN = re.compile(r'[\u0900-\u097F]')

# Common Hinglish (Roman-script Hindi) words
HINGLISH_MARKERS = {
    "kya", "kaise", "hai", "hain", "ho", "mein", "mujhe", "aap", "tum",
    "nahi", "nahin", "kuch", "koi", "yeh", "woh", "iska", "uska",
    "batao", "bolo", "karo", "jao", "aao", "raha", "rahi", "rahe",
    "ke", "ki", "ka", "se", "ko", "ne", "par", "pe", "mein",
    "acha", "accha", "theek", "thik", "bahut", "bohot", "zyada",
    "samjhao", "samjho", "pata", "chahiye", "chahte", "chaahiye",
    "hota", "hoti", "hote", "tha", "thi", "the",
    "dosha", "kapha", "vata", "pitta", "yoga", "dhyana", "mantra",
    "guru", "shishya", "vidya", "shastra", "sutra", "vedanta",
    "namaste", "namaskar", "pranam", "dhanyavaad", "shukriya",
    "ji", "sahab", "bhai", "didi", "mata", "pita",
}

# Sanskrit-specific markers (words/patterns less common in spoken Hindi)
SANSKRIT_MARKERS = {
    "अस्ति", "भवति", "करोति", "गच्छति", "वदति", "पठति", "लिखति",
    "कृपया", "कथं", "किमर्थम्", "एतत्", "तत्", "इदम्", "सः", "सा",
    "च", "वा", "एव", "तु", "हि", "अपि", "इति", "यत्", "तत्र",
    "ब्रह्मन्", "आत्मन्", "धर्मः", "कर्म", "मोक्षः", "ज्ञानम्",
    "श्लोकः", "सूत्रम्", "भाष्यम्", "वार्तिकम्",
}

# Sanskrit romanized markers (IAST-style patterns)
SANSKRIT_ROMAN_MARKERS = {
    "asti", "bhavati", "karoti", "gacchati", "vadati", "pathati",
    "kripaya", "katham", "kimartham", "etat", "idam", "tatra",
    "brahman", "atman", "dharmah", "mokshah", "jnanam",
    "shlokah", "sutram", "bhashyam", "vartikam",
    "namah", "om", "svaha", "namo",
}


class LanguageDetector:
    """Detects the language of incoming user messages."""

    # Language code constants
    ENGLISH = "en"
    HINDI = "hi"
    SANSKRIT = "sa"
    HINGLISH = "hinglish"

    # Locale mapping for voice
    LOCALE_MAP = {
        "en": "en-IN",
        "hi": "hi-IN",
        "sa": "hi-IN",       # Sanskrit TTS falls back to Hindi locale
        "hinglish": "hi-IN",
    }

    def detect(self, text: str) -> str:
        """
        Detect language of the given text.

        Returns one of: 'en', 'hi', 'sa', 'hinglish'
        """
        if not text or not text.strip():
            return self.ENGLISH

        text_stripped = text.strip()

        # Step 1: Check for Devanagari script
        devanagari_chars = len(DEVANAGARI_PATTERN.findall(text_stripped))
        total_alpha = sum(1 for c in text_stripped if unicodedata.category(c).startswith('L'))

        if total_alpha == 0:
            return self.ENGLISH

        devanagari_ratio = devanagari_chars / total_alpha if total_alpha > 0 else 0

        if devanagari_ratio > 0.3:
            # It's Devanagari script — now distinguish Hindi vs Sanskrit
            return self._classify_devanagari(text_stripped)

        # Step 2: Check for Hinglish (Roman-script Hindi)
        words = set(re.findall(r'[a-zA-Z]+', text_stripped.lower()))
        hinglish_count = len(words & HINGLISH_MARKERS)

        if len(words) > 0 and hinglish_count / len(words) > 0.25:
            return self.HINGLISH

        # Step 3: Check for romanized Sanskrit
        sanskrit_roman_count = len(words & SANSKRIT_ROMAN_MARKERS)
        if len(words) > 0 and sanskrit_roman_count / len(words) > 0.2:
            return self.SANSKRIT

        # Default to English
        return self.ENGLISH

    def _classify_devanagari(self, text: str) -> str:
        """
        Distinguish between Hindi and Sanskrit in Devanagari script.
        Sanskrit tends to have more visarga (ः), anusvara in classical patterns,
        halant/virama (्) for conjuncts, and specific vocabulary.
        """
        words = set(text.split())

        # Check for Sanskrit-specific vocabulary
        sanskrit_word_hits = len(words & SANSKRIT_MARKERS)

        # Sanskrit heuristics: visarga, heavy conjuncts, specific endings
        visarga_count = text.count('ः')
        halant_count = text.count('्')
        text_len = len(text)

        # Sanskrit text typically has more virama/halant per character (conjunct consonants)
        halant_density = halant_count / text_len if text_len > 0 else 0

        # If clear Sanskrit markers are present
        if sanskrit_word_hits >= 2:
            return self.SANSKRIT

        # If high halant density + visarga (characteristic of Sanskrit)
        if halant_density > 0.08 and visarga_count >= 1:
            return self.SANSKRIT

        # Default Devanagari → Hindi
        return self.HINDI

    def get_locale(self, lang_code: str) -> str:
        """Get the browser voice locale for a detected language code."""
        return self.LOCALE_MAP.get(lang_code, "en-IN")

    def format_language_tag(self, lang_code: str) -> str:
        """Format a language tag for injection into the LLM prompt context."""
        label_map = {
            "en": "en-Latin",
            "hi": "hi-Deva",
            "sa": "sa-Deva",
            "hinglish": "hi-Latin-Hinglish",
        }
        return label_map.get(lang_code, "en-Latin")
