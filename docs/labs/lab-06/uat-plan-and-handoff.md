# Lab 6 Part A — TTworkshop Sprint 1 UAT Test Plan and Safe Handoff Package

> **Status: PART A UAT PREPARATION & SAFE HANDOFF PACKAGE (PRE-PARTNER EXECUTION) — 2026-11-21**
> **Tracking Issue:** [Issue #59 (`L6-01 / Period 2`)](https://github.com/cottonlnwza/TTworkshop/issues/59) · **Period:** `Period 2`
> **Product Team (TTworkshop):** Author `thananun-7203` (ComTon) · Independent Reviewer `cottonlnwza` (ComGu)
> **Official Source:** `CPE334 Lab 6 — Independent user acceptance testing and defect management` (§1–§3.1, §4.1–§5, pp. 1–7; Due 2026-11-22 23:59 Thailand)
> **Sprint 1 Contract Baseline:** [`docs/contracts/README.md`](../../contracts/README.md), [`f-01-auth.md`](../../contracts/f-01-auth.md), [`f-02-workshop-publish.md`](../../contracts/f-02-workshop-publish.md), [`f-03-discovery-registration.md`](../../contracts/f-03-discovery-registration.md), [`f-04-registration-views.md`](../../contracts/f-04-registration-views.md)
> **Truthfulness & Boundary Notice:** This document provides TTworkshop's executable Sprint 1 (`F-01`–`F-04`) UAT cases and partner handoff package for **Part A (20 points)**. It does **not** claim that the partner UAT Team has executed these cases (Part B), reported/triaged findings (Part C), or issued a final Sprint 1 acceptance decision (Part D). Zero real or synthetic password values, tokens, or personal student IDs are stored in this repository file.

---

## 1. Product Team, Release Baseline and Deployed Environment Provenance

Per Lab 6 §2 (*Starting point and partner arrangement*, pp. 1–2) and §3.1 (*Provide a safe handoff*, p. 3), the assessed UAT target is TTworkshop's delivered **Sprint 1** functionality deployed on Google Cloud Run and backed by managed Cloud SQL PostgreSQL.

| Field | Verified Value / Provenance |
|---|---|
| **Product Name & Course Theme** | **TTworkshop** — CPE334 Theme 3: University Workshop Registration and Attendance System |
| **GitHub Repository** | [`https://github.com/cottonlnwza/TTworkshop`](https://github.com/cottonlnwza/TTworkshop) |
| **Product Team Members** | `cottonlnwza` (ComGu) and `thananun-7203` (ComTon) *(legal student names, IDs, and section are recorded in the private course handoff and LEB2 PDF submission)* |
| **Live Deployed Application URL** | [`https://ttworkshop-xue6vtucgq-as.a.run.app`](https://ttworkshop-xue6vtucgq-as.a.run.app) |
| **Live Health Readiness Endpoint** | [`https://ttworkshop-xue6vtucgq-as.a.run.app/health`](https://ttworkshop-xue6vtucgq-as.a.run.app/health) (`GET /health` → HTTP `200`, `{"status":"ok"}`) |
| **Deployed Cloud Run Revision** | **`ttworkshop-c05d1121072250`** (Ready, serving **100% traffic** in `cpe334-ttworkshop` / `asia-southeast1`) |
| **Deployed Container Image Digest** | `sha256:ca8acac3445516a787efd782340b580b6a99440bab267e95824951bd6422f13c` |
| **Persistent Database Backend** | Google Cloud SQL for PostgreSQL 16 (`ttworkshop-pg`, database `ttworkshop`), verified across container restart and redeploy under [Issue #32 C-04/C-05](https://github.com/cottonlnwza/TTworkshop/issues/32#issuecomment-7063068886) |
| **Sprint 1 Feature Staging Lineage** | `sprint_1_staging@f5938c7dc8836cbce3616e9d48ec4a9b0c273fe4` — integrating independently reviewed F-01 ([PR #9](https://github.com/cottonlnwza/TTworkshop/pull/9)), F-02 ([PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10), [PR #14](https://github.com/cottonlnwza/TTworkshop/pull/14)), F-03 ([PR #15](https://github.com/cottonlnwza/TTworkshop/pull/15)), and F-04 ([PR #20](https://github.com/cottonlnwza/TTworkshop/pull/20)) |
| **Sprint 1 Reviewed `main` Release** | `main@3f5ec15a1bc2a94d1b16003e1baa531dff4a7256` ([Deliverable 1 Release Issue #25](https://github.com/cottonlnwza/TTworkshop/issues/25) / [PR #26](https://github.com/cottonlnwza/TTworkshop/pull/26)) |
| **Lab 5 Cloud Run Release Lineage** | `main@d9e9f99637c0511bc93b561f51fb34d2b913d71b` ([PR #43](https://github.com/cottonlnwza/TTworkshop/pull/43)) → `main@13ee9a19350dd06e614d3dc196d880c5275b489b` ([PR #50](https://github.com/cottonlnwza/TTworkshop/pull/50) `/health` Cloud Run readiness fix) → `main@e53be24a944ec0da10fcf2738a7d4b0c727c7f88` ([PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56)) → `main@87246a946a37f6d71ac747e977da34f0e481d0d6` ([PR #58](https://github.com/cottonlnwza/TTworkshop/pull/58)); Sprint 1 (`F-01`–`F-04`) functional behavior and contracts are unchanged |

### Version Control & Deployment Freeze Rule During Partner UAT (Lab 6 §2, p. 2)

1. The deployed Cloud Run revision **`ttworkshop-c05d1121072250`** is frozen as the initial UAT baseline while the independent UAT Team executes the test cases below.
2. The Product Team will **not** deploy any new revision or alter test accounts during the UAT Team's test window without explicitly notifying the UAT Team first.
3. If a release-blocking defect is discovered, accepted, fixed, reviewed, and redeployed under Part D, the Product Team will provide the exact new commit SHA, image digest, and Cloud Run revision ID to the UAT Team for independent re-test.

---

## 2. Accepted-for-Test Sprint 1 Scope vs. Excluded Sprint 2 / 3 Features

Per Lab 6 §1–§2 (pp. 1–2), UAT verifies delivered behavior against the agreed **Sprint 1** requirements and acceptance criteria (`F-01` through `F-04`, totaling 43 AC ↔ 43 STS in [`docs/contracts/README.md`](../../contracts/README.md)). Unimplemented Sprint 2 and Sprint 3 features are outside the Sprint 1 acceptance boundary.

### 2.1 In-Scope Sprint 1 Features (`F-01`–`F-04`)

| Feature Slice | Contract & Evidence | Requirement IDs (`docs/srs.md` / `docs/features.md`) | Acceptance Criteria (`AC`) | Delivered & Assessed Capabilities |
|---|---|---|---|---|
| **F-01: Authentication, Session & Role Authorization** | [`f-01-auth.md`](../../contracts/f-01-auth.md), [`p1-03-f01.md`](../../evidence/p1-03-f01.md), [`dec-10-f01.md`](../../decisions/dec-10-f01.md) | `FR-01`, `FR-02`; `BR-01`; `NFR-01`, `NFR-07` | `AC-F01-01` to `AC-F01-08` | Sign in with seeded synthetic Participant or Organizer credentials (`POST /api/v1/auth/login`); server-derived identity (`GET /api/v1/auth/me`) via `HttpOnly`, `SameSite=Strict` cookie (`ttw_session`); session revocation on logout (`POST /api/v1/auth/logout` → `204`); generic `401` on invalid credentials; API-level `401 UNAUTHENTICATED` / `403 FORBIDDEN` role enforcement. |
| **F-02: Organizer Workshop Draft & Publish** | [`f-02-workshop-publish.md`](../../contracts/f-02-workshop-publish.md), [`dec-02`](../../decisions/dec-02-workshop-fields.md), [`dec-03`](../../decisions/dec-03-workshop-drafts.md), [`dec-04`](../../decisions/dec-04-workshop-time.md) | `FR-03`, `FR-04`, `FR-05`; `BR-01`, `BR-02`, `BR-03`, `BR-04`, `BR-08 (Create/Publish)`; `NFR-01`, `NFR-02` | `AC-F02-01` to `AC-F02-12` | Organizer creates partial or complete `DRAFT` (`POST /api/v1/workshops`), lists only own workshops (`GET /api/v1/organizer/workshops`), views/edits own `DRAFT` (`GET` / `PATCH /api/v1/organizer/workshops/:id`), and publishes an eligible `DRAFT` (`POST /api/v1/organizer/workshops/:id/publish`). Enforces required publish fields, `ends_at > starts_at` (`BR-02`), integer `capacity > 0` (`BR-03`), `registration_deadline <= starts_at` (`BR-08`), single `DRAFT → PUBLISHED` transition (`BR-04`), and cross-owner isolation (`404`). |
| **F-03: Published Workshop Discovery & Capacity-Safe Registration** | [`f-03-discovery-registration.md`](../../contracts/f-03-discovery-registration.md), [`p1-05-f03.md`](../../evidence/p1-05-f03.md), [`dec-11`](../../decisions/dec-11-published-workshop-discovery-access.md), [`dec-12`](../../decisions/dec-12-registration-concurrency-target.md) | `FR-06`, `FR-07`; `BR-01`, `BR-04`, `BR-05`, `BR-06`, `BR-07`, `BR-08`; `NFR-01`, `NFR-02`, `NFR-03` | `AC-F03-01` to `AC-F03-13` | Authenticated `PARTICIPANT` lists and views only `PUBLISHED` workshops (`GET /api/v1/workshops`, `GET /api/v1/workshops/:id`) with live `remaining_seats` and `registration_open` status (`DEC-11`: Anonymous `401`, Organizer `403`, unpublished/missing `404`). Atomic transaction (`SELECT ... FOR UPDATE` + partial unique index) creates one `ACTIVE` registration (`POST /api/v1/workshops/:id/registrations` → `201`), rejecting duplicates (`409 DUPLICATE_ACTIVE`), full capacity (`409 CAPACITY_FULL`), and passed/invalid deadlines (`409 DEADLINE_PASSED` / `INVALID_DEADLINE` where `effective_deadline = COALESCE(registration_deadline, starts_at)`). |
| **F-04: Participant Registration Views & Organizer Ownership** | [`f-04-registration-views.md`](../../contracts/f-04-registration-views.md), [`p1-06-f04.md`](../../evidence/p1-06-f04.md) | `FR-08`, `FR-09`; `BR-01`, `BR-05`; `NFR-01`, `NFR-02` | `AC-F04-01` to `AC-F04-10` | Authenticated `PARTICIPANT` views own registrations list (`/my-registrations`, `GET /api/v1/me/registrations`) and own registration detail (`/my-registrations/:id`, `GET /api/v1/me/registrations/:id`). Authenticated `ORGANIZER` views registrant roster only for own `PUBLISHED` workshops (`/organizer/workshops/:id/registrations`, `GET /api/v1/organizer/workshops/:id/registrations`). Enforces `WD-F04-01` privacy minimization (roster shows `registration_id`, opaque `participant_id`, `status`, `registered_at` without email/name), `WD-F04-02` cursor pagination (`limit` default 20, max 50, `registered_at DESC, id DESC`), and `WD-F04-04` (`401`/`403`/`404` on foreign, missing, or own-`DRAFT` records). |

### 2.2 Excluded Scope (Sprint 2 / Sprint 3 & Non-Sprint-1 Capabilities)

The following items are **not** part of the Sprint 1 contract and must be classified as out-of-scope enhancements if requested during Sprint 1 UAT (Lab 6 §1, §3.3, pp. 1, 4):
- **F-05 (Sprint 2):** Participant registration cancellation and re-registration after cancellation (`DEC-06`).
- **F-06 (Sprint 2):** Organizer manual registration close/reopen toggle (`BR-10`).
- **F-07 (Sprint 2):** Editing or cancelling a workshop after it has already been `PUBLISHED` (`DEC-07`).
- **F-08 / F-09 (Sprint 2–3):** Participant check-in at event (`checked_in_at`), attendance summary statistics, CSV export, and keyword/date search filters.
- **Account Self-Registration / Admin Role:** Sprint 1 uses pre-seeded synthetic Participant and Organizer accounts (`DEC-01`, [`f-01-auth.md` §1](../../contracts/f-01-auth.md)).

---

## 3. Safe Handoff: Roles, Synthetic Account Labels, Sequence and Data Setup / Cleanup

### 3.1 Required Roles and Synthetic Test Account Labels (No Secret Values in Git/PDF)

Per Lab 6 §3.1 (*Provide a safe handoff*, p. 3) and §4.2 (p. 6), the table below identifies the synthetic test accounts by label, email identifier, and server-enforced role. **The synthetic password is delivered privately to the partner UAT Team and course instructor/TA and must never be committed to Git or pasted into the PDF.**

| Account Label | Login Email Identifier (`.test` synthetic domain) | Server-Enforced Role | Primary Purpose in UAT Cases |
|---|---|---|---|
| **`ORGANIZER_A`** | `organizer.a@example.test` | `ORGANIZER` | Primary Organizer: creates partial/complete workshop drafts, edits drafts, publishes workshops, and views owned workshop registration rosters (`UAT-S1-01`, `UAT-S1-02`, `UAT-S1-03`, `UAT-S1-04`, `UAT-S1-05`, `UAT-S1-06`). |
| **`ORGANIZER_B`** | `organizer.b@example.test` | `ORGANIZER` | Secondary Organizer: verifies cross-organizer ownership isolation on `ORGANIZER_A`'s private drafts, publish actions, and published workshop rosters (`UAT-S1-05`). |
| **`PARTICIPANT_A`** | `participant.a@example.test` | `PARTICIPANT` | Primary Participant: discovers published workshops, registers (`ACTIVE`), tests duplicate registration rejection, and views own registrations (`UAT-S1-01`, `UAT-S1-02`, `UAT-S1-03`, `UAT-S1-04`, `UAT-S1-05`, `UAT-S1-06`). |
| **`PARTICIPANT_B`** | `participant.b@example.test` | `PARTICIPANT` | Secondary Participant: verifies full-capacity boundary rejection when `capacity = 1` (`UAT-S1-02`) and cross-participant registration detail isolation (`UAT-S1-05`). |

### 3.2 Case Independence and Recommended Execution Sequence

- **Recommended Sequence:** Execute `UAT-S1-01` → `UAT-S1-02` → `UAT-S1-03` → `UAT-S1-04` → `UAT-S1-05` → `UAT-S1-06`.
  - `UAT-S1-01` creates and publishes a fresh workshop (with `capacity = 2`) and registers `PARTICIPANT_A`, producing a concrete `workshopId` and `registrationId` that can also be referenced in `UAT-S1-02` (Part 1 duplicate check), `UAT-S1-05` (cross-owner roster/registration checks), and `UAT-S1-06` (persistence across logout/re-login).
- **Repeatable / Independent Execution:** Every case can also be executed or re-tested independently on the live Cloud Run environment without waiting for a database reset:
  - Whenever a case requires a new draft or published workshop, include a unique run tag in the workshop `Title` (for example, `UAT-S1-01 Cloud Workshop [Run-01]`, `UAT-S1-02 Single Seat [Run-01]`).
  - Because `ORGANIZER_A` can create a new draft (`POST /api/v1/workshops`) and publish it (`POST /api/v1/organizer/workshops/:id/publish`) at any time, testers can create clean, isolated workshop fixtures on demand.

### 3.3 Data Setup and Reset / Cleanup Instructions

1. **Live Cloud Run Environment (`https://ttworkshop-xue6vtucgq-as.a.run.app`):**
   - **Pre-seeded baseline:** The four synthetic accounts (`organizer.a@example.test`, `organizer.b@example.test`, `participant.a@example.test`, `participant.b@example.test`) and baseline workshops are already migrated and seeded in Cloud SQL (`ttworkshop-pg`).
   - **Browser session cleanup between roles:** Click the **`Sign out`** button in the top header before switching between Organizer and Participant accounts (or use two separate browser profiles / Incognito windows: Window 1 for `ORGANIZER_A` / `ORGANIZER_B`, Window 2 for `PARTICIPANT_A` / `PARTICIPANT_B`).
   - **Non-destructive live cleanup:** In Sprint 1, published workshops and `ACTIVE` registrations are durable records (`NFR-02`; cancellation is deferred to Sprint 2 `F-05`). Do **not** run destructive SQL `TRUNCATE` or `DROP` against the shared live Cloud SQL database. To re-run any test case cleanly, simply create a new workshop draft with a fresh `[Run-N]` suffix in its title.
2. **Optional Local Reproducible Setup / Reset (Docker Compose or Local PostgreSQL):**
   - If the UAT Team or instructor wishes to inspect or reset a disposable local instance from source:
     ```bash
     docker compose up -d --wait --wait-timeout 120
     docker compose run --rm -T -e SEED_PASSWORD="<12+ char synthetic password>" api node ./node_modules/tsx/dist/cli.mjs scripts/seed.ts
     ```
   - To reset all disposable local Docker data cleanly: `docker compose down -v`.

---

## 4. Executable Sprint 1 UAT Test Cases (`UAT-S1-01` – `UAT-S1-06`)

### 4.1 Coverage Matrix Against Lab 6 §3.1 Mandatory Categories and Sprint 1 Contracts

Lab 6 §3.1 (p. 3) requires **at least four executable cases** covering four mandatory categories (*normal domain journey*, *business-rule or boundary case*, *forbidden role/ownership case*, and *state/history/persistence case*). TTworkshop provides **six executable cases** so every Sprint 1 feature slice (`F-01`–`F-04`) and critical contract invariant is thoroughly covered:

| Case ID | Mandatory Lab 6 §3.1 Category | Feature Slice(s) | Linked Requirements (`SRS`) | Linked Contract `AC` & `STS` IDs | Summary of Verified Behavior |
|---|---|---|---|---|---|
| **`UAT-S1-01`** | **1. Normal domain journey** | `F-01`, `F-02`, `F-03`, `F-04` | `FR-01`–`FR-09`, `BR-01`–`BR-04`, `NFR-02` | `AC-F01-01`, `AC-F01-02`, `AC-F02-01`, `AC-F02-03`, `AC-F02-12`, `AC-F03-01`–`03`, `AC-F04-01`, `AC-F04-02`, `AC-F04-04`, `AC-F04-09` (`STS-F01-01/02`, `STS-F02-01/03/12`, `STS-F03-01..03`, `STS-F04-01/02/04/09`) | End-to-end vertical slice: Organizer signs in → creates partial draft → completes & publishes workshop → Participant signs in → browses & registers (`ACTIVE`) → verifies own registration list/detail → Organizer verifies matching workshop roster. |
| **`UAT-S1-02`** | **2A. Business-rule or boundary case** *(Registration capacity & uniqueness)* | `F-02`, `F-03`, `F-04` | `FR-07`, `BR-05`, `BR-06`, `NFR-02`, `NFR-03` | `AC-F03-04`, `AC-F03-05`, `AC-F03-11`, `AC-F04-09` (`STS-F03-04`, `STS-F03-05`, `STS-F03-11`, `STS-F04-09`) | Duplicate active registration by same Participant is blocked (`409 DUPLICATE_ACTIVE`); single-seat workshop (`capacity = 1`) accepts first Participant (`remaining_seats = 0`) and rejects second Participant (`Full` / `409 CAPACITY_FULL`) with zero overbooking. |
| **`UAT-S1-03`** | **2B. Business-rule or boundary case** *(Publish validation & deadline rules)* | `F-02`, `F-03` | `FR-03`, `FR-04`, `FR-07`, `BR-02`, `BR-03`, `BR-04`, `BR-07`, `BR-08` | `AC-F02-04`, `AC-F02-05`, `AC-F02-08`, `AC-F02-10`, `AC-F02-11`, `AC-F03-08`, `AC-F03-12` (`STS-F02-04/05/08/10/11`, `STS-F03-08/12`) | Rejects draft creation/update when `registration_deadline > starts_at` (`400`, `BR-08`); rejects publishing incomplete draft or draft with `ends_at <= starts_at` (`400`, `BR-02`); rejects registration when `now >= effective_deadline` (`Closed` / `409 DEADLINE_PASSED`, `BR-07`). |
| **`UAT-S1-04`** | **3A. Forbidden role / access case** *(Authentication & role boundaries)* | `F-01`, `F-02`, `F-03`, `F-04` | `FR-01`, `FR-02`, `FR-06`, `FR-08`, `FR-09`, `BR-01`, `NFR-01` | `AC-F01-03`–`05`, `AC-F02-06`, `AC-F03-01`, `AC-F03-09`, `AC-F04-06`, `AC-F04-07` (`STS-F01-03..05`, `STS-F02-06`, `STS-F03-01/09`, `STS-F04-06/07`) | Invalid login rejected generically (`401`); anonymous requests rejected (`401`); `PARTICIPANT` denied Organizer write/roster routes (`403 FORBIDDEN`); `ORGANIZER` denied Participant discovery/registration/my-registrations routes (`403 FORBIDDEN`, `DEC-11`). |
| **`UAT-S1-05`** | **3B. Forbidden ownership & privacy case** *(Cross-owner & cross-user isolation)* | `F-02`, `F-04` | `FR-05`, `FR-08`, `FR-09`, `BR-01`, `BR-04`, `NFR-01` | `AC-F02-02`, `AC-F02-06`, `AC-F02-12`, `AC-F04-01`, `AC-F04-03`, `AC-F04-04`, `AC-F04-05` (`STS-F02-02/06/12`, `STS-F04-01/03/04/05`, `WD-F04-01/04`) | `ORGANIZER_B` cannot list, view, edit, publish, or inspect the roster of `ORGANIZER_A`'s workshops (`404 NOT_FOUND`); `ORGANIZER_A` cannot open a roster for an unpublished `DRAFT` (`404`); `PARTICIPANT_B` cannot view `PARTICIPANT_A`'s registration (`404`); roster DTO omits Participant email/name (`WD-F04-01`). |
| **`UAT-S1-06`** | **4. State, history & persistence case** *(Lifecycle state & durable session/DB persistence)* | `F-01`, `F-02`, `F-03`, `F-04` | `FR-01`, `FR-04`, `FR-06`, `FR-08`, `FR-09`, `BR-04`, `NFR-02` | `AC-F01-06`, `AC-F02-03`, `AC-F02-07`, `AC-F02-09`, `AC-F03-07`, `AC-F03-10`, `AC-F04-08`, `AC-F04-10` (`STS-F01-06`, `STS-F02-07/09`, `STS-F03-07/10`, `STS-F04-08/10`) | `DRAFT` workshop is invisible and non-registrable (`404`) to Participants until `PUBLISHED`; once `PUBLISHED`, edit/re-publish transitions are blocked (`409 INVALID_STATE`); logout revokes session (`401`), and re-login retrieves identical persisted `ACTIVE` registrations in deterministic `registered_at DESC, id DESC` order. |

---

### 4.2 Detailed Executable Test Cases

#### Case `UAT-S1-01` — Normal Domain Journey: End-to-End Workshop Draft, Update, Publish, Discovery, Registration and Owner Roster

- **Category:** Normal domain journey (Lab 6 §3.1 Category 1)
- **Requirement & Contract References:** `FR-01`–`FR-09`, `BR-01`–`BR-04`, `NFR-02` · `AC-F01-01`, `AC-F01-02`, `AC-F02-01`, `AC-F02-03`, `AC-F02-12`, `AC-F03-01`, `AC-F03-02`, `AC-F03-03`, `AC-F04-01`, `AC-F04-02`, `AC-F04-04`, `AC-F04-09` (`STS-F01-01`, `STS-F01-02`, `STS-F02-01`, `STS-F02-03`, `STS-F02-12`, `STS-F03-01`–`03`, `STS-F04-01`, `STS-F04-02`, `STS-F04-04`, `STS-F04-09`)
- **Purpose:** Verify that an Organizer can sign in, create a partial workshop draft, complete and publish that draft, and that a Participant can sign in, discover the newly published workshop, register for an active seat, view their persisted registration list and detail, and appear in the owning Organizer's workshop registration roster.
- **Roles & Accounts:** `ORGANIZER_A` (`organizer.a@example.test`) and `PARTICIPANT_A` (`participant.a@example.test`)
- **Preconditions:**
  1. Deployed application is reachable at `https://ttworkshop-xue6vtucgq-as.a.run.app` (`GET /health` returns HTTP `200`).
  2. Browser starts in an unauthenticated state (on the `Welcome back` sign-in screen).
- **Synthetic Inputs:**
  - Partial Draft input:
    - `Title`: `UAT-S1-01 Cloud Native Architecture [Run-01]` *(if re-running, increment to `[Run-02]`, etc.)*
    - `Description`: `Hands-on Sprint 1 UAT verification workshop`
    - *(Leave `Location`, `Start Time`, `End Time`, `Capacity`, and `Registration Deadline` empty on initial save to verify partial draft creation under `DEC-03` / `AC-F02-01`)*
  - Draft Update input (to complete required publication fields under `AC-F02-12`):
    - `Location`: `Engineering Building Room 401`
    - `Start Time`: `2026-12-15T10:00` (`15 Dec 2026, 10:00` in configured `Asia/Bangkok` time)
    - `End Time`: `2026-12-15T12:00` (`15 Dec 2026, 12:00`)
    - `Capacity`: `2`
    - `Registration Deadline`: `2026-12-14T18:00` (`14 Dec 2026, 18:00`, which is `<= Start Time`)
- **Numbered User Actions:**
  1. Open `https://ttworkshop-xue6vtucgq-as.a.run.app/`. On the `Welcome back` screen, enter **Email** = `organizer.a@example.test` and **Password** = `<synthetic password from private handoff>`, then click **`Sign in`**.
  2. Verify the `Organizer workspace` (`My Workshops`) screen loads. Click **`Create New Draft`**.
  3. In the `Create Workshop Draft` form, enter only **Title** = `UAT-S1-01 Cloud Native Architecture [Run-01]` and **Description** = `Hands-on Sprint 1 UAT verification workshop`. Leave the remaining fields blank and click **`Save Draft`**.
  4. On `My Workshops`, locate `UAT-S1-01 Cloud Native Architecture [Run-01]` (badged **`DRAFT`**) and click **`Edit / Publish`**.
  5. On the detail panel (`Status: DRAFT`), click **`Edit Draft`**. Fill in **Location** = `Engineering Building Room 401`, **Start Time** = `2026-12-15T10:00`, **End Time** = `2026-12-15T12:00`, **Capacity** = `2`, and **Registration Deadline** = `2026-12-14T18:00`, then click **`Save Changes`**.
  6. Confirm the updated fields are displayed on the draft detail view, then click **`Publish Workshop`**.
  7. In `My Workshops`, confirm `UAT-S1-01 Cloud Native Architecture [Run-01]` now displays status badge **`PUBLISHED`** and a **`View registrations`** link (replacing the `Edit / Publish` button). Record the workshop ID (`<W_ID_01>`) from the **`View registrations`** link URL (`/organizer/workshops/<W_ID_01>/registrations`).
  8. Click **`Sign out`** in the top header to end the Organizer session.
  9. On the `Welcome back` sign-in screen, enter **Email** = `participant.a@example.test` and **Password** = `<synthetic password>`, then click **`Sign in`**.
  10. On the Participant `Discover workshops` screen, locate `UAT-S1-01 Cloud Native Architecture [Run-01]`, verify its summary shows `Seats remaining: 2 / 2`, and click **`View details`**.
  11. In the workshop detail view, verify **Location**, **Starts**, **Ends**, **Seats remaining: 2 / 2**, and **Registration: Open**. Click **`Register for workshop`**.
  12. Observe the confirmation message (`Registration confirmed · <REG_ID_01> · ACTIVE`), the updated seat counter (`Seats remaining: 1 / 2`), and the button text changing to disabled **`Already registered`**. Record `<REG_ID_01>`.
  13. Click **`My registrations`** in the top header (`/my-registrations`). Locate `UAT-S1-01 Cloud Native Architecture [Run-01]` with `Status: ACTIVE`, then click **`View registration`** (`/my-registrations/<REG_ID_01>`).
  14. Navigate back (`Back to workshops`), click **`Sign out`**, and sign back in as **`ORGANIZER_A`** (`organizer.a@example.test`).
  15. In `My Workshops`, click **`View registrations`** on `UAT-S1-01 Cloud Native Architecture [Run-01]` (`/organizer/workshops/<W_ID_01>/registrations`).
- **Specific Expected Results:**
  - **Step 3:** Partial draft is saved (`HTTP 201`), status is **`DRAFT`**, and message `"Draft created successfully!"` appears (`AC-F02-01`).
  - **Step 5–7:** Draft update (`HTTP 200`, `"Draft updated successfully"`) and publication (`HTTP 200`, `"Workshop published successfully!"`) succeed; status transitions to **`PUBLISHED`** (`AC-F02-03`, `AC-F02-12`).
  - **Step 10–12:** Participant sees the published workshop (`AC-F03-01`, `AC-F03-02`); registration succeeds (`HTTP 201`) displaying `"Registration confirmed · <REG_ID_01> · ACTIVE"`, decrementing available seats from `2 / 2` to `1 / 2`, and disabling the button as `"Already registered"` (`AC-F03-03`).
  - **Step 13:** `/my-registrations` lists the workshop once (`Status: ACTIVE`), and `/my-registrations/<REG_ID_01>` displays matching `Registration: <REG_ID_01>`, `Status: ACTIVE`, workshop start time, and registration timestamp (`AC-F04-01`, `AC-F04-02`, `AC-F04-09`).
  - **Step 15:** Organizer's `/organizer/workshops/<W_ID_01>/registrations` roster displays `Registration: <REG_ID_01>`, opaque `Participant ID`, `Status: ACTIVE`, and registration timestamp, while omitting Participant email and full name (`AC-F04-04`, `WD-F04-01`).

---

#### Case `UAT-S1-02` — Business-Rule & Boundary Case: Duplicate Registration Rejection and Last-Seat Capacity Limit Enforcement

- **Category:** Business-rule or boundary case (Lab 6 §3.1 Category 2)
- **Requirement & Contract References:** `FR-07`, `BR-05`, `BR-06`, `NFR-02`, `NFR-03` · `AC-F03-04`, `AC-F03-05`, `AC-F03-11`, `AC-F04-09` (`STS-F03-04`, `STS-F03-05`, `STS-F03-11`, `STS-F04-09`)
- **Purpose:** Verify that (1) a Participant cannot create a second `ACTIVE` registration for the same workshop (enforced both in UI and by the database partial unique index), and (2) when a workshop reaches full capacity (`capacity = 1`, `remaining_seats = 0`), any additional registration attempt by another Participant is rejected without overbooking.
- **Roles & Accounts:** `ORGANIZER_A` (`organizer.a@example.test`), `PARTICIPANT_A` (`participant.a@example.test`), and `PARTICIPANT_B` (`participant.b@example.test`)
- **Preconditions:**
  1. Deployed application is reachable at `https://ttworkshop-xue6vtucgq-as.a.run.app`.
- **Synthetic Inputs:**
  - Single-seat workshop input (created and published by `ORGANIZER_A`):
    - `Title`: `UAT-S1-02 Single Seat Capacity Boundary [Run-01]`
    - `Description`: `Capacity boundary verification with exactly 1 seat`
    - `Location`: `Engineering Lab 102`
    - `Start Time`: `2026-12-16T13:00`
    - `End Time`: `2026-12-16T15:00`
    - `Capacity`: `1`
    - `Registration Deadline`: *(leave empty to also exercise default deadline = `starts_at` under `DEC-04`)*
- **Numbered User Actions:**
  1. Sign in as **`ORGANIZER_A`** (`organizer.a@example.test`). Click **`Create New Draft`**, fill in the Synthetic Inputs above with **`Capacity = 1`**, and click **`Save Draft`**.
  2. Click **`Edit / Publish`** on `UAT-S1-02 Single Seat Capacity Boundary [Run-01]`, then click **`Publish Workshop`**. Record its workshop ID (`<W_ID_02>`) from the **`View registrations`** link (`/organizer/workshops/<W_ID_02>/registrations`). Click **`Sign out`**.
  3. Sign in as **`PARTICIPANT_A`** (`participant.a@example.test`). Locate `UAT-S1-02 Single Seat Capacity Boundary [Run-01]` (`Seats remaining: 1 / 1`), click **`View details`**, and click **`Register for workshop`**.
  4. Verify registration succeeds (`Registration confirmed · <REG_ID_02> · ACTIVE`), `Seats remaining` becomes `0 / 1`, `Registration` status becomes `Full`, and the button is disabled.
  5. **Duplicate Registration API Boundary Check (`BR-05` / `AC-F03-04`):** While still signed in as `PARTICIPANT_A` (or against `<W_ID_01>` from `UAT-S1-01` where seats still remain), open browser DevTools Console (`F12` → Console) and execute a direct same-origin repeat registration POST for the workshop `PARTICIPANT_A` already registered in (`<W_ID_01>` from `UAT-S1-01`):
     ```javascript
     await fetch("/api/v1/workshops/<W_ID_01>/registrations", {
       method: "POST",
       credentials: "same-origin",
       headers: { "Content-Type": "application/json", "Origin": window.location.origin },
       body: "{}"
     }).then(async r => ({ status: r.status, body: await r.json() }))
     ```
  6. Click **`Sign out`**, then sign in as **`PARTICIPANT_B`** (`participant.b@example.test`).
  7. In `Discover workshops`, locate `UAT-S1-02 Single Seat Capacity Boundary [Run-01]`, observe `Seats remaining: 0 / 1`, and click **`View details`**.
  8. Verify the detail panel shows **`Seats remaining: 0 / 1`**, **`Registration: Full`**, and that the **`Register for workshop`** button is **disabled**.
  9. **Full-Capacity API Boundary Check (`BR-06` / `AC-F03-05`):** While signed in as `PARTICIPANT_B`, execute a direct same-origin registration POST against `<W_ID_02>` in the browser DevTools Console:
     ```javascript
     await fetch("/api/v1/workshops/<W_ID_02>/registrations", {
       method: "POST",
       credentials: "same-origin",
       headers: { "Content-Type": "application/json", "Origin": window.location.origin },
       body: "{}"
     }).then(async r => ({ status: r.status, body: await r.json() }))
     ```
  10. Click **`My registrations`** as `PARTICIPANT_B` and verify `UAT-S1-02 Single Seat Capacity Boundary [Run-01]` is **not** in `PARTICIPANT_B`'s registrations. Sign out, sign in as **`ORGANIZER_A`**, and open **`View registrations`** for `UAT-S1-02 Single Seat Capacity Boundary [Run-01]`.
- **Specific Expected Results:**
  - **Step 4:** `PARTICIPANT_A` takes the single seat (`HTTP 201`), and `Seats remaining` drops immediately to `0 / 1` (`Registration: Full`).
  - **Step 5 (Duplicate Rejection):** The API returns HTTP **`409`** with JSON `{"error":{"code":"DUPLICATE_ACTIVE","message":"An active registration already exists"}}` and does not create a second row (`AC-F03-04`, `BR-05`).
  - **Step 8–9 (Full-Capacity Rejection):** In UI, `PARTICIPANT_B` sees `Seats remaining: 0 / 1`, `Registration: Full`, and a disabled button; direct API POST returns HTTP **`409`** with JSON `{"error":{"code":"CAPACITY_FULL","message":"Workshop capacity is full"}}` (`AC-F03-05`, `BR-06`).
  - **Step 10 (Zero Overbooking Postcondition):** `PARTICIPANT_B` has no registration for `<W_ID_02>`, and `ORGANIZER_A`'s roster for `<W_ID_02>` contains **exactly 1** `ACTIVE` registration (belonging to `PARTICIPANT_A`).

---

#### Case `UAT-S1-03` — Business-Rule & Boundary Case: Workshop Create/Publish Validation Guards and Registration Deadline Boundary

- **Category:** Business-rule or boundary case (Lab 6 §3.1 Category 2)
- **Requirement & Contract References:** `FR-03`, `FR-04`, `FR-07`, `BR-02`, `BR-03`, `BR-04`, `BR-07`, `BR-08` · `AC-F02-04`, `AC-F02-05`, `AC-F02-08`, `AC-F02-10`, `AC-F02-11`, `AC-F03-08`, `AC-F03-12` (`STS-F02-04`, `STS-F02-05`, `STS-F02-08`, `STS-F02-10`, `STS-F02-11`, `STS-F03-08`, `STS-F03-12`)
- **Purpose:** Verify that (1) `F-02` rejects creating or updating a draft when `registration_deadline > starts_at` (`BR-08`) or `ends_at <= starts_at` (`BR-02`), (2) `F-02` blocks publishing an incomplete draft missing required fields (`AC-F02-08`), and (3) `F-03` blocks participant registration when the effective registration deadline has passed (`now >= COALESCE(registration_deadline, starts_at)`, `BR-07`/`BR-08`).
- **Roles & Accounts:** `ORGANIZER_A` (`organizer.a@example.test`) and `PARTICIPANT_A` (`participant.a@example.test`)
- **Preconditions:**
  1. Deployed application is reachable at `https://ttworkshop-xue6vtucgq-as.a.run.app`.
- **Synthetic Inputs:**
  - **Input 3A (Invalid Deadline > Start at Create, `BR-08`):**
    - `Title`: `UAT-S1-03 Invalid Deadline Draft`
    - `Start Time`: `2026-12-20T10:00`
    - `End Time`: `2026-12-20T12:00`
    - `Registration Deadline`: `2026-12-20T11:00` *(1 hour AFTER start time — invalid)*
  - **Input 3B (Invalid End <= Start, `BR-02`):**
    - `Title`: `UAT-S1-03 Invalid End Time Draft`
    - `Start Time`: `2026-12-20T14:00`
    - `End Time`: `2026-12-20T13:00` *(End before start — invalid)*
  - **Input 3C (Incomplete Draft for Publish Rejection, `AC-F02-08`):**
    - `Title`: `UAT-S1-03 Incomplete Draft [Run-01]`
    - *(Leave `Description`, `Location`, `Start Time`, `End Time`, `Capacity` blank)*
  - **Input 3D (Published Workshop with Passed Registration Deadline, `BR-07`/`AC-F03-08`):**
    - `Title`: `UAT-S1-03 Closed Deadline Workshop [Run-01]`
    - `Description`: `Workshop whose registration deadline has already passed`
    - `Location`: `Room 305`
    - `Start Time`: `2026-12-25T10:00` *(future start time)*
    - `End Time`: `2026-12-25T12:00`
    - `Capacity`: `10`
    - `Registration Deadline`: `2026-01-10T09:00` *(past timestamp `<= starts_at` and `< current time`)*
- **Numbered User Actions:**
  1. Sign in as **`ORGANIZER_A`** (`organizer.a@example.test`) and click **`Create New Draft`**.
  2. **Test `BR-08` Create Guard:** Enter **Input 3A** (`Start Time` = `2026-12-20T10:00`, `End Time` = `2026-12-20T12:00`, `Registration Deadline` = `2026-12-20T11:00`) and click **`Save Draft`**. Observe the alert message.
  3. **Test `BR-02` Time Order Guard:** Clear `Registration Deadline`, change **Start Time** to `2026-12-20T14:00` and **End Time** to `2026-12-20T13:00` (**Input 3B**), and click **`Save Draft`**. Observe the alert message.
  4. **Test `AC-F02-08` Incomplete Publish Guard:** Clear the date fields, enter only **Title** = `UAT-S1-03 Incomplete Draft [Run-01]` (**Input 3C**), and click **`Save Draft`**. From `My Workshops`, click **`Edit / Publish`** on `UAT-S1-03 Incomplete Draft [Run-01]` and click **`Publish Workshop`**. Observe the alert message and verify the workshop status in `My Workshops`.
  5. **Test `BR-07` Passed Registration Deadline Guard:** Click **`Create New Draft`**, enter all fields from **Input 3D** (including `Registration Deadline` = `2026-01-10T09:00` in the past and `Start Time` = `2026-12-25T10:00` in the future), and click **`Save Draft`**. Open `UAT-S1-03 Closed Deadline Workshop [Run-01]` via **`Edit / Publish`** and click **`Publish Workshop`**. Record its workshop ID (`<W_ID_03>`) from the **`View registrations`** link, then click **`Sign out`**.
  6. Sign in as **`PARTICIPANT_A`** (`participant.a@example.test`). Locate `UAT-S1-03 Closed Deadline Workshop [Run-01]` in `Discover workshops` and click **`View details`**.
  7. Verify the detail view displays **`Seats remaining: 10 / 10`**, **`Registration: Closed`**, and a disabled **`Register for workshop`** button.
  8. In browser DevTools Console (`F12`), send a direct same-origin registration request to `<W_ID_03>`:
     ```javascript
     await fetch("/api/v1/workshops/<W_ID_03>/registrations", {
       method: "POST",
       credentials: "same-origin",
       headers: { "Content-Type": "application/json", "Origin": window.location.origin },
       body: "{}"
     }).then(async r => ({ status: r.status, body: await r.json() }))
     ```
- **Specific Expected Results:**
  - **Step 2 (`BR-08`):** Rejected with HTTP `400` and error alert **`"Registration deadline cannot be later than start time"`**; no draft row is created (`AC-F02-10`).
  - **Step 3 (`BR-02`):** Rejected with HTTP `400` and error alert **`"End time must be after start time"`**; no draft row is created (`AC-F02-04`).
  - **Step 4 (`AC-F02-08`):** Partial draft save succeeds (`201`), but clicking **`Publish Workshop`** fails with HTTP `400` and error alert **`"Missing required fields for publication"`**; the workshop remains **`DRAFT`**.
  - **Step 6–8 (`BR-07` / `AC-F03-08`):** Even though `10 / 10` seats are available and `starts_at` is in the future, because `now >= registration_deadline`, the UI shows **`Registration: Closed`** with the button disabled, and direct API POST returns HTTP **`409`** with `{"error":{"code":"DEADLINE_PASSED","message":"Registration deadline has passed"}}` and zero registrations created.

---

#### Case `UAT-S1-04` — Forbidden Role Access Case: Anonymous (`401`), Participant-on-Organizer (`403`) and Organizer-on-Participant (`403`) Enforcement

- **Category:** Forbidden role/ownership case — Role & Authentication boundaries (Lab 6 §3.1 Category 3)
- **Requirement & Contract References:** `FR-01`, `FR-02`, `FR-06`, `FR-08`, `FR-09`, `BR-01`, `NFR-01` · `AC-F01-03`, `AC-F01-04`, `AC-F01-05`, `AC-F02-06`, `AC-F03-01`, `AC-F03-09`, `AC-F04-06`, `AC-F04-07` (`STS-F01-03`–`05`, `STS-F02-06`, `STS-F03-01`, `STS-F03-09`, `STS-F04-06`, `STS-F04-07`)
- **Purpose:** Verify that invalid credentials never authenticate or leak account existence, unauthenticated requests to protected routes receive `401 UNAUTHENTICATED`, authenticated Participants are blocked (`403 FORBIDDEN`) from Organizer views/APIs, and authenticated Organizers are blocked (`403 FORBIDDEN`) from Participant views/APIs (`DEC-11` & `F-04`).
- **Roles & Accounts:** Anonymous user, `PARTICIPANT_A` (`participant.a@example.test`), and `ORGANIZER_A` (`organizer.a@example.test`)
- **Preconditions:**
  1. Deployed application is reachable at `https://ttworkshop-xue6vtucgq-as.a.run.app`.
  2. Browser is signed out (`Welcome back` screen).
  3. At least one published workshop ID (`<W_ID_01>` from `UAT-S1-01` or seeded workshop ID `3`) exists.
- **Synthetic Inputs:**
  - Invalid login test inputs:
    - Unknown email: `nonexistent.user@example.test` / password: `WrongPassword123!`
    - Known email with wrong password: `participant.a@example.test` / password: `WrongPassword123!`
- **Numbered User Actions:**
  1. **Invalid Credentials & Non-Enumeration (`AC-F01-03`):** On `https://ttworkshop-xue6vtucgq-as.a.run.app/`, attempt to sign in with `nonexistent.user@example.test` / `WrongPassword123!`, then attempt to sign in with `participant.a@example.test` / `WrongPassword123!`. Compare both error messages.
  2. **Anonymous Protection (`AC-F01-04`):** While signed out, navigate directly to `https://ttworkshop-xue6vtucgq-as.a.run.app/my-registrations` and `https://ttworkshop-xue6vtucgq-as.a.run.app/organizer/workshops/1/registrations`, and run in DevTools Console:
     ```javascript
     await Promise.all([
       fetch("/api/v1/auth/me").then(r => r.status),
       fetch("/api/v1/workshops").then(r => r.status),
       fetch("/api/v1/organizer/workshops").then(r => r.status),
       fetch("/api/v1/me/registrations").then(r => r.status)
     ])
     ```
  3. **Participant Denied Organizer Surfaces (`AC-F01-05`, `AC-F02-06`, `AC-F04-06`):** Sign in as **`PARTICIPANT_A`** (`participant.a@example.test`).
     - Navigate directly in the browser address bar to `https://ttworkshop-xue6vtucgq-as.a.run.app/organizer/workshops/<W_ID_01>/registrations`. Observe the UI error alert.
     - In DevTools Console, attempt to create a workshop draft and list organizer workshops as `PARTICIPANT_A`:
       ```javascript
       await Promise.all([
         fetch("/api/v1/workshops", {
           method: "POST", credentials: "same-origin",
           headers: { "Content-Type": "application/json", "Origin": window.location.origin },
           body: JSON.stringify({ title: "Unauthorized Participant Draft" })
         }).then(async r => ({ status: r.status, body: await r.json() })),
         fetch("/api/v1/organizer/workshops", {
           credentials: "same-origin", headers: { "Origin": window.location.origin }
         }).then(async r => ({ status: r.status, body: await r.json() }))
       ])
       ```
  4. Click `Back to workshops`, then click **`Sign out`**.
  5. **Organizer Denied Participant Surfaces (`DEC-11`, `AC-F01-05`, `AC-F03-01`, `AC-F03-09`, `AC-F04-06`):** Sign in as **`ORGANIZER_A`** (`organizer.a@example.test`).
     - Navigate directly in the browser address bar to `https://ttworkshop-xue6vtucgq-as.a.run.app/my-registrations`. Observe the UI error alert.
     - In DevTools Console, attempt to call Participant published discovery and registration endpoints as `ORGANIZER_A`:
       ```javascript
       await Promise.all([
         fetch("/api/v1/workshops", { credentials: "same-origin" }).then(async r => ({ status: r.status, body: await r.json() })),
         fetch("/api/v1/workshops/<W_ID_01>/registrations", {
           method: "POST", credentials: "same-origin",
           headers: { "Content-Type": "application/json", "Origin": window.location.origin },
           body: "{}"
         }).then(async r => ({ status: r.status, body: await r.json() }))
       ])
       ```
- **Specific Expected Results:**
  - **Step 1:** Both unknown email and wrong password return HTTP **`401`** and the identical generic message **`"Invalid credentials"`** without disclosing whether the email exists (`AC-F01-03`).
  - **Step 2:** Unauthenticated browser routes render the sign-in screen (no protected content flash), and all four API calls return HTTP **`401`** (`UNAUTHENTICATED`, `AC-F01-04`).
  - **Step 3:** Navigating to `/organizer/workshops/<W_ID_01>/registrations` as `PARTICIPANT_A` displays the error alert **`"You do not have permission to view this information."`** (`data-error-kind="forbidden"`) and zero roster rows (`AC-F04-06`, `AC-F04-07`). Both Organizer API calls return HTTP **`403`** with `{"error":{"code":"FORBIDDEN","message":"Forbidden"}}` and no workshop is created (`AC-F01-05`, `AC-F02-06`).
  - **Step 5:** Navigating to `/my-registrations` as `ORGANIZER_A` displays **`"You do not have permission to view this information."`** (`403 FORBIDDEN`). Both Participant API calls (`GET /api/v1/workshops` and `POST /api/v1/workshops/<W_ID_01>/registrations`) return HTTP **`403`** with `{"error":{"code":"FORBIDDEN","message":"Forbidden"}}` (`DEC-11`, `AC-F03-01`, `AC-F03-09`, `AC-F04-06`).

---

#### Case `UAT-S1-05` — Forbidden Ownership & Privacy Case: Cross-Organizer Draft/Publish/Roster Denial and Cross-Participant Registration Denial

- **Category:** Forbidden role/ownership case — Record Ownership & Privacy Isolation (Lab 6 §3.1 Category 3)
- **Requirement & Contract References:** `FR-05`, `FR-08`, `FR-09`, `BR-01`, `BR-04`, `NFR-01` · `AC-F02-02`, `AC-F02-06`, `AC-F02-12`, `AC-F04-01`, `AC-F04-03`, `AC-F04-04`, `AC-F04-05`, `WD-F04-01`, `WD-F04-04` (`STS-F02-02`, `STS-F02-06`, `STS-F02-12`, `STS-F04-01`, `STS-F04-03`, `STS-F04-04`, `STS-F04-05`)
- **Purpose:** Verify that one Organizer (`ORGANIZER_B`) cannot see, read, edit, publish, or view the registration roster of another Organizer's (`ORGANIZER_A`'s) workshops; that an Organizer cannot view a registration roster for an unpublished `DRAFT` workshop; and that one Participant (`PARTICIPANT_B`) cannot list or read another Participant's (`PARTICIPANT_A`'s) registration details.
- **Roles & Accounts:** `ORGANIZER_A` (`organizer.a@example.test`), `ORGANIZER_B` (`organizer.b@example.test`), `PARTICIPANT_A` (`participant.a@example.test`), and `PARTICIPANT_B` (`participant.b@example.test`)
- **Preconditions:**
  1. From `UAT-S1-01` (or freshly created), `ORGANIZER_A` owns a `PUBLISHED` workshop `<W_ID_01>` in which `PARTICIPANT_A` holds an `ACTIVE` registration `<REG_ID_01>`.
  2. `ORGANIZER_A` also owns an unpublished `DRAFT` workshop (for example, `UAT-S1-03 Incomplete Draft [Run-01]` or a new partial draft `<DRAFT_ID_A>`).
- **Synthetic Inputs:**
  - Target IDs owned by `ORGANIZER_A` / `PARTICIPANT_A`:
    - `<W_ID_01>`: Published workshop owned by `ORGANIZER_A`
    - `<DRAFT_ID_A>`: Unpublished `DRAFT` workshop owned by `ORGANIZER_A` (can be read from `GET /api/v1/organizer/workshops` while signed in as `ORGANIZER_A`)
    - `<REG_ID_01>`: Registration ID owned by `PARTICIPANT_A`
  - Forged update payload attempted by `ORGANIZER_B`: `{"title": "Tampered by Organizer B"}`
- **Numbered User Actions:**
  1. Sign in as **`ORGANIZER_A`** (`organizer.a@example.test`).
     - Attempt to open the registration roster route for `ORGANIZER_A`'s own **`DRAFT`** workshop by navigating to `https://ttworkshop-xue6vtucgq-as.a.run.app/organizer/workshops/<DRAFT_ID_A>/registrations`. Observe the UI message (`AC-F04-05`).
     - Navigate back to `/` and click **`Sign out`**.
  2. Sign in as **`ORGANIZER_B`** (`organizer.b@example.test`).
     - Inspect `My Workshops`: verify that `ORGANIZER_A`'s workshops (`<W_ID_01>` and `<DRAFT_ID_A>`) are **absent** from `ORGANIZER_B`'s list (`AC-F02-02`).
     - Navigate directly to `https://ttworkshop-xue6vtucgq-as.a.run.app/organizer/workshops/<W_ID_01>/registrations` (`ORGANIZER_A`'s published workshop roster). Observe the UI error alert (`AC-F04-05`).
     - In DevTools Console, attempt as `ORGANIZER_B` to read, edit (`PATCH`), and publish `ORGANIZER_A`'s draft `<DRAFT_ID_A>`:
       ```javascript
       await Promise.all([
         fetch("/api/v1/organizer/workshops/<DRAFT_ID_A>", {
           credentials: "same-origin", headers: { "Origin": window.location.origin }
         }).then(async r => ({ status: r.status, body: await r.json() })),
         fetch("/api/v1/organizer/workshops/<DRAFT_ID_A>", {
           method: "PATCH", credentials: "same-origin",
           headers: { "Content-Type": "application/json", "Origin": window.location.origin },
           body: JSON.stringify({ title: "Tampered by Organizer B" })
         }).then(async r => ({ status: r.status, body: await r.json() })),
         fetch("/api/v1/organizer/workshops/<DRAFT_ID_A>/publish", {
           method: "POST", credentials: "same-origin",
           headers: { "Origin": window.location.origin }
         }).then(async r => ({ status: r.status, body: await r.json() }))
       ])
       ```
  3. Navigate back to `/`, click **`Sign out`**, and sign in as **`PARTICIPANT_B`** (`participant.b@example.test`).
  4. Click **`My registrations`** (`/my-registrations`) and verify that `PARTICIPANT_A`'s registration (`<REG_ID_01>`) is **not** listed (`AC-F04-01`).
  5. Navigate directly in the address bar to `https://ttworkshop-xue6vtucgq-as.a.run.app/my-registrations/<REG_ID_01>` (`PARTICIPANT_A`'s registration detail URL). Observe the UI error alert (`AC-F04-03`).
  6. Sign out and sign back in as **`ORGANIZER_A`** to confirm `<DRAFT_ID_A>` still has its original title and `DRAFT` status.
- **Specific Expected Results:**
  - **Step 1 (Own `DRAFT` Roster Denial):** `/organizer/workshops/<DRAFT_ID_A>/registrations` returns HTTP **`404`** (`NOT_FOUND`) and displays **`"This workshop roster is unavailable."`** (`AC-F04-05`).
  - **Step 2 (Cross-Organizer Isolation):**
    - `ORGANIZER_B`'s `My Workshops` list contains only `ORGANIZER_B`'s own workshops (`AC-F02-02`).
    - Navigating to `/organizer/workshops/<W_ID_01>/registrations` as `ORGANIZER_B` returns HTTP **`404`** and displays **`"This workshop roster is unavailable."`** with zero registrant data leaked (`AC-F04-05`, `WD-F04-04`).
    - All three direct API calls (`GET`, `PATCH`, `POST .../publish`) by `ORGANIZER_B` against `<DRAFT_ID_A>` return HTTP **`404`** (`{"error":{"code":"NOT_FOUND","message":"Workshop not found or access denied"}}`) (`AC-F02-06`, `AC-F02-12`).
  - **Step 4–5 (Cross-Participant Isolation):** `PARTICIPANT_B`'s `/my-registrations` excludes `<REG_ID_01>`, and direct navigation to `/my-registrations/<REG_ID_01>` returns HTTP **`404`** (`{"error":{"code":"NOT_FOUND","message":"Registration not found"}}`) and displays **`"This registration or workshop roster is unavailable."`** (`AC-F04-01`, `AC-F04-03`, `WD-F04-04`).
  - **Step 6 (Protected State Unchanged):** `ORGANIZER_A`'s draft `<DRAFT_ID_A>` retains its original title and **`DRAFT`** status.

---

#### Case `UAT-S1-06` — State, History & Persistence Case: Draft-to-Published Lifecycle Visibility, Post-Publish Immutability, Logout Session Revocation and Durable Registration / Pagination Persistence

- **Category:** State/history/persistence case (Lab 6 §3.1 Category 4)
- **Requirement & Contract References:** `FR-01`, `FR-04`, `FR-06`, `FR-08`, `FR-09`, `BR-04`, `NFR-02` · `AC-F01-06`, `AC-F02-03`, `AC-F02-07`, `AC-F02-09`, `AC-F03-07`, `AC-F03-10`, `AC-F04-08`, `AC-F04-10` (`STS-F01-06`, `STS-F02-07`, `STS-F02-09`, `STS-F03-07`, `STS-F03-10`, `STS-F04-08`, `STS-F04-10`)
- **Purpose:** Verify the workshop state machine (`DRAFT` is hidden/non-registrable to Participants; `PUBLISHED` is visible/registrable and cannot be edited or re-published in Sprint 1), session revocation on logout, and durable PostgreSQL persistence and deterministic pagination (`registered_at DESC, id DESC`, `WD-F04-02`) across logout and fresh login sessions.
- **Roles & Accounts:** `ORGANIZER_A` (`organizer.a@example.test`) and `PARTICIPANT_A` (`participant.a@example.test`)
- **Preconditions:**
  1. `<W_ID_01>` (published in `UAT-S1-01`), `<DRAFT_ID_A>` (unpublished draft owned by `ORGANIZER_A`), and `<REG_ID_01>` (`ACTIVE` registration by `PARTICIPANT_A`) exist in the database.
- **Synthetic Inputs:**
  - Post-publish modification/re-publish probes on `<W_ID_01>` (`PUBLISHED`):
    - `PATCH /api/v1/organizer/workshops/<W_ID_01>` with `{"title": "Post-Publish Edit Attempt"}`
    - `POST /api/v1/organizer/workshops/<W_ID_01>/publish`
  - Unpublished draft registration probe by `PARTICIPANT_A` on `<DRAFT_ID_A>` (`DRAFT`):
    - `GET /api/v1/workshops/<DRAFT_ID_A>`
    - `POST /api/v1/workshops/<DRAFT_ID_A>/registrations`
  - Pagination boundary probes on `/api/v1/me/registrations`:
    - Valid limit: `?limit=1`
    - Invalid limit (> 50 or <= 0): `?limit=51` and `?limit=0`
- **Numbered User Actions:**
  1. **Post-Publish Immutability Check (`BR-04`, `AC-F02-07`, `AC-F02-12`):** Sign in as **`ORGANIZER_A`** (`organizer.a@example.test`).
     - In `My Workshops`, confirm that `PUBLISHED` workshop `<W_ID_01>` shows **`View registrations`** and does **not** render an `Edit / Publish` button.
     - In DevTools Console, attempt to `PATCH` and re-`POST .../publish` the already-published `<W_ID_01>`:
       ```javascript
       await Promise.all([
         fetch("/api/v1/organizer/workshops/<W_ID_01>", {
           method: "PATCH", credentials: "same-origin",
           headers: { "Content-Type": "application/json", "Origin": window.location.origin },
           body: JSON.stringify({ title: "Post-Publish Edit Attempt" })
         }).then(async r => ({ status: r.status, body: await r.json() })),
         fetch("/api/v1/organizer/workshops/<W_ID_01>/publish", {
           method: "POST", credentials: "same-origin",
           headers: { "Origin": window.location.origin }
         }).then(async r => ({ status: r.status, body: await r.json() }))
       ])
       ```
  2. **Session Revocation on Logout (`AC-F01-06`):** Click **`Sign out`**. After the login page appears, run `await fetch("/api/v1/auth/me").then(r => r.status)` in DevTools Console to confirm the server session was revoked.
  3. **Draft Invisibility & Non-Registrability (`BR-04`, `AC-F03-07`):** Sign in as **`PARTICIPANT_A`** (`participant.a@example.test`).
     - Verify in `Discover workshops` that `ORGANIZER_A`'s unpublished draft (`<DRAFT_ID_A>`) is **not** shown in the list.
     - In DevTools Console, attempt to view details and register for `<DRAFT_ID_A>`:
       ```javascript
       await Promise.all([
         fetch("/api/v1/workshops/<DRAFT_ID_A>", { credentials: "same-origin" }).then(async r => ({ status: r.status, body: await r.json() })),
         fetch("/api/v1/workshops/<DRAFT_ID_A>/registrations", {
           method: "POST", credentials: "same-origin",
           headers: { "Content-Type": "application/json", "Origin": window.location.origin },
           body: "{}"
         }).then(async r => ({ status: r.status, body: await r.json() }))
       ])
       ```
  4. **Durable Registration Persistence & Deterministic Cursor Pagination (`NFR-02`, `AC-F04-08`, `AC-F04-10`, `WD-F04-02`):**
     - Click **`My registrations`** (`/my-registrations`). Verify that `PARTICIPANT_A`'s previously committed registration(s) (`<REG_ID_01>` from `UAT-S1-01` and `<REG_ID_02>` from `UAT-S1-02`) are still present with `Status: ACTIVE` and ordered newest-first (`registered_at DESC, id DESC`).
     - Click **`View registration`** on `<REG_ID_01>` (`/my-registrations/<REG_ID_01>`) and verify the exact same `Registration` ID, `Status: ACTIVE`, and timestamps persist across the logout/re-login cycle.
     - In DevTools Console, verify pagination cursor continuation (`?limit=1`) and boundary rejection (`?limit=51`):
       ```javascript
       const page1 = await fetch("/api/v1/me/registrations?limit=1", { credentials: "same-origin" }).then(r => r.json());
       const badLimit = await fetch("/api/v1/me/registrations?limit=51", { credentials: "same-origin" }).then(async r => ({ status: r.status, body: await r.json() }));
       ({ page1, badLimit })
       ```
- **Specific Expected Results:**
  - **Step 1:** Both post-publish `PATCH` (`"Cannot update a published workshop"`) and second `POST .../publish` (`"Workshop is already published"`) return HTTP **`409`** (`INVALID_STATE`), and `<W_ID_01>` remains unmodified (`AC-F02-07`, `AC-F02-12`).
  - **Step 2:** After logout, `GET /api/v1/auth/me` returns HTTP **`401`** (`AC-F01-06`).
  - **Step 3:** Unpublished `<DRAFT_ID_A>` does not appear in `Discover workshops`, and both `GET /api/v1/workshops/<DRAFT_ID_A>` and `POST /api/v1/workshops/<DRAFT_ID_A>/registrations` return HTTP **`404`** (`NOT_FOUND`) with zero registration rows created (`AC-F03-07`).
  - **Step 4:** All previously committed `ACTIVE` registrations persist identically across logout/re-login (`AC-F04-08`); `GET /api/v1/me/registrations?limit=1` returns 1 item plus `pagination.next_cursor` (without a `total` count field, per `WD-F04-02`), while `?limit=51` is rejected with HTTP **`400`** (`{"error":{"code":"INVALID_PAGINATION","message":"Invalid pagination parameters"}}`, `AC-F04-10`).

---

## 5. Templates for Independent UAT Team Execution, Defect Reporting and Final Acceptance

The independent UAT Team may copy and complete the tables below when testing TTworkshop (`https://ttworkshop-xue6vtucgq-as.a.run.app`, revision `ttworkshop-c05d1121072250`). Per Lab 6 §3.2 (p. 3), **both students on the UAT Team must participate**, record actual results (never copy expected results into the actual-result column), and attach readable screenshot/log evidence IDs.

### 5.1 Part B — Independent UAT Execution Log Template

| Case ID | Tester Name & Student ID (UAT Team) | Execution Date & Time (Asia/Bangkok) | Tested Release Commit / Cloud Run Revision | Concrete Inputs & Generated IDs Used | Actual Observed Result (Do not copy expected result) | Outcome (`PASS` / `FAIL` / `BLOCKED`) | Evidence ID(s) (Screenshot / Log) |
|---|---|---|---|---|---|---|---|
| `UAT-S1-01` | `<Tester 1>` | `<YYYY-MM-DD HH:MM>` | `ttworkshop-c05d1121072250` | `<Title, W_ID_01, REG_ID_01>` | `<Record actual UI/API observations>` | `<PASS/FAIL/BLOCKED>` | `EV-UAT-01` |
| `UAT-S1-02` | `<Tester 1 / 2>` | `<YYYY-MM-DD HH:MM>` | `ttworkshop-c05d1121072250` | `<Title, W_ID_02, REG_ID_02>` | `<Record actual UI/API observations>` | `<PASS/FAIL/BLOCKED>` | `EV-UAT-02` |
| `UAT-S1-03` | `<Tester 1 / 2>` | `<YYYY-MM-DD HH:MM>` | `ttworkshop-c05d1121072250` | `<Inputs 3A–3D, W_ID_03>` | `<Record actual UI/API observations>` | `<PASS/FAIL/BLOCKED>` | `EV-UAT-03` |
| `UAT-S1-04` | `<Tester 2>` | `<YYYY-MM-DD HH:MM>` | `ttworkshop-c05d1121072250` | `<Accounts & routes tested>` | `<Record actual UI/API observations>` | `<PASS/FAIL/BLOCKED>` | `EV-UAT-04` |
| `UAT-S1-05` | `<Tester 2>` | `<YYYY-MM-DD HH:MM>` | `ttworkshop-c05d1121072250` | `<W_ID_01, DRAFT_ID_A, REG_ID_01>` | `<Record actual UI/API observations>` | `<PASS/FAIL/BLOCKED>` | `EV-UAT-05` |
| `UAT-S1-06` | `<Tester 1 / 2>` | `<YYYY-MM-DD HH:MM>` | `ttworkshop-c05d1121072250` | `<W_ID_01, DRAFT_ID_A, REG_ID_01>` | `<Record actual UI/API observations>` | `<PASS/FAIL/BLOCKED>` | `EV-UAT-06` |

### 5.2 Part C — Reproducible Defect Report Template (For Any `FAIL` Finding)

| Field | Recorded Value |
|---|---|
| **Defect / Issue ID** | `<GitHub Issue # or Finding ID, e.g., UAT-DEF-01>` |
| **Product Owner / Team** | TTworkshop (`cottonlnwza` & `thananun-7203`) |
| **Reporter (UAT Tester & Team)** | `<Tester Name, Student ID, Partner Team Name>` |
| **Tested Version / Revision** | `https://ttworkshop-xue6vtucgq-as.a.run.app` · Revision `ttworkshop-c05d1121072250` |
| **Linked UAT Case & Sprint 1 Requirement / AC** | `<e.g., UAT-S1-02 / BR-06 / AC-F03-05>` |
| **Preconditions & Synthetic Data** | `<Account used, workshop/registration IDs, initial state>` |
| **Numbered Reproduction Steps** | `1. ... 2. ... 3. ...` |
| **Expected Result (per Sprint 1 Contract)** | `<Specific contract behavior>` |
| **Actual Result** | `<Actual observed UI/API/DB behavior>` |
| **Severity & User Impact Rationale** | `<Critical / Major / Minor — explain impact on Sprint 1 user workflow or data integrity>` |
| **Supporting Evidence ID(s)** | `<Screenshot / HTTP response / log ID>` |

### 5.3 Part C — Product Team Received-Findings Triage Table (Completed After Partner Handoff Return)

*Current status: awaiting partner UAT execution results. If zero findings are reported, record `None` and follow Lab 6 §3.5 controlled defect exercise procedure.*

| Finding ID / Issue Link | Linked Case & Contract `AC` | Classification (`Accepted defect` / `Duplicate` / `Not-defect` / `Enhancement`) | Contract & Evidence Rationale | Severity (`Critical` / `Major` / `Minor` / `N/A`) | Owner | Fix Status & PR / Commit / Redeployed Revision | Disposition |
|---|---|---|---|---|---|---|---|
| *Pending partner UAT execution* | — | — | — | — | — | — | — |

### 5.4 Part D — Independent UAT Retest and Final Sprint 1 Acceptance Decision Template

| Field | Independent UAT Team Final Record |
|---|---|
| **Assessed Product & Scope** | TTworkshop — Delivered Sprint 1 Scope (`F-01`, `F-02`, `F-03`, `F-04`) |
| **Final Tested Release Commit / Tag** | `<Exact main commit SHA>` |
| **Final Tested Cloud Run Revision & URL** | `https://ttworkshop-xue6vtucgq-as.a.run.app` · Revision `<ttworkshop-c05d1121072250 or redeployed fix revision>` |
| **Independent UAT Team & Tester Identities** | `<Partner Team Name · Tester 1 Name & ID · Tester 2 Name & ID>` |
| **Retest Summary (if release-blocking defects occurred)** | `<All critical/major defects re-tested PASS on deployed fix revision / or N/A if zero natural defects found>` |
| **Final Sprint 1 UAT Acceptance Decision** | `[ ] Accepted` · `[ ] Accepted with explicitly documented minor limitations` · `[ ] Not Accepted` |
| **Decision Reasons, Conditions & Documented Minor Limitations** | `<Evidence-backed reason and any accepted minor limitation IDs>` |
| **Decision Date & Time (Asia/Bangkok)** | `<YYYY-MM-DD HH:MM>` |

---

## 6. Author Pre-Merge Verification Evidence and Completion Matrix (Issue #59)

### 6.1 Author-Local & Read-Only Live Smoke Verification (2026-11-21)

Executed by Author `thananun-7203` (ComTon, Windows / Node.js `v24.14.0` / npm `11.9.0` / Python `3.12.10` / isolated loopback PostgreSQL `postgresql-x64-18` databases `ttworkshop_test` and `ttworkshop_seed_test` / local Chromium) on branch `docs/issue59-l6-01-uat-plan-handoff` branched from `sprint_2_staging@d062e9f8235312a4208940b2aabf3c389a8f003c`:

| Check / Command | Provenance | Result & Counts | Scope / Notes |
|---|---|---|---|
| `git diff --check` | Author-local | **PASS** (0 whitespace/conflict issues) | Verified clean diff across `docs/labs/lab-06/uat-plan-and-handoff.md` and `README.md` |
| `npm run build` (`tsc --noEmit && vite build`) | Author-local | **PASS** (20 modules transformed, strict TypeScript & Vite bundle) | Confirms zero build or type regressions |
| `npm test` (Vitest full suite with isolated PostgreSQL & Chromium) | Author-local | **PASS — 20/20 files, 134/134 tests passed, 0 failed, 0 skipped** | Full unit, API, PostgreSQL integration (`ttworkshop_test`, `ttworkshop_seed_test`), React UI, and headless Chromium E2E regression suite covering `F-01`–`F-04` and Lab 5 runtime checks |
| `python -m unittest discover -s tests -p "test_cloud_smoke.py" -v` | Author-local | **PASS — 7/7 tests passed** | Unit tests for read-only cloud smoke verifier |
| `node scripts/cloud-preflight.mjs` | Author-local | **PASS** (`GCP_PREFLIGHT_PASS`) | Offline deployment preflight verification |
| `python deploy/smoke_test.py https://ttworkshop-xue6vtucgq-as.a.run.app` | Author read-only live probe | **PASS** (`PASS /health: HTTP 200`, `PASS /: HTTP 200`) | Confirms the live Cloud Run baseline URL referenced in Part A handoff is reachable and healthy |

*Limitations:* The checks above are Author-local and read-only live health/root probes (hosted GitHub Actions `build-test` CI runs on the opened PR HEAD). They do **not** represent partner UAT execution (Part B), defect triage (Part C), defect resolution / Section 3.5 controlled exercise (Part D), or LEB2 PDF submission.

### 6.2 Pre-Merge Completion Matrix (`One Issue ↔ One PR`)

| File / Item | Current vs. Historical vs. Post-Merge Only | Evidence / Reference | Remaining Gate | Owner |
|---|---|---|---|---|
| `docs/labs/lab-06/uat-plan-and-handoff.md` | **Current (Part A pre-partner execution)** | [Issue #59](https://github.com/cottonlnwza/TTworkshop/issues/59), `AC-L6-01`, `AC-L6-02`, `AC-L6-04`; 6 executable UAT cases (`UAT-S1-01`–`06`) mapped to `F-01`–`F-04` contracts (`docs/contracts/f-01..04.md`) and live Cloud Run revision `ttworkshop-c05d1121072250` | Hosted PR CI (`build-test`), independent six-axis Formal Review and staging merge by `cottonlnwza` | `thananun-7203` (Author) / `cottonlnwza` (Reviewer) |
| `README.md` | **Current (Part A link & truthful pre-execution status)**; earlier Sprint 1 / Lab 5 sections preserved as dated history | `AC-L6-03`; links to `docs/labs/lab-06/uat-plan-and-handoff.md` without premature UAT completion claims | Independent six-axis review by `cottonlnwza` | `thananun-7203` / `cottonlnwza` |
| `docs/contracts/README.md`, `docs/contracts/f-01..04.md` | **Historical / Baseline Sprint 1 Contracts (unchanged)** | 43 AC ↔ 43 STS referenced directly by `UAT-S1-01`–`UAT-S1-06` | N/A (read-only reference baseline) | Team |
| Actual `sprint_2_staging` merge SHA, Author post-merge verification, Project #4 `Done` transition & Issue #59 closure | **Post-merge only** (never claimed prior to merge) | To be recorded on [Issue #59](https://github.com/cottonlnwza/TTworkshop/issues/59) after independent review and authorized teammate merge | Independent `APPROVE` + `MERGE_STAGING` by `cottonlnwza`, then Author post-merge verification | `cottonlnwza` / `thananun-7203` |
| Partner UAT execution results (Part B), defect triage (Part C), TDD defect resolution or Section 3.5 controlled exercise (Part D), and LEB2 PDF submission | **Future / Out-of-scope for Issue #59** | Templates provided in §5; actual partner execution occurs after Part A handoff delivery | Separate partner UAT exchange and subsequent bounded Lab 6 Issue/PR | Both students & Partner UAT Team |

