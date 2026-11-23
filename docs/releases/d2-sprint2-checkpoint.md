# Sprint 2 release checkpoint

[Issue #72](https://github.com/cottonlnwza/TTworkshop/issues/72) · Deliverable 2 Part B §3.2 · Period 2 · 23 November 2026 ICT

## Candidate provenance

- **Pinned Sprint 2 source:** `sprint_2_staging@07eaf1aae325857218e393924923cf13b3420d34`, the merged [PR #77](https://github.com/cottonlnwza/TTworkshop/pull/77) checkpoint. [Hosted build-test](https://github.com/cottonlnwza/TTworkshop/actions/runs/45176868918) passed on that exact source. The source is an ancestor of the moving staging branch.
- **Main base:** `4efbcfac51872b3b78542c48c62c35cc01c24182`, the independently merged [Lab 6 PR #65](https://github.com/cottonlnwza/TTworkshop/pull/65). The [TH-038 retest and acceptance](https://github.com/cottonlnwza/TTworkshop/issues/63#issuecomment-7094316414) records the 9/9 defect retest, 66/66 HTTP observations, 19/19 persistence read-backs and final Sprint 1 acceptance at 13:42:59 ICT on 23 November. Issue #63 is closed.
- **Release branch:** `release/issue72-sprint2-main` combines the exact main base and the pinned Sprint 2 source. Lab 5/C-06 documents and deployment scripts, Lab 6 documents and the login regression test match the main base. Sprint 3 starts after the pinned checkpoint. F-08, F-09 and D2 work in #73 remain outside this release.
- **Existing immutable baseline:** original Sprint 1 [main release `3f5ec15a`](https://github.com/cottonlnwza/TTworkshop/commit/3f5ec15a1bc2a94d1b16003e1baa531dff4a7256) remains in the candidate history. The Sprint 2 release anchor on main will be the actual merge SHA and its hosted CI, after independent approval and authorized integration. Record the SHA and run in Issue #72 and carry them into the D2 release manifest once observed.

## Scope and verification

| Scope | Accepted behavior and evidence |
|---|---|
| F-05, [PR #75](https://github.com/cottonlnwza/TTworkshop/pull/75) | Timely Participant cancellation retains history and permits eligible re-registration. Integration verifies the duplicate, deadline and last-seat concurrency rules. [Contract](../contracts/f-05-cancellation.md) · [Test ledger](../evidence/p2-03-f05.md) |
| F-06, [PR #76](https://github.com/cottonlnwza/TTworkshop/pull/76) | Deadline updates and owner close/reopen enforce cutoff and ownership. `STS-F06-03` / `STS-F05-06` verifies that manual closure blocks new registration while timely cancellation remains available. [Contract](../contracts/f-06-deadline-manual-closure.md) · [Test ledger](../evidence/p2-04-f06.md) |
| F-07, [PR #77](https://github.com/cottonlnwza/TTworkshop/pull/77) | Owner edits eligible published fields and capacity. `STS-F07-03/04` verifies capacity rejection and transaction serialization with registration. `STS-F07-06` and R-03 cover schedule and ended rules after a lock wait. [Contract](../contracts/f-07-workshop-editing-capacity.md) · [Test ledger](../evidence/p2-05-f07.md) |
| Sprint 1 and Lab 6 regression | Login and role checks, publication, discovery, capacity-safe registration and the Organizer/Participant registration views run in the full integrated suite. The Lab 6 malformed-email regression remains in `tests/auth.integration.test.ts`. |

The release PR records the exact candidate HEAD and results for `npm ci`, `npm run build`, `npm test` using isolated PostgreSQL and Chromium, Python unit tests, and hosted `build-test`. Independently review that exact HEAD against the current main base. A new HEAD or changed main base requires a fresh check of integration evidence.

## Main integration and optional Cloud Run release

1. Obtain independent Formal APPROVE from `thananun-7203` and separately authorized integration. Verify clean required checks on the reviewed HEAD. Use a merge commit so the reviewed candidate and the pinned Sprint 2 history remain identifiable.
2. Read back the actual merge SHA and compare its tree with the reviewed release tree. Record hosted CI on the actual main SHA. This is the Sprint 2 release anchor for [Issue #73](https://github.com/cottonlnwza/TTworkshop/issues/73). A tag is a separate authorized action.
3. If a production deployment is authorized at this milestone, dispatch `deploy-main.yml` on the exact main SHA and obtain the protected production approval. Verify `ttworkshop-migrate` used that candidate image and applied `005_workshop_manual_closure.sql`; record its result and the production schema read-back. Check that the Ready revision serves the same immutable image digest, then verify public health, guarded workflow and persistence.
4. Record deployment evidence as a separate observation. The candidate and the hosted CI do not establish a Cloud Run deployment. Leave production state open until there is a successful run and read-back.
