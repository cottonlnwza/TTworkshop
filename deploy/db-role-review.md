# Issue #32 — least-privilege database role & migration separation (REVIEW ONLY)

**STATUS: PROPOSED, NOT EXECUTED.** Consolidated binding Reviewer finding #1 on PR #42 (`CHANGES_REQUESTED` at reviewed HEAD `8f315703deafa8f30a6ab540a964450ea0b07c2b`). This document is a **human-reviewed plan** for the production Cloud SQL database `ttworkshop`, not proof of a changed live user, migration or role. Do not run its SQL or GCP commands without student review and separately scoped database/IAM authorization. The course handout requires reviewing each actual command before execution.

## 1. Why the previous design was unsafe

- Cloud SQL currently contains the built-in database user `ttworkshop_app` whose chosen role is `cloudsqlsuperuser`. This grants elevated DB rights not required for API requests. It is NOT a PostgreSQL native unrestricted `SUPERUSER`, but Cloud SQL gives it extra rights (`CREATEDB`, `CREATEROLE` etc.).
- Previous `api/server.ts` ran `migrate(pool)` whenever the server started. In Production the API could therefore execute DDL using its high-privilege login, bypassing review of migrations. A restart/redeploy could apply schema changes implicitly.
- **Fixed in this PR:** Production startup now checks versioned applied migration filenames with one read-only `SELECT` and fails closed if migration state is incomplete or unknown. Development/test startup continues automatically migrating for local workflows. `scripts/migrate.ts` remains the only dedicated one-shot DDL entrypoint and now redacts raw driver errors. This source separation does **not** remove privileges from the existing live Cloud SQL user.

## 2. Proposed identities and human approval gates

| Function | DB identity and privileges | GCP runtime identity | Credential secret | Current status |
| --- | --- | --- | --- | --- |
| Production API / read-only connection probe | `ttworkshop_app`: `LOGIN` + restricted `ttworkshop_runtime` grants, **not** `cloudsqlsuperuser` | Existing `ttworkshop-runner` — Cloud SQL Client and per-secret Accessor only | Existing `ttworkshop-database-url:1` | **NOT READY** — built-in user still privileged; Secret payload untested |
| Controlled, one-shot DDL migration job | Proposed distinct built-in user `ttworkshop_migrator` with permissions to create/alter the versioned application schema | Proposed separate `ttworkshop-migrator-runner`; never attached to serving API | Proposed distinct `ttworkshop-migrator-url:1` | **NOT CREATED / NOT AUTHORIZED** |

The migration job must **not** reuse the runtime Service Account/Secret. Creating a user, changing permissions, adding IAM policies/Secret or deploying a job are **separate human-reviewed GCP/DB mutations**; no automatic execution. Use secure operator-controlled credential entry; do not put real passwords, connection strings or Service Account keys in PR comments, shell history or logs.

## 3. SQL for DB administrator to REVIEW after separate authorization — do not paste/run blindly

**Preconditions:** Connect via an approved operator-controlled PostgreSQL session to database `ttworkshop`, inspect `current_database()`, `current_user`, schema ownership, tables and grants. Verify the new migration-only user exists and owns/can migrate the intended schema; if the schema already has objects created by a different owner, adapt grants after explicit review. First apply migrations as the approved migration identity, then establish Runtime grants to existing objects. For a clean initial schema, the suggested restricted SQL grants are:

```sql
-- REVIEW ONLY. Must be executed as a suitably authorized database administrator.
CREATE ROLE ttworkshop_runtime NOLOGIN;
GRANT CONNECT ON DATABASE ttworkshop TO ttworkshop_runtime;
GRANT USAGE ON SCHEMA public TO ttworkshop_runtime;
-- Allow only the four known business tables from migrations 001..004.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.users, public.sessions, public.workshops, public.registrations
  TO ttworkshop_runtime;
-- Production startup must be able to verify migration bookkeeping, not write it.
GRANT SELECT ON TABLE public.schema_migrations TO ttworkshop_runtime;
-- Current IDENTITY sequences only; verify actual names from pg_class before use.
GRANT USAGE, SELECT ON SEQUENCE
  public.users_id_seq, public.sessions_id_seq,
  public.workshops_id_seq, public.registrations_id_seq
  TO ttworkshop_runtime;
```

