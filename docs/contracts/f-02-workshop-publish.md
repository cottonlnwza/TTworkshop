# F-02 — Organizer Workshop Draft and Publication

> **DRAFT v0.1.1 — NOT APPROVED — 2026-11-03** · P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Implementation [Issue #4](https://github.com/cottonlnwza/TTworkshop/issues/4) · Sprint 1
> Source: `docs/srs.md` DRAFT v0.1.3 FR-03/04/05, BR-01/02/03/04/**08**, NFR-01/02; `docs/features.md` F-02; `docs/system-sds.md` sections 3–7. **All methods, fields and UI below are proposed until approval.**

## 1. Goal, prerequisites, boundaries

An authenticated Organizer creates and retrieves a workshop DRAFT owned by their server session, publishes an eligible draft with positive capacity and chronologically valid times, and views only owned workshops. A Participant cannot create/publish. This feature does not implement broad edit-after-publish, manual close/reopen, cancellation, check-in or reporting.

**Depends:** F-01 identity/role and **future formal approval** of DEC-02 title/location/time/capacity field policy, DEC-03 incomplete DRAFT policy, DEC-04 datetime/timezone/equality boundary, DEC-10 DB/stack; System SDS ARCH-03/04. **DEC-02/03/04/10 remain NOT APPROVED / OPEN or PENDING**, so the examples below are provisional. **OPEN:** required draft fields and field-length limits, local-vs-UTC time serialization, whether all required fields must exist on draft create. The proposed BR-08 invariant applies whenever both `registration_deadline` and `starts_at` are provided, regardless of whether other DRAFT fields may be omitted.

## 2. Feature SDS — workflow/invariants

1. Organizer opens `/organizer/workshops`, views *own* drafts/published records and starts a new draft.
2. Backend creates a DRAFT with `owner_user_id` from the authenticated Organizer; ignore/reject any client owner/status overrides. Missing draft fields behavior depends on DEC-03. **F-02 owns BR-08 validation at Create**: a supplied `registration_deadline > starts_at` is rejected without persisting an invalid Draft. An absent optional deadline is not an invalid configured deadline.
3. Owner retrieves own DRAFT and sends an explicit publish transition. Backend checks required fields (once approved), `ends_at > starts_at` (BR-02), published `capacity` is a positive integer (BR-03), **`registration_deadline <= starts_at` if configured (BR-08)**, legal state transition and ownership (BR-01/04). **F-02 owns BR-08 re-validation at Publish** even if a pre-existing Draft contains invalid persisted data; block publication without modifying status.
4. Successful publication persists `PUBLISHED`; only eligible published records become visible to F-03 discovery. Re-publish, publish of invalid draft, cross-owner read or publish, and Participant mutation are rejected without modifying DB.
5. Ownership policy hides foreign private Drafts and avoids leaking foreign identifiers via distinguishable responses.

**Cross-feature handoff:** F-02 is accountable for **write-side Create/Publish BR-08 validation**; F-03 must independently **fail closed at Registration** if it encounters a malformed persisted `PUBLISHED` workshop (defense in depth), and handles effective-deadline eligibility under BR-07/08. F-06 may introduce deadline editing in Sprint 2 with its own later contract. This allocates responsibility but **does not approve DEC-04**, the stack or product baseline.

## 3. UI contract (proposed)

| Screen/state | Behavior |
|---|---|
| `/organizer/workshops` | Own workshop list with DRAFT/PUBLISHED labels; pending/empty/error states; no foreign drafts |
| `/organizer/workshops/new` | Labeled fields: title, description, location, start/end time, capacity and optional configured registration deadline; show safe validation error if configured deadline is after start (DEC-04 still OPEN) |
| `/organizer/workshops/:id` | Owner-only detail and explicit Publish action for eligible DRAFT; disabling button does not replace server check |
| Publish confirmation/error | On persisted success show PUBLISHED; invalid time/zero capacity/missing required fields/**configured deadline after start** display safe actionable feedback without changing state |

Do not add generic workshop editing after publication in F-02. The exact form validation limits and time zone conversion remain pending DEC-02/03/04.

## 4. Proposed API contracts

Base `/api/v1`; `{"data": ...}` success, `{"error":{"code":"...","message":"..."}}` failure. Owner from F-01 session, never request body. Proposed illustration below is **not an implemented endpoint**.

| Method/path | Request / query | Expected success | Negative/boundary responses |
|---|---|---|---|
| `POST /workshops` | `{"title":"Intro to Testing","description":"...","location":"Room A","starts_at":"<proposed ISO time>","ends_at":"<proposed ISO time>","capacity":2,"registration_deadline":"<optional proposed ISO time>"}`; partial draft/nullability still OPEN | `201` with `data:{id,owner,status:"DRAFT",...}` persisted on valid input | `400 VALIDATION` if supplied deadline > start (BR-08), bad types; `401` anonymous; `403` Participant |
| `GET /organizer/workshops` | own Organizer session | `200` list of only owned workshop summaries | `401`/`403`; never return others' DRAFT |
| `GET /organizer/workshops/:id` | session, workshop ID | `200` own workshop detail | `404` foreign/missing; no private data |
| `POST /organizer/workshops/:id/publish` | explicit transition, no owner/status input; validates persisted optional deadline (BR-08) | `200` updated `PUBLISHED` persisted and retrievable | `400 VALIDATION` if persisted deadline > start, missing fields / invalid times/capacity; `404` foreign/missing; `409` already published |

**DTO shape proposal:** `Workshop{id,owner_user_id,title,description,location,starts_at,ends_at,capacity,status,registration_deadline?,registration_closed?}`; private owner field returned only when authorized; no synthetic data leaks. Error code taxonomy: `VALIDATION`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`. Exact 400/422 choice and DTO constraints require sign-off.

## 5. Data contract (candidate; no schema/migration created)

`Workshop` candidate columns: `id PK`, `owner_user_id FK→User`, `title`, `description`, `location`, `starts_at`, `ends_at`, `capacity integer`, `status DRAFT/PUBLISHED`, optional `registration_deadline`, `registration_closed boolean` (future F-06 behavior) and timestamps. Persist DRAFT and PUBLISHED in DB; no client-assigned ownership. DB constraint/transaction must protect publication invariants (valid order, positive published capacity, **configured deadline not after start**, authorized single transition). **If configured deadline is present when start is known, F-02 rejects an invalid Create; F-02 validates again on Publish.** If no configured deadline, the proposed effective default is `starts_at` when F-03 checks registration eligibility. Nullable draft-field strategy **must await DEC-03**; clock/timezone semantics await DEC-04. Migration and deterministic seed implementation belong to Issue #4; publication should not generate registrations.

## 6. Observable acceptance criteria

| AC ID | Observable outcome / requirement |
|---|---|
| **AC-F02-01** | Authenticated Organizer creates a DRAFT with persisted session-derived owner and can retrieve it after a DB read (FR-03, BR-01/04, NFR-02). |
| **AC-F02-02** | Organizer lists own DRAFT/PUBLISHED workshops; another Organizer's private DRAFT is absent and inaccessible (FR-05, BR-01/04). |
| **AC-F02-03** | Eligible owner DRAFT with approved mandatory fields, ordered times and positive capacity publishes once; PUBLISHED state persists (FR-04, BR-02/03/04). |
| **AC-F02-04** | Publish with end≤start fails with no persisted status change (BR-02). |
| **AC-F02-05** | Publish with zero/negative/non-integer capacity fails with no persisted status change (BR-03). |
| **AC-F02-06** | Participant/anonymous create or publish and foreign Organizer read/publish fail without disclosure or mutation (BR-01/04, NFR-01). |
| **AC-F02-07** | Second publish of PUBLISHED is rejected without duplicate transition or records (BR-04). |
| **AC-F02-08** | Missing agreed required publication field fails, with safe UI/API error and unchanged DRAFT; exact missing draft fields depend on DEC-03 (FR-04). |
| **AC-F02-09** | Restart of the application retains a created/published workshop and ownership from durable DB (NFR-02). |
| **AC-F02-10** | **BR-08, Create owner:** when Organizer submits a DRAFT Create with `starts_at` and explicit `registration_deadline > starts_at`, the server rejects the configuration before writing a Draft (no invalid row), independently of Publish/Registration; valid absent/earlier configured deadline follows the agreed DRAFT policy (**DEC-03/04 pending**). |
| **AC-F02-11** | **BR-08, Publish owner:** when an existing owned DRAFT has `registration_deadline > starts_at`, the Publish transition rejects it with unchanged DRAFT status and no PUBLISHED row, independently of Create rejection; no success message (**DEC-04 pending**). |

## 7. Software Test Specification — PLANNED, NOT EXECUTED

| TEST ID | AC | Level | Preconditions / input → action → expected |
|---|---|---|---|
| **STS-F02-01** | AC-F02-01 | API+DB | Seed Organizer A; POST DRAFT with forged owner B → persisted owner A and own GET succeeds |
| **STS-F02-02** | AC-F02-02 | API+DB security | Seed A/B and private Draft B → A list excludes B; direct GET B hidden |
| **STS-F02-03** | AC-F02-03 | API+DB | Eligible DRAFT, capacity 2, end>start → publish → one persisted PUBLISHED row |
| **STS-F02-04** | AC-F02-04 | API+DB boundary | Draft start=end and end<start → publish rejected; status still DRAFT |
| **STS-F02-05** | AC-F02-05 | API+DB boundary | Capacity 0, -1, 1.5, string → publish rejected; DB unchanged |
| **STS-F02-06** | AC-F02-06 | API+DB security | Anonymous/Participant create; foreign Organizer publish/read → denied, row count/status unchanged |
| **STS-F02-07** | AC-F02-07 | API+DB negative | Publish same record twice → second 409; one workshop, no state duplication |
| **STS-F02-08** | AC-F02-08 | UI+API | Draft lacks approved required field → publish fails with visible error, unchanged status; test must be finalized once DEC-03 approved |
| **STS-F02-09** | AC-F02-09 | Integration | Create/publish in local durable DB → app restart → owner GET returns same status/ID |
| **STS-F02-10** | AC-F02-10 | API+DB validation | Authorized Organizer, `starts_at=T`, supplied `registration_deadline=T+1min`, otherwise valid Create payload → `400 VALIDATION`, zero Draft rows persisted; control with `deadline<=T` / absent value assessed against approved DEC-03/04 policy |
| **STS-F02-11** | AC-F02-11 | API+DB transition negative | Seed pre-existing **DRAFT** owned by Organizer with persisted `registration_deadline=T+1min`, `starts_at=T`, other Publish fields valid → owner Publish rejects `400 VALIDATION`, status remains DRAFT, no PUBLISHED state; test uses seeded invalid Draft independently of Create |

**Execution evidence:** commit, migration/seed version, test filename, RED→GREEN where applicable, command, outcome and PR review required in Issue #4. All STS **NOT IMPLEMENTED / NOT EXECUTED**.

## 8. Definition of Done — NOT MET

- [ ] Formal baseline, F-02 contract and DEC-02/03/04/10 decisions approved before writing code.
- [ ] UI/API/relational DB implemented; proper owner enforcement, publication-time constraints and durable retrieval.
- [ ] AC-F02-01–11 / STS-F02-01–11 executed with real DB and negative access/boundary assertions including independent BR-08 Create vs Publish tests, no mandatory failures.
- [ ] Local build/test result/SHA, diff, reviewer approval, staging merge and independent verification recorded; only synthetic test data.

**Change record:** v0.1, 2026-11-03, initial P1-02 PRE-IMPLEMENTATION DRAFT; author `cottonlnwza`, proposed reviewer `thananun-7203`; **PENDING PEER REVIEW + FORMAL CONTRACT/BASELINE APPROVAL**.

**v0.1.1 (2026-11-03), Reviewer R-03 correction:** assign BR-08 Create and Publish validation ownership to F-02 and add separate AC-F02-10/11 with STS-F02-10/11; F-03 retains read-path fail-closed guard. **NOT APPROVED; NOT EXECUTED; DEC-03/04/10 still pending.**
