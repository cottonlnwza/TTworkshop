# TTworkshop One Issue ↔ One PR and Completion-first Policy

**Governance baseline:** Issue #37 / PR #38 and Issue #40 / PR #41 were independently reviewed and merged into `sprint_1_staging`, last at `9c01bec446a2880c6f870304ea18931fa0253604`. Their text-level workflow/Kanban changes are merged on Sprint 1, and the new Issue #45 / PR #47 proposes reconciling/carrying them into `sprint_2_staging` while retaining Sprint 2 Reviewer handoffs. The Agent Relay Controller has **not** been built or activated. **Issue #45 proposed amendment:** one-time Issue consent and link-scoped Reviewer authority are not available until this change's own independent six-axis Review, authorized teammate staging merge and verified policy commit on Sprint 2. That branch-local adoption does not automatically alter the common `sprint_1_staging` policy ref. Until then, use the previously effective distinct authorization gates. One Issue ↔ one PR is the team's governance rule, not a separately invented course rubric requirement.

## Canonical one-time Issue authorization — Issue #45 amendment (PROPOSED until merged)

**Single approval request, distinct grants:** At initial Issue intake, the Agent presents a *single itemized authorization package*, including repo, Issue/new-Issue creation, Period, scope/AC/STS/DoD, independent Developer/Reviewer accounts, staging target and explicitly enumerated principal/action rights. The user's ONE affirmative answer can grant: `CREATE_ISSUE` (if needed); Author `SCOPE / BRANCH / IMPLEMENT / TEST / DOCS / COMMIT_PUSH / OPEN_PR / SAME_PR_REWORK / UPDATE_PROJECT`; independent Reviewer `SUBMIT_REVIEW`; independently authenticated teammate `MERGE_STAGING` with live predicates; Author `VERIFY_POST_MERGE / UPDATE_CHECKLIST / UPDATE_PROJECT / CLOSE_ISSUE`. Record the real approval statement, named Issue/PR/account and allowed actions in Issue/PR evidence. These are **separate, conditional, non-transferable permissions approved in one interaction**, not one permission shared by multiple GitHub identities. **DEVELOPER MUST NEVER MERGE OWN PR**. If the response approves only a subset, honor only that subset.

**Reviewer-by-link grant:** A user explicitly assigning an independent Reviewer to review a specific GitHub PR URL is an Issue/PR-scoped `SUBMIT_REVIEW` grant that includes formal `APPROVE`, `REQUEST_CHANGES`, `COMMENT` and re-review on updated HEAD for the same open PR, provided the independent identity and six-axis gates are satisfied. Merely pasting a URL for unrelated explanation does NOT grant review write access. Review approval is not staging merge authorization or evidence that current CI/protections/mergeability pass.

**No repeat prompts when already authorized:** The grant, recorded at intake, remains valid for its named Issue/PR/actor/actions unless revoked, exceeded or invalidated. Do NOT interrupt for another human approval for ordinary implementation, TDD/regression tests, same-PR corrections, re-review, evidence, or already-granted conditional teammate merge/Author completion. Re-read actual scope, actor, HEAD/base, stage, tests and safety predicates at execution time. Failed or unverified predicates block **only the affected step**. Out-of-scope requirement, genuinely new Issue, wrong actor, unavailable authorization, unsafe credential/billing/IAM action, branch-protection alteration, `main` release/deploy or revocation requires a new appropriate grant; never assume "finish no matter what" licenses bypass.

**Reviewer result drives rework, not a fresh Author command:** Binding `REQUEST_CHANGES` on original PR directs the already-authorized Developer to correct all in-scope findings on the same PR, rerun regression checks, attach new-HEAD evidence, and request a full independent six-axis re-review. Do not open another Issue merely for ordinary review remediation. On `APPROVED`, the separate authenticated teammate (never PR Author) may merge **only if** its `MERGE_STAGING` grant was actually included in the initial decision and fresh exact-reviewed HEAD/base, CI, enforced protections, conversations and mergeability pass. If automated merge gates are missing, automatic staging merge is blocked; only a specifically preauthorized manual fallback by the independent teammate, after applicable checks, can avoid another user request. The Developer cannot provide that fallback.

**Communication contract:** Preserve one useful PR body/Completion Matrix and one consolidated findings disposition per review round, rather than many top-level acknowledgments or duplicate handoffs. Additional comments only when they convey material new evidence, a binding defect, an explicit decision, or a real execution blocker. There is no artificial maximum on PRs or comments. Preserve issue/PR audit history.

