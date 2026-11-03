# F-02 — Organizer Workshop Draft and Publication

> **DRAFT v0.1 — NOT APPROVED — 2026-11-03** · P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Implementation [Issue #4](https://github.com/cottonlnwza/TTworkshop/issues/4) · Sprint 1
> Source: `docs/srs.md` DRAFT v0.1.1 FR-03/04/05, BR-01/02/03/04, NFR-01/02; `docs/features.md` F-02; `docs/system-sds.md` sections 3–7. **All methods, fields and UI below are proposed until approval.**

## 1. Goal, prerequisites, boundaries

An authenticated Organizer creates and retrieves a workshop DRAFT owned by their server session, publishes an eligible draft with positive capacity and chronologically valid times, and views only owned workshops. A Participant cannot create/publish. This feature does not implement broad edit-after-publish, manual close/reopen, cancellation, check-in or reporting.

**Depends:** F-01 identity/role; approved DEC-02 title/location/time/capacity field policy, DEC-03 incomplete DRAFT policy, DEC-04 datetime/timezone, DEC-10 DB/stack; System SDS ARCH-03/04. **OPEN:** required draft fields and field-length limits, local-vs-UTC time serialization, publication-time date constraints, whether all required fields must exist on draft create. UI/API examples below assume fields can be completed before publishing, not that this is approved.

## 2. Feature SDS — workflow/invariants

1. Organizer opens `/organizer/workshops`, views *own* drafts/published records and starts a new draft.
2. Backend creates a DRAFT with `owner_user_id` from the authenticated Organizer; ignore/reject any client owner/status overrides. Missing draft fields behavior depends on DEC-03.
3. Owner retrieves own DRAFT and sends an explicit publish transition. Backend checks required fields (once approved), `ends_at > starts_at` (BR-02), published `capacity` is a positive integer (BR-03), legal state transition and ownership (BR-01/04).
4. Successful publication persists `PUBLISHED`; only eligible published records become visible to F-03 discovery. Re-publish, publish of invalid draft, cross-owner read or publish, and Participant mutation are rejected without modifying DB.
5. Ownership policy hides foreign private Drafts and avoids leaking foreign identifiers via distinguishable responses.

## 3. UI contract (proposed)

| Screen/state | Behavior |
|---|---|
| `/organizer/workshops` | Own workshop list with DRAFT/PUBLISHED labels; pending/empty/error states; no foreign drafts |
| `/organizer/workshops/new` | Labeled fields: title, description, location, start/end time, capacity; client guidance but server always validates |
| `/organizer/workshops/:id` | Owner-only detail and explicit Publish action for eligible DRAFT; disabling button does not replace server check |
| Publish confirmation/error | On persisted success show PUBLISHED; invalid time/zero capacity/missing required fields display safe actionable feedback without changing state |

Do not add generic workshop editing after publication in F-02. The exact form validation limits and time zone conversion remain pending DEC-02/03/04.

## 4. Proposed API contracts

Base `/api/v1`; `{"data": ...}` success, `{"error":{"code":"...","message":"..."}}` failure. Owner from F-01 session, never request body. Proposed illustration below is **not an implemented endpoint**.

| Method/path | Request / query | Expected success | Negative/boundary responses |
|---|---|---|---|
| `POST /workshops` | `{"title":"Intro to Testing","description":"...","location":"Room A","starts_at":"<approved ISO time>","ends_at":"<approved ISO time>","capacity":2}`; whether nullable fields allowed OPEN | `201` with `data:{id,owner,status:"DRAFT",...}` persisted | `400` bad types; `401` anonymous; `403` Participant |
| `GET /organizer/workshops` | own Organizer session | `200` list of only owned workshop summaries | `401`/`403`; never return others' DRAFT |
| `GET /organizer/workshops/:id` | session, workshop ID | `200` own workshop detail | `404` foreign/missing; no private data |
| `POST /organizer/workshops/:id/publish` | explicit transition, no owner/status input | `200` updated `PUBLISHED` persisted and retrievable | `400` missing fields / invalid times/capacity; `404` foreign/missing; `409` already published |

**DTO shape proposal:** `Workshop{id,owner_user_id,title,description,location,starts_at,ends_at,capacity,status,registration_deadline?,registration_closed?}`; private owner field returned only when authorized; no synthetic data leaks. Error code taxonomy: `VALIDATION`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`. Exact 400/422 choice and DTO constraints require sign-off.

## 5. Data contract (candidate; no schema/migration created)

`Workshop` candidate columns: `id PK`, `owner_user_id FK→User`, `title`, `description`, `location`, `starts_at`, `ends_at`, `capacity integer`, `status DRAFT/PUBLISHED`, optional `registration_deadline`, `registration_closed boolean` and timestamps. Persist DRAFT and PUBLISHED in DB; no client-assigned ownership. DB constraint/transaction must protect publication invariants (valid order, positive published capacity, authorized single transition). Nullable draft-field strategy **must await DEC-03**. Migration and deterministic seed implementation belong to Issue #4; publication should not generate registrations.

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

**Execution evidence:** commit, migration/seed version, test filename, RED→GREEN where applicable, command, outcome and PR review required in Issue #4. All STS **NOT IMPLEMENTED / NOT EXECUTED**.

## 8. Definition of Done — NOT MET

- [ ] Formal baseline, F-02 contract and DEC-02/03/04/10 decisions approved before writing code.
- [ ] UI/API/relational DB implemented; proper owner enforcement, publication-time constraints and durable retrieval.
- [ ] AC-F02-01–09 / STS-F02-01–09 executed with real DB and negative access/boundary assertions, no mandatory failures.
- [ ] Local build/test result/SHA, diff, reviewer approval, staging merge and independent verification recorded; only synthetic test data.

**Change record:** v0.1, 2026-11-03, initial P1-02 PRE-IMPLEMENTATION DRAFT; author `cottonlnwza`, proposed reviewer `thananun-7203`; **PENDING PEER REVIEW + FORMAL CONTRACT/BASELINE APPROVAL**.
