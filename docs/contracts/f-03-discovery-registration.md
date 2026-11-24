# F-03 — Published Workshop Discovery and Capacity-Safe Registration

> **F-03 scoped working contract v0.2.1 — Lab 7 Part A Accepted (`421705d3`) & Part B PR #87 Round 2 Candidate (`950d4b68`, Author-local `196/196` PASS; Round 2 hosted CI/re-review pending) — 2026-11-25** · Original P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Sprint 1 Implementation [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) · Lab 7 Part A [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85) (`CLOSED`) · **Lab 7 Part B [Issue #83 (`L7-02`)](https://github.com/cottonlnwza/TTworkshop/issues/83)**
> Source: `docs/srs.md` full-product DRAFT v0.2.3 (`FR-06`/`07`, `BR-01`/`04`/`05`/`05b`/`06`/`07`/`08`, `NFR-01`/`02`/`03`); `docs/features.md` F-03; `docs/system-sds.md` sections 3–7; [`DEC-14`](../decisions/dec-14-schedule-conflict.md); [Lab 7 Part A Change Impact](../labs/lab-07/change-impact-and-contract.md); [Lab 7 Part B Evidence](../labs/lab-07/implementation-and-regression.md).
> **Historical Sprint 1 acceptance preserved (`v0.1.6`, 2026-11-09):** Original Sprint 1 F-03 (`AC/STS-F03-01`–`13`) received Formal APPROVE on PR #15 exact HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6`, merged to `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`, released via PR #26 (`3f5ec15a`), and passed Lab 6 baseline verification (`4efbcfa`). **Current `v0.2.1` status:** `L7-01` (#85 / PR #86) was accepted and merged at `sprint_2_staging@421705d3`; `AC/STS-F03-14`–`17` passed Author-local TDD `RED` (`70f67afe`) → `GREEN` (`24dfdfdd`) → `195/195` full regression (`0389eee7`) under `L7-02` (#83), with hosted PR CI, independent review, and staging merge pending.

## 1. Purpose, upstream decisions and excluded scope

Participant discovers published workshops, sees approved fields/availability, registers exactly once per workshop while capacity remains, and receives an authoritative ACTIVE persisted registration. Critical invariant: **race-safe** last seat without lost updates or overbooking. Drafts and foreign private data stay hidden.

**Depends:** F-01 backend identity and **F-02's owned Workshop creation/publication with BR-08 write-side deadline validation**; PostgreSQL transaction/lock support; and the F-03-specific exact-HEAD Reviewer milestone. Reviewer `cottonlnwza` first authorized DEC-11 Participant-only browsing, DEC-12's 10-request test profile, F-03 application of DEC-04 and the atomic capacity/ACTIVE-uniqueness strategy for implementation only on PR #15 specification HEAD `b81280e9bfbc15a4ba1b7cd4cf19e02499622b71`. The subsequent final Formal APPROVE, staging merge and Author post-merge verification are now complete (see evidence links above). DEC-02/03/04/10-F02 remain accepted only as F-02 scoped working choices; none implies global SRS/SDS or instructor approval. **OPEN:** actual university timezone configuration, final global baseline approval and matters outside the reviewed F-03 scope. **Accepted F-03 application of DEC-04:** absent configured deadline defaults to `starts_at`; configured deadline must not exceed `starts_at`; registration closes at `now >= effective_deadline`. **F-02 owns rejection of invalid Create/Publish input; F-03 owns fail-closed Registration if invalid persisted data nevertheless exists.** The 10-request concurrency profile is accepted for this F-03 staging scope; the course-level invariant remains that capacity must never be exceeded, including competing requests for the final seat.

**Sprint 2 boundary:** manual registration closure/reopen and its cancellation interaction are **BR-10 / F-05–F-06 (Sprint 2)**, not an F-03 Sprint 1 acceptance condition. No cancellation, historical re-registration, manual closure management, checkout or attendance in F-03. Future F-06 integration must add the BR-10 closure guard and its independent tests; this does not waive the Sprint 1 BR-07/08 time/status guards.

### 1.1 Two-stage specification authorization and final acceptance

F-03 was delivered through the team-approved **single PR #15** lifecycle. PR #15 is merged; do not open another PR for Issue #5.

