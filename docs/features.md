# TTworkshop — Feature Inventory

> **DRAFT v0.1.2 — NOT APPROVED — 2026-11-03** · Issue [P1-01 / #1](https://github.com/cottonlnwza/TTworkshop/issues/1) · P1-02 reference update on [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8) · Deliverable 1 Part B
> Scope source: `docs/srs.md` (draft FR-01–FR-15, BR-01–BR-16, NFR-01–NFR-07). Feature IDs/sprints follow the **proposed** three-period allocation described in `SKILL.md` v1.3.1 §3; that plan does not itself approve product requirements.

## 1. Feature register

| Feature | Product capability and planned boundary | Linked requirements | Sprint | Dependencies | Tracking |
|---|---|---|---|---|---|
| **F-01 — Authentication & role authorization** | Login/logout/current identity; Participant/Organizer backend permissions, seeded identities. | FR-01, FR-02; BR-01; NFR-01, NFR-07 | **1** | Approved SRS/SDS and auth contract | [P1-03 #3](https://github.com/cottonlnwza/TTworkshop/issues/3) |
| **F-02 — Workshop draft & publication** | Organizer creates owned draft, publishes eligible workshop, views own workshops; no full edit workflow yet. | FR-03, FR-04, FR-05; BR-01, BR-02, BR-03, BR-04; NFR-01, NFR-02 | **1** | F-01; decisions on mandatory draft/publish fields | [P1-04 #4](https://github.com/cottonlnwza/TTworkshop/issues/4) |
| **F-03 — Discovery & registration** | Participant browses published workshops and creates ACTIVE registration, with **BR-07 time eligibility and BR-08 default/configured deadline validation tested independently**, uniqueness and **atomic last-seat capacity**. **BR-10 manual closure belongs to F-05/F-06 in S2**, not this Sprint 1 contract. | FR-06, FR-07; BR-01, BR-04, BR-05, BR-06, BR-07, BR-08; NFR-01, NFR-02, NFR-03 | **1** | F-01/F-02; DEC-04 time/deadline policy still OPEN | [P1-05 #5](https://github.com/cottonlnwza/TTworkshop/issues/5) |
| **F-04 — Registration views & ownership** | Participant retrieves own registration; owning Organizer inspects registrants; private data enforced server-side. | FR-08, FR-09; BR-01, BR-05; NFR-01, NFR-02 | **1** | F-01/F-02/F-03 | [P1-06 #6](https://github.com/cottonlnwza/TTworkshop/issues/6) |
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

- **Current planned feature inventory:** F-01–F-09. **Current approved feature inventory:** **NOT VERIFIED** (no joint approval evidence in repository).
- Draft `FR/BR/NFR → feature/responsibility → sprint → planned verification` coverage is explicit in `docs/traceability.md`; approved changes must update both files together while preserving change history.
- Open SRS decisions, especially draft-field completeness, deadlines and time zone, post-publication editing, registration history UI, exact filters and NFR numbers, remain **unresolved**; any feature depending on them is **not ready to implement** until specified.
- This inventory is **not** a feature-level contract itself. P1-02 [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8) now contains **DRAFT / NOT APPROVED** Feature SDS, UI/API/data, **39 AC ↔ 39 planned STS** and DoD for F-01–F-04 in [`docs/contracts/README.md`](contracts/README.md); STS are **NOT IMPLEMENTED / NOT EXECUTED**. F-05–F-09 contracts remain future work. See `docs/traceability.md` for explicit requirement-to-AC/STS references.

| Version | Date | Reason | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | Initial **DRAFT** inventory from Theme 3 and proposed period plan | Pending both students |
| v0.1.1 | 2026-11-03 | R-01: separate Sprint 1 PR checks (SYS-04) from Lab 5 hosted CI/CD, Docker and GCP | Pending re-review and both students |
| v0.1.2 | 2026-11-03 | PR #8 Reviewer R-01/R-02: clarify F-03 BR-07/08 vs deferred BR-10; link newly drafted P1-02 AC/STS (39 each); feature allocation unchanged | **NOT APPROVED; contracts unexecuted** |
