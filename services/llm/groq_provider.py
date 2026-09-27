"""
Groq API provider implementation.
Uses the Groq SDK for ultra-fast inference with free tier (no credit card needed).
Get your free API key at: https://console.groq.com/keys

Includes retry logic for API overload (503) errors.
"""

import time
from typing import List, Dict
from groq import Groq

from services.llm.llm_provider import LLMProvider


# Fallback models to try if the primary model is overloaded
GROQ_FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
]


class GroqProvider(LLMProvider):
    """Concrete LLM provider using the Groq API (free tier available)."""

    MAX_RETRIES = 2
    RETRY_DELAY = 1.5  # seconds

    def __init__(self, api_key: str, model_name: str = "openai/gpt-oss-120b"):
        self.model_name = model_name
        self.client = Groq(api_key=api_key)

    def _call_api(self, messages, model_name):
        """Make a single API call to Groq."""
        response = self.client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.7,
            top_p=0.9,
            max_tokens=2048,
        )
        return response.choices[0].message.content

    def generate_response(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        language_context: str = "",
        safety_context: str = "",
    ) -> str:
        """
        Generate a response using the Groq API.
        Retries on overload errors and falls back to alternative models.
        """
        # Build the full system instruction
        full_system = system_prompt
        if language_context:
            full_system += f"\n\n[LANGUAGE CONTEXT: {language_context}]"
        if safety_context:
            full_system += f"\n\n{safety_context}"

        # Build messages list
        messages = [{"role": "system", "content": full_system}]

        # Add conversation history
        for turn in conversation_history:
            messages.append({
                "role": turn["role"],
                "content": turn["content"],
            })

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Try primary model with retries
        models_to_try = [self.model_name] + GROQ_FALLBACK_MODELS

        for model in models_to_try:
            for attempt in range(self.MAX_RETRIES + 1):
                try:
                    result = self._call_api(messages, model)
                    if result:
                        if model != self.model_name:
                            print(f"[GroqProvider] Used fallback model: {model}")
                        return result
                except Exception as e:
                    error_str = str(e).lower()
                    is_overloaded = "overloaded" in error_str or "503" in error_str or "rate" in error_str

                    if is_overloaded and attempt < self.MAX_RETRIES:
                        print(f"[GroqProvider] {model} overloaded, retry {attempt + 1}...")
                        time.sleep(self.RETRY_DELAY * (attempt + 1))
                        continue
                    elif is_overloaded:
                        print(f"[GroqProvider] {model} still overloaded, trying next model...")
                        break  # try next model
                    else:
                        print(f"[GroqProvider] Error with {model}: {e}")
                        break  # non-overload error, try next model

        # All models failed
        raise Exception("All Groq models are currently overloaded or unavailable")