1. **Pre-implementation authorization:** before TDD, the independent Reviewer must review the exact current PR #15 HEAD and resolve the F-03-specific choices that implementation depends on: DEC-11 Participant-only discovery access; DEC-12 numeric concurrency test profile (or a Reviewer-directed replacement); F-03 application of DEC-04 (`effective_deadline = COALESCE(registration_deadline, starts_at)` and closed boundary `now >= effective_deadline`); and the proposed atomic capacity/ACTIVE-uniqueness strategy. If accepted, Reviewer `cottonlnwza` records the exact PR conversation phrase `Approved for Implementation Only — Not Approved for Merge` plus the full reviewed HEAD SHA. The Author verifies Reviewer identity and SHA equality with current PR head before starting TDD. A new commit invalidates the prior SHA milestone until re-reviewed.
2. **Final acceptance:** after accepted AC, tests, build and evidence were recorded on the final PR HEAD, PR #15 became Ready for Review, received substantive code/test review and GitHub Formal APPROVE from `cottonlnwza`, was merged by the teammate into `sprint_1_staging`, and was independently checked by the Author on the merge commit. This sequence completed the F-03 scoped working acceptance for the staging baseline; it does not approve the global SRS/System SDS or instructor baseline.

The pre-implementation milestone was **not** a GitHub Formal APPROVE, merge permission, approval of the full SRS/System SDS, or instructor approval. Between the two stages, a choice was authorized for F-03 implementation while remaining not finally accepted. The separate final review/merge/Author verification stage is now complete for the scoped F-03 choices. The 10-request profile is accepted for this F-03 staging scope; the course-level no-overbooking invariant remains mandatory independently of that numeric profile.

## 2. Feature SDS: sequence, atomicity and boundary rejection

1. Approved audience requests published listing/detail. Backend filters `PUBLISHED`; never expose foreign DRAFT or private registrant rows. Listing shows an availability indicator derived from authoritative ACTIVE count and capacity (may change under concurrency).
2. Participant chooses a published workshop and submits registration without supplying `participant_user_id`, `status`, `owner_user_id` or authoritative seat count; server resolves identity from session.
3. **Single database transaction:** lock the target Workshop row or equivalent serialized predicate, confirm `PUBLISHED` status, **fail closed if persisted `registration_deadline > starts_at` (F-03 defense-in-depth for BR-08)**, **BR-07 time eligibility** and capacity against ACTIVE registrations; enforce unique ACTIVE (`workshop_id`, `participant_user_id`) in database; insert ACTIVE record and commit. The database must enforce uniqueness independently of UI, and an atomic guard must protect the last seat. Retry/conflict handling must not bypass eligibility.
4. Return committed ACTIVE registration ID/status; re-fetch remains correct. A duplicate, full workshop, unpublished DRAFT, **invalid configured deadline**, at/past effective deadline, wrong role or anonymous attempt fails **without a new ACTIVE row**. F-06 adds the separate BR-10 manual-closure guard in Sprint 2.
5. Concurrency acceptance: on a workshop with one remaining seat, distinct authenticated Participants attempt concurrently; exactly one commits and total ACTIVE count never exceeds capacity. Ten overlapping requests / nine rejections is the **DEC-12 F-03 implementation test profile**, not a course-mandated numeric threshold or performance benchmark.

**Decision condition:** if the selected DB cannot implement row locks as proposed, document an equivalent atomic serializable/conditional-counter strategy and test it against the *real chosen DB*; no read–check–insert outside a transaction. The implementation uses PostgreSQL row locking and a database-enforced partial unique index.

### 2.1 Lab 7 Maintenance Revision — Cross-Workshop Schedule Conflict (`BR-05b` / `DEC-14`, `v0.2.0` PROPOSED)

1. **Per-Participant transaction serialization:** Inside `POST /api/v1/workshops/:id/registrations`, immediately after `BEGIN` and **before** locking the target `workshops` row (`SELECT ... FOR UPDATE`), acquire `SELECT pg_advisory_xact_lock(-($1::bigint))` using the session-derived `BIGINT` `participant_user_id`. Because `users.id >= 1`, negative `BIGINT` keys `[-9223372036854775807, -1]` are strictly disjoint from the migration lock `48033401` (`api/migrate.ts`), preserve full `BIGINT` fidelity, require zero `UPDATE` grant on `public.users`, and establish a strict deadlock-free lock order (`advisory_lock → workshops FOR UPDATE → registrations`).
2. **Overlap invariant (`BR-05b`):** After confirming the target workshop is `PUBLISHED`, not manually closed (`F-06`), has valid schedule/deadline (`starts_at`, `ends_at`, `ends_at > starts_at`, `registration_deadline <= starts_at`), is before `effective_deadline`, has free capacity (`active_count < capacity`), and has no existing same-workshop `ACTIVE` duplicate (`BR-05` → `409 DUPLICATE_ACTIVE`), query whether the same `participant_user_id` holds an `ACTIVE` registration on any **different** workshop (`r.workshop_id <> target.id`) satisfying `existing.starts_at < target.ends_at AND target.starts_at < existing.ends_at` in PostgreSQL `TIMESTAMPTZ` precision.
3. **Boundaries & history:** Back-to-back workshops (`existing.ends_at = target.starts_at` or `target.ends_at = existing.starts_at`) do **not** overlap and are permitted (`201`). `CANCELLED` rows (`F-05`) are excluded from conflict checks and retained intact. Another Participant's `ACTIVE` registration never blocks this Participant (`BR-01`).
4. **Concurrent overlapping requests:** Two simultaneous requests by the same Participant for two overlapping published workshops serialize on `pg_advisory_xact_lock(-participant_user_id)` so exactly one commits (`201 ACTIVE`), the other rolls back (`409 SCHEDULE_CONFLICT`), and only one new `ACTIVE` row exists in PostgreSQL.

