from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.models.schemas import UploadSyllabusResponse
from backend.services import pdf_parser, state_store
from backend.services.claude_service import chat_completion_json
import uuid

router = APIRouter(prefix="/api/courses", tags=["courses"])

SYSTEM = """You are an expert at parsing university course syllabi.
Extract the course title, required topics, and learning outcomes.
Return JSON:
{
  "course_title": "string",
  "required_topics": ["topic1", "topic2", ...],
  "learning_outcomes": ["outcome1", ...]
}
Keep topics concise (3-8 words each). Extract 5-15 topics."""


@router.post("/upload-syllabus", response_model=UploadSyllabusResponse)
async def upload_syllabus(file: UploadFile = File(...)):
    if file.content_type not in ("application/pdf", "text/plain"):
        raise HTTPException(400, "Only PDF or .txt files accepted")

    raw_bytes = await file.read()
    if file.content_type == "application/pdf":
        raw_text = pdf_parser.extract_text_from_pdf(raw_bytes)
    else:
        raw_text = pdf_parser.extract_text_from_txt(raw_bytes)

    if not raw_text.strip():
        raise HTTPException(422, "Could not extract text from file")

    result = await chat_completion_json(
        messages=[{"role": "user", "content": f"Parse this syllabus:\n\n{raw_text[:8000]}"}],
        system=SYSTEM,
    )

    course_id = f"course_{uuid.uuid4().hex[:8]}"
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    session = state_store.create_session(session_id)
    state_store.update_session(
        session_id,
        course_id=course_id,
        course_title=result.get("course_title", "Course"),
        required_topics=result.get("required_topics", []),
        learning_outcomes=result.get("learning_outcomes", []),
    )

    return UploadSyllabusResponse(
        course_id=course_id,
        session_id=session_id,
        course_title=result.get("course_title", "Course"),
        required_topics=result.get("required_topics", []),
    )
