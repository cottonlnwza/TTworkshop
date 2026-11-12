# F-04 — Participant Registration Views and Organizer Ownership

> **DRAFT v0.2.4 — F-04 STAGING INTEGRATED / ISSUE #6 DONE on 2026-11-12; full-product SRS/SDS approval remains separate** · P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Execution [Issue #6](https://github.com/cottonlnwza/TTworkshop/issues/6) · [PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20) · Sprint 1
> Source: `docs/srs.md` DRAFT v0.1.9 FR-08/09, BR-01/05, NFR-01/02; `docs/features.md` F-04; `docs/system-sds.md` sections 3–7. The Issue requester authorized Working Decisions WD-F04-01–04. Independent Reviewer `cottonlnwza` recorded **Approved for Implementation Only — Not Approved for Merge** on exact specification PR HEAD `6c6b0275585c6bc3f44dfbcc37b9bb6c99318316`; the Author verified the distinct reviewer identity and exact SHA. This gate authorized dependent TDD/implementation on the same PR, not Formal APPROVE or Merge. Implementation commit: `24707ab05399536fd0e34c222a026be209683325`. No global SRS/SDS or instructor approval is implied.

## 1. Purpose, dependencies, boundaries

Authenticated Participant lists and retrieves their own persisted registrations; an Organizer lists registrants **only for workshops owned by that Organizer**. Both views must enforce access control on every read, not only via frontend navigation. No cancellation/change status, check-in, public attendee list, attendance statistics or cross-organizer reporting in F-04.

**Depends on:** F-01 session/backend authorization, F-02 workshop ownership and F-03 persisted ACTIVE registration; DEC-01 role, DEC-10 session/DB, approved privacy/DTO exposure policy. SRS BR-05 links F-04 for viewing the single ACTIVE row, not for implementing the F-03 uniqueness write guard. Cancelled history/presentation is **OPEN DEC-06** and belongs in Sprint 2; don't invent a Sprint 1 cancellation UI.

## 2. Feature SDS — visibility and failure model

1. Participant visits `/my-registrations`. Server determines Participant from authenticated session and returns only rows with their `participant_user_id`; browser cannot supply a substitute owner ID.
2. Participant opens `/my-registrations/:id`. API rechecks row ownership at the database layer or authorized service and returns own persisted status; foreign record IDs are hidden as unavailable, not leaked.
3. Organizer visits `/organizer/workshops/:id/registrations`. Server checks organizer role, `Workshop.owner_user_id = session.user_id`, and `Workshop.status = 'PUBLISHED'`, then returns only registrations for that workshop. A foreign, missing or own DRAFT Workshop is unavailable through this roster route even if its ID is known.
4. Anonymous access and wrong-role direct URL/API attempts are rejected, including roles spoofed in query/body/headers. The F-04 roster DTO is deliberately minimized under WD-F04-01; it does not expose Participant email or full name.
5. Lists and details survive app restart with the same authoritative DB rows; loading/empty/error states distinguish absent registrations from failed network requests.

### 2.1 Issue #6 Scoped Working Decisions — specification-first defaults

These four defaults are authorized by the Issue requester for this bounded Issue. They are not global SRS/SDS approval. The Independent Reviewer must inspect this specification on the exact Draft PR HEAD and record **Approved for Implementation Only — Not Approved for Merge** before dependent TDD or implementation begins.

| ID | Decision | F-04 working default |
|---|---|---|
| **WD-F04-01 — Privacy** | Minimize roster identity data | Participant views only their own registration and the minimum Workshop summary (`workshop_id`, `title`, `starts_at`) needed to identify it. Organizer roster returns only `registration_id`, opaque `participant_id`, `status`, and `registered_at`. Do not return Participant email or full name. |
| **WD-F04-02 — Pagination / ordering** | Bound list responses and provide stable continuation | Both list endpoints accept optional `limit` and opaque `cursor`. Default `limit=20`, maximum `50`; invalid/non-integer/out-of-range limits are rejected. Order by `registered_at DESC, id DESC`. Response includes `pagination.next_cursor` (null when complete); do not return a total count. Cursor is only a continuation token, never an identity or authorization input. |
| **WD-F04-03 — API / DTO** | Fix the three read-only routes and response envelopes | `GET /api/v1/me/registrations`; `GET /api/v1/me/registrations/:id`; `GET /api/v1/organizer/workshops/:id/registrations`. Success uses `data`; list responses additionally use `pagination`; errors use `error`. Exact DTOs are specified in §4. |
| **WD-F04-04 — HTTP error semantics** | Consistent privacy-preserving access outcomes | Anonymous `401 UNAUTHENTICATED`; authenticated wrong role `403 FORBIDDEN` (matching the existing F-01 middleware); foreign or missing private Registration / foreign, missing or unpublished Workshop `404 NOT_FOUND`. Error bodies contain only a stable code and safe generic message; never include foreign IDs, names, email, registration data or SQL details. |

