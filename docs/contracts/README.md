# P1-02 — Sprint 1 Feature Engineering Contracts (Deliverable 1 Part E)

> **DRAFT v0.1.2 — NOT APPROVED — 2026-11-03 (Asia/Bangkok)** · [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Period 1 · Author: `cottonlnwza` · Proposed peer Reviewer: `thananun-7203`
> All contracts are **proposals** based on `docs/srs.md`, `docs/features.md`, `docs/traceability.md` DRAFT v0.1.3 (review-status and cross-reference corrections) and `docs/system-sds.md` DRAFT v0.1.1. PR #7 approval was approval of a **Draft change**, not formal Product Baseline approval. No application code, migration, executable test or CI exists because of P1-02.

## 1. Scope and navigation (Deliverable 1 Part E / master specification section 8.2)

| Feature | Issue for later implementation | Contract | Requirement IDs from draft Feature Inventory | AC ↔ planned STS |
|---|---|---|---|---|
| **F-01** Auth/session/roles | [#3](https://github.com/cottonlnwza/TTworkshop/issues/3) | [f-01-auth.md](f-01-auth.md) | FR-01, FR-02; BR-01; NFR-01, NFR-07 | AC-F01-01–08 ↔ STS-F01-01–08 |
| **F-02** Organizer draft/publish + BR-08 validation owner | [#4](https://github.com/cottonlnwza/TTworkshop/issues/4) | [f-02-workshop-publish.md](f-02-workshop-publish.md) | FR-03–05; BR-01–04, **BR-08 Create/Publish**; NFR-01, NFR-02 | AC-F02-01–11 ↔ STS-F02-01–11 |
| **F-03** Published browse/atomic registration + BR-08 defensive read | [#5](https://github.com/cottonlnwza/TTworkshop/issues/5) | [f-03-discovery-registration.md](f-03-discovery-registration.md) | FR-06–07; BR-01, BR-04–08 (**default/fail-closed Registration only**); NFR-01–03; BR-10 manual closure deferred to F-05/F-06 (S2) | AC-F03-01–13 ↔ STS-F03-01–13 |
| **F-04** Registration visibility/ownership | [#6](https://github.com/cottonlnwza/TTworkshop/issues/6) | [f-04-registration-views.md](f-04-registration-views.md) | FR-08–09; BR-01, BR-05; NFR-01, NFR-02 | AC-F04-01–09 ↔ STS-F04-01–09 |

**Totals:** 41 uniquely identified Draft AC and 41 matching **planned, NOT EXECUTED** STS (F-01: 8; F-02: 11; F-03: 13; F-04: 9), each containing inputs/preconditions, expected outcomes and test level. Implementation Issues #3–#6 must add actual test filenames/commands/results/SHA. A list of planned tests **is not** proof they pass.

## 2. Contract architecture and cross-feature boundaries

All four follow the proposed `Browser UI → authenticated API/application service → durable relational DB` of System SDS, not a chosen/approved implementation stack. F-01's real role/session checks protect every other feature. **F-02 owns BR-08 Create/Publish validation** as well as Workshop DRAFT/PUBLISHED transitions: independent Create **AC/STS-F02-10** and Publish **AC/STS-F02-11**. F-03 depends on a valid F-02 published workshop, owns registration invariants (**BR-07 eligibility, BR-08 absent-deadline default + defensive fail-closed for malformed persisted PUBLISHED data**, AC/STS-F03-12/13), ACTIVE uniqueness, capacity and real-DB concurrency. F-03 **does not own Create/Publish validation**. **Manual closure BR-10 belongs to Sprint 2 F-05/F-06**, including its own AC/STS in a later contract. F-04 reads persisted registrations within Participant or Organizer ownership; it does **not** implement F-05 cancellation or F-08 check-in.

**Sprint 1 vertical-slice acceptance (plan, not a fifth Feature):** Organizer logs in → creates/publishes eligible Workshop → Participant logs in → sees published detail → creates one persisted ACTIVE registration → sees own registration → owning Organizer sees matching roster; negative tests reject duplicate/over-capacity/concurrent final seat/unauthorized ownership. This is not implemented or AC execution evidence. Relevant code PRs must show applicable build/automated tests on their SHA from Sprint 1; Lab 5 hosts CI/CD/Docker/GCP expansion (NFR-06).

## 3. Open decision and approval register — mandatory before relevant implementation

| Decision | Candidate / impact | Current approval status |
|---|---|---|
| DEC-01 | Seeded Participant/Organizer roles and session identity | TEAM-REPORTED; **PENDING BOTH STUDENTS** |
| DEC-02 | Workshop required fields, types/limits | TEAM-REPORTED; **PENDING BOTH STUDENTS** |
| DEC-03 / ARCH-04 | Partial DRAFT allowed? Which fields required at create vs publish? Affects F-02 migrations/validation/AC-F02-08 | **OPEN; BLOCKS F-02 CONTRACT FINALIZATION** |
| DEC-04 / ARCH-03 | Canonical timestamps/timezone, default registration deadline and at-boundary eligibility; affects F-02/F-03 | **OPEN; BLOCKS FINAL F-03 CLOCK TEST** |
| DEC-10 / ARCH-01/02/07 | React/Express/Postgres/ORM and server session/cookie/CSRF are *proposed only*; DB atomic strategy and runner depend on selection | **OPEN; BLOCKS FEATURE IMPLEMENTATION** |
| DEC-11 | Anonymous and Organizer browse access to published Workshop | **OPEN; default deny pending team approval** |
| DEC-12 | NFR-03 10-concurrent-request target is provisional, course mandates race safety | **PENDING; KEEP 10 AS PROPOSED TEST INPUT** |
| DEC-06 (future) | CANCELLED status history/visibility and re-registration later | **OPEN, F-05, not F-04 work** |
| DEC-13 | GitHub Author/Reviewer identities for P1-02 | User authorized `cottonlnwza` Developer and `thananun-7203` reviewer; accounts checked. **Not formal baseline approval.** |

The official course brief mandates capability outcomes, but **does not prescribe** endpoint spellings, session lifetime, JSON envelope, exact HTTP code taxonomy, ORM/DB or UI field limits. These remain **PROPOSED**, and any selected values must be reviewed/versioned before corresponding Issue #3–#6 implementation.

## 4. Review readiness and evidence boundaries

- [x] Feature-level workflows, validation, access, negative/boundary cases, dependencies and proposed UI/API/data contracts written for F-01–F-04.
- [x] 41 unique Draft AC and 41 planned STS, all AC linked to at least one planned STS, including **F-02 BR-08 Create vs Publish**, **F-03 independent fail-closed Registration**, BR-07/08 deadline guards, auth, ownership, persistence and the planned real concurrent last-seat scenario.
- [x] Each contract includes a **NOT MET** Product/Feature DoD and explicit `OPEN` decisions.
- [ ] Reviewer checks consistency of all contracts with master specification sections 5 and 8 and Deliverable 1 Part E and leaves a substantive review on this Issue's PR.
- [ ] Both students approve the actual product baseline and affected contract decisions in a versioned record **before feature implementation**.
- [ ] Actual application code, tests, CI and release evidence — **OUT OF SCOPE** for this documentation Issue; require individually authorized subsequent Issues.

**Status:** `READY FOR DOCUMENTATION REVIEW`; **NOT READY FOR FEATURE IMPLEMENTATION**. Draft document PR may be peer-reviewed and merged to staging without implying the baseline or contracts are formally approved.

## 5. Version and peer-review history

| Revision | Date | Evidence/meaning | Decision |
|---|---|---|---|
| v0.1 | 2026-11-03 | P1-02 draft Feature SDS, proposed UI/API/data, AC/STS/DoD created before any feature code | **PENDING PEER REVIEW; FORMAL BASELINE/CONTRACT APPROVAL PENDING** |
| v0.1.1 | 2026-11-03 | Reviewer PR #8 R-01/R-02 corrections: separate F-03 BR-07/08 cases, defer BR-10, add two planned AC/STS, align parent draft status/traceability; fix heading code delimiter | **PENDING RE-REVIEW; NO FORMAL BASELINE/CONTRACT APPROVAL** |
| v0.1.2 | 2026-11-03 | Reviewer R-03: assign F-02 BR-08 Create/Publish, split F-03 defensive Registration test, add 2 AC/STS; 41 total; correct Traceability Markdown and OPEN wording | **PENDING RE-REVIEW; NO FORMAL BASELINE/CONTRACT APPROVAL** |
