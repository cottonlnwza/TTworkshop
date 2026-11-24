# TTworkshop — System-Level Software Design Specification (SDS)

> **DRAFT full-product SDS v0.2.1 — Lab 7 Part A `DEC-14` Lock-Order Addendum (`PROPOSED / PENDING INDEPENDENT PEER REVIEW`) — 24 November 2026.** Deliverable 2 checkpoint [Issue #73](https://github.com/cottonlnwza/TTworkshop/issues/73) · Lab 7 Part A [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85). Architecture and implementation read-back are scoped to the referenced versions; `DEC-14` advisory-lock serialization is **PROPOSED / NOT YET IMPLEMENTED**.
> [P1-01 / Issue #1](https://github.com/cottonlnwza/TTworkshop/issues/1) · Deliverable 1 Part C
> Requirements [SRS](srs.md), [feature roles](features.md), [test traceability](traceability.md#5e-deliverable-2-requirement-to-evidence-matrix), and [release evidence](releases/d2-integrated-candidate.md). The working scope on staging `bcac8e76` is F-01–F-08. The F-09 design is accepted scope for later implementation. Full-product approval remains open.

## 1. Purpose, design constraints and decision status

COURSE §5 requires a **real UI → API/application layer → persistent database** workflow, meaningful domain transactions, server-side authentication and authorization starting in Sprint 1, reproducible seed/migrations, and a Docker/GCP-compatible architecture. A modular monolith is permitted; three logical tiers do not require three servers.

**Implemented stack and evidence scope**

| Layer | Candidate | Rationale | Status |
|---|---|---|---|
| Web UI | React 19 + TypeScript + Vite 8 | Existing F-01 implementation precedent; role-specific views and form state | F-01–F-08 role-specific flows verified on staging |
| API / domain | Node.js + TypeScript + Express 5 | Existing F-01 implementation precedent; HTTP controllers, services and permission middleware | Express 5 routes, authorization and domain rules verified on staging |
| Persistence | PostgreSQL 15+ with `pg` parameterized SQL and explicit transactions; no ORM selected | Matches F-01 migration/query approach; preserves relational constraints and PostgreSQL transaction semantics | Migrations 001–005 and durability checks verified on staging |
| Auth | Reuse F-01 server-side session and `HttpOnly` cookie middleware; derive identity/role server-side | Avoids parallel auth; Workshop owner comes from authenticated Organizer session | Session and role/owner guards verified; TH-038 retested deployed Lab 6 fix |
| Deployment | Docker image, Cloud Run app/API and durable managed PostgreSQL (e.g., Cloud SQL) on GCP | Repeatable deployment, persistent data outside ephemeral containers | Cloud Run + Cloud SQL, Lab 6 baseline verified. D2 release pending. |
| Tests | Unit + real PostgreSQL/API integration + selected browser E2E; applicable build/automated-test checks on relevant PRs from Sprint 1; hosted CI/CD automation expanded in Lab 5 | Covers rule, persistence, ownership, PR quality gate and end-user journey | Hosted build-test and isolated PostgreSQL/Chromium tests passed on staging |

**Design principle:** enforce authorization and business invariants in the backend and transactionally in the database, not through UI-only checks or mock-only persistence.

## 2. System context and high-level architecture

```text
Participant / Organizer browser
      |
      | HTTPS: UI + /api/v1/*
      v
Web UI (forms, routing, display; no authoritative policy)
      |
      v
API HTTP controllers + auth/session/ownership middleware
      |
      v
Application services (Workshop, Registration, Check-in, Reporting)
  |     |       validate domain rules & transitions
  |     +------ DB transaction boundary for competing registrations
  v
Relational repository / migrations
      |
      v
Persistent PostgreSQL (users, sessions, workshops, registrations)
```

Production uses one Docker image and one Cloud Run service for the built web UI and Express API. PostgreSQL persists externally in Cloud SQL. The migration job runs separately before candidate promotion; local Compose uses separate web, API and database services.

### Responsibilities

- **Web UI:** render role-aware navigation, local user input errors, loading/empty/forbidden states, and feedback. It cannot choose a trusted role or owner ID.
- **API/controller:** parse and validate request shape, authenticate session, invoke explicit authorization, return consistent safe errors; never expose password hash or unrelated records.
- **Domain service:** owns publication, deadline eligibility, active uniqueness, seat allocation, cancellation, manual closure, capacity edit, check-in and summary calculations.
- **Database:** authoritative identity/ownership, persistent workshop and registration history, referential integrity, transactional exclusion/locks and migration tracking.
- **Background jobs:** **not needed by baseline**; elapsed deadline can be computed at request time. Do not add external messaging or schedulers without an approved requirement.

## 3. Major domain model and persistence

```text
User (1) --------- (many) Workshop        [Workshop.owner_user_id]
  |                         |
  |                         +---- (many) Registration
  |                                           |
  +--------------------------- (many) --------+
                              [Registration.participant_user_id]

User (1) --------- (many) Session  [if server-stored sessions adopted]
```

| Entity | Major fields (candidate) | Relationships and constraints |
|---|---|---|
| **User** | `id`, `email` (unique), `password_hash`, `role` {PARTICIPANT, ORGANIZER}, `created_at` | Exactly one role/account in proposed initial model; no plaintext password |
| **Session** | F-01 implementation: opaque random token in `ttw_session` HttpOnly cookie; PostgreSQL stores SHA-256 token digest, `user_id`, `expires_at`, `revoked_at`, `created_at` | F-02 reuses the existing F-01 session middleware under DEC-10-F02; broader session-policy changes remain out of this Issue |
| **Workshop** | `id`, `owner_user_id`, nullable-during-DRAFT `title`, `description`, `location`, `starts_at`, `ends_at`, `capacity`, `status` {DRAFT, PUBLISHED}, optional `registration_deadline`, `registration_closed` (bool), timestamps | FK owner→User; Publish requires DEC-02 fields, positive integer capacity and end>start; configured deadline ≤ start. Partial-DRAFT policy is an **accepted F-02 scoped working choice (DEC-03, PR #10)**; published editing follows accepted DEC-07/08 |
| **Registration** | `id`, `workshop_id`, `participant_user_id`, `status` {ACTIVE, CANCELLED}, `registered_at`, `cancelled_at`, `checked_in_at` (nullable), timestamps | FKs to Workshop and User; one ACTIVE record per Participant/workshop; cancellation retained, check-in only for eligible ACTIVE row |

**Important schema/DB constraints (candidate):**

1. Foreign keys for owner and participant references; unique normalized account login identifier; positive published capacity and ordered valid dates.
2. Unique ACTIVE registration per (`workshop_id`, `participant_user_id`). Migration 004 implements a PostgreSQL **partial unique index** (`WHERE status = 'ACTIVE'`). The current F-01/F-02 proposal uses versioned SQL migrations and `pg`; no ORM is selected.
3. Workshop capacity cannot be violated during concurrent inserts. **Implemented registration transaction:** lock the corresponding workshop row (`SELECT … FOR UPDATE` or equivalent), check eligibility/ACTIVE count against capacity, insert in the *same* database transaction, commit; database uniqueness guard handles duplicate races. A read-check-write sequence without a lock/isolation guarantee is unsafe. **Proposed Lab 7 `DEC-14` (`BR-05b`) extension (`L7-01` #85, NOT YET IMPLEMENTED):** acquire a transaction-scoped per-Participant advisory lock `SELECT pg_advisory_xact_lock(-($1::bigint))` (using session-derived `BIGINT` `participant_user_id >= 1`, strictly negative `BIGINT` key space disjoint from migration lock `48033401` in `api/migrate.ts` and requiring zero `UPDATE` grant on `public.users`) **before** `workshops FOR UPDATE`, preserving the deadlock-free global lock order `advisory_lock(-participant_user_id) → workshops FOR UPDATE → registrations FOR UPDATE` across `F-03`/`F-05`/`F-06`/`F-07`/`F-08`.
4. F-08 checks owner, workshop status, registration status and check-in window, then updates `checked_in_at` under the workshop → registration row locks. The update is conditional on ACTIVE status and a null check-in. F-05 rejects cancellation after check-in.
5. F-02 **scoped working** DEC-04: API timestamps carry explicit ISO 8601 offsets; store instants in PostgreSQL `timestamptz`; UI uses configured university timezone. If `registration_deadline` is null, effective deadline = `starts_at`; `now >= effective_deadline` is closed. PR #10 peer-accepted, then F-02/F-03/F-06/F-07 exercised the timestamp and deadline rules in their test suites.
6. Persist cancellation and timestamps so status and summaries can be reproduced after restart. Whether an additional immutable status-history table is needed is **OPEN**; do not add it by default.

**Migration and seed:** migrations 001–004 create identity, workshop and registration structures. Migration 005 adds `registration_closed` with default false. F-08 reuses `checked_in_at` from migration 004. [Local setup](../README.md) documents isolated test databases, migrations and synthetic seeding.

## 4. Domain workflows and invariant ownership

| Workflow | Application service responsibility | Persistence/authorization boundary |
|---|---|---|
| Authenticate and current user | Check hashed password, establish/expire session, derive user role from server state | Session storage; never trust frontend-selected user/role |
| Draft / publish | Organizer-owned draft, validate mandatory publication fields and date/capacity transition | Owner FK + DRAFT/PUBLISHED state; reject foreign owner |
| Discover / register | Published/eligible list; same-transaction deadline, duplicate, capacity and status checks | ACTIVE uniqueness + workshop row lock; no seat oversell |
| View registrations | Participant sees own; Organizer sees registrants for owned workshop | Ownership checked in every API read |
| Cancel / close / reopen | Separate new-registration gate from timely cancellation; preserve cancelled row | Validate role, ownership, timestamps and allowed state changes |
| Edit / capacity | Validate allowed fields, deadlines and capacity vs ACTIVE count | Owner-only F-07 transaction, DEC-07 schedule/ended guards and DEC-08 capacity check under workshop lock |
| Check-in | Once per eligible ACTIVE registration within workshop time bounds | F-08 scoped to owning Organizer and matching ACTIVE registration. Evaluate the inclusive window in PostgreSQL after both row locks, then return the saved timestamp. The roster exposes the six permitted fields. |
| Attendance/report | Compute owner-only counts and rate from authoritative DB data | F-09 planned under DEC-09. Implement server-side aggregates and bounded filtering before performance/responsive verification. |

**Business-rule source mapping:** BR-01–BR-16 are in `docs/srs.md`. Each feature's detailed validation/errors/API/data contracts are intentionally deferred to the respective **P1-02 or later feature engineering contract**, not invented here.

## 5. UI structure and conventions

| Route/view | Audience | Current action and state |
|---|---|---|
| `/` sign-in state | Unauthenticated | Validates login and shows pending or safe error feedback |
| `/` Participant workspace | Participant | Published list and detail, registration, availability and rule feedback |
| `/my-registrations` and `/my-registrations/:id` | Participant | Persisted own registration status, cancellation and attendance |
| `/` Organizer workspace | Organizer | Owned workshop list, draft/edit/publish, deadline, closure/reopen and published capacity changes |
| `/organizer/workshops/:id/registrations` | Owning Organizer | Authorized roster, F-08 check-in action and persisted timestamps |

UI protects against repeat submissions and presents safe errors and the persisted outcome. The API enforces authorization and rules. Formal responsive verification at 375px and 1280px remains planned under NFR-05.

## 6. API approach

All paths below are under `/api/v1`. See the [feature contracts](contracts/README.md) for exact request and response shapes.

| Domain | Current endpoints |
|---|---|
| Session | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Organizer workshop management | `POST /workshops`, `GET /organizer/workshops`, `GET/PATCH /organizer/workshops/:id`, `POST /organizer/workshops/:id/publish` |
| Participant discovery and registration | `GET /workshops`, `GET /workshops/:id`, `POST /workshops/:id/registrations` |
| Registration views and cancellation | `GET /me/registrations`, `GET /me/registrations/:id`, `GET /organizer/workshops/:id/registrations`, `POST /me/registrations/:id/cancel` |
| Deadline and closure | `PATCH /organizer/workshops/:id/registration-deadline`, `POST /organizer/workshops/:id/close-registration`, `POST /organizer/workshops/:id/reopen-registration` |
| Attendance | `POST /organizer/workshops/:workshopId/registrations/:registrationId/check-in` |

Requests use JSON and timestamps use explicit ISO 8601 offsets. The API returns a success `data` envelope or a safe `error.code` and `error.message`. Standard outcomes include 400 validation, 401 unauthenticated, 403 forbidden, 404 owner-hidden/private resource and 409 rule conflicts. Check-in and protected registration responses use `Cache-Control: no-store`. F-09 filters and reporting are planned in their own contract.

## 7. Role/operation and ownership matrix (backend-enforced)

| Operation | Anonymous | Participant | Organizer |
|---|---|---|---|
| Login | Yes (credential check) | Yes (already authenticated behavior as decided) | Yes (same) |
| Current identity / logout | No | Own session | Own session |
| View PUBLISHED workshops via Participant discovery | No | Yes | No for Participant discovery API. Organizer uses the separate own-workshop view. |
| Create/edit/publish workshop | No | No | **Own** workshops only |
| View Organizer DRAFT | No | No | **Own** drafts only |
| Register for a workshop | No | **Own** new registration only | No |
| View detailed Participant registration | No | **Own** registrations only | Own workshop registrants only |
| Cancel registration | No | **Own ACTIVE** registration subject to rules | No by default; approval required for overrides |
| Close/reopen registration, edit capacity | No | No | **Own** workshop only |
| Check-in | No | No | Owning Organizer only; ACTIVE registration during its window |
| Attendance report (F-09 planned) | No | No | Owning Organizer only under the accepted contract |

**Negative/ownership tests:** bad credential, anonymous protected reads/writes, Participant publishing, Organizer performing Participant-only registration, Participant accessing another's detail, Organizer accessing another Organizer's workshop/registrants. Newly added routes in Sprint 2/3 must repeat relevant checks.

## 8. Credential/session lifecycle and security

**Implemented lifecycle:** seeded users store password hashes. Login issues an opaque `HttpOnly` same-site cookie backed by a server-side session; production adds `Secure`. Session expiry and logout revoke access. The server resolves identity and role, and checks the configured Origin on protected writes.

With cookie auth, protect state-changing routes against CSRF using a suitable validated Origin/CSRF-token strategy; escape rendered content to mitigate XSS; parameterize all DB access; do not expose stack traces. Use HTTPS in GCP, least-privilege DB access, parameterized environment configuration, synthetic demo accounts, no real secrets committed. Detailed controls/tests are to be specified/verified before release.

## 9. Configuration, local operation and GCP delivery plan

The [local environment example](../.env.example) and [README](../README.md) document `DATABASE_URL`, `APP_ORIGIN`, `PORT` and the browser and test settings. Configure credentials outside Git.

- **Local:** Use `npm ci`, migrations 001–005 and synthetic seed data. Run build, Vitest and Python on isolated PostgreSQL/Chromium. [Dockerfile](../Dockerfile) defines the application image. The [Docker evidence](evidence/l5-02-docker.md) documents Compose persistence and health checks.
- **Hosted quality gate:** `build-test` in [CI](../.github/workflows/ci.yml) checks exact commit, build, PostgreSQL and browser tests plus deployment test helpers. Staging `bcac8e76` passed [hosted CI](https://github.com/cottonlnwza/TTworkshop/actions/runs/45200353851).
- **Cloud:** [deploy-main.yml](../.github/workflows/deploy-main.yml) binds reviewed main SHA to image digest, verifies a zero-traffic candidate, promotes the approved revision and performs a smoke check. Current public revision `ttworkshop-00017-poy` serves the Lab 6 baseline only. D2 requires a newly reviewed release and fresh production persistence evidence. See the [release manifest](releases/d2-integrated-candidate.md).

## 10. Architectural risks and decisions to confirm

| Item | Impact / alternative | Decision |
|---|---|---|
| `ARCH-01` Stack/ORM/DB selection | PostgreSQL locks/partial indexes vs ORM support; integration DB must match concurrency semantics | F-01 implemented React 19/TS/Vite 8, Express 5/Node TS, PostgreSQL 15+ and `pg` SQL with no ORM; F-02 scoped reuse accepted in PR #10; **global architecture not approved** |
| `ARCH-02` Session approach | Cookie + CSRF vs bearer tokens; expiry/logout semantics | F-01 implements opaque server-side sessions and Origin validation; **F-02 scoped reuse accepted in DEC-10-F02 (PR #10)**; broader lifecycle/security policy remains OPEN |
| `ARCH-03` UTC/storage timezone | Accurate deadline/check-in windows; time-zone input and output | F-02 scoped DEC-04 accepted in PR #10; explicit-offset ISO API, UTC instants in `timestamptz`, configured university display timezone and closed-at-equality; **actual zone identifier remains config** |
| `ARCH-04` DRAFT required fields/update | Nullability/migrations and create/update/publish screens | F-02 scoped DEC-03 accepted in PR #10; incomplete DRAFT allowed, owner-only partial updates while DRAFT, required fields at Publish, no edits after PUBLISHED; **code not implemented** |
| `ARCH-05` Editing after publishing | Active registrations vs changed times/deadlines; transaction checks | DEC-07/08 accepted and F-07 verified on staging |
| `ARCH-06` Registration history/privacy | Retain cancelled history with partial uniqueness; whether more audit records needed | DEC-06 and DEC-09 implemented for F-05/F-08. F-09 aggregation remains planned. |
| `ARCH-07` Runtime/test infrastructure | DB service on local and cloud, runner setup, role of staging branch | Lab 5 pipeline operational and Lab 6 deployed. D2 deployment and production verification pending. |
| `ARCH-08` Team review / working acceptance | Historical PR #10 Author `thananun-7203` / Reviewer `cottonlnwza`; substantive peer review, actual staging merge and Author post-merge verification establish **scoped** working acceptance, not global or instructor approval | F-02 choices accepted through PR #10. Issue #73 is awaiting independent review. |

**Design acceptance:** PR #10 accepted the F-02 working choices. PR #14 implemented F-02. PRs #74 and #78 approved the scoped Sprint 2 and 3 designs. Full-product System SDS approval remains open.

| Version | Date | Description | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | First **proposed** system design for P1-01; no code or deployment | Historical status at that version: pending both students |
| v0.1.1 | 2026-11-03 | R-01: require Sprint 1 PR quality checks; reserve hosted CI/CD, Docker and GCP expansion for Lab 5 | Historical status at that version: pending re-review and both students |
| v0.1.2 | 2026-11-04 | Align stack proposal with implemented F-01 precedent; add F-02-scoped DEC-02/03/04/10 proposal references for Workshop fields, incomplete DRAFT and timestamps | **Pending peer review; global architecture remains not approved** |
| v0.1.3 | 2026-11-04 | Address PR #10 R-03 by aligning ARCH-08 working-document acceptance with SRS DEC-13; update SRS reference and reflect DEC-03 DRAFT-only update proposal | **Pending peer review; global architecture remains not approved** |
| v0.1.4 | 2026-11-05 | Issue #11 correct historical PR #10 status, accept only F-02 scoped DEC-03/04/10 choices, update SRS/Features references and separate future Issue #12 implementation | Pending this Issue #11 peer review; global SDS remains DRAFT |
| v0.2.0 | 2026-11-23 | Issue #73 reconciles the F-01–F-08 staging architecture, tested behavior and live Lab 6 baseline. | Pending independent review. |
| v0.2.1 | 2026-11-24 | Issue #85 (`L7-01`, Lab 7 Part A): document proposed `DEC-14` (`BR-05b`) negative-`BIGINT` advisory lock (`pg_advisory_xact_lock(-($1::bigint))`, disjoint from migration lock `48033401`) and deadlock-free global lock hierarchy (`advisory_lock → workshops → registrations`); zero code/migration changes. | **PROPOSED / PENDING INDEPENDENT PEER REVIEW** by `cottonlnwza` before `L7-02` (#83) implementation. |
