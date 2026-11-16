# Lab 5 / Issue #33 — controlled release candidate (PRE-RELEASE)

**Owner:** cottonlnwza (ComGu); **independent reviewer/merger:** thananun-7203.  
**Base:** `sprint_2_staging`; **target:** `main`; **source integration:** PR #42 merge `dee47ce0cdef25226115627ab13a0dce798529a1`.  
**Policy:** `sprint_1_staging@9c01bec446a2880c6f870304ea18931fa0253604` (v1.2.1 effective; proposed relay inactive).  
**Status:** REVIEW CANDIDATE ONLY — not a released or deployed version. This document must not be mistaken for GCP, Cloud SQL or LEB2 completion evidence.

## Scope and course gates

This is the **single** release PR owned by [Issue #33](https://github.com/cottonlnwza/TTworkshop/issues/33), separate from the merged implementation [PR #42](https://github.com/cottonlnwza/TTworkshop/pull/42) for [Issue #32](https://github.com/cottonlnwza/TTworkshop/issues/32). No change in source feature requirements or relaxation of access rules. Lab 5 instructions `01_SE_Lab_5_updated.pdf`: p.3 R-03–R-08, p.4 R-09, p.7 C-04–C-06, pp.9–10 PDF evidence. Due 2026-11-15 23:59, now past; do not invent on-time submission.

## Evidence and acceptance matrix — exact results must be added after events

| AC | Currently evidenced | Not yet evidenced / next action |
| --- | --- | --- |
| AC-L5-15 | `Dockerfile`, `deploy/plan.sh` offline-only, `.github/workflows/ci.yml`, PR #42 source readiness | Authenticated main-triggered repeatable deploy workflow; reviewed/pinned image SHA + digest; human-reviewed provisioning and valid GCP permissions |
| AC-L5-16 | PR #42 independently reviewed, merged into `sprint_2_staging` | This PR independent six-axis review, checks, authorized teammate merge into `main`, actual merge SHA/parents/tree |
| AC-L5-17 | `deploy/smoke_test.py` read-only HTTPS readiness checks, documented migration separation | Cloud Run actual HTTPS URL, workload connection, authorized deploy and rollback verification; real restart and redeploy persisted record IDs |
| AC-L5-18 | Course evidence requirements indexed below | Hosted CI/quality gate and blocked-merge proof, live URL/revision, screenshots, actual PDF and LEB2 receipt |
| AC-L5-19 | Current README/deployment docs and release candidate manifest | Real post-main results in Issue #33; valid board read-back and closure grant |

## Safety and remaining dependency order

1. Reviewer independently evaluates **this exact PR HEAD** and all six strict axes. An author's local tests or prior PR approval cannot replace that review. Review readiness is distinct from merge permission.
2. Only independent teammate may execute a separately authorized `main` merge after fresh checks/protection/mergeability, with actual SHA recorded. Never push directly to `main` or self-approve.
3. Student must inspect each exact GCP command before any execution (Lab 5 handout p.8 §9). No agent-initiated Billing, IAM or DB privilege mutation. Project currently has running Cloud SQL but has no Artifact Registry, Cloud Run Jobs or services as of the 2026-11-16 read-only inventory. Do not rerun existing service account/Secret setup.
4. Operator verifies cost/remaining credits, migrator Secret-injected login, one-shot migrations and app role DML grants; removes `cloudsqlsuperuser`, `CREATEDB`, `CREATEROLE`, schema CREATE from runtime login with an independently inspected, recoverable procedure. See `deploy/db-role-review.md` and `deploy/command-review.md` for explicit proposals, *not executed commands*.
5. Only after reviewed main source and release authorization: create Registry and pinned digest, run migration using migration-only SA/Secret, deploy under runtime SA/Secret, confirm `/healthz` JSON and UI, test organizer/participant flow and negative cases. Perform **both** real restart and redeploy persistence read-backs; capture redacted URLs, IDs, timestamps, digest, revision and tested commit.
6. Implement and validate a repeatable main deployment pipeline with the approved workload identity credentials; verify a second release and document rollback. `main` merge without deployment is NOT AC-L5-15 or AC-L5-17 PASS.
7. Record independent tests, actual main SHA, live evidence and original Issue #32/#33 ACs; only update Kanban `Done`/close original Issues after authorized completion and live read-back. Do not create another PR under either Issue merely to update trackers.

## Lab 5 submission index (not a completion claim)

| PDF part | Points | Actual evidence required | Status |
| --- | ---: | --- | --- |
| 0 Team and evidence index | — | Names/IDs/usernames, repo, release SHA, public URL and serving commit, contribution rows | INCOMPLETE |
| 1 CI and quality gate | 30 | `ci.yml`, passing actual PR run and separate failing test PR blocked by required merge gate (C-01/02) | PARTIAL; blocked required gate not yet independently verified |
| 2 Docker and reproducibility | 20 | Dockerfile, clean-clone container+DB, env table and commands (C-03) | PARTIAL |
| 3 GCP and persistence | 35 | Live HTTPS UI/API/DB, role/denial, actual restart **and** redeploy before/after data (C-04/05) | NOT VERIFIED |
| 4 Repeatable release | 15 | Independently reviewed release path and actual main SHA → image digest → deployed revision (C-06) | NOT VERIFIED |

No secrets/URLs invented; use actual links and redacted screenshots in the final LEB2 PDF. No LEB2 submission is claimed.
