# CPE334 Lab 7 — Part B: TDD RED→GREEN Implementation & Regression Evidence (`L7-02`)

> **Status:** `STAGING PR CANDIDATE — AUTHOR-LOCAL PASS; HOSTED PR CI, INDEPENDENT REVIEW & STAGING MERGE PENDING` — **2026-11-25 (Asia/Bangkok)**
> **Tracking:** [Issue #83 (`L7-02`)](https://github.com/cottonlnwza/TTworkshop/issues/83) · Preceded by accepted Part A contract [Issue #85 (`L7-01`)](https://github.com/cottonlnwza/TTworkshop/issues/85) / [PR #86](https://github.com/cottonlnwza/TTworkshop/pull/86) merged at `sprint_2_staging@421705d3f0c8d7c4f489b573f8471621c2035098`
> **Author:** `thananun-7203` (ComTon) · **Independent Reviewer & Staging Merger:** `cottonlnwza` (ComGu) · **Branch:** `feat/issue83-l7-02-schedule-conflict`

---

## 1. Exact Commit Sequence (Traceable Pre-Change → RED → GREEN → Regression Alignment)

| Stage | Commit SHA | Files Touched | Purpose & Observed Result |
|---|---|---|---|
| **Accepted Sprint 1 Baseline (Lab 6)** | `4efbcfac51872b3b78542c35cc01c24182` | *(historical main)* | Lab 6 accepted Sprint 1 release (`ttworkshop-00017-poy`, original D1 `3f5ec15a`) |
| **Deliverable 2 `main` Anchor** | `b111ffcd114f03effd2175991b23d4f702362c3f` | *(historical main)* | Intervening Sprint 2 (`F-05`–`F-07`) & Sprint 3 (`F-08`), Cloud Run `ttworkshop-00019-nul` (`sha256:7f0ee3e4...`) |
| **Pre-Change Baseline (`L7-01` merge)** | `421705d3f0c8d7c4f489b573f8471621c2035098` | 8 docs files only | `PR #86` (`65a5965c`) Formal APPROVE + staging merge; post-merge CI Run `#45445346823` PASS; zero app/test/migration edits |
| **Commit 1 — `RED` (Tests ONLY)** | `70f67afe22f93617a8367505793ec23da7f26e1a` | `tests/f03.integration.test.ts`, `tests/f03.ui.test.tsx`, `tests/f03.browser.test.ts`, `tests/runtime-db-privileges.integration.test.ts` | `npm run build` PASS (0 TS errors); targeted run on pre-change code: **2 failed \| 2 passed (4 files), 3 failed \| 26 passed (29 tests)** (`STS-F03-14`, `STS-F03-16`, `STS-F03-17` Chrome E2E failed due to missing `BR-05b`) |
| **Commit 2 — `GREEN` (Code ONLY)** | `24dfdfdd76779ba3b851f274598e6500cc1b8c7b` | `api/registrations.ts`, `web/ParticipantApp.tsx` | Zero test edits; `npm run build` PASS; targeted run: **4/4 files, 29/29 tests PASS (0 failed, 0 skipped)**; full suite exposed 1 legitimate fixture overlap in `STS-F07-04` (`31 passed \| 1 failed (32)`, `194 passed \| 1 failed (195)`) |
| **Commit 3 — Regression Fixture Alignment** | `0389eee736cc52709c3f3689296555cdf6e5f0f2` | `tests/f07.integration.test.ts` | Assigned distinct non-overlapping daily slots across the 5 rounds of `STS-F07-04` (preserving 100% of original assertions); full regression: **`npm run build` PASS**, **`npm test` 32/32 files, 195/195 tests PASS**, **`python -m unittest` 41/41 PASS** |
| **Commit 4 — Part B Evidence & Docs** | *(HEAD of `L7-02` PR)* | `docs/labs/lab-07/implementation-and-regression.md`, `docs/contracts/f-03-discovery-registration.md`, `docs/decisions/dec-14-schedule-conflict.md`, `docs/traceability.md` | Records exact SHAs, outputs, diff summary, and Author-local vs pending hosted CI/review provenance |

---

## 2. Step 1 — TDD `RED` Evidence on Pre-Change Code (`70f67afe22f93617a8367505793ec23da7f26e1a`)

- **Command:**
  ```bash
  node --env-file-if-exists=.env ./node_modules/vitest/vitest.mjs run \
    tests/f03.integration.test.ts tests/f03.ui.test.tsx \
    tests/f03.browser.test.ts tests/runtime-db-privileges.integration.test.ts
  ```
- **Environment:** Author-local (ComTon, Windows, Node `v24.14.0`, Vitest `4.1.12`, isolated loopback PostgreSQL `ttworkshop_test` & `ttworkshop_seed_test`, headless Chromium).
- **Pre-compile verification:** `npm run build` (`tsc --noEmit && vite build`) **PASS** (`0` TypeScript errors) — confirming zero compile/fixture syntax errors.
- **Actual Observed RED Result:**
  - `Test Files  2 failed | 2 passed (4)`
  - `Tests       3 failed | 26 passed (29)` (duration `61.36s`)
- **Genuine Missing-Behavior Failures:**
  1. `tests/f03.integration.test.ts` — **`STS-F03-14`** (`BR-05b` overlap rejection):
     `AssertionError: expected 201 to be 409 // Object.is equality` (pre-change `api/registrations.ts` accepted an overlapping workshop registration with `201` instead of `409 SCHEDULE_CONFLICT`).
  2. `tests/f03.integration.test.ts` — **`STS-F03-16`** (concurrent dual-workshop race by same Participant):
     `AssertionError: expected [ 201, 201 ] to deeply equal [ 201, 409 ]` (pre-change code committed both overlapping registrations simultaneously).
  3. `tests/f03.browser.test.ts` — **`STS-F03-17`** (real Chrome E2E detail-view conflict alert):
     `TimeoutError: locator.waitFor: Timeout 30000ms exceeded. waiting for getByRole('alert').getByText(/conflicts with an existing active workshop schedule/i) to be visible` (pre-change backend returned `201` instead of `409 SCHEDULE_CONFLICT`).
- **Baseline Continuity Passes Recorded at RED (Expected per `L7-01`):**
  - `STS-F03-01`–`13` (all existing Sprint 1 F-03 cases): **PASS**
  - `STS-F03-15` (isolated Fixture (a) two-direction back-to-back `ends_at = starts_at` + Fixture (b) `F-05` sole-overlap cancellation): **PASS** (confirms existing non-conflicting registration and cancellation continuity)
  - `STS-F03-17` UI unit (`tests/f03.ui.test.tsx`, mocked `409 SCHEDULE_CONFLICT` response): **PASS**
  - `tests/runtime-db-privileges.integration.test.ts` (`3/3` including `DEC-14 / R-03` negative-`BIGINT` advisory lock under role lacking `public.users` `UPDATE` privilege, contrasted with `SELECT ... FROM public.users FOR UPDATE` failing with PostgreSQL `42501`): **PASS**

---

## 3. Step 2 — Bounded Implementation & TDD `GREEN` (`24dfdfdd76779ba3b851f274598e6500cc1b8c7b`)

### 3.1 Bounded Code Diff Summary (`2 files changed, 44 insertions(+), 6 deletions(-)`)

1. **`api/registrations.ts` (`POST /api/v1/workshops/:id/registrations`):**
   - Added `noStore` cache-control middleware on registration write responses.
   - Immediately after `BEGIN` and **before** `workshops FOR UPDATE`, acquired `SELECT pg_advisory_xact_lock(-($1::bigint))` using session-derived `BIGINT` `identity.id` (strictly negative `BIGINT` key space disjoint from migration lock `48033401` in `api/migrate.ts`, deadlock-free lock order `advisory_lock → workshops FOR UPDATE → registrations`, zero `public.users` `UPDATE` grant required).
   - Included `ends_at` in the locked `PUBLISHED` workshop query and retained defensive single-code `409 INVALID_DEADLINE` if `!row.starts_at || !row.ends_at || row.ends_at <= row.starts_at || registration_deadline > starts_at` (`R-02`).
   - Preserved deterministic error precedence: `404 NOT_FOUND` → `409 REGISTRATION_CLOSED` → `409 INVALID_DEADLINE` → `409 DEADLINE_PASSED` → `409 CAPACITY_FULL` → `409 DUPLICATE_ACTIVE` (explicit same-workshop `ACTIVE` check + `23505` fallback) → **`409 SCHEDULE_CONFLICT`** (`r.participant_user_id = $1 AND r.status = 'ACTIVE' AND r.workshop_id <> $2 AND w.starts_at < $4::timestamptz AND $3::timestamptz < w.ends_at`).
2. **`web/ParticipantApp.tsx`:**
   - Cleared stale `success` state in `viewDetails()` and `Back to workshops` so switching from a confirmed workshop to an overlapping workshop's detail view never displays a stale confirmation banner alongside a `409 SCHEDULE_CONFLICT` alert.
3. **Zero DB Migrations:** `db/migrations/` remains unchanged (`001`–`005`).

### 3.2 Targeted `GREEN` Verification on `24dfdfdd76779ba3b851f274598e6500cc1b8c7b`

- **Commands:** `npm run build` and the exact same 4-file Vitest command above (zero test modifications between RED and GREEN).
- **Result:**
  - `npm run build`: **PASS** (`0` TS errors, `20 modules transformed`, `374ms`)
  - Targeted Vitest: **`Test Files 4 passed (4)` | `Tests 29 passed (29)`** (`0 failed`, `0 skipped`, `30.29s`):
    - `tests/f03.integration.test.ts`: **17/17 PASS** (`STS-F03-01`–`16` + `AC-F03-02/05`)
    - `tests/f03.browser.test.ts`: **3/3 PASS** (`STS-F03-02/03`, `STS-F03-11`, `STS-F03-17` real Chrome E2E)
    - `tests/f03.ui.test.tsx`: **6/6 PASS** (including `STS-F03-17` detail alert & refresh)
    - `tests/runtime-db-privileges.integration.test.ts`: **3/3 PASS** (including `DEC-14 / R-03`)

---

## 4. Step 3 — Full Regression Discovery & Non-Weakening Fixture Alignment (`0389eee736cc52709c3f3689296555cdf6e5f0f2`)

### 4.1 Real Regression Finding on `24dfdfdd` (`STS-F07-04`)

Running the full 32-file Vitest suite (`npm test`) on `24dfdfdd` produced:
- `Test Files  1 failed | 31 passed (32)` | `Tests  1 failed | 194 passed (195)`
- **Failing test:** `tests/f07.integration.test.ts` — `STS-F07-04` (`AssertionError: expected 'SCHEDULE_CONFLICT' to be 'CAPACITY_FULL'`).
- **Root cause analysis:** `STS-F07-04` runs 5 synchronized rounds racing `PATCH capacity: 1` against `POST registration` for `participantB`, seeding a new workshop in every round with the **same default schedule** (`2026-12-15T10:00:00Z`–`12:00:00Z`). Once `participantB` won round `k`, round `k+1` attempted to register `participantB` into a **different workshop at the exact same overlapping time** while capacity was `2`, legitimately triggering `BR-05b` (`409 SCHEDULE_CONFLICT`) before capacity reached `1`.
- **Legitimate fixture alignment (Commit `0389eee7`):** Assigned distinct non-overlapping daily slots (`2026-12-${15 + round}T10:00:00Z`–`12:00:00Z`, deadline `2026-12-${14 + round}T18:00:00Z`) for each of the 5 rounds in `STS-F07-04`. **Zero assertions were weakened, disabled, or removed** (`patchWon !== regWon`, `CAPACITY_FULL` vs `CAPACITY_BELOW_ACTIVE`, and `active_count <= capacity` all remain strictly asserted).

### 4.2 Full Automated Regression Suite Results on `0389eee736cc52709c3f3689296555cdf6e5f0f2`

Executed by Author `thananun-7203` (ComTon, Windows, Node `v24.14.0`, Python `3.12.10`, Vitest `4.1.12`, isolated loopback PostgreSQL `ttworkshop_test` & `ttworkshop_seed_test`, headless Chromium):

| Suite / Command | Provenance | Exact Result | Key Coverage & Relevance |
|---|---|---|---|
| `npm run build` (`tsc --noEmit && vite build`) | Author-local (`0389eee7`) | **PASS** (`0` TS errors, `20` modules, `495ms`) | Type safety and production client bundle |
| `npm test` (full Vitest suite) | Author-local (`0389eee7`) | **PASS — 32/32 files, 195/195 tests passed, 0 failed, 0 skipped** (`147.25s`) | Full Sprint 1–3 regression across `F-01`–`F-08` (see domain breakdown below) |
| `python -m unittest discover -s tests -p "test_*.py" -v` | Author-local (`0389eee7`) | **PASS — 41/41 tests passed, 0 failed, 0 skipped** (`0.012s`) | `test_cloud_smoke.py` (7), `test_release_candidate.py` (21), `test_release_provenance.py` (13) |

### 4.3 Domain Regression Highlights (Selected Critical Dependent Suites inside `195/195`)

- **Sprint 1 `F-01` Auth & Security (`tests/auth.*`):** Integration `12/12`, UI `5/5`, Browser `6/6` (includes `DEF-TTW-TH038-01` NUL/control-char login validation & role/origin isolation).
- **Sprint 1 `F-02` Draft & Publish (`tests/workshop.integration.test.ts` + `seedIdempotency.test.ts`):** `22/22` + `1/1`.
- **Sprint 1 `F-03` Discovery, Registration & Lab 7 `BR-05b` (`tests/f03.*`):** Integration `17/17` (`STS-F03-01`–`16`), UI `6/6`, Browser `3/3` (includes `STS-F03-06` 10-way last-seat race, `STS-F03-14`–`17`).
- **Sprint 1 `F-04` Registration Views & Ownership (`tests/f04.*`):** Integration `8/8`, Pagination unit `14/14`, UI `11/11`, Browser `1/1` — confirms rejected schedule conflicts insert zero phantom rows and preserve pagination/privacy.
- **Sprint 2 `F-05` Cancellation & Re-registration (`tests/f05.*`):** Integration, UI `4/4`, Browser `1/1` + cross-feature `STS-F03-15` — confirms `CANCELLED` rows stay intact and release overlapping schedule slots.
- **Sprint 2 `F-06` Deadline & Manual Closure (`tests/f06.*`):** Integration `9/9`, UI `4/4`, Browser — confirms `409 REGISTRATION_CLOSED` precedence preserved before `BR-05b`.
- **Sprint 2 `F-07` Published Editing & Schedule Lock (`tests/f07.*`):** Integration `11/11` (including **`STS-F07-04`** aligned 5-round concurrency race and **`STS-F07-06` schedule lock** preventing Organizer time shifts while `active_count > 0`), UI `3/3`, Browser `1/1`.
- **Sprint 3 `F-08` Check-in (`tests/f08.*`):** Integration `8/8`, UI `3/3`, Browser `1/1` — confirms lock-order compatibility (`workshops → registrations`) with zero deadlocks.
- **Runtime Privileges & DB Guards (`tests/runtime-db-privileges.integration.test.ts`, `runtime-schema.*`, `migration-runner.*`, `testDatabase.guard.*`):** `3/3` (including `DEC-14 / R-03` role without `public.users` `UPDATE` grant), `3/3`, `6/6`, `2/2`, `3/3`.

---

## 5. Evidence Boundaries & Remaining Gates

- All test counts above are **Author-local** executions on `0389eee736cc52709c3f3689296555cdf6e5f0f2` (and `RED` `70f67afe` / `GREEN` `24dfdfdd`).
- **Pending gates before `L7-02` closure:**
  1. Exact-HEAD hosted PR CI (`build-test` in `.github/workflows/ci.yml`) on the `L7-02` PR HEAD.
  2. Independent six-axis review (`Formal APPROVE`) and staging merge into `sprint_2_staging` by `cottonlnwza` inspecting both `RED` (`70f67afe`) and `GREEN` (`24dfdfdd` + `0389eee7`) commits.
  3. Release PR to `main`, GCP Cloud Run deployment, post-deployment checks, Part C metrics, Part D readiness, and Lab 7 PDF assembly remain scoped to [Issue #84 (`L7-03`)](https://github.com/cottonlnwza/TTworkshop/issues/84).