The authenticated server session is the only source of user identity and role. No client-supplied participant/owner ID, role, header, query or body field can broaden access. These decisions apply only to the F-04 read surface; they do not authorize new requirements or unrelated feature changes.

## 3. UI contract (implemented; historical pre-merge specification)

| Screen/state | Expected behavior |
|---|---|
| `/my-registrations` | Own persisted rows with workshop title/time and ACTIVE status; loading/empty/expired session/error; no global Participant selector |
| `/my-registrations/:id` | Own registration ID, workshop summary, status and registered time; safe unavailable response for foreign/missing records |
| `/organizer/workshops/:id/registrations` | Owning Organizer roster for an owned **PUBLISHED** Workshop only; count/list generated from authoritative DB, empty/error feedback |
| Wrong role / unknown private ID / own DRAFT Workshop | Safe 401/403/404 UI, no private values leaked or stale data shown |

No cancel button that actually mutates status in Sprint 1 (F-05 later). Do not display F-08 check-in status as implemented before it exists.

## 4. Issue #6 API implementation — historical same-PR delivery, now integrated

Base `/api/v1`. All requests require the F-01 session and backend record-level permissions. Success envelope: `{"data":...}`; list responses also include `"pagination":{"next_cursor":...}`. Error envelope: `{"error":{"code":"...","message":"..."}}`.

| Method/path | Request | Expected success DTO | Safe negative responses |
|---|---|---|---|
| `GET /me/registrations` | Participant session; optional `limit`, `cursor`; no user ID parameter | `200` `{"data":[{"registration_id":"r-1","workshop":{"workshop_id":"w-1","title":"Workshop","starts_at":"<ISO>"},"status":"ACTIVE","registered_at":"<ISO>"}],"pagination":{"next_cursor":null}}`; only current Participant's rows | `401` anonymous; `403` Organizer |
| `GET /me/registrations/:id` | Participant session + registration ID | `200` `{"data":{"registration_id":"r-1","workshop":{"workshop_id":"w-1","title":"Workshop","starts_at":"<ISO>"},"status":"ACTIVE","registered_at":"<ISO>"}}` for own persisted row | `401` anonymous; `403` Organizer; `404` foreign/missing registration |
| `GET /organizer/workshops/:id/registrations` | Organizer session + owned **PUBLISHED** Workshop ID; optional `limit`, `cursor` | `200` `{"data":[{"registration_id":"r-1","participant_id":"opaque-u-1","status":"ACTIVE","registered_at":"<ISO>"}],"pagination":{"next_cursor":null}}`; no Participant email/full name | `401` anonymous; `403` Participant; `404` foreign/missing/unpublished Workshop |

**Pagination/order (WD-F04-02):** default `limit=20`, maximum `50`; `registered_at DESC, id DESC` provides deterministic ordering when timestamps tie. `next_cursor` is opaque and represents the final row's stable ordering position. Do not return total count. The server must validate the cursor and bind the query to the authenticated principal/authorized Workshop independently of cursor contents. No user-supplied `participant_user_id` filter is permitted.

**HTTP errors (WD-F04-04):** `401 UNAUTHENTICATED`; `403 FORBIDDEN` (reuse the existing F-01 role middleware semantics); `404 NOT_FOUND` for foreign/missing private registration or foreign/missing/unpublished Workshop. A malformed cursor or invalid limit returns `400 INVALID_PAGINATION` with a generic safe message and no private data. Unexpected server errors use the existing application's safe error handling; never return stack traces or SQL details.

Use 404 for foreign private IDs to avoid enumeration. A role check on UI alone fails the contract. Route paths and DTOs are F-04-scoped working choices, not global API approval.

## 5. Data contract and queries (no migrations)

