"""
Gemini API provider implementation.
Uses the google-genai SDK to communicate with Google's Gemini models.
"""

from typing import List, Dict
from google import genai
from google.genai import types

from services.llm.llm_provider import LLMProvider


class GeminiProvider(LLMProvider):
    """Concrete LLM provider using the Gemini API."""

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name
        self.client = genai.Client(api_key=api_key)

    def generate_response(
        self,
        system_prompt: str,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        language_context: str = "",
        safety_context: str = "",
    ) -> str:
        """
        Generate a response using the Gemini API.
        """
        # Build the full system instruction
        full_system = system_prompt
        if language_context:
            full_system += f"\n\n[LANGUAGE CONTEXT: {language_context}]"
        if safety_context:
            full_system += f"\n\n{safety_context}"

        # Build the contents list from conversation history
        contents = []
        for turn in conversation_history:
            role = "user" if turn["role"] == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=turn["content"])]
                )
            )

        # Add the current user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_message)]
            )
        )

        # Configure generation
        generate_config = types.GenerateContentConfig(
            system_instruction=full_system,
            temperature=0.7,
            top_p=0.9,
            max_output_tokens=2048,
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=generate_config,
            )
            return response.text or "I apologize, but I was unable to generate a response. Please try again."
        except Exception as e:
            print(f"[GeminiProvider] Error: {e}")
            return (
                "I'm sorry, I encountered an issue connecting to my knowledge base. "
                "Please try again in a moment. 🙏"
            )
