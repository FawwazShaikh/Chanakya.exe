"""
Fallback LLM provider — tries multiple providers in sequence.
If the primary provider fails, automatically falls back to the next one.
"""

from typing import List, Dict

from services.llm.llm_provider import LLMProvider


class FallbackProvider(LLMProvider):
    """
    Chains multiple LLM providers and tries each in order.
    Returns the first successful response.
    """

    def __init__(self, providers: List[LLMProvider]):
        if not providers:
            raise ValueError("At least one LLM provider is required.")
        self.providers = providers

    def generate_response(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        language_context: str = "",
        safety_context: str = "",
    ) -> str:
        """
        Try each provider in sequence. Return the first successful response.
        """
        last_error = None

        for i, provider in enumerate(self.providers):
            try:
                response = provider.generate_response(
                    system_prompt=system_prompt,
                    conversation_history=conversation_history,
                    user_message=user_message,
                    language_context=language_context,
                    safety_context=safety_context,
                )

                # Check if the response is a known error message from the provider
                if response and "encountered an issue" not in response:
                    provider_name = type(provider).__name__
                    print(f"[FallbackProvider] Response from {provider_name} (provider {i + 1})")
                    return response

            except Exception as e:
                provider_name = type(provider).__name__
                print(f"[FallbackProvider] {provider_name} failed: {e}")
                last_error = e
                continue

        # If all providers failed
        return (
            "I'm sorry, all my knowledge sources are currently unavailable. "
            "Please try again in a moment. 🙏"
        )
