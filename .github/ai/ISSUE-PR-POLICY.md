# TTworkshop One Issue ↔ One PR and Completion-first Policy

**Revision:** 1.0.0. **Applicable:** all modes. User-requested governance, not a professor-imposed 1:1 rule.

## Hard mapping and authority
- Exactly one execution Issue owns one work PR, and one work PR owns one execution Issue. Search open, closed and merged PR history before creating any PR. A closed/unmerged/merged PR does **not** free the Issue to take another PR.
- A feature Issue promising code must deliver code and required documentation in its **one PR**, not a docs-only PR followed by a separate code PR. If a genuinely separate specification approval task is necessary, propose its own bounded Issue/PR **before** beginning, with user authorization and explicit dependencies.
- All changes need bounded Issue scope and authorization. Period backlog creation is not permission to execute its Issues. Execution authorization allows normal scoped branch/commit/push/PR readiness work but not self-review, self-merge, release or deployment.
- Preserve completed Issue/PR/SHA/review/evidence as historical milestones. Never rewrite merged PR history or move \`Done\` / \`PR Review\` back to \`Started\` just to do new work.

## Pre-merge completion gate — prevention, not follow-up cleanup

Developer must inventory every in-scope current-status surface: root README, feature contract, DoD, \`docs/evidence\`, \`docs/contracts/README.md\`, relevant SRS/traceability/DEC records, Issue acceptance checklist and review findings. Classify each as \`current\`, \`dated historical\` or \`post-merge only\`.

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

Project #4 fields \`Status\` and \`Period\` must match actual verified workflow stages. Typical progression: Backlog → Specified → Started → PR Review ↔ Fixing → Done. Do not fabricate skipped history or rewind completed work. Every authorized stage change requires read-back and explicit reporting. If unavailable: \`KANBAN NOT VERIFIED / BLOCKED\`.
