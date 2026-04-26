from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.agents import workflows
from backend.models.schemas import CoursePlan, PlanStatus, PlanStatusResponse, TopicContent
from backend.services import state_store

router = APIRouter(prefix="/api/plan", tags=["plan"])


class GenerateRequest(BaseModel):
    course_id: str


@router.post("/{session_id}/generate")
async def generate_plan(session_id: str, body: GenerateRequest, background_tasks: BackgroundTasks):
    session = state_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if not session.interest_confirmed or not session.interest_domain:
        raise HTTPException(400, "Interest not confirmed yet")

    state_store.update_session(session_id, course_id=body.course_id, plan_status=PlanStatus.pending)
    background_tasks.add_task(workflows.run_plan_pipeline, session_id)
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

    topic = next((item for item in session.plan.topics if item.topic_id == topic_id), None)
    if not topic:
        raise HTTPException(404, "Topic not found")
    if not topic.content:
        raise HTTPException(202, "Content still generating")
    return topic.content
