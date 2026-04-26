from uagents import Agent, Context
from backend.models.messages import TopicContentRequest
from backend.models.schemas import TopicContent, Reading, ProjectBrief
from backend.services.claude_service import chat_completion_json
from backend.services import state_store
import uuid
import logging

logger = logging.getLogger(__name__)

content_generator = Agent(name="content_generator", port=8014, endpoint=["http://localhost:8014/submit"])

SYSTEM = """You are an expert educator who makes complex topics accessible through real-world examples.
Given a course topic and a student's interest domain, generate:
1. A detailed explainer (in markdown) that teaches the topic entirely through examples from their interest domain
2. A project brief for them to apply the concept

Respond with JSON:
{
  "explainer": "## Topic Title\\n\\nMarkdown content here...",
  "project": {
    "title": "project title",
    "description": "2-3 sentence description",
    "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3"],
    "estimated_hours": 2
  }
}

The explainer should be 400-600 words, use the interest domain as the primary lens, and include practical examples."""


@content_generator.on_message(model=TopicContentRequest)
async def handle_content(ctx: Context, sender: str, msg: TopicContentRequest):
    logger.info(f"Generating content for topic {msg.topic_id} session {msg.session_id}")
    try:
        readings_text = "\n".join(
            f"- {r['title']}: {r.get('summary', '')[:150]}" for r in msg.readings
        )
        prompt = f"""Topic: {msg.topic_title}
Interest domain: {msg.interest_domain}
Angle: {msg.interest_angle}
Learning outcomes: {", ".join(msg.learning_outcomes)}

Available readings context:
{readings_text}

Generate the explainer and project brief."""

        result = chat_completion_json(
            messages=[{"role": "user", "content": prompt}],
            system=SYSTEM,
            max_tokens=3000,
        )

        proj_data = result.get("project", {})
        content = TopicContent(
            explainer=result.get("explainer", ""),
            readings=[
                Reading(
                    reading_id=f"r_{uuid.uuid4().hex[:6]}",
                    title=r["title"],
                    url=r["url"],
                    summary=r.get("summary", "")[:200],
                )
                for r in msg.readings[:5]
            ],
            project=ProjectBrief(
                title=proj_data.get("title", ""),
                description=proj_data.get("description", ""),
                deliverables=proj_data.get("deliverables", []),
                estimated_hours=proj_data.get("estimated_hours", 2),
            ),
        )

        # Patch the topic in the stored plan
        session = state_store.get_session(msg.session_id)
        if session and session.plan:
            updated_topics = []
            for t in session.plan.topics:
                if t.topic_id == msg.topic_id:
                    updated_topics.append(t.model_copy(update={"content": content, "status": "complete"}))
                else:
                    updated_topics.append(t)
            updated_plan = session.plan.model_copy(update={"topics": updated_topics})
            state_store.update_session(msg.session_id, plan=updated_plan)

    except Exception as e:
        logger.error(f"Content generator error for {msg.topic_id}: {e}")