## 3. UI contract

| Screen/state | Behavior |
|---|---|
| `/workshops` | Published-only list for an authenticated `PARTICIPANT`: ID, title, start time, location, capacity, remaining seats and registration-open indicator; loading, empty and error states. Anonymous → `401`; `ORGANIZER` → `403` (DEC-11 accepted for the F-03 staging scope) |
| `/workshops/:id` | Published detail for an authenticated `PARTICIPANT`, including description, location, start/end, capacity, remaining seats and eligibility indicator; do not display private DRAFT. Anonymous → `401`; `ORGANIZER` → `403`; missing/unpublished ID → safe `404` for an authorized Participant |
| Register action | Participant only; pending indicator and duplicate-submit guard; API must still reject repeat/concurrent submissions |
| Success / failure | Show persisted registration ID/ACTIVE; for `CAPACITY_FULL`, `DUPLICATE_ACTIVE`, `INVALID_DEADLINE`, `DEADLINE_PASSED`, `REGISTRATION_CLOSED` (F-06), and **`SCHEDULE_CONFLICT` (`BR-05b` / `DEC-14`, v0.2.0)** display safe non-leaking feedback on the workshop detail view (`role="alert"`) and refresh availability. Browse-list conflict badges and server-derived `already_registered` flags are explicitly deferred follow-up work. |

Basic list only; filtering/search is F-09 and beyond F-03. Client clock/count is never authoritative.

## 4. API specification

Base `/api/v1`; JSON success `{"data":...}` and failure `{"error":{"code":"...","message":"..."}}`. Sample IDs/timestamps below are illustrative; successful registration may use 201 with new resource location.

