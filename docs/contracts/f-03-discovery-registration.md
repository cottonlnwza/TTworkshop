# F-03 — Published Workshop Discovery and Capacity-Safe Registration

> **F-03 scoped working contract v0.1.6 — ACCEPTED for the F-03 staging scope — 2026-11-09** · P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Implementation [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) · Sprint 1
> Source: `docs/srs.md` full-product DRAFT v0.1.9 (FR-06/07, BR-01/04/05/06/07/08, NFR-01/02/03 unchanged); `docs/features.md` F-03; `docs/system-sds.md` sections 3–7. F-03 received Formal APPROVE on PR #15 exact HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6`, was merged to `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`, and passed Author post-merge verification. This scoped acceptance does not approve the global SRS/SDS, instructor baseline or unrelated decisions.

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

## 3. UI contract

| Screen/state | Behavior |
|---|---|
| `/workshops` | Published-only list for an authenticated `PARTICIPANT`: ID, title, start time, location, capacity, remaining seats and registration-open indicator; loading, empty and error states. Anonymous → `401`; `ORGANIZER` → `403` (DEC-11 accepted for the F-03 staging scope) |
| `/workshops/:id` | Published detail for an authenticated `PARTICIPANT`, including description, location, start/end, capacity, remaining seats and eligibility indicator; do not display private DRAFT. Anonymous → `401`; `ORGANIZER` → `403`; missing/unpublished ID → safe `404` for an authorized Participant |
| Register action | Participant only; pending indicator and duplicate-submit guard; API must still reject repeat/concurrent submissions |
| Success / failure | Show persisted registration ID/ACTIVE; for `CAPACITY_FULL`, `DUPLICATE_ACTIVE`, `INVALID_DEADLINE`, `DEADLINE_PASSED` display safe non-leaking feedback and refresh availability; manual closure feedback belongs to F-06 |

Basic list only; filtering/search is F-09 and beyond F-03. Client clock/count is never authoritative.

## 4. API specification

Base `/api/v1`; JSON success `{"data":...}` and failure `{"error":{"code":"...","message":"..."}}`. Sample IDs/timestamps below are illustrative; successful registration may use 201 with new resource location.

| Method/path | Request/query | Expected success | Negative/exception |
|---|---|---|---|
| `GET /workshops` | authenticated `PARTICIPANT` session | `200` published summaries only, `data:[{id,title,starts_at,location,capacity,remaining_seats,registration_open}]` | `401` anonymous; `403` Organizer; no DRAFT or owner-private fields |
| `GET /workshops/:id` | authenticated `PARTICIPANT` session and published ID | `200` published detail including registration availability | `401` anonymous; `403` Organizer; `404` DRAFT/missing/hidden for Participant; no owner-private fields |
| `POST /workshops/:id/registrations` | Participant cookie, same-origin `Origin` header and `{}` body (server chooses identity) | `201` `{"data":{"id":"r-1","workshop_id":"w-1","status":"ACTIVE","registered_at":"<ISO>"}}` committed | `401` anonymous; `403` wrong role/foreign Origin; `404` unpublished/hidden/invalid ID; `409` duplicate/full/invalid deadline/expired deadline |

**Implemented F-03 error taxonomy:** `DUPLICATE_ACTIVE`, `CAPACITY_FULL`, `INVALID_DEADLINE`, `DEADLINE_PASSED`, `NOT_FOUND`, `UNAUTHENTICATED`, `FORBIDDEN`. `REGISTRATION_CLOSED` is **reserved for F-06 / BR-10**. Avoid revealing registration ownership in public responses. Unknown IDs and private drafts must not be distinguishable to an unauthorized user. The server computes eligibility from the authorized effective-deadline rule, never client input.

## 5. Data and transaction contract (implemented by migration 004)

| Entity/constraint | Implemented schema and guard |
|---|---|
| `Workshop` | `id`, `status`, `starts_at`, `registration_deadline?`, `capacity`, `owner_user_id`; published/positive capacity from F-02; any `registration_closed` field/behavior is deferred to F-06 |
| `Registration` | Implemented in migration 004: `id PK`, `workshop_id FK`, `participant_user_id FK`, `status` = ACTIVE or CANCELLED, `registered_at`, `cancelled_at?`, `checked_in_at?`; status history policy F-05 |
| Uniqueness | PostgreSQL partial unique index `registrations_one_active_per_participant_workshop_idx` enforces at most one ACTIVE per Participant/Workshop |
| Capacity | PostgreSQL Workshop-row `SELECT ... FOR UPDATE`; check ACTIVE count < capacity and insert in same transaction |
| Deadline (BR-08, registration read guard only) | `effective_deadline = COALESCE(registration_deadline,starts_at)`; F-02 validates configured input at Create/Publish; F-03 independently **rejects Registration** if malformed persisted `registration_deadline > starts_at` appears. F-03 application of DEC-04 is accepted for this scoped staging delivery |
| Eligibility (BR-07) | Reject `now >= effective_deadline` for an otherwise valid PUBLISHED workshop with free capacity; F-03 application of DEC-04 is accepted for this scoped staging delivery |

**Transaction behavior (implemented in `api/registrations.ts`; pseudocode, not executable SQL):**

`BEGIN; LOCK workshop; CHECK (published, BR-08 valid configured/default deadline, BR-07 time eligibility, role); CHECK active_count < capacity; INSERT ACTIVE guarded by active-only unique constraint; COMMIT;`

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
