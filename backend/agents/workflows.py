from __future__ import annotations

import asyncio
import logging
import uuid

from backend.models.messages import AgentChatReply, ParsedSyllabusMessage, ResearchResults
from backend.models.schemas import (
    CoursePlan,
    PlanStatus,
    ProjectBrief,
    Reading,
    Topic,
    TopicContent,
)
from backend.services import state_store, tavily_service
from backend.services.claude_service import chat_completion, chat_completion_json

logger = logging.getLogger(__name__)

SYLLABUS_SYSTEM = """You are an expert at parsing university course syllabi.
Extract the course title, required topics, and learning outcomes.

Return JSON with this exact structure:
{
  "course_title": "string",
  "required_topics": ["topic1", "topic2"],
  "learning_outcomes": ["outcome1", "outcome2"]
}

Guidelines:
- Keep required_topics concise, concrete, and 3-8 words each.
- Extract 5-15 required topics and keep them distinct.
- Rewrite noisy syllabus headings into clean teaching topics when helpful.
- Learning outcomes should be action-oriented and student-facing."""

INTEREST_SYSTEM = """You are a friendly academic advisor helping a student personalize their course.
Your goal is to understand the topic or domain they are genuinely excited about.

Ask short, conversational questions. Usually confirm an interest after 2-3 exchanges, but only when you have enough signal.

Always respond with JSON:
{
  "reply": "your conversational response to the student",
  "interest_confirmed": false,
  "interest_domain": null,
  "interest_keywords": []
}

When you confirm an interest:
- Set interest_confirmed to true
- Set interest_domain to a 2-4 word domain label
- Return 5-8 concrete interest_keywords that would help personalize lessons"""

RESEARCH_SUMMARY_SYSTEM = """You are a research assistant.
Given web search snippets about a domain, write a concise 3-5 sentence summary covering:
- what the domain is
- key concepts and workflows
- why it is engaging for learners

Be concrete and avoid hype."""

PLAN_SYSTEM = """You are a curriculum designer specializing in personalized learning.
Given a course's required topics, course learning outcomes, and a student's interest domain, create a personalized course plan.

Return JSON with this exact structure:
{
  "topics": [
    {
      "title": "topic title",
      "interest_angle": "1-2 sentences describing how to teach this topic through the interest domain",
      "learning_outcomes": ["outcome 1", "outcome 2"]
    }
  ]
}

Rules:
- Return exactly one topic for each required topic provided.
- Preserve the original topic order.
- Keep titles close to the original syllabus topics unless a small rewrite improves clarity.
- Learning outcomes should be concise, observable, and specific to the topic."""

CONTENT_SYSTEM = """You are an expert educator who makes complex topics accessible through real-world examples.
Given a course topic and a student's interest domain, generate:
1. A detailed markdown explainer that teaches the topic through examples from their interest domain
2. A hands-on project brief

Return JSON with this exact structure:
{
  "explainer": "## Topic Title\\n\\nMarkdown content here...",
  "project": {
    "title": "project title",
    "description": "2-3 sentence description",
    "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3"],
    "estimated_hours": 2
  }
}

Rules:
- The explainer should be 400-600 words.
- Use the interest domain as the main teaching lens throughout.
- Use the supplied readings as factual anchors when relevant.
- Do not invent citations, quotes, or resource titles."""


def _clean_text(value: object, fallback: str = "") -> str:
    if not isinstance(value, str):
        return fallback
    text = " ".join(value.split())
    return text or fallback


def _clean_markdown(value: object, fallback: str = "") -> str:
    if not isinstance(value, str):
        return fallback
    text = value.replace("\r\n", "\n").strip()
    return text or fallback


def _as_dict(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def _clean_list(value: object, *, max_items: int | None = None) -> list[str]:
    if isinstance(value, list):
        source = value
    elif isinstance(value, str) and value.strip():
        source = [value]
    else:
        source = []

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in source:
        text = _clean_text(item)
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text)
        if max_items is not None and len(cleaned) >= max_items:
            break

    return cleaned


