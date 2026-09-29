PY := pipeline/venv/bin/python
SCOUT := pipeline/venv/bin/scout
PYTHON311 ?= python3.11

.PHONY: up down venv migrate run test eval seed sync profile tune

up:
	docker compose up -d --wait db

down:
	docker compose down

venv:
	test -d pipeline/venv || $(PYTHON311) -m venv pipeline/venv
	pipeline/venv/bin/pip install -q -e "pipeline[embed,dev]"

migrate:
	cd pipeline && venv/bin/alembic upgrade head

sync:
	$(SCOUT) companies sync

profile:
	$(SCOUT) profile set pipeline/examples/resume.md --prefs pipeline/examples/prefs.yaml

run:
	$(SCOUT) run

test:
	cd pipeline && venv/bin/pytest -q

eval:
	$(SCOUT) eval

tune:
	$(SCOUT) tune

seed:
	$(SCOUT) seed-demo
