from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class PlanStatus(str, Enum):
    pending = "pending"
    researching = "researching"
    planning = "planning"
    generating = "generating"
    complete = "complete"
    error = "error"


class Reading(BaseModel):
    reading_id: str
    title: str
    url: str
    summary: str


class ProjectBrief(BaseModel):
    title: str
    description: str
    deliverables: list[str] = Field(default_factory=list)
    estimated_hours: int


class TopicContent(BaseModel):
    explainer: str
    readings: list[Reading]
    project: ProjectBrief


class Topic(BaseModel):
    topic_id: str
    title: str
    original_syllabus_topic: str
    learning_outcomes: list[str]
    interest_angle: str
    status: str = "pending"
    content: Optional[TopicContent] = None


class CoursePlan(BaseModel):
    plan_id: str
    session_id: str
    course_id: str
    course_title: str
    student_interest: str
    interest_keywords: list[str]
    domain_context: str
    topics: list[Topic]


class SessionState(BaseModel):
    session_id: str
    course_id: Optional[str] = None
    course_title: Optional[str] = None
    # Original file from professor upload (served to students for preview)
    syllabus_bytes: Optional[bytes] = None
    syllabus_mime: Optional[str] = None
    required_topics: list[str] = Field(default_factory=list)
    learning_outcomes: list[str] = Field(default_factory=list)
    interest_domain: Optional[str] = None
    interest_keywords: list[str] = Field(default_factory=list)
    interest_confirmed: bool = False
    chat_history: list[dict] = Field(default_factory=list)
    domain_summary: Optional[str] = None
    topic_resources: dict[str, list[dict[str, str]]] = Field(default_factory=dict)
    plan_status: PlanStatus = PlanStatus.pending
    plan: Optional[CoursePlan] = None


class UploadSyllabusResponse(BaseModel):
    course_id: str
    session_id: str
    course_title: str
    required_topics: list[str]


class SessionSummaryResponse(BaseModel):
    course_id: str
    session_id: str
    course_title: str
    required_topics: list[str]
    interest_confirmed: bool = False
    interest_domain: Optional[str] = None
    has_syllabus: bool = False


class ChatResponse(BaseModel):
    reply: str
    interest_confirmed: bool
    interest_domain: Optional[str] = None


class GeneratePlanResponse(BaseModel):
    status: str
    session_id: str


class PlanStatusResponse(BaseModel):
    status: PlanStatus
    session_id: str
