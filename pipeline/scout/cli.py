import asyncio
import json
import logging
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import select

from scout.config import get_settings

app = typer.Typer(no_args_is_help=True, add_completion=False)
companies_app = typer.Typer(no_args_is_help=True)
profile_app = typer.Typer(no_args_is_help=True)
app.add_typer(companies_app, name="companies")
app.add_typer(profile_app, name="profile")
backfill_app = typer.Typer(no_args_is_help=True)
app.add_typer(backfill_app, name="backfill")
console = Console()


@app.callback()
def main(verbose: bool = typer.Option(False, "--verbose", "-v")) -> None:
    logging.basicConfig(
        level=logging.INFO if verbose else logging.WARNING,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    for noisy in ("httpx", "httpcore", "sentence_transformers"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


@app.command()
def run(database_url: str | None = typer.Option(None, envvar="DATABASE_URL")) -> None:
    from scout.pipeline import run_pipeline

    result = asyncio.run(run_pipeline(database_url))
    counts = result["counts"]
    table = Table(title=f"Run {result['run_id']} — {result['status']}")
    table.add_column("stage")
    table.add_column("value")
    for source, n in sorted((counts.get("fetched") or {}).items()):
        table.add_row(f"fetched/{source}", str(n))
    for key in ("fetched_total", "normalized", "inserted", "updated", "unchanged", "missed", "closed", "embedded",
                "open_jobs", "duplicates", "filtered_in", "prefiltered", "cached", "scored", "llm_calls", "notified",
                "fetch_s", "embed_s", "dedup_s", "score_s", "duration_s"):
        if key in counts:
            table.add_row(key, str(counts[key]))
    for key in ("tracking", "salary", "company_stats", "skill_gaps", "reminders", "reminders_sent"):
        if counts.get(key) is not None:
            table.add_row(key, json.dumps(counts[key], default=str))
    table.add_row("cost_usd", f"{result['cost_usd']:.6f}")
    table.add_row("errors", str(len(result["errors"])))
    console.print(table)
    for error in result["errors"][:15]:
        console.print(f"[yellow]- {error}[/yellow]")
    if result["status"] == "failed":
        raise typer.Exit(1)


@companies_app.command("sync")
def companies_sync(file: Path = typer.Option(None, "--file", "-f")) -> None:
    from scout.companies import load_companies_file, sync_companies
    from scout.db.session import session_scope

    entries = load_companies_file(file or get_settings().companies_file)
    with session_scope() as session:
        synced, deactivated = sync_companies(session, entries)
    console.print(f"synced {synced} companies, deactivated {deactivated}")


@companies_app.command("verify")
def companies_verify(file: Path = typer.Option(None, "--file", "-f"), prune: bool = typer.Option(False, "--prune")) -> None:
    import yaml

    from scout.companies import load_companies_file, verify_companies

    path = file or get_settings().companies_file
    entries = load_companies_file(path)
    results = asyncio.run(verify_companies(entries))
    dead = [(e, n) for e, ok, n in results if not ok]
    live = [(e, n) for e, ok, n in results if ok]
    table = Table(title=f"{len(live)} live / {len(dead)} dead")
    for column in ("company", "ats", "slug", "status", "jobs"):
        table.add_column(column)
    for entry, ok, count in sorted(results, key=lambda r: (r[1], r[0].name)):
        table.add_row(entry.name, entry.ats, entry.slug, "ok" if ok else "[red]dead[/red]", str(count))
    console.print(table)
    if prune and dead:
        dead_keys = {(e.ats, e.slug) for e, _ in dead}
        data = yaml.safe_load(path.read_text())
        data["companies"] = [c for c in data["companies"] if (c["ats"], str(c["slug"])) not in dead_keys]
        path.write_text(yaml.safe_dump(data, sort_keys=False))
        console.print(f"pruned {len(dead)} dead entries from {path}")


@profile_app.command("set")
def profile_set(resume: Path, prefs: Path = typer.Option(None, "--prefs")) -> None:
    from scout.db.session import session_scope
    from scout.profile import create_profile, read_prefs, read_resume

    text = read_resume(resume)
    if not text:
        console.print("[red]resume is empty[/red]")
        raise typer.Exit(1)
    with session_scope() as session:
        profile = create_profile(session, text, read_prefs(prefs))
        console.print(f"profile version {profile.version} saved ({len(text)} chars)")


@profile_app.command("show")
def profile_show() -> None:
    from scout.db.session import session_scope
    from scout.profile import latest_profile

    with session_scope() as session:
        profile = latest_profile(session)
        if profile is None:
            console.print("no profile")
            return
        console.print(f"version {profile.version}")
        console.print_json(json.dumps(profile.preferences))


@app.command("eval")
def eval_cmd(
    gate: bool = typer.Option(False, "--gate"),
    split: str = typer.Option("test", "--split"),
    scorers: str = typer.Option(None, "--scorers"),
) -> None:
    from scout.db.models import EvalReport
    from scout.db.session import session_scope
    from scout.evals import gate_check, previous_report, run_eval

    names = (scorers or get_settings().scorer_chain).split(",")
    with session_scope() as session:
        previous = previous_report(session)
        report = asyncio.run(run_eval(session, names, None if split == "all" else split))
        if report is None:
            console.print("no labeled data or profile; nothing to evaluate")
            return
        session.add(EvalReport(report=report))
    table = Table(title=f"Eval on {report['n']} jobs ({report['positives']} fit, split={report['split']})")
    for column in ("scorer", "model", "P@10", "R@50", "ECE", "p50 ms", "$/1k", "errors"):
        table.add_column(column)
    for name, m in report["scorers"].items():
        table.add_row(name, m["model"], f"{m['p_at_10']:.2f}", f"{m['recall_at_50']:.2f}", f"{m['ece']:.3f}",
                      f"{m['p50_latency_ms']:.0f}", f"{m['cost_per_1k_usd']:.4f}", str(m["errors"]))
    console.print(table)
    if gate:
        ok, message = gate_check(report, previous)
        console.print(f"gate: {'pass' if ok else 'FAIL'} ({message})")
        if not ok:
            raise typer.Exit(1)


@app.command()
def calibrate() -> None:
    from scout.db.session import session_scope
    from scout.rank.learn import calibrate as fit_calibration

    with session_scope() as session:
        result = fit_calibration(session)
    console.print_json(json.dumps(result))


@app.command()
def tune(metrics_file: Path = typer.Option(None, "--metrics-file")) -> None:
    from scout.db.session import session_scope
    from scout.rank.learn import tune_weights

    with session_scope() as session:
        result = tune_weights(session, metrics_file or get_settings().metrics_file)
    console.print_json(json.dumps(result, default=str))


@app.command("seed-demo")
def seed_demo_cmd(
    database_url: str | None = typer.Option(None, "--database-url", envvar="DATABASE_URL"),
    jobs: int = typer.Option(80, "--jobs"),
) -> None:
    from scout.db.session import session_scope
    from scout.seed import seed_demo

    with session_scope(database_url) as session:
        result = seed_demo(session, n_jobs=jobs)
    console.print_json(json.dumps(result))


@app.command()
def cover(job_id: int, save: bool = typer.Option(True, "--save/--no-save")) -> None:
    from scout.cover import generate_cover, save_cover
    from scout.db.models import Job
    from scout.db.session import session_scope
    from scout.profile import latest_profile

    with session_scope() as session:
        job = session.scalar(select(Job).where(Job.id == job_id))
        profile = latest_profile(session)
        if job is None or profile is None:
            console.print("[red]job or profile not found[/red]")
            raise typer.Exit(1)
        body, model = asyncio.run(generate_cover(job, profile))
        if save:
            save_cover(session, job, profile, body, model)
    console.print(f"[dim]{model}[/dim]\n{body}")


@backfill_app.command("versions")
def backfill_versions_cmd(database_url: str | None = typer.Option(None, envvar="DATABASE_URL")) -> None:
    from scout.db.session import session_scope
    from scout.tracking import backfill_versions

    with session_scope(database_url) as session:
        created = backfill_versions(session)
    console.print(f"created {created} initial versions (no events)")


@app.command()
def salary(
    all_jobs: bool = typer.Option(False, "--all"),
    database_url: str | None = typer.Option(None, envvar="DATABASE_URL"),
) -> None:
    from scout.db.session import session_scope
    from scout.profile import latest_profile
    from scout.salary import estimate_salaries

    with session_scope(database_url) as session:
        profile = latest_profile(session)
        result = estimate_salaries(session, profile.version if profile else None, None, all_jobs=all_jobs)
    console.print_json(json.dumps(result))


@app.command()
def search(
    query: str,
    limit: int = typer.Option(10, "--limit", "-n"),
    database_url: str | None = typer.Option(None, envvar="DATABASE_URL"),
) -> None:
    from scout.db.session import session_scope
    from scout.search import hybrid_search

    with session_scope(database_url) as session:
        hits = hybrid_search(session, query, limit)
    table = Table(title=f"{len(hits)} results for {query!r}")
    for column in ("#", "id", "rrf", "fts", "vec", "title", "company", "location"):
        table.add_column(column)
    for rank, hit in enumerate(hits, 1):
        table.add_row(str(rank), str(hit.job_id), f"{hit.score:.4f}", str(hit.fts_rank or "-"), str(hit.vector_rank or "-"),
                      hit.title[:60], hit.company_name[:25], (hit.location or "")[:30])
    console.print(table)


if __name__ == "__main__":
    app()
