# P1-02 — Sprint 1 Feature Engineering Contracts (Deliverable 1 Part E)

> **DRAFT v0.1 — NOT APPROVED — 2026-11-03 (Asia/Bangkok)** · [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Period 1 · Author: `cottonlnwza` · Proposed peer Reviewer: `thananun-7203`
> All contracts are **proposals** based on `docs/srs.md`, `docs/features.md`, `docs/traceability.md` and `docs/system-sds.md` DRAFT v0.1.1 in the already peer-merged [PR #7](https://github.com/cottonlnwza/TTworkshop/pull/7). PR #7 approval was approval of a **Draft change**, not formal Product Baseline approval. No application code, migration, executable test or CI exists because of P1-02.

## 1. Scope and navigation (official Deliverable 1 Part E / master `8.2)

| Feature | Issue for later implementation | Contract | Requirement IDs from draft Feature Inventory | AC ↔ planned STS |
|---|---|---|---|---|
| **F-01** Auth/session/roles | [#3](https://github.com/cottonlnwza/TTworkshop/issues/3) | [f-01-auth.md](f-01-auth.md) | FR-01, FR-02; BR-01; NFR-01, NFR-07 | AC-F01-01–08 ↔ STS-F01-01–08 |
| **F-02** Organizer draft/publish | [#4](https://github.com/cottonlnwza/TTworkshop/issues/4) | [f-02-workshop-publish.md](f-02-workshop-publish.md) | FR-03–05; BR-01–04; NFR-01, NFR-02 | AC-F02-01–09 ↔ STS-F02-01–09 |
| **F-03** Published browse/atomic registration | [#5](https://github.com/cottonlnwza/TTworkshop/issues/5) | [f-03-discovery-registration.md](f-03-discovery-registration.md) | FR-06–07; BR-01, BR-04–08; NFR-01–03 | AC-F03-01–11 ↔ STS-F03-01–11 |
| **F-04** Registration visibility/ownership | [#6](https://github.com/cottonlnwza/TTworkshop/issues/6) | [f-04-registration-views.md](f-04-registration-views.md) | FR-08–09; BR-01, BR-05; NFR-01, NFR-02 | AC-F04-01–09 ↔ STS-F04-01–09 |

**Totals:** 37 uniquely identified Draft AC and 37 matching **planned, NOT EXECUTED** STS, each containing inputs/preconditions, expected outcomes and test level. Implementation Issues #3–#6 must add actual test filenames/commands/results/SHA. A list of planned tests **is not** proof they pass.

## 2. Contract architecture and cross-feature boundaries

All four follow the proposed `Browser UI → authenticated API/application service → durable relational DB` of System SDS, not a chosen/approved implementation stack. F-01's real role/session checks protect every other feature. F-02 owns Workshop DRAFT/PUBLISHED transitions. F-03 owns registration write invariants (active uniqueness, deadline/capacity, real-DB concurrency). F-04 only reads persisted registrations within Participant or Organizer ownership; it does **not** implement F-05 cancellation or F-08 check-in.

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
- [x] Unique AC and STS per feature, all AC linked to at least one planned STS, including auth, ownership, persistence, and real concurrent last-seat scenario.
- [x] Each contract includes a **NOT MET** Product/Feature DoD and explicit `OPEN` decisions.
- [ ] Reviewer checks consistency of all contracts with master specification sections 5 and 8 and Deliverable 1 Part E and leaves a substantive review on this Issue's PR.
- [ ] Both students approve the actual product baseline and affected contract decisions in a versioned record **before feature implementation**.
- [ ] Actual application code, tests, CI and release evidence — **OUT OF SCOPE** for this documentation Issue; require individually authorized subsequent Issues.

**Status:** `READY FOR DOCUMENTATION REVIEW`; **NOT READY FOR FEATURE IMPLEMENTATION**. Draft document PR may be peer-reviewed and merged to staging without implying the baseline or contracts are formally approved.

## 5. Version and peer-review history

| Revision | Date | Evidence/meaning | Decision |
|---|---|---|---|
| v0.1 | 2026-11-03 | P1-02 draft Feature SDS, proposed UI/API/data, AC/STS/DoD created before any feature code | **PENDING PEER REVIEW; FORMAL BASELINE/CONTRACT APPROVAL PENDING** |
