from uagents import Model
from typing import Optional


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
    interest_keywords: list[str] = []


class ResearchRequest(Model):
    session_id: str
    interest_domain: str
    interest_keywords: list[str]
    required_topics: list[str]


class ResearchResults(Model):
    session_id: str
    interest_domain: str
    domain_summary: str
    topic_resources: dict  # topic -> list of {title, url, summary}


class CoursePlanRequest(Model):
    session_id: str
    course_title: str
    required_topics: list[str]
    learning_outcomes: list[str]
    interest_domain: str
    interest_keywords: list[str]
    domain_summary: str
    topic_resources: dict


class TopicContentRequest(Model):
    session_id: str
    topic_id: str
    topic_title: str
    interest_domain: str
    interest_angle: str
    learning_outcomes: list[str]
    readings: list[dict]
