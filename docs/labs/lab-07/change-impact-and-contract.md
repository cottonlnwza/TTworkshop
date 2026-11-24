# CPE334 Lab 7 — Part A: Change Request, Impact Analysis & Revised Engineering Contract

> **Status:** `PROPOSED / PENDING INDEPENDENT PEER REVIEW` — **2026-11-24 (Asia/Bangkok)**
> **Tracking:** [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85) (Part A docs/contract only) → [Issue #83 (`L7-02`)](https://github.com/cottonlnwza/TTworkshop/issues/83) (Part B TDD RED→GREEN & regression) → [Issue #84 (`L7-03`)](https://github.com/cottonlnwza/TTworkshop/issues/84) (Part B release/GCP + Part C metrics + Part D readiness/PDF)
> **Author:** `thananun-7203` (ComTon) · **Independent Reviewer & Staging Merger:** `cottonlnwza` (ComGu) · **Period:** Period 2

---

## 1. Change Request Specification (`CR-L7-01`)

### 1.1 Approval Authority & Course Spec Update

Per the official CPE334 course announcement issued on **2026-11-24**:

> *"Announcement. Lab 7 Spec Sheet Change. You need not get Instructor or TA Approval for your change request to Sprint 1. Think of a good change to Sprint 1 among yourselves, but do try to make it a complex enough added feature and not just a trivial change."*

- **Approval basis:** Bilateral team agreement between `thananun-7203` (ComTon) and `cottonlnwza` (ComGu) on **2026-11-24**, formalized in recorded repository history by independent six-axis PR review (`Formal APPROVE`) and staging merge of this documentation-only PR (`L7-01` / #85) by `cottonlnwza` **before** any test or implementation commit begins under `L7-02` (#83).
- **Why this change is non-trivial:** It modifies Sprint 1 registration domain behavior (`F-03`), introduces a cross-workshop temporal overlap invariant (`BR-05b`), adds a deadlock-free transaction-scoped PostgreSQL advisory lock (`DEC-14`) serialized with existing row locks (`F-03`/`F-05`/`F-07`/`F-08`), preserves exact multi-code error precedence, adds a real concurrent dual-workshop race test, updates Participant detail error UX, and verifies cross-feature regression across `F-04`, `F-05`, and `F-07`.

### 1.2 Baseline & Version Continuity Anchors

| Milestone / Anchor | Exact Reference | Role in Lab 7 |
|---|---|---|
| Original Sprint 1 Release (D1) | [PR #26](https://github.com/cottonlnwza/TTworkshop/pull/26) → `3f5ec15a1bc2a94d1b16003e1baa531dff4a7256` | Original Sprint 1 implementation of `F-01`–`F-04` (`BR-05` same-workshop uniqueness only) |
| **Accepted Sprint 1 Baseline (Lab 6)** | `main@4efbcfac51872b3b78542c35cc01c24182` · Cloud Run `ttworkshop-00017-poy` (`sha256:f6fc41988222e5f29da3a394c40d83bb6665b41f604cff26b821f8506e49ecf9`) | Lab 6 accepted Sprint 1 release independently retested by partner team TH-038 |
| Deliverable 2 Integrated `main` Anchor | [PR #82](https://github.com/cottonlnwza/TTworkshop/pull/82) → `b111ffcd114f03effd2175991b23d4f702362c3f` · Cloud Run `ttworkshop-00019-nul` (`sha256:7f0ee3e4f636b3eca3455db2db7ef3df8ae01bc998e8d90dcd0c3f34b7e193f2`, [Deploy Run #45236689037](https://github.com/cottonlnwza/TTworkshop/actions/runs/45236689037) `success`) | Intervening Sprint 2 (`F-05`–`F-07`) and Sprint 3 (`F-08`) development deployed to production on `2026-11-24` (D2 post-deploy read-back recorded separately in D2 evidence) |
| Part A Contract Base (`L7-01`) | `sprint_2_staging@64731976ae9ac1e42affdff2b7e087b618b46a16` | Branch base for `docs/issue85-l7-01-schedule-conflict-contract` (zero code edits) |
| **Actual Pre-Change Implementation Commit (TDD RED Base)** | *Exact `sprint_2_staging` merge SHA immediately after `L7-01` PR merges* | Recorded in `L7-02` (#83) alongside distinct `RED` (tests-only) and `GREEN` (code) commit SHAs |

### 1.3 Old Sprint 1 Rule vs. Proposed New Rule

| Dimension | Old Sprint 1 Behavior (`3f5ec15a` / `4efbcfa`) | New Maintained Behavior (`BR-05b` / `DEC-14`) |
|---|---|---|
| **Original Requirement & Rule** | `FR-07`, `BR-05` (`F-03`): At most one `ACTIVE` registration per `(workshop_id, participant_user_id)`. | Preserve `BR-05` unchanged; add **`BR-05b`**: A Participant may not hold two `ACTIVE` registrations for different workshops whose `[starts_at, ends_at)` intervals overlap. |
| **Reason for Change** | Previously allowed one student to book multiple simultaneous workshops, consuming scarce seats they cannot attend. | Prevent double-booking scarce university workshop seats across overlapping time slots while keeping sequential back-to-back attendance possible. |
| **Exact Predicate & Boundary** | Only exact same `workshop_id` checked (`23505` → `409 DUPLICATE_ACTIVE`). | Cross-workshop (`w.id <> target.id`) overlap: `existing.starts_at < target.ends_at AND target.starts_at < existing.ends_at` in PostgreSQL `TIMESTAMPTZ` UTC precision. **Back-to-back (`existing.ends_at = target.starts_at` or `target.ends_at = existing.starts_at`) is ALLOWED (`201`).** Any positive overlap (including partial, contained, or identical windows) is **REJECTED (`409 SCHEDULE_CONFLICT`)**. |
| **Invalid / Negative Cases** | Duplicate same-workshop (`409 DUPLICATE_ACTIVE`), full (`409 CAPACITY_FULL`), closed (`409 REGISTRATION_CLOSED`), invalid deadline (`409 INVALID_DEADLINE`), past deadline (`409 DEADLINE_PASSED`), draft/missing (`404 NOT_FOUND`). | All existing error codes and precedence **strictly preserved** before `409 SCHEDULE_CONFLICT`. `CANCELLED` registrations (`F-05`) never block new registrations and retain history. Normal `PUBLISHED` rows already require non-null `starts_at`/`ends_at` and `ends_at > starts_at` via migration `002`; defensive checks for malformed persisted target schedules fail closed with the single code **`409 INVALID_DEADLINE`**. |
| **Access & Ownership (`BR-01`)** | `POST /api/v1/workshops/:id/registrations` requires authenticated `PARTICIPANT` cookie + valid `Origin`; `participant_user_id` derived solely from server session (`BIGINT`). | **Unchanged:** Anonymous → `401`; `ORGANIZER` → `403`; forged body `participant_user_id` ignored. Conflict check strictly scopes to the authenticated Participant's own `ACTIVE` rows; Participant B's bookings never block Participant A, and error payloads disclose no other user's data. |
| **Concurrency Guard** | Workshop row lock `SELECT ... FOR UPDATE` + partial unique index on `(workshop_id, participant_user_id)`. | Acquire transaction-scoped advisory lock `pg_advisory_xact_lock(-($1::bigint))` (negative `BIGINT`, disjoint from migration lock `48033401`) **before** `workshops FOR UPDATE` so simultaneous overlapping requests from the same Participant serialize cleanly (`1× 201`, `1× 409 SCHEDULE_CONFLICT`, `1` new DB row). |
| **UI Scope & Exclusions** | `web/ParticipantApp.tsx` detail view shows registration errors in `role="alert"`. | Detail view displays the clear `SCHEDULE_CONFLICT` reason in `role="alert"` without false success and refreshes availability. **Excluded / Deferred (Technical Debt):** browse-list conflict badges and server-derived `already_registered` flags on `GET /workshops`. |

---

## 2. Compact Change Impact Trace Table

| Req ID | Feature | Affected SRS / Feature SDS / System SDS Sections | Acceptance Criteria | STS Test IDs (Planned / Regressed) | Code Modules & Layer Impact |
|---|---|---|---|---|---|
| **`BR-05b`** *(new)*, `FR-07`, `BR-05` *(preserved)*, `NFR-03` | **F-03** Discovery & Registration | `docs/srs.md` §§5, 8, 9 (`BR-05b`, `DEC-14`); `docs/contracts/f-03-discovery-registration.md` §§2–7; `docs/decisions/dec-14-schedule-conflict.md`; `docs/system-sds.md` §§3–4 (`DEC-14` lock order) | `AC-F03-14`, `AC-F03-15`, `AC-F03-16` *(new)*; `AC-F03-03`–`13` *(preserved)* | **New (PLANNED):** `STS-F03-14` (overlap 409 + precedence + isolation), `STS-F03-15` (back-to-back 201 + `CANCELLED` 201), `STS-F03-16` (concurrent dual-workshop race); **Regressed:** `STS-F03-01`–`13` | `api/registrations.ts` (`POST /workshops/:id/registrations` transaction, advisory lock, overlap query, error order); `tests/f03.integration.test.ts` |
| **`BR-05b`**, `FR-06`, `FR-07` | **F-03** Participant Detail UI | `docs/contracts/f-03-discovery-registration.md` §§3, 6–7 | `AC-F03-17` *(new)*; `AC-F03-02`, `AC-F03-11` *(preserved)* | **New (PLANNED):** `STS-F03-17` (detail-view conflict alert & refresh); **Regressed:** `STS-F03-02`, `STS-F03-11` | `web/ParticipantApp.tsx` (detail error rendering & state reset); `tests/f03.ui.test.tsx`, `tests/f03.browser.test.ts` |
| `BR-01`, `FR-08`, `FR-09` | **F-04** Registration Views | *No contract change* (read-only surface preserved) | `AC-F04-01`–`10` *(unchanged)* | **Regressed:** `STS-F04-01`–`10` | `api/registrations.ts` (`GET /me/registrations*`, `GET /organizer/workshops/:id/registrations`); `tests/f04.*` — verify rejected conflict adds zero rows and preserves pagination/ownership |
| `FR-10`, `BR-09`, `BR-12` | **F-05** Cancellation & Re-registration | `docs/decisions/dec-14-schedule-conflict.md` §2.1 & §2.4 (cross-feature interaction documented) | `AC-F05-01`–`10` *(unchanged)* + `AC-F03-15` | **Regressed:** `STS-F05-01`–`10`; **Cross-feature:** `STS-F03-15` | `api/registrations.ts` (`POST /me/registrations/:id/cancel`); `tests/f05.*` — verify cancelling an overlapping workshop retains `CANCELLED` row and unblocks registration in the overlapping slot |
| `FR-12`, `BR-16` | **F-07** Published Editing (`DEC-07`) | `docs/decisions/dec-14-schedule-conflict.md` §2.5 (historical-edit guard verified) | `AC-F07-06`, `AC-F07-07` *(unchanged)* | **Regressed:** `STS-F07-01`–`10` (specifically `STS-F07-06` schedule lock when `active_count > 0`) | `api/workshops.ts` (`PATCH /organizer/workshops/:id`); `tests/f07.*` — confirms Organizer cannot shift workshop times while `ACTIVE` registrations exist |
| `NFR-01`, `NFR-02`, `SYS-01` | **SYS-01 / SYS-02** DB Privileges & Migrations | `docs/system-sds.md` §3 (`pg_advisory_xact_lock` namespace vs `api/migrate.ts` lock `48033401`) | `AC-L5-13` *(unchanged)* | **Regressed:** `tests/runtime-db-privileges.integration.test.ts` (startup/DDL/migration history), `tests/migration-runner.unit.test.ts`, `tests/runtime-schema.*`; **Planned in `L7-02` (`R-03`):** runtime-role test of registration advisory lock without `users` `UPDATE` privilege | `api/migrate.ts` (*read-only reference only*, unchanged; lock `48033401` strictly positive vs `-participant_user_id` strictly negative) |

### 2.1 Explicit Assessment of Impact Dimensions & Not-Applicable (`N/A`) Items

| Dimension | Applicability & Engineering Analysis |
|---|---|
| **Callers & Dependencies** | **Applicable.** Only `POST /api/v1/workshops/:id/registrations` mutates registration creation. Its callers (`web/ParticipantApp.tsx` and API integration/E2E tests) already consume `{ error: { code, message } }` on HTTP `409`. `GET /workshops` and `GET /workshops/:id` schemas remain unchanged (browse badges deferred). |
| **UI / API Validation** | **Applicable.** Backend enforces `BR-05b` authoritatively inside PostgreSQL; UI displays the `409 SCHEDULE_CONFLICT` message in `ParticipantApp.tsx` detail view without falsely disabling registration based on stale client memory. |
| **Roles & Ownership (`BR-01`)** | **Applicable.** `requireParticipant` and `requireOrigin` remain unchanged; `participant_user_id` (`BIGINT`) comes exclusively from server session; cross-user isolation is preserved (`Participant B` never blocks `Participant A`). |
| **Persistence & Concurrency** | **Applicable.** Uses `pg_advisory_xact_lock(-($1::bigint))` before `workshops FOR UPDATE` in the same PostgreSQL transaction (`advisory_lock → workshops → registrations`), preventing deadlocks with `F-05`/`F-07`/`F-08` and avoiding `UPDATE` grants on `users`. |
| **Historical Data** | **Applicable.** Pre-existing persisted `ACTIVE` rows are never deleted or retroactively invalidated. `F-07` (`DEC-07`) already locks schedule edits once `active_count > 0`, preventing Organizers from creating retroactive conflicts on active workshops. |
| **Database Migrations** | **N/A (No migration required).** Reason: `workshops(starts_at, ends_at)` (migration `002`) and `registrations(participant_user_id, workshop_id, status)` + `registrations_participant_idx` (migration `004`) already store all required columns and indexes, and `pg_advisory_xact_lock` is a built-in PostgreSQL function requiring zero DDL. |
| **`F-01` Auth / `F-02` Draft-Publish / `F-06` Closure / `F-08` Check-in / `F-09` Planned** | **N/A for code edits** (regression-verified only). Reason: `BR-05b` operates strictly during Participant registration creation in `F-03`; auth, draft/publish, manual closure/reopen, check-in, and unimplemented `F-09` require no behavioral changes, while their existing automated suites remain part of mandatory regression. |

---

## 3. Preserved Behavior & Regression Protection Plan

The following existing behaviors **must remain unchanged** and will be verified via the full automated suite in `L7-02` (#83):

1. **Sprint 1 Auth & Isolation (`F-01`, `tests/auth.*`):** Login/logout, NUL/control-char login validation (`DEF-TTW-TH038-01`), anonymous `401`, wrong-role `403`, and cross-owner isolation (`BR-01`).
2. **Sprint 1 Workshop Draft/Publish (`F-02`, `tests/workshop.integration.test.ts`):** Partial DRAFT creation/update, publish validation (`BR-02`/`BR-03`/`BR-04`/`BR-08`), and owner-only visibility.
3. **Sprint 1 Registration Core (`F-03`, `tests/f03.*`):** Participant-only browse (`DEC-11`), single-workshop duplicate rejection (`409 DUPLICATE_ACTIVE`, `BR-05`), full-capacity rejection (`409 CAPACITY_FULL`, `BR-06`), 10-Participant last-seat concurrency race (`STS-F03-06`, `NFR-03`), deadline boundaries (`STS-F03-08`/`12`/`13`, `BR-07`/`BR-08`), and process-restart durability (`STS-F03-10`, `NFR-02`).
4. **Sprint 1 Registration Views (`F-04`, `tests/f04.*`):** Privacy-minimized Organizer roster, Participant own-only detail/list, stable cursor pagination, and zero phantom rows after rejected conflict attempts.
5. **Sprint 2 Cancellation, Closure & Editing (`F-05`/`F-06`/`F-07`, `tests/f05.*`, `tests/f06.*`, `tests/f07.*`):** Retained `CANCELLED` history + eligible re-registration (`BR-09`/`BR-12`), manual closure/reopen (`BR-10`/`BR-11`), capacity guard (`BR-13`), and **`F-07` schedule lock (`409 SCHEDULE_LOCKED` when `active_count > 0`, `BR-16`)**.
6. **Sprint 3 Check-in & Runtime/Release Guards (`F-08`, `tests/f08.*`, `tests/runtime-db-privileges.integration.test.ts`, `tests/test_*.py`):** Check-in window/ownership invariants (`BR-14`), existing startup/DDL/migration-history privilege tests (plus planned `L7-02` verification that the registration advisory lock runs under a role lacking `public.users` `UPDATE` privilege), and Python release/smoke tests.

---

## 4. Old vs. New Assessed Specification Excerpts (For Lab 7 PDF Part A)

### 4.1 SRS Business Rules (`docs/srs.md` §5)

- **Old (`v0.2.2`, before `L7-01`):**
  > **`BR-05`:** At most one ACTIVE registration exists per Participant per workshop. A second ACTIVE registration is rejected. *(No cross-workshop schedule-conflict rule existed.)*
- **New (`v0.2.3`, added by `L7-01`):**
  > **`BR-05`:** *(Unchanged)* At most one ACTIVE registration exists per Participant per workshop. A second ACTIVE registration is rejected.
  > **`BR-05b`:** A Participant may not hold two `ACTIVE` registrations for different workshops whose `[starts_at, ends_at)` schedules overlap (`existing.starts_at < target.ends_at AND target.starts_at < existing.ends_at`). Back-to-back workshops (`ends_at = starts_at`) and `CANCELLED` registrations do not conflict. Enforced atomically in PostgreSQL under `DEC-14`.

### 4.2 Feature SDS & API Contract (`docs/contracts/f-03-discovery-registration.md` §§2, 4, 5)

- **Old (`v0.1.6`, Sprint 1 accepted):**
  > Transaction: `BEGIN; LOCK workshop; CHECK (published, BR-08 valid configured/default deadline, BR-07 time eligibility, role); CHECK active_count < capacity; INSERT ACTIVE guarded by active-only unique constraint; COMMIT;`
  > Error taxonomy: `DUPLICATE_ACTIVE`, `CAPACITY_FULL`, `INVALID_DEADLINE`, `DEADLINE_PASSED`, `NOT_FOUND`, `UNAUTHENTICATED`, `FORBIDDEN` (plus `REGISTRATION_CLOSED` added in Sprint 2 `F-06`).
- **New (`v0.2.0`, `L7-01` proposed):**
  > Transaction: `BEGIN; SELECT pg_advisory_xact_lock(-participant_user_id); LOCK workshop FOR UPDATE; CHECK (published, not closed, valid schedule/deadline, BR-07 time eligibility, active_count < capacity, no same-workshop ACTIVE duplicate, no cross-workshop overlapping ACTIVE registration); INSERT ACTIVE; COMMIT;`
  > Error taxonomy adds **`409 SCHEDULE_CONFLICT`** at lowest precedence after `DUPLICATE_ACTIVE`, preserving every pre-existing error code and response shape.

### 4.3 Added STS Cases (`docs/contracts/f-03-discovery-registration.md` §§6–7 — `PLANNED / NOT EXECUTED`)

- **`STS-F03-14` (`AC-F03-14`, API+DB):** Overlapping different workshop → `409 SCHEDULE_CONFLICT` with zero new rows; Participant B unaffected; same-workshop repeat still returns `409 DUPLICATE_ACTIVE`; full/closed/expired error precedence preserved. *(Expected to **FAIL** at `L7-02` RED on pre-change code.)*
- **`STS-F03-15` (`AC-F03-15`, API+DB boundary + `F-05`):** Two isolated fixtures (`R-01`): (a) two-direction back-to-back (`ends_at = starts_at`) → `201 ACTIVE` for Participant A; (b) isolated Participant B (or fresh reset) where `W1` is the sole `ACTIVE` overlap with `W_overlap`: cancelling `W1` (`F-05`) preserves its `CANCELLED` row and permits `201 ACTIVE` on `W_overlap` (exactly one new `ACTIVE` row). *(Baseline continuity check; may pass at RED and remains GREEN.)*
- **`STS-F03-16` (`AC-F03-16`, Real DB concurrency):** Same Participant sends two synchronized concurrent `POST` requests to two overlapping open workshops → `1× 201` + `1× 409 SCHEDULE_CONFLICT` and exactly `1` new `ACTIVE` row in PostgreSQL. *(Expected to **FAIL** at `L7-02` RED on pre-change code.)*
- **`STS-F03-17` (`AC-F03-17`, UI+API):** Participant detail view (`web/ParticipantApp.tsx`) surfaces `409 SCHEDULE_CONFLICT` message in `role="alert"`, does not report false success, and refreshes availability.

---

## 5. Pre-Implementation Review Record (To Be Completed on `L7-01` PR)

- **Author:** `thananun-7203` — Authored docs-only PR [#86](https://github.com/cottonlnwza/TTworkshop/pull/86) for [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85) on branch `docs/issue85-l7-01-schedule-conflict-contract` from `sprint_2_staging@64731976` with zero code/test/migration modifications. Addressed Round 1 binding findings `R-01` (isolated `STS-F03-15` fixtures), `R-02` (single explicit `409 INVALID_DEADLINE` defensive code), and `R-03` (distinguished advisory-lock least-privilege design rationale from planned `L7-02` runtime-role validation) in the same PR.
- **Independent Reviewer Gate:** Pending `cottonlnwza` Round 2 six-axis re-review, GitHub `Formal APPROVE`, and staging merge into `sprint_2_staging` **before** `L7-02` (#83) branches and commits TDD `RED` tests.
