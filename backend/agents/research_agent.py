from uagents import Agent, Context
from backend.models.messages import ResearchRequest, ResearchResults
from backend.services import tavily_service, state_store
from backend.services.claude_service import chat_completion
import logging

logger = logging.getLogger(__name__)

research_agent = Agent(name="research_agent", port=8012, endpoint=["http://localhost:8012/submit"])

SUMMARY_SYSTEM = """You are a research assistant. Given web search results about a domain,
write a concise 3-5 sentence summary explaining what that domain is, its key concepts,
and why it's interesting. Be concrete and specific."""


@research_agent.on_message(model=ResearchRequest)
async def handle_research(ctx: Context, sender: str, msg: ResearchRequest):
    logger.info(f"Researching '{msg.interest_domain}' for session {msg.session_id}")
    try:
        topic_resources: dict[str, list] = {}

        # Search for each required topic intersected with the interest domain
        for topic in msg.required_topics:
            query = f"{msg.interest_domain} {topic}"
            results = await tavily_service.search(query, max_results=4)
            topic_resources[topic] = [
                {"title": r["title"], "url": r["url"], "summary": r["content"][:200]}
                for r in results
            ]

        # Build a domain summary from a broad search
        broad_results = await tavily_service.search(msg.interest_domain, max_results=5)
        snippets = "\n".join(r["content"][:300] for r in broad_results)
        domain_summary = chat_completion(
            messages=[{"role": "user", "content": f"Domain: {msg.interest_domain}\n\nWeb snippets:\n{snippets}"}],
            system=SUMMARY_SYSTEM,
        )

        reply = ResearchResults(
            session_id=msg.session_id,
            interest_domain=msg.interest_domain,
            domain_summary=domain_summary,
            topic_resources=topic_resources,
        )
        await ctx.send(sender, reply)
    except Exception as e:
        logger.error(f"Research agent error: {e}")