**Caution:** The four sequence names reflect the current SQL migrations, but **must be checked against live metadata**. If a command fails, stop and reconcile; do not grant broad `ALL` or switch the production login back to `cloudsqlsuperuser`. Do not grant blanket default DML privileges to all future tables; future migrations that add tables must explicitly review appropriate grants. Additional database/service roles should not be inferred from runtime IAM grants.

**Postgres role assignment (Cloud SQL Admin API) — reviewed candidate ONLY, NOT RUN:** The official Cloud SQL CLI documents `assign-roles ... --revoke-existing-roles` to replace the existing built-in user role rather than adding to the privileged membership. Only after the role exists and grants are validated:

```bash
gcloud sql users assign-roles ttworkshop_app \
  --project=cpe334-ttworkshop --instance=ttworkshop-pg \
  --type=BUILT_IN --database-roles=ttworkshop_runtime \
  --revoke-existing-roles
```

**Safety requirement:** This command revokes existing role memberships and changes production authorization. It **must not be executed autonomously by the Author AI**. A database operator must validate the current live membership list, the proposed replacement, and recovery before approving and running the exact command.

**Read-only verification (post-change, approved SQL session):**

```sql
SELECT current_database();
SELECT rolname, rolcreatedb, rolcreaterole
  FROM pg_roles WHERE rolname = 'ttworkshop_app';
SELECT pg_has_role('ttworkshop_app', 'cloudsqlsuperuser', 'member') AS elevated_membership;
SELECT has_schema_privilege('ttworkshop_app', 'public', 'CREATE') AS can_create_schema_objects;
SELECT has_table_privilege('ttworkshop_app', 'public.workshops', 'SELECT') AS can_read_workshops;
SELECT has_table_privilege('ttworkshop_app', 'public.schema_migrations', 'INSERT') AS can_write_migration_history;
```

Expected: privileged membership `false`, `rolcreatedb=false`, `rolcreaterole=false`, no schema `CREATE`, workshop `SELECT=true`, migration-history `INSERT=false`. Any discrepancy is a **blocker**, not an invitation to add broad IAM or log secret payloads. Validate real runtime API create/update/registration flows using synthetic non-sensitive accounts only after reviewed release.

## 4. Reviewed migration job and rollback boundaries

- One-shot `ttworkshop-migrate` Cloud Run Job must run as separate `ttworkshop-migrator-runner`, with only `roles/cloudsql.client` and its own secret accessor on `ttworkshop-migrator-url:1`, using a pinned reviewed image digest. Run `node ./node_modules/tsx/dist/cli.mjs scripts/migrate.ts`, NOT the long-running production `api/server.ts` and not `db:seed`.
- Versioned SQL in `db/migrations/001_auth.sql` through `004_registrations.sql` is applied transactionally with advisory lock `48033401`, and tracked by `schema_migrations`. It does not grant production runtime DDL. Never authorize the production runtime identity to read the migrator secret.
- **Failure before commit:** migrate() rolls back the migration transaction; the job exits nonzero with redacted errors. Stop further deployment if it fails. **Repeat execution:** previously recorded migrations are skipped; production startup only verifies exact migration records and does not mutate schema. **Rollback after a committed change:** do not run guessed destructive down migrations. Inspect Cloud SQL backups/restore and the application version's schema compatibility, and get separate approval for rollback or restore.
- Before any live service, execute a reviewed read-only Cloud SQL connection Job using the **runtime** identity and Secret, and validate the production startup readiness query. If it fails, verify connection/privilege errors through safe redacted diagnostics, never paste actual credentials. Only independent reviewed `main` release + authorized deployment can become a public app.

**Sources:** [Google Cloud SQL — Create/manage users](https://docs.cloud.google.com/sql/docs/postgres/create-manage-users), [Cloud SQL PostgreSQL users and roles](https://docs.cloud.google.com/sql/docs/postgres/users); actual Reviewer formal findings in PR #42. No mutations to Cloud SQL, Service Accounts, Secrets, Kanban, PR merge or GCP deployment were performed by this document.
