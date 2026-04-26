from backend.models.schemas import SessionState
from typing import Optional

_store: dict[str, SessionState] = {}


def get_session(session_id: str) -> Optional[SessionState]:
    return _store.get(session_id)


def set_session(session_id: str, state: SessionState) -> None:
    _store[session_id] = state


def create_session(session_id: str) -> SessionState:
    state = SessionState(session_id=session_id)
    _store[session_id] = state
    return state


def update_session(session_id: str, **kwargs) -> SessionState:
    state = _store[session_id]
    updated = state.model_copy(update=kwargs)
    _store[session_id] = updated
    return updated
