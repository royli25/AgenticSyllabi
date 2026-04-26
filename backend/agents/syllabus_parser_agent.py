from uagents import Agent, Context
from backend.models.messages import SyllabusParseRequest, ParsedSyllabusMessage
from backend.services.claude_service import chat_completion_json
from backend.services import state_store
import logging

logger = logging.getLogger(__name__)

syllabus_parser = Agent(name="syllabus_parser", port=8010, endpoint=["http://localhost:8010/submit"])

SYSTEM = """You are an expert at parsing university course syllabi.
Extract the course title, required topics, and learning outcomes.
Return JSON with this exact structure:
{
  "course_title": "string",
  "required_topics": ["topic1", "topic2", ...],
  "learning_outcomes": ["outcome1", "outcome2", ...]
}
Keep required_topics concise (3-8 words each). Extract 5-15 topics."""


@syllabus_parser.on_message(model=SyllabusParseRequest)
async def handle_parse(ctx: Context, sender: str, msg: SyllabusParseRequest):
    logger.info(f"Parsing syllabus for session {msg.session_id}")
    try:
        result = chat_completion_json(
            messages=[{"role": "user", "content": f"Parse this syllabus:\n\n{msg.raw_text}"}],
            system=SYSTEM,
        )
        reply = ParsedSyllabusMessage(
            session_id=msg.session_id,
            course_title=result.get("course_title", "Course"),
            required_topics=result.get("required_topics", []),
            learning_outcomes=result.get("learning_outcomes", []),
        )
        state_store.update_session(
            msg.session_id,
            course_title=reply.course_title,
            required_topics=reply.required_topics,
            learning_outcomes=reply.learning_outcomes,
        )
        await ctx.send(sender, reply)
    except Exception as e:
        logger.error(f"Syllabus parse error: {e}")
