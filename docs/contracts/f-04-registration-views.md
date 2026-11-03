# F-04 — Participant Registration Views and Organizer Ownership

> **DRAFT v0.1 — NOT APPROVED — 2026-11-03** · P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Implementation [Issue #6](https://github.com/cottonlnwza/TTworkshop/issues/6) · Sprint 1
> Source: `docs/srs.md` DRAFT v0.1.1 FR-08/09, BR-01/05, NFR-01/02; `docs/features.md` F-04; `docs/system-sds.md` sections 3–7. All screen/endpoint shapes are **PROPOSED and NOT IMPLEMENTED**.

## 1. Purpose, dependencies, boundaries

Authenticated Participant lists and retrieves their own persisted registrations; an Organizer lists registrants **only for workshops owned by that Organizer**. Both views must enforce access control on every read, not only via frontend navigation. No cancellation/change status, check-in, public attendee list, attendance statistics or cross-organizer reporting in F-04.

**Depends on:** F-01 session/backend authorization, F-02 workshop ownership and F-03 persisted ACTIVE registration; DEC-01 role, DEC-10 session/DB, approved privacy/DTO exposure policy. SRS BR-05 links F-04 for viewing the single ACTIVE row, not for implementing the F-03 uniqueness write guard. Cancelled history/presentation is **OPEN DEC-06** and belongs in Sprint 2; don't invent a Sprint 1 cancellation UI.

## 2. Feature SDS — visibility and failure model

1. Participant visits `/my-registrations`. Server determines Participant from authenticated session and returns only rows with their `participant_user_id`; browser cannot supply a substitute owner ID.
2. Participant opens `/my-registrations/:id`. API rechecks row ownership at the database layer or authorized service and returns own persisted status; foreign record IDs are hidden as unavailable, not leaked.
3. Organizer visits `/organizer/workshops/:id/registrations`. Server checks organizer role and `Workshop.owner_user_id = session.user_id`, then returns only registrations for that workshop. Other Organizer's workshop must be inaccessible even if its ID is known.
4. Anonymous access and wrong-role direct URL/API attempts are rejected, including roles spoofed in query/body/headers. Responses should minimize private Participant fields; exact fields and audit-retention policy require team approval.
5. Lists and details survive app restart with the same authoritative DB rows; loading/empty/error states distinguish absent registrations from failed network requests.

**Privacy/response policy proposed:** Participant sees own ID, workshop summary, status and registered timestamp; Organizer sees a bounded registrant roster necessary for workshop operation, not password/email secrets. Whether Organizer can see Participant email/full name is an **OPEN** data-minimization decision; the default example returns opaque participant ID only.

## 3. UI contract (proposed)

| Screen/state | Expected behavior |
|---|---|
| `/my-registrations` | Own persisted rows with workshop title/time and ACTIVE status; loading/empty/expired session/error; no global Participant selector |
| `/my-registrations/:id` | Own registration ID, workshop summary, status and registered time; safe unavailable response for foreign/missing records |
| `/organizer/workshops/:id/registrations` | Owning Organizer roster of workshop registrations; count/list generated from authoritative DB, empty/error feedback |
| Wrong role / unknown private ID | Safe 401/403/404 UI, no private values leaked or stale data shown |

No cancel button that actually mutates status in Sprint 1 (F-05 later). Do not display F-08 check-in status as implemented before it exists.

## 4. Proposed API specification

Base `/api/v1`. All requests require F-01 session and backend record-level permissions. Responses use `{"data":...}` with minimised private values; error `{"error":{"code":"...","message":"..."}}`. These paths/DTOs await approval.

| Method/path | Request | Expected success | Safe negative responses |
|---|---|---|---|
| `GET /me/registrations` | Participant session; no user ID parameter | `200` `{"data":[{"id":"r-1","workshop_id":"w-1","status":"ACTIVE","registered_at":"<ISO>"}]}` for current user only | `401` anonymous, `403` Organizer |
| `GET /me/registrations/:id` | Participant session, registration ID | `200` own persisted row with permitted workshop summary | `404` foreign/missing, `401` anonymous |
| `GET /organizer/workshops/:id/registrations` | Organizer session + own workshop | `200` `{"data":[{"id":"r-1","participant_id":"u-1","status":"ACTIVE","registered_at":"<ISO>"}]}` (private fields still to approve) | `401` anonymous, `403` Participant, `404` foreign/missing workshop |

**Pagination/order:** proposed registration time then stable ID descending, bounded list sizes and any page token to be approved before implementation; no user-supplied `participant_user_id` filtering to access another's records. Use 404 for foreign private IDs to avoid enumeration. A role check on UI alone fails the contract.

## 5. Data contract and queries (no migrations)

Read existing `Registration(id,workshop_id,participant_user_id,status,registered_at,...)` joined to `Workshop(id,owner_user_id,title,starts_at,...)`. For Participant queries, predicate `registration.participant_user_id = authenticated_user_id`. For Organizer roster queries, predicate `workshop.id = requested_id AND workshop.owner_user_id = authenticated_user_id` before loading registrations. Foreign IDs must never authorize a broader JOIN. `Registration.status` is persisted by F-03; Sprint 1 views are read-only. No new data columns or migration required specifically by F-04 unless an approved privacy/design revision requires one.

**Security:** test with Participant A/B and Organizer A/B; check direct API routes and joined data. Do not trust browser query/header-supplied role or Participant ID; no application log containing private roster or credentials.

## 6. Observable Acceptance Criteria (AC)

| AC ID | Outcome / requirements |
|---|---|
| **AC-F04-01** | Participant A lists only A's persisted registrations and correct ACTIVE status; Participant B's rows excluded (FR-08, BR-01). |
| **AC-F04-02** | Participant A retrieves A's registration detail by ID after full DB read and sees persisted status/workshop summary (FR-08, NFR-02). |
| **AC-F04-03** | Participant A cannot read B's registration even knowing its exact ID; no private data leaked (BR-01, NFR-01). |
| **AC-F04-04** | Organizer A lists registrations of own Workshop A and the roster matches persisted registrations (FR-09, BR-01). |
| **AC-F04-05** | Organizer A cannot read registrations for Organizer B's workshop; response does not expose foreign data (FR-09, BR-01, NFR-01). |
| **AC-F04-06** | Anonymous and wrong-role direct API/URL attempts fail with no registration disclosure (BR-01, NFR-01). |
| **AC-F04-07** | All registration views show safe empty/loading/failure states; they never claim a successful mutation or cancellation (FR-08/09). |
| **AC-F04-08** | Previously committed registration still appears to its permitted viewers after app restart using durable DB (NFR-02). |
| **AC-F04-09** | View displays one ACTIVE record per Participant+Workshop as persisted by F-03 and does not duplicate rows due to the join (BR-05). |

## 7. Software Test Specification (STS): PLANNED / NOT EXECUTED

| TEST ID | AC | Level | Preconditions/input → action → expected |
|---|---|---|---|
| **STS-F04-01** | AC-F04-01 | API+DB security | Seed Participants A/B with separate registrations → GET list as A → A only, correct persisted status |
| **STS-F04-02** | AC-F04-02 | API+DB | A owns rA → GET `/me/registrations/rA` → correct status/workshop from DB |
| **STS-F04-03** | AC-F04-03 | API negative | A requests rB (belongs to B) → 404, no B details |
| **STS-F04-04** | AC-F04-04 | API+DB | Organizer A owns W1 with two registrations → GET roster W1 → exactly persisted allowed rows |
| **STS-F04-05** | AC-F04-05 | API negative | Organizer A requests Organizer B's W2 roster → 404, empty private data |
| **STS-F04-06** | AC-F04-06 | API security | Anonymous gets Participant list/Organizer roster; Participant gets roster; Organizer gets Participant list → 401/403 |
| **STS-F04-07** | AC-F04-07 | UI/E2E | No registrations, slow/failing fetch and foreign-ID route → correct empty/spinner/error, no leaked cached details |
| **STS-F04-08** | AC-F04-08 | Integration | Commit ACTIVE registration, restart app, use both authorized views → same ID/status persisted |
| **STS-F04-09** | AC-F04-09 | API+DB | One ACTIVE row in W1 for A → both views return exactly one corresponding row, not multiplied by JOIN |

**Implementation evidence (later Issue #6):** actual DB/seed and tested SHA, test file+assertion, RED→GREEN where meaningful, API/permission results and test counts, reviewer/merge/integration. No tests claimed by these drafts.

## 8. Feature Definition of Done — NOT MET

- [ ] Baseline and F-04 contract approved, upstream F-01/F-02/F-03 data/auth available with approved privacy/DTO fields.
- [ ] UI/API/DB reads work for Participant self and Organizer owner with no foreign disclosure; no mutation, check-in or cancellation.
- [ ] AC-F04-01–09 / STS-F04-01–09 tested, including negative owner/role/anonymous cases, empty/error UI and restart persistence.
- [ ] Actual execution evidence, commit, staging PR teammate approval/merge, integration read-back recorded; no secret/private leaks.

**Change record:** v0.1, 2026-11-03, P1-02 PRE-IMPLEMENTATION DRAFT only; author `cottonlnwza`, proposed reviewer `thananun-7203`; **PENDING PEER REVIEW AND FORMAL CONTRACT/BASELINE APPROVAL**.
