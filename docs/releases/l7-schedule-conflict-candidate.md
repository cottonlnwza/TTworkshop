# Lab 7 release candidate and readiness record

**Issue:** [#84 (L7-03)](https://github.com/cottonlnwza/TTworkshop/issues/84) · **Group:** TH-033_P3 / Section 131 · **Deadline:** 29 November 2026, 23:59 ICT

**Owner:** cottonlnwza · **Independent reviewer, authorized main merger and production reviewer:** thananun-7203

**Scope:** Maintained Sprint 1 F-01–F-04, including the bounded F-03 rule change BR-05b. The release also carries the existing Sprint 2 and F-08 code from D2.

## Part B | Version table and release gates

| Milestone | Exact identity and evidence |
|---|---|
| Original Sprint 1 release | [3f5ec15a1bc2a94d1b16003e1baa531dff4a7256](https://github.com/cottonlnwza/TTworkshop/commit/3f5ec15a1bc2a94d1b16003e1baa531dff4a7256), PR #26 |
| Accepted Sprint 1 after partner UAT | [4efbcfac51872b3b78542c48c62c35cc01c24182](https://github.com/cottonlnwza/TTworkshop/commit/4efbcfac51872b3b78542c48c62c35cc01c24182), Lab 6 revision `ttworkshop-00017-poy`, [TH-038 retest and acceptance](https://github.com/cottonlnwza/TTworkshop/issues/63#issuecomment-7094316414) |
| D2 main and live pre-release version | [b111ffcd114f03effd2175991b23d4f702362c3f](https://github.com/cottonlnwza/TTworkshop/commit/b111ffcd114f03effd2175991b23d4f702362c3f), [deployment run 45236689037](https://github.com/cottonlnwza/TTworkshop/actions/runs/45236689037). Read-back on 25 November showed Ready `ttworkshop-00019-nul` serving 100% at digest `sha256:7f0ee3e4f636b3eca3455db2db7ef3df8ae01bc998e8d90dcd0c3f34b7e193f2`. Public `/health` returned HTTP 200. |
| Part A accepted and source before any test or implementation | [421705d3f0c8d7c4f489b573f8471621c2035098](https://github.com/cottonlnwza/TTworkshop/commit/421705d3f0c8d7c4f489b573f8471621c2035098), [PR #86 review](https://github.com/cottonlnwza/TTworkshop/pull/86#pullrequestreview-6043883961). The commit on staging predates the test-only commit below. |
| Part B original RED and GREEN | `70f67afe22f93617a8367505793ec23da7f26e1a` (test-only RED, 3 failed / 26 passed) → `24dfdfdd76779ba3b851f274598e6500cc1b8c7b` (code-only GREEN, 29/29). `0389eee736cc52709c3f3689296555cdf6e5f0f2` isolates the repeated F-07 fixture dates. |
| Precision finding and accepted staging | [R-01 review](https://github.com/cottonlnwza/TTworkshop/pull/87#pullrequestreview-6044563039) → `950d4b68e81e4f5073b2e23ec6058af72d87becb` (PostgreSQL precision fix) → [approved HEAD](https://github.com/cottonlnwza/TTworkshop/pull/87#pullrequestreview-6044829151) `54591522c335bda8856f65a5f0c1d675f87c734a` → staging [04504644143d93f560594a037cd1d3e9ec7b6e09](https://github.com/cottonlnwza/TTworkshop/commit/04504644143d93f560594a037cd1d3e9ec7b6e09), [CI 45457122112](https://github.com/cottonlnwza/TTworkshop/actions/runs/45457122112) |
| Reviewed release candidate | The release PR records its exact HEAD, CI and review. It integrates the accepted staging source above onto D2 main while preserving main-only Lab 5/6 and D2 records. |
| Accepted Lab 7 main release and deployed identity | Pending independent release approval, authorized main merge, matching post-merge CI, production approval and deployment. Record the merged main SHA, workflow URL, migration job result, immutable image digest, Ready revision, traffic and public URL once verified. |

The [Part A contract and impact analysis](../labs/lab-07/change-impact-and-contract.md) and [Part B execution record](../labs/lab-07/implementation-and-regression.md) retain the approved rule, pre-implementation history, RED/GREEN outputs and regression scope. The release adds no SQL migrations. Use the existing [gated deployment workflow](../../.github/workflows/deploy-main.yml) and [setup instructions](../../README.md).

### Selected production acceptance and read-back

The following cases are **planned** for the accepted Lab 7 revision. Use dedicated synthetic accounts and workshops with future open registration, distinct evidence labels and sufficient capacity except in the capacity case. Capture timestamps in ICT, revision, safe response data and expected versus actual results. Keep credentials and session values in the private handoff.

| ID | Scenario and expected result |
|---|---|
| L7-B-PROD-01 | Synthetic Participant A registers for W1 (201). A selects the overlapping W2 and gets `409 SCHEDULE_CONFLICT` in the detail view with no W2 registration. A can register for W3 when W3 starts exactly at W1's end (201). |
| L7-B-PROD-02 | A reloads or signs in again and sees the same W1 and W3 registration IDs and ACTIVE status. The owning Organizer reads the W1 roster. Participant B cannot read A's private registration (404), and an Organizer cannot call the Participant registration operation (403). |
| L7-B-PROD-03 | With capacity remaining, A repeats W1 and gets `409 DUPLICATE_ACTIVE`. Use a separate capacity-one fixture with eligible, distinct Participants and check the second attempt gets `409 CAPACITY_FULL`. Read back the roster count. |
| L7-B-PROD-04 | Verify the hosted deploy chain for exact main SHA, digest, Ready revision and 100% traffic. Record migration job and public smoke separately from the domain outcomes above. D2 `ttworkshop-00019-nul` is the prior verified revision if a rollback review is required. |

## Part C | Dated engineering metrics

Snapshot **25 November 2026, 01:22:06 ICT**. The Lab 7 preparation window starts **24 November 2026, 23:30 ICT**, immediately before the first relevant PR CI run. Metrics for the release candidate can be refreshed in the final PDF with a distinct later timestamp.

| ID | Definition and scope | Measured value | Reconciliation source |
|---|---|---|---|
| L7-C-01 | Lab 7 Issues #85, #83 and #84 closed as completed in the preparation window | **2 completed, 1 open** | [#85](https://github.com/cottonlnwza/TTworkshop/issues/85) closed 25 Nov 00:20:12; [#83](https://github.com/cottonlnwza/TTworkshop/issues/83) closed 25 Nov 01:17:30; [#84](https://github.com/cottonlnwza/TTworkshop/issues/84) open at cutoff |
| L7-C-02 | Lab 7 Part A and B PRs merged into sprint staging in that window | **2 merges** | [#86](https://github.com/cottonlnwza/TTworkshop/pull/86) merged 25 Nov 00:09:14 to `421705d3`; [#87](https://github.com/cottonlnwza/TTworkshop/pull/87) merged 25 Nov 01:13:12 to `04504644` |
| L7-C-03 | Hosted full regression on exact staging `04504644` | **196 passed / 0 failed / 0 skipped** (32 Vitest files); Python **41 passed** | [CI 45457122112](https://github.com/cottonlnwza/TTworkshop/actions/runs/45457122112) |
| L7-C-04 | Status on 25 Nov 01:22:06 of the Sprint 1 partner-reported UAT defect tracked by #63. Resolved requires partner retest acceptance and an issue closure. | **1 resolved / 0 open in that tracked set** | [DEF-TTW-TH038-01](https://github.com/cottonlnwza/TTworkshop/issues/63#issuecomment-7094316414), login-validation defect; TH-038 retest accepted, #63 closed 23 Nov 14:25:43 ICT. This is Lab 6 UAT evidence and a preserved Sprint 1 baseline. |
| L7-C-05 | CI Quality Gate runs in the window for PR #86, PR #87 and their two exact staging merge commits | **6 success / 0 failure / 0 cancelled** | Run ledger below. Excludes local RED tests, Lab 6/D2 runs and the later L7-03 release gates. |

| Run | Event and version | Outcome |
|---|---|---|
| [45438127882](https://github.com/cottonlnwza/TTworkshop/actions/runs/45438127882) | PR #86 `ab1aa298` | Success |
| [45440509461](https://github.com/cottonlnwza/TTworkshop/actions/runs/45440509461) | PR #86 `65a5965c` | Success |
| [45445346823](https://github.com/cottonlnwza/TTworkshop/actions/runs/45445346823) | Staging merge `421705d3` | Success |
| [45450812959](https://github.com/cottonlnwza/TTworkshop/actions/runs/45450812959) | PR #87 `b2fc95a6` | Success |
| [45456349155](https://github.com/cottonlnwza/TTworkshop/actions/runs/45456349155) | PR #87 `54591522` | Success |
| [45457122112](https://github.com/cottonlnwza/TTworkshop/actions/runs/45457122112) | Staging merge `04504644` | Success |

**Interpretation and action (48 words).** Six green CI runs measured their configured suites. Review reproduced a precision defect after the first Part B run passed. Before final release, cottonlnwza will verify that database-time boundary tests preserve native PostgreSQL precision and include the exact-SHA regression output and reviewed production read-back in the release evidence.

## Part D | Readiness and retrospective

**Current verdict: NOT READY for Lab 7 production submission.** The maintained behavior is integrated and tested on staging. The current serving revision belongs to D2. Update the verdict after the main approval, exact-SHA deployment and production acceptance cases are verified.

| Area | Status and owner/action |
|---|---|
| Submitted and deployed versions | Pending Lab 7 main and deploy evidence. cottonlnwza records the version chain after release. |
| Tracked defects | Lab 6 DEF-TTW-TH038-01 (Medium) was resolved and partner-retested. PR #87 R-01 was a binding precision finding, corrected and independently verified on staging. Production verification remains open for L7. |
| Regression and selected user checks | Staging CI 196/196 Vitest and 41/41 Python. The post-deploy checks above remain planned. Record any failed or skipped results individually. |
| Configuration and credentials | Existing gated environment, Secret Manager bindings, migration job and runbook. Use only synthetic accounts for submission evidence. |
| Documentation | Part A and B evidence is versioned. Both students verify the handout's six checklist items and the separate Lab 7 PDF after the evidence is complete. |
| Technical debt | Browse conflict badge and server-derived `already_registered` are deferred. Users learn the conflict at registration. Review the UX and required query scope after final core regression. Owner: team. Priority: medium. |

- **What helped:** The contract review isolated an invalid cancellation fixture before implementation. The recorded RED and GREEN commits made the new behavior verifiable.
- **What hurt:** Ordinary timestamp fixtures missed the precision loss from JavaScript Date. Independent API testing found the defect before staging approval.
- **What changes:** Define half-open boundary cases at persisted database precision during test design, and retain exact-SHA hosted results and post-deployment observations together.

**Contributions:** thananun-7203 authored Part A and Part B, including tests, implementation and evidence. cottonlnwza independently reviewed #86 and #87 and leads release verification and evidence assembly. The release PR and GitHub review record will identify the later independent approval and production actor. Both members verify the final PDF.

**AI use and limitations:** Codex assisted with source and diff inspection, test execution, evidence reconciliation and document preparation under cottonlnwza. GitHub, CI, and Cloud Run are the evidence sources. Deployment and production acceptance have to be verified on the actual Lab 7 revision. Submission remains a separate team action.
