# Lab 5 — TTworkshop Deployment Procedure (partially provisioned; not deployed)

**Official sources:** `01_SE_Lab_5_updated.pdf` pp. 1–10 (R-01..R-12, C-01..C-06); `03_Student-Guide-GCP-Deployment-and+CI+CD-V1_1.pdf` v1.1, Episodes 0–10; `02_lab5-starter-kit.zip` (TokTickIT example, not production-ready for this app).

**Status (2026-11-15 13:03 Asia/Bangkok):** GCP INFRASTRUCTURE **PARTIALLY PROVISIONED**, **NOT DEPLOYED**. Cloud SQL instance/database, runtime Service Account and Secret/IAM exist. The human operator has now created app user `ttworkshop_app` and Secret version `1` (`ENABLED`), metadata-verified. **No Cloud Run service, public URL, migration, live database connection, authentication tests, restart/redeploy persistence or `main` release exists/is verified.** Issue #32 / Draft PR #42; work branch `feat/issue32-gcp-deployment-prep`; target `sprint_2_staging`. Never treat a dry-run success as cloud acceptance evidence.

**Credential verification limit:** Only user and Secret version metadata were read through GCP APIs. **The Secret value has not been read or validated.** The user chose the built-in `cloudsqlsuperuser` role for this Lab setup; least-privilege database access remains a documented security risk and does not satisfy AC-L5-13 on its own.

## Architecture and deviations from Starter Kit

Reference services are **recommended**, not a forced exact stack: Artifact Registry, Cloud Run, Cloud SQL PostgreSQL, Secret Manager, GitHub Actions with Workload Identity Federation. TTworkshop uses React/Vite + Express 5 + `pg` and SQL migrations, **not Prisma**. Its root `Dockerfile` builds the UI and runs an unprivileged Node API; `SERVE_WEB=true` serves static UI and `/api/v1` on one HTTPS origin, needed for strict browser Origin validation and session cookies. The existing Compose environment uses separate local frontend/backend and is unchanged.

Actual project: `cpe334-ttworkshop` (confirmed ACTIVE), number `348518197526`, region `asia-southeast1` (Singapore). **Created:** `ttworkshop-pg` (Cloud SQL PostgreSQL 16 Enterprise `db-f1-micro`, SSD 10 GB, ZONAL, `storageAutoResize=false`, RUNNABLE), database `ttworkshop`, `ttworkshop_app` built-in user, `ttworkshop-runner` runtime identity with `roles/cloudsql.client` on Project, Secret `ttworkshop-database-url` with metadata-confirmed **version 1 ENABLED**, and `roles/secretmanager.secretAccessor` for that identity on the Secret only. **Not created:** Cloud Run service, Artifact Registry repo, migration job or deployer identity. Actual Cloud SQL connection name: `cpe334-ttworkshop:asia-southeast1:ttworkshop-pg` (non-secret). No additional authorized IP networks were configured.

**Budget:** Free Trial screenshot on 2026-11-14: THB 10,133 credit, 90 days remaining, end 2027-02-13. Live `gcloud` confirms `billingEnabled=true` and account Owner. On 2026-11-15 the owner expressly authorized enabling the Budget API and, only if no project-covering budget existed, creating a THB 1,500 alert. The API was enabled; **an existing** `CPE334-TTworkshop` **THB 8,000 alerts-only budget** was discovered (only project `cpe334-ttworkshop`, 2026-11-01 through 2026-12-16, before-credit spend, thresholds 10/20/50/90%, three notification channels). **No duplicate THB 1,500 budget was created; no existing budget changed.** The owner had separately authorized the six deployment APIs, SQL instance/database/user, runtime identity/permissions and Secret. Six deployment APIs were enabled; only the verified subset above was created. The current remaining Free Trial credit and accrued spend are **NOT VERIFIED via API**. Never upgrade to Paid. Alerts do not cap charges; the Cloud SQL instance now accumulates charges/credit consumption while it exists, even though it is not deployed. Keep any eventually deployed service available for grading until course staff says grading is complete (handout p.9).

