# TTworkshop — AI operating instructions

**Repository:** `cottonlnwza/TTworkshop`. Once independently adopted, this is
the sole repository-wide AI policy. Focused procedures live under
`.agents/skills/`; archived files are historical, never operational
instructions.

**Precedence:** system/safety and official CPE334 course requirements > approved
SRS/SDS, feature contracts and decisions > these instructions > task Skills. An
unmerged proposed policy has no authority.

## Initialization — each new Issue or Review

1. Read the **live root `AGENTS.md` on GitHub** from the team's agreed policy
   ref and obtain the exact commit SHA. Until this revision is independently
   merged to `main`, the established common policy ref is `sprint_1_staging`
   unless explicitly changed; a `sprint_2_staging` merge alone does not silently
   change the shared reference. **After the revised policy is merged into
   `main`, use `main` as canonical.** Read the target branch's version
   separately for planned edits.
2. Load **only relevant Skills**. Inspect the live Issue/PR, branch/base/HEAD,
   existing Issues/PRs, contracts/AC/STS/DoD, dependencies, official rubric and
   GitHub Project #4 Status/Period. Before mutation report policy ref/SHA, files
   read, Issue/PR, Mode, and VERIFIED/BLOCKED. If required policy access fails,
   report `BLOCKED — PROJECT INSTRUCTIONS NOT VERIFIED` and do not mutate.
3. ComGu (Mac) acts only as `cottonlnwza`; ComTon (Windows) only as
   `thananun-7203`. Confirm the actual authenticated actor. Reviewer and Author
   must be different accounts. Never impersonate, share/switch accounts,
   self-review, self-approve or self-merge.
4. `docs/archive/ai-governance/` is audit history only. Superseded documents and
   discontinued automation proposals are **not active**, never mandatory and
   convey no authorization.

## Planning, consent and scope

**New assignments:** read supplied requirements, PDFs, diagrams, SRS/SDS,
accepted changes, earlier work and dependencies. Prepare the full proposed
backlog: bounded scope/exclusions, requirements, AC/STS/DoD, owner, independent
Reviewer, tests/evidence, Period and dependencies. **Ask for approval before
creating new Issues**. Create only approved Issues and immediately add each to
Project #4 as `Backlog` with the verified Period.

**Existing assigned Issue:** a clear Issue-scoped Author grant covers ordinary
analysis, branch, implementation, tests, documents, commit/push, one PR, Kanban
and same-PR Reviewer fixes without repeated confirmation. Record granted actions
and continue completion-first. Approval for a Reviewer, independent teammate
staging merge, post-merge closure, or unrelated high-risk action remains
actor/action-specific; several distinct grants may be approved once. Explicitly
assigning a named PR to an independent Reviewer authorizes formal review and
same-PR re-review, **not merge**. No new Issues, material out-of-scope changes,
or unauthorized accounts/actions without specific approval.

**One Issue ↔ one PR.** Search prior open/closed/merged PRs first. Use one
scoped branch from the current `sprint_N_staging`. Address every applicable
finding inside the **same unmerged PR**; do not abandon accepted scope, create a
duplicate PR or rewrite historical evidence. Do not overwrite unrelated
worktrees or commit secrets.

## Developer — completion first

1. Lock the Issue, acceptance criteria, dependencies, roles, existing design and
   exclusions. Specify feature design and testing before implementation where
   needed.
2. Implement complete in-scope behavior; use meaningful **TDD RED → GREEN** for
   rules, defects and changes where appropriate. Cover negative/boundary cases,
   real persistence, authorization, ownership and regression risks.
3. Execute the **full available automated suite** (unit, integration,
   regression, build and configured checks), plus applicable AI-accessible
   browser/manual, API and database verification. Use isolated test databases
   and synthetic credentials. Investigate failures, fix recoverable causes and
   retest; never disable mandatory tests or invent PASS.
4. Update affected current README, SRS/SDS, contracts, AC↔STS/DoD, test/evidence
   files and documentation; preserve dated history. Record tested commit SHA,
   commands, environment, passed/failed/skipped counts, manual steps, source and
   limits. Inspect complete diff and `git diff --check`.
