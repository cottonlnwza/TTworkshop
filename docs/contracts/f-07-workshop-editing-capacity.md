# F-07 — Published Workshop Editing and Capacity Guard

> **PROPOSED pre-implementation contract v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23** · Contracts [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) · Planned Implementation [Issue #69 (`P2-05`)](https://github.com/cottonlnwza/TTworkshop/issues/69) · Sprint 2 (`Period 2`)
> Source: `docs/srs.md` FR-12, BR-01, BR-02, BR-03, BR-04, BR-08, BR-13, BR-16, NFR-01, NFR-02, NFR-03; `docs/features.md` F-07; `docs/system-sds.md` §§3–6; proposed scoped policies [`DEC-07`](../decisions/dec-07-published-workshop-editing.md) (including baseline revision `REV-S2-01`) and [`DEC-08`](../decisions/dec-08-capacity-guard.md). **No `F-07` application code has been written and zero `F-07` STS have been executed.** This draft does not assert global SRS/SDS or instructor approval.

## 1. Purpose, dependencies, and boundaries

An authenticated owning `ORGANIZER` can update permitted attributes and capacity of an owned `PUBLISHED` workshop while strictly preserving business, scheduling, ownership, and capacity invariants. Most critically, reducing `capacity` below the authoritative count of current `ACTIVE` registrations (`BR-13`) is rejected atomically under a PostgreSQL row lock so concurrent participant registrations and capacity edits can never violate `active_count <= capacity`.

**Depends on:**
- Accepted Sprint 1 slices: `F-01` session/role auth, `F-02` workshop ownership & DB constraints (`002_workshops.sql`, `003_workshops_non_empty.sql`), `F-03` atomic registration lock (`004_registrations.sql`).
- Independent peer review (`Formal APPROVE`) and staging merge of [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) including [`DEC-07`](../decisions/dec-07-published-workshop-editing.md) (`REV-S2-01`) and [`DEC-08`](../decisions/dec-08-capacity-guard.md).
- Coordinates with `F-05` (`CANCELLED` rows excluded from `active_count`) and `F-06` (increasing capacity never auto-reopens `registration_closed = true`).

**Baseline Revision (`REV-S2-01`):**
- In Sprint 1 (`F-02` / `AC-F02-12`), `PATCH /api/v1/organizer/workshops/:id` temporarily rejected edits on `PUBLISHED` workshops with `409 INVALID_STATE` because `FR-12` was deferred to Sprint 2. Under `DEC-07` (`REV-S2-01`), `PATCH /api/v1/organizer/workshops/:id` supports lifecycle-aware updates: `DRAFT` behavior remains 100% unchanged from `F-02`, while `PUBLISHED` updates follow the strict rules below. Double-publish (`AC-F02-07` / `POST /publish`) remains `409 INVALID_STATE` and `PATCH` can never revert `PUBLISHED` back to `DRAFT`.

**Exclusions (out of `F-07` scope):**
- Manual close/reopen toggle belongs to `F-06` (`PATCH` cannot mutate `registration_closed`).
- Workshop deletion or cancelling an entire workshop event is not an approved requirement in `docs/srs.md` and is excluded.
- Attendance check-in (`F-08`) and filtering/reporting (`F-09`) belong to Sprint 3.

## 2. Feature SDS — workflow, atomicity, and invariants

1. Owning Organizer opens an owned `PUBLISHED` workshop in `OrganizerApp`, edits permitted fields, and submits `PATCH /api/v1/organizer/workshops/:id` with session cookie and same-origin `Origin`.
2. Backend authenticates `ORGANIZER` (`401`/`403`), enforces `Origin` (`403 FORBIDDEN_ORIGIN`), validates numeric `:id` (`404 NOT_FOUND`), and explicitly rejects any payload attempting to supply immutable/server-managed fields (`id`, `owner_user_id`, `status`, `registration_closed`, `created_at`) with `400 VALIDATION`.
3. **Single PostgreSQL transaction (`BEGIN`):**
   - Lock the workshop row: `SELECT id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`.
   - If absent (missing or foreign owner) → rollback and return `404 NOT_FOUND`.
   - **If `status === 'DRAFT'`:** Execute the existing `F-02` partial-draft validation and update path unchanged, commit, return `200`.
   - **If `status === 'PUBLISHED'`:**
     1. **Ended-workshop lock (`DEC-07` / `BR-16`):** If `now() >= current.ends_at`, rollback and return **`409 WORKSHOP_ENDED`**.
     2. **Field validation:**
        - If `title`, `description`, or `location` is present in body: must be a non-empty trimmed string (`400 VALIDATION` if `null`, empty, whitespace-only, or non-string; enforces DB `published_non_empty`).
        - If `capacity` is present in body: must be a positive 32-bit integer (`1 <= capacity <= 2147483647`, `BR-03`; else `400 VALIDATION`).
        - If `starts_at`, `ends_at`, or non-null `registration_deadline` is present: must be valid explicit-offset ISO 8601 (`DEC-04`; else `400 VALIDATION`). `registration_deadline: null` is allowed (clears custom deadline back to default `starts_at`).
     3. **Authoritative `ACTIVE` count under `FOR UPDATE`:** Query `SELECT count(*)::int AS count FROM registrations WHERE workshop_id = $1 AND status = 'ACTIVE'` (`CANCELLED` rows excluded).
     4. **Schedule lock (`DEC-07` / `BR-16`):** Determine if the request changes `starts_at` or `ends_at` (supplied timestamp differs from persisted instant). If changed AND (`active_count > 0` OR `now() >= current.starts_at`), rollback and return **`409 SCHEDULE_LOCKED`**.
     5. **Merged chronological invariants:** Compute merged `starts_at`, `ends_at`, and `registration_deadline`. Enforce `mergedEnd > mergedStart` (`BR-02`, `400 VALIDATION`) and `mergedDeadline === null || mergedDeadline <= mergedStart` (`BR-08`, `400 VALIDATION`).
     6. **Atomic capacity guard (`DEC-08` / `BR-13`):** If merged `capacity < active_count`, rollback and return **`409 CAPACITY_BELOW_ACTIVE`**.
     7. Execute `UPDATE workshops SET ... updated_at = now() WHERE id = $1 AND owner_user_id = $2 AND status = 'PUBLISHED' RETURNING ...` and `COMMIT`.
4. **Concurrency guarantee (`DEC-08` / `NFR-03`):** Because both `POST /api/v1/workshops/:id/registrations` (`F-03`) and `PATCH /api/v1/organizer/workshops/:id` (`F-07`) acquire `FOR UPDATE` on the same `workshops` row, concurrent capacity reduction and participant registration serialize cleanly so `active_count <= capacity` holds in every interleaving.

## 3. UI contract (planned)

| Screen / route | Expected behavior |
|---|---|
| Organizer `My Workshops` (`OrganizerApp.tsx`) | For each owned `PUBLISHED` workshop, displays **`Edit workshop`** alongside **`View registrations`** (for `DRAFT`, keeps **`Edit / Publish`** unchanged). |
| Published workshop edit view (`OrganizerApp.tsx` detail/edit panel) | Displays current workshop fields, status `PUBLISHED`, and live `ACTIVE` registration count vs `capacity` (or server-returned error context). Allows editing `title`, `description`, `location`, `capacity`, `registration_deadline`, and (when unlocked) `starts_at`/`ends_at`. Displays clear guidance when schedule is locked (`active_count > 0` or started) or ended. Shows actionable `role="alert"` feedback for `CAPACITY_BELOW_ACTIVE`, `SCHEDULE_LOCKED`, `WORKSHOP_ENDED`, and `VALIDATION` errors without falsely claiming save success. |
| Participant discovery (`ParticipantApp.tsx`) | Reflects updated `title`, `description`, `location`, `starts_at`/`ends_at`, `capacity`, `remaining_seats`, and `registration_deadline` on next load/refresh. |

## 4. API contract (planned)

Base `/api/v1`. Success envelope `{"data": ...}`; failure envelope `{"error": {"code": "...", "message": "..."}}`.

| Method / path | Auth & request | Expected success | Negative / boundary responses |
|---|---|---|---|
| `PATCH /organizer/workshops/:id` | Authenticated `ORGANIZER` + same-origin `Origin`; partial JSON of editable fields (`title`, `description`, `location`, `starts_at`, `ends_at`, `capacity`, `registration_deadline`) | `200` `{"data": { id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, (registration_closed when F-06 present), updated_at }}` | `400 VALIDATION` (blank/null required published text, non-positive/non-integer capacity, naive/invalid timestamp, `ends_at <= starts_at`, `deadline > starts_at`, or immutable field override `status`/`owner_user_id`/`registration_closed`); `401 UNAUTHENTICATED`; `403 FORBIDDEN` (Participant); `403 FORBIDDEN_ORIGIN`; `404 NOT_FOUND` (foreign/missing/invalid ID); `409 CAPACITY_BELOW_ACTIVE` (`capacity < active_count`); `409 SCHEDULE_LOCKED` (schedule edit when `active_count > 0` or `now >= starts_at`); `409 WORKSHOP_ENDED` (`now >= ends_at`) |
| `GET /organizer/workshops/:id` *(existing F-02, optional enrichment)* | Authenticated `ORGANIZER` | `200` own workshop detail (may include authoritative `active_registrations_count` integer for edit UI guidance while preserving all existing fields) | Unchanged from F-02 (`401`, `403`, `404`) |

## 5. Data contract and migration impact

- **Schema layer — NO NEW MIGRATION REQUIRED:** Reuses existing [`002_workshops.sql`](../../db/migrations/002_workshops.sql), [`003_workshops_non_empty.sql`](../../db/migrations/003_workshops_non_empty.sql), and [`004_registrations.sql`](../../db/migrations/004_registrations.sql) tables and DB CHECK constraints (`valid_capacity`, `valid_time_order`, `published_required`, `published_non_empty`, `published_deadline`).
- **Locking discipline:** `SELECT ... FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE` runs inside the same transaction as the `ACTIVE` count check and `UPDATE workshops`, matching the lock order of `F-03` (`POST /workshops/:id/registrations`) to prevent deadlocks and race anomalies.

## 6. Observable Acceptance Criteria (AC)

| AC ID | Observable outcome & linked requirements |
|---|---|
| **AC-F07-01** | Owning Organizer edits allowed metadata (`title`, `description`, `location`, `registration_deadline`) of an owned `PUBLISHED` workshop before `ends_at`; updates persist (`200`) and appear in Participant discovery (`FR-12`, `NFR-02`). |
| **AC-F07-02** | Owning Organizer increases `capacity` or reduces `capacity` down to `active_count` (including exact boundary `capacity === active_count`); update succeeds (`200`) and `remaining_seats` reflects the new capacity immediately (`FR-12`, `BR-03`, `BR-13`, `DEC-08`). |
| **AC-F07-03** | Attempting to reduce `capacity` below current `ACTIVE` registration count (`capacity < active_count`) fails with `409 CAPACITY_BELOW_ACTIVE` and leaves DB unchanged; `CANCELLED` registrations do **not** block reducing capacity down to the `ACTIVE` count (`BR-13`, `DEC-08`). |
| **AC-F07-04** | Concurrent capacity reduction (`F-07`) and Participant registration (`F-03`) racing on the last seat serialize atomically via `FOR UPDATE` so `active_count <= capacity` is never violated (`BR-06`, `BR-13`, `DEC-08`, `NFR-03`). |
| **AC-F07-05** | When `active_count === 0` and `now < starts_at`, owning Organizer can update `starts_at` and `ends_at` provided explicit ISO 8601 offsets (`DEC-04`), merged `ends_at > starts_at` (`BR-02`), and merged `registration_deadline <= starts_at` (`BR-08`); invalid combinations return `400 VALIDATION` without mutation (`FR-12`, `BR-02`, `BR-08`). |
| **AC-F07-06** | Attempting to change `starts_at` or `ends_at` when `active_count > 0` OR when `now >= starts_at` fails with `409 SCHEDULE_LOCKED`; attempting any edit on a `PUBLISHED` workshop when `now >= ends_at` fails with `409 WORKSHOP_ENDED` without mutating DB (`BR-16`, `DEC-07`). |
| **AC-F07-07** | Attempting to blank/null `title`, `description`, or `location` on a `PUBLISHED` workshop, set `capacity <= 0`/non-integer, or mutate immutable fields (`status`, `owner_user_id`, `registration_closed`) via `PATCH` fails with `400 VALIDATION` without mutating DB (`BR-03`, `BR-04`, `DEC-07`). |
| **AC-F07-08** | Authorization & CSRF guards: anonymous (`401`), Participant (`403`), foreign Organizer (`404`), and missing/foreign `Origin` (`403 FORBIDDEN_ORIGIN`) are denied without disclosing or mutating the workshop (`BR-01`, `NFR-01`). |
| **AC-F07-09** | Edited `PUBLISHED` workshop fields and capacity persist across an API process restart (`NFR-02`), while Sprint 1 `F-02` DRAFT partial-update behavior and double-publish rejection (`AC-F02-07`) remain intact (`REV-S2-01`). |
| **AC-F07-10** | Organizer UI journey: edit published workshop details and capacity, observe error alert when attempting `capacity < active_count` or locked schedule edit, then save a valid edit and confirm persistence on reload (`FR-12`). |

## 7. Software Test Specification (STS) — PLANNED, NOT EXECUTED

| Test ID | AC | Level | Preconditions & inputs → action → expected outcome |
|---|---|---|---|
| **STS-F07-01** | AC-F07-01 | API+DB | Seed `PUBLISHED` workshop owned by Organizer A → `PATCH /organizer/workshops/:id` updating `title`, `description`, `location`, and `registration_deadline` → `200`, Participant `GET /workshops/:id` returns updated values. |
| **STS-F07-02** | AC-F07-02 | API+DB boundary | Seed `PUBLISHED` workshop `capacity=5` with 2 `ACTIVE` registrations → `PATCH` `capacity=2` (exact boundary) → `200`, `remaining_seats=0`; then `PATCH` `capacity=10` → `200`, `remaining_seats=8`. |
| **STS-F07-03** | AC-F07-03 | API+DB negative | Seed `PUBLISHED` workshop `capacity=5` with 2 `ACTIVE` and 2 `CANCELLED` registrations → `PATCH` `capacity=1` → `409 CAPACITY_BELOW_ACTIVE`, DB remains `capacity=5`; then `PATCH` `capacity=2` → `200` (proving `CANCELLED` rows do not inflate `active_count`). |
| **STS-F07-04** | AC-F07-04 | Real DB concurrency | Seed `PUBLISHED` workshop `capacity=2` with 1 `ACTIVE` registration → launch synchronized concurrent `PATCH` (`capacity=1`) as Organizer A and `POST /workshops/:id/registrations` as Participant B → exactly one wins, the other returns `409` (`CAPACITY_BELOW_ACTIVE` or `CAPACITY_FULL`), and final DB state satisfies `active_count <= capacity`. |
| **STS-F07-05** | AC-F07-05 | API+DB validation | `PUBLISHED` workshop with 0 `ACTIVE` rows and `now < starts_at` → valid `starts_at`/`ends_at` update succeeds (`200`); `ends_at <= starts_at` (`400`), `deadline > new starts_at` (`400`), and naive timestamp (`400`) all fail with zero DB mutation. |
| **STS-F07-06** | AC-F07-06 | API+DB boundary | (a) `PUBLISHED` workshop with 1 `ACTIVE` row → `PATCH` changing `starts_at` → `409 SCHEDULE_LOCKED`; (b) 0 `ACTIVE` rows with injected `now >= starts_at` and `< ends_at` → `PATCH` changing `ends_at` → `409 SCHEDULE_LOCKED` while `location` edit still returns `200`; (c) injected `now >= ends_at` → `PATCH` `title` → `409 WORKSHOP_ENDED`. |
| **STS-F07-07** | AC-F07-07 | API+DB negative | On `PUBLISHED` workshop, submit `title: ""`, `description: "   "`, `location: null`, `capacity: 0`, `capacity: 2.5`, `status: "DRAFT"`, `owner_user_id: "999"`, or `registration_closed: true` → all return `400 VALIDATION`, DB unchanged. |
| **STS-F07-08** | AC-F07-08 | API+DB security | Anonymous (`401`), Participant (`403`), Organizer B targeting Organizer A's published workshop (`404`), and foreign `Origin` (`403 FORBIDDEN_ORIGIN`) → zero DB mutations. |
| **STS-F07-09** | AC-F07-09 | Process restart + regression | Persist `PATCH` update to `PUBLISHED` workshop → restart API process → verify updated fields/capacity; also verify `DRAFT` partial update (`STS-F02-12` draft flow) and double-publish `409` (`STS-F02-07`) still pass. |
| **STS-F07-10** | AC-F07-10 | React UI + Chromium E2E | Real browser flow: Organizer opens published workshop → clicks `Edit workshop` → submits `capacity < active_count` and sees error alert → submits valid location & increased capacity → saves and verifies persistence across page reload. |

**Planned TDD strategy (for [Issue #69](https://github.com/cottonlnwza/TTworkshop/issues/69)):** Commit failing tests covering `STS-F07-01..08` first (**RED** — `PATCH` on published workshop currently returns `409 INVALID_STATE`), then implement transactional `F-07` logic and UI controls (plus update `STS-F02-12`'s superseded `afterPublish` assertion per `REV-S2-01`) until targeted and full suites pass (**GREEN**).

## 8. Feature Definition of Done — NOT MET (Pre-Implementation Contract)

- [ ] Pre-implementation contract, `DEC-07` (`REV-S2-01`), and `DEC-08` independently reviewed (`Formal APPROVE`) and merged to `sprint_2_staging` via [Issue #66](https://github.com/cottonlnwza/TTworkshop/issues/66).
- [ ] TDD **RED → GREEN** evidence recorded on exact commits in [Issue #69](https://github.com/cottonlnwza/TTworkshop/issues/69).
- [ ] All 10 criteria (`AC-F07-01`–`AC-F07-10` ↔ `STS-F07-01`–`STS-F07-10`) implemented and passing against isolated loopback PostgreSQL (`ttworkshop_test`) and headless Chromium.
- [ ] Full automated regression (`npm run build`, `npm test`, Python `unittest`, hosted CI `build-test`) passes with zero unintended regressions to Sprint 1 (`F-01`–`F-04`), `F-05`, and `F-06`, and zero real secrets.
- [ ] Evidence ledger (`docs/evidence/p2-05-f07.md`), contract execution record, `docs/traceability.md`, and `REV-S2-01` entry in Deliverable 2 Part A updated; independent Reviewer (`cottonlnwza`) Formal `APPROVE`, teammate merge to `sprint_2_staging`, and Author post-merge verification complete.

**Change record:**
- `v0.1` (2026-11-23, [Issue #66](https://github.com/cottonlnwza/TTworkshop/issues/66)): Initial pre-implementation Sprint 2 contract authored by `thananun-7203`; `PENDING INDEPENDENT PEER REVIEW` by `cottonlnwza`. Zero code or tests executed.
