from uagents import Agent, Context
from backend.models.messages import StudentChatMessage, AgentChatReply
from backend.services.claude_service import chat_completion_json
from backend.services import state_store
import logging

logger = logging.getLogger(__name__)

interest_agent = Agent(name="interest_agent", port=8011, endpoint=["http://localhost:8011/submit"])

SYSTEM = """You are a friendly academic advisor helping a student personalize their course.
Your goal: understand what topic or domain they are deeply interested in (e.g., sports betting, gaming, music production, fashion, etc.)

Ask short, conversational questions. After 2-3 exchanges, if you are confident about their interest, confirm it.

Always respond with JSON:
{
  "reply": "your conversational response to the student",
  "interest_confirmed": false,
  "interest_domain": null,
  "interest_keywords": []
}

Once confirmed, set interest_confirmed to true, interest_domain to the topic (2-4 words), and interest_keywords to 5-8 relevant keywords."""


@interest_agent.on_message(model=StudentChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: StudentChatMessage):
    logger.info(f"Interest chat for session {msg.session_id}")
    try:
        messages = msg.history + [{"role": "user", "content": msg.student_message}]
        result = chat_completion_json(messages=messages, system=SYSTEM)
        reply = AgentChatReply(
            session_id=msg.session_id,
            reply=result.get("reply", ""),
            interest_confirmed=result.get("interest_confirmed", False),
            interest_domain=result.get("interest_domain"),
            interest_keywords=result.get("interest_keywords", []),
        )
        if reply.interest_confirmed:
            state_store.update_session(
                msg.session_id,
                interest_confirmed=True,
                interest_domain=reply.interest_domain,
                interest_keywords=reply.interest_keywords,
            )
        await ctx.send(sender, reply)
    except Exception as e:
        logger.error(f"Interest agent error: {e}")