5. Commit, push and open/update **one PR** into sprint staging with exact HEAD,
   completion matrix, test results and Reviewer handoff. Fix all binding
   Reviewer findings in that PR and request independent re-review on new HEAD.
   Never merge one's own PR.
6. After an authorized **independent** merge, verify actual staging merge
   SHA/tree, run applicable post-merge checks, update the **original Issue** and
   close only when applicable DoD and separate completion authority pass.

## Independent Reviewer — strict six axes on every review and re-review

Independently read the current PR/HEAD, Issue, full diff, contracts, earlier
reviews/threads, CI/test evidence, docs, Project and actor permissions. Evaluate
each axis `PASS / FAIL / NOT VERIFIED / N/A` with evidence:

1. Identity, provenance and governance.
2. Scope, requirements and traceability.
3. Implementation, security and correctness.
4. Build, testing and evidence.
5. Documentation and status consistency.
6. Closure, previous findings and single-PR completeness.

Independently execute relevant tests where possible. Submit formal
`REQUEST_CHANGES` for binding defects with concrete file/line, reproduction and
same-PR remedy. Submit formal `APPROVE` **only** when every applicable mandatory
gate passes on latest HEAD. Do not invent tests, treat optional suggestions as
blockers, rely on stale approval or confuse a PR comment with a formal review.

## Independent staging merge, release and course gates

Only a **different authenticated teammate** with explicit `MERGE_STAGING`
authorization may merge an approved PR to `sprint_N_staging` without another
prompt. Immediately before merging verify exact HEAD/base, independent Formal
APPROVE, no unresolved binding findings, passed required tests/AC/DoD, GitHub
checks, rules/protections, permissions and mergeability. Never bypass failed
mandatory CI or enforced protections.

If enforcement is absent, reproducible Author-executed manual evidence
independently checked by Reviewer is a fallback **only where course and project
requirements allow**; it is not a substitute for mandatory CI/quality gates.
`main` merge, release tags, deployment, billing/IAM, database/secret changes and
other high-risk operations require separately scoped authorization. Staging
merge does not establish release, deployment, course submission or grade.

## GitHub Project #4 Kanban — before every phase

Read the live Issue Project item, `Status` and `Period` before each phase.
Perform the real transition **before** the next phase, then read the same item
back. Preserve correct Period/manual changes; never fabricate missed history.

- Approved new Issue → `Backlog` immediately.
- Requirements/AC/STS scoped → `Specified` before implementation.
- Authorized implementation about to start → `Started`.
- Single review-ready PR + tests/evidence → `PR Review` before Reviewer handoff.
- Binding Formal `REQUEST_CHANGES` → `Fixing` before same-PR corrections;
  corrected/retested HEAD → `PR Review` before re-review.
- Independently merged + Author post-merge verification and DoD satisfied →
  `Done`, then original Issue closure under valid authority.

If Project mutation/read-back fails, investigate and report
`KANBAN NOT VERIFIED / BLOCKED`; continue unrelated permitted steps, never claim
a failed transition succeeded.

## Troubleshooting and handoff

On failures: investigate → correct safe recoverable causes → retry
tests/operations → continue permitted unrelated work. If unresolved, report
**Problem / Cause / Attempts / Recovery steps / Responsible owner** and the
blocked gate. Do not open unauthorized Issues or bypass mandatory checks to
force completion.

For independent Review provide repository/policy SHA, Issue/PR links, exact
HEAD/base, changed files, AC/STS/DoD, commands and actual results, limitations,
prior binding findings, six-axis expectation, next actor and authorization
gates. Drafting a handoff is not delivering it or completing formal review.

## Task Skills — only load what is relevant

- [Development](.agents/skills/development/SKILL.md)
- [Review](.agents/skills/review/SKILL.md)
- [Testing](.agents/skills/testing/SKILL.md)
- [Release](.agents/skills/release/SKILL.md)

All four paths are repository-readable by ComGu and ComTon. Actual automatic
discovery is client-dependent and must be verified, not assumed; if a Skill is
unavailable, follow this root `AGENTS.md` and report the limitation.
