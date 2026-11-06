# P1-02 — Sprint 1 Feature Engineering Contracts (Deliverable 1 Part E)

> **DRAFT global baseline v0.1.5 — F-02 scoped working decisions accepted — 2026-11-06** · Original contracts [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Reconciliation [Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11), [acceptance ledger](../decisions/p1-ex01-working-acceptance-ledger.md) · F-03 proposal [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5)
> Current references: `docs/srs.md` DRAFT v0.1.7, `docs/features.md` DRAFT v0.1.5, `docs/traceability.md` DRAFT v0.1.6 and `docs/system-sds.md` DRAFT v0.1.4. Historical PR #8 authored 41/41 planned AC/STS; PR #10 peer-approved/merged the added F-02 AC/STS-12, bringing the set to 42 AC / 42 PLANNED STS. F-01 has separate merged implementation evidence (21/21 local application tests and local build PASS); this does not imply every planned F-01 STS was executed. F-02-F-04 STS remain unimplemented/unexecuted. This index is not instructor or full-product baseline approval.

## 1. Scope and navigation (Deliverable 1 Part E / master specification section 8.2)

| Feature | Issue for later implementation | Contract | Requirement IDs from draft Feature Inventory | AC ↔ planned STS |
|---|---|---|---|---|
| **F-01** Auth/session/roles | [#3](https://github.com/cottonlnwza/TTworkshop/issues/3) | [f-01-auth.md](f-01-auth.md) | FR-01, FR-02; BR-01; NFR-01, NFR-07 | AC-F01-01–08 ↔ STS-F01-01–08 |
| **F-02** Organizer draft/publish + BR-08 validation owner | **Implementation [#12](https://github.com/cottonlnwza/TTworkshop/issues/12)**; historical docs [#4](https://github.com/cottonlnwza/TTworkshop/issues/4) / [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) | [f-02-workshop-publish.md](f-02-workshop-publish.md) | FR-03–05; BR-01–04, **BR-08 Create/Publish**; NFR-01, NFR-02 | AC-F02-01–12 ↔ STS-F02-01–12 |
| **F-03** Published browse/atomic registration + BR-08 defensive read | [#5](https://github.com/cottonlnwza/TTworkshop/issues/5) | [f-03-discovery-registration.md](f-03-discovery-registration.md) | FR-06–07; BR-01, BR-04–08 (**default/fail-closed Registration only**); NFR-01–03; BR-10 manual closure deferred to F-05/F-06 (S2) | AC-F03-01–13 ↔ STS-F03-01–13 |
| **F-04** Registration visibility/ownership | [#6](https://github.com/cottonlnwza/TTworkshop/issues/6) | [f-04-registration-views.md](f-04-registration-views.md) | FR-08–09; BR-01, BR-05; NFR-01, NFR-02 | AC-F04-01–09 ↔ STS-F04-01–09 |

**Current totals:** 42 uniquely identified DRAFT AC and 42 matching planned STS (F-01: 8; F-02: 12; F-03: 13; F-04: 9), each containing inputs/preconditions, expected outcomes and test level. **Historical PR #8 total:** 41/41 (F-02 then had 11); PR #10 adds AC-F02-12 <-> STS-F02-12. F-02-F-04 STS are NOT IMPLEMENTED / NOT EXECUTED. F-01 has separate merged application evidence: 21/21 local tests and `npm run build` PASS on the verified staging merge SHA, but this index does not assert every planned F-01 STS was executed. Implementation must record test evidence in the **actual implementation Issue** (#3 for F-01, #12 for F-02, #5/#6 for F-03/F-04). Planned tests are not proof of passing tests.

## 2. Contract architecture and cross-feature boundaries

The architectural `Browser UI → authenticated API/application service → durable relational DB` pattern is documented in the **globally DRAFT System SDS**. **F-02 alone** has an **accepted scoped working stack choice** (DEC-10-F02/PR #10) to reuse the existing F-01 React/Express/PostgreSQL/`pg` implementation and server sessions; this does **not approve** a global stack/deployment policy for all features. F-01's real role/session checks protect every other feature. **F-02 owns BR-08 Create/Publish validation** as well as Workshop DRAFT/PUBLISHED transitions: independent Create **AC/STS-F02-10** and Publish **AC/STS-F02-11**. F-03 depends on a valid F-02 published workshop, owns registration invariants (**BR-07 eligibility, BR-08 absent-deadline default + defensive fail-closed for malformed persisted PUBLISHED data**, AC/STS-F03-12/13), ACTIVE uniqueness, capacity and real-DB concurrency. F-03 **does not own Create/Publish validation**. **Manual closure BR-10 belongs to Sprint 2 F-05/F-06**, including its own AC/STS in a later contract. F-04 reads persisted registrations within Participant or Organizer ownership; it does **not** implement F-05 cancellation or F-08 check-in. F-02 still has **no implementation or executed STS**; its implementation is Issue #12.

**Sprint 1 vertical-slice acceptance (plan, not a fifth Feature):** Organizer logs in → creates/publishes eligible Workshop → Participant logs in → sees published detail → creates one persisted ACTIVE registration → sees own registration → owning Organizer sees matching roster; negative tests reject duplicate/over-capacity/concurrent final seat/unauthorized ownership. This is not implemented or AC execution evidence. Relevant code PRs must show applicable build/automated tests on their SHA from Sprint 1; Lab 5 hosts CI/CD/Docker/GCP expansion (NFR-06).

## 3. Open decision and approval register — mandatory before relevant implementation

| Decision | Candidate / impact | Current approval status |
|---|---|---|
| DEC-01 | Seeded Participant/Organizer roles and session identity | TEAM-REPORTED in the DRAFT baseline; no instructor/full-product approval is claimed |
| DEC-02 | Workshop required fields, types/limits | **F-02 scoped working choice accepted**, PR #10 peer-approved/merged/Author-verified; global SRS remains DRAFT ([ledger](../decisions/p1-ex01-working-acceptance-ledger.md)) |
| DEC-03 / ARCH-04 | Partial DRAFT create/update and required fields at Publish; affects F-02 validation and AC/STS-F02-01/08/12 | **F-02 scoped working choice accepted** on the same PR #10 evidence; not yet implemented |
| DEC-04 / ARCH-03 | Canonical timestamps/timezone, default registration deadline and at-boundary eligibility; affects F-02/F-03 | **F-02 scoped working choice accepted** on PR #10 evidence; actual university timezone identifier remains config, no F-03 test claim |
| DEC-10 / ARCH-01/02/07 | React/Express/Postgres/pg and F-01 session reuse proposal; DB atomic strategy and runner depend on selection | **F-02 scoped working choice accepted** on PR #10 evidence; global GCP/CI architecture still not approved |
| DEC-11 | F-03 Participant-only published browse proposal: Anonymous `401`, Organizer `403`; no public/Organizer browse | **PROPOSED / NOT APPROVED; independent Reviewer decision pending** ([record](../decisions/dec-11-published-workshop-discovery-access.md)) |
| DEC-12 | NFR-03 10 concurrent Participants / one seat remains a proposed test profile; no-overbooking is the course-level invariant | **PROVISIONAL / NOT APPROVED; independent Reviewer decision pending** ([record](../decisions/dec-12-registration-concurrency-target.md)) |
| DEC-06 (future) | CANCELLED status history/visibility and re-registration later | **OPEN, F-05, not F-04 work** |
| DEC-13 | GitHub Author/Reviewer identities and scoped working-document acceptance | Author/reviewer identities are recorded. Scoped acceptance requires independent substantive peer APPROVE + actual merge into sprint_1_staging + Author post-merge verification; this is not instructor approval or full-product sign-off. |

The official course brief mandates capability outcomes, but **does not prescribe** endpoint spellings, session lifetime, JSON envelope, exact HTTP code taxonomy, ORM/DB or UI field limits. These remain **PROPOSED**, and any selected values must be reviewed/versioned before corresponding Issue #3–#6 implementation.

## 4. Review readiness and evidence boundaries

- [x] Feature-level workflows, validation, access, negative/boundary cases, dependencies and proposed UI/API/data contracts written for F-01–F-04.
- [x] 42 unique current DRAFT AC and 42 matching planned STS (F-01 8 / F-02 12 / F-03 13 / F-04 9), all AC linked to at least one planned STS, including F-02 DRAFT-only update AC/STS-F02-12, BR-08 Create vs Publish, F-03 independent fail-closed Registration, BR-07/08 deadline guards, auth, ownership, persistence and the planned real concurrent last-seat scenario. Historical PR #8 was 41/41 before PR #10.
- [x] Each contract includes a **NOT MET** Product/Feature DoD and explicit `OPEN` decisions.
- [ ] Reviewer checks consistency of all contracts with master specification sections 5 and 8 and Deliverable 1 Part E and leaves a substantive review on this Issue's PR.
- [ ] Scoped working-document acceptance is evidenced by independent substantive peer APPROVE, actual merge into `sprint_1_staging`, and Author post-merge verification. This does not assert instructor approval or full-product sign-off; unresolved decisions remain OPEN and must be resolved in their own versioned scope before dependent implementation.
- [ ] Actual application code, tests, CI and release evidence — **OUT OF SCOPE** for this documentation Issue; require individually authorized subsequent Issues.

**Status:** Historical PR #10 **APPROVED/MERGED/Author-verified**, establishing the scoped F-02 working choices, not full-product approval or working software. **Issue #11's reconciliation PR** still requires its own independent review/merge. The 42 planned STS have not all been executed; no instructor/global sign-off is claimed.

## 5. Version and peer-review history

| Revision | Date | Evidence/meaning | Decision |
|---|---|---|---|
| v0.1 | 2026-11-03 | P1-02 draft Feature SDS, proposed UI/API/data, AC/STS/DoD created before any feature code | Historical status at this version: formal baseline/contract approval pending |
| v0.1.1 | 2026-11-03 | Reviewer PR #8 R-01/R-02 corrections: separate F-03 BR-07/08 cases, defer BR-10, add two planned AC/STS, align parent draft status/traceability; fix heading code delimiter | Historical status at this version: pending re-review; no full-product approval claimed |
| v0.1.2 | 2026-11-03 | Reviewer R-03: assign F-02 BR-08 Create/Publish, split F-03 defensive Registration test, add 2 AC/STS; 41 total; correct Traceability Markdown and OPEN wording | Historical status at this version: pending re-review; no full-product approval claimed |
| v0.1.3 | 2026-11-04 | Reviewer PR #10 R-04: index F-02 AC/STS-01-12 and current 42/42 totals; reconcile decision register and scoped working acceptance; link current Traceability/Feature versions; separate F-01 local evidence from F-02-F-04 planned STS | PENDING PEER REVIEW; full-product baseline remains DRAFT / NOT APPROVED |
| v0.1.4 | 2026-11-05 | Issue #11 reconciliation: distinguish PR #10 verified peer-merge/Author check from global baseline approval; direct remaining F-02 implementation to #12; preserve original contracts and test IDs | Pending Issue #11 peer review; no global/instructor sign-off |
| v0.1.5 | 2026-11-06 | Issue #5 Specification-first: add DEC-11/12 proposal records and clarify F-03 Participant-only browse and provisional concurrency profile; no AC/STS count change | Pending independent Reviewer consideration; no global/instructor sign-off |
