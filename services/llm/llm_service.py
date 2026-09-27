"""
LLM Service — orchestrates the LLM call with system prompt,
language context, safety context, and conversation history.
"""

from typing import List, Dict

from services.llm.llm_provider import LLMProvider


class LLMService:
    """
    High-level service that coordinates prompting and LLM calls.
    Sits between the conversation layer and the raw LLM provider.
    """

    def __init__(self, provider: LLMProvider, system_prompt: str):
        self.provider = provider
        self.system_prompt = system_prompt

    def get_response(
        self,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        detected_language: str = "en",
        language_tag: str = "en-Latin",
        safety_context: str = "",
    ) -> str:
        """
        Get a response from the LLM with full context injection.

        Args:
            conversation_history: Previous turns.
            user_message: The new user message.
            detected_language: Language code ('en', 'hi', 'sa', 'hinglish').
            language_tag: Formatted language tag for prompt injection.
            safety_context: Additional safety instructions if flagged.

        Returns:
            The LLM's response text.
        """
        language_context = (
            f"The user's message is detected as: {language_tag}. "
            f"You MUST reply in the same language and script."
        )

        return self.provider.generate_response(
            system_prompt=self.system_prompt,
            conversation_history=conversation_history,
            user_message=user_message,
            language_context=language_context,
            safety_context=safety_context,
        )
