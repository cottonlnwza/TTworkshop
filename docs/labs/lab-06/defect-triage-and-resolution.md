# Lab 6 Parts B–D — Independent UAT Results, Defect Triage & TDD Resolution (`DEF-TTW-TH038-01`)

> **Status: STAGING PR CANDIDATE — PENDING INDEPENDENT REVIEW, `main` RELEASE, DEPLOYMENT & PARTNER RETEST (2026-11-22)**
> **Tracking Issue:** [Issue #63 (`L6-02 / Period 2`)](https://github.com/cottonlnwza/TTworkshop/issues/63)
> **Product Team (`TH-033_P3`):** Author `thananun-7203` (ComTon) · Independent Reviewer `cottonlnwza` (ComGu)
> **Independent UAT Partner (`TH-038`):** `chaproi` — [`https://github.com/chaproi/club-expense-approval`](https://github.com/chaproi/club-expense-approval)
> **Truthfulness & Boundary Notice:** This document records verified Part B reciprocal UAT outcomes, Part C defect triage of `DEF-TTW-TH038-01`, and Part D Author-local TDD **RED → GREEN** plus full regression evidence on branch `fix/issue63-l6-02-login-nul-validation`. It does **not** claim teammate PR approval, `sprint_2_staging` merge, reviewed `main` release, Cloud Run deployment of the fix, or TH-038's independent retest and final Sprint 1 acceptance decision. Zero passwords, cookies, session tokens, or secrets are committed.

---

## 1. Part B — Reciprocal Independent UAT Execution Summary

### 1.1 Partner Team (`TH-038`) Independent UAT of `TTworkshop` (`RUN: TH038-20261122-01`)

- **Live Target URL:** [`https://ttworkshop-xue6vtucgq-as.a.run.app`](https://ttworkshop-xue6vtucgq-as.a.run.app)
- **Confirmed Serving Baseline During Execution:**
  - Application Commit: `main@454596917d421ad4299be4fc346bde38fe0d6842` (zero application code changes vs `13ee9a19350dd06e614d3dc196d880c5275b489b`; deployed by [Run #44931017791](https://github.com/cottonlnwza/TTworkshop/actions/runs/44931017791) on `2026-11-22 00:36:56–00:41:35 Asia/Bangkok`, >12 hours before UAT began)
  - Before-Restart Revision: `ttworkshop-00013-doh` (`100%` traffic)
  - Post-Restart Revision (`UAT-S1-06B`): `ttworkshop-uat06b-20261122134604` (same-digest redeploy executed by project owner `cottonlnwza` via Cloud Shell on `2026-11-22 20:46:04–20:46:34 Asia/Bangkok`, `RUNTIME_CONFIG_MATCH=true`, `/health` HTTP `200`, `Ready`/`Active`/`ContainerHealthy = True`)
  - Immutable Image Digest (Before & After): `sha256:4475102ac594d83e513835964dc2bdab460c4296bc270b12c5d414b8d70d559d`
- **Observed Results:**
  - Scripted & agreed partner-added cases (`UAT-S1-01` through `UAT-S1-05`, `UAT-S1-02C` concurrent final seat, invalid capacity, `UAT-S1-03E` default deadline, `next_cursor` pagination + `limit=0/51` `400 INVALID_PAGINATION`, `UAT-S1-06A` logout/re-login, and `UAT-S1-06B` post-restart readback matching 12/12 Organizer A endpoints at `21:07:53 +07` and 7/7 Participant A endpoints at `21:20:31 +07` with zero diffs): **PASS**
  - Additional exploratory case `EXP-AUTH-01` (`2026-11-22 21:49:22–21:51:51 Asia/Bangkok`): **FAIL** → reported genuine defect **`DEF-TTW-TH038-01`** (HTTP `500 INTERNAL` on `POST /api/v1/auth/login` with embedded NUL byte `\u0000` in `email`).

### 1.2 Product Team (`TH-033_P3`) Reciprocal Independent UAT & Retest of `TH-038` (*Club Expense Approval*)

- **Target:** [`https://s981b09c9-4d7hbszvwq-as.a.run.app`](https://s981b09c9-4d7hbszvwq-as.a.run.app) (baseline commit `1cc7df74c3f3240cff0c8a4d422f3f685a8acbce`, document SHA `402bf67ea94c840283241549b0284acc0248e858`, revisions `s981b09c9-00005-9sk` & post-restart `s981b09c9-uat08b-20261122064113`)
- **Initial Execution (`2026-11-22 04:17–04:45` & `14:18–14:50 Asia/Bangkok`):**
  - Scripted UAT (`UAT-01`–`UAT-09`, including `UAT-08B` post-restart readback on record `3281e269-eb08-480c-bfda-0c8ef54e7783`): **18/18 sub-cases PASS** (Lab 5 baseline record `96da5843-9984-4a30-a6f2-883e19243420` untouched).
  - Exploratory testing (25+ probes outside supplied script) discovered **2 Medium defects** (`DEF-TH038-01`: `POST /api/auth/login` HTTP `500` on NUL/unpaired surrogate email; `DEF-TH038-02`: official Cloud Run Service URL `403 FORBIDDEN_ORIGIN` blocking login) and **2 Low non-blocking observations** (`OBS-TH038-01`, `OBS-TH038-02`).
- **Independent Retest & Final Acceptance (`2026-11-22 21:18–21:19 Asia/Bangkok`):**
  - Retested TH-038's corrected release (`main@43aa8d7472aa8852654d0d634d7239c3765c5869`, revision `s981b09c9-00007-9wq`, [Deploy Run #45027407173](https://github.com/chaproi/club-expense-approval/actions/runs/45027407173)): **`DEF-TH038-01` PASS** (both NUL & unpaired surrogate → `400 INVALID_INPUT`), **`DEF-TH038-02` PASS** (alias URL → HTTP `308` redirect to canonical URL + live browser R1 login `200`), and regression checks PASS.
  - Issued final decision **`Accepted with explicitly documented minor limitations`** (`OBS-TH038-01`, `OBS-TH038-02`).

---

## 2. Part C — Defect Triage (`DEF-TTW-TH038-01`)

| Finding ID / Issue | Linked Case & Contract `AC` | Classification | Contract & Evidence Rationale | Severity | Owner | Status |
|---|---|---|---|---|---|---|
| **`DEF-TTW-TH038-01`** / [Issue #63](https://github.com/cottonlnwza/TTworkshop/issues/63) | `EXP-AUTH-01` / `F-01`, `FR-01`, **`AC-F01-08`** (`STS-F01-08`) | **Accepted defect** *(genuine baseline defect; Special Exercise not required)* | Independently reproduced live on `ttworkshop-uat06b-20261122134604` (`main@45459691...`): `POST /api/v1/auth/login` with `{"email":"a\u0000b@example.test","password":"x"}` returned `HTTP 500 {"error":{"code":"INTERNAL","message":"Internal error"}}` instead of `HTTP 400 VALIDATION`. Root cause: `emailFrom()` in `api/app.ts` uses `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, allowing ASCII control chars (`\u0000`–`\u001F`, `\u007F`) and unpaired UTF-16 surrogates (`\uD800`–`\uDFFF`) to reach PostgreSQL UTF-8 query lookup. | **Medium** | `thananun-7203` (Author) / `cottonlnwza` (Reviewer) | Fixed on staging PR branch; pending PR review, `main` release, Cloud Run deploy & TH-038 independent retest |

---

## 3. Part D — TDD RED → GREEN Resolution & Full Regression Evidence

### 3.1 Step 1 — Automated Reproduction (`RED` on unfixed `api/app.ts`)

- **Test Added:** `tests/auth.integration.test.ts` — `"STS-F01-08 / DEF-TTW-TH038-01: NUL byte, ASCII control char, and unpaired surrogate in login email return 400 VALIDATION without issuing a session"`
- **Command:** `npm run test:api` (`node --env-file-if-exists=.env ./node_modules/vitest/vitest.mjs run tests/auth.integration.test.ts`) against isolated loopback PostgreSQL (`ttworkshop_test`)
- **Base Commit Before Fix:** `sprint_2_staging@50005a9f0940c5acc507f9809914bb031117c2d8`
- **Actual Observed RED Output:**
  - `Test Files 1 failed (1)` | `Tests 1 failed | 11 passed (12)`
  - `FAIL tests/auth.integration.test.ts > ... > STS-F01-08 / DEF-TTW-TH038-01`
  - `AssertionError: expected 500 to be 400 // Object.is equality` (`Expected: 400`, `Received: 500`)

### 3.2 Step 2 — Code Fix (`api/app.ts`)

Added Unicode-mode control-character and unpaired-surrogate rejection (`INVALID_EMAIL_CHARS = /[\u0000-\u001F\u007F\uD800-\uDFFF]/u`) inside `emailFrom()` in `api/app.ts` so malformed login emails fail closed before hitting PostgreSQL, returning `HTTP 400 {"error":{"code":"VALIDATION","message":"Email and password are required"}}` with `Cache-Control: no-store` and no `Set-Cookie`.

### 3.3 Step 3 — Targeted Verification (`GREEN`) & Full Automated Regression Suite

Executed by Author `thananun-7203` (ComTon, Windows, Node `v24.14.0`, Python `3.12.10`, isolated loopback `postgresql-x64-18` databases `ttworkshop_test` & `ttworkshop_seed_test`, local headless Chromium):

| Check / Command | Provenance | Result & Exact Counts |
|---|---|---|
| `npm run test:api` (`tests/auth.integration.test.ts`) | Author-local (GREEN) | **PASS — 1/1 file, 12/12 tests passed, 0 failed, 0 skipped** (including `STS-F01-08 / DEF-TTW-TH038-01`) |
| `npm run build` (`tsc --noEmit && vite build`) | Author-local | **PASS — 0 TS errors, 20 modules transformed (519ms)** |
| `npm test` (full Vitest suite: unit, API/DB integration, React UI, headless Chrome E2E) | Author-local | **PASS — 20/20 files, 135/135 tests passed, 0 failed, 0 skipped** |
| `python -m unittest discover -s tests -p "test_*.py" -v` | Author-local | **PASS — 41/41 tests passed** (`test_cloud_smoke.py` 7, `test_release_candidate.py` 21, `test_release_provenance.py` 13) |

---

## 4. Remaining Gates Before Final Lab 6 Completion

| File / Gate | Status | Owner |
|---|---|---|
| `api/app.ts`, `tests/auth.integration.test.ts`, `docs/labs/lab-06/defect-triage-and-resolution.md`, `docs/labs/lab-06/uat-plan-and-handoff.md`, `README.md` | **Current (Staging PR candidate)** | `thananun-7203` (Author) |
| Hosted PR CI (`build-test`), independent six-axis Formal Review & merge into `sprint_2_staging` | **Pending** | `cottonlnwza` (Independent Reviewer) |
| Reviewed release PR (`sprint_2_staging` → `main`) and Cloud Run deployment (`deploy-main.yml`) producing new immutable SHA/revision/digest | **Pending** | `cottonlnwza` (Release/GCP Operator) |
| Independent live retest of `DEF-TTW-TH038-01` on corrected Cloud Run revision + Final Sprint 1 Acceptance Decision | **Pending** | Partner UAT Team `TH-038` (`chaproi`) |
| Issue #63 post-merge verification, Project #4 `Done`, Issue closure, and LEB2 PDF submission | **Pending** | `thananun-7203` & `cottonlnwza` |
