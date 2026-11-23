# DEC-05 — Manual Registration Closure (Closure A) and Reopen Policy

> **PROPOSED Sprint 2 scoped working decision v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23**
> Owner scope: [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) · Implementation: [Issue #68 (`P2-04` / `F-06`)](https://github.com/cottonlnwza/TTworkshop/issues/68) and cancellation interaction in [Issue #67 (`P2-03` / `F-05`)](https://github.com/cottonlnwza/TTworkshop/issues/67)
> Linked requirements: `FR-11`; `BR-01`, `BR-07`, `BR-08`, `BR-10`, `BR-11`; `NFR-01`, `NFR-02`

## Decision

TTworkshop adopts **Closure A** semantics for manual registration closure on `PUBLISHED` workshops:

1. **Persistent flag (Migration `005`):** Add `registration_closed BOOLEAN NOT NULL DEFAULT false` to `workshops` via versioned SQL migration `db/migrations/005_workshop_manual_closure.sql`. Existing workshops default to `false` (not manually closed).
2. **Owner-only transitions on `PUBLISHED` workshops:**
   - Only the authenticated owning `ORGANIZER` may manually close (`registration_closed = true`) or reopen (`registration_closed = false`) an owned `PUBLISHED` workshop.
   - `DRAFT` workshops, already-closed workshops (on close), and already-open workshops (on reopen) return `409 INVALID_STATE` without mutation.
   - Anonymous requests return `401 UNAUTHENTICATED`; `PARTICIPANT` requests return `403 FORBIDDEN`; foreign or missing workshop IDs return `404 NOT_FOUND`.
3. **Effect of manual closure (`BR-10`):**
   - While `registration_closed = true`, all **new** registration attempts (`POST /api/v1/workshops/:id/registrations`) — including re-registrations after cancellation — fail inside the `FOR UPDATE` transaction with `409 REGISTRATION_CLOSED`.
   - Participant discovery (`GET /api/v1/workshops` and `GET /api/v1/workshops/:id`) exposes `registration_closed: true` and computes `registration_open: false`.
   - Manual closure does **not** prevent an already-`ACTIVE` Participant from performing a timely self-cancellation under `DEC-06` (`F-05`).
   - A Participant cancellation **never** automatically sets `registration_closed = false` (no auto-reopen).
4. **Manual reopen gate (`BR-11`):**
   - Reopening (`registration_closed = false`) is permitted only while the workshop is `PUBLISHED`, has a valid deadline (`registration_deadline IS NULL OR registration_deadline <= starts_at`), and **`now < COALESCE(registration_deadline, starts_at)`**.
   - At or after the effective deadline (`now >= effective_deadline`), reopen is rejected with `409 DEADLINE_PASSED`, leaving `registration_closed = true`.
   - If malformed persisted data violates `registration_deadline > starts_at`, reopen fails closed with `409 INVALID_DEADLINE`.
5. **Published deadline updates (`FR-11` / `BR-08`):**
   - Owning `ORGANIZER` may update `registration_deadline` on an owned `PUBLISHED` workshop before workshop end (`now < ends_at`) via `PATCH /api/v1/organizer/workshops/:id/registration-deadline` (nullable to reset to default `starts_at`, or explicit-offset ISO 8601 satisfying `registration_deadline <= starts_at`).
   - Updating the deadline never silently flips `registration_closed`; manual closure remains an explicit organizer action.

## Alternatives Considered

- **Option B (Closure blocks cancellation too):** Rejected because `docs/srs.md` `BR-10` explicitly requires separating the new-registration gate from an already-`ACTIVE` Participant's right to cancel before the deadline.
- **Option C (Auto-reopen when a seat frees up after cancellation):** Rejected because organizers manually close registration for operational reasons (e.g., room/material lock) and `BR-10` explicitly prohibits automatic reopen.

## Consequences

- `F-06` (`Issue #68`) owns migration `005_workshop_manual_closure.sql`, the `/close-registration`, `/reopen-registration`, and `/registration-deadline` endpoints, and updating `GET /workshops`, `GET /workshops/:id`, and `POST /workshops/:id/registrations` to enforce `registration_closed`.
- `F-05` (`Issue #67`) cancellation checks must deliberately **not** reject cancellation due to `registration_closed = true` and must never modify `workshops.registration_closed`.
- `api/runtime-schema.ts` (`verifyProductionSchema`) and Cloud Run `ttworkshop-migrate` Job will apply `005_workshop_manual_closure.sql` cleanly using existing table privileges (column `ALTER TABLE`, no new tables or sequences).

## Status & Review Gate

- **Current status:** `PROPOSED` under [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66); awaits independent peer review (`Formal APPROVE`) and staging merge into `sprint_2_staging` by `cottonlnwza` before dependent Sprint 2 implementation begins.
- This scoped decision does not assert global SRS/SDS approval or instructor sign-off.