def _normalize_readings(resources: list[dict[str, str]], *, max_items: int = 5) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for resource in resources:
        title = _clean_text(resource.get("title"))
        url = _clean_text(resource.get("url"))
        summary = _clean_text(resource.get("summary") or resource.get("content"))

        if not title or not url or url in seen_urls:
            continue

        seen_urls.add(url)
        normalized.append(
            {
                "title": title,
                "url": url,
                "summary": summary[:240],
            }
        )
        if len(normalized) >= max_items:
            break

    return normalized


def _default_keywords(interest_domain: str) -> list[str]:
    return [part for part in interest_domain.replace("/", " ").split() if part][:5]


def _coerce_hours(value: object, default: int = 2) -> int:
    try:
        return max(1, int(value or default))
    except (TypeError, ValueError):
        return default


def _default_learning_outcomes(topic_title: str, interest_domain: str) -> list[str]:
    return [
        f"Explain the core ideas behind {topic_title}.",
        f"Apply {topic_title} using examples from {interest_domain}.",
    ]


def _default_interest_angle(topic_title: str, interest_domain: str) -> str:
    return (
        f"Teach {topic_title} through case studies, examples, and decisions drawn from "
        f"{interest_domain}."
    )


def _build_reading_models(resources: list[dict[str, str]]) -> list[Reading]:
    return [
        Reading(
            reading_id=f"r_{uuid.uuid4().hex[:6]}",
            title=resource["title"],
            url=resource["url"],
            summary=resource.get("summary", "")[:200],
        )
        for resource in _normalize_readings(resources, max_items=5)
    ]


def _fallback_topic_content(
    topic: Topic,
    interest_domain: str,
    readings: list[dict[str, str]],
) -> TopicContent:
    reading_models = _build_reading_models(readings)
    learning_outcomes = topic.learning_outcomes or _default_learning_outcomes(
        topic.title,
        interest_domain,
    )
    bullets = "\n".join(f"- {outcome}" for outcome in learning_outcomes)
    reading_lines = "\n".join(f"- [{r.title}]({r.url}): {r.summary}" for r in reading_models)
    reading_section = reading_lines or "- No external readings were retrieved for this topic."
    interest_angle = topic.interest_angle or _default_interest_angle(topic.title, interest_domain)
    explainer = f"""## {topic.title}

{interest_angle}

### What to focus on
{bullets}

### How this connects to {interest_domain}
Use concrete examples from {interest_domain} to anchor the abstract ideas in {topic.title}. Start with a familiar real-world scenario, map the core concept to that scenario, and then ask the student to generalize the pattern back into course language.

### Suggested readings
{reading_section}
"""

    project = ProjectBrief(
        title=f"{topic.title} in {interest_domain}",
        description=(
            f"Create a short artifact that demonstrates {topic.title} through a realistic "
            f"{interest_domain} example."
        ),
        deliverables=[
            f"A worked example applying {topic.title}",
            "A short explanation of the design choices",
            "A reflection on what transfers back to the course concept",
        ],
        estimated_hours=2,
    )
    return TopicContent(explainer=explainer, readings=reading_models, project=project)


async def parse_syllabus_text(session_id: str, raw_text: str) -> ParsedSyllabusMessage:
    result = await chat_completion_json(
        messages=[{"role": "user", "content": f"Parse this syllabus:\n\n{raw_text[:12000]}"}],
        system=SYLLABUS_SYSTEM,
    )

    required_topics = _clean_list(result.get("required_topics"), max_items=15)
    learning_outcomes = _clean_list(result.get("learning_outcomes"), max_items=10)
    course_title = _clean_text(result.get("course_title"), "Course")

    if not required_topics:
        required_topics = ["Course foundations"]

    reply = ParsedSyllabusMessage(
        session_id=session_id,
        course_title=course_title,
        required_topics=required_topics,
        learning_outcomes=learning_outcomes,
    )

    state_store.update_session(
        session_id,
        course_title=reply.course_title,
        required_topics=reply.required_topics,
        learning_outcomes=reply.learning_outcomes,
    )
    return reply


