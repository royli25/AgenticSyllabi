from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from backend.models.schemas import CoursePlan, PlanStatus, PlanStatusResponse, Topic, TopicContent, Reading, ProjectBrief
from backend.services import state_store
from backend.services.claude_service import chat_completion_json
import asyncio
import uuid
import logging

router = APIRouter(prefix="/api/plan", tags=["plan"])
logger = logging.getLogger(__name__)

PLAN_SYSTEM = """You are a curriculum designer. Given a course and a student's interest domain,
map each required topic to how it can be taught through that interest lens.

Respond with JSON:
{
  "topics": [
    {
      "title": "topic title",
      "interest_angle": "1-2 sentences: how to teach this topic through the interest domain",
      "learning_outcomes": ["outcome 1", "outcome 2"]
    }
  ]
}"""

CONTENT_SYSTEM = """You are an expert educator. Teach a course topic entirely through examples from the student's interest domain.

Respond with JSON:
{
  "explainer": "## Topic Title\\n\\n400-600 word markdown explainer using interest-domain examples throughout",
  "readings": [
    {"title": "Descriptive title of a real resource", "url": "https://...", "summary": "1-2 sentence description of what this resource covers"},
    {"title": "...", "url": "https://...", "summary": "..."},
    {"title": "...", "url": "https://...", "summary": "..."}
  ],
  "project": {
    "title": "hands-on project title",
    "description": "2-3 sentences describing what they build",
    "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3"],
    "estimated_hours": 2
  }
}

For readings, suggest 3 real, specific, well-known resources (Wikipedia articles, official docs, textbook chapters, reputable blog posts) relevant to both the topic and the interest domain."""


class GenerateRequest(BaseModel):
    course_id: str


async def run_pipeline(session_id: str):
    from backend.models.schemas import PlanStatus
    try:
        session = state_store.get_session(session_id)
        if not session:
            return

        # Phase 1: Build plan skeleton
        state_store.update_session(session_id, plan_status=PlanStatus.planning)
        prompt = f"""Course: {session.course_title}
Student interest: {session.interest_domain}
Keywords: {", ".join(session.interest_keywords)}

Required topics:
{chr(10).join(f"- {t}" for t in session.required_topics)}"""

        result = await chat_completion_json(
            messages=[{"role": "user", "content": prompt}],
            system=PLAN_SYSTEM,
            max_tokens=4096,
        )

        topics = []
        for i, t in enumerate(result.get("topics", [])):
            topic_id = f"topic_{i+1:03d}"
            orig = session.required_topics[i] if i < len(session.required_topics) else t.get("title", "")
            topics.append(Topic(
                topic_id=topic_id,
                title=t.get("title", orig),
                original_syllabus_topic=orig,
                learning_outcomes=t.get("learning_outcomes", []),
                interest_angle=t.get("interest_angle", ""),
                status="pending",
            ))

        domain_context = f"A personalized {session.course_title} course through the lens of {session.interest_domain}."
        plan = CoursePlan(
            plan_id=f"plan_{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            course_id=session.course_id or "",
            course_title=session.course_title or "Course",
            student_interest=session.interest_domain or "",
            interest_keywords=session.interest_keywords,
            domain_context=domain_context,
            topics=topics,
        )
        state_store.update_session(session_id, plan=plan, plan_status=PlanStatus.generating)

        # Phase 2: Generate content for each topic in parallel
        async def generate_topic_content(topic: Topic):
            content_prompt = f"""Topic: {topic.title}
Interest domain: {session.interest_domain}
Angle: {topic.interest_angle}
Learning outcomes: {", ".join(topic.learning_outcomes)}"""

            content_result = await chat_completion_json(
                messages=[{"role": "user", "content": content_prompt}],
                system=CONTENT_SYSTEM,
                max_tokens=3000,
            )
            proj = content_result.get("project", {})
            return topic.topic_id, TopicContent(
                explainer=content_result.get("explainer", ""),
                readings=[
                    Reading(
                        reading_id=f"r_{uuid.uuid4().hex[:6]}",
                        title=r["title"],
                        url=r["url"],
                        summary=r.get("summary", "")[:200],
                    )
                    for r in content_result.get("readings", [])[:5]
                ],
                project=ProjectBrief(
                    title=proj.get("title", ""),
                    description=proj.get("description", ""),
                    deliverables=proj.get("deliverables", []),
                    estimated_hours=proj.get("estimated_hours", 2),
                ),
            )

        content_tasks = [generate_topic_content(t) for t in topics]
        contents = await asyncio.gather(*content_tasks, return_exceptions=True)

        updated_topics = list(topics)
        for result_item in contents:
            if isinstance(result_item, Exception):
                logger.error(f"Content error: {result_item}")
                continue
            topic_id, content = result_item
            updated_topics = [
                t.model_copy(update={"content": content, "status": "complete"})
                if t.topic_id == topic_id else t
                for t in updated_topics
            ]

        final_plan = plan.model_copy(update={"topics": updated_topics})
        state_store.update_session(session_id, plan=final_plan, plan_status=PlanStatus.complete)
        logger.info(f"Plan complete for session {session_id}")

    except Exception as e:
        logger.error(f"Pipeline error for {session_id}: {e}")
        state_store.update_session(session_id, plan_status=PlanStatus.error)


@router.post("/{session_id}/generate")
async def generate_plan(session_id: str, body: GenerateRequest, background_tasks: BackgroundTasks):
    session = state_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if not session.interest_confirmed:
        raise HTTPException(400, "Interest not confirmed yet")

    state_store.update_session(session_id, course_id=body.course_id, plan_status=PlanStatus.pending)
    background_tasks.add_task(run_pipeline, session_id)
    return {"status": "generating", "session_id": session_id}


@router.get("/{session_id}/status", response_model=PlanStatusResponse)
async def get_status(session_id: str):
    session = state_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return PlanStatusResponse(status=session.plan_status, session_id=session_id)


@router.get("/{session_id}", response_model=CoursePlan)
async def get_plan(session_id: str):
    session = state_store.get_session(session_id)
    if not session or not session.plan:
        raise HTTPException(404, "Plan not found")
    return session.plan


@router.get("/{session_id}/topic/{topic_id}", response_model=TopicContent)
async def get_topic_content(session_id: str, topic_id: str):
    session = state_store.get_session(session_id)
    if not session or not session.plan:
        raise HTTPException(404, "Plan not found")
    topic = next((t for t in session.plan.topics if t.topic_id == topic_id), None)
    if not topic:
        raise HTTPException(404, "Topic not found")
    if not topic.content:
        raise HTTPException(202, "Content still generating")
    return topic.content
