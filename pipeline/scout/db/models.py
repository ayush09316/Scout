from datetime import datetime
from decimal import Decimal
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, Numeric, SmallInteger, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, REAL as Real
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

EMBED_DIM = 384


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (UniqueConstraint("ats", "slug"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    ats: Mapped[str] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(Text)
    tier: Mapped[int] = mapped_column(SmallInteger, default=2)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_etag: Mapped[str | None] = mapped_column(Text)


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (UniqueConstraint("source", "external_id"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    source: Mapped[str] = mapped_column(Text)
    external_id: Mapped[str] = mapped_column(Text)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"))
    company_name: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    remote: Mapped[bool] = mapped_column(Boolean, default=False)
    seniority: Mapped[str | None] = mapped_column(Text)
    min_exp: Mapped[int | None] = mapped_column(SmallInteger)
    max_exp: Mapped[int | None] = mapped_column(SmallInteger)
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str | None] = mapped_column(Text)
    description_md: Mapped[str] = mapped_column(Text, default="")
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    missed_runs: Mapped[int] = mapped_column(SmallInteger, default=0)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    content_hash: Mapped[str] = mapped_column(Text)
    dedup_group_id: Mapped[int | None] = mapped_column(BigInteger)
    is_canonical: Mapped[bool] = mapped_column(Boolean, default=True)
    embedding: Mapped[Any] = mapped_column(Vector(EMBED_DIM), nullable=True)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    workable_from_india: Mapped[bool | None] = mapped_column(Boolean)


class Profile(Base):
    __tablename__ = "profile"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, unique=True)
    resume_md: Mapped[str] = mapped_column(Text)
    resume_embedding: Mapped[Any] = mapped_column(Vector(EMBED_DIM), nullable=True)
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (UniqueConstraint("job_id", "profile_version", "content_hash", "model"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    profile_version: Mapped[int] = mapped_column(Integer)
    content_hash: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(Text)
    embed_sim: Mapped[float | None] = mapped_column(Real)
    fit_score: Mapped[float | None] = mapped_column(Real)
    fit_prob: Mapped[float | None] = mapped_column(Real)
    seniority: Mapped[str | None] = mapped_column(Text)
    seniority_match: Mapped[bool | None] = mapped_column(Boolean)
    apply_prob: Mapped[float | None] = mapped_column(Real)
    final_score: Mapped[float | None] = mapped_column(Real)
    reasons: Mapped[list] = mapped_column(JSONB, default=list)
    missing_skills: Mapped[list] = mapped_column(JSONB, default=list)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    action: Mapped[str] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Run(Base):
    __tablename__ = "runs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Text, default="running")
    counts: Mapped[dict] = mapped_column(JSONB, default=dict)
    errors: Mapped[list] = mapped_column(JSONB, default=list)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0)


class Label(Base):
    __tablename__ = "labels"
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    label: Mapped[str] = mapped_column(Text)
    split: Mapped[str] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CoverNote(Base):
    __tablename__ = "cover_notes"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    profile_version: Mapped[int] = mapped_column(Integer)
    body: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EvalReport(Base):
    __tablename__ = "eval_reports"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    report: Mapped[dict] = mapped_column(JSONB)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[Any] = mapped_column(JSONB)


class JobVersion(Base):
    __tablename__ = "job_versions"
    __table_args__ = (UniqueConstraint("job_id", "content_hash"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    content_hash: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    description_md: Mapped[str] = mapped_column(Text)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class JobEvent(Base):
    __tablename__ = "job_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(Text)
    detail: Mapped[dict] = mapped_column(JSONB, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SalaryEstimate(Base):
    __tablename__ = "salary_estimates"
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    low: Mapped[int] = mapped_column(Integer)
    high: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(Text, default="INR")
    confidence: Mapped[float] = mapped_column(Real)
    n_comparables: Mapped[int] = mapped_column(Integer, default=0)
    basis: Mapped[dict] = mapped_column(JSONB, default=dict)
    model: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CompanyStat(Base):
    __tablename__ = "company_stats"
    company_key: Mapped[str] = mapped_column(Text, primary_key=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"))
    company_name: Mapped[str] = mapped_column(Text)
    open_jobs: Mapped[int] = mapped_column(Integer, default=0)
    opened_30d: Mapped[int] = mapped_column(Integer, default=0)
    closed_30d: Mapped[int] = mapped_column(Integer, default=0)
    velocity_series: Mapped[list] = mapped_column(JSONB, default=list)
    top_skills: Mapped[list] = mapped_column(JSONB, default=list)
    locations: Mapped[list] = mapped_column(JSONB, default=list)
    remote_share: Mapped[float] = mapped_column(Real, default=0)
    seniority_mix: Mapped[dict] = mapped_column(JSONB, default=dict)
    median_salary_inr: Mapped[int | None] = mapped_column(Integer)
    matches: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SkillGap(Base):
    __tablename__ = "skill_gaps"
    profile_version: Mapped[int] = mapped_column(Integer, primary_key=True)
    skill: Mapped[str] = mapped_column(Text, primary_key=True)
    jobs_mentioning: Mapped[int] = mapped_column(Integer)
    jobs_unlocked: Mapped[int] = mapped_column(Integer)
    avg_fit_gain: Mapped[float] = mapped_column(Real, default=0)
    example_job_ids: Mapped[list] = mapped_column(JSONB, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ResumeVariant(Base):
    __tablename__ = "resume_variants"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    profile_version: Mapped[int] = mapped_column(Integer)
    body_md: Mapped[str] = mapped_column(Text)
    keyword_before: Mapped[float] = mapped_column(Real)
    keyword_after: Mapped[float] = mapped_column(Real)
    added_keywords: Mapped[list] = mapped_column(JSONB, default=list)
    model: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InterviewPack(Base):
    __tablename__ = "interview_packs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    profile_version: Mapped[int] = mapped_column(Integer)
    body: Mapped[dict] = mapped_column(JSONB)
    model: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Reminder(Base):
    __tablename__ = "reminders"
    __table_args__ = (UniqueConstraint("job_id", "kind", "due_at"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(Text)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    draft: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