async def infer_interest(
    session_id: str,
    student_message: str,
    history: list[dict],
) -> AgentChatReply:
    messages = history + [{"role": "user", "content": student_message}]
    result = await chat_completion_json(messages=messages, system=INTEREST_SYSTEM)

    reply_text = _clean_text(
        result.get("reply"),
        "Tell me a bit more about what you enjoy outside class so I can personalize this well.",
    )
    interest_domain = _clean_text(result.get("interest_domain")) or None
    interest_keywords = _clean_list(result.get("interest_keywords"), max_items=8)
    interest_confirmed = bool(result.get("interest_confirmed")) and bool(interest_domain)

    if interest_confirmed and not interest_keywords and interest_domain:
        interest_keywords = _default_keywords(interest_domain)

    reply = AgentChatReply(
        session_id=session_id,
        reply=reply_text,
        interest_confirmed=interest_confirmed,
        interest_domain=interest_domain,
        interest_keywords=interest_keywords,
    )

    update_kwargs = {
        "chat_history": messages + [{"role": "assistant", "content": reply.reply}],
    }
    if reply.interest_confirmed:
        update_kwargs.update(
            interest_confirmed=True,
            interest_domain=reply.interest_domain,
            interest_keywords=reply.interest_keywords,
        )
    state_store.update_session(session_id, **update_kwargs)
    return reply


async def _search_topic_resources(
    topic: str,
    interest_domain: str,
    interest_keywords: list[str],
    *,
    max_results: int = 3,
) -> list[dict[str, str]]:
    queries = [f"{interest_domain} {topic}"]
    if interest_keywords:
        queries.append(f"{topic} {' '.join(interest_keywords[:2])}")
    queries.append(topic)

    collected: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for query in queries:
        for resource in _normalize_readings(await tavily_service.search(query, max_results=max_results)):
            if resource["url"] in seen_urls:
                continue
            seen_urls.add(resource["url"])
            collected.append(resource)
            if len(collected) >= max_results:
                return collected

    return collected


async def research_interest(
    session_id: str,
    interest_domain: str,
    interest_keywords: list[str],
    required_topics: list[str],
) -> ResearchResults:
    cleaned_domain = _clean_text(interest_domain, "student interest")
    cleaned_keywords = _clean_list(interest_keywords, max_items=8) or _default_keywords(cleaned_domain)
    cleaned_topics = _clean_list(required_topics, max_items=15)

    resource_lists = await asyncio.gather(
        *[
            _search_topic_resources(topic, cleaned_domain, cleaned_keywords)
            for topic in cleaned_topics
        ]
    )
    topic_resources = {topic: resources for topic, resources in zip(cleaned_topics, resource_lists)}

    broad_query_parts = [cleaned_domain, *cleaned_keywords[:3]]
    broad_query = " ".join(part for part in broad_query_parts if part).strip() or cleaned_domain
    broad_results = await tavily_service.search(broad_query, max_results=5)
    snippets = "\n".join(
        f"- {item['title']}: {item.get('content', '')[:280]}"
        for item in broad_results
        if item.get("title")
    )

    if snippets:
        domain_summary = await chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": f"Domain: {cleaned_domain}\n\nWeb snippets:\n{snippets}",
                }
            ],
            system=RESEARCH_SUMMARY_SYSTEM,
        )
        domain_summary = _clean_markdown(domain_summary)
    else:
        domain_summary = (
            f"{cleaned_domain} gives the student a concrete lens for learning because it ties "
            f"abstract course ideas to a domain they already care about."
        )

    reply = ResearchResults(
        session_id=session_id,
        interest_domain=cleaned_domain,
        domain_summary=domain_summary,
        topic_resources=topic_resources,
    )

    state_store.update_session(
        session_id,
        domain_summary=reply.domain_summary,
        topic_resources=reply.topic_resources,
    )
    return reply


