# Developer Mode — Specification-first, evidence-first, completion-first

Read `AGENTS.md` and `.github/ai/ISSUE-PR-POLICY.md` first, from the team's common policy ref; report SHA. Then read official requirements, approved working SRS/SDS/decisions, Issue, linked contract/AC/STS/DoD, relevant predecessor issues/PRs, local Git status and actual board status.

## Before editing
1. Verify repository `cottonlnwza/TTworkshop`, correct Issue, author/reviewer, Period, staging branch, scope and explicit Issue-specific authorization. Unresolved approval/design decision => stop affected implementation.
2. Establish a Scope Lock: Issue, approved in/out scope, affected files, applicable FR/BR/NFR, AC/STS, dependencies, owner/reviewer, PR ownership and exact testing expectations.
3. Do not overwrite unrelated local changes, secrets or databases. Never run destructive tests on development DB. Use isolated explicit test DB configuration.

## Intake of newly assigned PDFs and conversion to bounded work

When the user provides a PDF assignment, an updated course rubric or a new brief, first apply `AGENTS.md` **PDF assignment intake and authorization**. Do **not** interpret the upload as approval to open an Issue, edit code or push changes.

1. **Read and attribute:** verify file accessibility and page count; extract the exact relevant instructions, tables and diagrams with document filename/version and PDF page references. Classify each as instructor-mandated, team-approved, user-directed, optional proposal or unclear. Never invent missing deadlines, features, FR/BR/NFR IDs, tests or approvals.
2. **Determine impact:** compare extracted items with current SRS/SDS, decisions, feature contracts/AC/STS, live source, Issues, PRs (including completed work), Project #4 and the agreed staging branch. State what is done, missing, contradictory, out of scope or unverified; preserve prior issue/PR history.
3. **Provide an intake matrix before work:** `Source PDF/page | Exact requirement/deliverable | Authority and version | Existing evidence/gap | Proposed bounded Issue | In/out scope | AC/STS and verification | Dependency/Period/deadline | Approval status`. Distinguish PDF facts from interpretation, and explicitly state any unstated information as `not specified`.
4. **Propose executable scope:** show a complete candidate Period backlog when required, find and reuse existing unfinished Issue ownership, and for each genuine new Issue specify goal, source pages, acceptance criteria, deliverables, files likely to change, dependencies, risks, tests, Owner and independent Reviewer. Avoid speculative tickets, duplicate PRs, unapproved scope enlargement or premature global/instructor-approval claims.
5. **Respect two distinct gates:** ask for explicit approval of the **named backlog** before creating all Period Issues, and separate authorization to execute **each individual Issue** before implementation/branch/commit/push/PR work. A PDF upload or approval to analyze it is neither gate. Review submission, merge, deployment and tracker closure retain their own separate approvals.
6. **Handle changes safely:** if a PDF is amended mid-Issue, display the old/new requirement and page references, classify the change as within approved scope or material scope expansion, and seek fresh authorization when needed. Apply in-scope changes on the **same unmerged PR**; a genuinely independent post-merge repository edit needs separate authorized Issue/PR ownership. Do not rewrite historical acceptance/evidence.
7. **Proceed only when approved:** route the authorized Issue into the existing specification-first, TDD/evidence, independent six-axis review, staging merge and Author post-merge completion process. If a source is unreadable or conflicting, report the exact `BLOCKED`/`NOT VERIFIED` portion; do not fabricate conclusions or mutate blocked work.

## Work on ONE PR
1. Use specification-first commits and TDD RED → GREEN where required; implement code, UI, DB migrations, security/role checks, negative/boundary/concurrency cases, integration tests and evidence appropriate to the Issue. Don't invent requirements.
2. Keep code, test IDs, required contract/DoD and current status docs together in **the same Issue's PR**. Classify historical vs current statements; never rewrite dated records or prematurely claim Formal APPROVE/Merge/Post-merge verification.
3. Capture tested commit SHA, complete commands, PASS/FAIL counts, test DB/version, browsers, limitations and meaningful screenshots/logs where required; distinguish Author-local, Reviewer rerun and hosted CI.
4. Complete the pre-merge matrix defined in `ISSUE-PR-POLICY.md`. Inspect `README.md`, `docs/evidence`, `docs/contracts`, `docs/srs.md`, traceability and DEC files **when relevant to the Issue**, and correct stale current statements.
5. Re-run targeted/regression checks after changes; ensure final reviewable PR HEAD matches evidence. `git diff --check` and build/tests must truly be executed (or recorded NOT RUN). Do not use mocked-only persistence as proof of PostgreSQL behavior.
6. After scoped authorization and verified PR-ready gates, commit/push feature branch and open/reuse **the one PR** against current `sprint_N_staging`, using a live link, exact HEAD, AC/STS matrix, test evidence, limits and teammate reviewer. Never self-approve/merge.

## Reviewer communication and next-action handoff

Whenever this mode needs a teammate Reviewer (including pre-implementation specification approval, change requests, re-review or final implementation review), **automatically author a complete ready-to-send Reviewer prompt** and give it to the requester. Post its substantive text to the *same* authorized PR/Issue thread for the Reviewer when permitted, otherwise label it `REVIEWER MESSAGE NOT SENT` and provide the intended URL/draft. Include exact policy ref/SHA and read files, Issue/PR, exact HEAD, scope and AC/STS/DoD, evidence and test provenance, prior findings, six-axis review request, desired response/action, authorization boundaries, and **next action/owner/gate**. After any received review, tell requester and Reviewer the actionable next step without reasking settled questions. Do not self-approve, self-merge or presume an automatic authorization to post.

## Review and finish
- Read every old/new review, including outdated/resolved inline threads. For binding blockers, correct on the SAME PR, re-run checks, update matrix/evidence and request independent re-review. Do not generate duplicate Issue/PR.
- AFTER teammate approval and merge, independently verify actual staging merge SHA/tree, build/test/integration and persistence. Post actual results in original Issue, update backed checklist, board Status/Period and close only after required authorization and verification. Tracker completion is not a new PR.
- Report `READY / BLOCKED / NOT VERIFIED` with exact scope, SHA, evidence, blockers and board read-back; do not start another Issue implicitly.
