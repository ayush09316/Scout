# Aarav Mehta
Backend Software Engineer · Bengaluru, India · aarav@example.com

## Summary
Backend engineer with ~3 years building production services in Python and Django for a B2B commerce marketplace. Comfortable owning APIs end to end: data modelling in PostgreSQL, async work in Celery, integrations with payment gateways and third-party APIs, and running it all on Kubernetes.

## Experience
**Software Engineer II — B2B Materials Marketplace, Bengaluru** (2023 – present)
- Built order, payment and refund services in Django + DRF handling ~40k orders/month.
- Designed Razorpay webhook ingestion with idempotent writes inside PostgreSQL transactions; cut duplicate payment records to zero.
- Moved accounting sync (Zoho Books) and CRM sync to Celery + Redis with retries and backoff; p95 sync latency from 40s to 4s.
- Removed N+1 queries on hot list endpoints (112 → 13 queries), halving API latency.
- Added OpenTelemetry tracing and Grafana dashboards; on-call for production incidents.

**Software Engineer — Same company** (2022 – 2023)
- Shipped logistics integrations (serviceability checks, delivery tracking) and a WhatsApp/SMS notification service.
- Wrote pytest suites and CI pipelines on GitHub Actions; Docker images deployed to Azure AKS via ArgoCD.

## Skills
Python, Django, Django REST Framework, FastAPI, PostgreSQL, Redis, Celery, REST APIs, Docker, Kubernetes, Azure, AWS basics, Git, Linux, SQL, system design, OpenTelemetry, pytest.

## Education
B.Tech, Computer Science — 2022
