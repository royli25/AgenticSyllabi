import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from backend.agents import workflows
from backend.models.messages import ResearchResults
from backend.models.schemas import CoursePlan, PlanStatus, ProjectBrief, Topic, TopicContent
from backend.services import state_store


class WorkflowTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        state_store.reset_store()

    async def test_parse_syllabus_text_updates_session(self):
        state_store.create_session("sess_parse")

        with patch(
            "backend.agents.workflows.chat_completion_json",
            new=AsyncMock(
                return_value={
                    "course_title": "Applied Statistics",
                    "required_topics": ["Probability", "Regression Models"],
                    "learning_outcomes": ["Interpret uncertainty", "Build predictive models"],
                }
            ),
        ):
            parsed = await workflows.parse_syllabus_text("sess_parse", "sample syllabus text")

        session = state_store.require_session("sess_parse")
        self.assertEqual(parsed.course_title, "Applied Statistics")
        self.assertEqual(session.required_topics, ["Probability", "Regression Models"])
        self.assertEqual(session.learning_outcomes, ["Interpret uncertainty", "Build predictive models"])

    async def test_infer_interest_updates_session_and_history(self):
        state_store.create_session("sess_chat")

        with patch(
            "backend.agents.workflows.chat_completion_json",
            new=AsyncMock(
                return_value={
                    "reply": "Sports analytics sounds like a strong direction.",
                    "interest_confirmed": True,
                    "interest_domain": "sports analytics",
                    "interest_keywords": ["player tracking", "win probability", "lineups"],
                }
            ),
        ):
            reply = await workflows.infer_interest(
                session_id="sess_chat",
                student_message="I love breaking down basketball data.",
                history=[],
            )

        session = state_store.require_session("sess_chat")
        self.assertTrue(reply.interest_confirmed)
        self.assertEqual(session.interest_domain, "sports analytics")
        self.assertEqual(session.chat_history[-1]["role"], "assistant")
        self.assertIn("Sports analytics", session.chat_history[-1]["content"])

    async def test_generate_topic_content_uses_fallback_when_model_returns_empty(self):
        topic = Topic(
            topic_id="topic_001",
            title="Probability",
            original_syllabus_topic="Probability",
            learning_outcomes=["Explain probability rules"],
            interest_angle="Use game outcomes and odds as the teaching lens.",
            status="pending",
        )
        readings = [
            {
                "title": "Expected value",
                "url": "https://example.com/expected-value",
                "summary": "An introduction to expected value.",
            }
        ]

        with patch(
            "backend.agents.workflows.chat_completion_json",
            new=AsyncMock(return_value={"explainer": "", "project": {}}),
        ):
            content = await workflows.generate_topic_content(
                topic=topic,
                interest_domain="sports betting",
                domain_summary="A domain built around pricing uncertainty and decision-making.",
                readings=readings,
            )

        self.assertIn("## Probability", content.explainer)
        self.assertEqual(len(content.readings), 1)
        self.assertEqual(content.project.estimated_hours, 2)

    async def test_run_plan_pipeline_marks_topics_complete(self):
        session_id = "sess_pipeline"
        state_store.create_session(session_id)
        state_store.update_session(
            session_id,
            course_id="course_123",
            course_title="Applied Statistics",
            required_topics=["Probability", "Regression"],
            learning_outcomes=["Interpret uncertainty", "Fit predictive models"],
            interest_confirmed=True,
            interest_domain="basketball analytics",
            interest_keywords=["lineups", "shot charts"],
        )

        research = ResearchResults(
            session_id=session_id,
            interest_domain="basketball analytics",
            domain_summary="Basketball analytics studies player and team performance through data.",
            topic_resources={
                "Probability": [{"title": "Expected value", "url": "https://example.com/ev", "summary": "EV primer"}],
                "Regression": [{"title": "Regression basics", "url": "https://example.com/reg", "summary": "Regression primer"}],
            },
        )
        plan = CoursePlan(
            plan_id="plan_123",
            session_id=session_id,
            course_id="course_123",
            course_title="Applied Statistics",
            student_interest="basketball analytics",
            interest_keywords=["lineups", "shot charts"],
            domain_context=research.domain_summary,
            topics=[
                Topic(
                    topic_id="topic_001",
                    title="Probability",
                    original_syllabus_topic="Probability",
                    learning_outcomes=["Explain probability rules"],
                    interest_angle="Teach probability through possession outcomes.",
                    status="pending",
                ),
                Topic(
                    topic_id="topic_002",
                    title="Regression",
                    original_syllabus_topic="Regression",
                    learning_outcomes=["Fit and interpret regressions"],
                    interest_angle="Teach regression through lineup data.",
                    status="pending",
                ),
            ],
        )

        async def fake_generate(topic: Topic, interest_domain: str, domain_summary: str, readings: list[dict[str, str]]):
            return TopicContent(
                explainer=f"## {topic.title}\n\nGrounded in {interest_domain}.",
                readings=[],
                project=ProjectBrief(
                    title=f"{topic.title} project",
                    description=domain_summary,
                    deliverables=["artifact"],
                    estimated_hours=3,
                ),
            )

        with patch(
            "backend.agents.workflows.research_interest",
            new=AsyncMock(return_value=research),
        ), patch(
            "backend.agents.workflows.build_course_plan",
            new=AsyncMock(return_value=plan),
        ), patch(
            "backend.agents.workflows.generate_topic_content",
            new=AsyncMock(side_effect=fake_generate),
        ) as generate_mock:
            final_plan = await workflows.run_plan_pipeline(session_id)

        session = state_store.require_session(session_id)
        self.assertEqual(session.plan_status, PlanStatus.complete)
        self.assertEqual(generate_mock.await_count, 2)
        self.assertTrue(all(topic.status == "complete" for topic in final_plan.topics))
        self.assertTrue(all(topic.content is not None for topic in session.plan.topics))


if __name__ == "__main__":
    unittest.main()
