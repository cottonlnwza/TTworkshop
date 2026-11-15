# L5-03 / Issue #32 — Proposed GCP commands for human review (NOT EXECUTED)

**Status 2026-11-15:** This is a reviewable command proposal, not a script. Nothing here is automatically executed. The student must review **each** `gcloud` command and its changes before execution, as required by `01_SE_Lab_5_updated.pdf` §9 (p. 8) and Student Guide v1.1 p. 1. Even a broad approval to proceed does not waive the course requirement to review the actual commands. Database mutations, IAM, build and public access require separate scoped controls. **Do not run the full block blindly.**

## Verified prerequisites and scope

- GCP Project `cpe334-ttworkshop` (`348518197526`), Region `asia-southeast1`, authenticated user is the owner; billing enabled on Free Trial (last evidenced by account screenshot). Never Upgrade to Paid.
- An existing 8,000 THB **alerts-only** Budget applies only to the project, excludes credits, with 10/20/50/90% notifications. **Not a hard cost limit**; Cloud SQL `ttworkshop-pg` is already accruing costs. Review actual cost/remaining credit before proceeding.
- Existing resources — **do not recreate**: Cloud SQL `ttworkshop-pg` (PostgreSQL 16 Enterprise `db-f1-micro`, SSD 10 GiB), database `ttworkshop`, database user `ttworkshop_app`, runtime SA `ttworkshop-runner@cpe334-ttworkshop.iam.gserviceaccount.com`, Secret `ttworkshop-database-url` **version 1 ENABLED**. Secret **payload has not been accessed or validated**, and user is using built-in `cloudsqlsuperuser` temporarily (least-privilege gap). Runtime SA has project `roles/cloudsql.client` and only this Secret's `roles/secretmanager.secretAccessor`.
- The **current Draft PR #42 is not independently approved or merged**. Official handout §9 requires `staging → reviewed release PR → main → deploy`. **NO IMAGE PUSH, RUN JOB EXECUTION, CLOUD RUN SERVICE DEPLOYMENT OR PUBLIC ACCESS IS AUTHORIZED HERE BEFORE THAT RELEASE GATE IS MET**, regardless of whether the commands below are reviewed.
- Source: TTworkshop Express + `pg`, **not Prisma**. `scripts/cloud-db-check.ts` is a read-only credential/identity check that logs only PASS/FAIL; `scripts/migrate.ts` runs transactional versioned SQL migrations; production service serves the Vite UI and API on the same origin. Never run production `db:seed` or CI integration tests against Cloud SQL.

## 0. Safe, read-only checks (already allowed)

```bash
gcloud auth list --filter='status:ACTIVE'
gcloud billing projects describe cpe334-ttworkshop
gcloud sql instances describe ttworkshop-pg --project=cpe334-ttworkshop
gcloud secrets versions describe 1 --secret=ttworkshop-database-url --project=cpe334-ttworkshop --format='value(state)'
gcloud artifacts repositories list --location=asia-southeast1 --project=cpe334-ttworkshop
gcloud run services list --region=asia-southeast1 --project=cpe334-ttworkshop
```

None of the commands reads a Secret value. Do **not** use `gcloud secrets versions access` as a way to demonstrate its contents.

## 1. Only AFTER independent staging/main release and review of these exact cloud commands

**Resource create** (Artifact Registry Docker repository — storage may consume Trial credit):

```bash
gcloud artifacts repositories create ttworkshop \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description='TTworkshop reviewed CPE334 images' \
  --project=cpe334-ttworkshop
```

**Build and image upload** (Cloud Build creates build jobs and uploads image; can incur credits; run against **exact verified `main` HEAD**, not a feature PR or stale checkout):

```bash
# From repository checkout pinned to the reviewed and merged main commit only:
MAIN_SHA="$(git rev-parse HEAD)"  # ensure current checkout truly is main
IMAGE_TAG="asia-southeast1-docker.pkg.dev/cpe334-ttworkshop/ttworkshop/app:${MAIN_SHA}"
gcloud builds submit . \
  --tag="${IMAGE_TAG}" \
  --project=cpe334-ttworkshop

# Record the digest from the Artifact Registry metadata, without secrets.
gcloud artifacts docker images describe "${IMAGE_TAG}" \
  --project=cpe334-ttworkshop --format=json
# Before each job/service command, set IMAGE_DIGEST_REF explicitly from the
# digest just verified: asia-southeast1-docker.pkg.dev/.../app@sha256:...
```

**Read-only connection check (Cloud Run Job)**: Creates a job, injects Secret *without printing it*, attaches Cloud SQL socket, runs only `SELECT current_database(), current_user, 1`. If failed, stop and inspect redacted logs. This does not mutate application rows.

