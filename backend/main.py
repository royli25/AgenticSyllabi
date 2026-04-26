from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import courses, chat, plan

app = FastAPI(title="AICourseLoad", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router)
app.include_router(chat.router)
app.include_router(plan.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
