# Lab 5 — Cloud Run reserved health path fix (local candidate, NOT MERGED)

**Date:** 2026-11-19 · **Issue:** [#46](https://github.com/cottonlnwza/TTworkshop/issues/46) · **Candidate base:** `sprint_2_staging@dee47ce0cdef25226115627ab13a0dce798529a1`; **deployed previous release:** reviewed `main@d9e9f99637c0511bc93b561f51fb34d2b913d71b` · **Policy:** `sprint_1_staging@9c01bec446a2880c6f870304ea18931fa0253604` (v1.2.1 ACTIVE).

## Reproduced binding defect / official source

On the **existing private** Cloud Run service `ttworkshop`, authenticated local proxy returned Google Frontend HTTP 404 for `GET /healthz` on BOTH ready revisions (`00001-hix` and tagged `00002-fin`). `GET /healthz/` reached the application and returned JSON `200 {"status":"ok"}`, while `GET /` returned 200 HTML and unauthenticated app API returned 401. Cloud Run's official known-issues documentation warns that some paths ending in `z` are reserved: https://docs.cloud.google.com/run/docs/known-issues#reserved_url_paths. This is a **production compatibility defect** in route/probe configuration, not proof of a database outage.

## Scope of the local fix

- `api/web-static.ts`: use DB-backed `GET /health`; retain JSON 200/503 and no-store, prevent SPA HTML from masking readiness; retired `/healthz` does not map to SPA.
- `compose.yaml`: API health check now calls `/health`.
- `deploy/smoke_test.py`: read-only HTTPS `/health` check; same strict origin, redirect, JSON and HTML checks.
- `tests/production-health-routing.unit.test.ts`: 200/503/SPA/static/regression, including retired path 404.
- `tests/test_cloud_smoke.py`: new path throughout positive and negative cases.
- `README.md`, `docs/labs/lab-05/deployment.md`: latest **private** GCP snapshot and explicit new-release and startup-probe dependency. Preserve previously merged/dated evidence as historical.

## Actual local test evidence (ComGu machine, isolated worktree)

| Verification | Evidence | Result |
| --- | --- | --- |
| `node ./node_modules/vitest/vitest.mjs run tests/production-health-routing.unit.test.ts tests/web-static.unit.test.ts tests/cloud-db-check.unit.test.ts tests/runtime-schema.unit.test.ts tests/migration-runner.unit.test.ts` | 5 files, 26 tests | PASS |
| `python3 -m unittest discover -s tests -p 'test_cloud_smoke.py' -v` | 7 cases | PASS |
| `python3 -m unittest discover -s tests -p 'test_release_provenance.py' -v` | 0 cases; this test file is not in `sprint_2_staging` | NOT RUN / NOT APPLICABLE to the staging candidate; previously ran 11/11 on separate main-based preparation only |
| `npm run build` | TypeScript noEmit + Vite production build | PASS |
| `node scripts/cloud-preflight.mjs` | offline preflight | PASS |
| `TTW_DB_PASSWORD=<synthetic non-secret> docker compose config --quiet` | Docker Compose syntax | PASS |
| `git diff --check` | whitespace | PASS |

**Limits:** On the staging candidate, the release-provenance test module is not present; a command targeting it returned exit code 5 (`NO TESTS RAN`). This is not a source-test failure; repeat the release guards on the future release-PR base. No new image built/pushed to GCP, no new service deployment, no actual public URL smoke of changed image, no browser/business journey or persistence proof. Real PostgreSQL full integration and Chrome E2E regression were **NOT RUN** in the isolated worktree: `PG_TEST_URL` and `PG_SEED_TEST_URL` were not configured. Previously merged/hosted tests apply to earlier SHAs only.

## REQUIRED workflow before live deployment

- Project's **active v1.2.1 policy** requires a **separately authorized bounded fix Issue and one fix PR** for genuine code changes after an already merged Issue #32 PR #42; do not open a second implementation PR under #32 or #33. Fix [Issue #46](https://github.com/cottonlnwza/TTworkshop/issues/46) is OPEN in Project #4 / Period 2; this candidate belongs to its **one** protected staging PR. Do not claim independent Reviewer approval or Merge.
- Fix PR targets the appropriate protected Sprint staging branch; independent Reviewer re-checks six axes and current HEAD. Then **a separately authorized new release Issue/PR** moves the tested fix to `main`; PR #43 is historical and cannot be reused.
- Build **new immutable digest** only from newly reviewed/merged `main` SHA. An older private image still serves `/healthz`; do not configure `/health` probe against that image. Deploy a **new private 0%-traffic tagged revision** with **both** the new image digest and `--startup-probe='httpGet.path=/health,httpGet.port=8080,periodSeconds=10,timeoutSeconds=10,failureThreshold=6'` in the SAME reviewed command. Retain `ttworkshop-runner`, Cloud SQL attachment, `ttworkshop-database-url:3`, `APP_ORIGIN=https://ttworkshop-348518197526.asia-southeast1.run.app` and no public Invoker IAM binding.
- Under authenticated `gcloud run services proxy ttworkshop --tag=<new-tag>`, `GET /health` must return HTTP 200 JSON `{"status":"ok"}`, `GET /` must return 200 HTML, and the unauthenticated app API must reject requests. Capture revision, digest, and Cloud Run startup logs. Only separately authorize public IAM/traffic and prove actual synthetic business workflows and database persistence after restart **and** redeploy.

**Status:** Issue #46 authorized and OPEN; LOCAL FIX CANDIDATE TESTED; FORMAL REVIEW, MERGE, RELEASE AND PUBLIC DEPLOY NOT PERFORMED. Do not update original #32/#33 Kanban to Done on this basis.
