# TTworkshop
CPE334 Software Engineering project — A full-stack University Workshop Registration and Attendance System featuring event management, student registration, capacity control, check-in, and attendance reporting. Developed using Spec-Driven Development, TDD, and peer code reviews.

## Implemented feature slices

### F-01 — Authentication, sessions and role authorization (Issue #3)

Real browser UI → Express API → PostgreSQL login/session persistence. Roles are derived from the server-side session; session tokens are stored as digests and logout revokes the session.

### F-02 — Organizer Workshop Draft & Publish (Issue #12)

Organizer-only Draft creation, owner-scoped Draft listing/detail/update, and transaction-safe DRAFT → PUBLISHED workflow with server-side field/time/capacity/deadline validation.

### F-03 — Published Workshop Discovery & Capacity-Safe Registration (Issue #5)

Authenticated Participants can browse only PUBLISHED workshops and view current availability. Registration creates a persistent ACTIVE row using the session identity. PostgreSQL serializes competing registrations for a Workshop row and enforces one ACTIVE registration per Participant/Workshop with a partial unique index. Deadline checks use `COALESCE(registration_deadline, starts_at)` and reject at `now >= effective_deadline`. Manual closure, cancellation, registration history and attendance remain outside F-03.

**F-04 Registration Views / Ownership (Issue #6):** the Independent Reviewer recorded `Approved for Implementation Only — Not Approved for Merge` on specification HEAD `8789d2dbeda3b5c0b090aa1d4c9454162da5ab53`. This PR is reconciling current-status documentation; because this documentation-only update creates a new HEAD, refreshed implementation-only confirmation on the new exact HEAD is required before TDD/code begins. F-04 implementation and tests have not started.

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

- `PG_TEST_URL=postgresql://<db-user>@127.0.0.1:<port>/ttworkshop_test npm test` — real PostgreSQL API/integration, React UI, and headless **Chrome** E2E tests, including F-03 deadline boundaries, 10-request last-seat concurrency, and API-process restart persistence. `PG_SEED_TEST_URL` must point to exact `/ttworkshop_seed_test` for the isolated seed-idempotency test. Tests verify the actual PostgreSQL database and loopback server **before any destructive setup**. A marker in URL query parameters cannot bypass this protection. Browser tests use isolated local ports 15173/15174; you may set `CHROME_PATH` if Chrome is installed elsewhere.
- `npm run build` — strict TypeScript checking and production Vite frontend bundle.
- `npm audit --omit=dev --audit-level=high` — production dependency audit (not a substitute for code/security review).
- Test migration is idempotent; the tests **TRUNCATE `sessions` and `users` in `ttworkshop_test`**, never point `PG_TEST_URL` at live/product data. Never override the exact-database/loopback guard to run a test against a non-test database.

Implementation decisions and evidence: [DEC-10 for F-01](docs/decisions/dec-10-f01.md), [DEC-11 discovery access](docs/decisions/dec-11-published-workshop-discovery-access.md), [DEC-12 concurrency target](docs/decisions/dec-12-registration-concurrency-target.md), [F-01 evidence](docs/evidence/p1-03-f01.md), and [F-03 evidence](docs/evidence/p1-05-f03.md). Feature contracts: [F-01](docs/contracts/f-01-auth.md), [F-02](docs/contracts/f-02-workshop-publish.md), [F-03](docs/contracts/f-03-discovery-registration.md).

**F-03 staging status (2026-11-09):** [PR #15](https://github.com/cottonlnwza/TTworkshop/pull/15) received Formal APPROVE from `cottonlnwza` on exact feature HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6` and was merged into `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`. The Author verified that exact merge commit in a temporary detached worktree: `git diff --check` PASS, `npm run build` PASS, and `npm test` 69/69 PASS across 9 test files (F-03: 21/21). These are Author-run local results, not hosted CI or an independent Reviewer test rerun. See the [Formal APPROVE](https://github.com/cottonlnwza/TTworkshop/pull/15#pullrequestreview-5814213834), [Issue #5 post-merge verification](https://github.com/cottonlnwza/TTworkshop/issues/5#issuecomment-6724013761), and [F-03 evidence](docs/evidence/p1-05-f03.md). This is scoped F-03 staging acceptance only; global SRS/System SDS and instructor approval are not implied. F-04 remains unimplemented; release to `main`, production deployment and hosted CI remain outside this completed F-03 slice.
