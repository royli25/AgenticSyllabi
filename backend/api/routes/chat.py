from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.services import state_store
from backend.services.claude_service import stream_chat, chat_completion_json
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM = """You are a friendly academic advisor helping a student personalize their course.
Your goal: understand what topic or domain they are deeply interested in (e.g., sports betting, gaming, music, fashion, etc.)

Ask short, conversational questions. After 2-3 exchanges, once you are confident about their interest, confirm it.

Always reply with JSON:
{
  "reply": "your conversational message",
  "interest_confirmed": false,
  "interest_domain": null,
  "interest_keywords": []
}

When confirmed, set interest_confirmed to true, interest_domain (2-4 words), and 5-8 relevant interest_keywords."""


class ChatRequest(BaseModel):
    message: str


@router.post("/{session_id}/message")
async def send_message(session_id: str, body: ChatRequest):
    session = state_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    history = session.chat_history + [{"role": "user", "content": body.message}]

    result = await chat_completion_json(messages=history, system=SYSTEM)

    reply_text = result.get("reply", "")
    confirmed = result.get("interest_confirmed", False)
    domain = result.get("interest_domain")
    keywords = result.get("interest_keywords", [])

    new_history = history + [{"role": "assistant", "content": reply_text}]
    update_kwargs = {"chat_history": new_history}
    if confirmed:
        update_kwargs.update(
            interest_confirmed=True,
            interest_domain=domain,
            interest_keywords=keywords,
        )
    state_store.update_session(session_id, **update_kwargs)

    return {
        "reply": reply_text,
        "interest_confirmed": confirmed,
        "interest_domain": domain,
        "interest_keywords": keywords,
    }


@router.get("/{session_id}/interest")
async def get_interest(session_id: str):
    session = state_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return {
        "interest_domain": session.interest_domain,
        "interest_keywords": session.interest_keywords,
        "confirmed": session.interest_confirmed,
    }
