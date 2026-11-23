# F-06 — Registration Deadline Management and Manual Closure/Reopen

> **F-06 contract v0.2.0 — IMPLEMENTED ON PR BRANCH (`9/9` `F-06` STS + SHARED `STS-F05-06` AUTHOR-LOCAL PASS; PENDING INDEPENDENT REVIEW & STAGING MERGE) — 2026-11-23** · Contracts [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) (merged [PR #74](https://github.com/cottonlnwza/TTworkshop/pull/74)) · Implementation [Issue #68 (`P2-04`)](https://github.com/cottonlnwza/TTworkshop/issues/68) · Evidence [`docs/evidence/p2-04-f06.md`](../evidence/p2-04-f06.md) · Sprint 2 (`Period 2`)
> Source: `docs/srs.md` FR-11, BR-01, BR-07, BR-08, BR-10, BR-11, NFR-01, NFR-02; `docs/features.md` F-06; `docs/system-sds.md` §§3–6; accepted staging scoped policy [`DEC-05`](../decisions/dec-05-manual-closure.md) and [`DEC-04`](../decisions/dec-04-workshop-time.md). Author-local implementation commit `22cf03218343943fec5bdcff4ce9e56dc4e355da` passes 9/9 `F-06` STS + shared `BR-10` `STS-F05-06` (`12/12` F-06 tests; `160/160` full suite). Independent review, staging merge, and `main` release remain pending.

## 1. Purpose, dependencies, and boundaries

An authenticated owning `ORGANIZER` can control registration availability for their own `PUBLISHED` workshop by (1) manually closing new registrations, (2) manually reopening registrations while still before the effective deadline, and (3) updating the workshop's `registration_deadline` subject to `BR-08` (`deadline <= starts_at`). Manual closure follows **Closure A** (`DEC-05` / `BR-10`): it blocks new registrations without blocking timely cancellation of already-`ACTIVE` registrations, and cancellation never automatically reopens registration.

**Depends on (non-circular sequence — PR #74 `R-02`):**
- Accepted Sprint 1 slices: `F-01` session/role auth, `F-02` workshop ownership & `DRAFT`/`PUBLISHED` lifecycle, `F-03` registration eligibility & `FOR UPDATE` transaction, `DEC-04` explicit-offset ISO 8601 timestamp rules.
- Independent peer review (`Formal APPROVE`) and staging merge of [Issue #66 (`P2-C1`)](https://github.com/cottonlnwza/TTworkshop/issues/66) including [`DEC-05`](../decisions/dec-05-manual-closure.md).
- **Mandatory staging merge dependency for final `F-06` PR review/CI:** [Issue #67 (`F-05` Stage A core PR)](https://github.com/cottonlnwza/TTworkshop/issues/67) must be merged into `sprint_2_staging` before `F-06` ([Issue #68](https://github.com/cottonlnwza/TTworkshop/issues/68)) enters final PR review so that `POST /api/v1/me/registrations/:id/cancel` exists on `sprint_2_staging` when `STS-F06-03` and the deferred cross-feature `STS-F05-06` execute. (`cottonlnwza` may prepare migration `005` and `F-06` core implementation locally in parallel, then rebase onto `sprint_2_staging` after `#67` merges to execute the complete 9/9 `F-06` + `STS-F05-06` suite.)

**Exclusions (out of `F-06` scope):**
- Participant self-cancellation & re-registration workflows belong to `F-05` ([Issue #67](https://github.com/cottonlnwza/TTworkshop/issues/67)).
- General published workshop metadata, schedule (`starts_at`/`ends_at`), and capacity editing belong to `F-07` ([Issue #69](https://github.com/cottonlnwza/TTworkshop/issues/69)).
- Automatic scheduled cron closure jobs are excluded (`docs/system-sds.md` §2: elapsed deadline is evaluated dynamically at request time).
- Production GCP Cloud SQL deployment is separate from this staging feature PR (handled under release gates `P2-REL-S2` / `P2-D2`).

## 2. Feature SDS — workflow, transitions, and invariants

1. **Manual Close (`POST /api/v1/organizer/workshops/:id/close-registration`):**
   - Authenticate `ORGANIZER` (`401`/`403`) + same-origin `Origin` (`403 FORBIDDEN_ORIGIN`) + validate numeric `:id` (`404`).
   - Transactionally lock the owned workshop row (`SELECT ... FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`).
   - If missing or foreign owner → `404 NOT_FOUND`.
   - If `status !== 'PUBLISHED'` → `409 INVALID_STATE` (cannot close a `DRAFT`).
   - If `registration_closed === true` → `409 INVALID_STATE` (`"Registration is already closed"`).
   - Update `registration_closed = true, updated_at = now()`, commit, return `200 { data: Workshop }`.
2. **Manual Reopen (`POST /api/v1/organizer/workshops/:id/reopen-registration`):**
   - Same auth, origin, ownership (`404`), and `FOR UPDATE` lock.
   - If `status !== 'PUBLISHED'` → `409 INVALID_STATE`.
   - If `registration_closed === false` → `409 INVALID_STATE` (`"Registration is already open"`).
   - Fail closed on malformed persisted deadline (`starts_at IS NULL` or `registration_deadline > starts_at`) → `409 INVALID_DEADLINE`.
   - Enforce **`BR-11`**: compute `effective_deadline = COALESCE(registration_deadline, starts_at)`. If `now() >= effective_deadline`, rollback and return **`409 DEADLINE_PASSED`** (`registration_closed` remains `true`).
   - Otherwise update `registration_closed = false, updated_at = now()`, commit, return `200 { data: Workshop }`.
3. **Update Published Registration Deadline (`PATCH /api/v1/organizer/workshops/:id/registration-deadline`):**
   - Same auth, origin, ownership (`404`), and `FOR UPDATE` lock.
   - If `status !== 'PUBLISHED'` → `409 INVALID_STATE` (DRAFT deadlines continue to be edited via F-02 `PATCH /organizer/workshops/:id`).
   - If `now() >= ends_at` → `409 WORKSHOP_ENDED` (preserve ended-workshop history).
   - Require explicit `registration_deadline` property in body: either `null` (reset to default = `starts_at`) or valid explicit-offset ISO 8601 timestamp (`DEC-04`, else `400 VALIDATION`).
   - Enforce **`BR-08`**: if non-null and `registration_deadline > starts_at`, return `400 VALIDATION` (`"Registration deadline cannot be later than start time"`).
   - Persist `registration_deadline` and `updated_at = now()` without mutating `registration_closed`.
4. **Registration & Discovery Enforcement (`F-03` integration):**
   - `GET /api/v1/workshops` and `GET /api/v1/workshops/:id` include `registration_closed: boolean` and evaluate `registration_open` as `false` whenever `w.registration_closed = true` (as well as when full, malformed deadline, or `now >= effective_deadline`).
   - `POST /api/v1/workshops/:id/registrations` selects `registration_closed` inside its `FOR UPDATE` query and rejects `row.registration_closed === true` with **`409 REGISTRATION_CLOSED`** (`{"error":{"code":"REGISTRATION_CLOSED","message":"Workshop registration is closed"}}`), preserving existing check order (`NOT_FOUND` → `REGISTRATION_CLOSED` / `INVALID_DEADLINE` / `DEADLINE_PASSED` → `CAPACITY_FULL` → `DUPLICATE_ACTIVE`).
   - Injectable `now: () => Date` must be passed into `createWorkshopRouter` (matching `createRegistrationRouter`) so deadline boundaries (`BR-11`, `WORKSHOP_ENDED`) are deterministically testable.

## 3. UI contract (planned)

| Screen / route | Expected behavior |
|---|---|
| Organizer `My Workshops` & Published detail view (`OrganizerApp.tsx`) | For each owned `PUBLISHED` workshop, displays registration control state (`Open` vs `Manually Closed`), current `registration_deadline` (or `"Default (start time)"`), a **`Close registration`** button when open, a **`Reopen registration`** button when manually closed, and a deadline update form (using configured `VITE_UNIVERSITY_TIMEZONE`). Pending disables repeat clicks; `409 DEADLINE_PASSED` and `400 VALIDATION` render clear `role="alert"` messages. |
| Participant discovery & detail (`ParticipantApp.tsx`) | When `registration_closed === true`, displays **`Registration: Closed`** (distinct from `Full`) and disables `Register for workshop`; direct API attempts still fail closed with `409 REGISTRATION_CLOSED`. |

## 4. API contract (planned)

Base `/api/v1`. Success envelope `{"data": ...}`; failure envelope `{"error": {"code": "...", "message": "..."}}`.

| Method / path | Auth & request | Expected success | Negative / boundary responses |
|---|---|---|---|
| `POST /organizer/workshops/:id/close-registration` | Authenticated `ORGANIZER` + same-origin `Origin`; empty body `{}` | `200` `{"data": { ..., "status": "PUBLISHED", "registration_closed": true, "updated_at": "<ISO>" }}` | `401 UNAUTHENTICATED`; `403 FORBIDDEN` (Participant); `403 FORBIDDEN_ORIGIN`; `404 NOT_FOUND` (foreign/missing/invalid ID); `409 INVALID_STATE` (`DRAFT` or already closed) |
| `POST /organizer/workshops/:id/reopen-registration` | Authenticated `ORGANIZER` + same-origin `Origin`; empty body `{}` | `200` `{"data": { ..., "status": "PUBLISHED", "registration_closed": false, "updated_at": "<ISO>" }}` | `401`; `403`; `404`; `409 INVALID_STATE` (`DRAFT` or already open); `409 DEADLINE_PASSED` (`now >= effective_deadline`, `BR-11`); `409 INVALID_DEADLINE` (malformed persisted deadline) |
| `PATCH /organizer/workshops/:id/registration-deadline` | Authenticated `ORGANIZER` + same-origin `Origin`; JSON `{"registration_deadline": "<ISO-with-offset>" \| null}` | `200` `{"data": { ..., "registration_deadline": "<ISO>" \| null, "registration_closed": <unchanged>, "updated_at": "<ISO>" }}` | `400 VALIDATION` (missing key, naive/invalid timestamp, or `deadline > starts_at`); `401`; `403`; `404`; `409 INVALID_STATE` (`DRAFT`); `409 WORKSHOP_ENDED` (`now >= ends_at`) |
| `GET /organizer/workshops` & `GET /organizer/workshops/:id` *(updated)* | Authenticated `ORGANIZER` | `200` existing workshop DTO + `"registration_closed": boolean` | Unchanged from F-02 (`401`, `403`, `404`) |
| `GET /workshops` & `GET /workshops/:id` *(updated)* | Authenticated `PARTICIPANT` | `200` existing published DTO + `"registration_closed": boolean` with `registration_open = false` when `registration_closed = true` | Unchanged from F-03 (`401`, `403`, `404`) |
| `POST /workshops/:id/registrations` *(updated)* | Authenticated `PARTICIPANT` + same-origin `Origin` | Unchanged `201` when open & eligible | Adds `409 REGISTRATION_CLOSED` when `registration_closed = true`; existing `409` codes unchanged |

## 5. Data contract and schema migration

- **New Versioned SQL Migration REQUIRED:** `db/migrations/005_workshop_manual_closure.sql`
  ```sql
  -- P2-04 F-06 manual registration closure flag on workshops.
  ALTER TABLE workshops
    ADD COLUMN registration_closed BOOLEAN NOT NULL DEFAULT false;
  ```
- **Production & Cloud SQL compatibility:**
  - `api/migrate.ts` discovers `005_workshop_manual_closure.sql` automatically via `/^\d+_.*\.sql$/`.
  - `api/runtime-schema.ts` (`verifyProductionSchema`) continues to fail closed in production unless `ttworkshop-migrate` Job has applied `005_workshop_manual_closure.sql` to `schema_migrations`.
  - Because `ALTER TABLE workshops ADD COLUMN` modifies an existing table owned by the migration role, existing least-privilege `ttworkshop_runtime` table grants (`SELECT/INSERT/UPDATE` on `workshops`) require **zero new table/sequence IAM or DB privilege changes**.
  - Existing `runtime-schema.unit.test.ts` / `runtime-schema.integration.test.ts` and `migration-runner.unit.test.ts` must continue passing cleanly with 5 ordered migrations (`001`–`005`).

## 6. Observable Acceptance Criteria (AC)

| AC ID | Observable outcome & linked requirements |
|---|---|
| **AC-F06-01** | Versioned migration `005_workshop_manual_closure.sql` adds `workshops.registration_closed BOOLEAN NOT NULL DEFAULT false` idempotently; existing rows default to `false` and `verifyProductionSchema` accepts the 5-migration schema while failing closed if `005` is missing (`NFR-02`, `SYS-01`). |
| **AC-F06-02** | Owning Organizer manually closes a `PUBLISHED` workshop; `registration_closed = true` persists, Participant discovery reports `registration_closed: true` and `registration_open: false`, and new Participant registration attempts fail with `409 REGISTRATION_CLOSED` (`FR-11`, `BR-10`). |
| **AC-F06-03** | Manual closure (`registration_closed = true`) does **not** block an already-`ACTIVE` Participant from cancelling before the cancellation deadline, and cancellation does **not** automatically reopen registration (`registration_closed` remains `true`) (`BR-10`, `DEC-05`). |
| **AC-F06-04** | Owning Organizer manually reopens a closed `PUBLISHED` workshop while `now < effective_deadline`; `registration_closed = false` persists, discovery returns `registration_open: true` (when seats remain), and new eligible Participant registration succeeds (`201`) (`FR-11`, `BR-11`). |
| **AC-F06-05** | Attempting to manually reopen a closed `PUBLISHED` workshop at exact effective deadline (`now === effective_deadline`) or after (`now > effective_deadline`) fails with `409 DEADLINE_PASSED` and leaves `registration_closed = true` (`BR-11`, `DEC-05`, `DEC-04`). |
| **AC-F06-06** | Owning Organizer updates `registration_deadline` on an owned `PUBLISHED` workshop to a valid explicit-offset timestamp `<= starts_at` or `null` (default to `starts_at`); effective registration eligibility updates accordingly without silently changing `registration_closed` (`FR-11`, `BR-07`, `BR-08`). |
| **AC-F06-07** | Updating `registration_deadline` with `deadline > starts_at`, timezone-naive ISO string, malformed/missing key, or after workshop end (`now >= ends_at`) is rejected (`400 VALIDATION` / `409 WORKSHOP_ENDED`) without mutating DB (`BR-08`, `DEC-04`). |
| **AC-F06-08** | Authorization, CSRF & state guards: anonymous (`401`), Participant (`403`), foreign Organizer (`404`), missing/foreign `Origin` (`403 FORBIDDEN_ORIGIN`), closing/reopening/updating deadline on a `DRAFT` (`409 INVALID_STATE`), closing when already closed (`409 INVALID_STATE`), and reopening when already open (`409 INVALID_STATE`) fail without mutating DB (`BR-01`, `NFR-01`). |
| **AC-F06-09** | Manual closure state and updated deadline survive an API process restart against PostgreSQL (`NFR-02`), and the Organizer/Participant UI accurately demonstrates close → Participant sees `Closed` → reopen → Participant registers (`FR-11`). |

## 7. Software Test Specification (STS) — EXECUTED LOCALLY ON `22cf0321` (9/9 + `STS-F05-06` PASS)

| Test ID | AC | Level | Preconditions & inputs → action → expected outcome |
|---|---|---|---|
| **STS-F06-01** | AC-F06-01 | Unit + DB migration | Apply migrations `001`–`005` twice on isolated `ttworkshop_test` → idempotent pass, existing workshop defaults `registration_closed=false`; `verifyProductionSchema` passes with `001`–`005` and rejects missing `005`. |
| **STS-F06-02** | AC-F06-02 | API+DB | Seed `PUBLISHED` workshop owned by Organizer A → `POST /organizer/workshops/:id/close-registration` → `200`, `registration_closed=true`; Participant `GET /workshops/:id` shows `registration_closed=true, registration_open=false`; `POST /workshops/:id/registrations` returns `409 REGISTRATION_CLOSED`, zero rows added. |
| **STS-F06-03** | AC-F06-03 *(also satisfies deferred `STS-F05-06`)* | API+DB cross-feature *(requires `#67` F-05 merged on `sprint_2_staging`)* | Seed `PUBLISHED` workshop with Participant A `ACTIVE`, then Organizer A manually closes registration → Participant A calls `POST /me/registrations/:id/cancel` (`F-05`) before deadline → `200 CANCELLED` with `cancelled_at` persisted, `workshops.registration_closed` remains `true` (no auto-reopen), and both Participant A re-registration and Participant B new registration return `409 REGISTRATION_CLOSED`. |
| **STS-F06-04** | AC-F06-04 | API+DB | Closed `PUBLISHED` workshop with `now < effective_deadline` and free seats → Organizer A `POST /organizer/workshops/:id/reopen-registration` → `200`, `registration_closed=false`; Participant `POST /workshops/:id/registrations` returns `201 ACTIVE`. |
| **STS-F06-05** | AC-F06-05 | API+DB boundary | Closed `PUBLISHED` workshop with injectable `now` at `effective_deadline` (both explicit deadline and null fallback `starts_at`) and `effective_deadline + 1s` → `POST /organizer/workshops/:id/reopen-registration` → `409 DEADLINE_PASSED`, DB remains `registration_closed=true`. |
| **STS-F06-06** | AC-F06-06 | API+DB | `PUBLISHED` workshop → `PATCH /organizer/workshops/:id/registration-deadline` moving deadline earlier (into past) → `200`, Participant registration now returns `409 DEADLINE_PASSED`; update deadline to `null` (future `starts_at`) → `200`, registration succeeds (`201`); `registration_closed` untouched throughout. |
| **STS-F06-07** | AC-F06-07 | API+DB negative | Submit `deadline > starts_at` (`400 VALIDATION`), timezone-naive `"2026-12-01T10:00:00"` (`400 VALIDATION`), empty `{}` body (`400 VALIDATION`), and valid deadline when `now >= ends_at` (`409 WORKSHOP_ENDED`) → DB `registration_deadline` unchanged. |
| **STS-F06-08** | AC-F06-08 | API+DB security | Test anonymous (`401`), Participant (`403`), Organizer B targeting Organizer A's workshop (`404`), foreign `Origin` (`403`), `DRAFT` workshop (`409 INVALID_STATE`), double close (`409 INVALID_STATE`), and reopen-while-open (`409 INVALID_STATE`) across all three F-06 endpoints → zero DB mutations. |
| **STS-F06-09** | AC-F06-09 | Process restart + UI/Chromium E2E | Close workshop and update deadline → restart API process → verify persisted `registration_closed=true` and deadline; run real browser journey where Organizer closes workshop → Participant observes `Registration: Closed` and disabled button → Organizer reopens → Participant registers cleanly. |

**Actual TDD evidence (Issue #68, Author-local — see [`docs/evidence/p2-04-f06.md`](../evidence/p2-04-f06.md)):**
- **RED (`192a636539fc2dfffa716e57cc01e6d0c285a718`):** `vitest run tests/f06.integration.test.ts tests/f06.ui.test.tsx` → **10 failed | 1 passed (11)** (`005_workshop_manual_closure.sql` absent; endpoints `404`; Organizer UI controls missing).
- **GREEN (`22cf03218343943fec5bdcff4ce9e56dc4e355da`):** Targeted `F-06` (`12/12`) + `runtime-schema` (`9/9`) = **21/21 PASS**; `npm run build` PASS (372ms); Python `unittest` **41/41** PASS; full `npm test` **26/26 files, 160/160 tests PASS** (106.60s).

## 8. Feature Definition of Done — PR CANDIDATE (PENDING HOSTED CI, REVIEW & STAGING MERGE)

- [x] Pre-implementation contract and `DEC-05` independently reviewed (`Formal APPROVE`) and merged to `sprint_2_staging` via [Issue #66](https://github.com/cottonlnwza/TTworkshop/issues/66) / [PR #74](https://github.com/cottonlnwza/TTworkshop/pull/74) (`292e4b59`).
- [x] **Upstream staging prerequisite (`R-02`):** [Issue #67 (`F-05` Stage A core PR #75)](https://github.com/cottonlnwza/TTworkshop/pull/75) merged into `sprint_2_staging@aa612d53` before `#68` branched and implemented.
- [x] TDD **RED → GREEN** evidence recorded on exact commits (`192a636` → `22cf0321`) in [Issue #68](https://github.com/cottonlnwza/TTworkshop/issues/68) and [`docs/evidence/p2-04-f06.md`](../evidence/p2-04-f06.md).
- [x] Migration `005_workshop_manual_closure.sql`, all 9 `F-06` criteria (`AC-F06-01`–`AC-F06-09` ↔ `STS-F06-01`–`STS-F06-09`), **and** the shared `BR-10` cross-feature check (`STS-F06-03` / deferred `STS-F05-06`) pass Author-locally against isolated loopback PostgreSQL (`ttworkshop_test`, `ttworkshop_seed_test`) and headless Chromium.
- [ ] Full automated regression (`npm run build`, `npm test`, Python `unittest`, **hosted CI `build-test`**) passes on PR HEAD (Author-local 160/160 + 41/41 PASS on `22cf0321`; hosted CI pending PR push).
- [ ] Evidence ledger (`docs/evidence/p2-04-f06.md`), contract execution record, and `docs/traceability.md` updated; independent Reviewer (`cottonlnwza`, updated per team 6-vs-2 assignment on `#68`) Formal `APPROVE`, teammate merge to `sprint_2_staging`, and Author post-merge verification complete (unlocking Stage B closure of Issue #67 once `thananun-7203` verifies `STS-F05-06` on the merged `sprint_2_staging` SHA).

**Change record:**
- `v0.1` (2026-11-23, [Issue #66](https://github.com/cottonlnwza/TTworkshop/issues/66)): Initial pre-implementation Sprint 2 contract authored by `thananun-7203` for planned implementation by `cottonlnwza` (`Issue #68`); `PENDING INDEPENDENT PEER REVIEW` by `cottonlnwza`. Zero code, migrations, or tests executed.
- `v0.1.1` (2026-11-23, [PR #74](https://github.com/cottonlnwza/TTworkshop/pull/74) Round 1 Reviewer `R-02` remediation): Made `#67` (`F-05` Stage A staging merge) an explicit upstream prerequisite for `#68` final PR review/CI, aligned `STS-F06-03` to also execute and satisfy deferred `STS-F05-06` (`BR-10`), and documented how `#68` staging merge unlocks `#67` Stage B closure. Independently approved and merged at `sprint_2_staging@292e4b59`.
- `v0.2.0` (2026-11-23, [Issue #68](https://github.com/cottonlnwza/TTworkshop/issues/68)): Reconciled Author (`thananun-7203`) / Independent Reviewer (`cottonlnwza`) per team 6-vs-2 assignment on Issue #68; recorded migration `005_workshop_manual_closure.sql`, TDD RED (`192a636`) → GREEN (`22cf0321`), 9/9 `F-06` STS + shared `STS-F05-06` Author-local PASS (`12/12` F-06 tests; `160/160` full suite). Hosted CI on PR HEAD, independent review, and staging merge remain pending.
