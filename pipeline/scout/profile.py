from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from scout.db.models import Profile
from scout.embed import embed_query


def read_resume(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        return "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()
    return path.read_text().strip()


def read_prefs(path: Path | None) -> dict[str, Any]:
    if path is None:
        return {}
    return yaml.safe_load(path.read_text()) or {}


def create_profile(session: Session, resume_md: str, preferences: dict[str, Any]) -> Profile:
    version = (session.scalar(select(func.max(Profile.version))) or 0) + 1
    profile = Profile(
        version=version,
        resume_md=resume_md,
        resume_embedding=embed_query(resume_md).tolist(),
        preferences=preferences,
    )
    session.add(profile)
    session.flush()
    return profile


def latest_profile(session: Session) -> Profile | None:
    return session.scalar(select(Profile).order_by(Profile.version.desc()).limit(1))
