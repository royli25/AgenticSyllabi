from uagents import Agent, Context
from backend.agents import workflows
from backend.models.messages import ResearchRequest
import logging

logger = logging.getLogger(__name__)

research_agent = Agent(name="research_agent", port=8012, endpoint=["http://localhost:8012/submit"])


@research_agent.on_message(model=ResearchRequest)
async def handle_research(ctx: Context, sender: str, msg: ResearchRequest):
    logger.info(f"Researching '{msg.interest_domain}' for session {msg.session_id}")
    try:
        reply = await workflows.research_interest(
            session_id=msg.session_id,
            interest_domain=msg.interest_domain,
            interest_keywords=msg.interest_keywords,
            required_topics=msg.required_topics,
        )
        await ctx.send(sender, reply)
    except Exception as e:
        logger.error(f"Research agent error: {e}")
