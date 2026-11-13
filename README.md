# TTworkshop
CPE334 Software Engineering project — A full-stack University Workshop Registration and Attendance System featuring event management, student registration, capacity control, check-in, and attendance reporting. Developed using Spec-Driven Development, TDD, and peer code reviews.

## Implemented feature slices

### F-01 — Authentication, sessions and role authorization (Issue #3)

Real browser UI → Express API → PostgreSQL login/session persistence. Roles are derived from the server-side session; session tokens are stored as digests and logout revokes the session.

### F-02 — Organizer Workshop Draft & Publish (Issue #12)

Organizer-only Draft creation, owner-scoped Draft listing/detail/update, and transaction-safe DRAFT → PUBLISHED workflow with server-side field/time/capacity/deadline validation.

### F-03 — Published Workshop Discovery & Capacity-Safe Registration (Issue #5)

Authenticated Participants can browse only PUBLISHED workshops and view current availability. Registration creates a persistent ACTIVE row using the session identity. PostgreSQL serializes competing registrations for a Workshop row and enforces one ACTIVE registration per Participant/Workshop with a partial unique index. Deadline checks use `COALESCE(registration_deadline, starts_at)` and reject at `now >= effective_deadline`. Manual closure, cancellation, registration history and attendance remain outside F-03.

**F-04 Registration Views / Ownership (Issue #6):** Implemented and integrated into `sprint_1_staging` through [merged PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20) on 2026-11-12 (actual staging merge `458a4a097f110f4eeba25a3bdabca6d5fe04f943`). Includes Participant-own registration list/detail, Organizer-owned published workshop roster, safe 401/403/404, strict privacy and cursor pagination. Historical pre-implementation `Approved for Implementation Only` review on specification HEAD `6c6b0275585c6bc3f44dfbcc37b9bb6c99318316` does not describe its present integration state. Subsequent independent review, merge and original Issue #6 completion are recorded in [PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20) and [Issue #6](https://github.com/cottonlnwza/TTworkshop/issues/6). Author-local evidence on integrated staging `f5938c7dc8836cbce3616e9d48ec4a9b0c273fe4`: 103/103 full tests across 13 files, TypeScript/Vite build PASS, with real isolated PostgreSQL/Chrome; hosted CI is not claimed. **D1 release to `main` completed** via independently reviewed [PR #26](https://github.com/cottonlnwza/TTworkshop/pull/26), merge `3f5ec15a1bc2a94d1b16003e1baa531dff4a7256`; [Issue #25](https://github.com/cottonlnwza/TTworkshop/issues/25) was closed after Author post-merge verification (103/103 local PostgreSQL/Chrome tests PASS). This does not establish Lab 5 CI, cloud deployment or LEB2 submission.

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
2. Run `docker compose config --quiet`, `docker compose build` and `docker compose up -d --wait --wait-timeout 120`. Visit `http://localhost:${TTW_WEB_PORT:-5173}` with the concrete configured port. `docker compose ps` should show `db`, `api` and `web` all healthy. The API initializes idempotent database migrations on startup; its `/healthz` reports 503 when PostgreSQL is unreachable. `APP_HOST=0.0.0.0` is set **only** in the container; ordinary local development defaults to `127.0.0.1`.
3. To use disposable **synthetic** demo accounts only, choose a separate random shell value `SEED_PASSWORD` of at least 12 characters. Execute `docker compose run --rm -T -e SEED_PASSWORD="$SEED_PASSWORD" api node ./node_modules/tsx/dist/cli.mjs scripts/seed.ts` once. Never use this demo seed on real accounts or production data. Seeded identities are listed above. Run `APP_ORIGIN=http://localhost:<configured-port> SEED_PASSWORD="$SEED_PASSWORD" node scripts/docker-smoke.mjs` and (with Chrome installed locally) `APP_ORIGIN=... SEED_PASSWORD=... node scripts/docker-browser-smoke.mjs` after `npm ci` on the host. These scripts check real HTTP interactions through the Compose UI proxy and a real browser respectively.
4. Capture the `SMOKE_PASS <title>` output. Run `docker compose restart`, then `docker compose up -d --wait --wait-timeout 120`, and `APP_ORIGIN=... SEED_PASSWORD=... node scripts/docker-smoke.mjs --verify <title>` to verify the workshop persists in the database volume. Run `docker compose down` to stop safely **without deleting data**. To intentionally reset all local demo data, use `docker compose down -v` (**destructive**; only for this disposable stack). To rebuild from a clean checkout, copy only the non-secret `.env` configuration or set environment variables anew and rerun build/up/smoke. Run `docker image inspect ttworkshop-l5-api ttworkshop-l5-web` to capture image IDs/digests.

The browser endpoint is for localhost development only; this stack is **not** an HTTPS production/GCP deployment and does not implement Lab 5 cloud/release Issues #32–#33. For exact test evidence and limitations, see [L5-02 Docker evidence](docs/evidence/l5-02-docker.md).
