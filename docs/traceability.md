# TTworkshop — Requirements → Features → Sprints → Verification Traceability

> **DRAFT global traceability v0.2.1 — NOT GLOBALLY APPROVED — 2026-11-11** · Historical [#1](https://github.com/cottonlnwza/TTworkshop/issues/1)/[#2](https://github.com/cottonlnwza/TTworkshop/issues/2)/[PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) · Reconciliation [#11](https://github.com/cottonlnwza/TTworkshop/issues/11) · F-03 implementation [#5](https://github.com/cottonlnwza/TTworkshop/issues/5) · F-04 execution [#6](https://github.com/cottonlnwza/TTworkshop/issues/6) · Deliverable 1 Part B/E
> Source baseline: `docs/srs.md` DRAFT v0.1.9; feature mapping: `docs/features.md` DRAFT v0.1.8. Historical PR #8 contained 41 AC / 41 PLANNED STS (F-01 8, F-02 11, F-03 13, F-04 9). PR #10 added F-02-12 (42 pairs); Issue #6 adds F-04-10 (43 pairs). **F-02 implementation was delivered by PR #14 / Issue #12**, merged into `sprint_1_staging` at `d99d67062d7a2869e4fc49de39fc634da03c2f78`. F-03 implementation was merged through PR #15 / Issue #5 into `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`, with Author post-merge evidence recorded in `docs/evidence/p1-05-f03.md`. F-04 implementation-only approval was recorded by Reviewer `cottonlnwza` on exact specification PR HEAD `6c6b0275585c6bc3f44dfbcc37b9bb6c99318316`; implementation commit `24707ab05399536fd0e34c222a026be209683325` passed 34/34 F-04 tests, 103/103 full regression and build. PR #20 remains OPEN/DRAFT/NOT MERGED pending final peer review and staging integration. No global/instructor approval, hosted CI, main release or deployment is claimed.

## 1. Conventions and status

- **S1 / S2 / S3**: planned sprint of implementation or first verification; later regression may span multiple sprints.
- **SYS-01–SYS-05**: cross-cutting responsibilities, not extra product features (defined in `docs/features.md`).
- **Verification** is a planned check and level only. **DRAFT P1-02** points to newly authored provisional AC and planned STS (crosswalk in section 5A), **not executed test evidence**. **TBD** applies to later-sprint contracts and means not specified; neither status means PASS.
- Requirement allocations and AC/STS crosswalks below remain DRAFT / NOT APPROVED. Execution status is feature-specific: F-01 has merged implementation and Author-reported 21/21 local checks plus a local build; F-02 has merged implementation and an Author-reported 48/48 suite on PR #14 (including 26 F-02 cases), with independent verification limitations recorded in §5; F-03 is merged to staging with Author post-merge local evidence (build PASS, 69/69 suite); F-04 implementation commit `24707ab05399536fd0e34c222a026be209683325` has Author-local evidence of 34/34 targeted tests, 103/103 full regression and build PASS. PR #20 remains OPEN/DRAFT/NOT MERGED; final independent review and staging integration remain pending. Do not infer hosted CI or full-product requirement closure from these reports.

## 2. Functional requirement matrix

| Requirement | Feature/responsibility | Planned sprint | Planned verification (level / observable result) | AC/STS status |
|---|---|---|---|---|
| FR-01 | F-01 | S1 | API integration: valid/invalid login, logout; inactive/invalid session not accepted | **DRAFT P1-02; section 5A** |
| FR-02 | F-01, SYS-02 | S1 | API integration: current user correct; anonymous/forbidden role rejected | **DRAFT P1-02; section 5A** |
| FR-03 | F-02, SYS-01 | S1 | UI/API/DB: Organizer creates owned DRAFT; persistence and owner-private read | **DRAFT P1-02; section 5A** |
| FR-04 | F-02 | S1 | UI/API/DB: valid DRAFT published; invalid publication rejected; persisted listing | **DRAFT P1-02; section 5A** |
| FR-05 | F-02, SYS-02 | S1 | API/DB: own workshops visible; another Organizer's drafts denied | **DRAFT P1-02; section 5A** |
| FR-06 | F-03 | S1 | UI/API: authenticated Participant-only published list/detail; Anonymous `401`, Organizer `403`, DRAFT excluded (DEC-11 implementation-only authorization) | **DRAFT P1-02; local execution evidence in §5A** |
| FR-07 | F-03, SYS-03 | S1 | API/DB + UI journey: successful ACTIVE registration persisted and rejected invalid cases | **DRAFT P1-02; local execution evidence in §5A** |
| FR-08 | F-04, SYS-01 | S1 | UI/API/DB: Participant retrieves own saved record and status; stable bounded list pagination | **DRAFT Issue #6 specification; AC/STS-F04-01–03, 07–10 planned** |
| FR-09 | F-04, SYS-02 | S1 | API/DB: owning Organizer sees privacy-minimized registrants; unrelated owner cannot; stable bounded pagination | **DRAFT Issue #6 specification; AC/STS-F04-04–10 planned** |
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
| BR-05 | F-03, F-04, SYS-03 | S1 | DB/API: repeated ACTIVE registration rejected; F-04 views exactly one corresponding persisted row without JOIN multiplication | **F-03 local API/DB evidence; F-04 STS-F04-09 executed locally** |
| BR-06 | F-03, SYS-03 | S1; regress S2/S3 | Real concurrent API/DB requests for final seat: successful count ≤1, never exceed capacity | **F-03 10-request real-PostgreSQL execution evidence; final review pending** |
| BR-07 | F-03, F-06 | S1 guard; S2 controls | **S1:** independent effective-deadline time gate and PUBLISHED status; **S2:** closure/reopen controls separately (BR-10). No conjunction of deadline and manual closure in one Sprint 1 AC | **S1 AC-F03-08 / STS-F03-08 executed locally; S2 TBD** |
| BR-08 | **F-02 Create/Publish owner; F-03 Registration fail-closed/default**; F-06/F-07 future edit | S1 guards; S2 edit | **S1:** F-02 rejects invalid configured deadline at **Create** (AC-F02-10) and separately **Publish** (AC-F02-11); F-03 independently checks absent-deadline default=start (AC-F03-12) and **fail-closed Registration if persisted deadline > start** (AC-F03-13). **No Create/Publish in F-03 STS-F03-13.** DEC-04 F-02 scoped choice peer-accepted in PR #10; F-03 application authorized implementation-only on PR #15 and locally tested. **S2:** editing policy tests TBD | **F-02 implemented; F-03 STS-F03-08/12/13 executed locally; final review pending; S2 TBD** |
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
| NFR-01 | F-01–F-09, SYS-02 | S1 plus S2/S3 regression | S1 protected-route/hash-storage **DRAFT AC/STS crosswalk section 5A**; later routes regress; actual test file/output/SHA required | F-01/F-02/F-03 scoped local security and authorization tests recorded; full cross-feature NFR-01 remains NOT CLOSED |
| NFR-02 | F-02–F-08, SYS-01 | S1 local; Lab 5 deployed; Final | S1 restart/persistence **DRAFT AC/STS crosswalk section 5A**; later deployed DB proof required | F-02 PR #14 and F-03 PR #15 include local real API process-restart tests; full cross-feature/redeployment NFR-02 remains NOT CLOSED; F-02 independent full-suite rerun unavailable |
| NFR-03 | F-03, SYS-03 | S1; integrated regression | Real concurrent last-seat requests: exactly one success; DB ACTIVE count never exceeds capacity; 10 distinct concurrent requests is the DEC-12 implementation profile in AC/STS-F03-06 | Local real-PostgreSQL test executed; no-overbooking invariant verified for tested profile |
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
| Sprint 1 AC/STS | 43 current DRAFT AC and 43 matching AC-to-STS design pairs: F-01 8, F-02 12, F-03 13, F-04 10. Historical PR #8 was 41/41 before PR #10 added F-02-12 and Issue #6 added F-04-10. See §5A and linked contracts. **F-02 DEC-02/03/04/10-F02 scoped working choices were accepted through PR #10; F-02 implementation was later merged by PR #14. F-03 DEC-11/12 and DEC-04 application received implementation-only authorization on exact PR #15 HEAD. The full-product baseline remains DRAFT / NOT APPROVED.** | F-01: PR #9 merged to staging; Author-reported 21/21 local checks and build PASS. F-02: PR #14 merged to staging at `d99d67062d7a2869e4fc49de39fc634da03c2f78`; Author test ledger reports 26 F-02 cases and 48/48 overall, plus build/migration PASS post-merge. Reviewer independently reran build, UI 5/5 (F-01 only) and DB guard 3/3 on feature snapshot; full PostgreSQL/Chrome suite was not independently rerun because test DB URLs were unavailable. F-03: PR #15 merged to staging at c6d87c80b8a0887591e80f93f6cbe24897cc07b9; Author post-merge local build and 69/69 test evidence recorded. F-04: specification reviewed for implementation only on prior exact HEAD `8789d2dbeda3b5c0b090aa1d4c9454162da5ab53`; refreshed exact-HEAD confirmation is required after this documentation update; implementation and all 10 STS not started/not executed. No hosted CI/main release/deployment is claimed. |
| Approved scope | Full-product baseline approval not claimed; FR-15 and several detailed rules remain open | No instructor/full-product sign-off claimed |

**Decision acceptance and open verification dependencies:** `DEC-02` Workshop fields, `DEC-03` incomplete Draft/update, `DEC-04` F-02 write-side timestamp/deadline boundary and `DEC-10-F02` stack reuse are **accepted for F-02 scoped working use** under PR #10 and the [Issue #11 decision ledger](decisions/p1-ex01-working-acceptance-ledger.md). F-02 implementation was subsequently merged through PR #14 / Issue #12; the Author-reported execution evidence and independent-review limits are recorded below. F-03 registration-time application of DEC-04, DEC-11 and DEC-12 were separately authorized for implementation only by Reviewer `cottonlnwza` at exact PR #15 HEAD `b81280e9bfbc15a4ba1b7cd4cf19e02499622b71`; local execution evidence is recorded in `docs/evidence/p1-05-f03.md`. Final Formal APPROVE, staging merge and Author verification remain required for final working-baseline acceptance. The actual university timezone identifier remains unselected configuration. NFR-04/05 and `DEC-06` cancellation/history UI, `DEC-07` published-event edits, and `DEC-09` metric interpretation remain OPEN where separately required.

## 5A. Sprint 1 current DRAFT AC-to-STS design crosswalk and execution status

Each ID below links to the acceptance-criteria and software-test-specification tables in the named file. For each AC-Fxx-NN, the matching design ID is STS-Fxx-NN in that contract. This is a **historical 42-row requirement/test-design snapshot**, superseded by the current 43-pair inventory in §5B, not a statement that all tests remain unexecuted. F-02 was implemented in PR #14; its Author test ledger reports 26 F-02 test cases and the PR DoD records STS-F02-01–12 as executed. The Reviewer independently verified build, UI 5/5 (F-01 only) and DB guard 3/3 on the reviewed feature snapshot, but could not rerun the full PostgreSQL/Chrome suite because `PG_TEST_URL` and `PG_SEED_TEST_URL` were unavailable. Therefore the PR's aggregate report is **Author-reported evidence**, not independent proof of one-to-one execution for every named F-02 STS. F-03 AC/STS-F03-01–13 now have local Author execution evidence under PR #15; independent code review, staging merge and post-merge verification remain pending. F-04 planned STS remain unimplemented/unexecuted. F-02's scoped feature merge does not approve the full SRS/SDS. S2/S3 decisions and NFR-06 delivery checks remain separate.

| Draft requirement | Feature contract (read AC and matching STS) | AC IDs representing proposed Sprint 1 verification |
|---|---|---|
| FR-01 | [F-01](contracts/f-01-auth.md) | AC-F01-01, AC-F01-03, AC-F01-04, AC-F01-06, AC-F01-08 |
| FR-02 | [F-01](contracts/f-01-auth.md) | AC-F01-01, AC-F01-02, AC-F01-05 |
| FR-03 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-01, AC-F02-09, AC-F02-10 (Create BR-08 validation), AC-F02-12 (complete the same owned DRAFT) |
| FR-04 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-03, AC-F02-04, AC-F02-05, AC-F02-07, AC-F02-08, AC-F02-11 (Publish BR-08 validation), AC-F02-12 (update then publish the same DRAFT) |
| FR-05 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-02 |
| FR-06 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-01, AC-F03-02 |
| FR-07 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-03, AC-F03-04, AC-F03-05, AC-F03-06, AC-F03-07, AC-F03-08, AC-F03-09, AC-F03-10, AC-F03-11, AC-F03-12, AC-F03-13 |
| FR-08 | [F-04](contracts/f-04-registration-views.md) | AC-F04-01, AC-F04-02, AC-F04-03, AC-F04-07, AC-F04-08, AC-F04-09, **AC-F04-10** |
| FR-09 | [F-04](contracts/f-04-registration-views.md) | AC-F04-04, AC-F04-05, AC-F04-06, AC-F04-07, AC-F04-08, **AC-F04-10** |
| BR-01 | [F-01](contracts/f-01-auth.md), [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F01-02/04/05; AC-F02-01, AC-F02-02, AC-F02-06, **AC-F02-12**; AC-F03-01/09; AC-F04-01/03/04/05/06/10 |
| BR-02 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-03, AC-F02-04 |
| BR-03 | [F-02](contracts/f-02-workshop-publish.md) | AC-F02-03, AC-F02-05 |
| BR-04 | [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md) | AC-F02-01, AC-F02-02, AC-F02-03, AC-F02-06, AC-F02-07, **AC-F02-12**; AC-F03-01/07 |
| BR-05 | [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F03-04, AC-F04-09 |
| BR-06 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-05, AC-F03-06 |
| BR-07 | [F-03](contracts/f-03-discovery-registration.md) | **AC-F03-08** (deadline eligibility independently; F-03 application of DEC-04 authorized implementation-only and locally tested) |
| BR-08 | **[F-02](contracts/f-02-workshop-publish.md) Create/Publish owner**; **[F-03](contracts/f-03-discovery-registration.md) Registration default + fail-closed guard** | **AC-F02-10 (Create)**, **AC-F02-11 (Publish)**; **AC-F03-12 (no deadline default)**, **AC-F03-13 (invalid persisted data: Registration reject only)**. Four separate matching STS IDs; DEC-04 F-03 application authorized implementation-only and locally tested |
| BR-10 | **S2 F-05/F-06 — no P1-02 Sprint 1 AC/STS** | **TBD S2**, manual-closure/cancellation rule, not combined into AC-F03-08 |
| NFR-01 | [F-01](contracts/f-01-auth.md), [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F01-03/04/05/07; AC-F02-06, **AC-F02-12**; AC-F03-09; AC-F04-03/05/06/10 |
| NFR-02 | [F-02](contracts/f-02-workshop-publish.md), [F-03](contracts/f-03-discovery-registration.md), [F-04](contracts/f-04-registration-views.md) | AC-F02-01, AC-F02-09; AC-F03-03, AC-F03-10; AC-F04-02, AC-F04-08/10 |
| NFR-03 | [F-03](contracts/f-03-discovery-registration.md) | AC-F03-06 (10 users / 1 remaining seat, authorized F-03 test profile; local real-PostgreSQL test executed) |
| NFR-07 | [F-01](contracts/f-01-auth.md) | AC-F01-07 (synthetic accounts, no real secrets; other PR checks remain SYS-04) |

**Completeness note:** NFR-04/05 belong to later Sprint 3; NFR-06 belongs to SYS-04 PR build/test and delivery verification, not a fabricated product AC. FR-10–15 and BR-09–16 (including BR-10) remain **planned for later contracts**, not presented as executed. The original 15 FR / 16 BR / 7 NFR allocations in **sections 2–4** remain intact; this crosswalk adds **Sprint 1 planned test IDs only**.

## 5B. Issue #6 specification addendum — current snapshot, 2026-11-11

- The current Sprint 1 design inventory is **43 AC / 43 matching AC-to-STS pairs**: F-01 8, F-02 12, F-03 13, F-04 10. This addendum supersedes the 42/42 count and pre-merge F-03 status in the historical §5A snapshot above; the PR #8 41/41 count remains historical.
- F-04 AC-F04-01–10 ↔ STS-F04-01–10 are specified in `contracts/f-04-registration-views.md`; all ten STS have Author-local execution evidence. WD-F04-01–04 remain the bounded requester-authorized defaults. Reviewer `cottonlnwza` recorded Approved for Implementation Only — Not Approved for Merge on exact specification HEAD `6c6b0275585c6bc3f44dfbcc37b9bb6c99318316`; implementation commit `24707ab05399536fd0e34c222a026be209683325` passed F-04 targeted 34/34, full regression 103/103 and build. This is not Formal APPROVE or Merge permission.
- F-03 is merged to `sprint_1_staging` through PR #15 at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`; Author post-merge local build and 69/69 test evidence is recorded in `docs/evidence/p1-05-f03.md`. No hosted CI or independent full PostgreSQL/Chrome rerun is claimed.
- Issue #6 is OPEN and Project #4 is at `PR Review` / Period 1. Branch `feature/p1-06-f04-registration-views` starts at `sprint_1_staging@86e1c4af8caef90b21546a4104808aa099af6cd9`. Implementation commit `24707ab05399536fd0e34c222a026be209683325` adds the API, UI, pagination helper and tests on the same branch/PR. No schema migration or Development DB destructive operation occurred. PR #20 remains OPEN/DRAFT/NOT MERGED.
- The full SRS and System SDS remain DRAFT / NOT GLOBALLY APPROVED. No instructor approval, `main` release or deployment is claimed.

## 6. Required updates at later checkpoints

1. **Current Sprint 1 working contract set:** 43 DRAFT AC / 43 matching AC-to-STS design pairs (8+12+13+10) are indexed in `docs/contracts/README.md`; historical PR #8 was 41/41 before PR #10 added F-02-12. F-02 implementation and reported test evidence are separately recorded under PR #14 / Issue #12. F-03 staging implementation acceptance and Author post-merge evidence are recorded under PR #15 / Issue #5. F-04 implementation is on the existing Issue #6 / PR #20 branch with 34/34 targeted tests, 103/103 full regression and build PASS (Author-local). PR #20 is still OPEN/DRAFT/NOT MERGED; final independent review, merge and post-merge verification are pending. This does not claim instructor approval or full-product sign-off.
2. **After each feature test execution:** Add actual `test file::test name`, build/test command, pass/fail/skipped count, tested commit SHA and reviewed PR/release. Never label a pending check PASS.
3. **D2:** Include all S2 AC and results, actual S3 implemented progress, deployed integration/regression checks, open defects, and approved baseline changes.
4. **Final:** Include complete FR/BR/NFR → Feature → Sprint → AC/verification → test file or measurement → result → **final released commit**; preserve rejected or incomplete requirements explicitly.

| Version | Date | Revision | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | Initial DRAFT full-baseline mapping; no actual test claims | Historical status at this version: pending both students |
| v0.1.1 | 2026-11-03 | R-01: NFR-06 verification explicitly splits Sprint 1 PR checks from Lab 5 hosted CI/CD | Historical status at this version: pending re-review |
| v0.1.2 | 2026-11-03 | PR #8 Reviewer R-01/R-02: map 39 Draft AC to matching planned STS in F-01-F-04, distinguish BR-07/08 from Sprint 2 BR-10, correct stale AC/STS status | Historical status: NOT APPROVED; no tests executed |
| v0.1.3 | 2026-11-03 | PR #8 Reviewer R-03: clarify F-02 ownership at Create/Publish, separate F-03 defensive Registration, add F-02 AC/STS-10/11 (41 pairs total); decisions remain OPEN | Historical status: NOT APPROVED; no tests executed |
| v0.1.4 | 2026-11-04 | PR #10 Reviewer R-04: add AC-F02-12 / STS-F02-12 to FR-03/FR-04/BR-01/BR-04/NFR-01; distinguish historical PR #8 41/41 from current 42/42; record F-01 local evidence separately from F-02-F-04 unexecuted STS | Historical status at this version: pending peer review; full SRS remains DRAFT / NOT APPROVED |
| v0.1.5 | 2026-11-05 | Issue #11 evidence reconciliation: PR #10 scoped acceptance and new F-02 implementation Issue #12; unchanged 42 AC/STS mapping and unexecuted F-02 status | Historical status at this version: pending Issue #11 review; global traceability remains DRAFT |
| v0.1.6 | 2026-11-06 | Issue #5 Specification-first: clarify FR-06 Participant-only browse proposal and distinguish mandatory capacity safety from provisional 10-request NFR-03 profile | Historical status at this version: pending independent Reviewer consideration; global traceability remains DRAFT |
| v0.1.7 | 2026-11-06 | PR #15 Reviewer R-01/R-02 corrections: two-stage F-03 decision gate and current F-02 PR #14 / Issue #12 implementation and reported evidence snapshot | Historical status at this version: pending PR #15 re-review; global traceability remains DRAFT |
| v0.1.8 | 2026-11-07 | Record exact-HEAD implementation-only authorization for DEC-11/12 and F-03 DEC-04 application; update F-03 local AC/STS execution status and preserve final review/merge gate | Historical status at this version: implementation-only authorization recorded; global traceability remains DRAFT |
| v0.1.9 | 2026-11-11 | Issue #6: update FR-08/09, BR-01/05, NFR-01/02 crosswalk for F-04 pagination AC/STS-10; reconcile current F-03 merged status and F-04 specification gate | Historical status at that revision: requester-authorized specification update; F-04 tests not executed; global traceability remains DRAFT |
| v0.2.0 | 2026-11-11 | Reconcile F-04 Reviewer Round 2 implementation-only approval, current Project #4 PR Review status and refreshed exact-HEAD gate after documentation-only update | Prior exact HEAD 8789d2dbeda3b5c0b090aa1d4c9454162da5ab53 approved for implementation only; refreshed confirmation required; global traceability remains DRAFT |
| v0.2.1 | 2026-11-11 | Record Reviewer Round 3 implementation-only gate on exact specification HEAD, F-04 local implementation commit, AC/STS execution and current PR #20 final-review/merge boundary | Author-local evidence only; PR #20 remains OPEN/DRAFT/NOT MERGED; global traceability remains DRAFT |
