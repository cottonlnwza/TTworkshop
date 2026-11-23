# TTworkshop

> **Lab 5 verified snapshot (2026-11-21):** The public
> [TTworkshop service](https://ttworkshop-xue6vtucgq-as.a.run.app) runs
> `/health` at Ready revision `ttworkshop-c05d1121072250` (100% traffic).
> [Issue #32](https://github.com/cottonlnwza/TTworkshop/issues/32) records real
> Organizer publication, Participant registration and capacity rejection
> (C-04) and the **same persisted records after new-container start and
> redeploy** (C-05). This is a **manually deployed older image**, not the current
> source release. Independently reviewed
> [PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56) merged into
> `main@e53be24a944ec0da10fcf2738a7d4b0c727c7f88`; its
> [CI passed](https://github.com/cottonlnwza/TTworkshop/actions/runs/44904836406).
> WIF and deployment Secret **names** exist, but `deploy-main.yml` has **zero
> actual runs**: C-06 is **NOT VERIFIED**. See the
> [current Lab 5 evidence index](docs/labs/lab-05/evidence-index.md) and
> [operator-gated deployment runbook](docs/labs/lab-05/deployment.md).
> Older dated snapshots below are historical.

CPE334 Software Engineering project — A full-stack University Workshop Registration and Attendance System featuring event management, student registration, capacity control, check-in, and attendance reporting. Developed using Spec-Driven Development, TDD, and peer code reviews.

**Deliverable 2:** See the [versioned evidence and readiness record](docs/releases/d2-integrated-candidate.md) for staging, the current Cloud Run baseline and the D2 release gates. [Traceability](docs/traceability.md#5e-deliverable-2-requirement-to-evidence-matrix) identifies the test files and results for each requirement.

## Implemented feature slices

### F-01 — Authentication, sessions and role authorization (Issue #3)

Real browser UI → Express API → PostgreSQL login/session persistence. Roles are derived from the server-side session; session tokens are stored as digests and logout revokes the session.

### F-02 — Organizer Workshop Draft & Publish (Issue #12)

Organizer-only Draft creation, owner-scoped Draft listing/detail/update, and transaction-safe DRAFT → PUBLISHED workflow with server-side field/time/capacity/deadline validation.

### F-03 — Published Workshop Discovery & Capacity-Safe Registration (Issue #5)

Authenticated Participants can browse only PUBLISHED workshops and view current availability. Registration creates a persistent ACTIVE row using the session identity. PostgreSQL serializes competing registrations for a Workshop row and enforces one ACTIVE registration per Participant/Workshop with a partial unique index. Deadline checks use `COALESCE(registration_deadline, starts_at)` and reject at `now >= effective_deadline`. Manual closure, cancellation, registration history and attendance remain outside F-03.

**F-04 Registration Views / Ownership (Issue #6):** Implemented and integrated into `sprint_1_staging` through [merged PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20) on 2026-11-12 (actual staging merge `458a4a097f110f4eeba25a3bdabca6d5fe04f943`). Includes Participant-own registration list/detail, Organizer-owned published workshop roster, safe 401/403/404, strict privacy and cursor pagination. Historical pre-implementation `Approved for Implementation Only` review on specification HEAD `6c6b0275585c6bc3f44dfbcc37b9bb6c99318316` does not describe its present integration state. Subsequent independent review, merge and original Issue #6 completion are recorded in [PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20) and [Issue #6](https://github.com/cottonlnwza/TTworkshop/issues/6). Author-local evidence on integrated staging `f5938c7dc8836cbce3616e9d48ec4a9b0c273fe4`: 103/103 full tests across 13 files, TypeScript/Vite build PASS, with real isolated PostgreSQL/Chrome; hosted CI is not claimed. **D1 release to `main` completed** via independently reviewed [PR #26](https://github.com/cottonlnwza/TTworkshop/pull/26), merge `3f5ec15a1bc2a94d1b16003e1baa531dff4a7256`; [Issue #25](https://github.com/cottonlnwza/TTworkshop/issues/25) was closed after Author post-merge verification (103/103 local PostgreSQL/Chrome tests PASS). This does not establish Lab 5 CI, cloud deployment or LEB2 submission.

### Sprint 3 Pre-Implementation Contracts (`P2-C2`, Issue #70 — Staged & Closed)

- [Issue #70 (`P2-C2`)](https://github.com/cottonlnwza/TTworkshop/issues/70) / [merged PR #78](https://github.com/cottonlnwza/TTworkshop/pull/78) (`sprint_2_staging@35b7ad24`, Hosted CI Run `#45188424747` SUCCESS, 6/6 independent approval, **CLOSED / Done**) established the Sprint 3 contracts (18 AC ↔ STS pairs): [`F-08` Event Attendance Check-in](docs/contracts/f-08-check-in.md) (9 AC/STS, Impl [#71](https://github.com/cottonlnwza/TTworkshop/issues/71), zero new migrations), [`F-09` Workshop Filtering & Attendance Reporting](docs/contracts/f-09-filtering-attendance-reporting.md) (9 AC/STS, planned Sprint 3 `P3-01`/`P3-02`, zero new migrations), and [`DEC-09`](docs/decisions/dec-09-checkin-reporting-filtering.md).

### F-08 — Event Attendance Check-in (Issue #71 / PR #79, Staged & Verified)

[Issue #71 (`P2-07`)](https://github.com/cottonlnwza/TTworkshop/issues/71) / [PR #79](https://github.com/cottonlnwza/TTworkshop/pull/79) implements owning-Organizer one-time attendance check-in (`POST /api/v1/organizer/workshops/:workshopId/registrations/:registrationId/check-in`) reusing `registrations.checked_in_at TIMESTAMPTZ` from `004_registrations.sql` (**zero new DB migrations**), enforcing `workshops → registrations` `FOR UPDATE` lock order, post-lock PostgreSQL `TIMESTAMPTZ` inclusive `[starts_at, ends_at]` evaluation (`409 CHECKIN_WINDOW_CLOSED`, `409 ALREADY_CHECKED_IN`, `409 INVALID_STATE`), `Cache-Control: no-store` before JSON body parsing and on `400 VALIDATION` parser errors (`R-02`), `checked_in_at` visibility on Organizer rosters (preserving `WD-F04-01` zero-PII 6-key minimization per `DEC-09` §1.5) and Participant views, plus Organizer `Check in` (disabling all eligible check-in buttons while pending, `R-01`) and Participant `Checked in` (cancel-disabled) UI states. Author-local TDD RED (`f18435d7`) → GREEN (`69d19937`) → Round 2 fix (`759d53a6`) passes `9/9` `STS-F08-01`–`09` + `R-01`/`R-02`, `189/189` Vitest (32 files including Chromium E2E), `41/41` Python, and `npm run build` (`272ms`); Independent review and staging merge finished at `bcac8e76`. [Hosted CI on the staging version](https://github.com/cottonlnwza/TTworkshop/actions/runs/45200353851) passed. The integrated D2 main release and production verification are pending. See [`docs/evidence/p2-07-f08.md`](docs/evidence/p2-07-f08.md). `F-09` remains `PLANNED / NOT EXECUTED`.

### Requirements

- Node.js 22.12+ (verified on Node.js 25.8.0), npm, PostgreSQL 15+ (verified on 15.15), and a current Chrome/Chromium browser for browser E2E tests.
- A **local PostgreSQL database**, not a mocked/in-memory DB. Docker is optional for this local slice; hosted CI/CD, Docker and GCP are later Lab 5 deliverables.
- Use only synthetic demo identities and a non-production password. **Do not commit `.env` or password values.**

### Setup

1. Run `npm ci`.
2. Create one local development database (for example `ttworkshop_demo`) and two **dedicated test-only** databases named `ttworkshop_test` and `ttworkshop_seed_test`. Use your own DB user and port. The test suite checks each test URL against its exact database name and loopback server before destructive setup.
3. Set shell variables (replace `<db-user>` and `<port>`):

   `DATABASE_URL=postgresql://<db-user>@127.0.0.1:<port>/ttworkshop_demo`

   `APP_ORIGIN=http://localhost:5173`

   `PORT=3000`

   The API and Vite URLs must use the **same hostname**. The API checks the browser Origin on mutating requests to defend against CSRF; it intentionally rejects missing/foreign Origin headers.

4. Run `npm run db:migrate`. Set a synthetic local `SEED_PASSWORD` (minimum 12 characters), then run `npm run db:seed`. This creates two Participants and two Organizers at `participant.a@example.test`, `participant.b@example.test`, `organizer.a@example.test` and `organizer.b@example.test`. All share your locally chosen demo seed password; no real person/account is used.
5. Run `npm run dev:api` in one terminal and `npm run dev:web` in another. Open `http://localhost:5173`. The frontend proxies `/api` requests to port 3000. Sign in with a seeded Participant to browse/register for the published seed workshop, or an Organizer to manage Drafts and publication.

### Checks and contract evidence

- `PG_TEST_URL=postgresql://<db-user>@127.0.0.1:<port>/ttworkshop_test npm test` — real PostgreSQL API/integration, React UI, and headless **Chrome** E2E tests, including F-03 deadline boundaries, 10-request last-seat concurrency, F-04 Organizer/Participant journey and API-process restart persistence. `PG_SEED_TEST_URL` must point to exact `/ttworkshop_seed_test` for the isolated seed-idempotency test. Tests verify the actual PostgreSQL database and loopback server **before any destructive setup**. A marker in URL query parameters cannot bypass this protection. Browser tests use isolated local ports 15173/15174/15175; you may set `CHROME_PATH` if Chrome is installed elsewhere.
- `npm run build` — strict TypeScript checking and production Vite frontend bundle.
- `npm audit --omit=dev --audit-level=high` — production dependency audit (not a substitute for code/security review).
- Test migration is idempotent; the tests **TRUNCATE `sessions` and `users` in `ttworkshop_test`**, never point `PG_TEST_URL` at live/product data. Never override the exact-database/loopback guard to run a test against a non-test database.

Implementation decisions and evidence: [DEC-10 for F-01](docs/decisions/dec-10-f01.md), [DEC-11 discovery access](docs/decisions/dec-11-published-workshop-discovery-access.md), [DEC-12 concurrency target](docs/decisions/dec-12-registration-concurrency-target.md), [F-01 evidence](docs/evidence/p1-03-f01.md), [F-03 evidence](docs/evidence/p1-05-f03.md), and [F-04 evidence](docs/evidence/p1-06-f04.md). Feature contracts: [F-01](docs/contracts/f-01-auth.md), [F-02](docs/contracts/f-02-workshop-publish.md), [F-03](docs/contracts/f-03-discovery-registration.md), [F-04](docs/contracts/f-04-registration-views.md).

**F-03 staging status (2026-11-09):** [PR #15](https://github.com/cottonlnwza/TTworkshop/pull/15) received Formal APPROVE from `cottonlnwza` on exact feature HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6` and was merged into `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`. The Author verified that exact merge commit in a temporary detached worktree: `git diff --check` PASS, `npm run build` PASS, and `npm test` 69/69 PASS across 9 test files (F-03: 21/21). These are Author-run local results, not hosted CI or an independent Reviewer test rerun. See the [Formal APPROVE](https://github.com/cottonlnwza/TTworkshop/pull/15#pullrequestreview-5814213834), [Issue #5 post-merge verification](https://github.com/cottonlnwza/TTworkshop/issues/5#issuecomment-6724013761), and [F-03 evidence](docs/evidence/p1-05-f03.md). This is scoped F-03 staging acceptance only; global SRS/System SDS and instructor approval are not implied. F-04 later merged into staging via PR #20 on 2026-11-12; that newer milestone does not rewrite the dated F-03 (2026-11-09) verification. Separately reviewed D1 staging-to-main release (Issue #25), production deployment and hosted CI are not claimed as completed.

## Lab 5 CI quality gate (Issue #30, Period 2)

The CI implementation merged through [PR #36](https://github.com/cottonlnwza/TTworkshop/pull/36) into `sprint_2_staging@5c31095f32880f3b575ee29ada0710795673a6df`. [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pull requests to `sprint_2_staging` and `main` and pushes to those branches. It installs locked Node dependencies, builds the TypeScript/Vite application and runs the real PostgreSQL and Chromium integration tests against disposable job-local test databases. It has no access to deployed data or production credentials. Test output is retained with the associated GitHub Actions run.

The CI job name is **`build-test`**. For `sprint_2_staging`, actual GitHub Branch Protection now **requires** `build-test`, an independent PR approval (at least one), up-to-date checks and no unresolved review conversations; protections also apply to repository administrators and dismiss stale approvals. These settings were explicitly authorized and verified via GitHub API under Issue #30. The protected [Red CI run #43409562242](https://github.com/cottonlnwza/TTworkshop/actions/runs/43409562242) failed on an intentionally invalid *test-only* database URL and PR #36 was `blocked`, while the corrected [Green CI run #43410138024](https://github.com/cottonlnwza/TTworkshop/actions/runs/43410138024) passed all 103/103 tests. **A green check does not substitute for independent Formal Review or separately authorized teammate Merge.** Cloud deployment, Docker and release automation are separately scoped Lab 5 Issues #31–#33. See [CI evidence and limits](docs/evidence/l5-01-ci.md).

## Lab 5 Docker runtime (Issue #31, Period 2)

Issue #31 adds a local-development Docker Compose stack with three services: PostgreSQL 15, the Node/Express API, and the Vite/React UI. Images are built from a digest-pinned Node 22 base with `npm ci` and strict TypeScript/Vite build; PostgreSQL 15 uses a pinned digest. The DB is an internal-only container service with a persistent named volume. The UI is published **only to host loopback** (`127.0.0.1`), and API/DB are not exposed directly to the host.

1. Install and start Docker Desktop (or a compatible Docker daemon). Copy `.env.docker.example` to `.env` (never commit `.env`) and replace `TTW_DB_PASSWORD` with a **random synthetic local secret**. It is not a production database password. If port 5173 is in use, change `TTW_WEB_PORT` (e.g. `18173`). No cloud credentials are needed.
2. Run `docker compose config --quiet`, `docker compose build` and `docker compose up -d --wait --wait-timeout 120`. Visit `http://localhost:${TTW_WEB_PORT:-5173}` with the concrete configured port. `docker compose ps` should show `db`, `api` and `web` all healthy. The API initializes idempotent database migrations on startup; its `/health` reports 503 when PostgreSQL is unreachable. `APP_HOST=0.0.0.0` is set **only** in the container; ordinary local development defaults to `127.0.0.1`.
3. To use disposable **synthetic** demo accounts only, choose a separate random shell value `SEED_PASSWORD` of at least 12 characters. Execute `docker compose run --rm -T -e SEED_PASSWORD="$SEED_PASSWORD" api node ./node_modules/tsx/dist/cli.mjs scripts/seed.ts` once. Never use this demo seed on real accounts or production data. Seeded identities are listed above. Run `APP_ORIGIN=http://localhost:<configured-port> SEED_PASSWORD="$SEED_PASSWORD" node scripts/docker-smoke.mjs` and (with Chrome installed locally) `APP_ORIGIN=... SEED_PASSWORD=... node scripts/docker-browser-smoke.mjs` after `npm ci` on the host. These scripts check real HTTP interactions through the Compose UI proxy and a real browser respectively.
4. Capture the `SMOKE_PASS <title>` output. Run `docker compose restart`, then `docker compose up -d --wait --wait-timeout 120`, and `APP_ORIGIN=... SEED_PASSWORD=... node scripts/docker-smoke.mjs --verify <title>` to verify the workshop persists in the database volume. Run `docker compose down` to stop safely **without deleting data**. To intentionally reset all local demo data, use `docker compose down -v` (**destructive**; only for this disposable stack). To rebuild from a clean checkout, copy only the non-secret `.env` configuration or set environment variables anew and rerun build/up/smoke. Run `docker image inspect ttworkshop-l5-api ttworkshop-l5-web` to capture image IDs/digests.

The browser endpoint is for localhost development only; this stack is **not** an HTTPS production/GCP deployment and does not implement Lab 5 cloud/release Issues #32–#33. For exact test evidence and limitations, see [L5-02 Docker evidence](docs/evidence/l5-02-docker.md).

## Lab 5 GCP public deployment and historical private preflight (Issues #32 and #46)

**Current (2026-11-21):** The public UI/API/Cloud SQL workflow and C-05
record persistence are verified on the operator-manually deployed image.
Reviewed [PR #50](https://github.com/cottonlnwza/TTworkshop/pull/50) and
[PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56) have **merged**.
The protected GitHub Actions deployment has **not run**, so C-06 remains open.
The following is a dated 19 November snapshot, not current state.

**Historical observation (2026-11-19; superseded by public deployment):**
Cloud Run service `ttworkshop` exists **privately** in
`cpe334-ttworkshop/asia-southeast1`, backed by Cloud SQL and runtime Secret
`ttworkshop-database-url:3`. Its independently reviewed `main` image digest
is `sha256:4731ee4424ca08fe82e1c5de65b574f80aa151fadd96e1f883cc67c13eacded2`.
Revision `ttworkshop-00001-hix` takes 100% **private** traffic; revision
`ttworkshop-00002-fin` is Ready, tagged `preflight-v2`, with 0% default
traffic and the actual HTTPS `APP_ORIGIN`. Cloud Run IAM does not include
`allUsers`. PostgreSQL migration and least-privilege checks passed, and
private proxy `/` returned HTML 200 while `/api/v1/workshops` returned 401.
Cloud Run intercepts `/healthz` with a frontend 404; `/healthz/` responded
200 `{"status":"ok"}` on the **older deployed image**. [Fix Issue #46](https://github.com/cottonlnwza/TTworkshop/issues/46)
was independently reviewed and **MERGED** into `sprint_2_staging` by
[PR #48](https://github.com/cottonlnwza/TTworkshop/pull/48) at
`60887f6e416a2e12d744b0741ab2f94d6e4cf8e1`; its code, Compose health
check and read-only smoke probes now use **`/health`**. The post-merge
[CI #44569902236](https://github.com/cottonlnwza/TTworkshop/actions/runs/44569902236)
passed 134/134 Vitest and 7/7 Python smoke tests. **Issue #49 is the
independent Release PR preparation to bring that reviewed fix into `main`;
it is not a new production release or a GCP deployment.** The revised image
is **NOT BUILT OR DEPLOYED**, and `main` remains at its older source SHA until
a separately authorized, independently reviewed Merge. After such a release,
change the Cloud Run startup probe to `/health`, deploy a
new immutable image to a **private tagged revision**, and verify authenticated
HTTPS `GET /health` = 200 `{"status":"ok"}` before shifting any traffic.
Public access, end-to-end authentication/registration, restart/redeploy
persistence and LEB2 submission remain **NOT VERIFIED**; original Issues
#32 and #33 are still OPEN and must not be marked complete from a source
Merge alone. The currently configured manual `main` deployment workflow
changes the existing Cloud Run service and executes a migration Job; do **not**
dispatch it without separate explicit human command review and release/deploy
authorization. See [Lab 5 deployment procedure](docs/labs/lab-05/deployment.md)
and [Issue #49 release candidate](docs/releases/lab5-issue49-health-main-candidate.md).

The proposed production layout is a single Cloud Run Node container serving
the prebuilt Vite UI and same-origin API, backed by durable Cloud SQL PostgreSQL.
**Historical status (2026-11-16, Asia/Bangkok; Issue #32 / Draft PR #42):**
The student/operator created Cloud SQL PostgreSQL 16 `ttworkshop-pg` and DB
`ttworkshop`, runtime `ttworkshop_app` and its separate Service Account and
`ttworkshop-database-url:1` Secret. The student subsequently created NOLOGIN
roles `ttworkshop_runtime` and `ttworkshop_migration`, the `ttworkshop_migrator`
login with restricted migration-role membership, dedicated migration Service
Account `ttworkshop-migrator-runner` (project `roles/cloudsql.client`) and
`ttworkshop-migrator-url:1` Secret with a **Secret-level** Accessor grant.
Operator-provided read-only SQL verified the migrator is not a
`cloudsqlsuperuser` and cannot `CREATEDB`/`CREATEROLE`; Author AI verified
GCP user/Secret version/IAM **metadata only, without reading Secret values**.
The existing app login `ttworkshop_app` **still has `cloudsqlsuperuser`**, so
live runtime least privilege is **NOT VERIFIED**. Secret URI/password validity,
actual database login, migrations, Cloud Run Job/service, public HTTPS URL and
restart/redeploy persistence are **NOT VERIFIED / NOT DEPLOYED**. Cloud SQL
remains RUNNABLE and consumes Free Trial credits; budget alerts do not cap spend.
This dated snapshot superseded the 2026-11-15 pre-provisioning evidence
at the time; the live 2026-11-19 state above now supersedes it. In production set `SERVE_WEB=true`,
`NODE_ENV=production`, `APP_HOST=0.0.0.0`, `PORT=8080`,
`APP_ORIGIN` to the *real* public HTTPS origin and inject
`DATABASE_URL` securely via Secret Manager. No credentials belong in Git.

The existing local Docker Compose development stack is unchanged. The
production `/health` handler mounts **before** the SPA catch-all (repair
for the independent 2026-11-16 Formal `CHANGES_REQUESTED`); the same route
composer used by `api/server.ts` is tested under `SERVE_WEB=true` for
DB-ready JSON `200`, DB-unavailable JSON `503`, static HTML and API paths.
Run `npx vitest run tests/production-health-routing.unit.test.ts tests/web-static.unit.test.ts` and
`node scripts/cloud-preflight.mjs`, and the read-only smoke script's independent
Python checks with `python3 -m unittest discover -s tests -p 'test_cloud_smoke.py' -v`.
These checks are **not** proof of live GCP deployment or data persistence.

Read the [L5-03 live provisioning evidence and outstanding deployment gates](docs/evidence/l5-03-gcp-preflight.md)
and the [Lab 5 deployment procedure](docs/labs/lab-05/deployment.md).
Actual Cloud deployment and release require separate authorization; release
of `main` belongs to Issue #33.

**Approved preparation / not a live deployment:** `scripts/cloud-db-check.ts`
performs only a single read-only `SELECT` to verify the intended database and
user when run **later** in a human-reviewed Cloud Run Job with Secret Manager
injection. It suppresses driver error details to avoid logging credentials.
`tests/cloud-db-check.unit.test.ts` verifies this check without connecting to
GCP. The probe supports an explicit `ttworkshop_migrator` expected identity
without exposing the migration Secret, but **it has not run against Cloud SQL**.
The [exact proposed cloud commands and mandatory student review gates](deploy/command-review.md)
are recorded for Artifact Registry, build by immutable SHA, Cloud Run DB probe,
versioned migrations and service setup. **None of those proposed cloud
commands have been executed**, and the course requires reviewed staging →
`main` release before deploying the accepted application.

**Reviewer `CHANGES_REQUESTED` remediation (2026-11-15):** production API
startup now verifies `schema_migrations` with a read-only `SELECT`, failing
closed if required versions are missing/extra; it does not execute DDL. The
separate `scripts/migrate.ts` entrypoint runs transaction-based migrations
under a distinct, operator-created migration-only identity and now redacts driver errors.
Existing development/test startup migration behavior remains unchanged.
Unit tests and isolated-PostgreSQL integration tests cover clean schema,
repeat migration/startup and failure cases. See [proposed role separation and
DB privilege audit](deploy/db-role-review.md) for the still-unexecuted **runtime**
table/sequence grants and removal of `cloudsqlsuperuser` from the live app user.
**The student has provisioned migration roles, user, SA and Secret; the Author
AI only verified their metadata and updated source/docs.** No migration job,
schema DDL, production runtime privilege reduction, live connectivity test or
Cloud Run deployment has occurred.

## Lab 6 Part A — Sprint 1 UAT test plan and safe handoff (Issue #59, Period 2)

[Issue #59](https://github.com/cottonlnwza/TTworkshop/issues/59) delivers the **Part A Sprint 1 UAT Test Plan and Safe Handoff Package** in [`docs/labs/lab-06/uat-plan-and-handoff.md`](docs/labs/lab-06/uat-plan-and-handoff.md). It defines six executable UAT test cases (`UAT-S1-01` through `UAT-S1-06`) mapped to the Sprint 1 feature contracts (`F-01`–`F-04`, 43 AC ↔ 43 STS) across all four required Lab 6 §3.1 categories (normal domain journey, business-rule/boundary, forbidden role/ownership, and state/history/persistence), along with deployed Cloud Run revision provenance (`https://ttworkshop-xue6vtucgq-as.a.run.app`, Ready revision `ttworkshop-c05d1121072250`), safe synthetic test account labels (zero passwords or secrets in Git), execution ordering, non-destructive setup/cleanup instructions, and recording templates for independent partner UAT execution (Part B), defect reporting/triage (Part C), and retest/acceptance (Part D). Independent partner UAT execution, defect triage, and final Sprint 1 acceptance remain pending partner handoff exchange.

## Lab 6 Parts B–D — Independent UAT Defect Triage & TDD Resolution (Issue #63, Period 2; TH-038 Retest Accepted)

[Issue #63](https://github.com/cottonlnwza/TTworkshop/issues/63) records the completed reciprocal Part B UAT exchange with partner team **TH-038** (`chaproi/club-expense-approval`), Part C triage of genuine defect **`DEF-TTW-TH038-01`** (`POST /api/v1/auth/login` returning `HTTP 500` on NUL byte / malformed control characters in `email`, violating `AC-F01-08`), and the Part D TDD **RED → GREEN** fix in `api/app.ts` and `tests/auth.integration.test.ts` (see [`docs/labs/lab-06/defect-triage-and-resolution.md`](docs/labs/lab-06/defect-triage-and-resolution.md)). [PR #65](https://github.com/cottonlnwza/TTworkshop/pull/65) released the reviewed fix at `main@4efbcfa`. [TH-038 retested and accepted Sprint 1](https://github.com/cottonlnwza/TTworkshop/issues/63#issuecomment-7094316414) on deployed revision `ttworkshop-00017-poy`.

## Sprint 2 Pre-Implementation Feature Contracts (`P2-C1` / Issue #66, Period 2 — Staged)

[Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) / [merged PR #74](https://github.com/cottonlnwza/TTworkshop/pull/74) (`sprint_2_staging@292e4b59`) established the reviewed pre-implementation engineering contracts and scoped policy decisions for all Sprint 2 features before Sprint 2 coding began (Deliverable 2 Part B):
- **Feature contracts (29 AC ↔ STS pairs):** [`F-05` Cancellation & Re-registration](docs/contracts/f-05-cancellation.md) (10 AC/STS, Impl [#67](https://github.com/cottonlnwza/TTworkshop/issues/67)), [`F-06` Deadline & Manual Closure/Reopen](docs/contracts/f-06-deadline-manual-closure.md) (9 AC/STS, migration `005`, planned Impl [#68](https://github.com/cottonlnwza/TTworkshop/issues/68)), and [`F-07` Published Workshop Editing & Capacity Guard](docs/contracts/f-07-workshop-editing-capacity.md) (10 AC/STS, planned Impl [#69](https://github.com/cottonlnwza/TTworkshop/issues/69)).
- **Scoped decisions:** [`DEC-05`](docs/decisions/dec-05-manual-closure.md), [`DEC-06`](docs/decisions/dec-06-cancellation-policy.md), [`DEC-07`](docs/decisions/dec-07-published-workshop-editing.md) (`REV-S2-01`), and [`DEC-08`](docs/decisions/dec-08-capacity-guard.md).

### F-05 — Registration Cancellation & Re-registration (Issue #67, Staged & Closed)

[Issue #67 (`P2-03`)](https://github.com/cottonlnwza/TTworkshop/issues/67) / [merged PR #75](https://github.com/cottonlnwza/TTworkshop/pull/75) (`sprint_2_staging@aa612d53`; Stage B `STS-F05-06` verified on `sprint_2_staging@6c8b4f3a`, **CLOSED / Done**) delivers Participant self-cancellation (`POST /api/v1/me/registrations/:id/cancel`) before the effective deadline (`COALESCE(registration_deadline, starts_at)`), retaining `CANCELLED` + `cancelled_at` history without row deletion or new DB migrations, exposing `cancelled_at` across Participant views and privacy-minimized Organizer rosters (`WD-F04-01`), and enabling eligible re-registration (`BR-12`) under PostgreSQL row locking and partial unique indexing (`004_registrations.sql`). See [`docs/evidence/p2-03-f05.md`](docs/evidence/p2-03-f05.md).

### F-06 — Registration Deadline Management & Manual Closure/Reopen (Issue #68, Staged & Closed)

[Issue #68 (`P2-04`)](https://github.com/cottonlnwza/TTworkshop/issues/68) / [merged PR #76](https://github.com/cottonlnwza/TTworkshop/pull/76) (`sprint_2_staging@6c8b4f3a`, Hosted CI Run `#45166812414` SUCCESS, 6/6 independent approval, **CLOSED / Done**) adds versioned SQL migration [`db/migrations/005_workshop_manual_closure.sql`](db/migrations/005_workshop_manual_closure.sql) (`workshops.registration_closed BOOLEAN NOT NULL DEFAULT false`), Organizer manual close/reopen endpoints (`/close-registration`, `/reopen-registration` enforcing `BR-11`), published deadline updates (`/registration-deadline` enforcing `BR-08`), `409 REGISTRATION_CLOSED` enforcement on new registrations while keeping timely `ACTIVE` cancellation allowed (`BR-10`), and Organizer/Participant list/detail UI controls. See [`docs/evidence/p2-04-f06.md`](docs/evidence/p2-04-f06.md).

### F-07 — Published Workshop Editing & Atomic Capacity Guard (Issue #69, Staged & Closed)

[Issue #69 (`P2-05`)](https://github.com/cottonlnwza/TTworkshop/issues/69) / [PR #77](https://github.com/cottonlnwza/TTworkshop/pull/77) implements lifecycle-aware `PATCH /api/v1/organizer/workshops/:id` (`DEC-07` / `REV-S2-01` & `DEC-08`) with PostgreSQL `FOR UPDATE` row locking, post-lock `TIMESTAMPTZ` start/end guard evaluation (`R-03`), full storage-precision preservation/comparison on partial updates (`R-01`), atomic `capacity >= active_count` enforcement (`409 CAPACITY_BELOW_ACTIVE`, excluding `CANCELLED` rows), schedule/ended locks (`409 SCHEDULE_LOCKED` / `409 WORKSHOP_ENDED`), immutable-field protection (`400 VALIDATION`), authoritative `active_registrations_count`, Organizer `Edit workshop` UI, and Participant visible `Registration deadline` in discovery & detail (`R-02`, zero new DB migrations). Author-local Round 3 evidence (`ba8c6d28`): 10/10 `F-07` STS + `R-01`/`R-02`/`R-03` PASS (`15/15` F-07 tests; `177/177` full Vitest suite; `41/41` Python; build PASS; see [`docs/evidence/p2-05-f07.md`](docs/evidence/p2-05-f07.md)). [PR #77](https://github.com/cottonlnwza/TTworkshop/pull/77) was independently approved and merged at `07eaf1a`. [Hosted CI on the staging merge](https://github.com/cottonlnwza/TTworkshop/actions/runs/45176868918) passed and Issue #69 is closed. This is the pinned source for the [Sprint 2 release checkpoint](docs/releases/d2-sprint2-checkpoint.md).