async def build_course_plan(
    session_id: str,
    course_id: str,
    course_title: str,
    required_topics: list[str],
    learning_outcomes: list[str],
    interest_domain: str,
    interest_keywords: list[str],
    domain_summary: str,
    topic_resources: dict[str, list[dict[str, str]]],
) -> CoursePlan:
    cleaned_topics = _clean_list(required_topics, max_items=15)
    cleaned_outcomes = _clean_list(learning_outcomes, max_items=10)
    cleaned_keywords = _clean_list(interest_keywords, max_items=8) or _default_keywords(interest_domain)

    topic_resource_lines = []
    for topic in cleaned_topics:
        titles = ", ".join(resource["title"] for resource in topic_resources.get(topic, [])[:2]) or "No research hits"
        topic_resource_lines.append(f"- {topic}: {titles}")

    prompt = f"""Course: {course_title}
Student interest: {interest_domain}
Interest keywords: {", ".join(cleaned_keywords)}

Course learning outcomes:
{chr(10).join(f"- {outcome}" for outcome in cleaned_outcomes) or "- No explicit course-level outcomes provided"}

Domain research summary:
{domain_summary}

Required topics (cover every topic in this exact order):
{chr(10).join(f"- {topic}" for topic in cleaned_topics)}

Helpful resources by topic:
{chr(10).join(topic_resource_lines)}
"""

    result = await chat_completion_json(
        messages=[{"role": "user", "content": prompt}],
        system=PLAN_SYSTEM,
        max_tokens=4096,
    )

    raw_topics = result.get("topics", [])
    if not isinstance(raw_topics, list):
        raw_topics = []
    topics: list[Topic] = []
    for index, required_topic in enumerate(cleaned_topics):
        raw_topic = _as_dict(raw_topics[index]) if index < len(raw_topics) else {}
        topic_title = _clean_text(raw_topic.get("title"), required_topic)
        topic_outcomes = _clean_list(raw_topic.get("learning_outcomes"), max_items=3)
        if not topic_outcomes:
            topic_outcomes = _default_learning_outcomes(required_topic, interest_domain)

        topics.append(
            Topic(
                topic_id=f"topic_{index + 1:03d}",
                title=topic_title,
                original_syllabus_topic=required_topic,
                learning_outcomes=topic_outcomes,
                interest_angle=_clean_text(
                    raw_topic.get("interest_angle"),
                    _default_interest_angle(required_topic, interest_domain),
                ),
                status="pending",
            )
        )

    if not topics:
        topics.append(
            Topic(
                topic_id="topic_001",
                title="Course foundations",
                original_syllabus_topic="Course foundations",
                learning_outcomes=_default_learning_outcomes("Course foundations", interest_domain),
                interest_angle=_default_interest_angle("Course foundations", interest_domain),
                status="pending",
            )
        )

    return CoursePlan(
        plan_id=f"plan_{uuid.uuid4().hex[:8]}",
        session_id=session_id,
        course_id=course_id,
        course_title=course_title or "Course",
        student_interest=interest_domain,
        interest_keywords=cleaned_keywords,
        domain_context=domain_summary,
        topics=topics,
    )


