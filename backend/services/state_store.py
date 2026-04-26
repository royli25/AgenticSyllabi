from backend.models.schemas import SessionState
from typing import Optional

_store: dict[str, SessionState] = {}


def get_session(session_id: str) -> Optional[SessionState]:
    return _store.get(session_id)


def require_session(session_id: str) -> SessionState:
    state = get_session(session_id)
    if state is None:
        raise KeyError(f"Unknown session_id: {session_id}")
    return state


def set_session(session_id: str, state: SessionState) -> None:
    _store[session_id] = state


def create_session(session_id: str) -> SessionState:
    state = SessionState(session_id=session_id)
    _store[session_id] = state
    return state


def update_session(session_id: str, **kwargs) -> SessionState:
    state = require_session(session_id)
    updated = state.model_copy(update=kwargs)
    _store[session_id] = updated
    return updated


def update_topic(session_id: str, topic_id: str, **kwargs) -> SessionState:
    state = require_session(session_id)
    if state.plan is None:
        raise KeyError(f"Session {session_id} has no plan")

    updated_topics = []
    found = False
    for topic in state.plan.topics:
        if topic.topic_id == topic_id:
            updated_topics.append(topic.model_copy(update=kwargs))
            found = True
        else:
            updated_topics.append(topic)

    if not found:
        raise KeyError(f"Unknown topic_id: {topic_id}")

    updated_plan = state.plan.model_copy(update={"topics": updated_topics})
    return update_session(session_id, plan=updated_plan)


def reset_store() -> None:
    _store.clear()
