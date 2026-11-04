# P1-EX01 — Sprint 1 baseline and F-02 decision acceptance ledger

> **Reconciliation proposal v0.1 — 2026-11-05** · [Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11) · Author: `cottonlnwza` · Intended independent Reviewer: `thananun-7203`  
> This ledger documents **historical, independently verifiable scoped acceptance**. Its own Issue #11 change is **NOT YET REVIEWED/MERGED**. It does not grant approval for feature implementation, instructor sign-off, or unrelated open decisions.

## 1. What the existing review evidence actually accepts

| Previous scope | Historical evidence | Verified meaning | What remains excluded |
|---|---|---|---|
| [Issue #1](https://github.com/cottonlnwza/TTworkshop/issues/1), baseline **DRAFT** | [PR #7](https://github.com/cottonlnwza/TTworkshop/pull/7), independently approved by `thananun-7203`, merged as `d8782e1b61063088d7bfa75cd2de2385073f3648` | Five proposed baseline documents written, reviewed and integrated; Issue #1 is closed for its **draft preparation** scope | Approval of every FR/BR/NFR, every product decision, instructor sign-off, or executable feature tests |
| [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2), feature-contract **DRAFT** | [PR #8](https://github.com/cottonlnwza/TTworkshop/pull/8), independently approved by `thananun-7203`, merged as `883f451c7a8c2ced1f54bf5b5f0c702ca5c65311` | Initial feature SDS/AC/STS/DoD planning was reviewed/merged; historical count **41 AC/41 planned STS** | Execution of planned STS, overall product acceptance or new implementation |
| [Issue #4](https://github.com/cottonlnwza/TTworkshop/issues/4), F-02 **documentation milestone** | [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10) independently approved by `cottonlnwza` on head `671a98e63426932d322f6c279cf4afedad3ec660`, merged into `sprint_1_staging` at `a863246553f4552d438a4f0649863ff67d28833e`; Author's post-merge verification is recorded in Issue #4 | Reviewed/merged **scoped working F-02 proposal**; Reviewer explicitly states DEC-02/03/04/10-F02 become accepted **scoped working choices after merge and Author verification**; current F-02 plan has **12 AC/12 planned STS**, and all Sprint 1 plans total **42/42** | F-02 implementation, any executable F-02 STS, PostgreSQL/API/E2E validation, whole-product baseline approval or instructor sign-off |
| [Issue #3](https://github.com/cottonlnwza/TTworkshop/issues/3), F-01 implementation | [PR #9](https://github.com/cottonlnwza/TTworkshop/pull/9), merged to staging `21e9d9de83ccef24214484ab159a83d398f544b3` | F-01 independently reviewed implementation; post-merge report records **21/21 local application tests and build PASS** | F-02/F-03/F-04 functionality or proof that every planned F-01 STS ran |

Historical PR #10 Review wording: “APPROVED for this scoped F-02 documentation working-contract change”; it specifies that DEC-02/03/04/10-F02 become accepted **scoped working choices** after teammate merge and Author post-merge verification. **Those two conditions have separate recorded evidence.** This is a narrower acceptance than a fully signed-off SRS, SDS or course submission.

## 2. F-02 decision-by-decision reconciliation

| Decision | Existing scoped choice (do not silently alter) | Evidence status | Remaining boundary |
|---|---|---|---|
| [DEC-02](dec-02-workshop-fields.md) | Workshop title, description, location, start/end, positive integer publication capacity, optional deadline; server-owned `owner_user_id` and publication state | **SCOPED WORKING CHOICE ACCEPTED** by PR #10 review + merge + Author verification | Field-length constraints remain unspecified; not instructor/global approval |
| [DEC-03](dec-03-workshop-drafts.md) | Incomplete DRAFT Create; owner-only PATCH of the **same** DRAFT; publication checks complete fields; no post-publication edit in F-02 | **SCOPED WORKING CHOICE ACCEPTED** by PR #10 review + merge + Author verification | Sprint 2 post-publication editing remains separate |
| [DEC-04](dec-04-workshop-time.md) | Explicit-offset ISO 8601 API values, PostgreSQL `timestamptz`, configured university timezone, optional deadline with default = start and closed-at-equality | **SCOPED WORKING CHOICE ACCEPTED** by PR #10 review + merge + Author verification | Actual university timezone identifier must be provided **as configuration**, never guessed/hard-coded; F-03 owns registration-time eligibility tests |
| [DEC-10-F02](dec-10-f02-stack.md) | Reuse implemented F-01 React/Vite/Express/PostgreSQL/`pg` stack and session middleware for F-02 | **SCOPED WORKING CHOICE ACCEPTED** by PR #10 review + merge + Author verification | No approval of global GCP/CI architecture or code not yet written |

**Acceptance levels must remain distinct:**

1. **Peer-approved and merged documentation:** Historical PR #7/#8/#10 — **YES, verified**.
2. **F-02 scoped working decisions/contract:** PR #10 states conditional acceptance; peer merge and Author post-merge verification are both evidenced — **YES for this limited scope**.
3. **Entire product SRS/System SDS/Feature Inventory formally approved:** **NOT VERIFIED**; preserve `DRAFT / NOT APPROVED` global banners instead of pretending every open decision is settled.
4. **F-02 executable implementation and AC/STS test results:** **NOT DONE**; to be handled only by [Issue #12](https://github.com/cottonlnwza/TTworkshop/issues/12) with its **own** branch, PR and explicit execution authorization.
5. **Issue #11 completion:** **PENDING** new independent peer review/merge and Author post-merge verification of this reconciliation; the ledger alone does not close the approval process.

## 3. Forward-only Issue → PR mapping

| Issue | Kind | Exactly one owned work PR | Current disposition |
|---|---|---|---|
| #1 | Draft baseline documentation | #7 merged | Completed historical draft scope; do not reopen |
| #2 | Draft feature contracts | #8 merged | Completed historical draft scope; do not reopen |
| #3 | F-01 implementation | #9 merged | Completed historical F-01 scope; do not reopen |
| #4 | F-02 documentation subset under a larger historic title | #10 merged | **Historical docs delivered; entire F-02 feature NOT DONE**; do not add a second PR, re-label as fully implemented or change #4 here |
| **#11** | This bounded baseline/decision reconciliation | **One new PR only, once ready** | Started; no acceptance implied by creating this ledger |
| [#12](https://github.com/cottonlnwza/TTworkshop/issues/12) | Remaining F-02 implementation | **Its own later PR** | Backlog; implementation not authorized here |
| #5 / #6 | F-03 / F-04 implementation | None yet | Original backlog; never fold into #11 or #12 |

New work continues **#11 reconciliation → #12 F-02 implementation → #5 F-03 → #6 F-04**. Any later administrative close of historical #4 requires **separate user approval** and a truthful disposition, not a fake `Done` for F-02.

## 4. Scope and verification checklist for this Issue only

- [ ] AC-A01: All touched documents accurately identify **historical peer-merged scoped work** vs **global approval unknown**; links/SHAs trace back to real PRs.
- [ ] AC-A02: F-02 DEC-02/03/04/10-F02 each has specific accepted scoped behavior and evidence; unresolved configuration/future decisions are not silently accepted.
- [ ] AC-A03: FR-03–05, BR-01–04/08, NFR-01/02 and F-02 AC-F02-01–12 / planned STS-F02-01–12 remain consistent; no changed normative requirement/test IDs.
- [ ] AC-A04: Other Decisions (e.g. DEC-11 anonymous browsing, DEC-12 concurrency target, later post-publication editing and cloud deployment) remain OPEN wherever not evidenced.
- [ ] Documentation consistency / links / Markdown / `git diff --check` validated against tested commit.
- [ ] **Review gate:** teammate `thananun-7203` reviews **this** Issue's PR and verifies each accepted scope. No author self-review, merge or automatic Issue closure.

**Course source:** `group_work_specs_v1.pdf` §§5, 8 and `project_deliverable_1_v1.pdf` Parts A–E. Both require versioned decisions and testable contracts, but do **not** prescribe the team's strict 1-Issue/1-PR policy. No executable F-02 tests, database, CI, release or instructor sign-off is claimed.
