# Deliverable 2 evidence and release readiness

**Working draft, 23 November 2026 (Thailand).** [Issue #73](https://github.com/cottonlnwza/TTworkshop/issues/73) covers Parts A, D, E and the D2 evidence pack. The Issue records the deadline as **29 November 2026, 23:59 ICT**. This record uses the Issue's scope. Confirm the course handout's exact seven checklist items before finalizing the PDF. The product scope on staging is F-01–F-08. Final Sprint 3 items appear in the dated plan below.

## Version and evidence register

| Evidence scope | Immutable reference and verification | Status |
|---|---|---|
| Original Sprint 1 release | [PR #26](https://github.com/cottonlnwza/TTworkshop/pull/26) → [3f5ec15a1bc2a94d1b16003e1baa531dff4a7256](https://github.com/cottonlnwza/TTworkshop/commit/3f5ec15a1bc2a94d1b16003e1baa531dff4a7256). The Author recorded build PASS and 103/103 local tests on that release. [Release reconciliation](https://github.com/cottonlnwza/TTworkshop/issues/25#issuecomment-6848564328). | Original release commit is an ancestor of current main. GitHub reported no tags on 23 November. Use the immutable commit link. |
| Sprint 2-only staging milestone | [PR #77](https://github.com/cottonlnwza/TTworkshop/pull/77) → `07eaf1aae325857218e393924923cf13b3420d34` (F-01–F-07). F-05 and F-06 landed through [PR #75](https://github.com/cottonlnwza/TTworkshop/pull/75) and [PR #76](https://github.com/cottonlnwza/TTworkshop/pull/76). | Identifiable staging source for [Issue #72](https://github.com/cottonlnwza/TTworkshop/issues/72). Requires a separate reviewed main release. |
| D2 source baseline on staging | [PR #79](https://github.com/cottonlnwza/TTworkshop/pull/79) → `bcac8e76dcdfa5f0a11f498a94b6fe8c6eeffd5c`. [Staging CI](https://github.com/cottonlnwza/TTworkshop/actions/runs/45200353851) and [post-merge local build, Vitest 189/189, Python 41/41](https://github.com/cottonlnwza/TTworkshop/issues/71#issuecomment-7105045391) passed. | F-05–F-08 verified on staging with earlier Sprint 1 features. See [full requirement matrix](../traceability.md#5e-deliverable-2-requirement-to-evidence-matrix). |
| Lab 6 baseline serving publicly | [Main CI](https://github.com/cottonlnwza/TTworkshop/actions/runs/45043304923) and [deploy run](https://github.com/cottonlnwza/TTworkshop/actions/runs/45043889523) passed for `4efbcfac51872b3b78542c48c62c35cc01c24182`. On 23 November, Cloud Run read-back showed `ttworkshop-00017-poy` at 100% traffic and digest `sha256:f6fc41988222e5f29da3a394c40d83bb6665b41f604cff26b821f8506e49ecf9`. [Public health](https://ttworkshop-xue6vtucgq-as.a.run.app/health) returned HTTP 200 with `{"status":"ok"}` on retry. | Lab 6 baseline. The first health request timed out after 10 seconds, then the retry passed. |
| D2 main release and deploy | The exact main SHA, its CI, deploy run, revision, digest and new production journey evidence are pending. | Blocked by #72, independent release review and explicit main/deploy authorization. |

## Part A | Change and defect register

| Change or defect | Decision and scope | Implementation and verification |
|---|---|---|
| Lab 5 hosted quality gates and packaging | CI builds and tests reviewed candidates. Docker local and Cloud Run production use PostgreSQL outside the app container. | [Issue #30](https://github.com/cottonlnwza/TTworkshop/issues/30), [Docker evidence](../evidence/l5-02-docker.md) and [Lab 5 deployment evidence](../labs/lab-05/deployment.md). |
| Lab 5 C-06 source access and candidate validation | A historical source-stage IAM failure preceded later successful releases. The candidate guard verifies the tagged zero-traffic revision before promotion. | [Failure record](https://github.com/cottonlnwza/TTworkshop/issues/33#issuecomment-7064846467), [main guard fix PR #62](https://github.com/cottonlnwza/TTworkshop/pull/62), [successful Lab 5 run](https://github.com/cottonlnwza/TTworkshop/actions/runs/44931017791). |
| Lab 6 DEF-TTW-TH038-01 | Login input containing invalid characters returned 500. Revised validation rejects malformed email with 400 and does not issue a session. This kept ordinary surrounding spaces supported. | [#63 → PR #64 and release PR #65](https://github.com/cottonlnwza/TTworkshop/issues/63#issuecomment-7094316414), `STS-F01-08`. TH-038 retest on `4efbcfa` / `ttworkshop-00017-poy` reported 9/9 defect checks, 66/66 HTTP observations, persistence read-back 19/19, and Sprint 1 Accepted on 23 November. |
| Sprint 2 rule changes | [DEC-05](../decisions/dec-05-manual-closure.md) and [DEC-06](../decisions/dec-06-cancellation-policy.md) separate manual registration closure from cancellation. [DEC-07](../decisions/dec-07-published-workshop-editing.md) and [DEC-08](../decisions/dec-08-capacity-guard.md) define published editing and atomic capacity limits. `REV-S2-01` revises the earlier draft-only edit boundary. | [Contracts PR #74](https://github.com/cottonlnwza/TTworkshop/pull/74), [F-05 evidence](../evidence/p2-03-f05.md), [F-06 evidence](../evidence/p2-04-f06.md), [F-07 evidence](../evidence/p2-05-f07.md). |
| Sprint 3 contract and F-08 check-in | [DEC-09](../decisions/dec-09-checkin-reporting-filtering.md) defines the attendance window and lock order. R-01 prevents silently dropped second clicks. R-02 requires `no-store` for invalid JSON responses. F-09 remains planned. | [Contracts PR #78](https://github.com/cottonlnwza/TTworkshop/pull/78), [#71 → PR #79](https://github.com/cottonlnwza/TTworkshop/pull/79), [F-08 evidence](../evidence/p2-07-f08.md). |
| CPE334 Lab 7 | Applicability for Period 2 is unverified. Add any assigned changes and actual evidence when the CPE334 handout and scope are available. | Pending source confirmation. |

## Part D | Specification, test evidence and contribution chains

- [SRS](../srs.md) defines requirements and accepted changes. [Feature inventory](../features.md) maps scope and owners. [System SDS](../system-sds.md) describes application, database and deployment responsibilities.
- The [D2 matrix](../traceability.md#5e-deliverable-2-requirement-to-evidence-matrix) links functional, business and non-functional requirements to features, sprints, AC/STS, real tests, results and tested versions. It identifies F-09 and unexecuted performance and responsive targets.
- **Test excerpt 1, business rule and concurrent integrity:** `STS-F07-03` asserts `409 CAPACITY_BELOW_ACTIVE` and unchanged stored capacity. `STS-F07-04` checks that concurrent registration and capacity reduction preserve `active_count <= capacity`. [Integration tests](../../tests/f07.integration.test.ts).
- **Test excerpt 2, ownership and persistence:** `STS-F08-06` verifies 401/403/404 authorization boundaries and no attendance mutation. `STS-F08-07` writes attendance, restarts the process, and reads the record in both role views. [Integration tests](../../tests/f08.integration.test.ts).
- **TDD example:** F-08 test-only `f18435d7` reported nine expected failures. `69d19937` implemented the workflow. R-01/R-02 went RED against `de1157b6` and GREEN with fixes at `759d53a6`. Final review approved `32ec0b7` and staging merge `bcac8e7` passed. [TDD execution ledger](../evidence/p2-07-f08.md).
- **Review chain 1:** [F-07 Issue #69](https://github.com/cottonlnwza/TTworkshop/issues/69) → [PR #77](https://github.com/cottonlnwza/TTworkshop/pull/77) → `sprint_2_staging@07eaf1aa`. **Review chain 2:** [F-08 Issue #71](https://github.com/cottonlnwza/TTworkshop/issues/71) → [PR #79](https://github.com/cottonlnwza/TTworkshop/pull/79) → `sprint_2_staging@bcac8e7`. Both Issues record author, reviewer, tests, and post-merge verification.

### Selected assertion excerpts

**F-07 capacity rejection** ([STS-F07-03](../../tests/f07.integration.test.ts#L287)). Selected assertions with the database query between them omitted.

```ts
expect(below.status).toBe(409);
expect(below.body.error.code).toBe("CAPACITY_BELOW_ACTIVE");
expect(dbAfterReject.rows[0].capacity).toBe(5);
```

**F-08 persistence** ([STS-F08-07](../../tests/f08.integration.test.ts#L542)). Selected lines omit existing authenticated read setup.

```ts
await stopApiProcess(apiProc);
apiProc = await startApiProcess(port, processOrigin);
// After reading each authenticated view:
expect(rosterBody.data[0]?.checked_in_at).toBe(checkinBody.data.checked_in_at);
expect(meBody.data[0]?.checked_in_at).toBe(checkinBody.data.checked_in_at);
```

## Part E | Integrated candidate and release gates

1. **Isolate the Sprint 2 milestone.** For #72 use the S2-only source from PR #77. Preserve later Lab 5/C-06 and Lab 6 commits on main. The current staging tip already contains F-08. A local git merge-tree check of main 4efbcfa and the S2-only source 07eaf1aa completed without conflicts on 23 November.
2. **Review the D2 release separately.** Reconcile the reviewed #73 docs and tested staging source with the actual main base. Run `npm ci`, `npm run build`, `npm test` and Python discovery against isolated PostgreSQL and Chromium. [README](../../README.md), [local env example](../../.env.example), [Dockerfile](../../Dockerfile), and [migrations 001–005](../../db/migrations/) document setup and schema. Record the release PR HEAD, independent APPROVE and exact main merge SHA. Match hosted CI to the merge commit.
3. **Deploy only the approved SHA.** Use [deploy-main.yml](../../.github/workflows/deploy-main.yml) after separate authorization and production approval. Record the migration job result for `005_workshop_manual_closure.sql`, image digest, Ready revision, traffic assignment, and public health. Tie the workflow's SHA, image digest and serving revision together in the register.
4. **Verify persistence and cross-feature behavior at the deployed version.** Use scoped synthetic records to demonstrate Organizer management, Participant registration and eligible cancellation, then an eligible F-08 check-in. Capture the allowed outcomes and backend role/rule rejection. Read the same authorized records in a fresh session across the approved revision transition, including the recorded check-in timestamp. Record test date, revision and safe evidence. A health probe alone leaves this gate open.

### Readiness review and final work plan

| Target (ICT) | Deliverable and acceptance | Owner |
|---|---|---|
| 24–26 November | Finish #72 while preserving the S2-only commit. Prepare the D2 candidate, reconciliation and cross-feature regression evidence. | cottonlnwza implementation and release preparation, thananun-7203 independent review |
| 27–29 November | Review the exact D2 release, verify main CI and authorized Cloud Run deployment, then assemble PDF and verify the handout checklist before **29 November 23:59**. | cottonlnwza deployment/evidence, both members PDF verification |
| 30 November–4 December | F-09 bounded discovery and roster filters (`P3-01`), authorization and pagination regression. | Team, issue assignment pending |
| 5–11 December | F-09 owner attendance summary (`P3-02`), NFR-04 measurement and NFR-05 responsive E2E. Schedule short work blocks around finals. Recheck F-08 and cross-feature regressions. | Team, issue assignment pending |
| 12–13 December | Integrated final regression, UAT, reviewed release, authorized deployment and versioned evidence. Target **13 December 2026**. | Both members |

### PDF evidence inventory

This working inventory groups the artifacts requested in #73. Confirm numbering and wording with the course handout before treating it as the LEB2 checklist.

| Item | Evidence candidate and caption content | Remaining |
|---|---|---|
| 1. Submission identity and version | TH-033_P3, section 131, both members, report date, repo and immutable submitted SHA. | Confirm official cover and file naming. |
| 2. Sprint 1 continuity and change/defect register | PR #26 / D1 SHA, Lab 5 and Lab 6 changes, TH-038 retest and applicable approved baseline changes. | Confirm Lab 7 applicability and render source evidence. |
| 3. Sprint 2 and Sprint 3 progress | F-05–F-07 staged and tested, F-08 staged and tested, F-09 remaining. Caption screenshots with feature, role, action, outcome and version. | Three real Chromium captures for STS-F07-10 and STS-F08-09 are available in the private draft PDF with staging version captions. Capture the D2 production journey after the authorized release. |
| 4. Requirements and actual tests | Part D matrix with two excerpts, exact test file/case, command, version and outcome. | Bind to final tested main candidate. |
| 5. TDD and GitHub review | F-08 RED → GREEN evidence, #69 → #77 and #71 → #79, hosted CI and review. | Capture captioned review/CI pages and retain links. |
| 6. Production evidence | Public URL, exact release SHA, CI run, immutable image digest, revision, health and persisted read-back, backend role/rule rejection. | Capture after authorized deployment. |
| 7. Readiness and PDF inspection | Test limits, dated plan to 13 December, PDF legibility and working links. Review screenshots and attachments for credentials, session identifiers and secrets. | Compare all seven actual checklist items, receive independent verification and retain submission proof after authorized LEB2 upload. |
