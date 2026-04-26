from uagents import Agent, Context
from backend.agents import workflows
from backend.models.messages import StudentChatMessage
import logging

logger = logging.getLogger(__name__)

interest_agent = Agent(name="interest_agent", port=8011, endpoint=["http://localhost:8011/submit"])


@interest_agent.on_message(model=StudentChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: StudentChatMessage):
    logger.info(f"Interest chat for session {msg.session_id}")
    try:
        reply = await workflows.infer_interest(
            session_id=msg.session_id,
            student_message=msg.student_message,
            history=msg.history,
        )
        await ctx.send(sender, reply)
    except Exception as e:
        logger.error(f"Interest agent error: {e}")