**Canonical precedence:** This section owns the authorization rule for all role files. This new Issue #45 wording remains **PROPOSED** until independent governance Review and actual merge; the earlier separate-action permission rules remain applicable beforehand. Policy text alone does not cause asynchronous Agent A/B work, invoke the other account, or start a Controller.

## Hard mapping and authority
- Exactly one execution Issue owns one work PR, and one work PR owns one execution Issue. Search open, closed and merged PR history before creating any PR. A closed/unmerged/merged PR does **not** free the Issue to take another PR.
- A feature Issue promising code must deliver code and required documentation in its **one PR**, not a docs-only PR followed by a separate code PR. If a genuinely separate specification approval task is necessary, propose its own bounded Issue/PR **before** beginning, with user authorization and explicit dependencies.
- All changes need bounded Issue scope and explicit action/principal permission. Authorized backlog creation *alone* is not permission to implement. The new upfront approval may enumerate BOTH backlog creation and each named Issue's execution plus separate independent actor grants in the same answer, rather than treating them as consecutive user prompts. No self-review, self-merge, `main` release or deployment.
- Preserve completed Issue/PR/SHA/review/evidence as historical milestones. Never rewrite merged PR history or move `Done` / `PR Review` back to `Started` just to do new work.

## Pre-merge completion gate — prevention, not follow-up cleanup

Developer must inventory every in-scope current-status surface: root README, feature contract, DoD, `docs/evidence`, `docs/contracts/README.md`, relevant SRS/traceability/DEC records, Issue acceptance checklist and review findings. Classify each as `current`, `dated historical` or `post-merge only`.

Before requesting Formal APPROVE, update all in-scope **current** files on the **same PR** to report already-known pre-merge facts, tested exact HEAD, commands, results and limitations. Preserve dated revision records, past RED/GREEN logs, decisions and review milestones. Do not pretend the PR is merged or the post-merge run has happened.

Provide a Completion Matrix:

| Item/path | Current vs historical vs post-merge only | Evidence/ref | Remaining gate | Owner |
|---|---|---|---|---|

Reviewer must inspect actual files and matrix against the reviewed HEAD. Any binding missing AC/test/doc evidence or stale current status must be fixed on the **same PR before merge**. A truthful dated pre-merge snapshot is allowed; asking it to know a future merge SHA is invalid.

## After merge: original Issue completion, not a new PR

Author independently checks target staging, actual merge SHA and tree; runs applicable build/tests on the merged commit and records exact commands, environment, counts, limits and results. Post the Author verification comment on the **original Issue**, check only evidenced acceptance boxes, synchronize Project #4 status/Period with read-back and close the Issue **only when real gates and a valid closure grant (which may have been included in the upfront Issue approval) pass**. No extra mid-work permission prompt for an already-granted closure.

Administrative Issue comments/checklist/board/closure are **not** a new implementation PR. If blocked, keep the real open status and document blockers.

## Mandatory classification before proposing a new Issue

1. **Pre-merge in-scope:** correct on current PR, do not create follow-up.
2. **Post-merge tracker-only:** complete in original Issue, no new PR.
3. **Accurate dated history:** preserve; no corrective ticket just to mention later events.
4. **Genuinely required source edit after merge, fresh defect or new approved requirement:** search existing Issue/PR ownership first; specify files, reason, AC/test impact, predecessor and why not covered earlier; propose **one separately authorized** Issue and PR. Never auto-create.

Do not hide legitimate defects or required approval/documentation to avoid a new Issue. Neither local Author tests nor an approved feature imply hosted CI, production deployment or global SRS/SDS approval.

## Project board

**MANDATORY PRE-ACTION GATE:** This text was activated on `sprint_1_staging` through Issue #40 / PR #41; PR #47 now proposes its integration into `sprint_2_staging`. GitHub Issue creation does **not** automatically add a card to Project #4. Every **authorized** new Issue — Sprint/Period backlog, feature, governance, defect or support task — MUST be added immediately to Project #4, `Status = Backlog` and the evidenced correct `Period`. Read back Issue ID, Project item ID, `Status` and `Period` **before scoping/implementation continues**; if it fails, report `KANBAN NOT VERIFIED / BLOCKED`, not a fabricated card. Backlog creation alone is not implementation consent.

