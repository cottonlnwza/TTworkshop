# F-03 — Published Workshop Discovery and Capacity-Safe Registration

> **DRAFT v0.1.1 — NOT APPROVED — 2026-11-03** · P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Implementation [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) · Sprint 1
> Source: `docs/srs.md` DRAFT v0.1.2 (unchanged FR-06/07, BR-01/04/05/06/07/08, NFR-01/02/03); `docs/features.md` F-03; `docs/system-sds.md` sections 3–7. **PROPOSED API and data contract, NOT APPROVED or implemented.**

## 1. Purpose, upstream decisions and excluded scope

Participant discovers published workshops, sees approved fields/availability, registers exactly once per workshop while capacity remains, and receives an authoritative ACTIVE persisted registration. Critical invariant: **race-safe** last seat without lost updates or overbooking. Drafts and foreign private data stay hidden.

**Depends:** F-01 backend identity and F-02 published Workshop data; verified relational DB with transaction/lock semantics, approved DEC-02/03/04/10/11, ARCH-01/03/04. **OPEN:** anonymous published browse (DEC-11: default deny until approval), whether Organizer may browse as nonregistrant, timezone conversion, default deadline vs explicit deadline, exact equality rule, location/time visibility, error/status vocabulary. **PROPOSED** from SRS BR-08 (not approved): absent configured deadline defaults to `starts_at`, and a configured deadline must not exceed `starts_at`. The BR-07 gate uses the effective deadline and proposed `now >= effective_deadline` equality boundary (DEC-04 remains OPEN).

**Sprint 2 boundary:** manual registration closure/reopen and its cancellation interaction are **BR-10 / F-05–F-06 (Sprint 2)**, not an F-03 Sprint 1 acceptance condition. No cancellation, historical re-registration, manual closure management, checkout or attendance in F-03. Future F-06 integration must add the BR-10 closure guard and its independent tests; this does not waive the Sprint 1 BR-07/08 time/status guards.

## 2. Feature SDS: sequence, atomicity and boundary rejection

1. Approved audience requests published listing/detail. Backend filters `PUBLISHED`; never expose foreign DRAFT or private registrant rows. Listing shows an availability indicator derived from authoritative ACTIVE count and capacity (may change under concurrency).
2. Participant chooses a published workshop and submits registration without supplying `participant_user_id`, `status`, `owner_user_id` or authoritative seat count; server resolves identity from session.
3. **Single database transaction:** lock the target Workshop row or equivalent serialized predicate, confirm `PUBLISHED` status, **valid deadline configuration (BR-08)**, **BR-07 time eligibility** and capacity against ACTIVE registrations; enforce unique ACTIVE (`workshop_id`, `participant_user_id`) in database; insert ACTIVE record and commit. The database must enforce uniqueness independently of UI, and an atomic guard must protect the last seat. Retry/conflict handling must not bypass eligibility.
4. Return committed ACTIVE registration ID/status; re-fetch remains correct. A duplicate, full workshop, unpublished DRAFT, **invalid configured deadline**, at/past effective deadline, wrong role or anonymous attempt fails **without a new ACTIVE row**. F-06 adds the separate BR-10 manual-closure guard in Sprint 2.
5. Concurrency acceptance: on a workshop with one remaining seat, **10 distinct authenticated Participants** attempt concurrently; exactly one commits, nine are rejected, total ACTIVE count stays equal to capacity. This 10-request number is the **provisional NFR-03 target**, not a measured result.

**Decision condition:** if selected DB cannot implement row locks as proposed, document an equivalent atomic serializable/conditional-counter strategy and test it against the *real chosen DB* before approval; no read–check–insert outside a transaction.

## 3. UI contract (proposed)

| Screen/state | Behavior |
|---|---|
| `/workshops` | Published-only list: title, time, location and availability if approved; loading, empty and error; anonymous/Organizer policy OPEN |
| `/workshops/:id` | Published detail and eligibility explanation; do not display private DRAFT; calculated seats not treated as a reservation |
| Register action | Participant only; pending indicator and duplicate-submit guard; API must still reject repeat/concurrent submissions |
| Success / failure | Show persisted registration ID/ACTIVE; for `FULL`, `DUPLICATE_ACTIVE`, `INVALID_DEADLINE`, `DEADLINE_PASSED` display safe non-leaking feedback, with refresh/retry only if eligible; manual closure feedback belongs to F-06 |

Basic list only; filtering/search is F-09 and beyond F-03. Client clock/count is never authoritative.

## 4. Proposed API specification

Base `/api/v1`; JSON success `{"data":...}` and failure `{"error":{"code":"...","message":"..."}}`. Sample IDs/timestamps below are illustrative; successful registration may use 201 with new resource location.

