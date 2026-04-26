import logging

from uagents import Agent, Context

from backend.agents import workflows
from backend.models.messages import TopicContentReply, TopicContentRequest
from backend.models.schemas import Topic
from backend.services import state_store

logger = logging.getLogger(__name__)

content_generator = Agent(
    name="content_generator",
    port=8014,
    endpoint=["http://localhost:8014/submit"],
)


@content_generator.on_message(model=TopicContentRequest)
async def handle_content(ctx: Context, sender: str, msg: TopicContentRequest):
    logger.info("Generating content for topic %s session %s", msg.topic_id, msg.session_id)
    try:
        session = state_store.require_session(msg.session_id)
        topic = next(
            (item for item in session.plan.topics if item.topic_id == msg.topic_id),
            None,
        ) if session.plan is not None else None
        if topic is None:
            topic = Topic(
                topic_id=msg.topic_id,
                title=msg.topic_title,
                original_syllabus_topic=msg.topic_title,
                learning_outcomes=msg.learning_outcomes,
                interest_angle=msg.interest_angle,
                status="pending",
            )

        content = await workflows.generate_topic_content(
            topic=topic,
            interest_domain=msg.interest_domain,
            domain_summary=session.domain_summary or session.course_title or "",
            readings=msg.readings,
        )
        if session.plan is not None and any(item.topic_id == msg.topic_id for item in session.plan.topics):
            state_store.update_topic(
                msg.session_id,
                msg.topic_id,
                content=content,
                status="complete",
            )
        await ctx.send(
            sender,
            TopicContentReply(
                session_id=msg.session_id,
                topic_id=msg.topic_id,
                content=content.model_dump(),
            ),
        )
    except Exception as exc:
        logger.error("Content generator error for %s: %s", msg.topic_id, exc)
