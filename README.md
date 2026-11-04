# TTworkshop
CPE334 Software Engineering project — A full-stack University Workshop Registration and Attendance System featuring event management, student registration, capacity control, check-in, and attendance reporting. Developed using Spec-Driven Development, TDD, and peer code reviews.

## F-01 — Local authentication slice (Issue #3)

This increment implements **real** browser UI → Express API → PostgreSQL persistence for session/login/role checks only. **Workshop creation, discovery, registration and attendance are NOT implemented yet.** The reserved protected POST routes return `501 NOT_IMPLEMENTED` for the correct role, `403` for the wrong role, and `401` for an unauthenticated caller. They never mutate Workshop or Registration records.

### Requirements

- Node.js 22.12+ (verified on Node.js 25.8.0), npm, PostgreSQL 15+ (verified on 15.15), and a current Chrome/Chromium browser for browser E2E tests.
- A **local PostgreSQL database**, not a mocked/in-memory DB. Docker is optional for this local slice; hosted CI/CD, Docker and GCP are later Lab 5 deliverables.
- Use only synthetic demo identities and a non-production password. **Do not commit `.env` or password values.**

### Setup

1. Run `npm ci`.
2. Create two empty PostgreSQL databases on your local instance, for example `ttworkshop_demo` and **dedicated test-only** `ttworkshop_test`. Use your own DB user and port.
3. Set shell variables (replace `<db-user>` and `<port>`):

   `DATABASE_URL=postgresql://<db-user>@127.0.0.1:<port>/ttworkshop_demo`

   `APP_ORIGIN=http://localhost:5173`

   `PORT=3000`

   The API and Vite URLs must use the **same hostname**. The API checks the browser Origin on mutating requests to defend against CSRF; it intentionally rejects missing/foreign Origin headers.

4. Run `npm run db:migrate`. Set a synthetic local `SEED_PASSWORD` (minimum 12 characters), then run `npm run db:seed`. This creates two Participants and two Organizers at `participant.a@example.test`, `participant.b@example.test`, `organizer.a@example.test` and `organizer.b@example.test`. All share your locally chosen demo seed password; no real person/account is used.
5. Run `npm run dev:api` in one terminal and `npm run dev:web` in another. Open `http://localhost:5173`. The frontend proxies `/api` requests to port 3000. Login/logout/current-user and the role-specific identity screen are implemented.

### Checks and contract evidence

- `PG_TEST_URL=postgresql://<db-user>@127.0.0.1:<port>/ttworkshop_test npm test` — real PostgreSQL API/integration, React UI, and headless **Chrome** E2E tests. Tests parse the URL and require **exactly** `/ttworkshop_test` on a loopback host, then verify the PostgreSQL `current_database()` and server IP **before any `TRUNCATE`**. A marker in URL query parameters cannot bypass this protection. Browser tests use isolated local port 15173; you may set `CHROME_PATH` if Chrome is installed elsewhere.
- `npm run build` — strict TypeScript checking and production Vite frontend bundle.
- `npm audit --omit=dev --audit-level=high` — production dependency audit (not a substitute for code/security review).
- Test migration is idempotent; the tests **TRUNCATE `sessions` and `users` in `ttworkshop_test`**, never point `PG_TEST_URL` at live/product data. Never override the exact-database/loopback guard to run a test against a non-test database.

Implementation decisions and security design: [DEC-10 for F-01](docs/decisions/dec-10-f01.md). TDD/test evidence: [P1-03 evidence](docs/evidence/p1-03-f01.md). Original reviewed acceptance criteria: [F-01 contract](docs/contracts/f-01-auth.md).

**Workflow:** this change remains pending independent teammate PR Review and Merge into `sprint_1_staging`. A passing local test or PR approval alone does not prove that the feature has been merged, integrated or released to `main`.
