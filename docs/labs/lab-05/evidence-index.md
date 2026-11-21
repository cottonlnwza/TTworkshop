# Lab 5 — current evidence and submission readiness (2026-11-21)

**This is a source-controlled index, not an LEB2 submission or a success certificate.**
Original source and release Issues [#32](https://github.com/cottonlnwza/TTworkshop/issues/32)
and [#33](https://github.com/cottonlnwza/TTworkshop/issues/33) remain open
until *all* applicable acceptance criteria pass. This index is maintained by
[follow-up Issue #57](https://github.com/cottonlnwza/TTworkshop/issues/57)
because their respective one work PR and one release PR have already merged.
The applicable official sources are `01_SE_Lab_5_updated.pdf` §§4, 8, 9, 11–12
and `group_work_specs_v1.pdf` §§5, 8–11.

## Answer Part 0 — team, release and evidence navigation

| Field | Verified value or gap |
| --- | --- |
| Product | TTworkshop, CPE334 Theme 3 event registration |
| Repository | [cottonlnwza/TTworkshop](https://github.com/cottonlnwza/TTworkshop) (public) |
| Team members, IDs, section and group filename | **NOT VERIFIED in this repository evidence; obtain from the student team, never invent** |
| Latest reviewed source | `main@e53be24a944ec0da10fcf2738a7d4b0c727c7f88`, independently merged [PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56) |
| Latest exact-main build | [GitHub CI #44904836406](https://github.com/cottonlnwza/TTworkshop/actions/runs/44904836406), PASS; 134/134 PostgreSQL/Chromium Vitest, Python 36/36 and build |
| Public live service | [https://ttworkshop-xue6vtucgq-as.a.run.app](https://ttworkshop-xue6vtucgq-as.a.run.app); `GET /` 200, `GET /health` 200, anonymous `GET /api/v1/auth/me` 401 |
| Running production revision | `ttworkshop-c05d1121072250` (Ready, 100% traffic); digest `sha256:ca8acac3445516a787efd782340b580b6a99440bab267e95824951bd6422f13c` |
| Deployment provenance | **Manual operator deployment** of an older immutable image; **NOT** a deployment from `main@e53be24` through `deploy-main.yml` |
| Independent participation | [Staging source PR #42](https://github.com/cottonlnwza/TTworkshop/pull/42), [release PR #43](https://github.com/cottonlnwza/TTworkshop/pull/43), [hardening PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56). Consult live PR authors, reviewers and merges for names/dates rather than infer equal contribution |
| Actual submission | **NO LEB2 receipt verified**; the official Lab 5 deadline was 2026-11-15 23:59 Thailand |

## Answer Part 1 — CI and Quality Gate (30 points)

| Check | State | Reproducible evidence / qualification |
| --- | --- | --- |
| C-01 / R-05 PR build and tests | **PASS** | [CI workflow](../../../.github/workflows/ci.yml), [main CI #44904836406](https://github.com/cottonlnwza/TTworkshop/actions/runs/44904836406), full PostgreSQL/Chromium suite and build |
| C-02 / R-06 failed check blocks merge | **PASS (historic test)** | Deliberately failed unmerged [PR #44](https://github.com/cottonlnwza/TTworkshop/pull/44), [run #44045343530](https://github.com/cottonlnwza/TTworkshop/actions/runs/44045343530) FAILURE, archived GitHub mergeStateStatus BLOCKED at the time; PR was closed, **not merged** |
| R-09 independently reviewed Git release | **PASS (source gate)** | [PR #43](https://github.com/cottonlnwza/TTworkshop/pull/43) independent `thananun-7203` APPROVE and merge `d9e9f99637c0511bc93b561f51fb34d2b913d71b`; [PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56) independent approval and merge `e53be24...` |

Green CI and merged PRs prove a code/review gate, **not** an actual
GitHub-Actions-to-production release.

## Answer Part 2 — Docker and reproducible configuration (20 points)

| Check | State | Reproducible evidence / qualification |
| --- | --- | --- |
| C-03 / R-01 fresh container build | **PASS (recorded Author-local)** | [Issue #31](https://github.com/cottonlnwza/TTworkshop/issues/31), reviewed [PR #39](https://github.com/cottonlnwza/TTworkshop/pull/39), [Docker execution log](../../evidence/l5-02-docker.md): clean clone, `docker compose build --no-cache`, healthy UI/API/PostgreSQL, browser/API smoke |
| R-02 configuration/secrets | **PASS for source templates; production Secret value not inspected** | [`.env.example`](../../../.env.example), [`.env.docker.example`](../../../.env.docker.example), [Dockerfile](../../../Dockerfile), [Compose](../../../compose.yaml) and [deployment runbook](deployment.md); use placeholder/synthetic local values only |
| Local restart persistence | **PASS (recorded Author-local)** | [Docker evidence](../../evidence/l5-02-docker.md); separate from live C-05 below |

## Answer Part 3 — GCP Deployment and Persistence (35 points)

| Check | State | Reproducible evidence / qualification |
| --- | --- | --- |
| C-04 / R-03 UI → API → Cloud SQL | **PASS** | [Public HTTPS](https://ttworkshop-xue6vtucgq-as.a.run.app), [original UI scenario evidence](https://github.com/cottonlnwza/TTworkshop/issues/32#issuecomment-7051925568), [Author independent read-back](https://github.com/cottonlnwza/TTworkshop/issues/32#issuecomment-7063068886); Organizer publish, Participant registration, second Participant full-capacity rejection |
| C-05 / R-04 survives new-container start **and** redeploy | **PASS** | [Issue #32 verification](https://github.com/cottonlnwza/TTworkshop/issues/32#issuecomment-7063068886): exactly matching workshop ID 2, registration ID 1, status and timestamp across three authenticated snapshots; four source snapshot hashes matched PDF hashes; Cloud Run revision `ttworkshop-00005-mif` → `ttworkshop-c05r1121072102` → `ttworkshop-c05d1121072250`, independently read Ready and digest |
| Live runtime security/backup | **PARTIAL** | Earlier restricted runtime PostgreSQL role/DDL and four migrations verified read-only; Cloud SQL automated backups enabled, seven retained; PITR and restore exercise **NOT VERIFIED**. No real production credential values in this index |
| GCP cost control | **PARTIAL** | Billing enabled; THB 8,000 project budget is **alerts-only**, not a hard cap; owner must verify current Free Trial credit and intended paid usage |

The real C-05 evidence belongs to the **manually deployed older image**,
not a new deployment from the currently reviewed main workflow. Do not present
the unchanged digest as proof that a new code revision was deployed.

## Answer Part 4 — Repeatable release pipeline (15 points)

| Check | State | Reproducible evidence / qualification |
| --- | --- | --- |
| R-07/R-08 source release path | **PARTIAL** | Independently reviewed [PR #43](https://github.com/cottonlnwza/TTworkshop/pull/43), [PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56); [`deploy-main.yml`](../../../.github/workflows/deploy-main.yml) manual, exact-reviewed-SHA, dedicated builder, immutable digest, zero-traffic Ready candidate, traffic verification and read-only smoke |
| C-06 actual repeatable production deployment | **BLOCKED / NOT VERIFIED** | `gh run list --workflow deploy-main.yml` returned **no runs** at 2026-11-21 audit. WIF provider and deployer exist; `GCP_WIF_PROVIDER` and `GCP_DEPLOYER_SA` Secret **names** exist in the GitHub **`production` environment**, not repository-level Secrets. Values and successful end-to-end workflow authentication are unverified. Existing live release was **operator manual** |
| Gate before future dispatch | **REQUIRES HUMAN + INDEPENDENT REVIEWER** | Official Lab 5 §9: operator inspects exact GCP/DB operations, budget, backups, migration Job and traffic; `operator_approved_migration_and_traffic=true` only after genuine review; GitHub `production` independently approved by `thananun-7203` (self-review/admin bypass disabled). Do **not** dispatch a known-unsafe or unauthorised run |
| Rollback/repeat C-06 | **NOT VERIFIED** | [Release hardening notes](../../releases/lab5-issue54-c06-builder-candidate.md) describe source controls; no demonstrated Actions release, operator rollback or repeated workflow run |
| Submission and handoff | **NOT VERIFIED** | A self-contained Part 0–4 PDF with team metadata, URL-visible screenshots, actual logs and a real LEB2 receipt still needs operator/course submission. No grade claim |

## Remaining work and responsibility

1. **Owner/student operator:** Independently verify GCP credit/spending risk and
   Cloud SQL backup/recovery assumptions; review exact existing
   [main-only release workflow](../../../.github/workflows/deploy-main.yml)
   commands (including migration Job, IAM and 100% traffic promotion) as the
   Lab 5 handout requires. AI does **not** autonomously change IAM, billing or
   production database configuration.
2. **Independent `thananun-7203`:** Review and approve the specific protected
   production workflow request before it can execute. No account switching,
   forged review, self-approval, or bypass.
3. **Author `cottonlnwza`:** Only after real authorized workflow execution,
   read back source SHA → image digest → Ready revision/traffic, perform safe
   post-release smoke and applicable persistence/repeat/rollback verification,
   and attach actual run links to [Issue #33](https://github.com/cottonlnwza/TTworkshop/issues/33).
4. **Team:** Finalize section/group and both student details; prepare the
   required PDF and submit through LEB2, retaining an actual receipt. Do not
   mark [#32](https://github.com/cottonlnwza/TTworkshop/issues/32) or
   [#33](https://github.com/cottonlnwza/TTworkshop/issues/33) Done merely
   because this documentation PR merges.