```bash
gcloud run jobs create ttworkshop-db-check \
  --project=cpe334-ttworkshop --region=asia-southeast1 \
  --image="${IMAGE_DIGEST_REF}" \
  --service-account=ttworkshop-runner@cpe334-ttworkshop.iam.gserviceaccount.com \
  --set-cloudsql-instances=cpe334-ttworkshop:asia-southeast1:ttworkshop-pg \
  --set-secrets=DATABASE_URL=ttworkshop-database-url:1 \
  --command=node \
  --args=./node_modules/tsx/dist/cli.mjs,scripts/cloud-db-check.ts \
  --max-retries=0 --tasks=1 --task-timeout=60s --memory=512Mi
gcloud run jobs execute ttworkshop-db-check \
  --project=cpe334-ttworkshop --region=asia-southeast1 --wait
```

**Migrations (WRITES to Cloud SQL)**: After the read-only job PASS and specific database-change review, execute versioned additive SQL migrations once from the reviewed image digest. The current app also calls `migrate()` on service startup; migration locking/idempotency prevents duplicate application of tracked migrations, but does not substitute for a rollback strategy.

```bash
gcloud run jobs create ttworkshop-migrate \
  --project=cpe334-ttworkshop --region=asia-southeast1 \
  --image="${IMAGE_DIGEST_REF}" \
  --service-account=ttworkshop-runner@cpe334-ttworkshop.iam.gserviceaccount.com \
  --set-cloudsql-instances=cpe334-ttworkshop:asia-southeast1:ttworkshop-pg \
  --set-secrets=DATABASE_URL=ttworkshop-database-url:1 \
  --command=node \
  --args=./node_modules/tsx/dist/cli.mjs,scripts/migrate.ts \
  --max-retries=0 --tasks=1 --task-timeout=300s --memory=512Mi
gcloud run jobs execute ttworkshop-migrate \
  --project=cpe334-ttworkshop --region=asia-southeast1 --wait
```

**Private Cloud Run service initialization** (billable cloud service; no unauthenticated invocation, no live traffic; run only after valid DB check and migration). URL is only known after Cloud Run creation, so the initial `APP_ORIGIN` is an inert HTTPS placeholder, not a usable production Origin. **Do not publicly route traffic before changing it to the actual URL**:

```bash
gcloud run deploy ttworkshop \
  --project=cpe334-ttworkshop --region=asia-southeast1 \
  --image="${IMAGE_DIGEST_REF}" \
  --service-account=ttworkshop-runner@cpe334-ttworkshop.iam.gserviceaccount.com \
  --set-cloudsql-instances=cpe334-ttworkshop:asia-southeast1:ttworkshop-pg \
  --set-secrets=DATABASE_URL=ttworkshop-database-url:1 \
  --set-env-vars=NODE_ENV=production,SERVE_WEB=true,APP_HOST=0.0.0.0,APP_ORIGIN=https://placeholder.invalid \
  --port=8080 --memory=512Mi --cpu=1 \
  --min-instances=0 --max-instances=1 \
  --no-allow-unauthenticated --no-traffic
gcloud run services describe ttworkshop \
  --project=cpe334-ttworkshop --region=asia-southeast1 \
  --format='value(status.url)'

# Human reviews the exact URL and deliberately updates APP_ORIGIN through a new
# reviewed revision. Never replace with a guessed URL or reveal the Secret.
# Proposed later command after ACTUAL_HTTPS_URL is verified:
gcloud run services update ttworkshop \
  --project=cpe334-ttworkshop --region=asia-southeast1 \
  --update-env-vars="APP_ORIGIN=${ACTUAL_HTTPS_URL}"
```

**Public access / live smoke**: Creating a publicly accessible URL is an IAM access decision. Needs explicit review of `allUsers` access, exact deployment revision, all remaining release gates, and user's scoped public-deploy authorization. **Do not execute automatically**. The eventual public URL should be checked with:

```bash
python3 deploy/smoke_test.py "${ACTUAL_HTTPS_URL}"
```

No steps above establish persistence. Only actual synthetic workshop/registration records read back after **both a real service restart and a new redeployment**, with timestamps/IDs and no exposed credentials, satisfy the relevant acceptance evidence.

## Exact prerequisites still outstanding

1. Human reads and explicitly approves these commands and the access/DB changes specified, and separately handles any needed IAM role modifications. No automatic addition of `roles/editor` or Service Account keys if Cloud Build permissions are missing.
2. Independent Reviewer approves PR #42 on actual HEAD, teammate merges into protected `sprint_2_staging`, and an independently reviewed/authorized Issue #33 release PR merges staging → `main` (per official course rule). Then the reviewed `main` SHA drives build/deploy.
3. Before spending more Trial credit, human checks balance and confirms any now-running Cloud SQL cost and the expected limited service usage. Existing budget alerts **do not stop charges**.
4. The chosen PostgreSQL built-in `cloudsqlsuperuser` user is not least-privilege; log this as an explicit security gap instead of claiming AC-L5-13 complete. Plan remediation before production use.

No new Issues, Merge, releases, Cloud Run jobs, Artifact Registry repo, IAM grants, migrations, public access or database writes were performed by authoring this command list.
