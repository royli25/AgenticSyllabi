from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.agents import workflows
from backend.models.schemas import SessionSummaryResponse, UploadSyllabusResponse
from backend.services import pdf_parser, state_store
import uuid

router = APIRouter(prefix="/api/courses", tags=["courses"])


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

    course_id = f"course_{uuid.uuid4().hex[:8]}"
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    state_store.create_session(session_id)
    state_store.update_session(session_id, course_id=course_id)
    parsed = await workflows.parse_syllabus_text(session_id, raw_text)

    return UploadSyllabusResponse(
        course_id=course_id,
        session_id=session_id,
        course_title=parsed.course_title,
        required_topics=parsed.required_topics,
    )


@router.get("/session/{session_id}", response_model=SessionSummaryResponse)
async def get_session_summary(session_id: str):
    session = state_store.get_session(session_id)
    if not session or not session.course_id or not session.course_title:
        raise HTTPException(404, "Session not found")

    return SessionSummaryResponse(
        course_id=session.course_id,
        session_id=session.session_id,
        course_title=session.course_title,
        required_topics=session.required_topics,
        interest_confirmed=session.interest_confirmed,
        interest_domain=session.interest_domain,
    )
