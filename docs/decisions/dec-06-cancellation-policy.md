# DEC-06 — Registration Cancellation Cutoff, Retained History, and Re-registration Policy

> **PROPOSED Sprint 2 scoped working decision v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23**
> Owner scope: [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) · Implementation: [Issue #67 (`P2-03` / `F-05`)](https://github.com/cottonlnwza/TTworkshop/issues/67)
> Linked requirements: `FR-10`, `FR-08`, `FR-09`; `BR-01`, `BR-05`, `BR-06`, `BR-09`, `BR-10`, `BR-12`; `NFR-01`, `NFR-02`, `NFR-03`

## Decision

1. **Exact cancellation deadline boundary (`BR-09` aligned with `DEC-04`):**
   - A Participant may cancel their own `ACTIVE` registration only while **`now < effective_deadline`**, where `effective_deadline = COALESCE(workshop.registration_deadline, workshop.starts_at)`.
   - Exact equality (`now >= effective_deadline`) is **rejected** with `409 CANCELLATION_DEADLINE_PASSED` and no DB mutation.
   - Defense in depth: if persisted `workshop.registration_deadline > workshop.starts_at` (or `starts_at IS NULL`), fail closed with `409 INVALID_DEADLINE`.
2. **Retained history without row deletion (`BR-09`, `NFR-02`):**
   - Cancellation executes inside a single PostgreSQL transaction locking the target workshop row (`SELECT ... FOR UPDATE`), updates `registrations.status = 'CANCELLED'` and `registrations.cancelled_at = now()`, and **never deletes** the registration row.
   - Reuses existing `db/migrations/004_registrations.sql` columns (`status`, `cancelled_at`) and check constraint `registration_cancelled_timestamp`; **no new schema migration or history table is added**.
   - Attempting to cancel an already-`CANCELLED` registration returns `409 ALREADY_CANCELLED` without modifying its original `cancelled_at` timestamp.
   - Forward-compatible check-in invariant (`BR-14`): if `checked_in_at IS NOT NULL`, cancellation is rejected with `409 ALREADY_CHECKED_IN`.
3. **Manual closure independence (`BR-10` / `DEC-05`):**
   - `workshop.registration_closed = true` does **not** block timely cancellation of an existing `ACTIVE` registration.
   - Cancellation frees one active seat (reducing `ACTIVE` count by 1) without altering `workshop.registration_closed`.
4. **Re-registration after cancellation (`BR-12`):**
   - A Participant whose prior registration is `CANCELLED` may register again via `POST /api/v1/workshops/:id/registrations`.
   - Re-registration inserts a **new** `ACTIVE` row (new `id`, new `registered_at`, `cancelled_at = NULL`), preserving the prior `CANCELLED` row for audit/reporting accuracy (`F-09`).
   - Supported natively by existing PostgreSQL partial unique index `registrations_one_active_per_participant_workshop_idx ON registrations(workshop_id, participant_user_id) WHERE status = 'ACTIVE'`.
   - Re-registration must satisfy all standard eligibility gates atomically under `FOR UPDATE`: `PUBLISHED`, not manually closed (`F-06`), valid deadline, `now < effective_deadline`, `active_count < capacity`, and no existing `ACTIVE` duplicate.
5. **History visibility & privacy (`F-04` read-surface compatibility):**
   - `GET /api/v1/me/registrations` and `GET /api/v1/me/registrations/:id` return both `ACTIVE` and `CANCELLED` rows in existing deterministic `registered_at DESC, id DESC` cursor pagination order, adding `cancelled_at: string | null` to the registration DTO.
   - `GET /api/v1/organizer/workshops/:id/registrations` returns both `ACTIVE` and `CANCELLED` rows with `cancelled_at: string | null`, strictly preserving `WD-F04-01` (opaque `participant_id` only; never expose Participant email or full name).

## Alternatives Considered

- **Separate `registration_history` audit table:** Rejected as unnecessary complexity (`docs/system-sds.md` §3 item 6 explicitly marked this `OPEN` and warned *"do not add it by default"*); retaining immutable `CANCELLED` rows with `cancelled_at` and inserting a new row on re-registration preserves complete chronological history cleanly.
- **Mutating a `CANCELLED` row back to `ACTIVE` on re-registration:** Rejected because overwriting the row destroys historical cancellation timestamps and breaks Sprint 3 `FR-14` / `BR-15` cancelled-count reporting.
- **Allowing cancellation up to `starts_at` even when `registration_deadline < starts_at`:** Rejected so both registration and cancellation share one predictable, unambiguous effective-deadline boundary (`DEC-04`).

## Consequences

- `F-05` (`Issue #67`) requires **zero new SQL migrations**.
- Existing Sprint 1 `F-04` read tests remain compatible while adding `cancelled_at` (`null` for `ACTIVE` rows, ISO 8601 UTC string for `CANCELLED` rows).
- `ParticipantApp.tsx` must derive active registration state from server data or clear stale local `registeredWorkshopIds` state so re-registration works smoothly after cancellation.

## Status & Review Gate

- **Current status:** `PROPOSED` under [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66); awaits independent peer review (`Formal APPROVE`) and staging merge into `sprint_2_staging` by `cottonlnwza` before `F-05` implementation begins.
