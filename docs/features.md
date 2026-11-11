# TTworkshop — Feature Inventory

> **DRAFT global inventory v0.1.9 — NOT GLOBALLY APPROVED — 2026-11-11** · Historical [#1](https://github.com/cottonlnwza/TTworkshop/issues/1) / [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) · Reconciliation [#11](https://github.com/cottonlnwza/TTworkshop/issues/11) · Deliverable 1 Part B
> Scope source: `docs/srs.md` (draft FR-01–FR-15, BR-01–BR-16, NFR-01–NFR-07). Feature IDs/sprints follow the **proposed** three-period allocation described in `SKILL.md` v1.3.1 §3; that plan does not itself approve product requirements.

## 1. Feature register

| Feature | Product capability and planned boundary | Linked requirements | Sprint | Dependencies | Tracking |
|---|---|---|---|---|---|
| **F-01 – Authentication & role authorization** | Login/logout/current identity; Participant/Organizer backend permissions, seeded identities. | FR-01, FR-02; BR-01; NFR-01, NFR-07 | **1** | Peer-reviewed working SRS/SDS and auth contract | [P1-03 #3](https://github.com/cottonlnwza/TTworkshop/issues/3) |
| **F-02 – Workshop draft & publication** | Organizer creates owned DRAFT, views owned workshops, updates only the same owned DRAFT while it remains DRAFT, and publishes an eligible workshop; **owns BR-08 validation when a configured deadline exceeds start on Create and on Publish (separate checks)**; no edit after PUBLISHED in this scope. | FR-03, FR-04, FR-05; BR-01, BR-02, BR-03, BR-04, **BR-08**; NFR-01, NFR-02 | **1** | F-01; DEC-02/03/04/10 accepted as F-02 scoped working choices in PR #10, reconciled in #11 | **[P1-EX02 #12](https://github.com/cottonlnwza/TTworkshop/issues/12) implementation**; historical [#4](https://github.com/cottonlnwza/TTworkshop/issues/4)/[PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) docs |
| **F-03 — Discovery & registration** | Participant browses published workshops and creates ACTIVE registration; **BR-07 time eligibility, BR-08 absent-deadline default and fail-closed Registration if persisted deadline invalid**, uniqueness and **atomic last-seat capacity**. **Does not validate Create/Publish (F-02 owns those). BR-10 manual closure belongs to F-05/F-06 in S2.** | FR-06, FR-07; BR-01, BR-04, BR-05, BR-06, BR-07, BR-08; NFR-01, NFR-02, NFR-03 | **1** | F-01/F-02; DEC-04 application, DEC-11 and DEC-12 accepted for scoped F-03 staging delivery through PR #15; no global approval | [P1-05 #5](https://github.com/cottonlnwza/TTworkshop/issues/5) |
| **F-04 — Registration views & ownership** | Participant retrieves own registration; owning Organizer inspects registrants; privacy-minimized DTO, stable cursor pagination and private-record access enforced server-side. | FR-08, FR-09; BR-01, BR-05; NFR-01, NFR-02 | **1** | F-01/F-02/F-03 | [P1-06 #6](https://github.com/cottonlnwza/TTworkshop/issues/6) / [PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20) — implemented locally; F-04 tests/build PASS; final review and staging merge pending |
| **F-05 — Cancellation** | Timely self-cancellation of ACTIVE record, retained cancelled status/history, authorized re-registration as applicable. | FR-10; BR-01, BR-09, BR-10, BR-12; NFR-01, NFR-02 | **2** | F-03/F-04; closure/cancellation rule resolution | Planned **P2-03** (Issue not yet created) |
| **F-06 — Deadline & manual closure** | Organizer configures eligible deadline and manually closes/reopens registration while keeping cancellation semantics distinct. | FR-11; BR-01, BR-07, BR-08, BR-10, BR-11; NFR-01, NFR-02 | **2** | F-02/F-03/F-05; edit/deadline policy | Planned **P2-04** (Issue not yet created) |
| **F-07 — Workshop editing & capacity** | Owner updates allowable workshop attributes/capacity, rejecting capacity below ACTIVE count and invalid transitions. | FR-12; BR-01, BR-02, BR-03, BR-08, BR-13, BR-16; NFR-01, NFR-02 | **2** | F-02/F-03/F-06; open policy on published-event edits | Planned **P2-05** (Issue not yet created) |
| **F-08 — Check-in** | Owner records one eligible attendance check-in within approved workshop window, persisted and testable. | FR-13; BR-01, BR-14; NFR-01, NFR-02 | **3** (start progress in Period 2) | F-03/F-05/F-07; start/end time policy | Planned **P2-07**, carry over to Period 3 **if unfinished** |
| **F-09 — Filtering & attendance reporting** | Useful filters and accurate owner-only workshop attendance/seat summary; one feature may have multiple scoped Issues. | FR-14, FR-15; BR-01, BR-15; NFR-01, NFR-04, NFR-05 | **3** | F-05/F-08; metric and filter scope confirmation | Planned **P3-01** filtering + **P3-02** attendance report |

**Numbering note:** F-09 is a **single feature** with two proposed implementation Issues. F-08 remains the **same** feature if its Sprint 3 work continues after the D2 progress checkpoint. Do not silently create a replacement feature or duplicate Issue.

## 2. Cross-cutting system responsibilities

| Responsibility ID | Scope | Linked requirements | First establishment / verification |
|---|---|---|---|
| **SYS-01 — Persistent relational data** | Schema, migrations, constraints, seed; durability through restart and later redeploy. | NFR-02; domain BR-05/06/13 as applicable | Sprint 1 (F-02/F-03/F-04); Lab 5/GCP verification |
| **SYS-02 — Secure identity, ownership & configuration** | Auth middleware, server-side role/owner checks, hashing, safe secrets/config. | BR-01, NFR-01, NFR-07 | Sprint 1 (F-01); new-path regressions every sprint |
| **SYS-03 — Transaction & concurrency verification** | Database-atomic registration seat allocation and repeatable concurrent test. | BR-05, BR-06, NFR-03 | Sprint 1 (F-03); regression later |
| **SYS-04 — Versioned engineering & delivery** | Issue → contract/test design → branch → teammate-reviewed PR → staging → reviewed release. **Starting Sprint 1**, run applicable build and automated tests on relevant PRs; retain tested SHA/results and **block integration/release if any required check fails**, using documented peer-review evidence until hosted enforcement is configured. **Lab 5 expands** to hosted CI required-check enforcement, Docker and GCP deployment; do not defer the Sprint 1 PR quality gate. | NFR-06 | Sprint 1 PR quality checks and documented release gate; Lab 5 automated CI/CD + Docker/GCP; regress Sprints 2–3 |
| **SYS-05 — Performance/responsive verification** | Workshop list load measurements and responsive critical screens. | NFR-04, NFR-05 | Sprint 3 (F-09 and cross-feature UI), measured against approved targets |

These responsibilities are **not additional product features** or a license to add unrelated functionality. Cross-cutting requirements may map to both a Feature and SYS responsibility.

## 3. Dependencies and minimum vertical slice

```text
P1-01 baseline review ──> P1-02 (F-01–F-04 pre-implementation contracts)
                             |
                             v
F-01 auth ──> F-02 publish ──> F-03 discover/register ──> F-04 retrieve/owner view
                   |                   |
                   +──> F-07 edit      +──> F-05 cancel ──> F-06 deadline/closure
                                     (policy dependencies may overlap; resolve first)
F-03/F-05/F-07 ──> F-08 check-in ──> F-09 attendance reporting
F-02/F-03 ─────────────────────────> F-09 filtering
```

The expected **Sprint 1 integrated journey** is Organizer publish → Participant browse/register → Participant view saved registration → owning Organizer view registrants, with backend rejection of an invalid/duplicate/last-seat-race case and forbidden access. Authentication alone or generic CRUD is insufficient (COURSE).

## 4. Sprint allocation and assessment boundaries

| Checkpoint | Required feature progress | Assessment/process work (not new product feature) |
|---|---|---|
| **Sprint 1 / D1, 2026-11-08** | F-01–F-04 complete, tested and locally runnable. | P1-01 SRS/Features/Traceability/SDS/Plan; P1-02 contracts/AC/STS/DoD; **relevant PR build/automated-test evidence and failed-check exclusion**, Issue/PR/release evidence. No GCP requirement yet. |
| **Period 2 / D2, 2026-11-29** | F-05–F-07 fully complete; **real implemented and tested F-08 progress** integrated on main. | Lab 5 Docker/CI/GCP (Nov 15), Lab 6 UAT (Nov 22), Lab 7 maintenance (Nov 29); fully deployed candidate/traceability. |
| **Sprint 3 / Final, 2026-12-13** | Complete remaining F-08 and F-09 plus cross-feature validation/usability/error handling. | Final regression/UAT re-tests, Docker/GCP accepted release, self-contained PDF, demo video. |

## 5. Change and coverage controls

- **Current planned feature inventory:** F-01-F-09. **Current approved feature inventory:** NOT VERIFIED; full-product baseline/instructor approval is not claimed. Scoped working-document acceptance follows independent peer APPROVE, staging merge and Author post-merge verification.
- Draft `FR/BR/NFR → feature/responsibility → sprint → planned verification` coverage is explicit in `docs/traceability.md`; approved changes must update both files together while preserving change history.
- **Approval scope matters:** F-02's draft-field completeness (DEC-02/03), deadline/time-zone policy (DEC-04) and reuse of the F-01 stack (DEC-10-F02) are **accepted scoped working choices** under PR #10, after peer approval, merge and Author verification. Those scoped decisions are distinct from implementation evidence: F-02 implementation was subsequently delivered by Issue #12 / PR #14 and merged to staging; F-03 implementation was delivered by Issue #5 / PR #15 and merged to staging. The **full-product SRS/SDS and inventory remain DRAFT / NOT APPROVED**. F-04 registration-view decisions and later-feature decisions on cancellation, manual closure, post-publication editing, registration history UI, exact filters, NFR targets and deployment remain OPEN wherever separately required; F-03 public-browse and registration-eligibility scoped acceptance does not imply global approval.
- This inventory is **not** a feature-level contract itself. The current DRAFT design inventory is **43 AC / 43 matching AC-to-STS pairs**: F-01 8, F-02 12, F-03 13 and F-04 10. Historical counts are preserved: PR #8 recorded 41/41 before F-02-12; PR #10 added F-02-12 and brought the inventory to 42/42; Issue #6 added F-04-10 and brought the current design inventory to 43/43. The current index and crosswalk are recorded in docs/contracts/README.md and docs/traceability.md. These are design mappings, not proof that every STS has been executed.
- **F-01:** implementation is merged to sprint_1_staging; its evidence records 21/21 local application tests and local build PASS on merge SHA 21e9d9de83ccef24214484ab159a83d398f544b3. This is not hosted CI and does not imply every planned F-01 STS was executed.
- **F-02:** implementation is delivered under Issue #12 / PR #14 and merged to sprint_1_staging at d99d67062d7a2869e4fc49de39fc634da03c2f78. The Author post-merge ledger reports build/migration PASS and 48/48 tests; independent Reviewer rerun limitations are documented in docs/contracts/README.md. It is no longer documentation-only.
- **F-03:** implementation is delivered under Issue #5 / PR #15 and merged to sprint_1_staging at c6d87c80b8a0887591e80f93f6cbe24897cc07b9. Author post-merge local evidence records build PASS and 69/69 tests (including 21/21 F-03 cases); this is not hosted CI or an independent Reviewer rerun.
- **F-04:** Independent Reviewer cottonlnwza recorded Approved for Implementation Only — Not Approved for Merge on exact PR #20 specification HEAD 6c6b0275585c6bc3f44dfbcc37b9bb6c99318316; Author verified the distinct identity and SHA. Implementation commit 24707ab05399536fd0e34c222a026be209683325 contains the API/UI and tests; targeted F-04 tests passed 34/34 on that commit. Full suite 103/103 (13 files) and build PASS were run on exact pre-documentation PR HEAD a31edc0579f254a6bb1b9ebbe10b7b4875a7d2fb. All are Author-local. PR #20 remains OPEN/NOT MERGED; independent final review pending; Formal APPROVE and staging integration remain pending. F-05-F-09 contracts remain future work.
- The full-product SRS, System SDS and feature inventory remain DRAFT / NOT GLOBALLY APPROVED. No instructor approval, main release or deployment is claimed.

### Current Issue #6 scoped status — 2026-11-11

- F-03 is implemented and accepted on `sprint_1_staging` through PR #15 / Issue #5; Author post-merge local build and 69/69 test evidence is recorded in `docs/evidence/p1-05-f03.md`. This does not claim hosted CI or independent Reviewer reruns of the PostgreSQL/Chrome suite.
- F-04 implementation is on the existing Issue #6 / PR #20 branch. Reviewer Round 3 approved implementation only on specification HEAD 6c6b0275585c6bc3f44dfbcc37b9bb6c99318316; this is not Formal APPROVE or Merge permission. WD-F04-01–04 remain the bounded requester-authorized defaults.
- Implementation commit 24707ab05399536fd0e34c222a026be209683325: F-04 targeted 34/34 tests (Author-local). Full regression 103/103 across 13 files and npm run build PASS on exact pre-documentation PR HEAD a31edc0579f254a6bb1b9ebbe10b7b4875a7d2fb (Author-local). No schema migration or Development DB destructive operation. PR #20 remains OPEN/NOT MERGED; independent final review pending; final peer review and staging integration are pending. No global SRS/SDS approval, instructor approval, main release or deployment is claimed.

| Version | Date | Reason | Approval |
|---|---|---|---|
| v0.1.9 | 2026-11-11 | Issue #6 implementation evidence reconciliation: distinguish targeted F-04 test SHA from full-regression/build SHA; preserve final review and staging gates | Author-local evidence only; global inventory remains DRAFT / not instructor-approved |
| v0.1.8 | 2026-11-11 | Issue #6: reconcile Reviewer Round 3 implementation-only gate on exact spec HEAD; record F-04 local implementation commit and Author test/build evidence while preserving final review/merge gates | Implementation-only authorization only; global inventory remains DRAFT / not instructor-approved |
| v0.1 | 2026-11-03 | Initial DRAFT inventory from Theme 3 and proposed period plan | Historical status at this version: pending both students |
| v0.1.1 | 2026-11-03 | R-01: separate Sprint 1 PR checks (SYS-04) from Lab 5 hosted CI/CD, Docker and GCP | Historical status at this version: pending re-review |
| v0.1.2 | 2026-11-03 | PR #8 Reviewer R-01/R-02: clarify F-03 BR-07/08 vs deferred BR-10; link newly drafted P1-02 AC/STS (39 each); feature allocation unchanged | Historical status: NOT APPROVED; contracts unexecuted |
| v0.1.3 | 2026-11-03 | PR #8 Reviewer R-03: assign BR-08 Create/Publish to F-02, F-03 only deadline default and fail-closed Registration; update count to 41 AC/STS | Historical status: NOT APPROVED; contracts unexecuted |
| v0.1.4 | 2026-11-04 | PR #10 Reviewer R-04: add F-02 DRAFT-only update to feature boundary; align current 42/42 AC/STS index and distinguish historical PR #8 counts from F-01 implementation evidence and F-02-F-04 unexecuted plans | PENDING PEER REVIEW; feature inventory remains DRAFT / NOT APPROVED |
| v0.1.5 | 2026-11-05 | Issue #11 record scoped F-02 DEC choices and reroute remaining implementation to #12; no feature or requirement added | Pending Issue #11 review; global inventory still DRAFT |
| v0.1.6 | 2026-11-11 | Issue #6 specification-first: record privacy-minimized Organizer roster, cursor pagination, read-only API DTO and HTTP error defaults; no new FR/BR/NFR | Historical status at that revision: requester-authorized specification update; later Reviewer Round 2 approval is recorded separately; global inventory remains DRAFT |
| v0.1.7 | 2026-11-11 | Reconcile F-04 Reviewer Round 2 implementation-only approval and current exact-HEAD re-review requirement after this documentation-only update | Prior exact HEAD `8789d2dbeda3b5c0b090aa1d4c9454162da5ab53` approved for implementation only; refreshed exact-HEAD confirmation required; global inventory remains DRAFT |
