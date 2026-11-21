---
name: development
description: >-
  Complete one authorized TTworkshop Issue with specification, code, complete
  tests, evidence and a single reviewable PR.
---

# Development

Follow [root AGENTS.md](../../../AGENTS.md); this Skill is procedural, not
independent permission.

1. Verify Issue, Owner/independent Reviewer, target staging, Period, old PRs,
   actual worktree, approved SRS/SDS/contract, FR/BR/NFR, AC/STS/DoD and rubric.
   Record scope/exclusions and dependencies before editing.
2. Map every in-scope AC to implementation and meaningful
   unit/API/DB/UI/regression tests. For rule/defect/change work demonstrate RED
   before GREEN where appropriate; never invent historical test execution.
3. Implement backend-enforced role/ownership rules, transactions, persistence,
   validation, errors and negative/boundary paths as needed. Do not alter
   unrelated product behavior or real data.
4. Run the full available suite and AI-accessible manual checks using
   [Testing](../testing/SKILL.md). Investigate, fix and retest recoverable
   failures.
5. Update affected current docs, contracts, traceability, DoD and evidence;
   preserve dated snapshots. Inspect `git status`, `git diff --check`, complete
   diff and secrets. Record tested exact SHA, commands, counts, environment and
   limits.
6. Open/update the single Issue PR into staging with completion matrix
   `file/item | current/historical/post-merge | evidence | remaining gate | owner`
   and one actionable independent Reviewer handoff.
7. Handle binding Reviewer `REQUEST_CHANGES` in **the same unmerged PR**, rerun
   applicable full regression and request six-axis re-review on new HEAD. Author
   never merges own PR.
8. After independently authorized merge, verify actual staging SHA/tree and
   finish original Issue checks/Project/closure only under valid completion
   authority.
