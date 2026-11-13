# TTworkshop One Issue ↔ One PR and Completion-first Policy

**Revision:** 1.1.0 — **PROPOSED / NOT ACTIVE** until separately authorized independent governance review and actual merge into the agreed policy ref. All pre-existing 1.0.0 separate authorization gates remain applicable until then. User-requested governance, not a professor-imposed 1:1 rule.

## Canonical scoped authorization and no-repeat workflow — Issue #37 proposal (INACTIVE)

**Single user instruction, distinct grants:** For a future activated governance version, one explicit human instruction approving a bounded Issue or finite batch MAY contain separately enumerated, attributable, conditional rights for (a) Author implementation/test/commit/push/PR and same-PR in-scope rework, (b) independent Reviewer's Formal GitHub Review on actual current HEAD, (c) independently authenticated teammate's staging merge only after real approval, protected checks and mergeability, and (d) Author post-merge test/Issue checklist/Project status/closure after real merge evidence. A broad goal such as "do this Issue" alone never silently grants missing action- or principal-specific rights; the initial grant explicitly names them. This paragraph is **proposed** and does not activate the future batch authorization in the current v1.2.1 policy.

**No repeat prompts when already authorized:** Once a distinct scoped grant exists and remains valid, do not interrupt for another approval for its ordinary execution, failed tests, repeated rework, re-review on new HEAD, or re-checks in the same Issue. Re-validate grant scope, identity, SHA, branch and stop conditions rather than re-requesting permission. Failed/unverified gates stop only the affected action; unblocked permitted work may continue. New Issue, out-of-scope feature, changed requirement, permission/branch-setting change, staging-to-main release/deploy or revoked/expired grant needs a new appropriate grant.

**Reviewer result drives rework, not a fresh Author command:** A genuinely binding `CHANGES_REQUESTED` on original PR directs Developer to correct all in-scope findings on that same PR, run required regression checks, attach the new HEAD evidence, then return for another full independent six-axis review. Do not open another Issue merely for ordinary review remediation. On `APPROVED`, do not infer permission to merge: independently recheck the exact current reviewed HEAD, required CI/protections, independent approvals, conversations and the explicit staging-merge grant.

**Communication contract:** Preserve one useful PR body/Completion Matrix and one consolidated findings disposition per review round, rather than many top-level acknowledgments or duplicate handoffs. Additional comments only when they convey material new evidence, a binding defect, an explicit decision, or a real execution blocker. There is no artificial maximum on PRs or comments. Preserve issue/PR audit history.

**Canonical precedence:** This section is the reference for repeated permission and review-correction wording in other mode files. The current active separate-approval rules continue to apply **until** independent governance review and actual merge activate the corresponding policy revision. No policy text alone starts Agent A/B running asynchronously.

## Hard mapping and authority
- Exactly one execution Issue owns one work PR, and one work PR owns one execution Issue. Search open, closed and merged PR history before creating any PR. A closed/unmerged/merged PR does **not** free the Issue to take another PR.
- A feature Issue promising code must deliver code and required documentation in its **one PR**, not a docs-only PR followed by a separate code PR. If a genuinely separate specification approval task is necessary, propose its own bounded Issue/PR **before** beginning, with user authorization and explicit dependencies.
- All changes need bounded Issue scope and authorization. Period backlog creation is not permission to execute its Issues. Execution authorization allows normal scoped branch/commit/push/PR readiness work but not self-review, self-merge, release or deployment.
- Preserve completed Issue/PR/SHA/review/evidence as historical milestones. Never rewrite merged PR history or move `Done` / `PR Review` back to `Started` just to do new work.

## Pre-merge completion gate — prevention, not follow-up cleanup

Developer must inventory every in-scope current-status surface: root README, feature contract, DoD, `docs/evidence`, `docs/contracts/README.md`, relevant SRS/traceability/DEC records, Issue acceptance checklist and review findings. Classify each as `current`, `dated historical` or `post-merge only`.

Before requesting Formal APPROVE, update all in-scope **current** files on the **same PR** to report already-known pre-merge facts, tested exact HEAD, commands, results and limitations. Preserve dated revision records, past RED/GREEN logs, decisions and review milestones. Do not pretend the PR is merged or the post-merge run has happened.

Provide a Completion Matrix:

| Item/path | Current vs historical vs post-merge only | Evidence/ref | Remaining gate | Owner |
|---|---|---|---|---|

Reviewer must inspect actual files and matrix against the reviewed HEAD. Any binding missing AC/test/doc evidence or stale current status must be fixed on the **same PR before merge**. A truthful dated pre-merge snapshot is allowed; asking it to know a future merge SHA is invalid.

## After merge: original Issue completion, not a new PR

Author independently checks target staging, actual merge SHA and tree; runs applicable build/tests on the merged commit and records exact commands, environment, counts, limits and results. Post the Author verification comment on the **original Issue**, check only evidenced acceptance boxes, synchronize Project #4 status/Period with read-back and close the Issue **only when gates and explicit close authorization pass**.

Administrative Issue comments/checklist/board/closure are **not** a new implementation PR. If blocked, keep the real open status and document blockers.

## Mandatory classification before proposing a new Issue

