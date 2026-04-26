import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from fastapi.testclient import TestClient

from backend.main import app
from backend.models.messages import AgentChatReply, ParsedSyllabusMessage
from backend.services import state_store


class ApiRouteTests(unittest.TestCase):
    def setUp(self):
        state_store.reset_store()
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()

    def test_get_session_summary_returns_session_metadata(self):
        state_store.create_session("sess_abc123")
        state_store.update_session(
            "sess_abc123",
            course_id="course_abc123",
            course_title="Linear Algebra",
            required_topics=["Vectors", "Matrices"],
            interest_confirmed=True,
            interest_domain="music production",
        )

        response = self.client.get("/api/courses/session/sess_abc123")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "course_id": "course_abc123",
                "session_id": "sess_abc123",
                "course_title": "Linear Algebra",
                "required_topics": ["Vectors", "Matrices"],
                "interest_confirmed": True,
                "interest_domain": "music production",
            },
        )

    def test_get_session_summary_returns_404_for_unknown_session(self):
        response = self.client.get("/api/courses/session/sess_missing")
        self.assertEqual(response.status_code, 404)

    def test_chat_message_route_returns_agent_reply(self):
        state_store.create_session("sess_chat")

        with patch(
            "backend.api.routes.chat.workflows.infer_interest",
            new=AsyncMock(
                return_value=AgentChatReply(
                    session_id="sess_chat",
                    reply="Let's use esports as the personalization lens.",
                    interest_confirmed=True,
                    interest_domain="esports analytics",
                    interest_keywords=["match data", "drafting"],
                )
            ),
        ) as infer_interest:
            response = self.client.post(
                "/api/chat/sess_chat/message",
                json={"message": "I spend hours studying competitive games."},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["interest_domain"], "esports analytics")
        infer_interest.assert_awaited_once()

    def test_generate_plan_rejects_unconfirmed_interest(self):
        state_store.create_session("sess_plan")
        state_store.update_session(
            "sess_plan",
            course_id="course_1",
            course_title="Statistics",
        )

        response = self.client.post(
            "/api/plan/sess_plan/generate",
            json={"course_id": "course_1"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Interest not confirmed", response.text)

    def test_generate_plan_starts_pipeline_for_confirmed_interest(self):
        state_store.create_session("sess_ready")
        state_store.update_session(
            "sess_ready",
            course_id="course_ready",
            course_title="Statistics",
            required_topics=["Probability"],
            interest_confirmed=True,
            interest_domain="basketball analytics",
        )

        with patch(
            "backend.api.routes.plan.workflows.run_plan_pipeline",
            new=AsyncMock(return_value=None),
        ) as run_pipeline:
            response = self.client.post(
                "/api/plan/sess_ready/generate",
                json={"course_id": "course_ready"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "generating")
        run_pipeline.assert_awaited_once_with("sess_ready")

    def test_upload_syllabus_route_uses_parser_workflow(self):
        async def fake_parse(session_id: str, raw_text: str):
            state_store.update_session(
                session_id,
                course_title="Databases",
                required_topics=["SQL", "Normalization"],
                learning_outcomes=["Design relational schemas"],
            )
            return ParsedSyllabusMessage(
                session_id=session_id,
                course_title="Databases",
                required_topics=["SQL", "Normalization"],
                learning_outcomes=["Design relational schemas"],
            )

        with patch(
            "backend.api.routes.courses.workflows.parse_syllabus_text",
            new=AsyncMock(side_effect=fake_parse),
        ):
            response = self.client.post(
                "/api/courses/upload-syllabus",
                files={"file": ("syllabus.txt", b"Course outline", "text/plain")},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["course_title"], "Databases")
        self.assertEqual(data["required_topics"], ["SQL", "Normalization"])
        session = state_store.require_session(data["session_id"])
        self.assertEqual(session.course_id, data["course_id"])


if __name__ == "__main__":
    unittest.main()