Use **exact field options** `Backlog → Specified → Started → PR Review ↔ Fixing → Done` and update **BEFORE the next action**, after the factual transition trigger:
1. Created Issue + Project item → `Backlog` with correct `Period`, immediately.
2. Actual sources/requirements/AC/STS/DoD reviewed and bounded plan complete → `Specified`, before branch/implementation.
3. Authorized branch/code/docs/design work is about to start → `Started`, before the first such action.
4. Single PR exists, exact HEAD and evidence/checks are review-ready → `PR Review`, before independent Reviewer handoff; opening an unready PR alone is not enough.
5. Independent binding Formal `REQUEST_CHANGES` and scoped rework about to start → `Fixing`, before corrections. After fixes/retests/new-HEAD review handoff, return to `PR Review`.
6. Independent staging merge SHA/tree is verified, Author post-merge tests and evidenced AC/DoD pass and closure grant is valid → `Done`, immediately before completing original Issue closure. An `APPROVE`, green CI or merged PR alone is not `Done`.

Always read live status/Period **before** writing and **read back** the same item/status/Period afterward; this is a gate, not a final-report chore. Preserve legitimate manually advanced states; do not invent/backdate missed stages, regress `Done`, or guess Period.

Each authorized transition must **read back** the same Project item/status/Period and report actual evidence. Missing Project item, incorrect Period, unavailable Project API/permissions or failed read-back → `KANBAN NOT VERIFIED / BLOCKED` with precise recovery action; do not silently advance the blocked phase. Stage changes can be covered by the initial Issue approval after this Issue #45 policy activates. Preserve course rubrics, independent six-axis Review, exact-HEAD checks and One Issue ↔ One PR. The shared entrypoint is root [`AGENTS.md`](../../AGENTS.md); this section is the canonical Project #4 lifecycle authority. No written workflow implies an automatically running Controller.

## Future Controller-specific Batch Grant and relay lifecycle (RUNTIME INACTIVE)

**Controller record contract (only if implemented):** a future automated batch will require `batch_id` (controller-issued), human approver and authenticated approval evidence, issue allowlist, independent Developer/Reviewer identities, target/scope, action/principal grants, expiration/revocation and append-only log. This machine metadata is NOT required to recognize a human's explicitly recorded per-Issue consent in chat/Issue/PR before a Controller exists. It does not waive any current live checks.

**Manual/chat grants vs future runtime:** After Issue #45 is independently merged into Sprint 2, one human Issue approval may contain separately enumerated grants for Developer, independent Reviewer, independent teammate merger and Author completion for work governed by that adopted branch policy. A Reviewer PR-link assignment also supplies a scoped Review grant. The dormant Controller protocol is optional infrastructure, NOT a separate activation prerequisite. The common `sprint_1_staging` ref remains unchanged unless separately synchronized/authorized; do not claim global policy migration. Do not infer an unlisted grant from a relay message or a generic goal. New Issue/scope, `main` integration, tag, deploy or LEB2 submission remain outside the Issue approval unless separately and explicitly approved.

**Lifecycle:** (1) validate live policy SHA + grant + current Issue/PR ownership; (2) Developer performs scoped work, tests and one PR; (3) Reviewer independently performs all six axes on actual HEAD and submits GitHub review only under an expressly scoped grant; (4) CHANGES_REQUESTED reworks *same unmerged PR* and invalidates assumptions about old-HEAD approval; (5) staging merge only by independently authenticated teammate after live merge gate and explicit named `MERGE_STAGING` grant; (6) Author verifies actual staging merge SHA/tree and executes applicable tests; (7) only after matching authorized completion grants and real read-back update original Issue checklist, Project `Done` preserving Period and close with reason `completed`; (8) dispatch next **preapproved** Issue only after current verified completion and dependency checks. Log every step; no separate tracker-only PR.

**Fail closed:** absent/revoked/expired grant, changed policy SHA, PR HEAD/base, unresolved binding Review, failed/missing checks, missing completed AC/STS/DoD, wrong GitHub account, stale queue payload or absent branch protection blocks *that action*. Unaffected, dependency-independent authorized work may continue. A GitHub API success or message ACK alone is not completion. No auto-created Issues. End full batch in `WAITING_FOR_USER`.

[Structured Relay Protocol](AGENT-RELAY.md) defines the deterministic message schema/state-machine and does **not** relax this policy.
