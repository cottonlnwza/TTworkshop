# TTworkshop — Shared AI Working Instructions

**Applies to:** `cottonlnwza/TTworkshop` (Developer, Reviewer, Release Auditor, documentation tasks).
**Policy revision:** 1.2.0. **Activation rule:** the revision actually merged into the agreed common policy ref (`sprint_1_staging`) is ACTIVE; a changed revision on an unmerged branch/PR is PROPOSED until independent peer review and merge. Historical v1.1.0 was activated via merged governance PR #18; this v1.2.0 revision requires its own reviewed governance PR.
**Priority:** System/platform and official course requirements > approved SRS/SDS and scoped decisions > these project working rules > individual AI suggestions. Do not claim global SRS/SDS or instructor approval without evidence.

## Standing team objective — maximize verified CPE334 rubric coverage

**Requester's exact working preference (Thai, 2026-11-12; applies to both teammates and AI assistants):**

> ฉันต้องการทำโปรเจกต์ CPE334 ให้ได้คะแนนสูงที่สุดตามเกณฑ์ของรายวิชา โดยให้ความสำคัญกับความถูกต้องของโปรแกรม ผลการทดสอบ หลักฐานการทำงาน กระบวนการพัฒนา และการส่งงานครบตามกำหนด
>
> ให้ดำเนินงาน **Issue #6 ให้เสร็จสมบูรณ์ตาม Completion-first** พร้อมตรวจหาจุดที่สามารถปรับปรุงเพื่อรักษาหรือเพิ่มคะแนนตาม Rubric จริง
>
> ทำงานอย่างต่อเนื่องจนจบขอบเขตที่ได้รับอนุญาต โดยไม่ต้องถามยืนยันทุกขั้นตอน เมื่อดำเนินการเสร็จแล้วจึงรายงานผลรวมในครั้งเดียว
>
> **ห้ามอ้างว่าได้คะแนนเพิ่มแน่นอน** ให้แยกข้อกำหนดที่มีคะแนนจริงออกจากข้อเสนอแนะด้านคุณภาพ และใช้หลักฐานจากเอกสารรายวิชาเป็นหลัก

**Operational interpretation — binding working preference, not a new course requirement:**

1. **Either teammate, every session, every mode — mandatory fresh read.** For *every* request concerning `cottonlnwza/TTworkshop` or its CPE334 deliverables, whether sent by `cottonlnwza` or `thananun-7203`, the responding AI must retrieve the **current root `AGENTS.md` from the real GitHub repository** on the agreed policy ref, then read all applicable linked policies and capture the exact policy SHA **before any substantive task**. This includes quick status questions, new chats, resumed work, Developer, Reviewer, re-review, Issue verification, post-merge completion and Release Audit. Do not infer an exemption from the requester's identity, a cached chat summary, a previous run, local files, or a claim that the file was already read. If a live read fails, say `BLOCKED — PROJECT INSTRUCTIONS NOT VERIFIED` and do not mutate or claim formal approval. The rule instructs compliant AI tooling; `AGENTS.md` alone does **not** technically guarantee that every external client loads it.
2. **Real rubric evidence, not invented scores.** For material feature, test, review, release, deliverable and assignment-planning work, identify relevant authoritative course PDF/rubric version, page, stated point weight, deadline and proof required; compare to current repo and submission evidence. Explicitly classify `RUBRIC REQUIREMENT / POINTS VERIFIED`, `POTENTIAL SCORE RISK`, `OPTIONAL QUALITY IMPROVEMENT`, `NOT VERIFIED`, and `OUT OF SCOPE`. Prioritize correctness, automated/manual tests, traceable evidence, engineering process, reproducibility and on-time submission. Do not promise higher grades, invent points/deadlines, assume a GitHub merge equals course submission, or turn suggestions into mandatory requirements without source authority. Report actionable high-value gaps with exact sources and evidence.
3. **Completion-first; finish authorized scope with minimal interruptions.** Within a *clearly authorized, bounded* Issue/task, carry all safe dependent steps through completion without repeatedly asking the same question; prefer one consolidated final report with evidence, actual actions, results and remaining gates. Mandatory initialization/preflight reporting still applies. If multiple distinct actions need approvals, invite **one explicit, itemized batch authorization** where the policy permits, while preserving the separate meaning of each authorization. Never infer permission for new Issues/source edits, formal review submission, teammate merge, release/deploy or Issue/Project closure from a general goal or earlier unrelated approval. Stop only blocked portions; continue safe authorized work.
4. **Current Issue #6 priority is not a new execution Issue.** Complete post-merge verification, tested exact staging merge SHA, original-Issue evidence, Acceptance Criteria/DoD and separately authorized Project/Issue closure for [Issue #6](https://github.com/cottonlnwza/TTworkshop/issues/6) according to existing policy. When #6 is verified and closed, treat that milestone as historical; do not keep reopening/reimplementing it, rewrite merged PR #20 or invent a second work PR for #6. Broader score-improvement work needs separate approved scope, and new governance policy work uses its own governance Issue/PR.

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
