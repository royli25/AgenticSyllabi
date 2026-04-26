import json
from functools import lru_cache

from openai import AsyncOpenAI
from backend.config import OPENAI_API_KEY, MODEL


@lru_cache(maxsize=1)
def get_client() -> AsyncOpenAI:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return AsyncOpenAI(api_key=OPENAI_API_KEY)


async def chat_completion(messages: list[dict], system: str = "", max_tokens: int = 2048) -> str:
    all_messages = ([{"role": "system", "content": system}] if system else []) + messages
    response = await get_client().chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=all_messages,
    )
    return response.choices[0].message.content or ""


async def chat_completion_json(messages: list[dict], system: str = "", max_tokens: int = 4096) -> dict:
    system_with_json = (system + "\n\nYou MUST respond with valid JSON only.").strip()
    all_messages = [{"role": "system", "content": system_with_json}] + messages
    response = await get_client().chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=all_messages,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content or "{}")


async def stream_chat(messages: list[dict], system: str = ""):
    all_messages = ([{"role": "system", "content": system}] if system else []) + messages
    async with get_client().chat.completions.stream(
        model=MODEL,
        max_tokens=1024,
        messages=all_messages,
    ) as stream:
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta
