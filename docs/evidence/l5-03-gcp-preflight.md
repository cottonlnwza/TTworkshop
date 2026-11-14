# L5-03 / Issue #32 — GCP implementation preflight (NOT DEPLOYED)

**Scope:** Issue #32 only; one PR into `sprint_2_staging`. This is a source/test/documentation change. **No GCP API was enabled, no cloud resource created, no billing action, no deploy performed.** Do not check AC-L5-10..14 merely because this PR is present.

## Source and decision status

- Course: `group_work_specs_v1.pdf`, Lab 5, pp. 2, 4, 13–15. GCP deployment and persistence are **35/100 Lab 5 points**, with course deadline **2026-11-15 23:59 Asia/Bangkok**. It mentions separate access guidance that was not supplied here. No instructor-authorized region, service lineup or spending cap has been verified.
- User-reported project: `cpe334-ttworkshop`. User provided Cloud Billing Free Trial screenshots showing THB 10,133 and an Active billing account and reported project linkage; actual project-level billing IAM/API read-back remains **NOT VERIFIED**. THB 8,000 was a **hypothetical** budget, **NOT** a permission to spend.
- Proposed region (not approved): `asia-southeast1`. Proposed deployment (not approved): **one public Cloud Run service** running the already-built Node API and statically serving its Vite production UI on the same HTTPS origin, plus **Cloud SQL for PostgreSQL**, Artifact Registry and Secret Manager. One origin preserves SameSite=Strict, Secure session cookies and the application Origin check. Do not deploy Vite dev server.
- No real Cloud resources, URLs, instance names, IAM grants, secret versions, screenshot proofs, cloud migration outcomes or billed amounts have been created or verified in this PR.

## Code path prepared by this Issue

Existing `Dockerfile` builds Node/Vite from lockfile, runs unprivileged `node`. `api/server.ts` optionally attaches `dist` static production UI when `SERVE_WEB=true`, reusing `PORT`, `APP_HOST=0.0.0.0` and `NODE_ENV=production`; the current local Compose setup retains its separate Vite server and defaults. `/api` is not rewritten to SPA HTML, and missing assets are 404. The API already requires `DATABASE_URL`, `APP_ORIGIN` (HTTPS in production), runs migrations on startup, and exposes database-backed `/healthz`. For the recommended plan, use a **single** Cloud Run service, avoiding unauthenticated API-to-UI cross-origin exposure.

Offline validation: `npm ci --no-audit --no-fund`, `npm run build`, `npm test -- --run tests/web-static.unit.test.ts` (if using Vitest CLI choose `npx vitest run tests/web-static.unit.test.ts`), `node scripts/cloud-preflight.mjs`, `git diff --check`. These do **not** prove cloud ACs. Full PostgreSQL/Chromium integration CI on exact PR HEAD is a separate hosted gate.

## Deployment procedure — INFORMATION ONLY, REQUIRES NEW EXPLICIT AUTHORIZATION

1. Human verifies the official Lab 5 access handout (if any), the project's linked active billing, least-privilege deploy permissions and selected region. Agree **real** maximum spend and teardown timing; a budget notification **does not cap charges**. Estimate continuous Cloud SQL storage/instance costs and set alerts and oversight before creation. Obtain explicit grants separately for enabling APIs, creating resources/IAM and deploying.
2. After those grants only, provision minimum appropriate Cloud SQL PostgreSQL in the approved region, database/user and Secret Manager. Record actual connection name `PROJECT:REGION:INSTANCE`. Assign a dedicated Cloud Run runtime service account with only `roles/cloudsql.client` and `roles/secretmanager.secretAccessor` on exact required resources. The build/deploy identity is separate; do not commit or paste service-account keys. Restrict Cloud SQL connectivity as the approved plan requires.
3. Prepare Secret Manager secret **`DATABASE_URL`** containing an actual PostgreSQL URI for the created DB, with a URL-encoded password and unix socket host query parameter, e.g. URI pattern `postgresql://USER:REDACTED@/DB?host=%2Fcloudsql%2FPROJECT%3AREGION%3AINSTANCE`. Confirm connection string parsing in isolated test; never log full URI, store it in Git or expose it as CLI argument. Use a secured secret creation channel, not source files or PR comments.
4. Build and push reviewed exact-commit image to Artifact Registry **only after authorization**; retain digest, exact Git SHA, Cloud Build execution and costs. The existing `Dockerfile` is the build source; do not substitute the local development Compose Vite server as public production hosting.
5. Deploy reviewed immutable image digest to Cloud Run with environment settings `NODE_ENV=production`, `SERVE_WEB=true`, `APP_HOST=0.0.0.0`, `PORT=8080`, `APP_ORIGIN=https://<actual cloud-run-url>`, secret injection for `DATABASE_URL`, and Cloud SQL attachment to the recorded instance. **Caution:** Cloud Run's generated service URL is known only after creation; configure APP_ORIGIN correctly as a separate authorized update before end-user tests. Prefer tagged deployment with no public traffic until configured; public unauthenticated access and URLs require an explicit access decision. Check IAM, account permissions, ingress, egress and actual Cloud SQL socket compatibility. This document supplies **no executable deployment automation** by design, to avoid accidentally creating billable resources.
6. Check actual HTTPS UI, built assets, `/healthz`, API auth, Organizer publish, Participant register, roster/privacy, duplicate/full 409 rejection, and negative ownership/origin tests using disposable accounts. Record specific URL, SHA, image digest, revision, UTC/timezone, commands, HTTP responses (redacted) and sanitized screenshots.
7. Record a synthetic workshop/registration ID; force a **real service restart/new revision deployment** without resetting Cloud SQL, and read back the same rows through the application after each transition. Check Cloud SQL backups/restore and schema-migration rollback plan; application migration is idempotent but destructive DB rollback must not be guessed. If failure, halt traffic shift and roll back to the previously verified Cloud Run revision only under deployment authorization. Retain data and logs according to grading requirements.
8. After permitted evidence collection, explicitly agree keep-running vs stop/delete resources and its cost impact. Deletion of persistent storage is destructive: never delete Cloud SQL or backup without separate approval. After separately approved independent six-axis review/merge, Author re-verifies the merged SHA and updates Issue/Project only under completion grants. `main` release is Issue #33, not #32.

### Required evidence matrix

| AC | Current status | Missing live gate |
| --- | --- | --- |
| AC-L5-10 | PARTIAL: user screenshots; repo preflight | project billing linkage/API/IAM, official cloud rules, real spend authorization |
| AC-L5-11 | NOT VERIFIED | HTTPS Cloud Run URL, deployed image digest, UI/API/PostgreSQL real journey |
| AC-L5-12 | NOT VERIFIED | actual restart + redeploy with durable Cloud SQL query proof |
| AC-L5-13 | PARTIAL: source/test security plan | real IAM/Secret Manager permissions, rollback and log evidence |
| AC-L5-14 | PARTIAL: current docs explicitly pre-deployment | verified deployed version/URL/test record only after real deployment |

**Next responsible action:** human separately authorizes project-level read-back, real spend ceiling and actual cloud mutations/deployment; independent reviewer later reviews the resulting exact PR HEAD. **No automatic merge, Cloud provisioning or course submission.**

Official Google Cloud background (not instructor rules): https://docs.cloud.google.com/sql/docs/postgres/connect-run ; https://docs.cloud.google.com/run/docs/configuring/services/secrets

## Author-local test transcript (2026-11-14, Asia/Bangkok; pre-PR branch)

- `npm ci --no-audit --no-fund`: **PASS**, 229 packages.
- `npm run build`: **PASS**, TypeScript and Vite production assets emitted.
- `npx vitest run tests/web-static.unit.test.ts`: **PASS**, 1 test file, 4/4 tests (same-origin static SPA, static asset 404, API isolation and methods).
- `node scripts/cloud-preflight.mjs`: **PASS** offline only; proves no cloud operations.
- `docker build --pull=false -t ttworkshop-l5-03-preflight:local .`: **PASS**, local image ID `sha256:fb4415fe31fc769a53ffe84a4ae9ed043ea1aa258b82b87f8d2ce941aad44e49`. This is not a published image digest or GCP build.
- Full `npm test -- --reporter=dot` first failed because `PG_TEST_URL` and `PG_SEED_TEST_URL` were absent. Retried against a **disposable** Postgres 15 container with loopback published TCP port and dedicated databases; the test safety guard correctly refused destructive database operations because `host(inet_server_addr())` returned a non-loopback **container internal IP**. Result: **8 failed files**, 6 passed files, **42 passed / 65 skipped** test cases. The ephemeral container was stopped. This is **NOT FULL REGRESSION PASS**. Do not loosen the guard or point tests at a development/production DB. The existing hosted GitHub Actions `build-test` job has a properly isolated PostgreSQL service and must be verified on exact PR HEAD before independent approval.
- `git diff --check`: **PASS** on working changes. GitHub CI, reviewer decision, staging merge, GCP deployment, public URL and persistence are not yet verified.

The first full-suite failure was due to missing dedicated database environment; the retry was blocked by test-database loopback enforcement, not attributed to this Issue's new feature code. This distinction is preserved as a limitation, not claimed PASS.
