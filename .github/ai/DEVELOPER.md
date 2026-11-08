# Developer Mode — Specification-first, evidence-first, completion-first

Read \`AGENTS.md\` and \`.github/ai/ISSUE-PR-POLICY.md\` first, from the team's common policy ref; report SHA. Then read official requirements, approved working SRS/SDS/decisions, Issue, linked contract/AC/STS/DoD, relevant predecessor issues/PRs, local Git status and actual board status.

## Before editing
1. Verify repository \`cottonlnwza/TTworkshop\`, correct Issue, author/reviewer, Period, staging branch, scope and explicit Issue-specific authorization. Unresolved approval/design decision => stop affected implementation.
2. Establish a Scope Lock: Issue, approved in/out scope, affected files, applicable FR/BR/NFR, AC/STS, dependencies, owner/reviewer, PR ownership and exact testing expectations.
3. Do not overwrite unrelated local changes, secrets or databases. Never run destructive tests on development DB. Use isolated explicit test DB configuration.

## Work on ONE PR
1. Use specification-first commits and TDD RED → GREEN where required; implement code, UI, DB migrations, security/role checks, negative/boundary/concurrency cases, integration tests and evidence appropriate to the Issue. Don't invent requirements.
2. Keep code, test IDs, required contract/DoD and current status docs together in **the same Issue's PR**. Classify historical vs current statements; never rewrite dated records or prematurely claim Formal APPROVE/Merge/Post-merge verification.
3. Capture tested commit SHA, complete commands, PASS/FAIL counts, test DB/version, browsers, limitations and meaningful screenshots/logs where required; distinguish Author-local, Reviewer rerun and hosted CI.
4. Complete the pre-merge matrix defined in \`ISSUE-PR-POLICY.md\`. Inspect \`README.md\`, \`docs/evidence\`, \`docs/contracts\`, \`docs/srs.md\`, traceability and DEC files **when relevant to the Issue**, and correct stale current statements.
5. Re-run targeted/regression checks after changes; ensure final reviewable PR HEAD matches evidence. \`git diff --check\` and build/tests must truly be executed (or recorded NOT RUN). Do not use mocked-only persistence as proof of PostgreSQL behavior.
6. After scoped authorization and verified PR-ready gates, commit/push feature branch and open/reuse **the one PR** against current \`sprint_N_staging\`, using a live link, exact HEAD, AC/STS matrix, test evidence, limits and teammate reviewer. Never self-approve/merge.

## Review and finish
- Read every old/new review, including outdated/resolved inline threads. For binding blockers, correct on the SAME PR, re-run checks, update matrix/evidence and request independent re-review. Do not generate duplicate Issue/PR.
- AFTER teammate approval and merge, independently verify actual staging merge SHA/tree, build/test/integration and persistence. Post actual results in original Issue, update backed checklist, board Status/Period and close only after required authorization and verification. Tracker completion is not a new PR.
- Report \`READY / BLOCKED / NOT VERIFIED\` with exact scope, SHA, evidence, blockers and board read-back; do not start another Issue implicitly.
