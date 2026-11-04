# F-02 — Organizer Workshop Draft and Publication

> **F-02 scoped working contract v0.1.4 — PR #10 reviewed/merged/Author-verified; global baseline DRAFT** · 2026-11-05 [Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11) · historical docs [Issue #4](https://github.com/cottonlnwza/TTworkshop/issues/4) / [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) · **Remaining implementation [Issue #12](https://github.com/cottonlnwza/TTworkshop/issues/12)**
> Source: `docs/srs.md` global DRAFT FR-03/04/05, BR-01/02/03/04/**08**, NFR-01/02; `docs/features.md` F-02; `docs/system-sds.md` global DRAFT; DEC-02/03/04/10-F02. PR #10's Reviewer explicitly conditioned **F-02 scoped working-choice acceptance** on merge and Author verification; both occurred. This is not an approved **full-product** baseline or an implementation/test result. [Evidence](../decisions/p1-ex01-working-acceptance-ledger.md).

## 1. Goal, prerequisites, boundaries

An authenticated Organizer creates and retrieves a workshop DRAFT owned by their server session, publishes an eligible draft with positive capacity and chronologically valid times, and views only owned workshops. A Participant cannot create/publish. This feature does not implement broad edit-after-publish, manual close/reopen, cancellation, check-in or reporting.

**Depends:** F-01 identity/role, F-02 **scoped peer-accepted** DEC-02/03/04/10-F02 choices and System SDS ARCH-03/04. The related choices were reviewed and merged in PR #10; **F-02 implementation has not started**. DEC-02 specifies title, description, location, `starts_at`, `ends_at`, positive integer `capacity`, and optional `registration_deadline`; no field-length limits are invented. DEC-03 specifies incomplete DRAFT creation, owner-only partial updates while status is DRAFT, and complete-field validation at Publish. DEC-04 specifies explicit-offset ISO 8601 API timestamps, UTC instants in `timestamptz`, configured university timezone for UI, absent-deadline default to start, and closed-at-equality semantics. Deployment timezone identifier remains configuration.

## 2. Feature SDS — workflow/invariants

1. Organizer opens `/organizer/workshops`, views *own* drafts/published records and starts a new draft.
2. Backend creates a DRAFT with `owner_user_id` from the authenticated Organizer; ignore/reject any client owner/status overrides. Under proposed DEC-03, any DEC-02 field may be omitted at Create. Validate the type/shape of supplied values. **F-02 owns BR-08 validation at Create**: if both `registration_deadline` and `starts_at` are supplied, a deadline later than start is rejected before persisting the Draft. An absent optional deadline is valid.
3. Owner may update an existing owned DRAFT through a partial update. Only DEC-02 fields are writable; server-managed ID, owner and status are immutable. Validate supplied values and the merged resulting record; reject foreign-owner/Participant updates and all updates after PUBLISHED without mutation.
4. Owner retrieves own DRAFT and sends an explicit publish transition. Backend requires `title`, `description`, `location`, `starts_at`, `ends_at`, and positive integer `capacity`; checks `ends_at > starts_at` (BR-02), **`registration_deadline <= starts_at` if configured (BR-08)**, legal state transition and ownership (BR-01/04). **F-02 owns BR-08 re-validation at Publish** even if a pre-existing Draft contains invalid persisted data; block publication without modifying status.
5. Successful publication persists `PUBLISHED`; only eligible published records become visible to F-03 discovery. Re-publish, publish of invalid draft, cross-owner read or publish, and Participant mutation are rejected without modifying DB.
6. Ownership policy hides foreign private Drafts and avoids leaking foreign identifiers via distinguishable responses.

**Cross-feature handoff:** F-02 is accountable for **write-side Create/Publish BR-08 validation**; F-03 must independently **fail closed at Registration** if it encounters a malformed persisted `PUBLISHED` workshop (defense in depth), and handles effective-deadline eligibility under BR-07/08. F-06 may introduce deadline editing in Sprint 2 with its own later contract. This allocates responsibility but **does not approve DEC-04**, the stack or product baseline.

## 3. UI contract (proposed)

| Screen/state | Behavior |
|---|---|
| `/organizer/workshops` | Own workshop list with DRAFT/PUBLISHED labels; pending/empty/error states; no foreign drafts |
| `/organizer/workshops/new` | Labeled fields: title, description, location, start/end time, capacity and optional configured registration deadline; allow saving a partial DRAFT; validate supplied types and reject a supplied deadline later than a supplied start |
| `/organizer/workshops/:id` | Owner-only detail; allow editing fields on an owned DRAFT and saving changes to that same record; explicit Publish action for eligible DRAFT; no edit controls for PUBLISHED records in this F-02 scope |
| Publish confirmation/error | On persisted success show PUBLISHED; invalid time/zero capacity/missing required fields/**configured deadline after start** display safe actionable feedback without changing state |

Do not add generic workshop editing after publication in F-02. Field-length limits remain unspecified. Parse/display date-times using the configured university timezone; API timestamps carry explicit offsets. These DEC-02/03/04 choices are **accepted for F-02 scoped working use** after PR #10 review/merge/Author verification; no executable UI is claimed here.

## 4. Proposed API contracts

Base `/api/v1`; `{"data": ...}` success, `{"error":{"code":"...","message":"..."}}` failure. Owner from F-01 session, never request body. Proposed illustration below is **not an implemented endpoint**.

| Method/path | Request / query | Expected success | Negative/boundary responses |
|---|---|---|---|
| `POST /workshops` | Partial payload allowed; any supplied date-time must be ISO 8601 with explicit offset. Example fields: `title`, `description`, `location`, `starts_at`, `ends_at`, `capacity`, optional `registration_deadline` | `201` with `data:{id,owner,status:"DRAFT",...}` persisted, including an incomplete DRAFT | `400 VALIDATION` for invalid supplied types/date-times or configured deadline > supplied start (BR-08); `401` anonymous; `403` Participant |
| `PATCH /organizer/workshops/:id` | Partial set of DEC-02 fields only; no `id`, `owner_user_id`, `status`, or server-managed fields | `200` with updated fields on the same owned DRAFT; status remains `DRAFT` | `400 VALIDATION` invalid supplied/merged values; `404` foreign/missing; `401` anonymous; `403` Participant; `409 INVALID_STATE` if not DRAFT |
| `GET /organizer/workshops` | own Organizer session | `200` list of only owned workshop summaries | `401`/`403`; never return others' DRAFT |
| `GET /organizer/workshops/:id` | session, workshop ID | `200` own workshop detail | `404` foreign/missing; no private data |
| `POST /organizer/workshops/:id/publish` | explicit transition, no owner/status input; validates persisted optional deadline (BR-08) | `200` updated `PUBLISHED` persisted and retrievable | `400 VALIDATION` if persisted deadline > start, missing fields / invalid times/capacity; `404` foreign/missing; `409` already published |

**DTO shape proposal:** `Workshop{id,owner_user_id,title,description,location,starts_at,ends_at,capacity,status,registration_deadline?,registration_closed?}`; private owner field returned only when authorized; no synthetic data leaks. Error code taxonomy: `VALIDATION`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`. Exact 400/422 choice and DTO constraints require sign-off.

## 5. Data contract (candidate; no schema/migration created)

`Workshop` candidate columns: `id PK`, `owner_user_id FK→User`, nullable-during-DRAFT `title`, `description`, `location`, `starts_at`, `ends_at`, `capacity integer`, `status DRAFT/PUBLISHED`, optional `registration_deadline`, `registration_closed boolean` (future F-06 behavior) and timestamps. Persist DRAFT and PUBLISHED in DB; no client-assigned ownership. DB constraint/transaction must protect publication invariants (valid order, positive published capacity, **configured deadline not after start**, authorized single transition). If both configured deadline and start are supplied at Create, F-02 rejects an invalid configuration before insert; F-02 validates again on Publish. API date-times use explicit-offset ISO 8601 and are stored as UTC instants in PostgreSQL `timestamptz`; UI uses configured university timezone. An absent deadline has effective value `starts_at`; registration is closed when `now >= effective_deadline`. **F-02 scoped rules were peer-accepted in PR #10; the schema and behaviors still require implementation.** Migration and deterministic seed implementation belong to **Issue #12**, not a second PR for historical Issue #4; publication should not generate registrations.

## 6. Observable acceptance criteria

| AC ID | Observable outcome / requirement |
|---|---|
| **AC-F02-01** | Authenticated Organizer creates and retrieves a persisted DRAFT with session-derived owner; the DRAFT may omit any DEC-02 publication field (DEC-03 proposal) (FR-03, BR-01/04, NFR-02). |
| **AC-F02-02** | Organizer lists own DRAFT/PUBLISHED workshops; another Organizer's private DRAFT is absent and inaccessible (FR-05, BR-01/04). |
| **AC-F02-03** | Eligible owner DRAFT with approved mandatory fields, ordered times and positive capacity publishes once; PUBLISHED state persists (FR-04, BR-02/03/04). |
| **AC-F02-04** | Publish with end≤start fails with no persisted status change (BR-02). |
| **AC-F02-05** | Publish with zero/negative/non-integer capacity fails with no persisted status change (BR-03). |
| **AC-F02-06** | Participant/anonymous create or publish and foreign Organizer read/publish fail without disclosure or mutation (BR-01/04, NFR-01). |
| **AC-F02-07** | Second publish of PUBLISHED is rejected without duplicate transition or records (BR-04). |
| **AC-F02-08** | An incomplete DRAFT can be created/saved, but Publish with any missing required field (`title`, `description`, `location`, `starts_at`, `ends_at`, `capacity`) fails with a safe UI/API validation error and leaves status `DRAFT` (DEC-02/03 proposal, FR-04). |
| **AC-F02-09** | Restart of the application retains a created/published workshop and ownership from durable DB (NFR-02). |
| **AC-F02-10** | **BR-08, Create owner:** when Organizer submits a DRAFT Create with `starts_at` and explicit `registration_deadline > starts_at`, the server rejects the configuration before writing a Draft (no invalid row), independently of Publish/Registration; valid absent/earlier configured deadline follows the agreed DRAFT policy (**DEC-03/04 pending**). |
| **AC-F02-11** | **BR-08, Publish owner:** when an existing owned DRAFT has `registration_deadline > starts_at`, the Publish transition rejects it with unchanged DRAFT status and no PUBLISHED row, independently of Create rejection; no success message (**DEC-04 pending**). |
| **AC-F02-12** | Organizer can complete a previously persisted partial DRAFT by updating the same owned record and then publishing it; updates accept only DEC-02 fields, preserve server-derived owner/status, reject Participant and foreign-Organizer updates, reject invalid merged field combinations without mutation, and reject updates after publication (DEC-03 proposal, FR-03/04, BR-01/04). |

## 7. Software Test Specification — PLANNED, NOT EXECUTED

| TEST ID | AC | Level | Preconditions / input → action → expected |
|---|---|---|---|
| **STS-F02-01** | AC-F02-01 | API+DB | Seed Organizer A; POST partial DRAFT (e.g. title only) with forged owner B → `201`, persisted owner A/status DRAFT, omitted fields remain absent, and own GET succeeds |
| **STS-F02-02** | AC-F02-02 | API+DB security | Seed A/B and private Draft B → A list excludes B; direct GET B hidden |
| **STS-F02-03** | AC-F02-03 | API+DB | Eligible DRAFT, capacity 2, end>start → publish → one persisted PUBLISHED row |
| **STS-F02-04** | AC-F02-04 | API+DB boundary | Draft start=end and end<start → publish rejected; status still DRAFT |
| **STS-F02-05** | AC-F02-05 | API+DB boundary | Capacity 0, -1, 1.5, string → publish rejected; DB unchanged |
| **STS-F02-06** | AC-F02-06 | API+DB security | Anonymous/Participant create; foreign Organizer publish/read → denied, row count/status unchanged |
| **STS-F02-07** | AC-F02-07 | API+DB negative | Publish same record twice → second 409; one workshop, no state duplication |
| **STS-F02-08** | AC-F02-08 | UI+API | Create partial DRAFT, then attempt Publish with each required field missing in turn → safe validation error, persisted status remains DRAFT; complete valid control Draft publishes |
| **STS-F02-09** | AC-F02-09 | Integration | Create/publish in local durable DB → app restart → owner GET returns same status/ID |
| **STS-F02-10** | AC-F02-10 | API+DB validation | Authorized Organizer, `starts_at=T`, supplied `registration_deadline=T+1min`, otherwise valid Create payload → `400 VALIDATION`, zero Draft rows persisted; control with `deadline<=T` / absent value assessed against approved DEC-03/04 policy |
| **STS-F02-11** | AC-F02-11 | API+DB transition negative | Seed pre-existing **DRAFT** owned by Organizer with persisted `registration_deadline=T+1min`, `starts_at=T`, other Publish fields valid → owner Publish rejects `400 VALIDATION`, status remains DRAFT, no PUBLISHED state; test uses seeded invalid Draft independently of Create |
| **STS-F02-12** | AC-F02-12 | UI+API+DB security | Create partial DRAFT as Organizer A → PATCH missing fields on the same ID → verify owner A/status DRAFT and persisted merged fields → Publish succeeds; also verify invalid merged deadline update leaves row unchanged, Participant and Organizer B cannot update A's Draft, client owner/status fields cannot be changed, and PATCH after PUBLISHED is rejected |

**Execution evidence:** commit, migration/seed version, test filename, RED→GREEN where applicable, command, outcome and PR review required in **Issue #12**. All F-02 STS **PLANNED / NOT IMPLEMENTED / NOT EXECUTED**.

## 8. Definition of Done — NOT MET

- [x] The scoped F-02 documentation received substantive teammate review/merge in PR #10 and Author post-merge verification (Issue #4); global/instructor approval claims remain separate.
- [ ] UI/API/relational DB implemented; proper owner enforcement, DRAFT-only update, publication-time constraints and durable retrieval.
- [ ] AC-F02-01–12 / STS-F02-01–12 executed with real DB and negative access/boundary assertions including Create → Update same DRAFT → Publish and independent BR-08 Create vs Publish tests, no mandatory failures.
- [ ] Local build/test result/SHA, diff, reviewer approval, staging merge and independent verification recorded; only synthetic test data.

**Change record:** v0.1, 2026-11-03, initial P1-02 PRE-IMPLEMENTATION DRAFT; author `cottonlnwza`, proposed reviewer `thananun-7203`; **PENDING PEER REVIEW**.

**v0.1.1 (2026-11-03), Reviewer R-03 correction:** assign BR-08 Create and Publish validation ownership to F-02 and add separate AC-F02-10/11 with STS-F02-10/11; F-03 retains read-path fail-closed guard. **NOT APPROVED; NOT EXECUTED; DEC-03/04/10 still pending.**

**v0.1.2 (2026-11-04):** align F-02 contract with proposed DEC-02/03/04/10-F02: partial DRAFT creation, required fields at Publish, explicit-offset API timestamps, UTC `timestamptz`, configured university timezone, deadline default/boundary and F-01 stack reuse. **PENDING PEER REVIEW; NOT APPROVED; STS NOT EXECUTED.**

**v0.1.3 (2026-11-04, Reviewer R-01):** define owner-only `PATCH /organizer/workshops/:id` for existing DRAFT records, editable-field and immutable-field rules, merged-value validation, UI behavior and Create → Update same DRAFT → Publish acceptance/test coverage; add AC-F02-12 and STS-F02-12. **PENDING PEER REVIEW; NOT APPROVED; STS NOT EXECUTED.**

**v0.1.4 (2026-11-05, Issue #11 reconciliation proposal):** Record PR #10's later peer APPROVE + actual merge + Author verification as F-02 **scoped** working-choice acceptance, while full-product baseline remains DRAFT. Future Implementation is Issue #12 (not a second PR for #4); all F-02 STS remain unexecuted. This reconciliation itself awaits peer review.
