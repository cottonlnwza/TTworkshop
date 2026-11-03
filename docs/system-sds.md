# TTworkshop — System-Level Software Design Specification (SDS)

> **DRAFT v0.1 — PROPOSED ARCHITECTURE — NOT APPROVED — 2026-11-03**
> [P1-01 / Issue #1](https://github.com/cottonlnwza/TTworkshop/issues/1) · Deliverable 1 Part C
> Requirements: `docs/srs.md` v0.1; inventory/ownership: `docs/features.md` v0.1. **No code, migration, API, container, test, cloud resource or deployment exists by virtue of this design.**

## 1. Purpose, design constraints and decision status

COURSE §5 requires a **real UI → API/application layer → persistent database** workflow, meaningful domain transactions, server-side authentication and authorization starting in Sprint 1, reproducible seed/migrations, and a Docker/GCP-compatible architecture. A modular monolith is permitted; three logical tiers do not require three servers.

**Proposed stack (team must approve):**

| Layer | Candidate | Rationale | Status |
|---|---|---|---|
| Web UI | React + TypeScript + Vite | Lightweight role-specific views, form validation and state handling | **PROPOSED**; verify course-lab stack preference |
| API / domain | Node.js + TypeScript + Express | HTTP REST controllers, application/domain services and permission middleware | **PROPOSED** |
| Persistence | PostgreSQL with Prisma (or a transaction/constraint-capable query layer) | Durable relational ownership links, transactional capacity guards, partial uniqueness strategy | **PROPOSED**; finalize actual DB constraints before implementation |
| Auth | Server-backed, opaque session in `HttpOnly` cookie; hashed passwords | Explicit lifecycle and backend identity; protected cookie and CSRF design | **PROPOSED** |
| Deployment | Docker image, Cloud Run app/API and durable managed PostgreSQL (e.g., Cloud SQL) on GCP | Repeatable deployment, persistent data outside ephemeral containers | **PROPOSED**, pending Lab 5 instructions/resources |
| Tests | Unit + real PostgreSQL/API integration + selected browser E2E, with CI after Lab 5 | Covers rule, persistence, ownership and end-user journey | **PROPOSED** tooling to be selected in contracts |

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

Deployment may serve UI and API via **one** image/service if appropriate; these are **logical** layers. Separation is for reasoning, not mandated infrastructure. Any actual stack deviation requires updated SDS, approved decision and appropriate tests.

### Responsibilities

- **Web UI:** render role-aware navigation, local user input errors, loading/empty/forbidden states, and feedback. It cannot choose a trusted role or owner ID.
- **API/controller:** parse and validate request shape, authenticate session, invoke explicit authorization, return consistent safe errors; never expose password hash or unrelated records.
- **Domain service:** owns publication, deadline eligibility, active uniqueness, seat allocation, cancellation, manual closure, capacity edit, check-in and summary calculations.
- **Database:** authoritative identity/ownership, persistent workshop and registration history, referential integrity, transactional exclusion/locks and migration tracking.
- **Background jobs:** **not needed by baseline**; elapsed deadline can be computed at request time. Do not add external messaging or schedulers without an approved requirement.

## 3. Major domain model (logical, not final migration)

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
| **Session** | `id` (server identifier, not exposed), `user_id`, `token_digest` or protected session key, `expires_at`, `revoked_at`, `created_at` | Only active nonexpired sessions accepted; exact storage scheme still OPEN |
| **Workshop** | `id`, `owner_user_id`, `title`, `description`, `location`, `starts_at`, `ends_at`, `capacity`, `status` {DRAFT, PUBLISHED}, `registration_deadline` (optional), `registration_closed` (bool), timestamps | FK owner→User; published capacity >0, end>start. Required fields in incomplete drafts and published-event edit policy **OPEN** |
| **Registration** | `id`, `workshop_id`, `participant_user_id`, `status` {ACTIVE, CANCELLED}, `registered_at`, `cancelled_at`, `checked_in_at` (nullable), timestamps | FKs to Workshop and User; one ACTIVE record per Participant/workshop; cancellation retained, check-in only for eligible ACTIVE row |

**Important schema/DB constraints (candidate):**

1. Foreign keys for owner and participant references; unique normalized account login identifier; positive published capacity and ordered valid dates.
2. Unique ACTIVE registration per (`workshop_id`, `participant_user_id`). PostgreSQL **partial unique index** (`WHERE status = 'ACTIVE'`) is a possible enforcement option. Confirm ORM migration support; do not assume standard composite unique works when cancelled/history records are retained.
3. Workshop capacity cannot be violated during concurrent inserts. **Proposed transaction:** lock the corresponding workshop row (`SELECT … FOR UPDATE` or equivalent), check eligibility/ACTIVE count against capacity, insert in the *same* database transaction, commit; database uniqueness guard handles duplicate races. A read-check-write sequence without a lock/isolation guarantee is unsafe.
4. Restrict `checked_in_at` to one successful check-in; server-level time/ownership checks and transactional update. If a DB constraint is practical, add it as defense in depth.
5. If `registration_deadline` is null, effective deadline = `starts_at` (TEAM-REPORTED rule); exact UTC/local representation and boundary still require approval.
6. Persist cancellation and timestamps so status and summaries can be reproduced after restart. Whether an additional immutable status-history table is needed is **OPEN**; do not add it by default.

**Migration/seed plan:** versioned schema migrations; deterministic synthetic users (one per role, ideally multiple Participants/Organizers for ownership tests), seed workshop with known capacity/time and registrations for negative tests. Provide a documented reset procedure for local/test DB only. Production data must survive new application containers/redeployment. Migration files and seed commands are **not created by P1-01**.

## 4. Domain workflows and invariant ownership

| Workflow | Application service responsibility | Persistence/authorization boundary |
|---|---|---|
| Authenticate and current user | Check hashed password, establish/expire session, derive user role from server state | Session storage; never trust frontend-selected user/role |
| Draft / publish | Organizer-owned draft, validate mandatory publication fields and date/capacity transition | Owner FK + DRAFT/PUBLISHED state; reject foreign owner |
| Discover / register | Published/eligible list; same-transaction deadline, duplicate, capacity and status checks | ACTIVE uniqueness + workshop row lock; no seat oversell |
| View registrations | Participant sees own; Organizer sees registrants for owned workshop | Ownership checked in every API read |
| Cancel / close / reopen | Separate new-registration gate from timely cancellation; preserve cancelled row | Validate role, ownership, timestamps and allowed state changes |
| Edit / capacity | Validate allowed fields, deadlines and capacity vs ACTIVE count | Owner check, atomic validation/update; edit policy unresolved |
| Check-in | Once per eligible ACTIVE registration within workshop time bounds | Owner check, one-time timestamp update |
| Attendance/report | Compute owner-only counts and rate from authoritative DB data | Avoid frontend-derived financial-like counters; no personally identifying public report |

**Business-rule source mapping:** BR-01–BR-16 are in `docs/srs.md`. Each feature's detailed validation/errors/API/data contracts are intentionally deferred to the respective **P1-02 or later feature engineering contract**, not invented here.

## 5. UI structure and conventions (proposed)

| Route/view (illustrative only) | Audience | Key action and state handling |
|---|---|---|
| `/login` | All users | Validation, invalid login feedback, pending state, safe logout transition |
| `/workshops` / `/workshops/:id` | Participant (and published browsing policy to approve) | Published list/detail, loading/empty/error state, eligibility shown, registration action |
| `/my-registrations` / `/my-registrations/:id` | Participant | Own saved status and later cancellation |
| `/organizer/workshops` | Organizer | Own draft/published listing, create draft and publish |
| `/organizer/workshops/:id/registrations` | Organizer-owner | Own registration list; later check-in and event report |
| `/organizer/workshops/:id/edit` | Organizer-owner | Later Sprint 2: deadline/closure/allowed edits/capacity |

**UI conventions:** accessible labels; field-level validation plus server error; disable repeat submits while pending but still handle backend duplicates; show skeleton/loading or progress, empty list state, safe 401 session-expired handling, 403/404 access message, and explicit success with persisted-result retrieval. No hidden control is considered authorization. Target viewports 375px and 1280px are **provisional** NFR-05, not an implemented feature.

## 6. API approach (proposed top-level resource conventions)

- Versioned REST under `/api/v1`, JSON requests/responses, ISO 8601 timestamps after time-zone policy approval.
- Indicative groups only: `/auth/login`, `/auth/logout`, `/auth/me`; `/workshops`, `/workshops/:id`; `/workshops/:id/registrations`, `/registrations/:id`; later cancellation/closure/check-in/report routes.
- **Not a Feature-Level API contract:** exact methods, response DTOs, status names, route paths, validation field limits and transaction semantics must be finalized in P1-02 (F-01–F-04) and later contracts before implementation.
- Success shape (candidate): `{ "data": { ... } }`; failure shape (candidate): `{ "error": { "code": "INVALID_STATE", "message": "..." } }`; never include credential fields or internal stack traces.
- Representative failure categories: `400` malformed request, `401` unauthenticated, `403` forbidden, `404` not found or owner-hidden resource, `409` duplicate/full/invalid transition. Choose consistent distinctions and prevent existence disclosure in private lookups.
- Validate both type/shape and server-side domain rules; use DB constraints/transactions for race safety. Avoid client-set `owner_user_id`, `role`, or authoritative seat counts.

## 7. Role/operation and ownership matrix (backend-enforced)

| Operation | Anonymous | Participant | Organizer |
|---|---|---|---|
| Login | Yes (credential check) | Yes (already authenticated behavior as decided) | Yes (same) |
| Current identity / logout | No | Own session | Own session |
| View PUBLISHED workshops | **OPEN policy** (default deny until approved) | Yes | Policy OPEN / likely Yes |
| Create/edit/publish workshop | No | No | **Own** workshops only |
| View Organizer DRAFT | No | No | **Own** drafts only |
| Register for a workshop | No | **Own** new registration only | No |
| View detailed Participant registration | No | **Own** registrations only | Own workshop registrants only |
| Cancel registration | No | **Own ACTIVE** registration subject to rules | No by default; approval required for overrides |
| Close/reopen registration, edit capacity | No | No | **Own** workshop only |
| Check-in / attendance report | No | No | **Own** workshop only |

**Negative/ownership tests:** bad credential, anonymous protected reads/writes, Participant publishing, Organizer performing Participant-only registration, Participant accessing another's detail, Organizer accessing another Organizer's workshop/registrants. Newly added routes in Sprint 2/3 must repeat relevant checks.

## 8. Credential/session lifecycle and security

**Proposed lifecycle:** seeded `User` stores only a password hash using a standard password-hashing algorithm; login verifies hash, starts a random opaque server session; cookie marked `HttpOnly`, `SameSite` appropriate to the actual UI/API origin, and `Secure` on HTTPS deployments; protected API resolves identity and role on server. Session expires at a defined time and logout revokes/invalidate it; `/auth/me` returns safe minimal identity. **Session duration, rotation, storage strategy and user deactivation policy remain OPEN.**

With cookie auth, protect state-changing routes against CSRF using a suitable validated Origin/CSRF-token strategy; escape rendered content to mitigate XSS; parameterize all DB access; do not expose stack traces. Use HTTPS in GCP, least-privilege DB access, parameterized environment configuration, synthetic demo accounts, no real secrets committed. Detailed controls/tests are to be specified/verified before release.

## 9. Configuration, local operation and GCP delivery plan

**Illustrative environment-variable names (not credentials):** `NODE_ENV`, `PORT`, `DATABASE_URL`, `SESSION_SECRET` or session-key reference, `APP_BASE_URL`, `CORS_ORIGIN` if applicable. Actual config contract and env example must be versioned before running. The required exact list is **OPEN** until stack approval; do not create production values in Git.

**Local reproducibility plan:** documented tool versions → obtain synthetic example config → start local DB → execute schema migrations/seed → start UI/API → run build, unit/API integration and selected E2E tests; record commands/commit/test counts. No actual commands or passing test logs exist yet.

**Lab 5 onward (plan, not implementation):** Docker image builds from reviewed main release; PR quality gate runs build/tests and rejects intentional failed check; acceptance PR goes via sprint staging → reviewed release PR → `main`; pipeline deploys accepted version to GCP (e.g., Cloud Run) with durable external DB (e.g., Cloud SQL), secret management/config externalized, and a reproducible post-deploy workflow/persistence verification. Lab handout may mandate different resources; update plan accordingly.

**D1 boundary:** GCP URL, completed Docker/CI/CD and demo video are **not** required for 8 November D1. Sprint 1 must run locally and be deployment-ready, with actual test and reviewed Git history evidence at submission time.

## 10. Architectural risks and decisions to confirm

| Item | Impact / alternative | Decision |
|---|---|---|
| `ARCH-01` Stack/ORM/DB selection | PostgreSQL locks/partial indexes vs ORM support; integration DB must match concurrency semantics | **OPEN**, proposed React/Express/Postgres |
| `ARCH-02` Session approach | Cookie + CSRF vs bearer tokens; expiry/logout semantics | **OPEN**, proposed opaque server session |
| `ARCH-03` UTC/storage timezone | Accurate deadline/check-in windows; time-zone input and output | **OPEN**, coordinate with SRS DEC-04 |
| `ARCH-04` DRAFT required fields | Nullability/migrations and create/publish screens | **OPEN**, SRS DEC-03 |
| `ARCH-05` Editing after publishing | Active registrations vs changed times/deadlines; transaction checks | **OPEN**, SRS DEC-07 |
| `ARCH-06` Registration history/privacy | Retain cancelled history with partial uniqueness; whether more audit records needed | **OPEN**, SRS DEC-06 |
| `ARCH-07` Runtime/test infrastructure | DB service on local and cloud, runner setup, role of staging branch | **OPEN**, Lab 5 guidance pending |
| `ARCH-08` Team sign-off | Issue #1 Author `cottonlnwza` and Reviewer `thananun-7203` (user-designated; both GitHub permissions checked); both students must review/approve baseline before implementation | **ASSIGNMENT VERIFIED; APPROVAL PENDING** |

**Design acceptance at draft stage only:** architecture, data ownership/constraints, API/UI conventions, permissions and delivery path are documented as proposals; they cannot be called implemented or approved.

| Version | Date | Description | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | First **proposed** system design for P1-01; no code or deployment | Pending both students |