| Method/path | Request/query | Expected success | Negative/exception |
|---|---|---|---|
| `GET /workshops` | approved audience session; optional basic pagination policy OPEN | `200` published summaries only, `data:[{id,title,starts_at,location,capacity,remaining_seats}]` if visibility policy approved | `401` anonymous if deny policy; no DRAFT |
| `GET /workshops/:id` | published ID | `200` allowed detail including registration availability | `404` DRAFT/missing/hidden; no owner-private fields |
| `POST /workshops/:id/registrations` | Participant cookie and CSRF protection if approved; `{}` body (server chooses identity) | `201` `{"data":{"id":"r-1","workshop_id":"w-1","status":"ACTIVE","registered_at":"<ISO>"}}` committed | `401` anonymous; `403` wrong role; `404` unpublished/hidden; `409` duplicate/full/invalid deadline/expired deadline |

**Error taxonomy (proposed):** `DUPLICATE_ACTIVE`, `CAPACITY_FULL`, `INVALID_DEADLINE`, `DEADLINE_PASSED`, `INVALID_STATE`, `UNAUTHENTICATED`, `FORBIDDEN`. `REGISTRATION_CLOSED` is **reserved for F-06 / BR-10**. Avoid revealing registration ownership in public responses. Unknown IDs and private drafts must not be distinguishable to an unauthorized user. If deadline is represented as a nullable timestamp, server must compute eligibility from approved canonical clock, not client input.

## 5. Data and transaction contract (no migration exists)

| Entity/constraint | Candidate schema and expected guard |
|---|---|
| `Workshop` | `id`, `status`, `starts_at`, `registration_deadline?`, `capacity`, `owner_user_id`; published/positive capacity from F-02; any `registration_closed` field/behavior is deferred to F-06 |
| `Registration` | `id PK`, `workshop_id FK`, `participant_user_id FK`, `status` = ACTIVE or CANCELLED, `registered_at`, `cancelled_at?`, `checked_in_at?`; status history policy F-05 |
| Uniqueness | DB-enforced at most one ACTIVE per Participant/Workshop, e.g. PostgreSQL partial unique index `(workshop_id,participant_user_id) WHERE status='ACTIVE'` (only if DB/ORM confirmed) |
| Capacity | Lock workshop row (or proven equivalent), check ACTIVE count < capacity and insert in same transaction; all registration writers must follow same serialization guard |
| Deadline (BR-08) | `effective_deadline = COALESCE(registration_deadline,starts_at)` is **proposed**; reject configuration `registration_deadline > starts_at`; no implicit value after start; DEC-04 approval required |
| Eligibility (BR-07) | Independently reject `now >= effective_deadline` (proposed inclusive boundary, DEC-04 pending) for an otherwise valid PUBLISHED workshop with free capacity |

**Proposed transaction pseudocode (not executable SQL):**

`BEGIN; LOCK workshop; CHECK (published, BR-08 valid configured/default deadline, BR-07 time eligibility, role); CHECK active_count < capacity; INSERT ACTIVE guarded by active-only unique constraint; COMMIT;`

On constraint conflict rollback and return safe 409; never promise a seat based solely on list view. Seed ten **distinct** Participants and workshop with exactly one remaining seat for the race test; validate DB postcondition. Migrations belong to implementation Issue #5 and cannot be assumed present.

## 6. Observable Acceptance Criteria (AC)

| AC ID | Outcome / source |
|---|---|
| **AC-F03-01** | Approved audience sees only PUBLISHED workshops and approved summary fields; foreign DRAFT cannot appear or be opened (FR-06, BR-04/01). |
| **AC-F03-02** | Allowed Participant reads published detail including eligible seat information and safe empty/loading/error states (FR-06). |
| **AC-F03-03** | Eligible Participant registers once to published workshop below capacity; committed ACTIVE row links to session Participant, persists and returns ID/status (FR-07, NFR-02). |
| **AC-F03-04** | Duplicate ACTIVE registration for same Participant+Workshop is rejected even for simultaneous attempts; one ACTIVE DB row remains (BR-05). |
| **AC-F03-05** | Full capacity rejects additional registration with no row added (BR-06). |
| **AC-F03-06** | Ten distinct Participant requests race for exactly one seat; exactly one commits; no overbooking; nine fail clearly (BR-06, NFR-03 provisional target). |
| **AC-F03-07** | DRAFT/unpublished workshop rejects registration without creating registration or disclosing owner-private content (BR-04). |
| **AC-F03-08** | **BR-07 independently:** for a PUBLISHED workshop with available capacity and a **valid configured deadline earlier than start**, register before deadline is permitted; **at/after** that effective deadline a new registration is rejected with no row added. Manual closure is **not part of this fixture** (Sprint 2 BR-10); proposed equality rule still requires DEC-04 approval. |
| **AC-F03-09** | Anonymous/Organizer registration is denied; forged user/status/owner fields cannot reassign or bypass authorization (BR-01, NFR-01). |
| **AC-F03-10** | Registration and availability remain correct when app process restarts and persisted records are re-read from DB (NFR-02). |
| **AC-F03-11** | Invalid/missing workshop ID safely fails; UI conveys domain conflict and does not report false successful registration (FR-07). |
| **AC-F03-12** | **BR-08 default independently:** when `registration_deadline` is absent, effective deadline equals workshop start; with the same otherwise valid PUBLISHED/capacity fixture, before-start registration is eligible and registration **at/after start** is rejected (proposed DEC-04 boundary). |
| **AC-F03-13** | **BR-08 configured-deadline validation independently:** attempting to configure a deadline **after workshop start** is rejected on the authorized create/publish path with no invalid publication; a deliberately invalid persisted test fixture must not permit registration. This does not depend on manual closure (DEC-04/DEC-03 approval pending). |

