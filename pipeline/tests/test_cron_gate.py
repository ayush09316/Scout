from typer.testing import CliRunner

from scout.cli import app
from scout.db.session import put_setting, session_scope


def _gate(db, out, monkeypatch) -> str:
    monkeypatch.setenv("GITHUB_OUTPUT", str(out))
    result = CliRunner().invoke(app, ["cron-gate", "--database-url", db])
    assert result.exit_code == 0, result.output
    return out.read_text().strip()


def test_off_by_default(db, tmp_path, monkeypatch):
    assert _gate(db, tmp_path / "out", monkeypatch) == "enabled=false"


def test_follows_dashboard_switch(db, tmp_path, monkeypatch):
    with session_scope(db) as session:
        put_setting(session, "cron_enabled", True)
    assert _gate(db, tmp_path / "on", monkeypatch) == "enabled=true"
    with session_scope(db) as session:
        put_setting(session, "cron_enabled", False)
    assert _gate(db, tmp_path / "off", monkeypatch) == "enabled=false"
