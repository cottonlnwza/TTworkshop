# F-09 — Workshop Filtering and Attendance Reporting

> **PROPOSED pre-implementation contract v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23** · Contracts [Issue #70 (`P2-C2`)](https://github.com/cottonlnwza/TTworkshop/issues/70) · Planned Sprint 3 Implementations **`P3-01`** (Filtering & Search) and **`P3-02`** (Attendance Summary & NFR-04/05 Verification)
> Source: `docs/srs.md` FR-14, FR-15, BR-01, BR-15, NFR-01, NFR-04, NFR-05; `docs/features.md` F-09; `docs/system-sds.md` §§3–6; proposed scoped policy [`DEC-09`](../decisions/dec-09-checkin-reporting-filtering.md) and accepted [`DEC-04`](../decisions/dec-04-workshop-time.md), [`DEC-11`](../decisions/dec-11-published-workshop-discovery-access.md). **No `F-09` application code has been written and zero `F-09` STS have been executed.** This draft does not assert global SRS/SDS or instructor approval.

## 1. Purpose, dependencies, and boundaries

`F-09` completes Sprint 3 operational usability across two cohesive, separately trackable implementation slices (`P3-01` and `P3-02` under the single `F-09` feature per `docs/features.md` §1):
1. **Bounded Filtering & Search (`FR-15` / `P3-01`):** Optional, backward-compatible query filters on Participant published discovery (`q`, `availability`, `from`, `to`), Organizer workshop list (`q`, `status`), and Organizer registration roster (`status`, `attendance`), with explicit input validation, safe empty states, and reset controls.
2. **Owner Attendance Summary & NFR-04/05 Verification (`FR-14`, `BR-15`, `NFR-04`, `NFR-05` / `P3-02`):** Authoritative PostgreSQL-computed workshop attendance/seat summary (`capacity`, `active_count`, `cancelled_count`, `checked_in_count`, `remaining_seats`, `no_show_count` post-end, `attendance_rate_percent` with `0%` when `active_count = 0`), plus documented performance (`NFR-04`) and responsive viewport (`NFR-05`) verification.

**Depends on:**
- Accepted Sprint 1–2 slices on `sprint_2_staging` (`F-01`–`F-07`) and `F-08` check-in (`Issue #71`) for live `checked_in_at` data in attendance reporting.
- Independent peer review (`Formal APPROVE`) and staging merge of [Issue #70 (`P2-C2`)](https://github.com/cottonlnwza/TTworkshop/issues/70) including [`DEC-09`](../decisions/dec-09-checkin-reporting-filtering.md).

**Exclusions (out of `F-09` scope):**
- Cross-workshop global admin analytics, CSV/PDF export downloads, and public unauthenticated search are excluded (`DEC-11`, `docs/srs.md` §3).
- No new database tables or SQL migrations are introduced.

## 2. Feature SDS — query filtering, summary formulas, and NFR verification

1. **Participant Discovery Filtering (`GET /api/v1/workshops`):**
   - Authenticate `PARTICIPANT` (`401`/`403`, preserving `DEC-11`).
   - Parse optional query parameters:
     - `q`: trim; if length > 100 → `400 VALIDATION`. Escape SQL wildcard characters (`\`, `%`, `_`) and filter `w.title ILIKE $p ESCAPE '\' OR w.location ILIKE $p ESCAPE '\' OR w.description ILIKE $p ESCAPE '\'`.
     - `availability`: optional `all` (default) | `open` | `full` | `closed`; any other value → `400 VALIDATION`.
       - `open`: `registration_open = true`.
       - `full`: `remaining_seats = 0`.
       - `closed`: `registration_closed = true OR $now::timestamptz >= COALESCE(w.registration_deadline, w.starts_at)`.
     - `from` / `to`: optional explicit-offset ISO 8601 (`DEC-04`); malformed/naive or `from > to` → `400 VALIDATION`. Filter `w.starts_at >= $from::timestamptz` and `w.starts_at <= $to::timestamptz`.
   - Omitting all query parameters returns the exact existing Sprint 1–2 ordered list (`ORDER BY w.starts_at ASC, w.id ASC`).
2. **Organizer List & Roster Filtering:**
   - `GET /api/v1/organizer/workshops`: optional `q` (max 100 chars, escaped `ILIKE` on `title`/`location`) and `status` (`ALL` | `DRAFT` | `PUBLISHED`; invalid → `400 VALIDATION`), always scoped by `owner_user_id = identity.id`.
   - `GET /api/v1/organizer/workshops/:id/registrations`: optional `status` (`ALL` | `ACTIVE` | `CANCELLED`) and `attendance` (`ALL` | `CHECKED_IN` | `NOT_CHECKED_IN`; invalid → `400 VALIDATION`), composed cleanly with existing cursor pagination (`limit`, `cursor`) and `(registered_at DESC, id DESC)` ordering.
3. **Owner Attendance Summary (`GET /api/v1/organizer/workshops/:id/attendance-summary`):**
   - Authenticate `ORGANIZER` (`401`/`403`), validate numeric `:id` (`404`), set `Cache-Control: no-store`.
   - Query owned workshop (`404 NOT_FOUND` if missing/foreign; `409 INVALID_STATE` if `status !== 'PUBLISHED'`).
   - Compute authoritative aggregates in a single PostgreSQL query using injected `now()` (`$now::timestamptz`):
     - `capacity = w.capacity`
     - `active_count = COUNT(r.id) FILTER (WHERE r.status = 'ACTIVE')::int`
     - `cancelled_count = COUNT(r.id) FILTER (WHERE r.status = 'CANCELLED')::int`
     - `checked_in_count = COUNT(r.id) FILTER (WHERE r.status = 'ACTIVE' AND r.checked_in_at IS NOT NULL)::int`
     - `remaining_seats = GREATEST(w.capacity - active_count, 0)::int`
     - `workshop_ended = ($now::timestamptz > w.ends_at)`
     - `no_show_count = CASE WHEN $now::timestamptz > w.ends_at THEN GREATEST(active_count - checked_in_count, 0) ELSE 0 END`
     - `attendance_rate_percent = CASE WHEN active_count = 0 THEN 0::double precision ELSE ROUND((checked_in_count::numeric / active_count::numeric) * 100, 2)::double precision END`
   - Return `200 { data: { workshop_id, status, capacity, active_count, cancelled_count, checked_in_count, remaining_seats, no_show_count, attendance_rate_percent, workshop_ended } }` (zero participant PII).
4. **NFR-04 & NFR-05 Verification (`DEC-09` §4):**
   - **NFR-04:** Dedicated repeatable benchmark test seeding 100 published workshops in isolated PostgreSQL and executing 10 concurrent Participant `GET /api/v1/workshops` calls (unfiltered + filtered), asserting **p95 ≤ 3000 ms** and recording actual latency metrics.
   - **NFR-05:** Automated headless Chromium layout checks at **375×812** and **1280×800** verifying `scrollWidth <= innerWidth` across critical Participant and Organizer views.

## 3. UI contract (planned)

| Screen / route | Expected behavior |
|---|---|
| Participant discovery (`ParticipantApp.tsx`) | Displays filter controls (`Search` keyword input, `Availability` select, optional `From`/`To` date inputs, `Apply filters` & `Reset filters`). Displays clear empty state (`No workshops match your current filters`) when filtered results are empty, and preserves responsive layout at 375px & 1280px. |
| Organizer `My Workshops` (`OrganizerApp.tsx`) | Displays search input and status filter (`All` / `Draft` / `Published`) with safe empty state and reset control. |
| Organizer roster & summary (`/organizer/workshops/:id/registrations` in `RegistrationViews.tsx`) | Displays an **Attendance Summary** panel showing `Capacity`, `Active`, `Remaining seats`, `Cancelled`, `Checked in`, `No-show` (annotated as pending until workshop ends when `workshop_ended === false`), and `Attendance rate (%)` refreshed from the server after check-in; displays roster filters (`Status`, `Attendance`) alongside cursor pagination. |

## 4. API contract (planned)

Base `/api/v1`. Success envelope `{"data": ...}`; failure envelope `{"error": {"code": "...", "message": "..."}}`.

| Method / path | Auth & query | Expected success | Negative / boundary responses |
|---|---|---|---|
| `GET /workshops` *(extended)* | Authenticated `PARTICIPANT`; optional `?q=&availability=&from=&to=` | `200` `{"data": [ ...existing WorkshopSummaryDTO ]}` (empty array `[]` when zero matches) | `400 VALIDATION` (bad `availability`, `q > 100` chars, naive/invalid `from`/`to`, `from > to`); `401`; `403` |
| `GET /organizer/workshops` *(extended)* | Authenticated `ORGANIZER`; optional `?q=&status=` | `200` `{"data": [ ...own workshops ]}` | `400 VALIDATION` (bad `status`, `q > 100` chars); `401`; `403` |
| `GET /organizer/workshops/:id/registrations` *(extended)* | Authenticated owning `ORGANIZER`; optional `?status=&attendance=&limit=&cursor=` | `200` `{"data": [...], "pagination": {"next_cursor": ...}}` | `400 VALIDATION` / `INVALID_PAGINATION`; `401`; `403`; `404` |
| `GET /organizer/workshops/:id/attendance-summary` *(new)* | Authenticated owning `ORGANIZER`; `Cache-Control: no-store` | `200` `{"data": { "workshop_id": "<id>", "status": "PUBLISHED", "capacity": 10, "active_count": 4, "cancelled_count": 1, "checked_in_count": 3, "remaining_seats": 6, "no_show_count": 1, "attendance_rate_percent": 75, "workshop_ended": true }}` | `401 UNAUTHENTICATED`; `403 FORBIDDEN` (Participant); `404 NOT_FOUND` (foreign/missing/invalid ID); `409 INVALID_STATE` (`DRAFT` workshop) |

## 5. Data contract and migration impact

- **Schema layer — NO NEW MIGRATION REQUIRED:** Reuses existing `workshops` (`002`, `003`, `005`) and `registrations` (`004`, including `registrations_workshop_active_idx`).

## 6. Observable Acceptance Criteria (AC)

| AC ID | Observable outcome & linked requirements |
|---|---|
| **AC-F09-01** | Participant discovery filters (`q`, `availability`, `from`, `to`) return only matching published workshops, escape SQL wildcards safely, return `200 []` on zero matches, and preserve unfiltered behavior when omitted (`FR-15`, `DEC-09`). |
| **AC-F09-02** | Organizer workshop list (`q`, `status`) and Organizer roster (`status`, `attendance` + pagination) filter accurately while preserving strict owner isolation (`FR-15`, `BR-01`, `NFR-01`). |
| **AC-F09-03** | Invalid filter parameters (unknown enum values, `q` > 100 chars, naive/malformed `from`/`to`, `from > to`) are rejected with `400 VALIDATION` without exposing internal DB errors (`FR-15`, `DEC-04`). |
| **AC-F09-04** | Owning Organizer retrieves authoritative attendance summary (`capacity`, `active_count`, `cancelled_count`, `checked_in_count`, `remaining_seats`, `attendance_rate_percent`) matching PostgreSQL records, with `no_show_count === 0` and `workshop_ended === false` before and during `[starts_at, ends_at]` (`FR-14`, `BR-15`, `DEC-09`). |
| **AC-F09-05** | After workshop end (`now > ends_at`), `workshop_ended === true` and `no_show_count === active_count - checked_in_count`, excluding `CANCELLED` rows from both `no_show_count` and `attendance_rate_percent` denominator (`FR-14`, `BR-15`). |
| **AC-F09-06** | Zero-active boundary: when `active_count === 0` (even when `cancelled_count > 0`), `attendance_rate_percent === 0` (no `NaN`/division error), `no_show_count === 0`, and `remaining_seats === capacity` (`BR-15`). |
| **AC-F09-07** | Attendance summary enforces `401` anonymous, `403` Participant, `404` foreign/missing/invalid workshop ID, `409 INVALID_STATE` on `DRAFT`, `Cache-Control: no-store`, and exposes zero Participant PII (`BR-01`, `NFR-01`). |
| **AC-F09-08** | Performance check (`NFR-04`): under 100 seeded published workshops and 10 concurrent Participant requests to `GET /api/v1/workshops`, measured p95 latency is `<= 3000 ms` with environment and measurements recorded (`NFR-04`, `DEC-09`). |
| **AC-F09-09** | Responsive UI & E2E (`NFR-05`, `FR-14`, `FR-15`): Participant applies/resets discovery filters (including empty state), Organizer views live attendance summary and filters roster, and headless Chromium confirms zero horizontal page overflow at `375px` and `1280px` viewports (`NFR-05`). |

## 7. Software Test Specification (STS) — PLANNED, NOT EXECUTED

| Test ID | AC | Level | Preconditions & inputs → action → expected outcome |
|---|---|---|---|
| **STS-F09-01** | AC-F09-01 | API+DB | Seed multiple published workshops (open, full, closed, varied titles/dates including `%` literal) → query `GET /workshops` with `q`, `availability`, `from`/`to`, wildcard `q=%`, and unmatched query → exact expected subsets and safe `[]` empty result. |
| **STS-F09-02** | AC-F09-02 | API+DB | Seed Organizer A (`DRAFT` + `PUBLISHED` workshops, mixed `ACTIVE`/`CANCELLED`/checked-in roster) and Organizer B workshops → filter `GET /organizer/workshops?status=DRAFT&q=...` and `GET /organizer/workshops/:id/registrations?status=ACTIVE&attendance=CHECKED_IN&limit=1` → accurate subsets, stable cursor traversal, zero Organizer B leakage. |
| **STS-F09-03** | AC-F09-03 | API+DB negative | Send invalid `availability=invalid`, `status=BAD`, `attendance=MAYBE`, 101-char `q`, naive `from=2026-12-01T10:00:00`, and `from > to` → all return `400 VALIDATION`. |
| **STS-F09-04** | AC-F09-04 | API+DB | Seed `PUBLISHED` workshop `capacity=10` with 3 `ACTIVE` (2 checked in, 1 unchecked) and 1 `CANCELLED` while `now <= ends_at` (including exact `now === ends_at`) → `GET /attendance-summary` returns `active_count=3`, `cancelled_count=1`, `checked_in_count=2`, `remaining_seats=7`, `attendance_rate_percent=66.67`, `no_show_count=0`, `workshop_ended=false`. |
| **STS-F09-05** | AC-F09-05 | API+DB boundary | Same seeded workshop with injected `now > ends_at` → `GET /attendance-summary` returns `workshop_ended=true`, `no_show_count=1`, `attendance_rate_percent=66.67`, `cancelled_count=1` excluded from `no_show_count` and denominator. |
| **STS-F09-06** | AC-F09-06 | API+DB boundary | Seed `PUBLISHED` workshop `capacity=5` with 0 `ACTIVE` and 2 `CANCELLED` rows (both before and after `ends_at`) → `GET /attendance-summary` returns `active_count=0`, `cancelled_count=2`, `checked_in_count=0`, `remaining_seats=5`, `no_show_count=0`, `attendance_rate_percent=0`. |
| **STS-F09-07** | AC-F09-07 | API+DB security | Test anonymous (`401`), Participant (`403`), Organizer B (`404`), invalid ID (`404`), and owned `DRAFT` (`409 INVALID_STATE`) on `GET /attendance-summary`; verify `Cache-Control: no-store` and zero email/name keys in response. |
| **STS-F09-08** | AC-F09-08 | Performance integration (`NFR-04`) | Seed 100 published workshops in isolated `ttworkshop_test` → launch 10 concurrent authenticated Participant requests (`GET /workshops` unfiltered and filtered) → assert all `200`, record p50/p95/max ms, and assert `p95 <= 3000 ms`. |
| **STS-F09-09** | AC-F09-09 | React UI + Chromium responsive E2E (`NFR-05`) | Exercise Participant filter/empty-state/reset and Organizer attendance-summary + roster filters; at both `375×812` and `1280×800` viewports assert `document.documentElement.scrollWidth <= window.innerWidth` across login, discovery, registrations, and organizer views. |

## 8. Feature Definition of Done — NOT MET (Pre-Implementation Contract)

- [ ] Pre-implementation contract and `DEC-09` independently reviewed (`Formal APPROVE`) and merged to `sprint_2_staging` via [Issue #70](https://github.com/cottonlnwza/TTworkshop/issues/70).
- [ ] TDD **RED → GREEN** evidence recorded on exact commits across planned Sprint 3 implementation Issues (`P3-01` filtering & `P3-02` attendance reporting/NFR verification).
- [ ] All 9 criteria (`AC-F09-01`–`AC-F09-09` ↔ `STS-F09-01`–`STS-F09-09`) implemented and passing against isolated loopback PostgreSQL and headless Chromium.
- [ ] Full automated regression (`npm run build`, `npm test`, Python `unittest`, hosted CI `build-test`) passes with zero unintended regressions and zero real secrets.
- [ ] Evidence ledgers, contract execution record, and `docs/traceability.md` updated; independent Reviewer Formal `APPROVE`, teammate merge, and Author post-merge verification complete.

**Change record:**
- `v0.1` (2026-11-23, [Issue #70](https://github.com/cottonlnwza/TTworkshop/issues/70)): Initial pre-implementation Sprint 3 contract authored by `thananun-7203`; `PENDING INDEPENDENT PEER REVIEW` by `cottonlnwza`. Zero code or tests executed.