## 7. Software Test Specification (STS): PLANNED / NOT EXECUTED

| TEST ID | AC | Level | Preconditions → inputs/action → expected |
|---|---|---|---|
| **STS-F03-01** | AC-F03-01 | API+DB | Seed PUBLISHED W1 and private DRAFT W2 → listing/detail excludes W2, only allowed data |
| **STS-F03-02** | AC-F03-02 | UI/E2E | Approved Participant on published list/detail → visible details and controlled empty/loading/error |
| **STS-F03-03** | AC-F03-03 | API+DB | Seed eligible W1 capacity 2, Participant A → POST registration → 201 ACTIVE, DB owner A |
| **STS-F03-04** | AC-F03-04 | API+DB concurrency | Participant A submits two concurrent requests → only one ACTIVE record, second rejected |
| **STS-F03-05** | AC-F03-05 | API+DB boundary | Capacity 1, one ACTIVE registered → other Participant POST → 409, count remains 1 |
| **STS-F03-06** | AC-F03-06 | Real DB concurrency | Capacity 1, no ACTIVE, **10 different** seeded Participants behind a start barrier → 1 success, 9 rejected, ACTIVE count=1 and no duplicate committed |
| **STS-F03-07** | AC-F03-07 | API+DB security | Attempt registration on owned or foreign DRAFT → 404/409 safe rejection, DB unchanged |
| **STS-F03-08** | AC-F03-08 | API+DB clock boundary | PUBLISHED workshop, capacity available, valid configured deadline = start minus one hour; fixed clock just before/at/after configured deadline → before eligible, at/after 409 with no new ACTIVE row; **hold manual closure out of fixture**, DEC-04 equality pending |
| **STS-F03-09** | AC-F03-09 | API+DB negative | Anonymous, Organizer, forged participant ID/status → denied or ignored safely; identity always from session |
| **STS-F03-10** | AC-F03-10 | Integration | Commit valid ACTIVE, restart app, GET persisted state/count → unchanged |
| **STS-F03-11** | AC-F03-11 | UI+API | Unknown ID and capacity race conflict → safe error, no success toast, user can refresh |
| **STS-F03-12** | AC-F03-12 | API+DB default boundary | PUBLISHED workshop, `registration_deadline=NULL`, available capacity; fixed clock before/at/after `starts_at` → before eligible, at/after 409 and unchanged DB count; proves default=starts_at independently, DEC-04 pending |
| **STS-F03-13** | AC-F03-13 | API+DB validation | Authorized Organizer setup/create/publish attempt with `registration_deadline = starts_at + 1 minute` → validation rejection, no PUBLISHED invalid state; inject invalid fixture to registration path → no ACTIVE inserted; no manual-closure flag, DEC-03/04 pending |

**Evidence needed when implemented:** actual DB dialect and concurrency mechanism, deterministic seeds, truly overlapping 10 requests, lock/isolation proof, test file/name, RED→GREEN, build/test output, pass/fail counts, reviewed SHA. No current implementation/test/CI claim.

## 8. Feature Definition of Done — NOT MET

- [ ] Approved baseline, F-03 contract and DEC-03/04/10/11 decisions; proven real DB atomic strategy.
- [ ] Published-only UI + backend API + durable DB/transaction with active uniqueness and capacity safety; no mock-only success.
- [ ] AC-F03-01–13 ↔ STS-F03-01–13 tested, including independent BR-07 boundary, BR-08 default/invalid-config scenarios, 10-distinct-user concurrency and auth negatives; no required failures.
- [ ] Versioned migrations/seed/reproduction, actual tests/commit SHA, teammate review, staging merge and post-merge checks.

**Change record:** v0.1, 2026-11-03, P1-02 PRE-IMPLEMENTATION DRAFT only; author `cottonlnwza`, proposed reviewer `thananun-7203`; **NOT APPROVED / OPEN DECISIONS**.

**v0.1.1 (2026-11-03), Reviewer R-01 correction:** split BR-07 time eligibility from BR-08 default/configured deadline and add AC/STS-F03-12/13. Explicitly defer manual closure BR-10 to F-05/F-06 in Sprint 2. All tests remain **PLANNED / NOT EXECUTED**; DEC-04 still OPEN.
