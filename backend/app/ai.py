"""
Single module for all AI calls.
Uses any OpenAI-compatible chat-completions endpoint.
Nothing outside this file imports httpx.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_MAX_ATTEMPTS = 3
_TIMEOUT = 90.0
_RETRY_DELAYS = [1.0, 4.0]   # seconds before attempt 2 and 3


async def complete_json(system: str, user: str, schema: dict) -> dict:
    """
    Call the AI and return a parsed JSON dict validated against `schema`.
    Retries once on parse failure, and up to 3 times on 429/5xx.
    """
    url = settings.AI_BASE_URL.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }

    last_exc: Exception | None = None

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for attempt in range(_MAX_ATTEMPTS):
            if attempt > 0:
                delay = _RETRY_DELAYS[min(attempt - 1, len(_RETRY_DELAYS) - 1)]
                await asyncio.sleep(delay)

            try:
                resp = await client.post(url, headers=headers, json=payload)
            except httpx.RequestError as exc:
                last_exc = exc
                logger.warning("AI request error (attempt %d): %s", attempt + 1, exc)
                continue

            if resp.status_code in (429, 500, 502, 503, 504):
                last_exc = RuntimeError(f"HTTP {resp.status_code}")
                logger.warning("AI HTTP %s (attempt %d)", resp.status_code, attempt + 1)
                continue

            if resp.status_code != 200:
                raise RuntimeError(
                    f"AI API error {resp.status_code}: {resp.text[:300]}"
                )

            # Parse response
            try:
                body = resp.json()
                raw = body["choices"][0]["message"]["content"]
                result = json.loads(raw)
                return result
            except (KeyError, json.JSONDecodeError) as exc:
                if attempt < _MAX_ATTEMPTS - 1:
                    logger.warning("AI parse failure (attempt %d), retrying: %s", attempt + 1, exc)
                    last_exc = exc
                    continue
                raise RuntimeError(f"AI returned unparseable JSON: {exc}") from exc

    raise RuntimeError(f"AI call failed after {_MAX_ATTEMPTS} attempts: {last_exc}")
