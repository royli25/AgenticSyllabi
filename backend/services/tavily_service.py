import asyncio
import logging

from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)


def _search_sync(query: str, max_results: int) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    with DDGS() as ddgs:
        for item in ddgs.text(query, max_results=max_results * 2):
            url = (item.get("href") or item.get("url") or "").strip()
            title = (item.get("title") or "").strip()
            content = (item.get("body") or item.get("snippet") or "").strip()

            if not url or url in seen_urls:
                continue

            seen_urls.add(url)
            results.append(
                {
                    "title": title or url,
                    "url": url,
                    "content": content,
                }
            )
            if len(results) >= max_results:
                break

    return results


async def search(query: str, max_results: int = 5) -> list[dict[str, str]]:
    try:
        return await asyncio.to_thread(_search_sync, query, max_results)
    except Exception as exc:
        logger.warning("Search failed for '%s': %s", query, exc)
        return []
