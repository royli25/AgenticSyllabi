import logging

from uagents import Agent, Context

from backend.agents import workflows
from backend.models.messages import CoursePlanReply, CoursePlanRequest
from backend.models.schemas import PlanStatus
from backend.services import state_store

logger = logging.getLogger(__name__)

course_plan_agent = Agent(
    name="course_plan_agent",
    port=8013,
    endpoint=["http://localhost:8013/submit"],
)


@course_plan_agent.on_message(model=CoursePlanRequest)
async def handle_plan(ctx: Context, sender: str, msg: CoursePlanRequest):
    logger.info("Generating course plan for session %s", msg.session_id)
    try:
        session = state_store.require_session(msg.session_id)
        plan = await workflows.build_course_plan(
            session_id=msg.session_id,
            course_id=session.course_id or "",
            course_title=msg.course_title,
            required_topics=msg.required_topics,
            learning_outcomes=msg.learning_outcomes,
            interest_domain=msg.interest_domain,
            interest_keywords=msg.interest_keywords,
            domain_summary=msg.domain_summary,
            topic_resources=msg.topic_resources,
        )
        state_store.update_session(msg.session_id, plan=plan, plan_status=PlanStatus.generating)
        await ctx.send(
            sender,
            CoursePlanReply(session_id=msg.session_id, plan=plan.model_dump()),
        )
    except Exception as exc:
        logger.error("Course plan agent error: %s", exc)
