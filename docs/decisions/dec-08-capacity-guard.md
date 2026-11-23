# DEC-08 — Atomic Workshop Capacity Guard Policy

> **PROPOSED Sprint 2 scoped working decision v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23**
> Owner scope: [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) · Implementation: [Issue #69 (`P2-05` / `F-07`)](https://github.com/cottonlnwza/TTworkshop/issues/69)
> Linked requirements: `FR-12`; `BR-03`, `BR-06`, `BR-13`, `BR-16`; `NFR-02`, `NFR-03`

## Decision

1. **Lower bound (`BR-13`):** Updating `capacity` on a `PUBLISHED` workshop must satisfy both:
   - `capacity` is a positive integer (`capacity > 0`, `BR-03`; invalid/zero/negative/non-integer/null returns `400 VALIDATION`), AND
   - **`capacity >= active_count`**, where `active_count` is the authoritative count of `registrations` rows for that workshop with `status = 'ACTIVE'` (`CANCELLED` rows are excluded from `active_count`).
   - Exact equality (`capacity === active_count`, resulting in `remaining_seats = 0`) is **permitted**.
   - Attempting `capacity < active_count` is rejected with **`409 CAPACITY_BELOW_ACTIVE`** (`{"error":{"code":"CAPACITY_BELOW_ACTIVE","message":"Capacity cannot be reduced below current active registrations"}}`) and zero DB mutation.
2. **Atomic serialization with concurrent registrations (`BR-06`, `NFR-03`):**
   - `PATCH /api/v1/organizer/workshops/:id` (for `PUBLISHED` workshops) executes inside a single PostgreSQL transaction that acquires **`SELECT ... FROM workshops WHERE id=$1 AND owner_user_id=$2 FOR UPDATE`** before counting `ACTIVE` registrations and executing `UPDATE workshops`.
   - Because `POST /api/v1/workshops/:id/registrations` (`F-03`) locks the exact same `workshops` row with `FOR UPDATE`, concurrent capacity reduction and participant registration serialize cleanly at the database level: either the registration commits first and the capacity reduction sees the incremented `active_count` (and rejects with `409 CAPACITY_BELOW_ACTIVE`), or the capacity reduction commits first and the registration sees the lower capacity (and rejects with `409 CAPACITY_FULL`). In every interleaving, `active_count <= capacity` holds strictly.
3. **Increasing capacity & manual closure independence (`DEC-05` / `BR-10`):**
   - Increasing `capacity` (while `now < ends_at`) is permitted with no artificial upper cap beyond safe 32-bit PostgreSQL `INTEGER` range (`1 <= capacity <= 2147483647`).
   - Increasing `capacity` makes newly added seats available immediately when the workshop is open, but **never** automatically clears `registration_closed = true` (manual closure remains explicit per `DEC-05`).

## Consequences

- `F-07` (`Issue #69`) must include both a direct boundary test (`capacity === active_count` succeeds, `capacity === active_count - 1` fails with `409`, `CANCELLED` rows do not inflate `active_count`) and a real PostgreSQL concurrency test racing a capacity reduction against an incoming registration.
- No extra DB trigger or migration is required because both write paths serialize on the `workshops` row lock.

## Status & Review Gate

- **Current status:** `PROPOSED` under [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66); awaits independent peer review (`Formal APPROVE`) and staging merge into `sprint_2_staging` by `cottonlnwza` before `F-07` implementation begins.
