from uagents import Agent, Context
from backend.agents import workflows
from backend.models.messages import SyllabusParseRequest
import logging

logger = logging.getLogger(__name__)

syllabus_parser = Agent(name="syllabus_parser", port=8010, endpoint=["http://localhost:8010/submit"])


@syllabus_parser.on_message(model=SyllabusParseRequest)
async def handle_parse(ctx: Context, sender: str, msg: SyllabusParseRequest):
    logger.info(f"Parsing syllabus for session {msg.session_id}")
    try:
        reply = await workflows.parse_syllabus_text(msg.session_id, msg.raw_text)
        await ctx.send(sender, reply)
    except Exception as e:
        logger.error(f"Syllabus parse error: {e}")
