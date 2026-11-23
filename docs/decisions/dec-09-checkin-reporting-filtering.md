# DEC-09 — Sprint 3 Check-in Window, Attendance Reporting, Filtering & NFR-04/05 Measurement Policy

> **PROPOSED Sprint 3 scoped working decision v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23**
> Owner scope: [Issue #70 (`P2-C2`)](https://github.com/cottonlnwza/TTworkshop/issues/70) · Planned Implementations: [Issue #71 (`P2-07` / `F-08`)](https://github.com/cottonlnwza/TTworkshop/issues/71) and planned Sprint 3 `P3-01` / `P3-02` (`F-09`)
> Linked requirements: `FR-13`, `FR-14`, `FR-15`; `BR-01`, `BR-14`, `BR-15`; `NFR-01`, `NFR-02`, `NFR-04`, `NFR-05`

## Decision

### 1. Event Check-in Window, Atomicity & Visibility (`F-08` / `FR-13`, `BR-14`)

1. **Nested owner route:** Check-in is executed exclusively by the authenticated owning `ORGANIZER` via `POST /api/v1/organizer/workshops/:workshopId/registrations/:registrationId/check-in` with same-origin `Origin`. Nesting under `:workshopId` binds registration check-in strictly to an owned `PUBLISHED` workshop and prevents cross-workshop mismatches (`404 NOT_FOUND` if the registration does not belong to `:workshopId` or the workshop is foreign/missing).
2. **Inclusive check-in window evaluated post-lock in PostgreSQL `TIMESTAMPTZ`:**
   - The valid check-in window is inclusive at both endpoints: **`starts_at <= now <= ends_at`**.
   - Time `now()` **must** be sampled **after** acquiring the PostgreSQL `FOR UPDATE` row locks (preserving the `workshops → registrations` lock order established by `F-03`/`F-05`/`F-07` to prevent deadlocks and lock-wait TOCTOU races), and evaluated directly in PostgreSQL `TIMESTAMPTZ` precision:
     - `now < starts_at` → **`409 CHECKIN_NOT_OPEN`** (`"Check-in has not opened yet"`).
     - `now > ends_at` → **`409 CHECKIN_CLOSED`** (`"Check-in window has closed"`).
3. **One-time check-in invariant (`BR-14`) & schema reuse:**
   - Reuses existing `registrations.checked_in_at TIMESTAMPTZ` column from [`db/migrations/004_registrations.sql`](../../db/migrations/004_registrations.sql) (**zero new SQL migrations**).
   - Only `status = 'ACTIVE'` registrations on a `PUBLISHED` workshop may be checked in (`DRAFT` workshop or `CANCELLED` registration → `409 INVALID_STATE`).
   - If `checked_in_at IS NOT NULL`, return **`409 ALREADY_CHECKED_IN`** (`"Registration is already checked in"`) without modifying the original `checked_in_at` timestamp.
   - `UPDATE registrations SET checked_in_at = $now::timestamptz WHERE id = $1 AND workshop_id = $2 AND status = 'ACTIVE' AND checked_in_at IS NULL` enforces one-time execution atomically under the row lock.
4. **Cross-feature `F-05` cancellation compatibility (`BR-09`):**
   - `POST /api/v1/me/registrations/:id/cancel` already rejects rows where `checked_in_at IS NOT NULL` with `409 ALREADY_CHECKED_IN` and acquires `workshops → registrations` `FOR UPDATE` locks in the same order. Concurrent check-in and cancellation serialize cleanly so a row can never be both `CANCELLED` and checked in.
5. **Privacy-minimized DTO exposure (`WD-F04-01`):**
   - Organizer roster (`GET /api/v1/organizer/workshops/:id/registrations`) and Participant views (`GET /api/v1/me/registrations`, `GET /api/v1/me/registrations/:id`) expose `checked_in_at: string | null` (formatted in microsecond UTC ISO via `to_char(... AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, matching `registered_at`/`cancelled_at`), without exposing participant email or name PII.
   - *Explicit test update note for `#71`:* `tests/f04.integration.test.ts` asserts an exact key allowlist on organizer roster items; when `F-08` is implemented in `#71`, that allowlist expands cleanly from 5 keys to 6 keys adding authorized `checked_in_at` while retaining zero PII assertions.

### 2. Authoritative Attendance Summary & No-Show Convention (`F-09` / `FR-14`, `BR-15`)

1. **Owner-only endpoint:** `GET /api/v1/organizer/workshops/:id/attendance-summary` (`Cache-Control: no-store`; `401` anonymous, `403` Participant, `404` foreign/missing/invalid ID, `409 INVALID_STATE` on `DRAFT`).
2. **Authoritative PostgreSQL formulas (never computed in browser state):**
   - `capacity`: persisted integer `workshops.capacity`.
   - `active_count`: `COUNT(*) FILTER (WHERE status = 'ACTIVE')`.
   - `cancelled_count`: `COUNT(*) FILTER (WHERE status = 'CANCELLED')`.
   - `checked_in_count`: `COUNT(*) FILTER (WHERE status = 'ACTIVE' AND checked_in_at IS NOT NULL)`.
   - `remaining_seats`: `GREATEST(capacity - active_count, 0)`.
   - `workshop_ended`: boolean **`now > ends_at`** (evaluated in PostgreSQL `TIMESTAMPTZ` strictly after the inclusive `[starts_at, ends_at]` check-in window closes so a participant eligible to check in at `now === ends_at` is never prematurely counted as a no-show).
   - `no_show_count`:
     - When `workshop_ended === false` (`now <= ends_at`): **`0`**.
     - When `workshop_ended === true` (`now > ends_at`): **`active_count - checked_in_count`** (`CANCELLED` registrations are never counted as no-shows).
   - `attendance_rate_percent`:
     - When `active_count === 0`: **`0`** (`0%` per `BR-15`, preventing division-by-zero / `NaN`).
     - When `active_count > 0`: **`ROUND((checked_in_count::numeric / active_count::numeric) * 100, 2)`** (numeric value `0`–`100` rounded to 2 decimal places, e.g., `66.67`, `50`, `100`).

### 3. Bounded Search & Filter Scope (`F-09` / `FR-15`)

All filter query parameters are **optional and backward-compatible** (omitting them preserves all Sprint 1/2 endpoint behavior):

| Endpoint | Optional query parameters | Validation & empty-state rules |
|---|---|---|
| `GET /api/v1/workshops` (Participant discovery) | `q` (trimmed keyword, max 100 chars; escaped parameterized `ILIKE` on `title`, `location`, `description`); `availability` (`all` \| `open` \| `full` \| `closed`); `from` & `to` (explicit-offset ISO 8601 filtering `starts_at >= from` and `starts_at <= to`) | Reject unknown `availability`, `q.length > 100`, naive/invalid `from`/`to`, or `from > to` with `400 VALIDATION`. Zero matches return `200 { data: [] }`. |
| `GET /api/v1/organizer/workshops` (Organizer list) | `q` (trimmed keyword, max 100 chars; escaped parameterized `ILIKE` on `title`, `location`); `status` (`ALL` \| `DRAFT` \| `PUBLISHED`) | Reject unknown `status` or `q.length > 100` with `400 VALIDATION`. Owner isolation (`owner_user_id = identity.id`) always enforced first. |
| `GET /api/v1/organizer/workshops/:id/registrations` (Organizer roster) | `status` (`ALL` \| `ACTIVE` \| `CANCELLED`); `attendance` (`ALL` \| `CHECKED_IN` \| `NOT_CHECKED_IN`) combined cleanly with existing cursor pagination (`limit`, `cursor`) | Reject unknown `status` or `attendance` with `400 VALIDATION`. Preserves stable `(registered_at DESC, id DESC)` cursor ordering. |

### 4. NFR-04 & NFR-05 Verification Protocol (`F-09`)

- **NFR-04 (List Load Performance):** Against isolated local PostgreSQL (`ttworkshop_test`) seeded with **100 published workshops**, execute **10 concurrent authenticated Participant requests** to `GET /api/v1/workshops` (both unfiltered and filtered), record p50, p95, max response times, test environment, and tested commit SHA, and assert **p95 ≤ 3000 ms** (provisional team target from `docs/srs.md` §6; never fabricate measurements).
- **NFR-05 (Responsive Critical Journeys):** Automated headless Chromium checks at **375×812 (mobile)** and **1280×800 (desktop)** across login, Participant discovery/filters/detail, My Registrations, Organizer workshop list/edit, and Organizer roster/check-in/attendance summary, asserting `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal page overflow) and visible interactive controls.

## Alternatives Considered

- **Separate `POST /api/v1/registrations/:id/check-in` without `:workshopId`:** Rejected because nesting under `/organizer/workshops/:workshopId/registrations/:registrationId/check-in` makes workshop ownership explicit in the resource hierarchy and matches existing `/organizer/workshops/:id/registrations`.
- **Returning `no_show_count: null` before workshop ends:** Considered, but returning `no_show_count: 0` paired with explicit `workshop_ended: boolean` avoids nullable numeric handling in UI tables while still unambiguously distinguishing *"not yet ended"* from *"ended with 0 no-shows"*.
- **Unbounded full-text regex search or client-side-only filtering:** Rejected because parameterized escaped `ILIKE` on the server enforces bounded input validation, scales cleanly with 100+ workshops, and avoids loading unbounded records into the browser.

## Consequences

- Both `F-08` (`Issue #71`) and `F-09` (`P3-01` / `P3-02`) require **zero new SQL migrations** (`001`–`005` remain unchanged; no new Cloud SQL tables or runtime DB grants).
- All Sprint 3 write and read checks follow the exact `workshops → registrations` `FOR UPDATE` lock order and post-lock PostgreSQL `TIMESTAMPTZ` precision standard established in Sprint 2.

## Status & Review Gate

- **Current status:** `PROPOSED` under [Issue #70 (`P2-C2`)](https://github.com/cottonlnwza/TTworkshop/issues/70); awaits independent peer review (`Formal APPROVE`) and staging merge into `sprint_2_staging` by `cottonlnwza` before `F-08` or `F-09` implementation begins.
