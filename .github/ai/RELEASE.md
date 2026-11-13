# Merge, Integration, Kanban and Release Rules

Read root `AGENTS.md` and `ISSUE-PR-POLICY.md`, plus applicable mode policy and approved official course/repo release sources. The default path is:

`feature or docs branch → PR to sprint_N_staging → independent peer review → teammate merge → Author post-merge verification → original Issue completion`

A separate authorized release/integration Issue with independently reviewed release PR is required for `sprint_N_staging → main` when the agreed workflow calls for release. No direct unreviewed push or self-merge to `main`. Do not infer deploy or production readiness from staging merge.

## Conditional review-to-merge-to-closure flow — Issue #37 proposal (INACTIVE)

The user may **in a future activated policy revision** grant the independent teammate a bounded `MERGE_STAGING` permission alongside separately identified `SUBMIT_REVIEW` and Author post-merge completion permissions in a single initial instruction. It is a distinct conditional grant, **not** automatic permission inferred from an `APPROVED` message. Current active policy still requires existing separate action-specific authorizations. No self-merge; never auto-merge `main` or release/deploy.

A real `CHANGES_REQUESTED` means Author continues ordinary scoped fixes and retests on the **same unmerged PR** under an already valid work grant, without re-requesting that same permission. A real independent `APPROVED` triggers a new read-back of reviewed HEAD/base, Review actor/state, binding threads, exact-HEAD checks, enforceable required protection and mergeability. Merge only if each live gate passes and this Reviewer's own explicit merge grant is valid. If changed HEAD, missing check/protection, unavailable permissions or stale approval, stop the merge, preserve state and report the exact blocker.

After verified merge SHA/tree, the Author's separately scoped completion grant permits post-merge regression checks, evidence in original Issue, evidenced AC checklist, Project #4 Status/Period read-back and issue closure; no repeated permission request for the same valid grant. Do not treat workflow descriptions as a currently deployed autonomous Controller.

## Before approve/merge
- Verify the exact reviewed HEAD, applicable AC/STS/DoD, actual tests and evidence, independent reviewer and all blocking review threads.
- Developer/Reviewer must complete in-scope current-status documentation in the same work PR; only genuinely future merge facts belong in post-merge Issue evidence.
- No unstated instructor approval, global SRS/SDS approval, hosted CI or cloud deployment claims.

## Post-merge
- Verify actual merged commit and target branch/head (may have advanced after merge), and that intended feature tree/content is integrated. Run required Author tests against the merged code with isolated test DB, and report commands, environment, SHA, counts and limits.
- In original Issue record completion evidence, update evidenced checklist and Project #4 Status/Period with read-back, and close only after separately authorized completion gates. An approved PR or merge alone is not `Done`.
- If post-merge tests FAIL, report the exact regression and issue state; a genuine new repository edit after a merged work PR requires a separately approved bounded fix Issue/PR, not a second PR under the previous Issue. Do not manufacture a fix ticket for historical snapshots or tracker-only status completion.
- Release Auditor uses verified live artifacts (Issue, PR, merged staging commit, applicable acceptance tests, versioned course deliverables and real deployment evidence); report `READY / BLOCKED / NOT VERIFIED`, never invent successful deployment.

## Proposed Batch-authorized staging merge / completion (INACTIVE until governance merge)

**Scope:** only reviewed PRs targeting an explicitly granted `sprint_N_staging` branch. Never automate `main` merges, direct pushes, GitHub Releases/tags, deployment, course submissions or branch-protection changes. The Controller may route a ready-to-merge request but does **not** itself perform GitHub Merge or decide engineering quality: only the designated authenticated independent teammate Agent may merge after a fresh gate check and an explicit per-PR/per-Issue `MERGE_STAGING` grant.

**All merge predicates must be true immediately before execution:**
1. Author and merging Reviewer/teammate are distinct authenticated GitHub accounts; current Issue↔PR and approved scope, target branch and latest PR HEAD/base match signed grant and expected state. No unauthorised force-push or scope drift.
2. Formal GitHub `APPROVED` review exists from the independent Reviewer and is still valid on *current HEAD*. No newer `CHANGES_REQUESTED`, unresolved binding inline thread, outstanding formal rejection or required re-review. An `APPROVED` relay payload alone is insufficient.
3. Required AC/STS/DoD and current docs/Completion Matrix are evidenced, required build/tests on exact candidate HEAD actually PASS, no mandatory check skipped/failed, and repository's required status checks (including any merge queue constraints) are **configured and enforced**. The Branch Protection/Ruleset and current Check Runs must be fetched live. **If no enforceable protection/required checks are configured, or their validity cannot be verified, AUTOMATIC STAGING MERGE IS BLOCKED** and the workflow requests a *separately human-authorized manual merge*; never silently treat an empty required-check list as PASS.
4. PR is conflict-free/mergeable, approved HEAD/base unchanged at merge time, GitHub permissions and course peer-review constraints satisfied. Revalidate immediately before writing and after any retry; a time-of-check race => STOP + re-review/reconcile, not a blind retry.
5. On an explicitly authorized merge, only the independent teammate executes and reads back actual merge SHA, parents/tree, target staging HEAD and review provenance. If content differs from reviewed intended tree or post-merge tests FAIL, mark `BLOCKED`, retain original Issue OPEN and stop dependent work.
6. Author independently checks actual merged SHA and runs relevant build/tests, posts verifiable commands/results to original Issue, updates the correct AC/DoD and Project `Done` preserving Period and closes only if distinct grant(s) for checklist, board and closure exist and **all completion gates** pass. The Controller may emit `ISSUE_COMPLETED` only after GitHub read-back confirms all. Failed tasks remain pending; next Issue starts only if preauthorized, unblocked and dependency-ready.

Current repository branch protection and ruleset state must be observed, not presumed. During audit (2026-11-13), `main` and `sprint_1_staging` protection returned 404 and rulesets were empty; this is **time-stamped evidence**, not a standing claim for future sessions. A future implementation must explicitly validate and enforce equivalent gates before enabling AUTO staging merge.
