import html
import logging
from dataclasses import dataclass, field
from typing import Protocol

from rich.console import Console
from rich.table import Table

from scout.config import get_settings
from scout.http import HttpClient

logger = logging.getLogger(__name__)

TELEGRAM_URL = "https://api.telegram.org/bot{token}/sendMessage"


@dataclass
class Digest:
    job_id: int
    title: str
    company: str
    location: str | None
    url: str
    final_score: float
    fit_score: float
    reasons: list[str] = field(default_factory=list)


class Notifier(Protocol):
    name: str

    async def send(self, items: list[Digest], lines: list[str] | None = None) -> int: ...


def reminder_keyboard(reminder_id: int) -> dict:
    return {
        "inline_keyboard": [[
            {"text": "✅ Done", "callback_data": f"rm:{reminder_id}:done"},
            {"text": "💤 Snooze", "callback_data": f"rm:{reminder_id}:snooze"},
        ]]
    }


def keyboard(job_id: int) -> dict:
    return {
        "inline_keyboard": [[
            {"text": "\U0001F44D", "callback_data": f"fb:{job_id}:up"},
            {"text": "\U0001F44E", "callback_data": f"fb:{job_id}:down"},
            {"text": "✅ Applied", "callback_data": f"fb:{job_id}:applied"},
        ]]
    }


def format_item(rank: int, item: Digest) -> str:
    reasons = "\n".join(f"• {html.escape(r)}" for r in item.reasons[:3])
    return (
        f"<b>{rank}. {html.escape(item.title)}</b> — {html.escape(item.company)}\n"
        f"{html.escape(item.location or 'n/a')} · score {item.final_score:.2f} · fit {item.fit_score:.1f}/10\n"
        f"{reasons}\n<a href=\"{html.escape(item.url, quote=True)}\">Open posting</a>"
    )


class TelegramNotifier:
    name = "telegram"

    def __init__(self, token: str, chat_id: str, http: HttpClient | None = None) -> None:
        self.token, self.chat_id, self.http = token, chat_id, http

    async def _post(self, http: HttpClient, payload: dict) -> bool:
        response = await http.post(TELEGRAM_URL.format(token=self.token), json=payload)
        if response.status_code != 200:
            logger.warning("telegram send failed %s: %s", response.status_code, response.text[:200])
            return False
        return True

    async def send_reminder(self, reminder_id: int, text: str) -> bool:
        http = self.http or HttpClient()
        return await self._post(http, {
            "chat_id": self.chat_id, "text": html.escape(text[:3800]), "parse_mode": "HTML",
            "disable_web_page_preview": True, "reply_markup": reminder_keyboard(reminder_id),
        })

    async def send(self, items: list[Digest], lines: list[str] | None = None) -> int:
        if not items and not lines:
            return 0
        http = self.http or HttpClient()
        sent = 0
        header = "\n".join([f"Scout: {len(items)} new matches today", *(lines or [])])
        await self._post(http, {"chat_id": self.chat_id, "text": header, "disable_notification": True})
        for rank, item in enumerate(items, 1):
            payload = {
                "chat_id": self.chat_id,
                "text": format_item(rank, item),
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
                "reply_markup": keyboard(item.job_id),
            }
            if await self._post(http, payload):
                sent += 1
        return sent


class ConsoleNotifier:
    name = "console"

    def __init__(self, console: Console | None = None) -> None:
        self.console = console or Console()

    async def send_reminder(self, reminder_id: int, text: str) -> bool:
        self.console.print(f"[bold]reminder {reminder_id}[/bold] (rm:{reminder_id}:done / rm:{reminder_id}:snooze)\n{text}")
        return True

    async def send(self, items: list[Digest], lines: list[str] | None = None) -> int:
        for line in lines or []:
            self.console.print(line)
        if not items:
            return 0
        table = Table(title="Scout top matches")
        for column in ("#", "id", "score", "fit", "title", "company", "location"):
            table.add_column(column)
        for rank, item in enumerate(items, 1):
            table.add_row(str(rank), str(item.job_id), f"{item.final_score:.2f}", f"{item.fit_score:.1f}", item.title[:60], item.company[:25], (item.location or "")[:30])
        self.console.print(table)
        return len(items)


def get_notifier(http: HttpClient | None = None) -> Notifier:
    settings = get_settings()
    if settings.telegram_bot_token and settings.telegram_chat_id:
        return TelegramNotifier(settings.telegram_bot_token, settings.telegram_chat_id, http)
    return ConsoleNotifier()