1. **Pre-merge in-scope:** correct on current PR, do not create follow-up.
2. **Post-merge tracker-only:** complete in original Issue, no new PR.
3. **Accurate dated history:** preserve; no corrective ticket just to mention later events.
4. **Genuinely required source edit after merge, fresh defect or new approved requirement:** search existing Issue/PR ownership first; specify files, reason, AC/test impact, predecessor and why not covered earlier; propose **one separately authorized** Issue and PR. Never auto-create.

Do not hide legitimate defects or required approval/documentation to avoid a new Issue. Neither local Author tests nor an approved feature imply hosted CI, production deployment or global SRS/SDS approval.

## Project board

**Mandatory on adoption through an independently reviewed governance merge** (Issue #40): GitHub Issue creation does **not** automatically add a card to Project #4. Every **authorized** new Issue — including a new Sprint/Period backlog, an `AGENTS.md` governance change, a defect or other accepted work — must be added immediately to Project #4 and assigned its verified `Period` and `Backlog` Status. Confirm and report Issue-to-Project item ID, `Status`, and `Period` from a live read-back; if creation or permission fails, report `KANBAN NOT VERIFIED / BLOCKED`, not a fabricated board card. Creating the Issue/Backlog does not authorize implementation.

Use the **exact field options** `Backlog → Specified → Started → PR Review ↔ Fixing → Done` with event-based transitions: actual requirements/source/AC scoping → `Specified`; beginning authorized real implementation → `Started`; current-head PR, required evidence/checks and real independent reviewer handoff → `PR Review`; binding independent `REQUEST_CHANGES` with ongoing Author fixes on the **same PR** → `Fixing`, then fresh-head retest/resubmission → `PR Review`; only verified independent merge + post-merge tests/evidenced checklist + distinct completion grant → `Done` and original Issue closure. A PR that is merely open or has failed required CI is not `PR Review`-ready. **Do not invent, backdate or retroactively manufacture missed intermediate statuses.** Preserve correctly applied manual user/teammate moves, never regress a completed row, and re-read the **existing** state before every authorized mutation. The Author ordinarily owns stage transitions; the independent Reviewer owns actual Review decisions, not Author-owned tracker closure.

Each authorized transition must **read back** the same Project item/status/Period and report actual evidence. Missing Project item, incorrect Period, unavailable Project API/permissions or failed read-back → `KANBAN NOT VERIFIED / BLOCKED` with precise recovery action. Preserve course rubrics, distinct user permissions, independent six-axis Review, exact-HEAD checks and One Issue ↔ One PR. The compact shared entrypoint is root [`AGENTS.md`](../../AGENTS.md); this section is the canonical Project #4 lifecycle authority. No written workflow implies an automatically running Controller.

## Proposed Batch Grant and relay lifecycle (INACTIVE until governance merge)

**Authorization record contract:** each approved batch must contain `batch_id` (controller-issued), human approver and authenticated approval evidence, issue IDs in a finite ordered allowlist, owner + independent Reviewer GitHub account per Issue, branch target, scoped requirements/dependencies, allowed operations, action-specific grants, expiry or bounded validity, stop conditions, revocation source and append-only audit trail. Include explicit action permissions such as `IMPLEMENT`, `TEST`, `COMMIT_PUSH`, `OPEN_PR`, `SUBMIT_REVIEW`, `MERGE_STAGING`, `VERIFY_POST_MERGE`, `UPDATE_CHECKLIST`, `UPDATE_PROJECT`, `CLOSE_ISSUE` with principal and issue/PR bindings; missing fields deny action.

**Proposed explicit change to current separate-approval rule:** after this governance revision is ACTIVE, one human-approved batch may contain *several distinct and individually enumerated grants* for Issue execution, formal independent Review, authorized teammate staging Merge and original-Issue closure. This is not a generic blanket permission: separate grants for different GitHub principals remain separately verifiable at execution time, and all evidence gates remain mandatory. An old grant, an instruction in a Handoff or a broad goal must never imply these permissions. Until governance activation, obtain the existing separate authorizations for Review/Merge/Closure. Any new Issue, scope/requirements change, `main` integration, tag, deploy or LEB2 submission remains outside the batch unless separately approved under its appropriate rules; never add it automatically.

**Lifecycle:** (1) validate live policy SHA + grant + current Issue/PR ownership; (2) Developer performs scoped work, tests and one PR; (3) Reviewer independently performs all six axes on actual HEAD and submits GitHub review only under an expressly scoped grant; (4) CHANGES_REQUESTED reworks *same unmerged PR* and invalidates assumptions about old-HEAD approval; (5) staging merge only by independently authenticated teammate after live merge gate and explicit named `MERGE_STAGING` grant; (6) Author verifies actual staging merge SHA/tree and executes applicable tests; (7) only after matching authorized completion grants and real read-back update original Issue checklist, Project `Done` preserving Period and close with reason `completed`; (8) dispatch next **preapproved** Issue only after current verified completion and dependency checks. Log every step; no separate tracker-only PR.

**Fail closed:** absent/revoked/expired grant, changed policy SHA, PR HEAD/base, unresolved binding Review, failed/missing checks, missing completed AC/STS/DoD, wrong GitHub account, stale queue payload or absent branch protection blocks *that action*. Unaffected, dependency-independent authorized work may continue. A GitHub API success or message ACK alone is not completion. No auto-created Issues. End full batch in `WAITING_FOR_USER`.

[Structured Relay Protocol](AGENT-RELAY.md) defines the deterministic message schema/state-machine and does **not** relax this policy.
