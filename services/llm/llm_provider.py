"""
Abstract base class for LLM providers.
Any LLM backend (Gemini, OpenAI, Claude, etc.) implements this interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict


class LLMProvider(ABC):
    """Abstract LLM provider interface."""

    @abstractmethod
    def generate_response(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        language_context: str = "",
        safety_context: str = "",
    ) -> str:
        """
        Generate a response from the LLM.

        Args:
            system_prompt: The master system prompt.
            conversation_history: List of {"role": "user"/"assistant", "content": "..."} dicts.
            user_message: The current user message.
            language_context: Detected language tag (e.g., "[detected_language: hi-Deva]").
            safety_context: Any safety instructions to inject.

        Returns:
            The LLM's text response.
        """
        pass
