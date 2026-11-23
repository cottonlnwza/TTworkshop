# DEC-07 — Post-Publication Workshop Editing Policy & Sprint 1 Baseline Revision (`REV-S2-01`)

> **PROPOSED Sprint 2 scoped working decision v0.1 — PENDING INDEPENDENT PEER REVIEW — 2026-11-23**
> Owner scope: [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) · Implementation: [Issue #69 (`P2-05` / `F-07`)](https://github.com/cottonlnwza/TTworkshop/issues/69)
> Linked requirements: `FR-12`; `BR-01`, `BR-02`, `BR-03`, `BR-04`, `BR-08`, `BR-13`, `BR-16`; `NFR-01`, `NFR-02`

## Decision

For `F-07` (`FR-12` / `BR-16`), an authenticated owning `ORGANIZER` may edit an owned `PUBLISHED` workshop through the unified resource endpoint `PATCH /api/v1/organizer/workshops/:id` under strict lifecycle and attendance-invariant guardrails:

### 1. Field Editability Matrix for `PUBLISHED` Workshops

| Field(s) | Allowed when `PUBLISHED`? | Guardrail & Rejection Code |
|---|---|---|
| `title`, `description`, `location` | **Yes** while `now < ends_at` | Must remain non-empty trimmed strings (never cleared to `null` or blank; satisfies DB `published_non_empty`) → `400 VALIDATION` |
| `capacity` | **Yes** while `now < ends_at` | Positive integer (`BR-03`) AND `capacity >= active_count` atomically under `FOR UPDATE` (`DEC-08` / `BR-13`) → `400 VALIDATION` / `409 CAPACITY_BELOW_ACTIVE` |
| `registration_deadline` | **Yes** while `now < ends_at` | `null` (default to `starts_at`) or explicit-offset ISO 8601 (`DEC-04`) satisfying `registration_deadline <= merged starts_at` (`BR-08`) → `400 VALIDATION` |
| `starts_at`, `ends_at` | **Conditional** — ONLY when `active_count === 0` AND `now < current starts_at` | Must be explicit-offset ISO 8601 (`DEC-04`), merged `ends_at > starts_at` (`BR-02`), and merged `deadline <= starts_at` (`BR-08`). Rejected if `active_count > 0` OR `now >= current starts_at` → **`409 SCHEDULE_LOCKED`** |
| Any field after workshop ends (`now >= current ends_at`) | **No** | Preserves historical workshop & attendance integrity → **`409 WORKSHOP_ENDED`** |
| `id`, `owner_user_id`, `status`, `registration_closed`, `created_at` | **Never via `PATCH`** | Immutable/separate-transition fields; explicit attempt to alter `status` (e.g., revert `PUBLISHED` → `DRAFT`) or `owner_user_id` or `registration_closed` via `PATCH` is rejected → **`400 VALIDATION`** (preserving `BR-04` and `DEC-05`) |

### 2. Explicit Sprint 1 Baseline Revision (`REV-S2-01`)

- **Affected Sprint 1 artifact:** `F-02` (`docs/contracts/f-02-workshop-publish.md`, `AC-F02-12` / `STS-F02-12`) and `tests/workshop.integration.test.ts` (line 591: asserting `PATCH /api/v1/organizer/workshops/:id` on a `PUBLISHED` workshop returns `409`).
- **Rationale:** Sprint 1 `F-02` explicitly stated *"This feature does not implement broad edit-after-publish... Do not add generic workshop editing after publication in F-02"* because `FR-12` / `F-07` was allocated to Sprint 2. Keeping a single RESTful `PATCH /api/v1/organizer/workshops/:id` route avoids endpoint sprawl while preserving all `DRAFT` update semantics (`DEC-03`) and all `F-02` publication invariants (`AC-F02-01`–`AC-F02-11`, including double-publish `409 INVALID_STATE` in `AC-F02-07`).
- **Continuity guarantee (Deliverable 2 Part A):**
  - `DRAFT` creation, partial `DRAFT` updates, and single `DRAFT → PUBLISHED` publication remain 100% unchanged.
  - When `P2-05` (`F-07`) is implemented, the superseded `afterPublish` 409 assertion in `STS-F02-12` is replaced by explicit `F-07` contract tests (`STS-F07-01`–`STS-F07-10`) and recorded transparently in Deliverable 2 Part A's Baseline Revision Register as **`REV-S2-01`** (never silently deleted).

## Alternatives Considered

- **Separate `PATCH /api/v1/organizer/workshops/:id/published` route:** Considered to leave `STS-F02-12` untouched, but rejected because splitting updates of the same resource across two `PATCH` URLs duplicates validation logic and creates confusing API ergonomics. Logging `REV-S2-01` transparently aligns directly with Deliverable 2 Part A (*"Record approved baseline revisions and their rationale"*).
- **Allowing `starts_at`/`ends_at` changes even when `ACTIVE` registrations exist:** Rejected because silently rescheduling a workshop with confirmed participants invalidates registrants' expectations and can break check-in windows (`BR-14` / `F-08`).

## Consequences

- `F-07` (`Issue #69`) requires **zero new SQL migrations**; existing PostgreSQL constraints (`valid_capacity`, `valid_time_order`, `published_required`, `published_non_empty`, `published_deadline`) act as defense in depth.
- `createWorkshopRouter` must accept an optional injectable `now: () => Date` parameter (matching `createRegistrationRouter`) for deterministic `now >= starts_at` and `now >= ends_at` testing.

## Status & Review Gate

- **Current status:** `PROPOSED` under [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66); awaits independent peer review (`Formal APPROVE`) and staging merge into `sprint_2_staging` by `cottonlnwza` before `F-07` implementation begins.
