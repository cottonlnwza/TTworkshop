# TTworkshop — Requirements → Features → Sprints → Verification Traceability

> **DRAFT v0.1.1 — NOT APPROVED — 2026-11-03** · [Issue #1 / P1-01](https://github.com/cottonlnwza/TTworkshop/issues/1) · Deliverable 1 Part B
> Source baseline: `docs/srs.md` draft v0.1.1, feature mapping: `docs/features.md` draft v0.1.1. **No Acceptance Criteria (AC), Software Test Specification (STS), executable tests, or test results have yet been produced.** P1-02 must create Sprint 1 AC/STS **before** corresponding implementation.

## 1. Conventions and status

- **S1 / S2 / S3**: planned sprint of implementation or first verification; later regression may span multiple sprints.
- **SYS-01–SYS-05**: cross-cutting responsibilities, not extra product features (defined in `docs/features.md`).
- **Verification** is a planned check and level only. **AC/TEST = TBD** means not specified; it **never** means passed.
- **Current status of every row below: DRAFT / NOT IMPLEMENTED / NOT EXECUTED**, except where noted as an additional scope-decision risk. Do not mark a row PASS until its real test, file, version and output are recorded.

## 2. Functional requirement matrix

| Requirement | Feature/responsibility | Planned sprint | Planned verification (level / observable result) | AC/STS status |
|---|---|---|---|---|
| FR-01 | F-01 | S1 | API integration: valid/invalid login, logout; inactive/invalid session not accepted | TBD P1-02 |
| FR-02 | F-01, SYS-02 | S1 | API integration: current user correct; anonymous/forbidden role rejected | TBD P1-02 |
| FR-03 | F-02, SYS-01 | S1 | UI/API/DB: Organizer creates owned DRAFT; persistence and owner-private read | TBD P1-02 |
| FR-04 | F-02 | S1 | UI/API/DB: valid DRAFT published; invalid publication rejected; persisted listing | TBD P1-02 |
| FR-05 | F-02, SYS-02 | S1 | API/DB: own workshops visible; another Organizer's drafts denied | TBD P1-02 |
| FR-06 | F-03 | S1 | UI/API: eligible PUBLISHED workshops listed/details; DRAFT excluded | TBD P1-02 |
| FR-07 | F-03, SYS-03 | S1 | API/DB + UI journey: successful ACTIVE registration persisted and rejected invalid cases | TBD P1-02 |
| FR-08 | F-04, SYS-01 | S1 | UI/API/DB: Participant retrieves own saved record and status | TBD P1-02 |
| FR-09 | F-04, SYS-02 | S1 | API/DB: owning Organizer sees registrants; unrelated owner cannot | TBD P1-02 |
| FR-10 | F-05 | S2 | API/DB: eligible cancellation persists, duplicate/late/foreign cancellation rejected | TBD S2 contract |
| FR-11 | F-06 | S2 | API/DB: deadline/closure/reopen transitions and valid/invalid registration eligibility | TBD S2 contract |
| FR-12 | F-07 | S2 | API/DB: permitted edits persist; capacity lower than ACTIVE count rejected | TBD S2 contract |
| FR-13 | F-08 | S3 (start P2) | API/DB: owned ACTIVE registrant checked in once during window; invalid paths rejected | TBD S3 contract |
| FR-14 | F-09 | S3 | API/DB: count/rate summary matches seeded transactions and authorization | TBD S3 contract |
| FR-15 | F-09 | S3 | UI/API: chosen filters return correct subset and clear empty results | TBD S3 contract; **scope approval pending** |

## 3. Business rule matrix

| Requirement | Feature/responsibility | Planned sprint | Planned negative/boundary verification | AC/STS status |
|---|---|---|---|---|
| BR-01 | F-01–F-09, SYS-02 | S1; regress S2/S3 | API auth/ownership: anonymous, wrong role, cross-Participant and foreign Organizer access rejected on protected paths | TBD per feature |
| BR-02 | F-02, F-07 | S1; regress S2 | Boundary/API: publish/edit with end ≤ start rejected | TBD P1-02 / S2 |
| BR-03 | F-02, F-07 | S1; regress S2 | Boundary/API: zero/negative/non-integer published capacity rejected | TBD P1-02 / S2 |
| BR-04 | F-02, F-03 | S1 | API/DB: DRAFT invisible to other users; no registering against DRAFT | TBD P1-02 |
| BR-05 | F-03, F-04, SYS-03 | S1 | DB/API: repeated ACTIVE registration rejected; exactly one ACTIVE row | TBD P1-02 |
| BR-06 | F-03, SYS-03 | S1; regress S2/S3 | Real concurrent API/DB requests for final seat: successful count ≤1, never exceed capacity | TBD P1-02 |
| BR-07 | F-03, F-06 | S1 guard; S2 controls | Time boundary: expired/closed/not-open workshop rejects new registration | TBD P1-02 / S2 |
| BR-08 | F-03, F-06, F-07 | S1 guard; S2 edit | Default deadline=start; configured deadline after start rejected | TBD P1-02 / S2 |
| BR-09 | F-05 | S2 | API/DB: timely owner cancellation persists; late/duplicate/foreign attempt rejected | TBD S2 contract |
| BR-10 | F-05, F-06 | S2 | Close registration then allow timely ACTIVE cancellation; do not auto-reopen | TBD S2 contract |
| BR-11 | F-06 | S2 | Reopen before deadline accepted if eligible; at/after deadline rejected | TBD S2 contract |
| BR-12 | F-05, F-03 | S2 | Re-register after cancelled when eligible; duplicate/full/closed/expired rejected | TBD S2 contract |
| BR-13 | F-07 | S2 | API/DB: capacity below ACTIVE count rejected; equal/above permitted by policy | TBD S2 contract |
| BR-14 | F-08 | S3 (start P2) | API/DB: duplicate check-in, outside window, foreign event, inactive registration denied | TBD S3 contract |
| BR-15 | F-09 | S3 | Unit + API/DB: remaining/attendance/no-show correct; zero-active rate 0% | TBD S3 contract |
| BR-16 | F-07, F-06 | S2 | Rule-driven edit cases once post-publication edit policy is approved | **OPEN DEC-07; TBD** |

## 4. Non-functional requirement matrix

| Requirement | Feature/responsibility | Planned verification checkpoint | Measurable evidence required | Status |
|---|---|---|---|---|
| NFR-01 | F-01–F-09, SYS-02 | S1 plus S2/S3 regression | Protected-route test matrix: no unauthorized private data; hash storage inspection; actual test file/output/SHA | NOT EXECUTED |
| NFR-02 | F-02–F-08, SYS-01 | S1 local; Lab 5 deployed; Final | Persist and read after restart/redeploy, with DB instance and release IDs | NOT EXECUTED |
| NFR-03 | F-03, SYS-03 | S1; integrated regression | 10 concurrent real requests for one seat: exactly 1 success; DB ACTIVE count=capacity | NOT EXECUTED; provisional number |
| NFR-04 | F-09, SYS-05 | S3 | 100 events/10 users p95 ≤3s measurement, environment and sample method | NOT EXECUTED; provisional target |
| NFR-05 | F-01–F-09, SYS-05 | S3 final UX | Checks at 375px and 1280px against specified key journeys | NOT EXECUTED; provisional widths |
| NFR-06 | SYS-04 | **S1/D1** relevant-PR build + automated tests and failed-check exclusion; **Lab 5** hosted CI enforcement, Docker/GCP; D2/Final regression | **S1:** per-PR applicable build/test command, output/status and tested SHA, reviewer gate evidence, no failed required check integrated/released, reviewed staging→main PR. **Lab 5:** hosted status checks with deliberate failure blocked, Docker image and GCP deployment linked to released SHA. Neither gate nor tests are asserted as executed here. | NOT EXECUTED; Sprint 1 PR gate required before Lab 5 |
| NFR-07 | F-01, SYS-02, SYS-04 | All sprints | Example env only; repo/diff/secret scan; synthetic seed evidence | NOT EXECUTED |

## 5. Coverage accounting and risks

| Metric | DRAFT planned coverage | Verified implementation |
|---|---|---|
| Functional requirements | 15/15 mapped to at least one Feature | **0/15 verified** |
| Business rules | 16/16 mapped | **0/16 verified** |
| Important NFRs | 7/7 mapped to Feature and/or SYS responsibility | **0/7 verified** |
| Sprint 1 AC/STS | **Not authored here**; planned in P1-02 | **0 written/0 executed** |
| Approved scope | **Not verified**; FR-15 and several detailed rules require approval | **No approval evidence** |

**Known open verification dependencies:** `DEC-03` incomplete drafts, `DEC-04` deadline/time zone/boundary, `DEC-06` cancellation/history UI, `DEC-07` published-event edits, `DEC-09` metric interpretation, `DEC-11` public/filter scope, and `DEC-12` NFR thresholds. They are **not silently treated as resolved**.

## 6. Required updates at later checkpoints

1. **P1-02 before implementation:** Add final contract version, AC IDs, planned TEST IDs/levels/preconditions/outcomes for every Sprint 1 behavior, especially negative/ownership and concurrent final-seat cases.
2. **After each feature test execution:** Add actual `test file::test name`, build/test command, pass/fail/skipped count, tested commit SHA and reviewed PR/release. Never label a pending check PASS.
3. **D2:** Include all S2 AC and results, actual S3 implemented progress, deployed integration/regression checks, open defects, and approved baseline changes.
4. **Final:** Include complete FR/BR/NFR → Feature → Sprint → AC/verification → test file or measurement → result → **final released commit**; preserve rejected or incomplete requirements explicitly.

| Version | Date | Revision | Approval |
|---|---|---|---|
| v0.1 | 2026-11-03 | Initial **DRAFT** full-baseline mapping; no actual test claims | Pending both students |
| v0.1.1 | 2026-11-03 | R-01: NFR-06 verification explicitly splits Sprint 1 PR checks from Lab 5 hosted CI/CD | Pending re-review and both students |
