# F-08 — Event Attendance Check-in

> **PROPOSED pre-implementation contract v0.1.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23** · Contracts [Issue #70 (`P2-C2`)](https://github.com/cottonlnwza/TTworkshop/issues/70) · Planned Implementation [Issue #71 (`P2-07`)](https://github.com/cottonlnwza/TTworkshop/issues/71) · Sprint 3 (started in `Period 2` for D2 Part B)
> Source: `docs/srs.md` FR-13, BR-01, BR-14, NFR-01, NFR-02; `docs/features.md` F-08; `docs/system-sds.md` §§3–6; proposed scoped policy [`DEC-09`](../decisions/dec-09-checkin-reporting-filtering.md) and accepted [`DEC-04`](../decisions/dec-04-workshop-time.md), [`DEC-06`](../decisions/dec-06-cancellation-policy.md). **No `F-08` application code has been written and zero `F-08` STS have been executed.** This draft does not assert global SRS/SDS or instructor approval.

## 1. Purpose, dependencies, and boundaries

An authenticated owning `ORGANIZER` can record a one-time attendance check-in for an eligible `ACTIVE` registration belonging to their own `PUBLISHED` workshop during the workshop's start–end window (`starts_at <= now <= ends_at`). Check-in persists `checked_in_at` atomically in PostgreSQL, prevents duplicate check-in, prevents cancellation after check-in, and remains visible across Organizer rosters and Participant own-registration views after restarts.

**Depends on:**
- Accepted Sprint 1–2 slices on `sprint_2_staging`: `F-01` auth/session/roles, `F-02` workshop ownership & publication, `F-03` registrations (`004_registrations.sql` already includes `checked_in_at TIMESTAMPTZ`), `F-04` privacy-minimized registration views (`WD-F04-01`), `F-05` cancellation (`409 ALREADY_CHECKED_IN` guard), and `F-07` schedule lock (`active_count > 0` prevents moving `starts_at`/`ends_at`).
- Independent peer review (`Formal APPROVE`) and staging merge of [Issue #70 (`P2-C2`)](https://github.com/cottonlnwza/TTworkshop/issues/70) including [`DEC-09`](../decisions/dec-09-checkin-reporting-filtering.md).

**Exclusions (out of `F-08` scope):**
- QR-code scanning, external hardware readers, or bulk CSV check-in imports are excluded (`docs/srs.md` §3).
- Undo/uncheck-in is not an approved requirement in `docs/srs.md` (`BR-14` defines one-time check-in).
- Attendance summary aggregates and roster filtering belong to `F-09` ([`f-09-filtering-attendance-reporting.md`](f-09-filtering-attendance-reporting.md)).
- Production `main` release and GCP deployment remain separately gated (`P2-D2` / Sprint 3 release).

## 2. Feature SDS — workflow, atomicity, and invariants

1. Owning Organizer opens `/organizer/workshops/:id/registrations`, identifies an `ACTIVE` registration without `checked_in_at`, and clicks **`Check in`**.
2. Frontend submits `POST /api/v1/organizer/workshops/:workshopId/registrations/:registrationId/check-in` with `{}` body, session cookie, and same-origin `Origin`, disabling repeat clicks while pending.
3. Backend authenticates `ORGANIZER` (`401` anonymous, `403` Participant), enforces `Origin` (`403 FORBIDDEN_ORIGIN`), and validates numeric `:workshopId` and `:registrationId` (`404 NOT_FOUND` if invalid).
4. **Single PostgreSQL transaction (`BEGIN`):**
   - Lock the owned workshop row **first** (matching `F-03`/`F-05`/`F-07` lock order to prevent deadlocks):
     `SELECT id, status, starts_at, ends_at FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`.
   - If absent (missing or foreign Organizer) → rollback and return `404 NOT_FOUND`.
   - If `status !== 'PUBLISHED'` → rollback and return `409 INVALID_STATE` (`"Only published workshops support check-in"`).
   - Lock the target registration row scoped strictly to `:workshopId`:
     `SELECT id, workshop_id, participant_user_id, status, registered_at, cancelled_at, checked_in_at FROM registrations WHERE id = $1 AND workshop_id = $2 FOR UPDATE`.
   - If absent (missing or belongs to another workshop) → rollback and return `404 NOT_FOUND`.
   - If `status !== 'ACTIVE'` → rollback and return `409 INVALID_STATE` (`"Only ACTIVE registrations can be checked in"`).
   - If `checked_in_at !== null` → rollback and return **`409 ALREADY_CHECKED_IN`** (`"Registration is already checked in"`).
   - **Sample `now()` AFTER acquiring locks** and evaluate window bounds directly in PostgreSQL `TIMESTAMPTZ` precision (`DEC-09` §1, aligned with [Issue #71](https://github.com/cottonlnwza/TTworkshop/issues/71)):
     - If `starts_at IS NULL OR ends_at IS NULL` → rollback and return `409 INVALID_STATE`.
     - If `$now::timestamptz < starts_at` → rollback and return **`409 CHECKIN_WINDOW_CLOSED`** (`"Check-in has not opened yet"`).
     - If `$now::timestamptz > ends_at` → rollback and return **`409 CHECKIN_WINDOW_CLOSED`** (`"Check-in window has closed"`).
   - Persist atomically:
     ```sql
     UPDATE registrations
     SET checked_in_at = $3::timestamptz
     WHERE id = $1 AND workshop_id = $2 AND status = 'ACTIVE' AND checked_in_at IS NULL
     RETURNING id::text AS registration_id, participant_user_id::text AS participant_id, status,
       to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS registered_at,
       CASE WHEN cancelled_at IS NULL THEN NULL ELSE to_char(cancelled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') END AS cancelled_at,
       to_char(checked_in_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS checked_in_at
     ```
   - If `rowCount === 0` → rollback and return `409 ALREADY_CHECKED_IN`.
   - `COMMIT` and return `200 { data: ... }` with `Cache-Control: no-store`.
5. **Visibility updates (preserving `WD-F04-01` privacy minimization):**
   - `GET /api/v1/organizer/workshops/:id/registrations`, `GET /api/v1/me/registrations`, and `GET /api/v1/me/registrations/:id` return `checked_in_at: string | null` (microsecond UTC ISO) without adding email/name PII.

## 3. UI contract (planned)

| Screen / route | Expected behavior |
|---|---|
| Organizer roster (`/organizer/workshops/:id/registrations` in `RegistrationViews.tsx`) | For each `ACTIVE` registration with `checked_in_at === null`, displays a **`Check in`** button (disabled while request is pending). Once checked in, displays **`Checked in`** status and persisted `checked_in_at` timestamp (no repeat button). `CANCELLED` rows do not render a `Check in` button. Renders actionable `role="alert"` messages for `CHECKIN_WINDOW_CLOSED`, `ALREADY_CHECKED_IN`, and `INVALID_STATE` without falsely marking the row checked in. |
| Participant views (`/my-registrations` & `/my-registrations/:id` in `RegistrationViews.tsx`) | Displays **`Checked in`** indicator and `checked_in_at` timestamp when non-null, and disables/hides the `Cancel registration` action for checked-in registrations (backend still enforces `409 ALREADY_CHECKED_IN`). |

## 4. API contract (planned)

Base `/api/v1`. All responses include `Cache-Control: no-store`. Success envelope `{"data": ...}`; failure envelope `{"error": {"code": "...", "message": "..."}}`.

| Method / path | Auth & request | Expected success | Negative / boundary responses |
|---|---|---|---|
| `POST /organizer/workshops/:workshopId/registrations/:registrationId/check-in` | Authenticated `ORGANIZER` + same-origin `Origin`; body `{}` | `200` `{"data": { "registration_id": "<id>", "participant_id": "<id>", "status": "ACTIVE", "registered_at": "<ISO-us>", "cancelled_at": null, "checked_in_at": "<ISO-us>" }}` | `401 UNAUTHENTICATED`; `403 FORBIDDEN` (Participant); `403 FORBIDDEN_ORIGIN`; `404 NOT_FOUND` (foreign/missing workshop, invalid IDs, or registration from another workshop); `409 INVALID_STATE` (`DRAFT` workshop or `CANCELLED` registration); `409 CHECKIN_WINDOW_CLOSED` (`now < starts_at` `"Check-in has not opened yet"` or `now > ends_at` `"Check-in window has closed"`); `409 ALREADY_CHECKED_IN` (duplicate check-in) |
| `GET /organizer/workshops/:id/registrations` *(updated)* | Authenticated owning `ORGANIZER` | Existing paginated roster items + `"checked_in_at": "<ISO-us>" \| null` (6 authorized keys, zero PII) | Unchanged from F-04 (`400`, `401`, `403`, `404`) |
| `GET /me/registrations` & `GET /me/registrations/:id` *(updated)* | Authenticated `PARTICIPANT` | Existing own-registration DTO + `"checked_in_at": "<ISO-us>" \| null` | Unchanged from F-04/F-05 (`400`, `401`, `403`, `404`) |

## 5. Data contract and migration impact

- **Schema layer — NO NEW MIGRATION REQUIRED:** Reuses `registrations.checked_in_at TIMESTAMPTZ` already created in [`db/migrations/004_registrations.sql`](../../db/migrations/004_registrations.sql).
- **Locking discipline:** `workshops` row locked `FOR UPDATE` before `registrations` row `FOR UPDATE`, matching `F-03` (`POST /registrations`), `F-05` (`POST /cancel`), and `F-07` (`PATCH /organizer/workshops/:id`), guaranteeing deadlock freedom and strict serialization with concurrent cancellation or duplicate check-in.

## 6. Observable Acceptance Criteria (AC)

| AC ID | Observable outcome & linked requirements |
|---|---|
| **AC-F08-01** | Owning Organizer checks in an eligible `ACTIVE` registration within the inclusive `[starts_at, ends_at]` window (including exact `now === starts_at` and `now === ends_at`); `checked_in_at` persists in PostgreSQL (`200`) and appears in Organizer roster and Participant own-registration views without exposing email/name PII (`FR-13`, `BR-14`, `NFR-01`, `NFR-02`). |
| **AC-F08-02** | Attempting to check in an already checked-in registration fails with `409 ALREADY_CHECKED_IN` without overwriting the original `checked_in_at`; concurrent duplicate check-in requests serialize atomically so exactly one succeeds (`200`) and the other returns `409 ALREADY_CHECKED_IN` (`BR-14`). |
| **AC-F08-03** | Attempting check-in before `starts_at` (`"Check-in has not opened yet"`) or after `ends_at` (`"Check-in window has closed"`) fails with **`409 CHECKIN_WINDOW_CLOSED`** (including when a transaction blocks on `FOR UPDATE` until after `ends_at`), leaving `checked_in_at` `NULL` (`BR-14`, `DEC-09`, [Issue #71](https://github.com/cottonlnwza/TTworkshop/issues/71)). |
| **AC-F08-04** | Attempting check-in on a `CANCELLED` registration or `DRAFT` workshop fails with `409 INVALID_STATE`, and targeting a registration belonging to another workshop fails with `404 NOT_FOUND`, with zero DB mutation (`BR-14`). |
| **AC-F08-05** | Cross-feature `F-05` ↔ `F-08` integrity without changing `F-05` cutoff rules: (a) a checked-in registration cannot be cancelled (`409 ALREADY_CHECKED_IN`); (b) in the gap `[registration_deadline, starts_at)` for an earlier custom deadline, both concurrent cancel (`409 CANCELLATION_DEADLINE_PASSED`) and check-in (`409 CHECKIN_WINDOW_CLOSED`) fail; (c) under controlled `starts_at` boundary/lock-wait fixtures with `registration_deadline = null` (`effective_deadline === starts_at`), concurrent cancel and check-in serialize deadlock-free on `workshops → registrations` `FOR UPDATE` so the eligible operation succeeds and the other fails with `409`, and no row ever ends up both `CANCELLED` and `checked_in_at IS NOT NULL` (`BR-09`, `BR-14`, `DEC-09`). |
| **AC-F08-06** | Authorization & CSRF guards: anonymous (`401`), Participant (`403`), foreign Organizer (`404`), missing/foreign `Origin` (`403 FORBIDDEN_ORIGIN`), and non-numeric IDs (`404`) are denied without mutating DB (`BR-01`, `NFR-01`). |
| **AC-F08-07** | Persisted `checked_in_at` survives a real API process restart against PostgreSQL and remains retrievable by both owning Organizer and Participant (`NFR-02`). |
| **AC-F08-08** | Organizer UI (`RegistrationViews.tsx`) renders `Check in` only for unchecked `ACTIVE` rows, transitions cleanly to `Checked in` + timestamp after success, and displays `role="alert"` errors for `CHECKIN_WINDOW_CLOSED`/`ALREADY_CHECKED_IN`/`INVALID_STATE`; Participant UI shows `Checked in` and disables `Cancel registration` (`FR-13`). |
| **AC-F08-09** | End-to-end Chromium journey: Organizer checks in an eligible Participant from `/organizer/workshops/:id/registrations`, reloads to confirm persistence, and Participant observes `Checked in` on `/my-registrations` (`FR-13`, `NFR-02`). |

## 7. Software Test Specification (STS) — PLANNED, NOT EXECUTED

| Test ID | AC | Level | Preconditions & inputs → action → expected outcome |
|---|---|---|---|
| **STS-F08-01** | AC-F08-01 | API+DB boundary | Seed `PUBLISHED` workshop with `ACTIVE` registration → check in at exact `starts_at`, mid-window, and exact `ends_at` (separate registrations) → `200`, `checked_in_at` persisted at microsecond UTC ISO; Organizer roster and Participant `/me/registrations` return `checked_in_at` with zero email/name PII. |
| **STS-F08-02** | AC-F08-02 | API+DB + concurrency | Check in an `ACTIVE` registration once (`200`, record `t1`), repeat sequentially → `409 ALREADY_CHECKED_IN`, DB `checked_in_at` still equals `t1`; fire 2 synchronized concurrent check-in requests on another `ACTIVE` row → exactly one `200`, one `409 ALREADY_CHECKED_IN`. |
| **STS-F08-03** | AC-F08-03 | API+DB boundary + lock-wait | Check in at `starts_at - 1s` → `409 CHECKIN_WINDOW_CLOSED` (`"Check-in has not opened yet"`); check in at `ends_at + 1s` → `409 CHECKIN_WINDOW_CLOSED` (`"Check-in window has closed"`); hold `FOR UPDATE` at `ends_at - 1s`, wait for check-in to block on lock, advance injected `now` past `ends_at`, commit lock → `409 CHECKIN_WINDOW_CLOSED`, `checked_in_at IS NULL`. |
| **STS-F08-04** | AC-F08-04 | API+DB negative | Attempt check-in on `CANCELLED` registration (`409 INVALID_STATE`), `DRAFT` workshop (`409 INVALID_STATE`), and valid registration ID paired with a different owned workshop ID (`404 NOT_FOUND`) → zero DB mutation. |
| **STS-F08-05** | AC-F08-05 | API+DB cross-feature boundary & lock-order | (a) Check in `ACTIVE` registration at `now = starts_at` (`200`) → Participant calls `POST /me/registrations/:id/cancel` → `409 ALREADY_CHECKED_IN`; (b) Gap fixture (`registration_deadline = starts_at - 1h`, `now = starts_at - 30m`) → concurrent cancel and check-in BOTH fail (`409 CANCELLATION_DEADLINE_PASSED` and `409 CHECKIN_WINDOW_CLOSED`), row stays `ACTIVE` with `checked_in_at IS NULL`; (c) Controlled boundary/lock-order fixtures (`registration_deadline = null` so `effective_deadline === starts_at`): (c1) at `now = starts_at - 1s`, concurrent cancel and check-in serialize cleanly (`cancel` → `200 CANCELLED`, `check-in` → `409 CHECKIN_WINDOW_CLOSED` or `409 INVALID_STATE` if cancel commits first); (c2) hold `workshops` `FOR UPDATE` at `starts_at - 1s`, queue both cancel and check-in waiting on the lock, advance `now` to `starts_at`, release lock → `check-in` → `200`, `cancel` → `409` (`ALREADY_CHECKED_IN` or `CANCELLATION_DEADLINE_PASSED`). In every fixture, assert DB never has both `status = 'CANCELLED'` and `checked_in_at IS NOT NULL`. |
| **STS-F08-06** | AC-F08-06 | API+DB security | Anonymous (`401`), Participant (`403`), Organizer B targeting Organizer A's workshop (`404`), foreign `Origin` (`403 FORBIDDEN_ORIGIN`), invalid `:workshopId`/`:registrationId` (`404`) → zero DB mutations. |
| **STS-F08-07** | AC-F08-07 | Process restart | Check in Participant via spawned API process → stop and restart API process → verify `checked_in_at` persists in both `GET /organizer/workshops/:id/registrations` and `GET /me/registrations`. |
| **STS-F08-08** | AC-F08-08 | React UI | Render Organizer roster with `ACTIVE` unchecked, `ACTIVE` checked-in, and `CANCELLED` rows → verify button placement, click `Check in` (`200` transitions to `Checked in`), verify `409 CHECKIN_WINDOW_CLOSED` displays `role="alert"`; render Participant view showing `Checked in` and disabled cancel control. |
| **STS-F08-09** | AC-F08-09 | Chromium E2E | Real browser flow during active workshop window: Organizer signs in → opens roster → clicks `Check in` → sees `Checked in` → reloads page and confirms persistence → Participant signs in → opens `/my-registrations` → sees `Checked in` with cancel disabled. |

**Planned TDD strategy (for [Issue #71](https://github.com/cottonlnwza/TTworkshop/issues/71)):** Commit failing `tests/f08.*` tests first (**RED** — check-in endpoint returns `404` and `checked_in_at` is absent from roster/UI), then implement transactional check-in API, DTO updates (expanding `tests/f04.integration.test.ts` key allowlist cleanly per `DEC-09` §1.5), and UI controls until targeted and full suites pass (**GREEN**).

## 8. Feature Definition of Done — NOT MET (Pre-Implementation Contract)

- [ ] Pre-implementation contract and `DEC-09` independently reviewed (`Formal APPROVE`) and merged to `sprint_2_staging` via [Issue #70](https://github.com/cottonlnwza/TTworkshop/issues/70).
- [ ] TDD **RED → GREEN** evidence recorded on exact commits in [Issue #71](https://github.com/cottonlnwza/TTworkshop/issues/71).
- [ ] All 9 criteria (`AC-F08-01`–`AC-F08-09` ↔ `STS-F08-01`–`STS-F08-09`) implemented and passing against isolated loopback PostgreSQL (`ttworkshop_test`) and headless Chromium.
- [ ] Full automated regression (`npm run build`, `npm test`, Python `unittest`, hosted CI `build-test`) passes with zero unintended regressions to Sprints 1–2 and zero real secrets.
- [ ] Evidence ledger (`docs/evidence/p2-07-f08.md`), contract execution record, and `docs/traceability.md` updated; independent Reviewer (`cottonlnwza`) Formal `APPROVE`, teammate merge to `sprint_2_staging`, and Author post-merge verification complete.

**Change record:**
- `v0.1` (2026-11-23, [Issue #70](https://github.com/cottonlnwza/TTworkshop/issues/70)): Initial pre-implementation Sprint 3 contract authored by `thananun-7203`; `PENDING INDEPENDENT PEER REVIEW` by `cottonlnwza`. Zero code or tests executed.
- `v0.1.1` (2026-11-23, [PR #78](https://github.com/cottonlnwza/TTworkshop/pull/78) Round 1 `R-01` & `R-02` remediation): Standardized outside-window check-in error code on authoritative **`409 CHECKIN_WINDOW_CLOSED`** matching [Issue #71](https://github.com/cottonlnwza/TTworkshop/issues/71) (`R-02`), and specified controlled gap/boundary/lock-order clock fixtures in `AC-F08-05` / `STS-F08-05` respecting `F-05`'s `now < effective_deadline` cutoff (`R-01`). Still `PROPOSED / NOT EXECUTED`.
