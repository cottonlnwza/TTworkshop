# DEC-14 — Cross-Workshop Schedule-Conflict Prevention (`BR-05b`) & Advisory Lock Serialization

> **v0.1.1 — PROPOSED / PENDING INDEPENDENT PEER REVIEW (PR #86 Round 2 `R-02`/`R-03` remediation) — 2026-11-24 (Asia/Bangkok)**
> Owner scope: [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85) · Implementation: [Issue #83 (`L7-02`)](https://github.com/cottonlnwza/TTworkshop/issues/83) · Release: [Issue #84 (`L7-03`)](https://github.com/cottonlnwza/TTworkshop/issues/84)
> Linked requirements: `FR-07`, `BR-01`, `BR-05` (preserved), **`BR-05b`** (new), `BR-06`, `BR-09`, `BR-12`, `BR-16`; `NFR-01`, `NFR-02`, `NFR-03`
> Baseline references: Accepted Sprint 1 baseline (`main@4efbcfac51872b3b78542c35cc01c24182`, Cloud Run `ttworkshop-00017-poy`, original D1 `3f5ec15a1bc2a94d1b16003e1baa531dff4a7256`) · Deliverable 2 `main` anchor (`b111ffcd114f03effd2175991b23d4f702362c3f`)

## 1. Context

In Sprint 1 (`F-03`, [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) / [PR #15](https://github.com/cottonlnwza/TTworkshop/pull/15)), `BR-05` enforced at most one `ACTIVE` registration per `(workshop_id, participant_user_id)` via the PostgreSQL partial unique index `registrations_one_active_per_participant_workshop_idx`. However, a Participant could simultaneously hold `ACTIVE` registrations for two **different** workshops whose schedules overlap, reserving seats they cannot physically attend at the same time.

Under CPE334 Lab 7 (adaptive/perfective maintenance on a Sprint 1 rule) and the 2026-11-24 course announcement waiving separate instructor/TA approval in favor of a team-agreed non-trivial Sprint 1 enhancement, both teammates (`thananun-7203` and `cottonlnwza`) agreed on a bounded, full-stack schedule-conflict rule (**`BR-05b`**) that preserves `BR-05` and all existing Sprint 1–3 invariants.

*(Note: `DEC-13` is already assigned in `docs/srs.md` §8 to scoped working-document acceptance; this decision is numbered **`DEC-14`**.)*

## 2. Decision

### 2.1 Normative Overlap Rule (`BR-05b`)

1. **Scope & identity:** On `POST /api/v1/workshops/:id/registrations`, the backend resolves `participant_user_id` strictly from the authenticated server session (`BIGINT` identity; never from request body/headers) and checks for overlapping `ACTIVE` registrations belonging **only to that same Participant** across **different workshops** (`w.id <> target.id`).
2. **Half-open interval overlap predicate:** Two published workshops `existing` and `target` overlap if and only if:
   ```sql
   existing.starts_at < target.ends_at
   AND target.starts_at < existing.ends_at
   ```
   Evaluated in PostgreSQL `TIMESTAMPTZ` UTC instant precision.
3. **Exact boundaries:**
   - **Back-to-back workshops allowed:** If `existing.ends_at = target.starts_at` or `target.ends_at = existing.starts_at`, the predicate evaluates to `false` and registration is **permitted** (`201 ACTIVE`).
   - **1-second (or sub-second) overlap rejected:** Any strictly positive intersection returns **`409 SCHEDULE_CONFLICT`** with zero DB mutation.
   - **Defensive null/invalid target schedule (`R-02`):** Normal `PUBLISHED` rows already satisfy schema constraints `published_required` (non-null `starts_at`/`ends_at`) and `valid_time_order` (`ends_at > starts_at`) from migration `002`. As defense-in-depth for malformed persisted data written outside F-02 API validation, if the target workshop has `starts_at IS NULL`, `ends_at IS NULL`, or `ends_at <= starts_at`, fail closed with the single explicit code **`409 INVALID_DEADLINE`** before attempting overlap comparison (matching §2.2 step 4 and `F-03` §4).
4. **History & cancellation compatibility (`F-05` / `BR-09` / `BR-12`):**
   - Only registrations with `status = 'ACTIVE'` participate in the conflict query.
   - `CANCELLED` registrations are excluded from conflict checks and their historical rows (`status = 'CANCELLED'`, `cancelled_at`) are preserved untouched. Cancelling an overlapping `ACTIVE` registration immediately releases the Participant's schedule slot for another workshop.
   - Cross-Participant isolation (`BR-01`): Participant B holding an `ACTIVE` registration in an overlapping workshop never blocks Participant A.

### 2.2 Preserved Error Precedence (`POST /api/v1/workshops/:id/registrations`)

To preserve 100% of existing Sprint 1 (`F-03`) and Sprint 2 (`F-05`/`F-06`) error semantics, the endpoint evaluates checks in the following deterministic order:

1. `401 UNAUTHENTICATED` / `403 FORBIDDEN` (session auth, `PARTICIPANT` role, and same-origin `Origin` middleware)
2. `404 NOT_FOUND` (invalid workshop ID or missing / non-`PUBLISHED` workshop)
3. `409 REGISTRATION_CLOSED` (`workshop.registration_closed = true`, `F-06` / `BR-10`)
4. `409 INVALID_DEADLINE` (malformed persisted schedule/deadline: `starts_at IS NULL`, `ends_at IS NULL`, `ends_at <= starts_at`, or `registration_deadline > starts_at`, `BR-08`)
5. `409 DEADLINE_PASSED` (`now >= COALESCE(registration_deadline, starts_at)`, `BR-07`)
6. `409 CAPACITY_FULL` (`active_count >= capacity`, `BR-06`)
7. `409 DUPLICATE_ACTIVE` (existing `ACTIVE` registration for the **same** `(workshop_id, participant_user_id)`, `BR-05` — checked before cross-workshop overlap so repeating registration on the same workshop is never masked as `SCHEDULE_CONFLICT`, and still backed by PostgreSQL partial unique index `23505`)
8. `409 SCHEDULE_CONFLICT` (existing `ACTIVE` registration for the same Participant in a **different** workshop `w.id <> target.id` matching the overlap predicate, **`BR-05b`**)

### 2.3 Safe `409 SCHEDULE_CONFLICT` Error Response

```json
{
  "error": {
    "code": "SCHEDULE_CONFLICT",
    "message": "Registration conflicts with an existing active workshop schedule"
  }
}
```

- Follows the existing `{ error: { code, message } }` JSON envelope with `Cache-Control: no-store` (or existing route headers; no private data of other users or internal SQL details exposed).
- UI detail view (`web/ParticipantApp.tsx`) surfaces `error.message` in its existing `role="alert"` error container without marking the workshop registered and refreshes availability cleanly.

### 2.4 Atomic Concurrency Strategy & Lock Key Separation

1. **Problem with `workshops FOR UPDATE` alone:** Locking only the target workshop row prevents overbooking one workshop (`BR-06`), but two concurrent requests by the **same Participant** for two **different** overlapping workshops (`W1` and `W2`) acquire locks on two different `workshops` rows and can pass the overlap query simultaneously.
2. **Transaction-scoped per-Participant advisory lock (`pg_advisory_xact_lock`):**
   - Immediately after `BEGIN` (and before locking `workshops`), acquire:
     ```sql
     SELECT pg_advisory_xact_lock(-($1::bigint))
     ```
     where `$1` is the session-derived `participant_user_id` (`BIGINT`, strictly `>= 1` from `BIGINT GENERATED ALWAYS AS IDENTITY`).
   - **Disjoint key space from migrations:** `api/migrate.ts` line 14 uses `pg_advisory_xact_lock(48033401)` (strictly positive `BIGINT`). Using `-($1::bigint)` maps all `users.id >= 1` bijectively into the strictly **negative `BIGINT` range** `[-9223372036854775807, -1]`:
     - **Zero collision** with migration lock `48033401` or any future positive system/job advisory lock IDs.
     - **Full `BIGINT` fidelity** across all PostgreSQL identity values (`1 .. 2^63 - 1`), avoiding `int4` truncation or hash collisions.
     - **Least-privilege design rationale (`R-03`):** By PostgreSQL design, `pg_advisory_xact_lock` is a built-in advisory lock function requiring no `UPDATE` table privilege on `public.users` (unlike `SELECT ... FROM users FOR UPDATE`). Note: existing `tests/runtime-db-privileges.integration.test.ts` at this HEAD grants DML including `UPDATE` on `public.users` and covers startup/DDL and `schema_migrations` access; it does **not** yet exercise the proposed registration advisory lock under a role lacking `users` `UPDATE`. Runtime-role validation of the new advisory lock without `users` `UPDATE` privilege is **planned in `L7-02` (#83)** (`NOT EXECUTED`).
     - **Automatic cleanup:** Transaction-scoped (`_xact_`) releases automatically on `COMMIT` or `ROLLBACK`.
3. **Strict deadlock-free global lock hierarchy:**
   ```text
   1. pg_advisory_xact_lock(-participant_user_id)   [F-03 registration write only]
   2. SELECT ... FROM workshops WHERE id = $1 FOR UPDATE   [F-03, F-05, F-06, F-07, F-08]
   3. SELECT ... FROM registrations WHERE ... FOR UPDATE   [F-05, F-08]
   ```
   Because no other transaction acquires the per-Participant advisory lock after holding a `workshops` or `registrations` lock, a lock-wait cycle is impossible.
4. **No schema migration required:** Reuses existing `workshops(starts_at, ends_at)` and `registrations(participant_user_id, workshop_id, status)` columns and existing `registrations_participant_idx` index from migrations `002`/`004`.

### 2.5 Historical Data, Cross-Feature `F-07` Protection & Deferred Scope

- **Historical data:** Existing persisted `ACTIVE` registrations (if any pre-date this deployment) are never retroactively deleted or mutated; `BR-05b` governs all new registrations (`POST /api/v1/workshops/:id/registrations`) once deployed.
- **`F-07` (`BR-16` / `DEC-07`) protection:** `PATCH /api/v1/organizer/workshops/:id` already enforces `409 SCHEDULE_LOCKED` whenever `active_count > 0` (or the workshop has started), preventing an Organizer from retroactively moving a workshop with active registrants into a time conflict. `L7-02` must keep `F-07` schedule-lock tests green as part of mandatory regression.
- **Explicitly deferred follow-up (Technical Debt tracked in Lab 7 Part D):** Adding browse-list conflict badges and server-derived `already_registered` flags to `GET /api/v1/workshops` / `GET /api/v1/workshops/:id` is intentionally excluded from Lab 7 so the maintenance slice stays tightly bounded and does not alter `GET` DTO schemas.

## 3. Alternatives Considered

1. **`SELECT id FROM users WHERE id = $1 FOR UPDATE`:** Rejected because row locking on `users` requires `UPDATE` table privilege on `public.users` and creates unnecessary contention with auth/session queries; `pg_advisory_xact_lock(-($1::bigint))` avoids both while guaranteeing identical per-Participant serialization.
2. **PostgreSQL `EXCLUDE USING gist` constraint across tables:** Rejected because PostgreSQL exclusion constraints cannot join `registrations` with `workshops(starts_at, ends_at)` without denormalizing workshop times into `registrations` and adding risky triggers/migrations.
3. **Two-argument `pg_advisory_xact_lock(int4, int4)`:** Rejected because `users.id` is `BIGINT` (`int8`), which would risk truncation/overflow if cast to `int4`.

## 4. Consequences & Review Gate

- **Zero DB migrations** (`db/migrations/` remains `001`–`005`); safe for Cloud Run / Cloud SQL deployment in `L7-03` (#84).
- **Pre-implementation gate:** Requires independent six-axis review, `Formal APPROVE`, and merge of [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85) into `sprint_2_staging` by `cottonlnwza` **before** any test or code commit in [Issue #83 (`L7-02`)](https://github.com/cottonlnwza/TTworkshop/issues/83).
- **Status:** `PROPOSED / PENDING INDEPENDENT PEER REVIEW` under `L7-01` (#85); `AC-F03-14`–`17` / `STS-F03-14`–`17` are **`PLANNED / NOT EXECUTED`**.
