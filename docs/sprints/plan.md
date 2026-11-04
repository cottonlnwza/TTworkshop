# TTworkshop — Three-Sprint Development Plan

> **DRAFT full-product Sprint Plan v0.1.2 — NOT GLOBALLY APPROVED — 2026-11-05 (Asia/Bangkok)** · [Issue #11 reconciliation](https://github.com/cottonlnwza/TTworkshop/issues/11)
> [P1-01 / Issue #1](https://github.com/cottonlnwza/TTworkshop/issues/1) · Deliverable 1 Part D (5 points).
> Feature IDs and requirements refer to the current `docs/features.md`, `docs/srs.md`, and `docs/traceability.md`; the historical planning table below records 2026-11-03 estimates, not live GitHub status. Team assignment, estimates and non-F-02 technical choices remain proposals.

## 1. Three-sprint outcomes

| Sprint | Product goal and included feature IDs | Dependencies | Required completion outcome / checkpoint |
|---|---|---|---|
| **Sprint 1 — Minimum useful release** | **F-01** Auth/Roles, **F-02** Workshop Draft/Publish, **F-03** Discovery/Capacity-Safe Registration, **F-04** Registration Views/Ownership. | P1-01 approved SRS/architecture/plan; P1-02 approved feature contracts; F-01 → F-02 → F-03 → F-04 integration | Locally runnable UI→API→durable DB journey, seeded accounts, business-rule rejection and backend role/ownership verification; reviewed staging→main release by **Sun 8 Nov 2026, 23:59** (D1). |
| **Sprint 2 — Core expansion** | **F-05** Cancellation, **F-06** Deadline/Manual Closure, **F-07** Workshop Editing/Capacity. | Released Sprint 1; feature-specific approved contracts; resolved cancellation, deadline and post-publication edit policies | All F-05–F-07 implemented, tested, reviewed, integrated by **Sun 29 Nov 2026** (D2). Lab 5/6/7 evidence tracked separately. |
| **Sprint 3 — Attendance & hardening** | **F-08** Check-in; **F-09** Filtering & Attendance Reporting; cross-feature regression, usability, errors and authorization. | F-03/05/07; event time policy; checked-in and reporting semantics; deployed delivery flow | At D2: **at least one meaningful F-08 workflow/rule implemented and tested** on deployed integrated main candidate, with S3 contracts and exact remaining list. Final complete/reviewed/tested/deployed product due **Sun 13 Dec 2026, 23:59**. |

The **SKILL Period** grouping is an operational work calendar, not identical to the three development sprints: **Period 2 includes Sprint 2 completion, labs and the start of F-08 (Sprint 3)**. F-08 stays the same feature if unfinished at 29 November, and must finish in Sprint 3; do not create a duplicate feature to hide carryover.

## 2. Sprint 1 — scope and dependency plan (3–8 November)

| Order | Planned Issue / work | Evidence before progressing | Current verified status (2026-11-03) |
|---|---|---|---|
| 1 | [P1-01 / #1](https://github.com/cottonlnwza/TTworkshop/issues/1) Engineering Baseline | Draft SRS, Features, Traceability, System SDS and this Sprint Plan; **both students approve** before any feature implementation | Draft documentation; approval **NOT VERIFIED** |
| 2 | [P1-02 / #2](https://github.com/cottonlnwza/TTworkshop/issues/2) F-01–F-04 Contracts | Reviewed Feature SDS, UI/API/data specs, uniquely identified AC, STS and DoD **before coding** | Backlog; **not part of P1-01** |
| 3 | [P1-03 / #3](https://github.com/cottonlnwza/TTworkshop/issues/3) F-01 | Real login/logout/current user/role tests, API & DB identity foundation, TDD evidence | Backlog |
| 4 | [P1-04 / #4](https://github.com/cottonlnwza/TTworkshop/issues/4) F-02 | Owned draft/publish and validation; forbidden role/owner attempts tested | Backlog |
| 5 | [P1-05 / #5](https://github.com/cottonlnwza/TTworkshop/issues/5) F-03 | Published browse + ACTIVE registration + DB capacity and duplicate checks, **concurrent last-seat** test | Backlog |
| 6 | [P1-06 / #6](https://github.com/cottonlnwza/TTworkshop/issues/6) F-04 | Own and owner-event registration retrieval, role/ownership tests, selected UI journey | Backlog |
| 7 | Integration and release gate (not an added Feature ID) | **From Sprint 1:** applicable build/automated-test checks for relevant PRs, commands/results/commit SHA; failed required checks **block** staging integration and release, even before Lab 5 hosted CI enforcement; substantive teammate review, integrated tests, reviewed staging→main release PR and local setup evidence | **NOT STARTED** |
| 8 | D1 self-contained PDF (separate assessment packaging) | Part A–F content and selected evidence directly embedded; page navigation, 2 students, repo/release, tests and process records | **NOT STARTED** |

### Current Period 1 forward-only reconciliation — 2026-11-05

The table above preserves the **original historical plan**; do not interpret its 2026-11-03 status column as today's actual GitHub state:

- [Issue #1](https://github.com/cottonlnwza/TTworkshop/issues/1) / [PR #7](https://github.com/cottonlnwza/TTworkshop/pull/7): reviewed/merged **DRAFT baseline preparation**, not global specification sign-off.
- [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) / [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8): reviewed/merged **DRAFT contracts**; planned STS are not the same as executed tests.
- [Issue #3](https://github.com/cottonlnwza/TTworkshop/issues/3) / [PR #9](https://github.com/cottonlnwza/TTworkshop/pull/9): F-01 implementation reviewed/merged, with separately recorded local testing evidence.
- [Issue #4](https://github.com/cottonlnwza/TTworkshop/issues/4) / [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10): **documentation-only** reviewed/merged/Author-verified; the F-02 feature itself remains incomplete. Do not open a second PR for #4.
- **[Extra Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11):** verify scoped F-02 working decisions and reconcile document status, mapping and evidence, with its own single reviewable PR.
- **[Extra Issue #12](https://github.com/cottonlnwza/TTworkshop/issues/12):** implement remaining F-02 Draft/Create/Update/Publish and execute AC/STS in its own PR after #11's scoped gate and separate authorization.
- Original [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) F-03 and [Issue #6](https://github.com/cottonlnwza/TTworkshop/issues/6) F-04 remain in the original backlog. New work sequence: **#11 → #12 → #5 → #6**, then appropriate integration/release gates.

**Acceptance boundary:** PR #10 explicitly accepted DEC-02/03/04/10-F02 as *scoped working choices* after peer merge and Author verification (both verified). This does not approve the whole SRS/System SDS or implement F-02. See [Issue #11 decision ledger](../decisions/p1-ex01-working-acceptance-ledger.md). Do not silently reset Kanban or edit historical Issues.

**Feasible short-horizon targets (PROPOSED; not completed):**

- **3–4 Nov:** P1-01 draft and joint decision/approval; draft P1-02 specs and verify the existing local staging-branch starting point.
- **4–6 Nov:** after individual Issue authorization, implement F-01/F-02 and F-03/F-04 in dependency-aware order with actual RED→GREEN, integration and role tests.
- **7 Nov:** complete cross-feature test/integration, substantive peer reviews, staging release check and reviewed staging→main PR.
- **8 Nov:** freeze tested release/version, reproducible setup, collect evidence, assemble one PDF and submit by 23:59.

This is a **high-risk compressed plan**, not a promise of completion. Delayed contract approvals, code review, race-condition fixes, and integration can make 8 November infeasible. Preserve real evidence and disclose remaining work or failing tests rather than bypass approval/test gates.

### Sprint 1 Definition of integration-ready (planning checklist, not Product DoD)

- Full end-to-end transaction through UI/API/database and read-back after persistence.
- Login/logout/current identity; at least two role permissions checked on the **backend**, including anonymous, wrong-role and cross-owner access.
- Publish rules, one ACTIVE registration, positive capacity, last-seat concurrency and deadline guards tested meaningfully.
- Feature AC ↔ STS/test mapping and real executed results on specified SHA; **PR build/test checks on relevant code PRs must pass; do not integrate/release a failed required check**; actual source/test commit/branch lineage.
- Issue → contracted change → feature branch from staging → teammate-reviewed PR into staging → integration → **separately reviewed** staging→main PR; recorded main release/tag.
- Local reproducible dependencies/migrations/seed/build/test demo instructions; Docker/GCP not required **yet**.

## 3. Period 2 / Sprint 2 and cross-cutting labs (9–29 November)

| Work slot (planned; no GitHub Issue exists yet) | Goal | Dependency / evidence |
|---|---|---|
| **P2-01 — Lab 5** | Docker, **hosted CI/CD automation and required-status-check enforcement** (including deliberate failed-check rejection), and GCP deployment of accepted Sprint 1. **Sprint 1 PR build/test gate already applies; Lab 5 must not be its first use.** | Actual Lab 5 handout, persistent DB configuration, reviewed pipeline/deploy; **due Sun 15 Nov** |
| **P2-02 — Lab 6** | Cross-team independent UAT: prepare/execute cases, triage defects, fix and independent re-test | Test fixed release/version; participation from other team; **due Sun 22 Nov** |
| **P2-03 — F-05** | Cancellation and correct persisted ACTIVE/CANCELLED state; review after eligibility/cancellation rule | F-03/04 and approved F-05 contract |
| **P2-04 — F-06** | Deadline and manual close/reopen; closure distinct from cancellation rights | F-05 plus policy and time boundary approval |
| **P2-05 — F-07** | Edit allowed workshop details and reject capacity reductions below ACTIVE count | F-02/03/06 plus post-publication edit policy |
| **P2-06 — Lab 7** | Instructor/TA-authorized maintenance change, impact analysis, RED→GREEN and regression metrics | Actual Lab 7 handout and **approved change**; **due Sun 29 Nov** |
| **P2-07 — F-08 initial Sprint 3 progress** | At least one real check-in domain workflow/rule implemented, verified and on deployed candidate (not placeholders) | F-03 and S3 contract, actual PR, tests and integration |

**D2 gate — Sun 29 Nov 23:59:** all Sprint 2 work complete; Sprint 3 contracts and meaningful F-08 tested implementation; integrated on `main` and **deployed on GCP** with matching SHA/CI run; regression, change log, traceability and bounded remaining-work plan. The standalone labs have their own rubrics/evidence. The actual Lab 5–7 handouts were **not provided here**; master specification supplies interim guidance only.

## 4. Period 3 / Sprint 3 and Final Delivery (30 Nov–13 Dec)

| Work slot (planned; no GitHub Issue exists yet) | Completion target | Evidence |
|---|---|---|
| **Carryover F-08** (only if necessary; do **not** duplicate original Issue) | Finish remaining check-in AC/tests including one-time/window/ownership and regressions | Actual F-08 contract/STS/PR/sha |
| **P3-01 — F-09 filtering** | Approved workshop/organizer filters with empty-state and access tests | F-09 scoped contract and reviewed feature PR |
| **P3-02 — F-09 attendance reporting** | Correct per-owner counts, checked-in, remaining, no-show and rate/zero-active guard | Seeded data assertions, report API/DB tests |
| **P3-03 — Final integration/regression/UAT** | Reverify all three sprints after defects/changes; independent Lab 6 UAT re-tests | Full test output on **final** SHA, ownership/security, known issue register |
| **P3-04 — Final GCP release** | Reviewed staging→main release, durable DB, post-deploy read-back and reproduction | App URL, version, CI and deployment evidence |
| **P3-05 — Final traceability/PDF/video** | Final SRS/features/SDS/all feature contracts, requirement-to-test actual results, one self-contained final PDF and both-student video | Due **Sun 13 Dec** at 23:59 |

**Examination window:** **1–11 Dec 2026** (COURSE). Aim to finish major domain work by 29 November and reserve December for bounded remaining work, regression, defects and final packaging. Substantial unfinished main workflows at D2 are a release-readiness risk.

**Final video handout conflict:** `project_final_delivery_v1.pdf` §2 says *at most 10 minutes* while §3.5 says *maximum 4 minutes*. Flag for instructor/TA clarification; using ≤4 minutes is a conservative draft option, **not** an assertion that the documents agree.

## 5. Delivery gates, roles and team collaboration

1. Jointly review and approve **P1-01** baseline; a draft file and Issue creation do not confer approval.
2. Version an approved **Feature Contract with AC/STS/DoD before implementing that feature**. Use TDD for meaningful domain rule/defect/change work; record actual test RED then GREEN.
3. One bounded Issue per authorized change. Local/remote branch must derive from current `sprint_N_staging`; feature PR targets staging. Teammate reviews with a concrete finding/reason; authors never approve or merge their own PR.
4. **From Sprint 1**, every relevant application PR has its applicable build/automated tests run and documented against the reviewed SHA; any failed required check blocks staging integration or normal release, including when only local logs and peer review are available before hosted CI. Run staging integration/system tests; a **separate reviewed** staging→main PR carries accepted release. **Lab 5** establishes hosted required checks/CI-CD and Docker/GCP deployment; record tag, commit, commands/tests and deployment evidence. Do not claim unconfigured automated branch protection.
5. Both students contribute to design, implementation, testing, review, AI supervision and release across the project. **Issue #1 GitHub Author: `cottonlnwza`; Reviewer: `thananun-7203`**, as designated by the user and checked for repository write permissions. Legal/student identity and both students' baseline approval are **NOT VERIFIED**; record review decisions before promotion to an approved baseline. Assign Author/Reviewer explicitly for later Issues.
6. Avoid adding scope without versioned approved change. Defects may need new bounded fix Issues; neither the proposed planned count (6/7/5) nor a deadline overrides safety/test/review requirements.

### Current branch / Kanban notes from read-only preflight

- Repository: `https://github.com/cottonlnwza/TTworkshop`; Project: `https://github.com/users/cottonlnwza/projects/4`.
- On 2026-11-03, remote `main` and **remote `sprint_1_staging`** were both verified at `9b27a17`. Local `docs/p1-01-engineering-baseline` also branched at that commit. This proposed plan is not evidence that the documentation branch has been pushed or its PR opened; check live Git history at each gate.
- P1-01–P1-06 existed on board; P1-01 lacked verified Period field while #2–#6 were `Backlog / Period 1` in the last read. Status may change; re-check live data at each gate.
- No PRs, tests, release or approval was verified at draft creation. **No completion claim follows from this document.**

## 6. Dependencies, review risks and contingency

| Risk | Potential impact | Proposed mitigation / evidence |
|---|---|---|
| Baseline approval or technical-stack decision delayed | Blocks later feature contracts/implementation | Two-student review, list unresolved items, preserve signed-off revision |
| Remote staging branch missing | PR cannot follow mandated staging route | Verify/create staging under separately authorized Git workflow; never feature PR directly to main |
| Concurrency capacity bug | Overbooking in Sprint 1 | Real concurrent DB integration test (10 requests/one seat proposed) and atomic constraint/lock |
| Unclear deadline/time zone/edit rules | Inconsistent eligibility, reporting or hidden scope creep | Resolve DEC-03/04/07/09 with team/TA before dependent contracts |
| Two-person reviews and exams | Schedule compression | Split bounded Issues, swap Author/Reviewer assignments, keep main workflows done by D2 |
| Cloud access/instructions delayed | Lab 5/D2 deployment blocked | Keep Docker-compatible design, report BLOCKED until actual instructions/resources |
| Evidence absent despite working UI | Assessment cannot verify claims | Save commands, actual output, screenshots, PR review, test IDs and release SHAs contemporaneously |

**Scope coverage check:** F-01–F-09 collectively cover FR-01–FR-15, BR-01–BR-16 and the seven important NFRs through SYS-01–SYS-05 as mapped in `docs/traceability.md`. Approval and implementation coverage are **NOT VERIFIED**.

| Version | Date | Change | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | Initial **DRAFT** three-sprint allocation and dependency plan | Pending both students |
| v0.1.1 | 2026-11-03 | R-01: separate Sprint 1 PR build/automated-test release gate from Lab 5 hosted CI/CD, Docker and GCP | Pending re-review and both students |
| v0.1.2 | 2026-11-05 | Issue #11 records verified post-2026-11-03 Issue/PR status and forward-only F-02 recovery #11 → #12 without rewriting historical plan or changing feature scope | Pending Issue #11 review; whole-product plan remains DRAFT |