async def generate_topic_content(
    topic: Topic,
    interest_domain: str,
    domain_summary: str,
    readings: list[dict[str, str]],
) -> TopicContent:
    normalized_readings = _normalize_readings(readings, max_items=5)
    readings_text = "\n".join(
        f"- {reading['title']} ({reading['url']}): {reading['summary']}"
        for reading in normalized_readings
    ) or "- No external readings were retrieved for this topic."

    prompt = f"""Topic: {topic.title}
Original syllabus topic: {topic.original_syllabus_topic}
Interest domain: {interest_domain}
Angle: {topic.interest_angle}
Learning outcomes: {", ".join(topic.learning_outcomes)}

Domain context:
{domain_summary}

Available readings:
{readings_text}
"""

    result = await chat_completion_json(
        messages=[{"role": "user", "content": prompt}],
        system=CONTENT_SYSTEM,
        max_tokens=3000,
    )

    explainer = _clean_markdown(result.get("explainer"))
    if not explainer:
        return _fallback_topic_content(topic, interest_domain, normalized_readings)

    project_data = _as_dict(result.get("project"))
    project = ProjectBrief(
        title=_clean_text(project_data.get("title"), f"{topic.title} in practice"),
        description=_clean_text(
            project_data.get("description"),
            f"Apply {topic.title} through a realistic {interest_domain} example.",
        ),
        deliverables=_clean_list(project_data.get("deliverables"), max_items=5)
        or [
            "A short written explanation",
            "A worked example or artifact",
            "A brief reflection on what was learned",
        ],
        estimated_hours=_coerce_hours(project_data.get("estimated_hours"), default=2),
    )

    return TopicContent(
        explainer=explainer,
        readings=_build_reading_models(normalized_readings),
        project=project,
    )


async def run_plan_pipeline(session_id: str) -> CoursePlan:
    session = state_store.require_session(session_id)
    if not session.interest_confirmed or not session.interest_domain:
        raise ValueError(f"Session {session_id} does not have a confirmed interest")

    try:
        state_store.update_session(session_id, plan_status=PlanStatus.researching)
        research = await research_interest(
            session_id=session_id,
            interest_domain=session.interest_domain,
            interest_keywords=session.interest_keywords,
            required_topics=session.required_topics,
        )

        session = state_store.require_session(session_id)
        state_store.update_session(session_id, plan_status=PlanStatus.planning)
        plan = await build_course_plan(
            session_id=session_id,
            course_id=session.course_id or "",
            course_title=session.course_title or "Course",
            required_topics=session.required_topics,
            learning_outcomes=session.learning_outcomes,
            interest_domain=session.interest_domain or research.interest_domain,
            interest_keywords=session.interest_keywords,
            domain_summary=research.domain_summary,
            topic_resources=research.topic_resources,
        )

        state_store.update_session(session_id, plan=plan, plan_status=PlanStatus.generating)

        updated_topics = list(plan.topics)
        semaphore = asyncio.Semaphore(3)

        async def _generate_for_topic(topic: Topic) -> tuple[str, TopicContent]:
            async with semaphore:
                readings = research.topic_resources.get(
                    topic.original_syllabus_topic,
                    research.topic_resources.get(topic.title, []),
                )
                try:
                    content = await generate_topic_content(
                        topic=topic,
                        interest_domain=plan.student_interest,
                        domain_summary=plan.domain_context,
                        readings=readings,
                    )
                except Exception as exc:
                    logger.warning("Falling back for topic %s: %s", topic.topic_id, exc)
                    content = _fallback_topic_content(topic, plan.student_interest, readings)

                return topic.topic_id, content

        tasks = [asyncio.create_task(_generate_for_topic(topic)) for topic in plan.topics]
        for task in asyncio.as_completed(tasks):
            topic_id, content = await task
            updated_topics = [
                topic.model_copy(update={"content": content, "status": "complete"})
                if topic.topic_id == topic_id
                else topic
                for topic in updated_topics
            ]
            state_store.update_session(
                session_id,
                plan=plan.model_copy(update={"topics": updated_topics}),
            )

        final_plan = plan.model_copy(update={"topics": updated_topics})
        state_store.update_session(session_id, plan=final_plan, plan_status=PlanStatus.complete)
        return final_plan

    except Exception:
        logger.exception("Pipeline error for session %s", session_id)
        state_store.update_session(session_id, plan_status=PlanStatus.error)
        raise
