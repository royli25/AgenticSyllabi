from uagents import Agent, Context
from backend.models.messages import CoursePlanRequest
from backend.models.schemas import CoursePlan, Topic
from backend.services.claude_service import chat_completion_json
from backend.services import state_store
import uuid
import logging

logger = logging.getLogger(__name__)

course_plan_agent = Agent(name="course_plan_agent", port=8013, endpoint=["http://localhost:8013/submit"])

SYSTEM = """You are a curriculum designer specializing in personalized learning.
Given a course's required topics and a student's interest domain, create a personalized course plan.

For each topic, provide an "interest_angle" — a 1-2 sentence description of how to teach that topic
specifically through the lens of the student's interest domain.

Respond with JSON:
{
  "topics": [
    {
      "title": "original topic title",
      "interest_angle": "how to teach this through the interest lens",
      "learning_outcomes": ["outcome1", "outcome2"]
    }
  ]
}"""


@course_plan_agent.on_message(model=CoursePlanRequest)
async def handle_plan(ctx: Context, sender: str, msg: CoursePlanRequest):
    logger.info(f"Generating course plan for session {msg.session_id}")
    try:
        prompt = f"""Course: {msg.course_title}
Student interest: {msg.interest_domain}
Interest keywords: {", ".join(msg.interest_keywords)}
Domain context: {msg.domain_summary}

Required topics:
{chr(10).join(f"- {t}" for t in msg.required_topics)}

Create a personalized course plan mapping each topic to the student's interest."""

        result = chat_completion_json(
            messages=[{"role": "user", "content": prompt}],
            system=SYSTEM,
            max_tokens=4096,
        )

        topics = []
        for i, t in enumerate(result.get("topics", [])):
            topic_id = f"topic_{i+1:03d}"
            topics.append(Topic(
                topic_id=topic_id,
                title=t.get("title", msg.required_topics[i] if i < len(msg.required_topics) else f"Topic {i+1}"),
                original_syllabus_topic=msg.required_topics[i] if i < len(msg.required_topics) else t.get("title", ""),
                learning_outcomes=t.get("learning_outcomes", []),
                interest_angle=t.get("interest_angle", ""),
                status="pending",
            ))

        plan = CoursePlan(
            plan_id=f"plan_{uuid.uuid4().hex[:8]}",
            session_id=msg.session_id,
            course_id=state_store.get_session(msg.session_id).course_id or "",
            course_title=msg.course_title,
            student_interest=msg.interest_domain,
            interest_keywords=msg.interest_keywords,
            domain_context=msg.domain_summary,
            topics=topics,
        )

        state_store.update_session(msg.session_id, plan=plan)
        # Signal to orchestrator that plan skeleton is ready
        from backend.services.state_store import update_session
        from backend.models.schemas import PlanStatus
        update_session(msg.session_id, plan_status=PlanStatus.generating)

    except Exception as e:
        logger.error(f"Course plan agent error: {e}")
