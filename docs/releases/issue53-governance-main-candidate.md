# Governance main integration candidate — Issue #53

**Status:** Pre-merge only. This is not Formal Review,
main merge, deployment or course submission authorization.

## Purpose and provenance

Promote the reviewed Issue #51 governance architecture to `main`,
without changing application or existing production release controls.

- Original: [Issue #51][issue51] and [PR #52][pr52].
- Release owner: [Issue #53][issue53].
- Author: `thananun-7203` (ComTon).
- Independent Reviewer: `cottonlnwza`.
- Main parent: `13ee9a19350dd06e614d3dc196d880c5275b489b`.
- Reviewed staging parent: `d062e9f8235312a4208940b2aabf3c389a8f003c`.
- PR #52 reviewed HEAD: `92daad8b6622f90abbf1ea79a1a9da3110e20f3d`.
- Preparing policy: `sprint_1_staging@9c01bec446a2880c6f870304ea18931fa0253604`.

The [new root instructions](../../AGENTS.md) become the canonical
repository policy only after independent adoption into `main`.

## Conflict resolution

The merge from original `main` into staging history found exactly
two content conflicts. Resolution keeps the reviewed staging content:

1. `AGENTS.md`: retain reviewed blob
   `e8cdcd23d8a24345542ba234a72d81cf84202f26`.
2. `docs/archive/ai-governance/ISSUE-PR-POLICY.md`:
   retain reviewed archive blob
   `0866b63a0bfe69465f7fab34bb151308d9b0459a`.

The five legacy governance policies are archived, not active.
Previous `main` variants remain reachable through their original
Git parent. To inspect those records, use:

```shell
git show 13ee9a1:AGENTS.md
git show 13ee9a1:.github/ai/ISSUE-PR-POLICY.md
```

No past commit is rewritten or deleted.

## Preserve main-only release controls

The following files must remain identical to the original `main`:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-main.yml`
- `deploy/verify_serving_revision.py`
- `tests/test_release_provenance.py`
- `deploy/smoke_test.py`
- `README.md` and `docs/labs/lab-05/deployment.md`

Preserve other existing application and release evidence.
The production deploy workflow is manual `workflow_dispatch` only.
No GCP, IAM, database, secrets, traffic or release tag operations
are included in this Issue.

## Author-local verification (ComTon, Windows)

These commands were run on the prepared candidate worktree,
not on a deployed service:

- `npm ci --no-audit --no-fund`: PASS, locked install.
- `npm run build`: PASS, TypeScript and Vite.
- Python `test_cloud_smoke.py`: 7/7 PASS.
- Python `test_release_provenance.py`: 11/11 PASS.
- Vitest non-database suites: 64/64 PASS in 10 files.
- Markdown lint: 0 issues in 7 scoped files.
- Relative Markdown links: 133 valid, 0 broken.
- Four Skill YAML frontmatters: valid (PyYAML).
- `git diff --check`: PASS.
- Main-only CI, deploy, provenance and README paths:
  byte-identical to original `main` at the checked paths.

Environment: ComTon Windows; Node 26.13.0 and Python 3.12.10.
No safe local PostgreSQL/Chromium integration setup was available.
The full Vitest suite was **not rerun by the ComTon Author locally**.
This local limitation does not negate the separate hosted and independent
Reviewer verification below.

## Hosted and independent pre-merge evidence (2026-11-21)

- **GitHub Actions `build-test` SUCCESS** on the then-current exact PR
  HEAD `84bf98c49582adb387ab81818fda7f62ffa2e79a`:
  [run #44894571629](https://github.com/cottonlnwza/TTworkshop/actions/runs/44894571629).
  TypeScript/Vite build PASS; isolated PostgreSQL 15/Chromium Vitest
  **20/20 files, 134/134 tests PASS**; Python smoke **7/7 PASS** and
  release provenance **11/11 PASS**.
- Independent Reviewer `cottonlnwza` reported separate checks on that
  same reviewed HEAD: locked install, build, Python 7/7 + 11/11,
  isolated local PostgreSQL 15/Chrome Vitest **134/134**, YAML metadata,
  Markdown lint and links, and `git diff --check` PASS. These are
  **Reviewer-run**, not ComTon Author-local test results; see
  [Formal Review #6004763967](https://github.com/cottonlnwza/TTworkshop/pull/55#pullrequestreview-6004763967).
- This is **dated, exact-SHA evidence**. After this documentation-only
  correction creates a new PR HEAD, independently read back required
  `build-test` for that new commit from
  [PR #55 checks](https://github.com/cottonlnwza/TTworkshop/pull/55/checks).
  A successful run on the previous SHA must never be represented as a
  passing run on an untested newer SHA.

## Verification and remaining gates

- Compare resulting tree against `main` and verify merge ancestry.
- Check four Skill YAML frontmatters and all Markdown relative links.
- Run `git diff --check` and Markdown lint.
- Run locked NPM install, TypeScript/Vite build, Python smoke and
  release-provenance tests, plus locally runnable Vitest tests.
- Hosted `build-test` **passed** on the pre-correction exact HEAD
  `84bf98c49582adb387ab81818fda7f62ffa2e79a` (run #44894571629,
  134/134 Vitest, Python 7/7 + 11/11). Recheck [PR #55 checks](https://github.com/cottonlnwza/TTworkshop/pull/55/checks)
  for required CI on the **post-correction** HEAD before re-review.
- Independent `cottonlnwza` six-axis Formal Review on the prior HEAD
  requested this documentation correction; a new-HEAD six-axis
  **Formal Re-review remains pending**.
- Main merge needs a separate explicit authorization and rechecking
  actual main ruleset, fresh HEAD, CI, conversations and mergeability.
- The PR Author cannot approve or merge their own PR.
- Author post-merge checks, Project #4 `Period 2` read-back and
  authorized original-Issue closure remain pending.

## Completion matrix

| Item | Candidate state | Next gate |
| --- | --- | --- |
| Root AGENTS and four Skills | Integrated | Independent Review |
| Governance archives | Historical only | Link validation |
| Main deploy/CI controls | Preserved | Diff verification |
| Hosted full tests | **PASS on prior exact HEAD `84bf98c`** — [run #44894571629](https://github.com/cottonlnwza/TTworkshop/actions/runs/44894571629), 134/134 Vitest, Python 7/7 + 11/11 | Recheck required `build-test` on the new documentation-only HEAD; independent Re-review |
| Main merge | Not done | Separate authority |
| Issue #53 closure | Not done | Post-merge verification |

[issue51]: https://github.com/cottonlnwza/TTworkshop/issues/51
[issue53]: https://github.com/cottonlnwza/TTworkshop/issues/53
[pr52]: https://github.com/cottonlnwza/TTworkshop/pull/52
