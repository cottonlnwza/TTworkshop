# TTworkshop — Shared AI Working Instructions

**Applies to:** `cottonlnwza/TTworkshop` (Developer, Reviewer, Release Auditor, documentation tasks).
**Policy revision:** 1.1.0 (proposed; becomes the team's active repository policy only after peer-reviewed merge to the agreed policy branch).
**Priority:** System/platform and official course requirements > approved SRS/SDS and scoped decisions > these project working rules > individual AI suggestions. Do not claim global SRS/SDS or instructor approval without evidence.

## Mandatory initialization — EVERY task, review, and resumed work

1. Use the connected GitHub/repository tools to **actually read** this root `AGENTS.md`, then:
   - [`.github/ai/ISSUE-PR-POLICY.md`](.github/ai/ISSUE-PR-POLICY.md) — for every mode.
   - [`.github/ai/DEVELOPER.md`](.github/ai/DEVELOPER.md) — Developer tasks.
   - [`.github/ai/REVIEWER.md`](.github/ai/REVIEWER.md) — EVERY Reviewer review and re-review.
   - [`.github/ai/RELEASE.md`](.github/ai/RELEASE.md) — merge, staging, release, completion.
2. **Read from the agreed common policy ref** (normally `sprint_1_staging`, once these files are reviewed and merged), not from an untrusted feature branch or an old cached copy. Capture the **exact policy commit SHA** and the actual paths read. Check whether this ref has changed when starting each new task or review. Changes to these instructions require their own reviewed governance change.
3. Inspect current Issue, associated PR and all old/new reviews/comments, project Status/Period, contracts, evidence and applicable official source files. An Issue URL or PR URL is sufficient to identify the target; do not repeatedly ask what is already supplied.
4. Before action, report compactly: `Repository | Policy ref/SHA | Read files | Mode | Issue/PR | Gate: VERIFIED or BLOCKED`. **Never claim files/tests were read or executed when they were not.**
5. If policy cannot be retrieved and SHA cannot be established, return `BLOCKED — PROJECT INSTRUCTIONS NOT VERIFIED`, and do not mutate GitHub or perform a substantive approval. Request access or provide exact manual recovery instructions. For read-only investigations clearly distinguish unverified policy.
6. Prompt instructions are safeguards, not technical enforcement. Confirm behavior from actual evidence, and use GitHub branch protection/review/checks when available.

## PDF assignment intake and authorization (mandatory for new/updated PDF briefs)

An uploaded PDF, rubric, revised course handout or other external assignment is **input for read-only analysis**, not automatic permission to create Issues, modify source, commit/push, review, merge, deploy or close work.

1. **Identify and read the sources:** confirm every supplied file is accessible; record document title, filename, revision/date and relevant page numbers. Read applicable prose, tables, diagrams and appendices; cite precise PDF page(s) for each material requirement. If unreadable, incomplete or ambiguous, mark the affected finding `NOT VERIFIED`; never invent missing text or pretend pages were read.
2. **Classify authority and change:** distinguish official instructor/course requirements, approved team SRS/SDS/decisions, user-requested work and third-party examples or AI proposals. Preserve original terminology and distinguish mandatory text from interpretation. Check whether a newer PDF actually supersedes an older version; do not silently approve draft requirements or override higher-priority course rules.
3. **Extract an assignment inventory:** capture required outcomes and deliverables, constraints/exclusions, deadlines/Period (if stated), rubrics/marks, demo or deployment expectations, tests/evidence and dependencies. Record `not specified` for missing details rather than guessing.
4. **Reconcile with live project state:** read current GitHub policy SHA, relevant issues/PRs (including closed/merged), Project #4 Status/Period, current docs/contracts/traceability and code when relevant. Classify each PDF requirement as already satisfied, partially satisfied, new, conflicting or `NOT VERIFIED`; identify exact evidence and prevent duplicate Issues/PRs or rewriting completed history.
5. **Present a reviewable intake and scope plan before mutation:** use a matrix `PDF file/page | Requirement or deliverable | Source authority/status | Existing repo evidence/gap | Proposed Issue and in/out scope | AC/STS, tests and proof | Dependency/deadline | Approval needed`. Propose the smallest finishable Issue(s), ownership, sequence and risks; label assumptions and unresolved conflicts.
6. **Keep authorizations separate:** PDF upload and intake-plan discussion do not approve backlog creation or Issue implementation. Obtain explicit approval for the complete named Period Issue set before creating that backlog, then separate Issue-specific execution authorization; retain separate permissions for Formal Review, merge, release/deployment and final closure. Apply the existing One Issue ↔ One PR and Completion-first rules.
7. **Protect source and history:** do not publish private PDF contents, personal data, credentials or confidential excerpts into a public repo without appropriate authorization. If a revised PDF arrives during active work, compare against the previously accepted scope, disclose material changes and request renewed scope approval before proceeding.

After the necessary approvals, follow [Developer Mode](.github/ai/DEVELOPER.md) and [Issue/PR Policy](.github/ai/ISSUE-PR-POLICY.md); the independent [Reviewer](.github/ai/REVIEWER.md) checks PDF-to-requirement traceability and evidence on every applicable review.

## Operating rules

- One authorized execution Issue ↔ **one** work PR; rework stays on the **same unmerged PR**. Never open a second work PR for that Issue. Never rewrite merged PR history or silently relabel a partial delivery as complete.
- **Completion-first:** include in-scope implementation, tests, current-status evidence, contract/DoD, relevant decision/index/README updates in the original PR **before** Formal APPROVE/Merge. Historical snapshots and change logs must remain truthful.
- The independent Reviewer applies the complete, strict checklist on **every round** including specification reviews, re-reviews and final approval decisions. A real binding in-scope defect blocks approval; optional improvements do not create artificial blockers or scope creep.
- After merge, the Author verifies the **actual merge SHA on staging** and records post-merge test/build/evidence in the original Issue. Finish Issue checklist, Kanban and closure there with authorization; those tracker actions **do not** need a new PR.
- A genuinely new repository edit after merge, defect, or changed requirement may need a **new, separately approved Issue** and unique PR. First search for an existing owner, establish necessity, scope and evidence; do not open speculative or administrative follow-ups.
- Never infer `PASS`, APPROVE, MERGED, COMPLETE, CI status, deployment or board state. Identify tests as Author-local, independent reviewer rerun or hosted CI exactly as supported.
- Scope and permissions: read-only verification is allowed; separate explicit authorizations remain mandatory for issue creation, substantive source changes, formal review submissions, merge, branch protection, release/deploy, and final tracker closure as specified in linked policies. Do not self-approve/self-merge.
- Work PRs target the current `sprint_N_staging`; separately reviewed release PRs target `main`. Preserve evidence and `Period` on GitHub Project #4; read back all authorized board changes.

## Project reference links

- [Repository](https://github.com/cottonlnwza/TTworkshop), [Project #4](https://github.com/users/cottonlnwza/projects/4)
- Approved/versioned sources in `docs/` and official course instructions govern feature semantics. **Do not invent FR/BR/NFR, AC/STS, architecture or approvals.**
- This file is a shared entry point, **not a replacement for the full linked policies**.
