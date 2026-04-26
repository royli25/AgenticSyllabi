from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents import workflows
from backend.services import state_store

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.post("/{session_id}/message")
async def send_message(session_id: str, body: ChatRequest):
    session = state_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    reply = await workflows.infer_interest(
        session_id=session_id,
        student_message=body.message,
        history=session.chat_history,
    )
    return {
        "reply": reply.reply,
        "interest_confirmed": reply.interest_confirmed,
        "interest_domain": reply.interest_domain,
        "interest_keywords": reply.interest_keywords,
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
