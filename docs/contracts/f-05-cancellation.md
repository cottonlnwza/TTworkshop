# F-05 — Registration Cancellation and Re-registration

> **PROPOSED pre-implementation contract v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23** · Contracts [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) · Planned Implementation [Issue #67 (`P2-03`)](https://github.com/cottonlnwza/TTworkshop/issues/67) · Sprint 2 (`Period 2`)
> Source: `docs/srs.md` FR-10 (plus F-04 read-surface continuity FR-08/09), BR-01, BR-05, BR-06, BR-09, BR-10 (cancellation side), BR-12, NFR-01, NFR-02, NFR-03; `docs/features.md` F-05; `docs/system-sds.md` §§3–6; proposed scoped policy [`DEC-06`](../decisions/dec-06-cancellation-policy.md) and [`DEC-05`](../decisions/dec-05-manual-closure.md). **No `F-05` application code has been written and zero `F-05` STS have been executed.** This draft does not assert global SRS/SDS or instructor approval.

## 1. Purpose, dependencies, and boundaries

An authenticated `PARTICIPANT` can self-cancel their own `ACTIVE` registration before the workshop's effective cancellation deadline. Cancellation transitions the persisted record from `ACTIVE` to `CANCELLED` with a server-generated `cancelled_at` timestamp (retaining history without deletion), immediately frees one seat for eligible registrations, and allows subsequent re-registration (`BR-12`) when the workshop remains open, before deadline, and below capacity.

**Depends on:**
- Accepted Sprint 1 slices: `F-01` session/role auth, `F-02` published workshop invariants, `F-03` atomic registration & partial unique index (`004_registrations.sql`), and `F-04` Participant/Organizer registration views & `WD-F04-01` privacy minimization.
- Independent peer review (`Formal APPROVE`) and staging merge of [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) including [`DEC-06`](../decisions/dec-06-cancellation-policy.md) and [`DEC-05`](../decisions/dec-05-manual-closure.md).

**Exclusions (out of `F-05` scope):**
- Manual registration close/reopen toggle and published deadline editing belong to `F-06` ([Issue #68](https://github.com/cottonlnwza/TTworkshop/issues/68)).
- Published workshop attribute/capacity editing belongs to `F-07` ([Issue #69](https://github.com/cottonlnwza/TTworkshop/issues/69)).
- Attendance check-in belongs to `F-08` ([Issue #71](https://github.com/cottonlnwza/TTworkshop/issues/71)), though `F-05` includes a defensive `checked_in_at IS NULL` guard.
- Organizer-initiated cancellation of a Participant's registration, waitlists, refunds, and email notifications are out of scope.

## 2. Feature SDS — workflow, atomicity, and invariants

1. Participant navigates to `/my-registrations` or `/my-registrations/:id` and selects **Cancel registration** on an `ACTIVE` registration. The client supplies only the registration `:id` path parameter, session cookie, and same-origin `Origin` header — never a user ID, role, or `cancelled_at` timestamp.
2. Backend verifies authenticated `PARTICIPANT` session (`401` anonymous, `403` `ORGANIZER`) and same-origin `Origin` (`403 FORBIDDEN_ORIGIN`), then validates numeric `id` (`404 NOT_FOUND` on malformed ID).
3. **Single PostgreSQL transaction:**
   - Locate the target registration owned by `session.user_id` (`WHERE r.id = $1 AND r.participant_user_id = $2`). If absent (missing or belongs to another Participant), rollback and return `404 NOT_FOUND` without disclosing existence.
   - Lock the parent workshop row (`SELECT id, status, starts_at, registration_deadline FROM workshops WHERE id = $1 FOR UPDATE`) to serialize cleanly against concurrent registrations (`F-03`) and capacity edits (`F-07`).
   - Re-read the registration row's authoritative `status` and `checked_in_at` under the lock:
     - If `status = 'CANCELLED'` → rollback and return `409 ALREADY_CANCELLED` (original `cancelled_at` preserved).
     - If `checked_in_at IS NOT NULL` → rollback and return `409 ALREADY_CHECKED_IN`.
   - Validate deadline integrity (defense in depth for `BR-08`): if `starts_at IS NULL` or (`registration_deadline IS NOT NULL` and `registration_deadline > starts_at`), rollback and return `409 INVALID_DEADLINE`.
   - Enforce `DEC-06` cutoff (`BR-09`): compute `effective_deadline = COALESCE(registration_deadline, starts_at)`. If `now() >= effective_deadline`, rollback and return `409 CANCELLATION_DEADLINE_PASSED`.
   - **Manual closure independence (`BR-10` / `DEC-05`):** Do **not** reject cancellation when `workshop.registration_closed = true`, and do **not** update `workshops.registration_closed`.
   - Execute `UPDATE registrations SET status = 'CANCELLED', cancelled_at = $2 WHERE id = $1 AND participant_user_id = $3 AND status = 'ACTIVE' RETURNING ...` (using authoritative server `now()`) and `COMMIT`.
4. **Re-registration (`BR-12`):** Because cancellation retains the `CANCELLED` row and `004_registrations.sql`'s partial unique index applies only `WHERE status = 'ACTIVE'`, a subsequent `POST /api/v1/workshops/:id/registrations` by the same Participant creates a **new** `ACTIVE` row if and only if the workshop is `PUBLISHED`, not manually closed (`F-06`), before `effective_deadline`, and below `capacity` under `FOR UPDATE`.
5. **History presentation (`F-04` read continuity):** Both Participant views and the owning Organizer roster return `ACTIVE` and `CANCELLED` rows in existing `registered_at DESC, id DESC` cursor pagination order, adding `cancelled_at` (`ISO 8601 UTC` or `null`) while strictly preserving `WD-F04-01` (no Participant email or full name in Organizer roster).

## 3. UI contract (planned)

| Screen / route | Expected behavior |
|---|---|
| `/my-registrations` | Displays each own registration with `Status` (`ACTIVE` / `CANCELLED`), `Registered` time, `Cancelled` time (when `CANCELLED`), and a **`Cancel registration`** button on `ACTIVE` rows only. Pending disable prevents double-click; on success, reloads persisted list showing `CANCELLED` and `cancelled_at`; on `409`/network error, renders safe `role="alert"` message without falsely claiming cancellation. |
| `/my-registrations/:id` | Displays detail including `Status`, `Registered`, `Cancelled` (if cancelled), and **`Cancel registration`** button when `ACTIVE`. Re-fetches authoritative record after cancel. |
| `/` (`ParticipantApp` discovery & detail) | Displays live `Seats remaining` reflecting freed seats after cancellation. Must **not** keep stale client-only `registeredWorkshopIds` blocking re-registration after cancellation; if the user cancels and returns to `/`, eligible workshops allow re-registration (`Register for workshop`), while still showing `409` conflict feedback if full/closed/past deadline. |
| `/organizer/workshops/:id/registrations` | Displays `Registration`, opaque `Participant ID`, `Status` (`ACTIVE` / `CANCELLED`), `Registered`, and `Cancelled` (when present). Preserves `WD-F04-01` privacy (no email/name). |

## 4. API contract (planned)

Base `/api/v1`. Success envelope `{"data": ...}`; failure envelope `{"error": {"code": "...", "message": "..."}}`. All registration routes set `Cache-Control: no-store`.

| Method / path | Auth & request | Expected success | Negative / boundary responses |
|---|---|---|---|
| `POST /me/registrations/:id/cancel` | Authenticated `PARTICIPANT` cookie + same-origin `Origin` header; empty body `{}` (no user/status fields trusted) | `200` `{"data":{"registration_id":"<id>","workshop_id":"<wid>","status":"CANCELLED","registered_at":"<ISO>","cancelled_at":"<ISO>"}}` | `401 UNAUTHENTICATED` anonymous; `403 FORBIDDEN` Organizer; `403 FORBIDDEN_ORIGIN` missing/foreign `Origin`; `404 NOT_FOUND` foreign/missing/malformed ID; `409 ALREADY_CANCELLED` already cancelled; `409 CANCELLATION_DEADLINE_PASSED` `now >= effective_deadline`; `409 INVALID_DEADLINE` malformed persisted deadline; `409 ALREADY_CHECKED_IN` already checked in |
| `GET /me/registrations` *(existing F-04 updated)* | Authenticated `PARTICIPANT`; optional `limit`, `cursor` | `200` existing DTO + `"cancelled_at": "<ISO>" \| null` on each item; returns both `ACTIVE` and `CANCELLED` rows ordered `registered_at DESC, id DESC` | Unchanged from F-04 (`400 INVALID_PAGINATION`, `401`, `403`) |
| `GET /me/registrations/:id` *(existing F-04 updated)* | Authenticated `PARTICIPANT` | `200` existing DTO + `"cancelled_at": "<ISO>" \| null` | Unchanged from F-04 (`401`, `403`, `404`) |
| `GET /organizer/workshops/:id/registrations` *(existing F-04 updated)* | Authenticated owning `ORGANIZER` (`PUBLISHED` workshop only) | `200` existing privacy-minimized DTO + `"cancelled_at": "<ISO>" \| null` (zero email/name fields) | Unchanged from F-04 (`400 INVALID_PAGINATION`, `401`, `403`, `404`) |
| `POST /workshops/:id/registrations` *(existing F-03 continuity)* | Authenticated `PARTICIPANT` + same-origin `Origin` | `201` new `ACTIVE` row after prior `CANCELLED` row when eligible (`BR-12`), preserving old `CANCELLED` row | Existing F-03 `401`/`403`/`404`/`409` (`DUPLICATE_ACTIVE`, `CAPACITY_FULL`, `DEADLINE_PASSED`, `INVALID_DEADLINE`, plus `REGISTRATION_CLOSED` once F-06 integrates) |

## 5. Data contract and migration impact

- **Schema layer — NO NEW MIGRATION REQUIRED:** Existing [`db/migrations/004_registrations.sql`](../../db/migrations/004_registrations.sql) already defines:
  - `status registration_status NOT NULL DEFAULT 'ACTIVE'` (`ENUM('ACTIVE', 'CANCELLED')`)
  - `cancelled_at TIMESTAMPTZ`
  - `checked_in_at TIMESTAMPTZ`
  - `CONSTRAINT registration_cancelled_timestamp CHECK ((status = 'ACTIVE' AND cancelled_at IS NULL) OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL))`
  - Partial unique index `registrations_one_active_per_participant_workshop_idx ON registrations(workshop_id, participant_user_id) WHERE status = 'ACTIVE'`
- **Transaction invariant:** Both `POST /me/registrations/:id/cancel` and `POST /workshops/:id/registrations` serialize on `SELECT ... FROM workshops WHERE id = $1 FOR UPDATE`, ensuring seat counts and re-registration concurrency remain consistent without lost updates.
- **Zero destructive deletes:** Cancellation executes `UPDATE`, never `DELETE`.

## 6. Observable Acceptance Criteria (AC)

| AC ID | Observable outcome & linked requirements |
|---|---|
| **AC-F05-01** | Authenticated Participant cancels their own `ACTIVE` registration before `effective_deadline`; DB retains the row with `status = 'CANCELLED'` and non-null `cancelled_at`, response returns `200`, and workshop `remaining_seats` increases by 1 (`FR-10`, `BR-09`, `NFR-02`). |
| **AC-F05-02** | Cancelling an already-`CANCELLED` registration returns `409 ALREADY_CANCELLED` without changing `cancelled_at` or inserting/deleting rows (`BR-09`). |
| **AC-F05-03** | Attempting to cancel at exact boundary `now === effective_deadline` or after (`now > effective_deadline`, where `effective_deadline = COALESCE(registration_deadline, starts_at)`) returns `409 CANCELLATION_DEADLINE_PASSED` and leaves `status = 'ACTIVE'` with `cancelled_at IS NULL` (`BR-09`, `DEC-06`, `DEC-04`). |
| **AC-F05-04** | After cancelling, the same Participant can re-register for the workshop when open, before deadline, and capacity remains; a **new** `ACTIVE` row is persisted (`201`) while the prior `CANCELLED` row remains intact in DB (`BR-12`, `BR-05`, `NFR-02`). |
| **AC-F05-05** | Re-registration after cancellation is rejected when capacity is full (`409 CAPACITY_FULL`), deadline has passed (`409 DEADLINE_PASSED`), or concurrent re-registration/new-registration requests race for the freed final seat — exactly one succeeds and `active_count <= capacity` (`BR-06`, `BR-12`, `NFR-03`). |
| **AC-F05-06** | Manual closure independence (`BR-10` / `DEC-05`): when a workshop is manually closed (`registration_closed = true`, verifiable directly in DB fixture or with `F-06`), an already-`ACTIVE` Participant can still cancel before deadline; cancellation leaves `registration_closed = true` (no auto-reopen). |
| **AC-F05-07** | Access, CSRF & check-in guards: anonymous (`401`), Organizer (`403`), foreign Participant (`404`), missing/foreign `Origin` (`403 FORBIDDEN_ORIGIN`), invalid persisted deadline (`409 INVALID_DEADLINE`), and already-checked-in registration (`409 ALREADY_CHECKED_IN`) are rejected without mutating DB (`BR-01`, `NFR-01`). |
| **AC-F05-08** | Participant views (`/my-registrations`, `/my-registrations/:id`) and owning Organizer roster (`/organizer/workshops/:id/registrations`) display both `ACTIVE` and `CANCELLED` rows with `cancelled_at` in stable `registered_at DESC, id DESC` order, while Organizer roster strictly omits Participant email and full name (`FR-08`, `FR-09`, `FR-10`, `WD-F04-01`, `DEC-06`). |
| **AC-F05-09** | Persisted `CANCELLED` record (`cancelled_at`), freed seat count, and subsequent re-registered `ACTIVE` record survive a full API process restart against durable PostgreSQL (`NFR-02`). |
| **AC-F05-10** | End-to-end UI flow: Participant registers → cancels from `/my-registrations` → sees `CANCELLED` status and `cancelled_at` → returns to discovery seeing freed seat and re-registers cleanly; safe error feedback shown on conflict (`FR-10`). |

## 7. Software Test Specification (STS) — PLANNED, NOT EXECUTED

| Test ID | AC | Level | Preconditions & inputs → action → expected outcome |
|---|---|---|---|
| **STS-F05-01** | AC-F05-01 | API+DB | Seed PUBLISHED workshop `capacity=2`, Participant A `ACTIVE` (`remaining_seats=1`), clock before deadline → `POST /me/registrations/:id/cancel` as A → `200`, DB row has `status='CANCELLED'` and `cancelled_at IS NOT NULL`, `GET /workshops/:id` shows `remaining_seats=2`. |
| **STS-F05-02** | AC-F05-02 | API+DB negative | Seed Participant A with already-`CANCELLED` registration (record `t0 = cancelled_at`) → `POST /me/registrations/:id/cancel` → `409 ALREADY_CANCELLED`, DB `cancelled_at === t0`, row count unchanged. |
| **STS-F05-03** | AC-F05-03 | API+DB boundary | Inject `now` at `effective_deadline` (both explicit `registration_deadline` and null-deadline fallback to `starts_at`) and `effective_deadline + 1s` → `POST /me/registrations/:id/cancel` → `409 CANCELLATION_DEADLINE_PASSED`, DB remains `ACTIVE` with `cancelled_at IS NULL`. |
| **STS-F05-04** | AC-F05-04 | API+DB | Participant A registers (`r1`), cancels `r1`, then `POST /workshops/:id/registrations` while open/before deadline → `201` creates `r2` (`r2.id !== r1.id`, `ACTIVE`); DB holds both `r1` (`CANCELLED`) and `r2` (`ACTIVE`); second duplicate `POST` returns `409 DUPLICATE_ACTIVE`. |
| **STS-F05-05** | AC-F05-05 | API+DB concurrency | Workshop `capacity=1`, Participant A cancels freeing the single seat → (a) Participant B takes seat, then A re-registers → `409 CAPACITY_FULL`; (b) clock moved past deadline, A re-registers → `409 DEADLINE_PASSED`; (c) 10 concurrent Participants (including A re-registering) race for the 1 freed seat → exactly 1 `201`, 9 `409`, `ACTIVE` count = 1. |
| **STS-F05-06** | AC-F05-06 | API+DB integration | Seed workshop with `registration_closed = true` (after `005` migration / `F-06` integration, or verified cross-feature with `F-06`) and Participant A `ACTIVE` before deadline → `POST /me/registrations/:id/cancel` → `200 CANCELLED`, `workshops.registration_closed` remains `true`, and re-registration returns `409 REGISTRATION_CLOSED`. |
| **STS-F05-07** | AC-F05-07 | API+DB security | Test anonymous (`401`), Organizer (`403`), Participant B cancelling Participant A's registration (`404`), missing/foreign `Origin` (`403`), malformed persisted `registration_deadline > starts_at` (`409 INVALID_DEADLINE`), and seeded `checked_in_at IS NOT NULL` (`409 ALREADY_CHECKED_IN`) → zero DB mutations. |
| **STS-F05-08** | AC-F05-08 | API+DB privacy | Participant A cancels `r1` and re-registers `r2` → `GET /me/registrations`, `GET /me/registrations/r1`, and owning Organizer `GET /organizer/workshops/:id/registrations` return both `r2` (`ACTIVE`, `cancelled_at: null`) and `r1` (`CANCELLED`, ISO `cancelled_at`) in `registered_at DESC, id DESC` order; Organizer roster contains zero email/name fields. |
| **STS-F05-09** | AC-F05-09 | Process restart integration | Start real API process A → cancel `r1`, verify seat freed, re-register `r2` → kill process A, start process B on same isolated PostgreSQL DB → `GET /me/registrations` & `GET /organizer/workshops/:id/registrations` return identical `r1` (`CANCELLED` + `cancelled_at`) and `r2` (`ACTIVE`). |
| **STS-F05-10** | AC-F05-10 | React UI + Chromium E2E | Real browser journey: Participant signs in → registers → opens `/my-registrations` → clicks `Cancel registration` → verifies `CANCELLED` + timestamp → navigates back to `/` → verifies freed seat and re-registers cleanly; also verify UI alert on `409` conflict without false success. |

**Planned TDD strategy (for [Issue #67](https://github.com/cottonlnwza/TTworkshop/issues/67)):** Commit failing tests covering `STS-F05-01..07` first (**RED** — route `POST /api/v1/me/registrations/:id/cancel` returns `404`), then implement service/router/UI changes until targeted and full suites pass (**GREEN**).

## 8. Feature Definition of Done — NOT MET (Pre-Implementation Contract)

- [ ] Pre-implementation contract and `DEC-06` independently reviewed (`Formal APPROVE`) and merged to `sprint_2_staging` via [Issue #66](https://github.com/cottonlnwza/TTworkshop/issues/66).
- [ ] TDD **RED → GREEN** evidence recorded on exact commits in [Issue #67](https://github.com/cottonlnwza/TTworkshop/issues/67).
- [ ] All 10 criteria (`AC-F05-01`–`AC-F05-10` ↔ `STS-F05-01`–`STS-F05-10`) implemented and passing against isolated loopback PostgreSQL (`ttworkshop_test`) and headless Chromium.
- [ ] Full automated regression (`npm run build`, `npm test`, Python `unittest`, hosted CI `build-test`) passes with zero regressions to Sprint 1 (`F-01`–`F-04`) and zero real secrets.
- [ ] Evidence ledger (`docs/evidence/p2-03-f05.md`), contract execution record, and `docs/traceability.md` updated; independent Reviewer (`cottonlnwza`) Formal `APPROVE`, teammate merge to `sprint_2_staging`, and Author post-merge verification complete.

**Change record:**
- `v0.1` (2026-11-23, [Issue #66](https://github.com/cottonlnwza/TTworkshop/issues/66)): Initial pre-implementation Sprint 2 contract authored by `thananun-7203`; `PENDING INDEPENDENT PEER REVIEW` by `cottonlnwza`. Zero code or tests executed.
