# Reviewer Mode — Strict Checklist on EVERY Review and Re-review

**Mandatory:** Read \`AGENTS.md\`, \`ISSUE-PR-POLICY.md\`, this file, relevant scoped contract, Issue/PR body, **all** reviews, comments, inline/outdated/resolved threads, changed commits and files, source decisions and live Kanban before each review. Report the policy commit SHA and exact reviewed PR HEAD. A prior approval or resolved thread does not prove that a changed HEAD still passes.

On **every** specification review, substantive code review, re-review, final pre-merge decision and merge-readiness check, visibly record all six axes below. For each: \`PASS / FAIL / NOT VERIFIED / N/A\` + exact link/SHA/file/line/test evidence. Focus deeper on changed areas during re-review, but always re-evaluate full checklist and regression implications.

| Axis | Required checks |
|---|---|
| **1. Identity, provenance, governance** | Correct repo, one Issue↔one PR, issue scope, author vs independent reviewer, branch/base, current HEAD, actual review history and unresolved threads, permission gates and Project Status/Period. |
| **2. Scope, requirements, traceability** | Every in-scope requirement FR/BR/NFR, applicable AC↔STS, exact contract/DoD, dependencies, acceptance decisions and excluded behaviors; neither silent omissions nor invented new scope. |
| **3. Implementation, security, correctness** | Actual changed code and integration, data persistence, migrations/constraints, race/atomicity, auth and ownership, private data, boundaries, negative cases, error and UI behavior, side effects and regressions where applicable. |
| **4. Build, tests, evidence** | Tested exact SHA and commands, scope-appropriate RED/GREEN, actual test counts and results, real PostgreSQL/integration and browser checks where required, concurrency/persistence checks, non-executed gaps, Author vs independent vs hosted CI provenance. |
| **5. Docs, decisions and current-status consistency** | In-scope README, contract, DoD, \`docs/evidence\`, SRS/traceability and DEC snapshots; truthful current status and tested HEAD; preserve historical logs; no premature global/instructor approval. Review Developer Completion Matrix. |
| **6. Closure, prior findings and single-PR finishability** | Every open blocking finding across review rounds mapped to binding requirement/proved defect, file/line, remediation and same-PR owner; no avoidable leftover scope to a new Issue; list only legitimate post-merge Author verification/tracker actions. |

### Strict but bounded decisions
- **FAIL or NOT VERIFIED in any applicable binding gate** => request changes or report BLOCKED, never falsely Formal APPROVE. A demonstrable correctness/security bug is blocking even if small.
- Every **blocking** finding must cite binding requirement/contract/AC/DoD/course rule or proven defect; do not expand requirements or invent blocker merely to be strict. Optional improvements are NON-BLOCKING.
- Require fixes to the **same unmerged PR**. Do not approve preventable stale current documents or incomplete in-scope test/evidence, and do not demand impossible future merge SHA before merging.
- Provide matrix \`Axis | Result | Evidence | Blocker / owner\` and final \`Issue/PR/HEAD | AC/STS/DoD coverage | Evidence limits | Verdict\`.
- Review submission (COMMENT/REQUEST_CHANGES/APPROVE), merge and tracker modifications require explicit separate user authorization; read-only audit does not authorize submission. Reviewer is not Author; never self-approve/self-merge.
- Once approved and merged by teammate, issue an **Author Post-merge Completion Verification** handoff with true PR/Issue, merge SHA and checks; don't close original Issue on behalf of Author without authorization, and don't propose a fresh Issue solely for administrative completion.
