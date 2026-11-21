# Lab 5 — TTworkshop Deployment Procedure (public service verified; C-06 pending)

> **Verified 2026-11-21 (read-only snapshot):**
> [Public HTTPS](https://ttworkshop-xue6vtucgq-as.a.run.app) serves `/` and
> `/health` (both HTTP 200), and rejects anonymous `/api/v1/auth/me`
> (HTTP 401). Cloud Run `ttworkshop-c05d1121072250` is Ready with 100%
> traffic, serving the **operator-manually deployed** image
> `sha256:ca8acac3445516a787efd782340b580b6a99440bab267e95824951bd6422f13c`.
> [Issue #32](https://github.com/cottonlnwza/TTworkshop/issues/32) documents
> actual Organizer publication, Participant registration/capacity rejection
> (C-04) and independently hashed/snapshot-verified **same-record** survival
> after new-container start and redeploy (C-05). No GitHub pipeline deployment
> is claimed.
>
> **Source and release controls:** Independently approved
> [PR #56](https://github.com/cottonlnwza/TTworkshop/pull/56) merged to
> `main@e53be24a944ec0da10fcf2738a7d4b0c727c7f88`, with successful
> [hosted CI #44904836406](https://github.com/cottonlnwza/TTworkshop/actions/runs/44904836406).
> The new main-only workflow selects a dedicated Cloud Build identity, stages
> a zero-traffic Ready candidate and checks immutable digest/traffic before
> and after promotion. It has **never been dispatched**. WIF provider,
> deployer identity and GitHub `production` environment Secret **names**
> `GCP_WIF_PROVIDER` and `GCP_DEPLOYER_SA` now exist (the repository-level
> Actions Secret list is empty, by design); correct Secret values and a
> successful Actions WIF exchange are **not verified**. The
> GitHub `production` environment requires independent `thananun-7203`
> approval and forbids self-review. Before any dispatch, the human operator
> must inspect and explicitly approve exact migration Job, backup, cost and
> production traffic operations under official Lab 5 §9.
>
> **Database and cost gates:** Earlier live read-only SQL evidence established
> four migration filenames, runtime without DDL/CREATE and expected constraints.
> Cloud SQL automated backups are enabled (seven retained); PITR/actual
> restore are **not verified**. The THB 8,000 project budget is
> **alerts-only**, not a hard spending cap; current Free Trial credit/balance
> needs owner Console verification. See the [current evidence index](evidence-index.md)
> and [original release Issue #33](https://github.com/cottonlnwza/TTworkshop/issues/33).
> Historical entries below must not override this dated current snapshot.

## Historical deployment/provisioning notes (2026-11-16 to 2026-11-19)


**Historical live state (2026-11-19, Asia/Bangkok; superseded):** PR #43 was independently
approved and merged to `main@d9e9f99637c0511bc93b561f51fb34d2b913d71b`.
Cloud Run service `ttworkshop` now exists **privately**: revision
`ttworkshop-00001-hix` is receiving 100% of the default private traffic and
`ttworkshop-00002-fin` (tag `preflight-v2`) is Ready with 0%. Runtime Secret is
`ttworkshop-database-url:3`; PostgreSQL schema migrations, restricted
runtime-role membership/privileges and DB login were verified via read-only
cloud jobs. The Service has no `allUsers` invoker binding. Production browser
workflows and persistence across both restart and redeploy are **NOT VERIFIED**.
Authenticated proxy observations on the **old deployed image**: `/` was HTML
200, `/api/v1/workshops` was unauthenticated 401, `/healthz` was Google
Frontend HTML 404 and `/healthz/` returned JSON 200. Google Cloud documents
some `z`-ending paths as reserved. [Fix Issue #46](https://github.com/cottonlnwza/TTworkshop/issues/46)
**was independently reviewed, merged and closed** in `sprint_2_staging`
through [PR #48](https://github.com/cottonlnwza/TTworkshop/pull/48)
at `60887f6e416a2e12d744b0741ab2f94d6e4cf8e1`; `/health` source,
regression tests and hosted post-merge CI [#44569902236](https://github.com/cottonlnwza/TTworkshop/actions/runs/44569902236)
are complete. **Issue #49 is a separate new `main` release candidate,
not yet merged, built into an image or deployed.** Preserve historical
review evidence for the earlier `2026-11-16` `/healthz` source fix below.

**Historical 2026-11-19 pre-deploy checklist for the `/health` fix (not executed then; later manual release verified):** obtain
independent six-axis Review of the scoped **Issue #49 → new PR to `main`**,
then a **separate explicit teammate Merge authorization** and verified main
SHA; build that exact main commit into a
new immutable Artifact Registry image digest; deploy that image **privately**
under `ttworkshop-runner` with Secret `ttworkshop-database-url:3`, the exact
Cloud SQL instance, `APP_ORIGIN=https://ttworkshop-348518197526.asia-southeast1.run.app`
and HTTP startup probe `path=/health` (not `/healthz`). Use a tagged revision
with 0% of the default service traffic. Confirm Cloud Run Ready, image/digest,
Secret reference, no `allUsers` invoker access, and an authenticated request
to `GET /health` returns HTTP 200 `{"status":"ok"}`. Only later, with separate
public-deploy/IAM approval, shift traffic and verify live synthetic business
journeys and persistence. Never expose passwords, database URLs or identity
tokens. Lab 5 p.8 §9 requires operator review of each real `gcloud` command.

**Historical release integration gate (Issue #49 / Period 2; superseded by merged PRs #50 and #56):** This Release PR
preserves `main`'s manually gated `.github/workflows/deploy-main.yml`,
`deploy/verify_serving_revision.py`, `tests/test_release_provenance.py`
and existing Issue #33 release evidence. **The manual workflow is NOT safe
to dispatch merely because this source PR passes CI:** it currently
executes the migration Job and deploys an image directly to the existing
service (not to an isolated tagged 0%-traffic revision), while GitHub WIF
secrets/provider are not configured. An operator must independently inspect
and approve precise commands, WIF/IAM, budgets, release main SHA, immutable
image digest, Cloud Run startup-probe path `/health`, private tagged
0%-traffic rollout and rollback before any such action. Verify live
`APP_ORIGIN`/service URL instead of assuming a historical snapshot.
See [Issue #49 candidate evidence](../../releases/lab5-issue49-health-main-candidate.md).

**Official sources:** `01_SE_Lab_5_updated.pdf` pp. 1–10 (R-01..R-12, C-01..C-06); `03_Student-Guide-GCP-Deployment-and+CI+CD-V1_1.pdf` v1.1, Episodes 0–10; `02_lab5-starter-kit.zip` (TokTickIT example, not production-ready for this app).

## Historical provisioning and review notes (2026-11-16; superseded by the live state above)

**Historical status (2026-11-16, Asia/Bangkok):** GCP INFRASTRUCTURE **PARTIALLY PROVISIONED**, **NOT DEPLOYED**. The **student/operator** created Cloud SQL `ttworkshop-pg` and database `ttworkshop`; runtime `ttworkshop_app`, `ttworkshop-runner` and `ttworkshop-database-url:1`; and later distinct `ttworkshop_runtime`/`ttworkshop_migration` NOLOGIN PostgreSQL roles, restricted `ttworkshop_migrator` login, `ttworkshop-migrator-runner` with `roles/cloudsql.client`, and `ttworkshop-migrator-url:1` Secret with only the migration SA as its explicit resource-level Secret Accessor. **The Author AI performed metadata-only read-backs, did not create these later IAM/Secret resources, and did not inspect credential payloads.** The migrator's PostgreSQL role attributes and effective schema `CREATE` were verified by student-provided read-only SQL; successful migrator password login was **not** tested. **Production `ttworkshop_app` still has `cloudsqlsuperuser`; no migrations, Cloud Run Job/service, public URL, live database connection, authentication workflow, restart/redeploy persistence or reviewed `main` release is verified.** Issue #32 / Draft PR #42 remains open and `CHANGES_REQUESTED`, targeting `sprint_2_staging`. This supersedes dated 2026-11-15 status snapshots without rewriting history. Do not treat metadata or a dry-run as cloud acceptance evidence.

**Historical credential verification limit (2026-11-16):** Only user and Secret version/IAM metadata were read through GCP APIs. **Neither Secret value has been read or validated.** The operator's migration user was verified not to hold `cloudsqlsuperuser`/`CREATEDB`/`CREATEROLE`, but `ttworkshop_app` still has `cloudsqlsuperuser`. Until the separately reviewed live runtime privilege reduction is evidenced, AC-L5-13 remains incomplete.

**Reviewer #42 `CHANGES_REQUESTED` remediation (code only, 2026-11-15):** `api/server.ts` now invokes `prepareDatabaseOnStartup()`. In Production this reads `schema_migrations` and verifies the migration filenames bundled with the exact image; it does **not** run `migrate()` or issue DDL. If migration history is absent, incomplete, unexpectedly ahead, unreadable or inaccessible to the runtime DB role, startup fails closed with redacted error, before opening the HTTP listener. Existing Development/Test startup still auto-migrates as before. The only production DDL entrypoint is a separately reviewed one-shot `scripts/migrate.ts` job with its own migration DB login, service account and per-secret IAM. See [`deploy/db-role-review.md`](../../../deploy/db-role-review.md) for exact role/grant/revocation proposals, explicit operator review gates and recovery, **not yet executed**. Never inject migrator credentials into the public API service.

**2026-11-16 Formal Re-review source fix (not a cloud execution):** Independent Reviewer found that `SERVE_WEB=true` previously mounted the SPA catch-all before `GET /healthz`, incorrectly returning HTML for readiness. The Author now uses `attachDeploymentRoutes()` from the actual production `api/server.ts` to register a DB-aware `/healthz` **before** serving static UI. Healthy `SELECT 1` yields HTTP 200 `{"status":"ok"}`; DB failure yields HTTP 503 `{"status":"unavailable"}`; errors are not echoed. A second fallback guard excludes `/healthz`. New isolated `tests/production-health-routing.unit.test.ts` invokes the same route composer with `createApp()` in `production: true` mode and `serveWeb: true`, including failure and ordinary UI/API checks; Python smoke tests cover the response contract. **This is source/test evidence only, not a running Cloud Run instance.**

## Architecture and deviations from Starter Kit

**Note:** The resource inventory and rollout assumptions below are a 2026-11-16
historical planning snapshot. The 2026-11-19 live state at the top supersedes
conflicting older resource/release claims.

Reference services are **recommended**, not a forced exact stack: Artifact Registry, Cloud Run, Cloud SQL PostgreSQL, Secret Manager, GitHub Actions with Workload Identity Federation. TTworkshop uses React/Vite + Express 5 + `pg` and SQL migrations, **not Prisma**. Its root `Dockerfile` builds the UI and runs an unprivileged Node API; `SERVE_WEB=true` serves static UI and `/api/v1` on one HTTPS origin, needed for strict browser Origin validation and session cookies. The existing Compose environment uses separate local frontend/backend and is unchanged.

Actual project: `cpe334-ttworkshop` (confirmed ACTIVE), number `348518197526`, region `asia-southeast1` (Singapore). **Created by operator:** `ttworkshop-pg` (Cloud SQL PostgreSQL 16 Enterprise `db-f1-micro`, SSD 10 GB, ZONAL, `storageAutoResize=false`, RUNNABLE), database `ttworkshop`, `ttworkshop_app` built-in user, `ttworkshop-runner` with project `roles/cloudsql.client` and resource-level `roles/secretmanager.secretAccessor` on `ttworkshop-database-url:1`; plus PostgreSQL `ttworkshop_runtime` and `ttworkshop_migration`, login `ttworkshop_migrator`, `ttworkshop-migrator-runner` with project `roles/cloudsql.client`, and its **separate** `ttworkshop-migrator-url:1` with scoped Secret Accessor. Both Secret versions are metadata-confirmed ENABLED. **Not created:** Cloud Run service, Artifact Registry repo, Cloud Run connection/migration jobs, deployer identity or published image. Actual Cloud SQL connection name: `cpe334-ttworkshop:asia-southeast1:ttworkshop-pg` (non-secret). No additional authorized IP networks were configured.

**Budget:** Free Trial screenshot on 2026-11-14: THB 10,133 credit, 90 days remaining, end 2027-02-13. Live `gcloud` confirms `billingEnabled=true` and account Owner. On 2026-11-15 the owner expressly authorized enabling the Budget API and, only if no project-covering budget existed, creating a THB 1,500 alert. The API was enabled; **an existing** `CPE334-TTworkshop` **THB 8,000 alerts-only budget** was discovered (only project `cpe334-ttworkshop`, 2026-11-01 through 2026-12-16, before-credit spend, thresholds 10/20/50/90%, three notification channels). **No duplicate THB 1,500 budget was created; no existing budget changed.** The owner had separately authorized the six deployment APIs, SQL instance/database/user, runtime identity/permissions and Secret. Six deployment APIs were enabled; only the verified subset above was created. The current remaining Free Trial credit and accrued spend are **NOT VERIFIED via API**. Never upgrade to Paid. Alerts do not cap charges; the Cloud SQL instance now accumulates charges/credit consumption while it exists, even though it is not deployed. Keep any eventually deployed service available for grading until course staff says grading is complete (handout p.9).

**Credential history and current state:** An earlier automation attempt to create `ttworkshop_app`/Secret version without printing credentials was blocked by the execution tool's safety checks **before execution**. The human operator subsequently created both through the Google Cloud Console. The human also created the restricted migration user through Cloud Shell and migration-only SA/Secret/IAM using Cloud Shell and Console. Author's metadata-only read-back confirms users, enabled Secret versions and explicit resource-level bindings, **not** password correctness, connection success or reduced privileges for the production app login. Do not put passwords in CLI arguments, files, logs, repo, screenshots or chat. This does **not** stop ongoing Cloud SQL hourly credit consumption.

## Environment variables

| Setting | Production use | Secret? | Source |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL URI with Cloud SQL Unix socket path | YES | Secret Manager `ttworkshop-database-url`, never printed or committed |
| `APP_ORIGIN` | Exact public Cloud Run HTTPS origin, no trailing slash | No | Cloud Run service URL after initial provisioning |
| `NODE_ENV` | `production` | No | Cloud Run environment |
| `SERVE_WEB` | `true` to serve built Vite UI from API container | No | Cloud Run environment |
| `APP_HOST` | `0.0.0.0` | No | Cloud Run environment |
| `PORT` | `8080` (or Cloud Run-provided `PORT`) | No | Cloud Run runtime |
| `VITE_UNIVERSITY_TIMEZONE` | `Asia/Bangkok` for web build | No | Build environment; compile-time Vite config |
| `SEED_PASSWORD` | **Do not set** | YES, local-only | Local synthetic seed only; `scripts/seed.ts` refuses production |
| `PG_TEST_URL`, `PG_SEED_TEST_URL` | **Do not set** | YES, test-only | Isolated CI test PostgreSQL; never live DB |

## Commands: source review and DRY RUN (safe to execute)

From the TTworkshop repository root:

```bash
npm ci --no-audit --no-fund
npm run build
npx vitest run tests/web-static.unit.test.ts
npx vitest run tests/production-health-routing.unit.test.ts
python3 -m unittest discover -s tests -p 'test_cloud_smoke.py' -v
npx vitest run tests/cloud-db-check.unit.test.ts
npx vitest run tests/runtime-schema.unit.test.ts tests/migration-runner.unit.test.ts
node scripts/cloud-preflight.mjs
DRY_RUN=1 PROJECT_ID=cpe334-ttworkshop REGION=asia-southeast1 bash deploy/plan.sh
python3 -m py_compile deploy/smoke_test.py
git diff --check
```

`deploy/plan.sh` intentionally has **no mutation mode**. It prints a human-reviewed sequence but does not run `gcloud`, alter Billing, IAM, databases or APIs, create resources, build images, or deploy. The TokTickIT `deploy/deploy.sh` **must not be run**: it uses Prisma and TokTickIT secrets/resource names, incompatible with TTworkshop. Any subsequent execution of commands must be checked against actual Google Cloud documentation, estimated cost, least-privilege IAM, and the human-permission gate from the Lab 5 guide.

**New operator command review (2026-11-15):** The user approved continuing Cloud DB checks, migrations and Artifact Registry / Cloud Run preparations. The course handout §9 (p. 8) separately requires students to **read every exact gcloud command or Console change before running it**, and specifies that only independently reviewed `main` releases deploy. Therefore the exact proposed commands, preconditions, cost and IAM consequences are recorded in [`deploy/command-review.md`](../../../deploy/command-review.md); **they have not been run**. The offline `scripts/cloud-db-check.ts` makes a read-only PostgreSQL identity probe in a future Cloud Run Job with secret injection, not in the agent tool or test runner; it prints PASS/FAIL only. This does **not** validate the current Secret payload or database connectivity. No additional GCP service, Cloud Run Job, image push, permission or DB migration was created by this preparation.

## Remaining provisioning and release gates (NOT EXECUTED)

1. Verify the project Free Trial and existing 8,000 THB alerts-only budget read-back. Check current credits/billing in the owner Console before new paid services; do not Upgrade. The basic APIs, Cloud SQL and runtime SA/Secret IAM already exist; **do not repeat creation of existing resources**. Read each proposed remaining GCP/IAM/database command and obtain human approval per Lab 5 handout p.8 / Student Guide p.1.
2. **Both users, both SA/Secrets and their scoped IAM bindings were created by the operator.** Do not recreate any of them. Before deployment, prove the migrator's Secret-injected login with the separate `ttworkshop-migrator-db-check` SELECT-only Job from `deploy/command-review.md`, after reviewed `main` release and individual command authorization. The `ttworkshop_app` built-in login still has `cloudsqlsuperuser`; before public service deployment separately review/execute required app DML grants, restrict runtime privileges and verify no `cloudsqlsuperuser`, `CREATEDB`, `CREATEROLE` or schema `CREATE`. The course reference kit's Service Account IAM alone does **not** limit the PostgreSQL user's privileges.

   The operator-entered Secret should follow the URL structure `postgresql://ttworkshop_app:<URL_ENCODED_PASSWORD>@/ttworkshop?host=%2Fcloudsql%2Fcpe334-ttworkshop%3Aasia-southeast1%3Attworkshop-pg`. This is a **placeholder only**, never a value to commit or share. The password must be URL-encoded privately. Google Cloud's `/cloudsql/PROJECT:REGION:INSTANCE` Unix socket path is supported for Cloud Run. Secret **metadata** has been verified; **never access or print the Secret value for proof**. Test actual connectivity only after separate applicable approval and do not mark persistence PASS until live evidence exists.
3. Build the exact approved commit, push its image to Artifact Registry, record image digest. Run `npm run db:migrate` as a separate Cloud Run migration job with the secret and Cloud SQL attachment. **Never run `npm run db:seed` in production**; it rejects production by design. Provision authorized synthetic test accounts through an explicitly approved secure process rather than hardcoded credentials.
4. Deploy service with `NODE_ENV=production`, `APP_HOST=0.0.0.0`, `SERVE_WEB=true`, `PORT=8080`, and inject the database URI from Secret Manager. Set `APP_ORIGIN` to the actual HTTPS service origin before exposing traffic and before authentication tests. This value is not predictable before Cloud Run creates the URL. Verify runtime service account, SQL attachment, Cloud Run concurrency/max scale, TLS, allowed ingress, migrations and rollback.
5. Run `python3 deploy/smoke_test.py https://ACTUAL_SERVICE_URL` (read-only, checks `/` + `/health`). Test authenticated Organizer publish and Participant registration, duplicate/full rejection and authorization using synthetic accounts; record redacted screenshots with URL and commit. Save record IDs and timestamps; trigger a real restart/new revision and then a separate redeploy, proving the same DB rows remain after both. No fake or local-only claims.
6. Independent teammate reviews PR #42 and its CI on the exact HEAD before staging merge; release through an independently reviewed staging-to-`main` PR and `main`-triggered deployment workflow (separate release ownership and authorization). A direct manual first deployment does not alone fulfill R-07/R-08. Record GitHub run, commit, digest, Cloud Run revision and rollback steps.
7. Do not destroy persistent Cloud SQL, backups, or grading data without separate explicit approval. Keep the public URL alive until grading ends as the handout requires. When authorized, run separate post-grading teardown procedure.

## Evidence checklist for the single required PDF on LEB2

Submission deadline **Sunday 2026-11-15 23:59 Asia/Bangkok**; one PDF `lab5_sec<section>_<group name>.pdf` using headings **Answer Part 0–4**. For Part 3 (35 points) need public URL, live UI/API/DB screenshot, and before/after data survival across **both** restart and redeploy (C-04/C-05). Part 4 (15 points) needs reviewed staging -> main release PR and live revision SHA (C-06). Part 1 (30 points) requires failing PR blocked by required check (C-02); Part 2 (20 points) fresh Docker build and environment documentation (C-03). Link directly to the artifacts; screenshots must not expose any secrets. No PDF submission has been performed.

| Gate | State | Required evidence still missing |
| --- | --- | --- |
| AC-L5-10 | PARTIAL | Project, region and alerts-only budget verified; current owner Free Trial balance/spending guard must be checked before more billable actions |
| AC-L5-11 | PASS | C-04 public HTTPS, actual Organizer/Participant role workflow, capacity rejection and Cloud SQL persistence, Issue #32 evidence |
| AC-L5-12 | PASS | C-05 same workshop/registration IDs and timestamps in baseline, new-container start and redeploy snapshots; independent hashes and Cloud Run revision read-back in Issue #32 |
| AC-L5-13 | PARTIAL | SQL least-privilege and four migration entries audited read-only; backups enabled, but PITR/restore and full recovery/rollback exercise remain unverified |
| AC-L5-14 | IN PROGRESS | Public URL/digest/revision documented; complete document correction/review and accepted evidence chain pending under Issue #57 |
