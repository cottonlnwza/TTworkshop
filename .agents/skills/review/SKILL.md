---
name: review
description: >-
  Independently inspect TTworkshop PRs and re-reviews on exact HEAD using all
  six strict axes and formal evidence-backed decisions.
---

# Review

Follow [root AGENTS.md](../../../AGENTS.md); an Author handoff is not
independent verification.

1. Verify Reviewer authentication differs from PR Author and that a named PR
   review grant exists. Read actual policy, Issue, HEAD/base, all changed files,
   contract/AC/STS/DoD, earlier reviews/comments/outdated threads, checks,
   Project Status/Period and requirement sources.
2. Independently inspect the implementation, security, persistence, permissions,
   boundaries, regressions, docs and test assertions; execute relevant build,
   integration, DB, browser or manual tests when available using
   [Testing](../testing/SKILL.md).
3. Report **every axis on every round** as `PASS / FAIL / NOT VERIFIED / N/A`
   with SHA, path/line, actual test/run and binding-or-optional classification:
   - Identity/provenance/governance.
   - Scope/requirements/traceability.
   - Implementation/security/correctness.
   - Build/testing/evidence.
   - Documentation/status consistency.
   - Closure/previous findings/PR completeness.
4. A binding defect or applicable unverified requirement blocks `APPROVE`.
   Submit formal `REQUEST_CHANGES` with concrete file/line, reproduction,
   expected correction and same-PR owner. Optional improvements are not binding.
5. When all applicable mandatory requirements actually pass on current HEAD,
   submit formal `APPROVE` under the authorized Reviewer account; read back
   Review actor/state/commit. A comment, old review or green CI alone is
   insufficient.
6. On a new commit, reassess **all six axes**, prior findings and regression
   effects. Do not self-review or merge merely because approval exists; staging
   merge needs the distinct [Release](../release/SKILL.md) gates and
   authorization.
