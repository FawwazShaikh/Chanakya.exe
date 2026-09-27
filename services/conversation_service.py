"""
Conversation service for IKS-Bot.
Manages per-session conversation history in memory.
"""

from typing import Dict, List
from config import MAX_CONVERSATION_HISTORY


class ConversationService:
    """Manages conversation history per session."""

    def __init__(self):
        # session_id -> list of {"role": "user"/"assistant", "content": "..."}
        self._sessions: Dict[str, List[Dict[str, str]]] = {}

    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation history for a session."""
        return self._sessions.get(session_id, [])

    def add_user_message(self, session_id: str, message: str):
        """Record a user message in the session history."""
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append({"role": "user", "content": message})
        self._trim(session_id)

    def add_assistant_message(self, session_id: str, message: str):
        """Record an assistant response in the session history."""
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append({"role": "assistant", "content": message})
        self._trim(session_id)

    def clear_session(self, session_id: str):
        """Clear a session's history."""
        self._sessions.pop(session_id, None)

    def truncate(self, session_id: str, keep_before: int):
        """
        Truncate session history to keep only the first `keep_before` messages.
        Called when the user edits a past message and everything after it
        must be discarded.
        """
        history = self._sessions.get(session_id, [])
        if keep_before < len(history):
            self._sessions[session_id] = history[:keep_before]

    def _trim(self, session_id: str):
        """Keep only the most recent turns to prevent unbounded growth."""
        history = self._sessions.get(session_id, [])
        if len(history) > MAX_CONVERSATION_HISTORY * 2:
            # Keep the last MAX_CONVERSATION_HISTORY pairs (user+assistant)
            self._sessions[session_id] = history[-(MAX_CONVERSATION_HISTORY * 2):]
