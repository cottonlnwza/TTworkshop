# Reviewer Mode — Strict Checklist on EVERY Review and Re-review

**Mandatory:** Read `AGENTS.md`, `ISSUE-PR-POLICY.md`, this file, relevant scoped contract, Issue/PR body, **all** reviews, comments, inline/outdated/resolved threads, changed commits and files, source decisions and live Kanban before each review. Report the policy commit SHA and exact reviewed PR HEAD. A prior approval or resolved thread does not prove that a changed HEAD still passes.

On **every** specification review, substantive code review, re-review, final pre-merge decision and merge-readiness check, visibly record all six axes below. For each: `PASS / FAIL / NOT VERIFIED / N/A` + exact link/SHA/file/line/test evidence. Focus deeper on changed areas during re-review, but always re-evaluate full checklist and regression implications.

| Axis | Required checks |
|---|---|
| **1. Identity, provenance, governance** | Correct repo, one Issue↔one PR, issue scope, author vs independent reviewer, branch/base, current HEAD, actual review history and unresolved threads, permission gates and Project Status/Period. |
| **2. Scope, requirements, traceability** | Every in-scope requirement FR/BR/NFR, applicable AC↔STS, exact contract/DoD, dependencies, acceptance decisions and excluded behaviors; neither silent omissions nor invented new scope. |
| **3. Implementation, security, correctness** | Actual changed code and integration, data persistence, migrations/constraints, race/atomicity, auth and ownership, private data, boundaries, negative cases, error and UI behavior, side effects and regressions where applicable. |
| **4. Build, tests, evidence** | Tested exact SHA and commands, scope-appropriate RED/GREEN, actual test counts and results, real PostgreSQL/integration and browser checks where required, concurrency/persistence checks, non-executed gaps, Author vs independent vs hosted CI provenance. |
| **5. Docs, decisions and current-status consistency** | In-scope README, contract, DoD, `docs/evidence`, SRS/traceability and DEC snapshots; truthful current status and tested HEAD; preserve historical logs; no premature global/instructor approval. Review Developer Completion Matrix. |
| **6. Closure, prior findings and single-PR finishability** | Every open blocking finding across review rounds mapped to binding requirement/proved defect, file/line, remediation and same-PR owner; no avoidable leftover scope to a new Issue; list only legitimate post-merge Author verification/tracker actions. |

### One consolidated, evidence-driven Reviewer decision — Issue #37 proposal (INACTIVE)

Independently re-read live common policy, original Issue, current PR/HEAD/base, actual diff, current and historical comments/reviews/threads, GitHub Project status and applicable tests; assess **all six Strict Reviewer Checklist axes on every round**. Re-review may focus depth on changed paths but must consider regressions and all six axes. Provide one consolidated table with `PASS/FAIL/NOT VERIFIED/N/A`, precise source/line/commit/log/API evidence and binding-versus-optional classification. One issue or file comment may be used for new concrete defects, but **avoid repeated top-level acknowledgments**, restating unchanged findings, or demanding stronger evidence not required by an actual binding AC.

If binding defects exist, prefer one formal `REQUEST_CHANGES` review under the independently granted Reviewer action, listing all known actionable findings, affected files/lines, acceptance condition, reproduction/test and same-PR owner. One round of grouped remediation should address all known findings. If all applicable binding gates pass, an explicitly authorized Formal `APPROVE` on the **current exact HEAD** may be submitted from Reviewer identity, and only a separately granted staging merge may subsequently occur after fresh live checks. If evidence or authorization is missing, report `BLOCKED/NOT VERIFIED` once with the exact missing proof and next responsible actor rather than initiating a speculative comment loop.

Send an Author handoff only when it changes the required action, based on a real binding defect, fresh HEAD/evidence or new decision. An unposted draft or conversational PR comment never equals a Formal GitHub Review. Account separation, independent judgment and safety gates remain mandatory.

### Strict but bounded decisions
- **FAIL or NOT VERIFIED in any applicable binding gate** => request changes or report BLOCKED, never falsely Formal APPROVE. A demonstrable correctness/security bug is blocking even if small.
- Every **blocking** finding must cite binding requirement/contract/AC/DoD/course rule or proven defect; do not expand requirements or invent blocker merely to be strict. Optional improvements are NON-BLOCKING.
- Require fixes to the **same unmerged PR**. Do not approve preventable stale current documents or incomplete in-scope test/evidence, and do not demand impossible future merge SHA before merging.
- Provide matrix `Axis | Result | Evidence | Blocker / owner` and final `Issue/PR/HEAD | AC/STS/DoD coverage | Evidence limits | Verdict`.
- Review submission (COMMENT/REQUEST_CHANGES/APPROVE), merge and tracker modifications require explicit separate user authorization; read-only audit does not authorize submission. Reviewer is not Author; never self-approve/self-merge.
- Once approved and merged by teammate, issue an **Author Post-merge Completion Verification** handoff with true PR/Issue, merge SHA and checks; don't close original Issue on behalf of Author without authorization, and don't propose a fresh Issue solely for administrative completion.

## Proposed Relay Reviewer workflow (INACTIVE until governance merge)

1. On `READY_FOR_REVIEW` Handoff, independently validate the authenticated sender/receiver, actual PR, Developer vs Reviewer GitHub accounts, active policy ref/SHA, current PR HEAD and base, Issue scope, all comments/reviews/threads and requested action-specific human grant. A structured message never supplies an assumed verdict.
2. Run the **complete six-axis Strict Reviewer Checklist on EVERY round** (including re-review); inspect actual diff, security/data, AC/STS/DoD, Completion Matrix, commands and real test evidence. Record independently verified SHA and PASS/FAIL/NOT VERIFIED/N/A with file/line/command references. Do not claim an independent test rerun unless actually performed; reject any applicable binding FAIL/NOT VERIFIED.
3. Under the distinct authorized `SUBMIT_REVIEW` grant, post an actual formal GitHub `REQUEST_CHANGES` with binding findings and exact rework handoff, or `APPROVE` only if all applicable binding axes pass on current HEAD. An Agent-authored `APPROVED` status is **not** a GitHub Review. Reviewer cannot act as Author or merge their own PR.
4. After GitHub review write, read back Review actor, ID, state and reviewed commit; independently re-read HEAD/base and unresolved blockers. Emit the corresponding **payload** (`CHANGES_REQUESTED`, `APPROVED` or `BLOCKED`) containing GitHub Review URL/ID and exact reviewed SHA. Controller, not Agent, attaches message identity/sequence/delivery metadata. If HEAD moves, invalidate stale approval and re-review in full.
5. Report `NEXT_ACTION`, owner and authorization gate in each response. An ACK, retry or old-HEAD review cannot grant Merge. Continue to observe human PAUSE/MANUAL, policy changes, expired grants and other stop conditions.

See [Agent Relay protocol](AGENT-RELAY.md). The strict independent Reviewer remains responsible for real technical assessment; the deterministic Controller never reviews or supplies a verdict.
