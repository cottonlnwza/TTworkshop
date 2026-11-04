# TTworkshop — Requirements → Features → Sprints → Verification Traceability

> **DRAFT global traceability v0.1.5 — NOT GLOBALLY APPROVED — 2026-11-05** · Historical [#1](https://github.com/cottonlnwza/TTworkshop/issues/1)/[#2](https://github.com/cottonlnwza/TTworkshop/issues/2)/[PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) · Reconciliation [#11](https://github.com/cottonlnwza/TTworkshop/issues/11) · Deliverable 1 Part B/E
> Source baseline: `docs/srs.md` DRAFT v0.1.6; feature mapping: `docs/features.md` DRAFT v0.1.5. Historical PR #8 contained 41 AC / 41 PLANNED STS (F-01 8, F-02 11, F-03 13, F-04 9). PR #10 peer-reviewed/merged the F-02 scoped working plan with **42 AC / 42 PLANNED STS** total after adding F-02-12 (F-01 8, F-02 12, F-03 13, F-04 9). **F-02 implementation is assigned to #12; #4/PR #10 remain historical documentation.** F-01 implementation evidence remains separate; F-02-F-04 have no executed STS. No global/instructor approval, hosted CI, main release or deployment is claimed.

## 1. Conventions and status

- **S1 / S2 / S3**: planned sprint of implementation or first verification; later regression may span multiple sprints.
- **SYS-01–SYS-05**: cross-cutting responsibilities, not extra product features (defined in `docs/features.md`).
- **Verification** is a planned check and level only. **DRAFT P1-02** points to newly authored provisional AC and planned STS (crosswalk in section 5A), **not executed test evidence**. **TBD** applies to later-sprint contracts and means not specified; neither status means PASS.
- Requirement allocations and AC/STS crosswalks below remain DRAFT / NOT APPROVED. Execution status is feature-specific: F-01 has merged implementation and 21/21 local application tests plus a local build (see section 5); F-02-F-04 remain unimplemented with planned STS not executed. Do not infer full-product requirement closure or hosted CI from that evidence.

## 2. Functional requirement matrix

| Requirement | Feature/responsibility | Planned sprint | Planned verification (level / observable result) | AC/STS status |
|---|---|---|---|---|
| FR-01 | F-01 | S1 | API integration: valid/invalid login, logout; inactive/invalid session not accepted | **DRAFT P1-02; section 5A** |
| FR-02 | F-01, SYS-02 | S1 | API integration: current user correct; anonymous/forbidden role rejected | **DRAFT P1-02; section 5A** |
| FR-03 | F-02, SYS-01 | S1 | UI/API/DB: Organizer creates owned DRAFT; persistence and owner-private read | **DRAFT P1-02; section 5A** |
| FR-04 | F-02 | S1 | UI/API/DB: valid DRAFT published; invalid publication rejected; persisted listing | **DRAFT P1-02; section 5A** |
| FR-05 | F-02, SYS-02 | S1 | API/DB: own workshops visible; another Organizer's drafts denied | **DRAFT P1-02; section 5A** |
| FR-06 | F-03 | S1 | UI/API: eligible PUBLISHED workshops listed/details; DRAFT excluded | **DRAFT P1-02; section 5A** |
| FR-07 | F-03, SYS-03 | S1 | API/DB + UI journey: successful ACTIVE registration persisted and rejected invalid cases | **DRAFT P1-02; section 5A** |
| FR-08 | F-04, SYS-01 | S1 | UI/API/DB: Participant retrieves own saved record and status | **DRAFT P1-02; section 5A** |
| FR-09 | F-04, SYS-02 | S1 | API/DB: owning Organizer sees registrants; unrelated owner cannot | **DRAFT P1-02; section 5A** |
| FR-10 | F-05 | S2 | API/DB: eligible cancellation persists, duplicate/late/foreign cancellation rejected | TBD S2 contract |
| FR-11 | F-06 | S2 | API/DB: deadline/closure/reopen transitions and valid/invalid registration eligibility | TBD S2 contract |
| FR-12 | F-07 | S2 | API/DB: permitted edits persist; capacity lower than ACTIVE count rejected | TBD S2 contract |
| FR-13 | F-08 | S3 (start P2) | API/DB: owned ACTIVE registrant checked in once during window; invalid paths rejected | TBD S3 contract |
| FR-14 | F-09 | S3 | API/DB: count/rate summary matches seeded transactions and authorization | TBD S3 contract |
| FR-15 | F-09 | S3 | UI/API: chosen filters return correct subset and clear empty results | TBD S3 contract; **scope approval pending** |

## 3. Business rule matrix

| Requirement | Feature/responsibility | Planned sprint | Planned negative/boundary verification | AC/STS status |
|---|---|---|---|---|
| BR-01 | F-01–F-09, SYS-02 | S1; regress S2/S3 | API auth/ownership: anonymous, wrong role, cross-Participant and foreign Organizer access rejected on protected paths | **S1 DRAFT P1-02 section 5A; later contracts TBD** |
| BR-02 | F-02, F-07 | S1; regress S2 | Boundary/API: publish/edit with end ≤ start rejected | **S1 DRAFT P1-02 section 5A; S2 TBD** |
| BR-03 | F-02, F-07 | S1; regress S2 | Boundary/API: zero/negative/non-integer published capacity rejected | **S1 DRAFT P1-02 section 5A; S2 TBD** |
| BR-04 | F-02, F-03 | S1 | API/DB: DRAFT invisible to other users; no registering against DRAFT | **DRAFT P1-02; section 5A** |
| BR-05 | F-03, F-04, SYS-03 | S1 | DB/API: repeated ACTIVE registration rejected; exactly one ACTIVE row | **DRAFT P1-02; section 5A** |
| BR-06 | F-03, SYS-03 | S1; regress S2/S3 | Real concurrent API/DB requests for final seat: successful count ≤1, never exceed capacity | **DRAFT P1-02; section 5A** |
| BR-07 | F-03, F-06 | S1 guard; S2 controls | **S1:** independent effective-deadline time gate and PUBLISHED status; **S2:** closure/reopen controls separately (BR-10). No conjunction of deadline and manual closure in one Sprint 1 AC | **S1 DRAFT AC-F03-08 / STS-F03-08; S2 TBD** |
| BR-08 | **F-02 Create/Publish owner; F-03 Registration fail-closed/default**; F-06/F-07 future edit | S1 guards; S2 edit | **S1:** F-02 rejects invalid configured deadline at **Create** (AC-F02-10) and separately **Publish** (AC-F02-11); F-03 independently checks absent-deadline default=start (AC-F03-12) and **fail-closed Registration if persisted deadline > start** (AC-F03-13). **No Create/Publish in F-03 STS-F03-13.** DEC-04 **F-02 scoped choice peer-accepted in PR #10**; F-03 execution/other decisions still pending. **S2:** editing policy tests TBD | **DRAFT F-02 STS-F02-10/11 + F-03 STS-F03-12/13; S2 TBD; NOT EXECUTED** |
| BR-09 | F-05 | S2 | API/DB: timely owner cancellation persists; late/duplicate/foreign attempt rejected | TBD S2 contract |
| BR-10 | F-05, F-06 | S2 | **Manual closure** blocks new registrations, timely ACTIVE cancellation remains allowed, no auto-reopen; **not** F-03 Sprint 1 AC/STS | **TBD S2 contract, NOT EXECUTED** |
| BR-11 | F-06 | S2 | Reopen before deadline accepted if eligible; at/after deadline rejected | TBD S2 contract |
| BR-12 | F-05, F-03 | S2 | Re-register after cancelled when eligible; duplicate/full/closed/expired rejected | TBD S2 contract |
| BR-13 | F-07 | S2 | API/DB: capacity below ACTIVE count rejected; equal/above permitted by policy | TBD S2 contract |
| BR-14 | F-08 | S3 (start P2) | API/DB: duplicate check-in, outside window, foreign event, inactive registration denied | TBD S3 contract |
| BR-15 | F-09 | S3 | Unit + API/DB: remaining/attendance/no-show correct; zero-active rate 0% | TBD S3 contract |
| BR-16 | F-07, F-06 | S2 | Rule-driven edit cases once post-publication edit policy is approved | **OPEN DEC-07; TBD** |

## 4. Non-functional requirement matrix

| Requirement | Feature/responsibility | Planned verification checkpoint | Measurable evidence required | Status |
|---|---|---|---|---|
| NFR-01 | F-01–F-09, SYS-02 | S1 plus S2/S3 regression | S1 protected-route/hash-storage **DRAFT AC/STS crosswalk section 5A**; later routes regress; actual test file/output/SHA required | NOT EXECUTED; DRAFT P1-02 plan |
| NFR-02 | F-02–F-08, SYS-01 | S1 local; Lab 5 deployed; Final | S1 restart/persistence **DRAFT AC/STS crosswalk section 5A**; later deployed DB proof required | NOT EXECUTED; DRAFT P1-02 plan |
| NFR-03 | F-03, SYS-03 | S1; integrated regression | 10 concurrent real requests for one seat: exactly 1 success; DB ACTIVE count=capacity; **DRAFT AC-F03-06 / STS-F03-06** | NOT EXECUTED; provisional number |
| NFR-04 | F-09, SYS-05 | S3 | 100 events/10 users p95 ≤3s measurement, environment and sample method | NOT EXECUTED; provisional target |
| NFR-05 | F-01–F-09, SYS-05 | S3 final UX | Checks at 375px and 1280px against specified key journeys | NOT EXECUTED; provisional widths |
| NFR-06 | SYS-04 | **S1/D1** relevant-PR build + automated tests and failed-check exclusion; **Lab 5** hosted CI enforcement, Docker/GCP; D2/Final regression | **S1:** per-PR applicable build/test command, output/status and tested SHA, reviewer gate evidence, no failed required check integrated/released, reviewed staging→main PR. **Lab 5:** hosted status checks with deliberate failure blocked, Docker image and GCP deployment linked to released SHA. Neither gate nor tests are asserted as executed here. | NOT EXECUTED; Sprint 1 PR gate required before Lab 5 |
| NFR-07 | F-01, SYS-02, SYS-04 | All sprints | S1 **DRAFT AC-F01-07 / STS-F01-07**, example env only; repo/diff/secret scan; synthetic seed evidence, later PR checks | NOT EXECUTED; DRAFT P1-02 plan |

## 5. Coverage accounting and risks

| Metric | DRAFT planned coverage | Verified implementation |
|---|---|---|
| Functional requirements | 15/15 mapped to at least one Feature | 0/15 full-product requirements closed |
| Business rules | 16/16 mapped | 0/16 full-product rules closed |
| Important NFRs | 7/7 mapped to Feature and/or SYS responsibility | 0/7 full-product NFRs closed |
| Sprint 1 AC/STS | 42 current DRAFT AC + 42 PLANNED STS: F-01 8, F-02 12, F-03 13, F-04 9. Historical PR #8 was 41/41 before PR #10 added F-02-12. See section 5A and linked contracts. NOT APPROVED | F-01: PR #9 merged to sprint_1_staging; Author ran 21/21 local application tests (11 PostgreSQL/API, 5 React UI, 2 Chrome E2E, 3 DB guard) and npm run build PASS on merge SHA 21e9d9de83ccef24214484ab159a83d398f544b3. F-02-F-04: planned STS not implemented/executed. Local results are not hosted CI; no main release/deployment is claimed. |
| Approved scope | Full-product baseline approval not claimed; FR-15 and several detailed rules remain open | No instructor/full-product sign-off claimed |

**Known open verification dependencies:** `DEC-03` incomplete drafts, `DEC-04` deadline/time zone/boundary, `DEC-06` cancellation/history UI, `DEC-07` published-event edits, `DEC-09` metric interpretation, `DEC-11` public/filter scope, and `DEC-12` NFR thresholds. They are **not silently treated as resolved**.

## 5A. Sprint 1 current DRAFT AC-to-planned-STS crosswalk - NOT EXECUTED

Each ID below links to the acceptance-criteria and software-test-specification tables in the named file. For each AC-Fxx-NN in a row, the matching test is STS-Fxx-NN in that same contract. This table is a requirement-to-test design crosswalk, not execution evidence. The current 42 AC/STS are DRAFT / NOT APPROVED; F-02-F-04 planned STS are NOT IMPLEMENTED / NOT EXECUTED. F-01 actual application test results are recorded separately in section 5 and are not inferred from this crosswalk. Only Sprint 1 coverage is represented here; follow-up S2/S3 rules and NFR-06 delivery checks remain separate.

| Draft requirement | Feature contract (read AC and matching STS) | AC IDs representing proposed Sprint 1 verification |
|---|---|---|
| FR-01 | [F-01](contracts/f-01-auth.md) | AC-F01-01, AC-F01-03, AC-F01-04, AC-F01-06, AC-F01-08 |
| FR-02 | [F-01](contracts/f-01-auth.md) | AC-F01-01, AC-F01-02, AC-F01-05 |
| FR-03 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-01, AC-F02-09, AC-F02-10 (Create BR-08 validation), AC-F02-12 (complete the same owned DRAFT) |
| FR-04 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-03, AC-F02-04, AC-F02-05, AC-F02-07, AC-F02-08, AC-F02-11 (Publish BR-08 validation), AC-F02-12 (update then publish the same DRAFT) |
| FR-05 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-02 |
| FR-06 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-01, AC-F03-02 |
| FR-07 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-03, AC-F03-04, AC-F03-05, AC-F03-06, AC-F03-07, AC-F03-08, AC-F03-09, AC-F03-10, AC-F03-11, AC-F03-12, AC-F03-13 |
| FR-08 | [F-04](contracts/f-04-registration-views.md) | AC-F04-01, AC-F04-02, AC-F04-03, AC-F04-07, AC-F04-08, AC-F04-09 |
| FR-09 | [F-04](contracts/f-04-registration-views.md) | AC-F04-04, AC-F04-05, AC-F04-06, AC-F04-07, AC-F04-08 |
| BR-01 | [F-01](contracts/f-01-auth.md), [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F01-02/04/05; AC-F02-01, AC-F02-02, AC-F02-06, **AC-F02-12**; AC-F03-01/09; AC-F04-01/03/04/05/06 |
| BR-02 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-03, AC-F02-04 |
| BR-03 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-03, AC-F02-05 |
| BR-04 | [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md) | AC-F02-01, AC-F02-02, AC-F02-03, AC-F02-06, AC-F02-07, **AC-F02-12**; AC-F03-01/07 |
| BR-05 | [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F03-04, AC-F04-09 |
| BR-06 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-05, AC-F03-06 |
| BR-07 | [F-03](contracts/f-03-discovery-registration.md) | **AC-F03-08** (deadline eligibility independently; DEC-04 PENDING) |
| BR-08 | **[F-02](contracts/f-02-workshop-publish.md) Create/Publish owner**; **[F-03](contracts/f-03-discovery-registration.md) Registration default + fail-closed guard** | **AC-F02-10 (Create)**, **AC-F02-11 (Publish)**; **AC-F03-12 (no deadline default)**, **AC-F03-13 (invalid persisted data: Registration reject only)**. Four separate matching STS IDs; DEC-04 **F-02 scoped working choice accepted in PR #10, broader approval/executable F-03 work pending** |
| BR-10 | **S2 F-05/F-06 — no P1-02 Sprint 1 AC/STS** | **TBD S2**, manual-closure/cancellation rule, not combined into AC-F03-08 |
| NFR-01 | [F-01](contracts/f-01-auth.md), [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F01-03/04/05/07; AC-F02-06, **AC-F02-12**; AC-F03-09; AC-F04-03/05/06 |
| NFR-02 | [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F02-01, AC-F02-09; AC-F03-03, AC-F03-10; AC-F04-02, AC-F04-08 |
| NFR-03 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-06 (10 users / 1 remaining seat, provisional target) |
| NFR-07 | [F-01](contracts/f-01-auth.md) | AC-F01-07 (synthetic accounts, no real secrets; other PR checks remain SYS-04) |

**Completeness note:** NFR-04/05 belong to later Sprint 3; NFR-06 belongs to SYS-04 PR build/test and delivery verification, not a fabricated product AC. FR-10–15 and BR-09–16 (including BR-10) remain **planned for later contracts**, not presented as executed. The original 15 FR / 16 BR / 7 NFR allocations in **sections 2–4** remain intact; this crosswalk adds **Sprint 1 planned test IDs only**.

## 6. Required updates at later checkpoints

1. **Current Sprint 1 working contract set:** 42 DRAFT AC / 42 PLANNED STS (8+12+13+9) are indexed in `docs/contracts/README.md`; historical PR #8 was 41/41 before PR #10 added F-02-12. A scoped working-document change is accepted only after independent substantive peer APPROVE, actual merge into `sprint_1_staging`, and Author post-merge verification. This does not claim instructor approval or full-product sign-off; resolve any still-open decision in its own versioned scope before dependent implementation.
2. **After each feature test execution:** Add actual `test file::test name`, build/test command, pass/fail/skipped count, tested commit SHA and reviewed PR/release. Never label a pending check PASS.
3. **D2:** Include all S2 AC and results, actual S3 implemented progress, deployed integration/regression checks, open defects, and approved baseline changes.
4. **Final:** Include complete FR/BR/NFR → Feature → Sprint → AC/verification → test file or measurement → result → **final released commit**; preserve rejected or incomplete requirements explicitly.

| Version | Date | Revision | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | Initial DRAFT full-baseline mapping; no actual test claims | Historical status at this version: pending both students |
| v0.1.1 | 2026-11-03 | R-01: NFR-06 verification explicitly splits Sprint 1 PR checks from Lab 5 hosted CI/CD | Historical status at this version: pending re-review |
| v0.1.2 | 2026-11-03 | PR #8 Reviewer R-01/R-02: map 39 Draft AC to matching planned STS in F-01-F-04, distinguish BR-07/08 from Sprint 2 BR-10, correct stale AC/STS status | Historical status: NOT APPROVED; no tests executed |
| v0.1.3 | 2026-11-03 | PR #8 Reviewer R-03: clarify F-02 ownership at Create/Publish, separate F-03 defensive Registration, add F-02 AC/STS-10/11 (41 pairs total); decisions remain OPEN | Historical status: NOT APPROVED; no tests executed |
| v0.1.4 | 2026-11-04 | PR #10 Reviewer R-04: add AC-F02-12 / STS-F02-12 to FR-03/FR-04/BR-01/BR-04/NFR-01; distinguish historical PR #8 41/41 from current 42/42; record F-01 local evidence separately from F-02-F-04 unexecuted STS | PENDING PEER REVIEW; full SRS remains DRAFT / NOT APPROVED |
| v0.1.5 | 2026-11-05 | Issue #11 evidence reconciliation: PR #10 scoped acceptance and new F-02 implementation Issue #12; unchanged 42 AC/STS mapping and unexecuted F-02 status | Pending this Issue #11 review; global traceability remains DRAFT |
