# TTworkshop — Software Requirements Specification (SRS)

> **DRAFT full-product SRS v0.1.9 — NOT GLOBALLY APPROVED — 2026-11-09 (Asia/Bangkok)** · [Issue #11 reconciliation](https://github.com/cottonlnwza/TTworkshop/issues/11) · F-03 [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5)
> Issue: [P1-01 / #1](https://github.com/cottonlnwza/TTworkshop/issues/1) · Theme 3: Event Registration and Attendance System
> **Purpose:** Engineering baseline for the full product (Deliverable 1, Part A). Status statements below distinguish implemented feature evidence from proposed/unimplemented scope; this draft does not assert full-product completion or release.
> **Working-document acceptance:** A scoped document change is accepted as the team's working version after substantive independent teammate **APPROVE** and actual merge into the relevant sprint staging branch, followed by the Author's post-merge verification. No additional bilateral formal approval ceremony is required for that scoped working acceptance. This does **not** constitute instructor approval, approval of every unresolved product decision, or full-product sign-off; unresolved decisions remain explicitly OPEN/PROPOSED.
> **Verified F-02 scope:** [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) received scoped peer APPROVE, staging merge and Author verification for DEC-02/03/04/10-F02. F-02 implementation was subsequently peer-approved and merged by [PR #14](https://github.com/cottonlnwza/TTworkshop/pull/14) for [Issue #12](https://github.com/cottonlnwza/TTworkshop/issues/12), at staging merge SHA `d99d67062d7a2869e4fc49de39fc634da03c2f78`. The reported test evidence and its independent-verification limits are recorded in the current-state snapshot in §9; neither PR approves this full SRS or the global product baseline.

## 1. Source hierarchy and notation

1. **COURSE** = `group_work_specs_v1.pdf`, especially §§5–8, Theme 3 (PDF p. 5), and `project_deliverable_1_v1.pdf`, §§2–3.1 (PDF pp. 1–2). These establish required outcomes, not this team's detailed policy.
2. **TEAM-REPORTED / UNVERIFIED** = design choices summarized in `SKILL.md` v1.3.1 §1.2. They require confirmation against a versioned, jointly approved project SRS. The Skill is a workflow controller, **not** approval evidence.
3. **PROPOSED** = refinements written in this draft to make requirements testable. Approval can change these; preserve revisions and traceability.

All IDs below are **provisional stable identifiers** for review. A row's source label does not mean this draft itself has been approved.

## 2. Problem, stakeholders, context

University activity organizers need to publish workshops with limited seats and record participation. Students need to find workshops, register, see their registration, and (in later work) cancel. Without a bounded shared workflow, duplicate or over-capacity registration, unauthorized access, and uncertain attendance status can occur. **Problem framing:** COURSE Theme 3, contextualized as university workshops per TEAM-REPORTED design.

| Actor | Intended responsibility | Data boundary |
|---|---|---|
| **Participant** (student) | Authenticate; view published workshops; create, view and later cancel **own** registrations | Own private registration details only |
| **Organizer** (university activity organizer) | Authenticate; create/publish/manage **own** workshops; inspect registrations; later check in attendance and view summaries | Only workshops they own and their authorized registration lists |
| Anonymous visitor | No protected operations or private information; DEC-11 proposes denying F-03 published-workshop browse until authenticated as Participant | No privileged data |
| Course assessor / UAT tester | Verify a reproducible synthetic-data release; not an application role | Test/demo access only |

**Role model proposed by team:** exactly one meaningful role per seeded account for initial scope. Distinct Participant and Organizer roles are COURSE-mandated for Sprint 1.

## 3. Product scope and exclusions

**In scope across three sprints:** real login/logout/current identity and backend authorization; persistent workshop draft/publication with capacity; published-workshop discovery; capacity-safe registration and authorized retrieval; registration cancellation, registration deadline and manual closure/reopen; organizer editing with capacity protections; check-in; attendance counts/rates and useful filters; Docker/GCP-compatible data persistence and tested release workflow.

**Out of scope (TEAM-REPORTED / UNVERIFIED; reconfirm):** real payments, QR check-in, email/SMS/push messaging, external university-system integration, certificates, room booking, and unnecessary self-registration, password recovery or extensive administration in Sprint 1. Simulated email/payment is **not** a substitute for a required domain workflow.

**System boundary:** browser UI → authenticated backend/application API → persistent relational database. Domain permissions and invariants are enforced on the **server and database**, never only in frontend controls. No external payment or messaging provider is required (COURSE).

## 4. Functional requirements (FR)

Each requirement describes an **observable full-product behavior**; its planned implementation sprint appears in `docs/traceability.md`. For Sprint 2/3 details, feature contracts will be elaborated **before implementation**, not in P1-01.

| ID | Requirement (the system shall...) | Source / readiness |
|---|---|---|
| **FR-01** | Authenticate a seeded account, end its session on logout, and reject invalid credentials without disclosing protected data. | COURSE §5.2; detailed session method PROPOSED |
| **FR-02** | Provide authenticated current-user identity and enforce Participant/Organizer permissions on the backend. | COURSE §5.2 + Theme 3 |
| **FR-03** | Allow an Organizer to create and retrieve a workshop **DRAFT** owned by that Organizer, with the agreed event fields. | COURSE Theme 3; DRAFT state TEAM-REPORTED |
| **FR-04** | Allow the owning Organizer to publish an eligible draft; persist publication state and make eligible published workshops discoverable. | COURSE Theme 3; transition detail TEAM-REPORTED |
| **FR-05** | Allow an Organizer to list and inspect workshops they own without exposing another Organizer's private drafts. | COURSE ownership; list workflow PROPOSED |
| **FR-06** | Allow a Participant to browse and inspect published workshop details, including time, location, capacity/availability as permitted by the approved UI policy. | COURSE Theme 3 |
| **FR-07** | Allow an authenticated Participant to register for an eligible published workshop; persist the registration and return its current status. | COURSE Theme 3 |
| **FR-08** | Allow a Participant to retrieve their own registration(s) and persisted registration status. | COURSE Theme 3 |
| **FR-09** | Allow the owning Organizer to retrieve the authorized registrations for one of their workshops. | COURSE Theme 3 |
| **FR-10** | Allow a Participant to cancel an eligible own ACTIVE registration and view its resulting status. | COURSE later sprint; policy TEAM-REPORTED |
| **FR-11** | Allow the owning Organizer to set an allowed registration deadline and close/reopen new registrations, subject to eligibility rules. | COURSE deadline clarification; controls TEAM-REPORTED |
| **FR-12** | Allow the owning Organizer to update allowed workshop fields/capacity while preventing invalid changes. | COURSE organizer management/capacity; edit policy OPEN |
| **FR-13** | Allow the owning Organizer to record attendance/check-in of an eligible ACTIVE registration and persist its time/status. | COURSE check-in; window TEAM-REPORTED |
| **FR-14** | Provide an owning Organizer with a persisted-data attendance/seat summary for their workshop (active, cancelled, checked-in, remaining seats, no-show and rate as applicable). | COURSE reporting; exact metrics TEAM-REPORTED |
| **FR-15** | Provide useful workshop discovery/organizer views with bounded search or filtering as specified by an approved contract. | PROPOSED from Skill's F-09 plan; confirm scope |

## 5. Business rules (BR)

Backend and DB checks must handle invalid inputs and concurrency. **TEAM-REPORTED** means the policy is a draft to verify, even when it is detailed.

| ID | Observable rule / expected rejection | Source |
|---|---|---|
| **BR-01** | An unauthenticated or unauthorized role/record owner cannot perform a protected operation or read another user's private registration; an Organizer cannot manage another Organizer's workshop. | COURSE Theme 3 / §5.2 |
| **BR-02** | Workshop end date-time must be later than start date-time; invalid ordering cannot be published. | TEAM-REPORTED |
| **BR-03** | A published workshop's capacity must be a positive integer. | COURSE positive capacity |
| **BR-04** | A DRAFT is private to its owner, cannot be registered for, and only its owner may transition it from DRAFT to PUBLISHED. | TEAM-REPORTED (course requires publishing/ownership) |
| **BR-05** | At most one ACTIVE registration exists per Participant per workshop. A second ACTIVE registration is rejected. | COURSE Theme 3 |
| **BR-06** | ACTIVE registration count may not exceed capacity, including when multiple requests race for the last seat. Ensure atomic database-backed enforcement. | COURSE Theme 3 |
| **BR-07** | A new registration is rejected after the effective registration deadline or when the workshop is not open/eligible. **Boundary at exact deadline is PROPOSED as closed (`now >= deadline`).** | COURSE asks to clarify; TEAM-REPORTED default = start |
| **BR-08** | The configured registration deadline may not be after workshop start; absent a custom deadline, the default is workshop start. | TEAM-REPORTED |
| **BR-09** | An ACTIVE Participant may cancel their own registration before the permitted deadline; cancelling changes active availability without deleting the history record. Duplicate/unauthorized cancellation is rejected. | COURSE cancellation; TEAM-REPORTED policy |
| **BR-10** | Manual registration closure blocks **new** registrations but does not by itself block an already-ACTIVE Participant's timely cancellation. Cancellation does **not** automatically reopen registration. | TEAM-REPORTED 'Closure A' |
| **BR-11** | The owner may manually reopen new registrations only while the workshop is eligible and before its deadline. | TEAM-REPORTED |
| **BR-12** | A Participant with a CANCELLED record may register again only if no ACTIVE duplicate exists, registration is open, time is eligible, and capacity remains. | TEAM-REPORTED |
| **BR-13** | Capacity may not be reduced below the number of current ACTIVE registrations; changes are authorized to the workshop owner. | COURSE capacity management; TEAM-REPORTED specific rejection |
| **BR-14** | The owning Organizer may check in an ACTIVE registration **at most once**, during its workshop's start–end window; invalid role, event ownership, duplicate check-in, and outside-window attempts are rejected. | COURSE check-in; TEAM-REPORTED window |
| **BR-15** | Organizer summary is calculated from authoritative stored records: remaining = capacity − ACTIVE; attendance rate = checked-in ACTIVE / ACTIVE × 100, and if ACTIVE = 0, rate = 0%. Count no-shows only after the workshop ends. | TEAM-REPORTED metric convention; calculation detail PROPOSED |
| **BR-16** | Changes to a published workshop must preserve the approved deadline, ownership, and attendance invariants; allowed time/field edits after registrations are an OPEN decision, not blanket permission. | COURSE validation need; policy OPEN |

## 6. Measurable non-functional requirements (NFR)

These are **draft test targets**, not instructor-imposed numerical thresholds; approve or revise them before implementation. Test plan/actual results belong to later feature contracts and execution evidence.

| ID | Proposed measurable target | Verification / planned sprint | Status/source |
|---|---|---|---|
| **NFR-01** | 100% of sampled protected API operations deny unauthenticated requests and wrong-role/cross-owner access without returning private records; locally managed passwords are stored as secure hashes, never plaintext. | API/DB security test matrix, manual storage inspection; Sprint 1, regress Sprints 2–3 | COURSE security outcome; target wording PROPOSED |
| **NFR-02** | Workshop/registration data written successfully remains retrievable after application restart and expected redeployment with durable DB; no browser-memory-only storage. | Seed/write → restart/redeploy → read comparison; Sprint 1 local; Lab 5/GCP, Sprint 3 | COURSE persistence |
| **NFR-03** | In a test with **10 concurrent registration attempts for one remaining seat**, exactly one succeeds and ACTIVE count never exceeds capacity. | Real concurrent API/DB integration test; Sprint 1 and regression | TEAM-REPORTED provisional load; COURSE requires race safety |
| **NFR-04** | Published workshop list p95 response time **≤3 seconds** under **100 seeded workshops and 10 concurrent users**, with documented environment and measurement procedure. | Repeatable API or E2E load measurement; Sprint 3 | TEAM-REPORTED provisional target |
| **NFR-05** | Key login, workshop browse, registration, and Organizer management journeys remain usable without horizontal page overflow at **375px and 1280px** viewport widths. | Documented UI checks at both viewports; Sprint 3 | TEAM-REPORTED provisional widths |
| **NFR-06** | **From Sprint 1**, run applicable build and automated-test checks for every relevant PR and retain the commands, results and tested commit SHA; a failed required check blocks normal PR integration/release (no waiver by deadline). Before hosted CI/branch protection is configured, verify this gate through documented test evidence and peer review; do **not** claim technical enforcement exists. **Lab 5** establishes/expands hosted CI/CD with required-check enforcement, Docker packaging and repeatable GCP deployment of accepted `main` releases. | Sprint 1: PR build/test evidence, peer-reviewed no-failed-check gate and staging→main release record; Lab 5: hosted CI required checks, deliberate failing-check rejection, Docker/GCP pipeline and deployed SHA; repeat later | COURSE §5.3 and §8.3; no implemented gate claimed in this draft |
| **NFR-07** | No production secrets or real private user data are committed; demo/seed data are synthetic; configuration is provided as names/examples outside code. | Config and diff/secret review per PR; all sprints | COURSE security/configuration |

## 7. Example end-to-end acceptance narratives (scope, not AC or STS)

- **Sprint 1:** Organizer signs in → creates/publishes valid workshop → Participant signs in → discovers/persists registration → Participant retrieves own record → Organizer sees authorized registration. Duplicate/last-seat race and forbidden ownership paths are rejected by backend.
- **Sprint 2:** Participant cancels within policy; Organizer changes deadline/closure or capacity under explicit constraints; previously registered users' data remains correct.
- **Sprint 3:** Organizer checks in eligible Participant during event, observes accurate attendance summary and useful filtering. Final integrated tests cover earlier access and business rules.

These narratives are **not themselves acceptance criteria**. Historical P1-02 [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8) authored **DRAFT Feature-Level AC/STS/DoD** for F-01–F-04: **41 proposed AC and 41 planned STS at that time** (F-01 8, F-02 11, F-03 13, F-04 9). F-02 owns BR-08 Create/Publish validation; F-03 independently fails closed on malformed persisted Deadline during Registration. The current 42/42 design crosswalk is in `docs/traceability.md` v0.1.7. PR #8 and PR #10 were documentation milestones; the later F-02 implementation and its separately reported test evidence are PR #14 / Issue #12. Neither AC/STS drafting nor a scoped feature merge implies global product or instructor approval.

## 8. Assumptions, decisions, and unresolved questions

| ID | Question / provisional position | Status / owner of decision |
|---|---|---|
| **DEC-01** | University workshop domain, Participant + Organizer with one role/account; synthetic seeded users. | TEAM-REPORTED; both students to confirm |
| **DEC-02** | Workshop fields and publication requirements: title, description, location, starts/ends, positive integer capacity; optional registration deadline; server-derived owner and status. | **F-02 scoped working choice accepted** after PR #10 review/merge/Author verification; [evidence](decisions/p1-ex01-working-acceptance-ledger.md), not global approval |
| **DEC-03** | Allow incomplete DRAFT creation; require title, description, location, starts/ends and positive capacity at Publish; failed Publish remains DRAFT. | **F-02 scoped working choice accepted** after PR #10 review/merge/Author verification; implementation evidence is separately recorded in PR #14 / Issue #12 |
| **DEC-04** | Explicit-offset ISO 8601 API values; UTC instants in `timestamptz`; configured university timezone for UI; absent deadline defaults to start; exact deadline is closed. | **F-02 scoped working choice accepted** after PR #10 review/merge/Author verification; exact timezone config remains unspecified |
| **DEC-05** | Manual Closure A; timely cancellation allowed while closed; reopen not automatic. | TEAM-REPORTED; confirm |
| **DEC-06** | Cancelled record retained; re-registration eligible; status/history presentation and cancellation exact boundary? | TEAM-REPORTED; **OPEN** UX/boundary |
| **DEC-07** | Edit start/end/deadline/location after publish and after active registrations? | **OPEN**, blocks detailed F-07/F-06 contracts |
| **DEC-08** | Event capacity may not fall below ACTIVE; should increasing or reducing capacity require other guardrails? | TEAM-REPORTED + **OPEN** extra policy |
| **DEC-09** | Check-in once, during workshop; reporting metrics and no-show timing as in BR-14/15. | TEAM-REPORTED; confirm numerator/denominator |
| **DEC-10** | F-02 reuses the F-01 React/TypeScript/Vite, Express/Node/TypeScript, PostgreSQL and `pg` SQL approach; no ORM; reuse F-01 server session. Deployment/CI/CD remains open. | **F-02 scoped working choice accepted** after PR #10 review/merge/Author verification; global architecture/GCP still open |
| **DEC-11** | F-03 scoped working choice: Participant-only published list/detail access; Anonymous `401`, Organizer `403`; no public browse or Organizer browse. Search/filter breadth remains separately open. | **ACCEPTED for the F-03 staging scope** after PR #15 Formal APPROVE, merge and Author post-merge verification; not global SRS/SDS or instructor approval. See [decision record](decisions/dec-11-published-workshop-discovery-access.md) |
| **DEC-12** | F-03 scoped working test profile: 10 concurrent Participants / one remaining seat for NFR-03; NFR-04/05 targets remain separate. | **ACCEPTED for the F-03 staging scope** after PR #15 Formal APPROVE, merge and Author post-merge verification. No-overbooking remains mandatory; the numeric profile is not an instructor-mandated threshold. See [decision record](decisions/dec-12-registration-concurrency-target.md) |
| **DEC-13** | Scoped document changes use independent teammate substantive review and actual merge into sprint staging, followed by Author post-merge verification, as working-document acceptance. Author/reviewer assignments are recorded on the relevant Issue/PR. This does not establish instructor approval, full-product sign-off, or approval of unrelated/open decisions. | **WORKING-ACCEPTANCE PROCESS RECORDED; each scoped change still requires its own review/merge and Author verification** |

**Rule for open decisions:** document competing options and impact; do not silently implement a policy or call an unapproved decision final. Ask course instructor/TA when the official brief cannot be resolved at team level.

## 9. Change control, review, and current status

| Version | Date | Change | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | Initial source-grounded full-product **DRAFT** for P1-01 | **Historical status at that version: pending both students** |
| v0.1.1 | 2026-11-03 | Address PR #7 Reviewer R-01: make Sprint 1 build/test PR gate distinct from Lab 5 hosted CI/CD and deployment; still DRAFT | **Historical status at that version: pending re-review and both students** |
| v0.1.2 | 2026-11-03 | PR #8 Reviewer R-02 status correction: reference P1-02 Draft AC/STS/DoD (39 each after R-01), keep approval and execution separate; requirement text/IDs unchanged | **Historical status at that version: not approved; formal decision pending** |
| v0.1.3 | 2026-11-03 | PR #8 Reviewer R-03 status correction: reference 41 Draft AC/STS with F-02 BR-08 Create/Publish ownership and F-03 independent defensive Registration; requirement IDs unchanged | **Historical status at that version: not approved; formal decision pending** |
| v0.1.4 | 2026-11-04 | Add scoped proposed DEC-02/03/04/10 records for F-02 and align the decision register; requirement IDs and normative FR/BR/NFR text unchanged | **PENDING PEER REVIEW; NOT APPROVED** |
| v0.1.5 | 2026-11-04 | Address PR #10 R-02/R-03: distinguish merged/tested F-01 evidence from unimplemented F-02–F-04 plans; align scoped working-document acceptance with SDS ARCH-08; retain full-product/instructor approval as separate and unclaimed | **PENDING PEER REVIEW; full SRS remains DRAFT / NOT APPROVED** |
| v0.1.6 | 2026-11-05 | Issue #11: record PR #10's subsequent APPROVE/MERGE/Author check for DEC-02/03/04/10-F02; leave all global requirements and unrelated decisions unchanged | Pending Issue #11 peer review; full SRS remains DRAFT/not globally approved |
| v0.1.7 | 2026-11-06 | Issue #5 Specification-first: record Participant-only browse as a DEC-11 proposal and retain the 10-request NFR-03 profile as provisional DEC-12; no FR/BR/NFR IDs or normative requirements changed | Pending independent Reviewer consideration; full SRS remains DRAFT/not globally approved |
| v0.1.8 | 2026-11-06 | PR #15 Reviewer R-01/R-02 corrections: define separate pre-implementation and final-acceptance gates; reconcile current F-02 implementation and reported evidence to PR #14 / Issue #12 without changing historical records | Pending PR #15 re-review; full SRS remains DRAFT/not globally approved |
| v0.1.9 | 2026-11-09 | Issue #16: reconcile F-03 current status to PR #15 Formal APPROVE, staging merge and Author post-merge verification; update scoped DEC-11/12 status without changing FR/BR/NFR text or global baseline approval | F-03 scoped staging acceptance recorded; full-product SRS remains DRAFT / NOT GLOBALLY APPROVED |

**Current implementation and evidence state (2026-11-09):**

- **F-01:** Independently approved and merged through [PR #9](https://github.com/cottonlnwza/TTworkshop/pull/9) into `sprint_1_staging` at merge commit `21e9d9de83ccef24214484ab159a83d398f544b3`; reviewed feature HEAD `f0d6d54ef53dedacf9bfa9dd0639d7c0e604aa0d`. The Author's post-merge record reports **21/21 local checks passing** (11 PostgreSQL/API, 5 React UI, 2 Chrome E2E, 3 DB guard) and `npm run build` PASS. This is local evidence, not hosted CI.
- **F-02:** Implemented under [Issue #12](https://github.com/cottonlnwza/TTworkshop/issues/12) and [PR #14](https://github.com/cottonlnwza/TTworkshop/pull/14), independently **APPROVED** by `cottonlnwza` on exact feature HEAD `877f7bae9cb6aa9b1d8503e077b4788e834a271a`, then merged by the teammate into `sprint_1_staging` at `d99d67062d7a2869e4fc49de39fc634da03c2f78`. The PR includes Workshop migrations, seed changes, Organizer APIs and UI. Its Author test ledger reports 26 F-02 test cases, 1 seed-idempotency test, 3 DB-guard tests and 18 F-01 tests (48 total); the PR DoD also records STS-F02-01–12 as executed. The Author's post-merge Issue #12 comment reports `npm run build` PASS, guarded `npm run db:migrate` PASS against `ttworkshop_test`, and `npm test` **48/48 PASS** (6 files, 0 failed, 0 skipped). **Evidence limitation:** these PostgreSQL/Chrome and post-merge results are Author-reported; the Reviewer independently reran build, UI 5/5 (F-01 only) and DB guard 3/3 on the reviewed feature snapshot, but could not independently rerun the full PostgreSQL/Chrome suite because the review environment lacked `PG_TEST_URL` and `PG_SEED_TEST_URL`. The test ledger is not, by itself, an independently verified one-to-one proof for every named STS.
- **F-03:** Implemented under [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) / [PR #15](https://github.com/cottonlnwza/TTworkshop/pull/15). Independent Reviewer `cottonlnwza` submitted Formal **APPROVE** on exact feature HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6`; the teammate merged it into `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`. The Author's post-merge verification on that exact merge commit reports `git diff --check` PASS, `npm run build` PASS and `npm test` **69/69 PASS** across 9 test files; F-03-specific coverage is 14 PostgreSQL/API + 5 React UI + 2 real Chrome E2E = **21/21**. AC-F03-01–13 ↔ STS-F03-01–13 execution evidence is recorded in [the F-03 contract](contracts/f-03-discovery-registration.md) and [evidence ledger](evidence/p1-05-f03.md). These are Author-run local checks, not hosted CI or independent Reviewer test reruns. See the [Formal APPROVE](https://github.com/cottonlnwza/TTworkshop/pull/15#pullrequestreview-5814213834) and [post-merge verification](https://github.com/cottonlnwza/TTworkshop/issues/5#issuecomment-6724013761).
- **F-04:** Registration Views / Ownership remains unimplemented and its planned STS remain unexecuted; it is separate from the completed F-03 staging slice.

No `main` release, production deployment, or instructor/full-product approval is claimed.

**Historical P1-02 status:** [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8) authored the pre-implementation feature contracts and planned AC/STS/DoD (41 proposed AC and 41 planned STS). Statements in older version records that F-02 was unimplemented describe the repository at those historical dates; they are superseded by the current PR #14 / Issue #12 snapshot above. F-03 AC/STS execution is now recorded in the scoped F-03 evidence; F-04 planned STS remain unexecuted pending its implementation work. The SRS itself remains **DRAFT / NOT GLOBALLY APPROVED** as a full-product baseline; a scoped feature merge does not resolve every open decision. Requirements-to-feature allocation: `docs/features.md` and `docs/traceability.md`. Architecture choices: `docs/system-sds.md`. Schedule/dependencies: `docs/sprints/plan.md`.
