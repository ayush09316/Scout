# Scout

A personal job-hunt copilot. Every morning it pulls fresh postings from ~150 company job boards and public feeds, removes duplicates, ranks them against my resume with a three-stage retrieval + LLM pipeline, and sends the top 10 to Telegram. A keyboard-first dashboard handles triage, tracking and labeling, and an eval harness keeps the ranking honest.

Runs entirely on free tiers: GitHub Actions cron, Neon Postgres + pgvector, Vercel, Telegram.

## Architecture

```
GitHub Actions cron (08:00 IST)
  └─ scout run
       fetch ─► normalize ─► upsert ─► embed ─► dedup ─► hard filters ─► cosine top-K ─► score ─► rank ─► notify
       (8 sources, async)     (idempotent)  (bge-small)  (fuzzy+vector)                    (Jev → Gemini → Groq → local → heuristic)
                                   │
                                   ▼
                       Postgres + pgvector  ◄──── Next.js 15 dashboard (Vercel)
                                   ▲                 today · job · tracker · label · health · settings
                                   └──── Telegram webhook (👍 👎 ✅ feedback)
```

## Measured (real run, 29 Sep 2026)

| | |
|---|---|
| Sources | Greenhouse, Ashby, Lever, Arbeitnow, HN Who's Hiring, RemoteOK, Remotive (+ Adzuna with key) |
| Companies tracked | 144, every slug probed live |
| Jobs fetched per run | 15,254 |
| Duplicates collapsed | 2,953 |
| Funnel | 15,254 open → 47 pass hard filters → 47 scored → 10 notified |
| First run | 587 s (493 s is one-time CPU embedding) |
| Incremental run | ~95 s, 0 re-scores on unchanged jobs |
| Fetch errors | 0 |
| Tests | 84 pytest + 8 Playwright |

Eval numbers (precision@10, recall@50, ECE, p50 latency, $/1k jobs per scorer) are produced by `scout eval` once the label set is built from `/label`; CI blocks a PR that drops precision@10 by more than 5 points.

## How ranking works

1. **Hard filters** — title keywords, excluded titles/companies, seniority, experience ceiling, location/remote region, posting age ≤ 45 days.
2. **Vector pre-filter** — cosine similarity between the resume and each posting (bge-small-en-v1.5, 384-d, HNSW index); keep top 60 plus tier-1 companies.
3. **Typed LLM scoring** — Jev answers fixed questions (fit 0–10, seniority, should-apply probability). A fallback chain moves to Gemini, Groq, a local Ollama model, then a keyword heuristic on error, 429 or schema-invalid output. Scores are cached on `(job, profile_version, content_hash)` and a daily cost cap switches to free scorers.
4. **Rank** — `final = w·[fit_prob, embed_sim, tier, freshness]`; weights refit weekly from feedback by logistic regression and kept only if they beat the old ones on the held-out split. Isotonic calibration turns raw scores into "82% fit" that means 82%.

## Dashboard

- **Today** — Superhuman-style triage: J/K, U/D, S save, A apply, Undo toasts, Top / Maybe / All tabs, filters.
- **Job** — description, score breakdown, Teal-style matched vs. missing skills, cover-note generator, duplicates.
- **Tracker** — Huntr-style kanban with drag and drop and funnel rates.
- **Label** — Y/N labeling toward a 200-job eval set with a deterministic dev/test split.
- **Health** — runs, cost, per-source errors, eval table, reliability chart.
- ⌘K palette, `?` shortcut sheet, light/dark, mobile layout.

## Trade-offs

- **Cron, not a server** — one daily batch fits the job and costs nothing; the web app is serverless and only reads/writes rows.
- **Embeddings before the LLM** — scoring 15k postings with an LLM daily is wasteful; the vector stage cuts the LLM to ~60 calls.
- **Public ATS APIs only** — no LinkedIn/Naukri scraping; fewer jobs, but legal and stable.
- **Dedup is aggressive** — the same title in the same city at one company collapses to one card, which hides repeated requisitions by design.
- **At 100× scale** — move embedding to a GPU batch job, partition `jobs` by source, and replace the cron with a queue per source.

## Run locally

```bash
createdb scout && cd pipeline && python3.11 -m venv venv && venv/bin/pip install -e '.[dev]'
venv/bin/alembic upgrade head
venv/bin/scout companies sync
venv/bin/scout profile set examples/resume.md --prefs examples/prefs.yaml
venv/bin/scout run

cd ../web && npm install && cp .env.example .env.local && npm run dev
```

Zero keys needed: the heuristic scorer and a console notifier stand in. Add `OPENROUTER_API_KEY` (Jev), `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` to turn on the real paths.

Demo data for any database: `scout seed-demo --database-url <url>`.

## Deploy (free)

1. Neon: create a project, `CREATE EXTENSION vector;`, run `alembic upgrade head` with its `DATABASE_URL`.
2. GitHub: add secrets `DATABASE_URL`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`; `daily.yml` runs at 08:00 IST and can be triggered by hand.
3. Vercel: import `web/`, set the env vars from `web/.env.example`, then register the webhook:
   `curl "https://api.telegram.org/bot$TOKEN/setWebhook?url=https://<app>/api/telegram&secret_token=$TELEGRAM_WEBHOOK_SECRET"`
4. Public demo: a second Neon branch seeded with `scout seed-demo`, deployed with `DEMO_MODE=1`.
