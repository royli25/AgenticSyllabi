from dotenv import load_dotenv
import os

load_dotenv()

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
BUREAU_PORT = int(os.getenv("BUREAU_PORT", "8001"))
MODEL = "gpt-4o"
