# TTworkshop — Software Requirements Specification (SRS)

> **DRAFT v0.1.2 — NOT APPROVED — 2026-11-03 (Asia/Bangkok)**
> Issue: [P1-01 / #1](https://github.com/cottonlnwza/TTworkshop/issues/1) · Theme 3: Event Registration and Attendance System
> **Purpose:** Engineering baseline for the full product (Deliverable 1, Part A). No implementation, test, or release is asserted by this document.
> **Approval gate:** Both students must review the choices/IDs, resolve or explicitly accept open decisions, and record approval in a versioned review before this becomes a binding SRS.

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
| Anonymous visitor | No protected mutation or private information; public browsing policy remains an open decision | No privileged data |
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

These narratives are **not themselves acceptance criteria**. P1-02 [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8) has now authored **DRAFT v0.1 / v0.1.1 Feature-Level AC/STS/DoD** for F-01–F-04 in `docs/contracts/README.md` and its linked four contracts: **39 proposed AC and 39 planned STS** (F-03 has 13 after Reviewer R-01). Their IDs are traceable in `docs/traceability.md` DRAFT v0.1.2. **NOT APPROVED / NOT IMPLEMENTED / NOT EXECUTED**: authoring a test specification does not establish test results or grant permission to implement. All contract and baseline decisions, including DEC-04, remain pending approval.

## 8. Assumptions, decisions, and unresolved questions

| ID | Question / provisional position | Status / owner of decision |
|---|---|---|
| **DEC-01** | University workshop domain, Participant + Organizer with one role/account; synthetic seeded users. | TEAM-REPORTED; both students to confirm |
| **DEC-02** | Workshop fields title, description, location, start/end, capacity; ownership and status server-side. | TEAM-REPORTED; both students to confirm |
| **DEC-03** | DRAFT → PUBLISHED; only owned drafts viewable; draft incomplete-field policy? | State TEAM-REPORTED; **OPEN** incomplete draft fields |
| **DEC-04** | Deadline defaults to workshop start; optional earlier; exact clock/time-zone serialization and equality boundary? | TEAM-REPORTED; **OPEN** clock representation/boundary |
| **DEC-05** | Manual Closure A; timely cancellation allowed while closed; reopen not automatic. | TEAM-REPORTED; confirm |
| **DEC-06** | Cancelled record retained; re-registration eligible; status/history presentation and cancellation exact boundary? | TEAM-REPORTED; **OPEN** UX/boundary |
| **DEC-07** | Edit start/end/deadline/location after publish and after active registrations? | **OPEN**, blocks detailed F-07/F-06 contracts |
| **DEC-08** | Event capacity may not fall below ACTIVE; should increasing or reducing capacity require other guardrails? | TEAM-REPORTED + **OPEN** extra policy |
| **DEC-09** | Check-in once, during workshop; reporting metrics and no-show timing as in BR-14/15. | TEAM-REPORTED; confirm numerator/denominator |
| **DEC-10** | Technology stack, DB dialect, ORM, cookie/session vs token, cloud deployment architecture. | **PROPOSED in System SDS; OPEN** |
| **DEC-11** | Anonymous access to published workshop list and exact organizer/participant search/filter breadth. | **OPEN**; do not imply public API access yet |
| **DEC-12** | NFR-03/04/05 numeric targets and test environment. | TEAM-REPORTED provisional; approve/revise |
| **DEC-13** | Issue #1 GitHub Author `cottonlnwza` and Reviewer `thananun-7203` are designated by the user; repository permissions were checked. Both students' formal identities and baseline approval record remain to be established. | **ASSIGNMENT REPORTED; APPROVAL NOT VERIFIED**; both students required |

**Rule for open decisions:** document competing options and impact; do not silently implement a policy or call an unapproved decision final. Ask course instructor/TA when the official brief cannot be resolved at team level.

## 9. Change control, review, and current status

| Version | Date | Change | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | Initial source-grounded full-product **DRAFT** for P1-01 | **Pending both students** |
| v0.1.1 | 2026-11-03 | Address PR #7 Reviewer R-01: make Sprint 1 build/test PR gate distinct from Lab 5 hosted CI/CD and deployment; still DRAFT | **Pending re-review and both students** |
| v0.1.2 | 2026-11-03 | PR #8 Reviewer R-02 status correction: reference P1-02 Draft AC/STS/DoD (39 each after R-01), keep approval and execution separate; requirement text/IDs unchanged | **NOT APPROVED; formal decision pending** |

**Current state:** Product specification remains **DRAFT / NOT APPROVED**; P1-02 documentation [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8) adds planned AC/STS but no implementation, executed application tests, CI, feature release or deployment. Requirements-to-feature allocation: `docs/features.md` and `docs/traceability.md`. Architecture choices: `docs/system-sds.md`. Schedule/dependencies: `docs/sprints/plan.md`.