Read existing `Registration(id,workshop_id,participant_user_id,status,registered_at,...)` joined to `Workshop(id,owner_user_id,title,starts_at,...)`. For Participant queries, predicate `registration.participant_user_id = authenticated_user_id`. For Organizer roster queries, predicate `workshop.id = requested_id AND workshop.owner_user_id = authenticated_user_id` before loading registrations. Foreign IDs must never authorize a broader JOIN. `Registration.status` is persisted by F-03; Sprint 1 views are read-only. No new data columns or migration required specifically by F-04 unless an approved privacy/design revision requires one.

**Security:** test with Participant A/B and Organizer A/B; check direct API routes and joined data. Do not trust browser query/header-supplied role or Participant ID; no application log containing private roster or credentials.

## 6. Observable Acceptance Criteria (AC)

| AC ID | Outcome / requirements |
|---|---|
| **AC-F04-01** | Participant A lists only A's persisted registrations and correct ACTIVE status; Participant B's rows excluded (FR-08, BR-01). |
| **AC-F04-02** | Participant A retrieves A's registration detail by ID after full DB read and sees persisted status/workshop summary (FR-08, NFR-02). |
| **AC-F04-03** | Participant A cannot read B's registration even knowing its exact ID; no private data leaked (BR-01, NFR-01). |
| **AC-F04-04** | Organizer A lists registrations only for own **PUBLISHED** Workshop A and the roster matches persisted registrations (FR-09, BR-01). |
| **AC-F04-05** | Organizer A cannot read registrations for Organizer B's Workshop or for own DRAFT Workshop; response does not expose private data (FR-09, BR-01, NFR-01). |
| **AC-F04-06** | Anonymous and wrong-role direct API/URL attempts fail with no registration disclosure (`401 UNAUTHENTICATED` / `403 FORBIDDEN`) (BR-01, NFR-01). |
| **AC-F04-07** | All registration views show safe loading/empty/error/expired-session/forbidden/unavailable states; they never claim a successful mutation or cancellation (FR-08/09). |
| **AC-F04-08** | Previously committed registration still appears to its permitted viewers after app restart using durable DB (NFR-02). |
| **AC-F04-09** | View displays one ACTIVE record per Participant+Workshop as persisted by F-03 and does not duplicate rows due to the join (BR-05). |
| **AC-F04-10** | Both list endpoints enforce WD-F04-02: default 20 rows, maximum 50, stable `registered_at DESC, id DESC` ordering, correct opaque continuation without duplicates/skips, and no total count or cross-principal cursor access (FR-08/09, NFR-01/02). |

## 7. Software Test Specification (STS): EXECUTED LOCALLY

| TEST ID | AC | Level | Preconditions/input → action → expected |
|---|---|---|---|
| **STS-F04-01** | AC-F04-01 | API+DB security | Seed Participants A/B with separate registrations → GET list as A → A only, correct persisted status |
| **STS-F04-02** | AC-F04-02 | API+DB | A owns rA → GET `/me/registrations/rA` → correct status/workshop from DB |
| **STS-F04-03** | AC-F04-03 | API negative | A requests rB (belongs to B) → 404, no B details |
| **STS-F04-04** | AC-F04-04 | API+DB | Organizer A owns PUBLISHED W1 with two registrations → GET roster W1 → exactly persisted allowed rows; own DRAFTs are excluded |
| **STS-F04-05** | AC-F04-05 | API negative | Organizer A requests Organizer B's W2 roster and own DRAFT W3 roster → both 404, no private data |
| **STS-F04-06** | AC-F04-06 | API security | Anonymous gets Participant list/Organizer roster; Participant gets roster; Organizer gets Participant list → 401/403 with safe envelopes |
| **STS-F04-07** | AC-F04-07 | UI/E2E | No registrations, expired session, wrong role, foreign-ID route, slow/failing fetch → correct empty/loading/error/forbidden/unavailable feedback, no leaked cached details |
| **STS-F04-08** | AC-F04-08 | Integration | Commit ACTIVE registration, restart app, use both authorized views → same ID/status persisted |
| **STS-F04-09** | AC-F04-09 | API+DB | One ACTIVE row in W1 for A → both views return exactly one corresponding row, not multiplied by JOIN |
| **STS-F04-10** | AC-F04-10 | API+DB boundary/security | Seed >50 authorized rows with tied timestamps and another principal's rows → verify default 20, max 50, reject invalid limit/cursor, traverse all pages in stable order exactly once, no total count, and cursor cannot expose another principal's rows |

**Author-local execution on implementation commit `24707ab05399536fd0e34c222a026be209683325`:**

