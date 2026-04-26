from typing import Optional

from pydantic import BaseModel, Field

try:
    from uagents import Model
except ImportError:  # pragma: no cover - used in lightweight test environments
    Model = BaseModel


class SyllabusParseRequest(Model):
    session_id: str
    raw_text: str


class ParsedSyllabusMessage(Model):
    session_id: str
    course_title: str
    required_topics: list[str]
    learning_outcomes: list[str]


class StudentChatMessage(Model):
    session_id: str
    student_message: str
    history: list[dict]


class AgentChatReply(Model):
    session_id: str
    reply: str
    interest_confirmed: bool
    interest_domain: Optional[str] = None
    interest_keywords: list[str] = Field(default_factory=list)


class ResearchRequest(Model):
    session_id: str
    interest_domain: str
    interest_keywords: list[str]
    required_topics: list[str]


class ResearchResults(Model):
    session_id: str
    interest_domain: str
    domain_summary: str
    topic_resources: dict[str, list[dict[str, str]]]


class CoursePlanRequest(Model):
    session_id: str
    course_title: str
    required_topics: list[str]
    learning_outcomes: list[str]
    interest_domain: str
    interest_keywords: list[str]
    domain_summary: str
    topic_resources: dict[str, list[dict[str, str]]]


class TopicContentRequest(Model):
    session_id: str
    topic_id: str
    topic_title: str
    interest_domain: str
    interest_angle: str
    learning_outcomes: list[str]
    readings: list[dict[str, str]]


class CoursePlanReply(Model):
    session_id: str
    plan: dict


class TopicContentReply(Model):
    session_id: str
    topic_id: str
    content: dict
