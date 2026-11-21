---
name: testing
description: >-
  Run TTworkshop's full automated and AI-accessible manual checks with isolated
  PostgreSQL and exact commit-linked evidence.
---

# Testing

Follow [root AGENTS.md](../../../AGENTS.md). Never run destructive tests against
production or personal development data.

1. Inspect `package.json`, current CI workflow, README, test helpers and
   available Node/PostgreSQL/Chromium tools. The principal suite is `npm ci`,
   `npm run build`, `npm test`, plus
   `python3 -m unittest discover -s tests -p 'test_cloud_smoke.py' -v`. Include
   all configured unit, API, integration, browser and regression checks, not
   only files changed.
2. For integration tests use **isolated loopback** PostgreSQL databases named
   exactly `ttworkshop_test` and `ttworkshop_seed_test` via `PG_TEST_URL` and
   `PG_SEED_TEST_URL`. Inspect `tests/helpers/testDatabase.ts`; never relax
   exact database-name/server-IP safeguards. Use synthetic credentials; never
   copy production secrets.
3. When applicable, drive critical UI journeys via AI-accessible
   browser/Playwright, authenticated/forbidden APIs, persistence and
   concurrency, migration/seed idempotency, negative/error paths and relevant
   security/regression checks.
4. Record tested SHA, commands, environment, versions, passed/failed/skipped
   counts, expected vs actual manual results, links to logs and exact AC/STS
   mapping. Distinguish Author-local, independent Reviewer rerun and hosted CI.
5. Investigate failure cause, attempt safe fixes, rerun the full affected checks
   and disclose unresolved environmental/tool gaps as `NOT VERIFIED` with
   reproducible recovery. Never disable mandatory tests or replace actual DB
   evidence with mocks.
6. Manual fallback is allowed only where the actual course/project gate permits
   it. Redact secrets and personal data from stored logs or screenshots.
