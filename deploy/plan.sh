#!/usr/bin/env bash
# TTworkshop Lab 5: intentionally OFFLINE, non-executing cloud operation plan.
# Based on the CPE334 Lab 5 Starter Kit, adapted for pg + SQL migrations.
# No gcloud invocation, secret generation, IAM change or deployment is performed.
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-cpe334-ttworkshop}"
REGION="${REGION:-asia-southeast1}"
[[ "$PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,29}$ ]] || { echo 'Invalid PROJECT_ID' >&2; exit 2; }
[[ "$REGION" =~ ^[a-z][a-z0-9-]+[0-9]$ ]] || { echo 'Invalid REGION' >&2; exit 2; }
if [[ "${DRY_RUN:-1}" != '1' ]]; then
  echo 'BLOCKED: This script is a planning-only tool. No mutation mode exists.' >&2
  exit 3
fi
cat <<EOF
[DRY_RUN ONLY] TTworkshop GCP plan — NO commands below are executed
Project: ${PROJECT_ID}
Region: ${REGION}
Source: Lab 5 handout §4.4/§5; Student Guide v1.1 Episodes 1, 5–8
Approval gates: instructor handout verified; active Free Trial; budget alert; human reviews each gcloud/IAM/database command; independent PR review before staging/main release.

1. Verify Billing, Trial status, budget alerts and IAM. Never click Upgrade.
2. Proposed enable APIs (human-reviewed change):
   gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com iam.googleapis.com --project=${PROJECT_ID}
3. Proposed resources (requires separately reviewed IAM + DB commands):
   Artifact Registry Docker repo: ttworkshop, ${REGION}
   Cloud SQL: ttworkshop-pg, PostgreSQL, smallest compatible Enterprise tier, SSD 10 GiB, storage auto-increase OFF
   Database/user: ttworkshop / ttworkshop_app, random credentials stored ONLY in Secret Manager
   Runtime service account: ttworkshop-runner, Cloud SQL Client and per-secret Secret Accessor only
   Secrets: ttworkshop-database-url (never expose URI in CLI logs or Git)
4. Build exact-reviewed Git SHA and record immutable Artifact Registry digest.
5. Migrations: Cloud Run job uses 'npm run db:migrate' with DATABASE_URL from Secret Manager.
   Do NOT run 'npm run db:seed' in production: scripts/seed.ts explicitly refuses it.
6. Cloud Run service: ttworkshop, image digest, HTTPS public access only after approval,
   NODE_ENV=production, SERVE_WEB=true, APP_HOST=0.0.0.0, PORT=8080,
   APP_ORIGIN=<actual HTTPS Cloud Run URL>, DATABASE_URL=<Secret Manager reference>.
   One shared origin serves Vite dist and Express API; max instances <=3, min instances 0.
7. Smoke (read-only): python3 deploy/smoke_test.py https://<ACTUAL_SERVICE_URL>
8. Manual authenticated domain test + persistence evidence: create synthetic workshop/registration;
   record IDs, restart (new revision), verify; redeploy reviewed image, verify again.
9. Release only after independent review, CI, staging->main reviewed release PR;
   image SHA matches main. Do not self-approve or self-merge.
10. Keep service running for grading; control SQL hourly charges and tear down ONLY
    with separate authorization, preserving DB/backup until retention is approved.

Not executed: APIs, IAM, Cloud SQL, Artifact Registry, Secret Manager,
build/push, Cloud Run, migrations, data mutation and release.
EOF