| Method/path | Request/query | Expected success | Negative/exception |
|---|---|---|---|
| `GET /workshops` | authenticated `PARTICIPANT` session | `200` published summaries only, `data:[{id,title,starts_at,location,capacity,remaining_seats,registration_open}]` | `401` anonymous; `403` Organizer; no DRAFT or owner-private fields |
| `GET /workshops/:id` | authenticated `PARTICIPANT` session and published ID | `200` published detail including registration availability | `401` anonymous; `403` Organizer; `404` DRAFT/missing/hidden for Participant; no owner-private fields |
| `POST /workshops/:id/registrations` | Participant cookie, same-origin `Origin` header and `{}` body (server chooses identity) | `201` `{"data":{"id":"r-1","workshop_id":"w-1","status":"ACTIVE","registered_at":"<ISO>"}}` committed | `401` anonymous; `403` wrong role/foreign Origin; `404` unpublished/hidden/invalid ID; `409` closed/invalid deadline/expired deadline/full/duplicate/**schedule conflict (`SCHEDULE_CONFLICT`)** |

**Implemented + `v0.2.0` error taxonomy & deterministic precedence (`POST /workshops/:id/registrations`):** `401 UNAUTHENTICATED` → `403 FORBIDDEN` → `404 NOT_FOUND` → `409 REGISTRATION_CLOSED` (`F-06` / `BR-10`) → `409 INVALID_DEADLINE` (`BR-08` & malformed target `starts_at`/`ends_at`) → `409 DEADLINE_PASSED` (`BR-07`) → `409 CAPACITY_FULL` (`BR-06`) → `409 DUPLICATE_ACTIVE` (`BR-05`, same workshop) → **`409 SCHEDULE_CONFLICT` (`BR-05b` / `DEC-14`, different overlapping workshop; `v0.2.0` PROPOSED)**. Avoid revealing registration ownership or other users' schedules in error responses. Unknown IDs and private drafts must not be distinguishable to an unauthorized user. The server computes eligibility from the authorized effective-deadline and schedule-overlap rules, never client input.

## 5. Data and transaction contract (implemented by migration 004)

| Entity/constraint | Implemented schema and guard |
|---|---|
| `Workshop` | `id`, `status`, `starts_at`, `registration_deadline?`, `capacity`, `owner_user_id`; published/positive capacity from F-02; any `registration_closed` field/behavior is deferred to F-06 |
| `Registration` | Implemented in migration 004: `id PK`, `workshop_id FK`, `participant_user_id FK`, `status` = ACTIVE or CANCELLED, `registered_at`, `cancelled_at?`, `checked_in_at?`; status history policy F-05 |
| Uniqueness | PostgreSQL partial unique index `registrations_one_active_per_participant_workshop_idx` enforces at most one ACTIVE per Participant/Workshop |
| Capacity | PostgreSQL Workshop-row `SELECT ... FOR UPDATE`; check ACTIVE count < capacity and insert in same transaction |
| Deadline (BR-08, registration read guard only) | `effective_deadline = COALESCE(registration_deadline,starts_at)`; F-02 validates configured input at Create/Publish; F-03 independently **rejects Registration** if malformed persisted `registration_deadline > starts_at` appears. F-03 application of DEC-04 is accepted for this scoped staging delivery |
| Eligibility (BR-07) | Reject `now >= effective_deadline` for an otherwise valid PUBLISHED workshop with free capacity; F-03 application of DEC-04 is accepted for this scoped staging delivery |
| Schedule conflict (`BR-05b` / `DEC-14`, `v0.2.0` PROPOSED) | Reuses migrations `002`/`004` with **zero new DB migrations**. Acquire `pg_advisory_xact_lock(-($1::bigint))` on session `participant_user_id` before `workshops FOR UPDATE`; reject with `409 SCHEDULE_CONFLICT` if an `ACTIVE` registration exists for the same Participant on `w.id <> target.id` with `existing.starts_at < target.ends_at AND target.starts_at < existing.ends_at`. |

**Transaction behavior (Sprint 1 baseline + `v0.2.0` `DEC-14` planned extension; pseudocode, not executable SQL):**

`BEGIN; SELECT pg_advisory_xact_lock(-participant_user_id); LOCK workshop FOR UPDATE; CHECK (published, not registration_closed, valid schedule/BR-08 deadline, BR-07 time eligibility); CHECK active_count < capacity; CHECK no same-workshop ACTIVE duplicate (BR-05); CHECK no cross-workshop overlapping ACTIVE registration (BR-05b); INSERT ACTIVE guarded by active-only unique constraint; COMMIT;`

On constraint conflict rollback and return safe 409; never promise a seat based solely on list view. The isolated F-03 integration fixture creates ten **distinct** Participants and a workshop with exactly one remaining seat for the race test, then validates the DB postcondition. Migration `004_registrations.sql` is part of Issue #5 implementation.

## 6. Observable Acceptance Criteria (AC)

| AC ID | Outcome / source |
|---|---|
| **AC-F03-01** | Only an authenticated `PARTICIPANT` can list workshops; the list contains only PUBLISHED workshops and approved summary fields. Anonymous receives `401`, Organizer receives `403`, and foreign DRAFT cannot appear (FR-06, BR-04/01; DEC-11 accepted for the F-03 staging scope). |
| **AC-F03-02** | An authenticated `PARTICIPANT` reads published detail including eligible seat information and safe empty/loading/error states. Anonymous receives `401`, Organizer receives `403`, and a missing/unpublished ID returns a safe `404` to the Participant (FR-06; DEC-11 accepted for the F-03 staging scope). |
| **AC-F03-03** | Eligible Participant registers once to published workshop below capacity; committed ACTIVE row links to session Participant, persists and returns ID/status (FR-07, NFR-02). |
| **AC-F03-04** | Duplicate ACTIVE registration for same Participant+Workshop is rejected even for simultaneous attempts; one ACTIVE DB row remains (BR-05). |
| **AC-F03-05** | Full capacity rejects additional registration with no row added (BR-06). |
| **AC-F03-06** | Concurrent distinct Participant requests race for exactly one seat; exactly one commits and ACTIVE count never exceeds capacity. The 10-request / nine-rejection profile is authorized by DEC-12 for this F-03 implementation, not a course-mandated numeric threshold (BR-06, NFR-03). |
| **AC-F03-07** | DRAFT/unpublished workshop rejects registration without creating registration or disclosing owner-private content (BR-04). |
| **AC-F03-08** | **BR-07 independently:** for a PUBLISHED workshop with available capacity and a **valid configured deadline earlier than start**, register before deadline is permitted; **at/after** that effective deadline a new registration is rejected with no row added. Manual closure is **not part of this fixture** (Sprint 2 BR-10). F-03 application of the F-02-scoped DEC-04 choice is accepted for this scoped staging delivery. |
| **AC-F03-09** | Anonymous/Organizer registration is denied; forged user/status/owner fields cannot reassign or bypass authorization (BR-01, NFR-01). |
| **AC-F03-10** | Registration and availability remain correct when app process restarts and persisted records are re-read from DB (NFR-02). |
| **AC-F03-11** | Invalid/missing workshop ID safely fails; UI conveys domain conflict and does not report false successful registration (FR-07). |
| **AC-F03-12** | **BR-08 default independently:** when `registration_deadline` is absent, effective deadline equals workshop start; with the same otherwise valid PUBLISHED/capacity fixture, before-start registration is eligible and registration **at/after start** is rejected (F-03 application of DEC-04 accepted for this scoped staging delivery). |
| **AC-F03-13** | **BR-08 fail-closed Registration only:** if a **PUBLISHED** workshop in the database has malformed persisted `registration_deadline > starts_at` despite F-02's Create/Publish validations, the F-03 registration service rejects the attempt without inserting ACTIVE rows, even when clock is before `starts_at` and capacity remains. No Create/Publish action belongs to this AC; F-03 application of DEC-04 is accepted for this scoped staging delivery. |
| **AC-F03-14** | **BR-05b overlap rejection & error precedence (`v0.2.0` PROPOSED / `DEC-14`):** Authenticated Participant with an `ACTIVE` registration in workshop W1 is rejected (`409 SCHEDULE_CONFLICT`, zero rows inserted) when registering for a different overlapping published workshop W2 (partial, contained, or identical overlap); another Participant B can still register for W2 (`BR-01`); forged body `participant_user_id` is ignored; existing error precedence (`404` → `REGISTRATION_CLOSED` → `INVALID_DEADLINE` → `DEADLINE_PASSED` → `CAPACITY_FULL` → `DUPLICATE_ACTIVE` → `SCHEDULE_CONFLICT`) is preserved (`FR-07`, `BR-01`, `BR-05`, `BR-05b`, `NFR-01`). |
| **AC-F03-15** | **BR-05b exact boundaries & `F-05` cancellation compatibility (`v0.2.0` PROPOSED / `DEC-14`):** Back-to-back workshops (`existing.ends_at = target.starts_at` and `target.ends_at = existing.starts_at`) are accepted (`201 ACTIVE`); a `CANCELLED` registration (`F-05`) does not block registration for an overlapping workshop and its `CANCELLED` history row remains preserved (`FR-07`, `BR-05b`, `BR-09`, `BR-12`, `NFR-02`). |
| **AC-F03-16** | **BR-05b real DB concurrent dual-workshop race (`v0.2.0` PROPOSED / `DEC-14`):** When one authenticated Participant submits two simultaneous registration requests for two overlapping open workshops behind a synchronized barrier, `pg_advisory_xact_lock(-participant_user_id)` serializes the transactions so exactly one commits (`201`), one is rejected (`409 SCHEDULE_CONFLICT`), and PostgreSQL persists exactly one new `ACTIVE` row with zero deadlocks (`FR-07`, `BR-05b`, `NFR-03`). |
| **AC-F03-17** | **BR-05b workshop detail UI conflict feedback (`v0.2.0` PROPOSED / `DEC-14`):** When registration fails with `409 SCHEDULE_CONFLICT`, `web/ParticipantApp.tsx` displays the conflict message on the workshop detail screen (`role="alert"`), never reports false registration success, and refreshes workshop availability cleanly (`FR-06`, `FR-07`, `BR-05b`). |

## 7. Software Test Specification (STS): EXECUTION RECORDED IN §7A

| TEST ID | AC | Level | Preconditions → inputs/action → expected |
|---|---|---|---|
| **STS-F03-01** | AC-F03-01 | API+DB | Seed PUBLISHED W1 and private DRAFT W2 → authenticated Participant lists only W1; anonymous gets `401`; Organizer gets `403`; listing/detail excludes W2 and returns only allowed fields |
| **STS-F03-02** | AC-F03-02 | UI/E2E | Authenticated Participant opens published list/detail → visible details and controlled empty/loading/error; verify anonymous and Organizer cannot enter Participant browse routes |
| **STS-F03-03** | AC-F03-03 | API+DB | Seed eligible W1 capacity 2, Participant A → POST registration → 201 ACTIVE, DB owner A |
| **STS-F03-04** | AC-F03-04 | API+DB concurrency | Participant A submits two concurrent requests → only one ACTIVE record, second rejected |
| **STS-F03-05** | AC-F03-05 | API+DB boundary | Capacity 1, one ACTIVE registered → other Participant POST → 409, count remains 1 |
| **STS-F03-06** | AC-F03-06 | Real DB concurrency | Capacity 1, no ACTIVE, 10 distinct seeded Participants behind a synchronized start barrier → exactly one success and ACTIVE count=1 |
| **STS-F03-07** | AC-F03-07 | API+DB security | Attempt registration on owned or foreign DRAFT → 404/409 safe rejection, DB unchanged |
| **STS-F03-08** | AC-F03-08 | API+DB clock boundary | PUBLISHED workshop, capacity available, valid configured deadline = start minus one hour; fixed clock just before/at/after configured deadline → before eligible, at/after 409 with no new ACTIVE row; **hold manual closure out of fixture** |
| **STS-F03-09** | AC-F03-09 | API+DB negative | Anonymous, Organizer, forged participant ID/status → denied or ignored safely; identity always from session |
| **STS-F03-10** | AC-F03-10 | Integration | Commit valid ACTIVE, restart app, GET persisted state/count → unchanged |
| **STS-F03-11** | AC-F03-11 | UI+API | Unknown ID and capacity race conflict → safe error, no success toast, user can refresh |
| **STS-F03-12** | AC-F03-12 | API+DB default boundary | PUBLISHED workshop, `registration_deadline=NULL`, available capacity; fixed clock before/at/after `starts_at` → before eligible, at/after 409 and unchanged DB count; proves default=starts_at independently |
| **STS-F03-13** | AC-F03-13 | API+DB defensive registration | **Bypass F-02 API only in isolated test DB setup** to seed invalid persisted `PUBLISHED` workshop with `registration_deadline=T+1min`, `starts_at=T`, free capacity and fixed clock `T-1h`; authenticated Participant POST registration → safe `409 INVALID_DEADLINE`, **zero new ACTIVE rows**, no workshop mutation; **do not call Create/Publish in this test** |
| **STS-F03-14** | AC-F03-14 | API+DB (`v0.2.1` Author-local PASS; CI/review pending) | Seed open W1 (`10:00–12:00Z`) and overlapping W2 (`11:00–13:00Z`, plus contained/identical cases), Participant A ACTIVE in W1 → A POSTs W2 → `409 SCHEDULE_CONFLICT` with zero new rows; Participant B POSTs W2 → `201 ACTIVE`; A repeats W1 → `409 DUPLICATE_ACTIVE`; full/closed/expired precedence preserved *(RED FAIL `70f67afe` → GREEN PASS `24dfdfdd`/`0389eee7`)* |
| **STS-F03-15** | AC-F03-15 | API+DB boundary + F-05 (`v0.2.1` Author-local PASS; CI/review pending) | **Two isolated fixtures (`R-01`):** (a) *Two-direction back-to-back adjacency:* seed W1 (`10:00–12:00Z`), W_after (`12:00–14:00Z`), and W_before (`08:00–10:00Z`) → Participant A ACTIVE in W1 registers for W_after (`201 ACTIVE`) and W_before (`201 ACTIVE`); (b) *`F-05` cancellation releases overlap (independent Participant B or fresh reset so W1 is the ONLY ACTIVE overlap):* seed W1 (`10:00–12:00Z`) and W_overlap (`11:00–13:00Z`), Participant B ACTIVE in W1 cancels W1 (`F-05` → `CANCELLED` with `cancelled_at`) then registers for W_overlap → `201 ACTIVE`; assert W1's `CANCELLED` row remains intact plus **exactly one** new `ACTIVE` row for W_overlap *(baseline PASS at RED `70f67afe` & GREEN `24dfdfdd`/`0389eee7`)* |
| **STS-F03-16** | AC-F03-16 | Real DB concurrency (`v0.2.1` Author-local PASS; CI/review pending) | Seed open overlapping W1 (`10:00–12:00Z`, cap 5) and W2 (`11:00–13:00Z`, cap 5) → Participant A sends two synchronized concurrent POSTs to W1 and W2 → exactly one `201`, one `409 SCHEDULE_CONFLICT`, and exactly `1` new `ACTIVE` row in PostgreSQL with zero deadlocks *(RED FAIL `70f67afe` → GREEN PASS `24dfdfdd`/`0389eee7`)* |
| **STS-F03-17** | AC-F03-17 | UI+API & Chrome E2E (`v0.2.1` Author-local PASS; CI/review pending) | Participant opens detail view in `web/ParticipantApp.tsx` and clicks Register when API returns `409 SCHEDULE_CONFLICT` → detail page shows conflict error in `role="alert"`, no success banner, button not falsely marked registered, availability refreshed *(Chrome E2E RED FAIL `70f67afe` → GREEN PASS `24dfdfdd`/`0389eee7`)* |

## 7A. Executed test mapping

| STS | Executable evidence |
|---|---|
| STS-F03-01 | `tests/f03.integration.test.ts` — Participant-only list, published-only filter, Anonymous 401, Organizer 403 |
| STS-F03-02 | `tests/f03.integration.test.ts`, `tests/f03.browser.test.ts`, `tests/f03.ui.test.tsx` — published detail, hidden/missing 404, Chrome journey, loading/empty/error UI states |
| STS-F03-03 | `tests/f03.integration.test.ts`, `tests/f03.browser.test.ts` — committed ACTIVE row and session-derived Participant identity |
| STS-F03-04 | `tests/f03.integration.test.ts` — overlapping duplicate requests and database uniqueness |
| STS-F03-05 | `tests/f03.integration.test.ts` — full-capacity rejection and unchanged ACTIVE count |
| STS-F03-06 | `tests/f03.integration.test.ts` — 10 distinct Participants, synchronized start barrier, one remaining seat, exactly one success |
| STS-F03-07 | `tests/f03.integration.test.ts` — DRAFT registration rejected without a row |
| STS-F03-08 | `tests/f03.integration.test.ts` — configured deadline just-before/at/after boundaries |
| STS-F03-09 | `tests/f03.integration.test.ts` — anonymous, Organizer and forged identity/status/owner fields |
| STS-F03-10 | `tests/f03.integration.test.ts` — real API process stop/restart and persisted availability read |
| STS-F03-11 | `tests/f03.integration.test.ts`, `tests/f03.browser.test.ts`, `tests/f03.ui.test.tsx` — unknown ID and stale-availability capacity conflict without false success |
| STS-F03-12 | `tests/f03.integration.test.ts` — absent deadline defaults to `starts_at`, just-before/at/after boundaries |
| STS-F03-13 | `tests/f03.integration.test.ts` — isolated malformed persisted PUBLISHED deadline and fail-closed registration |

**Observed execution:** actual PostgreSQL test DB, migration 004, Workshop-row `FOR UPDATE`, ACTIVE partial unique index, 10 overlapping Participants with a synchronized start barrier, separate configured/default deadline boundary tests, invalid persisted deadline fail-closed test, and actual API process restart are recorded with RED→GREEN, test commands and output in [`docs/evidence/p1-05-f03.md`](../evidence/p1-05-f03.md). This is local Author execution, not hosted CI or independent Reviewer reproduction.

**Lab 7 Part A (`v0.2.0`, [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85)) → Part B (`v0.2.1`, [Issue #83 (`L7-02`)](https://github.com/cottonlnwza/TTworkshop/issues/83)):** `L7-01` was independently approved and merged into `sprint_2_staging@421705d3f0c8d7c4f489b573f8471621c2035098` ([PR #86](https://github.com/cottonlnwza/TTworkshop/pull/86)). Under `L7-02` (#83), `STS-F03-14`–`17` (`BR-05b` / `DEC-14`) plus the `R-03` runtime-role advisory-lock test have **Author-local TDD RED (`70f67afe`) → GREEN (`24dfdfdd`) → full regression (`0389eee7`, `195/195` Vitest across 32 files, `41/41` Python, `npm run build` PASS)** recorded in [`docs/labs/lab-07/implementation-and-regression.md`](../labs/lab-07/implementation-and-regression.md):

| STS | Executable evidence (`L7-02` Author-local on `24dfdfdd` / `0389eee7`) |
|---|---|
| STS-F03-14 | `tests/f03.integration.test.ts` — partial/contained/identical overlap `409 SCHEDULE_CONFLICT`, Participant B isolation, forged body ignored, preserved error precedence |
| STS-F03-15 | `tests/f03.integration.test.ts` — isolated fixtures: (a) two-direction back-to-back `201`, (b) `F-05` sole-overlap cancel retains `CANCELLED` row and permits overlapping `201` |
| STS-F03-16 | `tests/f03.integration.test.ts` — synchronized dual-workshop overlap race by same Participant serialized via `pg_advisory_xact_lock(-participant_user_id)` (`1× 201`, `1× 409 SCHEDULE_CONFLICT`, `1` DB row) |
| STS-F03-17 | `tests/f03.ui.test.tsx`, `tests/f03.browser.test.ts` — detail-view `role="alert"` conflict reason without false success, stale banner reset, availability refresh |

*Hosted PR CI, independent six-axis review, and `sprint_2_staging` merge for `L7-02` remain pending.*

## 8. Feature Definition of Done — MET for the scoped F-03 staging delivery

- [x] Pre-implementation Reviewer milestone verified at exact PR #15 specification HEAD; DEC-11, DEC-12 profile, F-03 DEC-04 application and atomicity strategy were authorized before TDD.
- [x] Published-only UI + backend API + durable PostgreSQL transaction with ACTIVE uniqueness and capacity safety; no mock-only success.
- [x] AC-F03-01–13 ↔ STS-F03-01–13 executed locally, including BR-07 boundary, BR-08 default + separate fail-closed **Registration-only** fixture, real concurrent last-seat safety and authorization negatives. BR-08 Create/Publish rejection remains covered by F-02.
- [x] Final substantive teammate code review and GitHub Formal APPROVE on exact feature HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6`; teammate merge into `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`; Author post-merge `git diff --check`, build and 69/69 regression verification on the exact merge commit ([review](https://github.com/cottonlnwza/TTworkshop/pull/15#pullrequestreview-5814213834), [verification](https://github.com/cottonlnwza/TTworkshop/issues/5#issuecomment-6724013761)).

**Change record:** v0.1, 2026-11-03, P1-02 PRE-IMPLEMENTATION DRAFT only; author `cottonlnwza`, proposed reviewer `thananun-7203`; **NOT APPROVED / OPEN DECISIONS**.

**v0.1.1 (2026-11-03), Reviewer R-01 correction:** split BR-07 time eligibility from BR-08 default/configured deadline and add AC/STS-F03-12/13. Explicitly defer manual closure BR-10 to F-05/F-06 in Sprint 2. All tests remain **PLANNED / NOT EXECUTED**; DEC-04 still OPEN.

**v0.1.2 (2026-11-03), Reviewer R-03 correction:** keep AC/STS-F03-13 but scope **only** to Registration fail-closed for malformed persisted data, independently of F-02 Create/Publish AC/STS-F02-10/11. **NOT APPROVED / NOT EXECUTED**.

**v0.1.3 (2026-11-06), Issue #5 Specification-first proposal:** make Participant-only published browsing explicit as the DEC-11 proposal (401 Anonymous / 403 Organizer); reconcile F-02-scoped DEC-04 acceptance with its proposed F-03 application; clarify that DEC-12's 10-request profile is provisional while the no-overbooking invariant remains mandatory. AC/STS IDs and total counts remain unchanged. **PENDING independent Reviewer consideration; NOT APPROVED / NOT EXECUTED.**

**v0.1.4 (2026-11-06), PR #15 Reviewer R-01 correction:** define the exact-HEAD pre-implementation authorization milestone separately from final Formal APPROVE/merge/Author verification; keep the single Draft PR #15 lifecycle. AC/STS IDs and total counts remain unchanged.

**v0.1.5 (2026-11-07), exact-HEAD milestone and implementation evidence:** record Reviewer `cottonlnwza`'s implementation-only authorization at SHA `b81280e9bfbc15a4ba1b7cd4cf19e02499622b71`; preserve all AC-F03-01–13 and STS-F03-01–13; record PostgreSQL migration/API/UI implementation and local RED→GREEN evidence in `docs/evidence/p1-05-f03.md`. **NOT FINALLY ACCEPTED: final Formal APPROVE, staging merge and Author post-merge verification remain pending.**

**v0.1.6 (2026-11-09), Issue #16 post-merge status reconciliation:** record final Formal APPROVE on feature HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6`, staging merge `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`, and Author post-merge build/test/diff verification. Preserve the pre-implementation authorization and earlier review snapshots above as history. F-03 scoped staging DoD is MET; global SRS/System SDS and instructor approval remain separate and unclaimed.

**v0.2.0 (2026-11-24), Lab 7 Part A ([Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85)) pre-implementation maintenance revision:** add `BR-05b` / [`DEC-14`](../decisions/dec-14-schedule-conflict.md) cross-workshop schedule-conflict rejection (`409 SCHEDULE_CONFLICT`), deterministic error precedence preserving `BR-05`–`BR-10`, negative-`BIGINT` transaction-scoped advisory lock `pg_advisory_xact_lock(-($1::bigint))` disjoint from migration lock `48033401`, detail-view UI feedback (deferring browse badges & `already_registered`), and four planned AC/STS pairs (`AC/STS-F03-14`–`17`, **`PLANNED / NOT EXECUTED`**). Zero code/test changes in `L7-01`; independent review and staging merge by `cottonlnwza` precede `L7-02` (#83) TDD. **PR #86 Round 2 (`R-01` remediation):** isolated `STS-F03-15` sub-case (a) two-direction back-to-back adjacency from sub-case (b) `F-05` cancellation-unblocks-overlap so `W_after` does not overlap `W_overlap`. Merged via [PR #86](https://github.com/cottonlnwza/TTworkshop/pull/86) at `sprint_2_staging@421705d3f0c8d7c4f489b573f8471621c2035098`.

**v0.2.1 (2026-11-25), Lab 7 Part B ([Issue #83 (`L7-02`)](https://github.com/cottonlnwza/TTworkshop/issues/83)) PR #87 candidate evidence update:** recorded Author-local TDD `RED` (`70f67afe`) → `GREEN` (`24dfdfdd`) → `STS-F07-04` non-overlapping per-round schedule fixture alignment (`0389eee7`, `195/195` Vitest across 32 files, `41/41` Python, `npm run build` PASS; Round 1 Hosted CI Run `#45450812959` PASS) → **Round 2 `R-01` remediation (`950d4b68`, PostgreSQL-native `TIMESTAMPTZ` microsecond precision + 3-case microsecond test: `196/196` Vitest across 32 files, `41/41` Python, `npm run build` PASS)** in [`docs/labs/lab-07/implementation-and-regression.md`](../labs/lab-07/implementation-and-regression.md). Round 2 hosted PR CI, independent re-review, and staging merge remain pending.