**Credential history and current state:** An earlier automation attempt to create `ttworkshop_app`/Secret version without printing credentials was blocked by the execution tool's safety checks **before execution**. The human operator subsequently created both through the Google Cloud Console. Metadata-only read-back confirms user and enabled Secret version 1, **not** password correctness, connection success or least-privilege PostgreSQL role configuration. Do not put passwords in CLI arguments, files, logs, repo, screenshots or chat. This does **not** stop ongoing Cloud SQL hourly credit consumption.

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
python3 -m unittest discover -s tests -p 'test_cloud_smoke.py' -v
node scripts/cloud-preflight.mjs
DRY_RUN=1 PROJECT_ID=cpe334-ttworkshop REGION=asia-southeast1 bash deploy/plan.sh
python3 -m py_compile deploy/smoke_test.py
git diff --check
```

`deploy/plan.sh` intentionally has **no mutation mode**. It prints a human-reviewed sequence but does not run `gcloud`, alter Billing, IAM, databases or APIs, create resources, build images, or deploy. The TokTickIT `deploy/deploy.sh` **must not be run**: it uses Prisma and TokTickIT secrets/resource names, incompatible with TTworkshop. Any subsequent execution of commands must be checked against actual Google Cloud documentation, estimated cost, least-privilege IAM, and the human-permission gate from the Lab 5 guide.

## Remaining provisioning and release gates (NOT EXECUTED)

1. Verify the project Free Trial and existing 8,000 THB alerts-only budget read-back. Check current credits/billing in the owner Console before new paid services; do not Upgrade. The basic APIs, Cloud SQL and runtime SA/Secret IAM already exist; **do not repeat creation of existing resources**. Read each proposed remaining GCP/IAM/database command and obtain human approval per Lab 5 handout p.8 / Student Guide p.1.
2. **User and Secret version have been created by the operator.** Before deploy, verify connectivity with a controlled test and review database privileges. **Important least-privilege caveat:** Google Cloud docs state a built-in PostgreSQL user normally receives `cloudsqlsuperuser` by default. Do not treat `ttworkshop_app` as a least-privilege runtime DB role until a reviewed role/permission plan is implemented. Grant only needed permissions for app DML and keep migrations separately controlled. The course reference kit's runtime Service Account IAM alone does **not** limit the PostgreSQL user's privileges.

   The operator-entered Secret should follow the URL structure `postgresql://ttworkshop_app:<URL_ENCODED_PASSWORD>@/ttworkshop?host=%2Fcloudsql%2Fcpe334-ttworkshop%3Aasia-southeast1%3Attworkshop-pg`. This is a **placeholder only**, never a value to commit or share. The password must be URL-encoded privately. Google Cloud's `/cloudsql/PROJECT:REGION:INSTANCE` Unix socket path is supported for Cloud Run. Secret **metadata** has been verified; **never access or print the Secret value for proof**. Test actual connectivity only after separate applicable approval and do not mark persistence PASS until live evidence exists.
3. Build the exact approved commit, push its image to Artifact Registry, record image digest. Run `npm run db:migrate` as a separate Cloud Run migration job with the secret and Cloud SQL attachment. **Never run `npm run db:seed` in production**; it rejects production by design. Provision authorized synthetic test accounts through an explicitly approved secure process rather than hardcoded credentials.
4. Deploy service with `NODE_ENV=production`, `APP_HOST=0.0.0.0`, `SERVE_WEB=true`, `PORT=8080`, and inject the database URI from Secret Manager. Set `APP_ORIGIN` to the actual HTTPS service origin before exposing traffic and before authentication tests. This value is not predictable before Cloud Run creates the URL. Verify runtime service account, SQL attachment, Cloud Run concurrency/max scale, TLS, allowed ingress, migrations and rollback.
5. Run `python3 deploy/smoke_test.py https://ACTUAL_SERVICE_URL` (read-only, checks `/` + `/healthz`). Test authenticated Organizer publish and Participant registration, duplicate/full rejection and authorization using synthetic accounts; record redacted screenshots with URL and commit. Save record IDs and timestamps; trigger a real restart/new revision and then a separate redeploy, proving the same DB rows remain after both. No fake or local-only claims.
6. Independent teammate reviews PR #42 and its CI on the exact HEAD before staging merge; release through an independently reviewed staging-to-`main` PR and `main`-triggered deployment workflow (separate release ownership and authorization). A direct manual first deployment does not alone fulfill R-07/R-08. Record GitHub run, commit, digest, Cloud Run revision and rollback steps.
7. Do not destroy persistent Cloud SQL, backups, or grading data without separate explicit approval. Keep the public URL alive until grading ends as the handout requires. When authorized, run separate post-grading teardown procedure.

## Evidence checklist for the single required PDF on LEB2

Submission deadline **Sunday 2026-11-15 23:59 Asia/Bangkok**; one PDF `lab5_sec<section>_<group name>.pdf` using headings **Answer Part 0–4**. For Part 3 (35 points) need public URL, live UI/API/DB screenshot, and before/after data survival across **both** restart and redeploy (C-04/C-05). Part 4 (15 points) needs reviewed staging -> main release PR and live revision SHA (C-06). Part 1 (30 points) requires failing PR blocked by required check (C-02); Part 2 (20 points) fresh Docker build and environment documentation (C-03). Link directly to the artifacts; screenshots must not expose any secrets. No PDF submission has been performed.

| Gate | State | Required evidence still missing |
| --- | --- | --- |
| AC-L5-10 | PARTIAL | Budget, project/IAM, course reference and prior approvals verified; credit balance is screenshot-based and remaining credential/DB role gate outstanding |
| AC-L5-11 | NOT VERIFIED | Public HTTPS URL and live UI/API/DB business workflow |
| AC-L5-12 | NOT VERIFIED | Record IDs before/after restart and redeploy |
| AC-L5-13 | PARTIAL | Actual secrets/IAM grants and rollback proof |
| AC-L5-14 | PARTIAL | Verified live URL/digest/revision/SHA and redacted screenshots |