- STS-F04-01–06 and STS-F04-09: `tests/f04.integration.test.ts` — participant ownership, own detail, foreign/missing 404 equivalence, organizer-owned PUBLISHED roster, hidden foreign/DRAFT/missing Workshop, 401/403, minimized DTO and JOIN cardinality.
- STS-F04-07: `tests/f04.ui.test.tsx` and `tests/f04.browser.test.ts` — loading/empty/error/expired/forbidden/unavailable states, stale-data clearing after later-page authorization failure, and direct wrong-role URL attempts.
- STS-F04-08: `tests/f04.browser.test.ts` — real Chrome Organizer → Participant → Organizer journey and API process restart with persisted registration/session.
- STS-F04-10: `tests/f04.integration.test.ts` and `tests/f04.pagination.unit.test.ts` — default 20, max 50, stable tied-timestamp traversal, invalid limit/cursor, no total and principal isolation.
- TDD RED: test-only commit `8025663eb673b0bf4b06d1e85d42c02a0f0bc515` in a detached baseline worktree produced 6 expected route/authorization failures (404 because F-04 routes did not exist) and 2 passes. GREEN: implementation commit `24707ab05399536fd0e34c222a026be209683325` passed the F-04 targeted suite **34/34** across four files.
- Full regression on exact pre-documentation PR HEAD `a31edc0579f254a6bb1b9ebbe10b7b4875a7d2fb`: **13 files / 103 tests PASS**. `npm run build` PASS and `git diff --check HEAD^ HEAD` PASS on the same SHA. These are Author-local results, not hosted CI or independent Reviewer reruns. The targeted F-04 suite was run on implementation commit `24707ab05399536fd0e34c222a026be209683325`.

## 8. Feature Definition of Done — staging gates MET on 2026-11-12; main Release is separate

- [x] Independent Reviewer records `Approved for Implementation Only — Not Approved for Merge` against exact specification PR HEAD `6c6b0275585c6bc3f44dfbcc37b9bb6c99318316`; Author verifies Reviewer `cottonlnwza` is distinct from Author `thananun-7203` and exact SHA before TDD/implementation.
- [x] UI/API/DB reads work for Participant self and Organizer owner with no foreign disclosure; no mutation, check-in or cancellation.
- [x] WD-F04-01–04 DTO/privacy/pagination/error behavior implemented as reviewed; server-side session identity and record ownership enforced on every read.
- [x] AC-F04-01–10 / STS-F04-01–10 tested, including negative owner/role/anonymous cases, pagination boundaries, empty/error UI, JOIN cardinality and restart persistence against isolated PostgreSQL test DBs.
- [x] Complete Organizer publish → Participant discover/register/view-own → owning Organizer view-roster E2E journey passes with synthetic data.
- [x] No schema migration; no Development DB used for destructive tests.
- [x] Actual execution evidence and implementation/test commits are recorded in the same Issue #6 / PR #20.
- [x] Independent final code review and Formal APPROVE; teammate merge into `sprint_1_staging` verified by [merged PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20) (merge `458a4a097f110f4eeba25a3bdabca6d5fe04f943`).
- [x] Author completed post-merge staging verification and original Issue/Project read-back on 2026-11-12; see [Issue #6 completion evidence](https://github.com/cottonlnwza/TTworkshop/issues/6#issuecomment-6823184448). **Release to `main` is separate Issue #25; not part of F-04 DoD.**

**Change record:** v0.1, 2026-11-03, initial P1-02 pre-implementation draft. v0.2.0, 2026-11-11, Issue #6 specification-first update: requester-authorized WD-F04-01–04; explicit minimal DTO/privacy, cursor pagination, API envelopes/routes, HTTP error semantics, AC/STS-10 and implementation DoD. v0.2.1, 2026-11-11, reconcile Reviewer Round 2 and exact-head gate. v0.2.2, 2026-11-11, record Round 3 implementation-only gate on `6c6b0275585c6bc3f44dfbcc37b9bb6c99318316`, TDD RED/GREEN, API/UI/DB implementation, 10/10 STS execution and F-04 targeted 34/34. v0.2.3, 2026-11-11, correct exact tested-SHA provenance for full regression/build, split DoD into completed pre-merge work and remaining review/merge/post-merge gates, and add the pre-merge Completion Matrix.

**v0.2.4 / 2026-11-12 / Issue #25:** Current F-04 staging status reconciled after independent Formal Review and merged PR #20. Historical specification approval, TDD commits, local test counts and earlier v0.2.3 change log remain unchanged; this contract does **not** certify a `main` release or instructor/global approval.
