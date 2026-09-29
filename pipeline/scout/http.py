import asyncio
import logging
import random
from collections import defaultdict
from typing import Any
from urllib.parse import urlsplit

import httpx

from scout.config import get_settings

logger = logging.getLogger(__name__)

RETRY_STATUS = {429, 500, 502, 503, 504}


class HttpClient:
    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        per_host: int | None = None,
        max_retries: int = 3,
        base_delay: float = 0.5,
    ) -> None:
        settings = get_settings()
        self._client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(settings.http_timeout, connect=10.0),
            headers={"User-Agent": settings.user_agent},
            follow_redirects=True,
        )
        self._per_host = per_host or settings.per_host_concurrency
        self._sems: dict[str, asyncio.Semaphore] = defaultdict(lambda: asyncio.Semaphore(self._per_host))
        self.max_retries = max_retries
        self.base_delay = base_delay

    async def __aenter__(self) -> "HttpClient":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self._client.aclose()

    async def request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        host = urlsplit(url).netloc
        attempt = 0
        while True:
            async with self._sems[host]:
                try:
                    response = await self._client.request(method, url, **kwargs)
                except (httpx.TransportError, httpx.TimeoutException) as exc:
                    if attempt >= self.max_retries:
                        raise
                    logger.warning("transport error %s %s: %s", method, url, exc)
                    response = None
            if response is not None and response.status_code not in RETRY_STATUS:
                return response
            if attempt >= self.max_retries:
                assert response is not None
                return response
            delay = self.base_delay * (2**attempt) + random.uniform(0, self.base_delay)
            if response is not None:
                retry_after = response.headers.get("retry-after")
                if retry_after and retry_after.isdigit():
                    delay = min(float(retry_after), 30.0)
            attempt += 1
            await asyncio.sleep(delay)

    async def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self.request("POST", url, **kwargs)

    async def get_json(self, url: str, **kwargs: Any) -> Any:
        response = await self.get(url, **kwargs)
        response.raise_for_status()
        return response.json()
