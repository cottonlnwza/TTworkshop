# Issue #31 / L5-02 — Docker runtime and reproducibility evidence (Period 2)

**Scope:** local development/demo Compose stack only. **Not** GCP, course submission, HTTPS production, or a main release. Author `cottonlnwza`; [PR #39](https://github.com/cottonlnwza/TTworkshop/pull/39) targets `sprint_2_staging` from base `5c31095f32880f3b575ee29ada0710795673a6df` (Issue #30 / merged PR #36). This evidence was initially prepared before PR push, then updated for the verified PR HEAD `6269c1c8e4219980288f4f48cb6083b35249c5f8` and [hosted CI run #43453774191](https://github.com/cottonlnwza/TTworkshop/actions/runs/43453774191). A later documentation-only rework commit must have **its own fresh CI read-back** before re-review; historical test provenance is not silently transferred to a new SHA.

## Environment and verified local execution

- Date: 2026-11-13 (Asia/Bangkok); Mac Docker Engine 29.2.1, host Node v25.8.0/npm 11.11.0, container Node 22 / PostgreSQL 15.
- `npm ci --no-audit --no-fund` **PASS** (229 packages); `npm run build` **PASS** (TypeScript + Vite).
- `docker compose config --quiet` **PASS**; `docker compose build` **PASS** for API and Web using Node 22 pinned base digest and locked npm dependency tree. Fresh PostgreSQL 15 image downloaded; `docker compose up -d --wait --wait-timeout 120` **PASS** after choosing free local host port `18173`. Original attempted host port `5173` was already occupied, and the initial Vite runtime cache had unprivileged EACCES; both issues corrected before final success.
- `docker compose ps`: `db`, `api`, `web` all **healthy**. GET `http://localhost:18173/` → **200**; unauthenticated GET `/api/v1/auth/me` via UI proxy → **401**. API `/healthz` returns **200** while DB reachable.
- In the disposable Compose DB, `docker compose run --rm -T -e SEED_PASSWORD=... api node ./node_modules/tsx/dist/cli.mjs scripts/seed.ts` **PASS** (four `.test` identities + synthetic workshops). Password is **never** committed or printed as evidence.
- `APP_ORIGIN=http://localhost:18173 SEED_PASSWORD=... node scripts/docker-smoke.mjs` → **SMOKE_PASS**. It uses actual HTTP sessions: organizer and both participants sign in; create/publish a valid one-seat workshop; published discovery; participant registration 201; duplicate/last-seat conflict 409; participant B blocked by capacity; organizer roster returns exactly one; participant forbidden 403; unrelated organizer forbidden/not found 404. Retains synthetic fixture title in output.
- `docker compose restart` followed by `docker compose up -d --wait --wait-timeout 90` and `node scripts/docker-smoke.mjs --verify <title>` → **PERSISTENCE_VERIFIED**. PostgreSQL named volume `ttworkshop-l5_pgdata` confirmed; workshop row survives actual DB/API/Web restart.
- `node scripts/docker-browser-smoke.mjs` with actual Chrome → **BROWSER_SMOKE_PASS**, participant signs in through the Compose-published Vite UI → API → real PostgreSQL and navigates to published workshop discovery. Initial test expectation incorrectly targeted an old UI heading; corrected to actual `Discover workshops` and reran successfully.

**Image provenance (fresh `docker compose build --no-cache --quiet` after digest pinning):** `ttworkshop-l5-api` local image ID `sha256:80511d41e1e683ebfe987172da51f9ce7b7db2e1363628832179c3824c6b010f`; `ttworkshop-l5-web` local image ID `sha256:2af5e4f6287e9ae16fec29f635a47f9d9f46ac3a9eea36e19e385c2d09f9c5a7`. PostgreSQL digest `sha256:72ccb1ad4dc9d5813ea40a8c1c87af746f16658fb029c17fe570ea9b881f68b3`. These are local build artifacts, **not a registry-published image digest**. No deployment image registry push is claimed.

## Independent fresh-checkout reproduction — AC-L5-08 (Author-local, 2026-11-13 Asia/Bangkok)

**Source and isolation:** A separate, newly cloned Git repository (not the earlier working tree/worktree) from the real remote `https://github.com/cottonlnwza/TTworkshop.git`, branch `feat/issue31-docker-runtime`, was detached at **exact commit** `6269c1c8e4219980288f4f48cb6083b35249c5f8` before any test. `git status --porcelain` returned **zero entries** immediately after checkout; no pre-existing `node_modules`, `.env`, build files, application data, volumes, database, or prior Compose containers were copied. Local test directory: sibling `TTworkshop-issue31-clean-checkout` (not a public deployment path). Mac Docker Engine `29.2.1`; host Node `v25.8.0`, npm `11.11.0`; container Node `22`, PostgreSQL `15`.

**Commands and observed results (all from this clean clone, shell-generated random synthetic values redacted):**

1. `git clone --no-local --branch feat/issue31-docker-runtime https://github.com/cottonlnwza/TTworkshop.git TTworkshop-issue31-clean-checkout` and `git checkout --detach 6269c1c8e4219980288f4f48cb6083b35249c5f8`: **PASS**, exact SHA and pristine tracked source verified.
2. Generate untracked mode-`0600` `.env` containing only locally generated **synthetic** `TTW_DB_PASSWORD=<redacted random>` and `TTW_WEB_PORT=18174`. **No credential text in Git or evidence.** Use unique Compose project `ttworkshop-l5-clean31` so the DB/volume/network have no overlap with original smoke project.
3. `docker compose -p ttworkshop-l5-clean31 config --quiet`: **PASS**. `docker compose -p ttworkshop-l5-clean31 build --no-cache --quiet`: **PASS** for both application images. Fresh local image IDs: API `sha256:36ab9531612be3f5c58799719cf93e109c3a95b73a6fa7be8711f801c7bfe0e7`, Web `sha256:866816b53d7f8a27df6faa39a0281643ec89ba36c57ae587a75b4b813b801b02` (local image IDs, not registry digests). Pin sources remain as recorded above.
4. `docker compose -p ttworkshop-l5-clean31 up -d --wait --wait-timeout 150`: **PASS**. `docker compose ... ps`: `db`, `api`, `web` each **healthy**. `curl http://localhost:18174/` → **200**; unauthenticated `curl http://localhost:18174/api/v1/auth/me` → **401** (auth protected, not a broken API).
5. `npm ci --no-audit --no-fund`: **PASS**; `npm run build`: **PASS** against the actual checked-out files. Generate an independent synthetic `SEED_PASSWORD` in shell (value redacted). `docker compose -p ttworkshop-l5-clean31 run --rm -T -e SEED_PASSWORD="$SEED_PASSWORD" api node ./node_modules/tsx/dist/cli.mjs scripts/seed.ts`: **PASS** with `.test` demo accounts. No production DB exposed or used.
6. `APP_ORIGIN=http://localhost:18174 SEED_PASSWORD="$SEED_PASSWORD" node scripts/docker-smoke.mjs`: **SMOKE_PASS**, generated synthetic fixture `docker-issue31-2953f779-36c0-4476-aab3-4a50b9ba5903`. This checks actual HTTP login, organizer creation/publish, participant registration/duplicate and capacity conflict, organizer roster, role and owner boundaries.
7. `APP_ORIGIN=http://localhost:18174 SEED_PASSWORD="$SEED_PASSWORD" node scripts/docker-browser-smoke.mjs`: **BROWSER_SMOKE_PASS** in real local Chrome, via the clean Compose UI → API → PostgreSQL.
8. `docker compose -p ttworkshop-l5-clean31 restart`; then `docker compose -p ttworkshop-l5-clean31 up -d --wait --wait-timeout 130`: **PASS**, all three containers healthy after restart. `APP_ORIGIN=http://localhost:18174 SEED_PASSWORD="$SEED_PASSWORD" node scripts/docker-smoke.mjs --verify docker-issue31-2953f779-36c0-4476-aab3-4a50b9ba5903`: **PERSISTENCE_VERIFIED**. Named isolated volume `ttworkshop-l5-clean31_pgdata` exists and retained the real workshop row across PostgreSQL/API/Web restarts.
9. `git status --short` after test: **empty**, no source modifications. Only ignored/untracked locally protected `.env`, `node_modules` and `dist` were generated; they were not added to Git.

**Limitations:** This is a real new clean Git clone and standalone Compose project on the same Mac/Docker Engine, **not** a second machine/OS, deployed environment or external registry rebuild. The scripts exercise concrete HTTP/Chrome workflows and one persisted workshop, not every production operational scenario. The original pre-rework working-tree results above remain historical evidence, not replaced or erased by this new run.

## Hosted CI provenance (separate from all Author-local Docker results)

- [GitHub-hosted `build-test` run #43453774191](https://github.com/cottonlnwza/TTworkshop/actions/runs/43453774191), on exact **PR HEAD `6269c1c8e4219980288f4f48cb6083b35249c5f8`**, completed **SUCCESS**: **13/13 test files; 103/103 tests passed**; real isolated loopback PostgreSQL/Chromium. The run occurred *before* this evidence update, so it must **not** be described as testing the later rework commit.
- Hosted CI is **not** evidence that the above Docker Compose clean-checkout steps were performed on GitHub Actions. Those tests were executed by the Author on the Mac and are labelled Author-local. The Docker Compose smoke steps remain outside the existing `build-test` workflow.
- After this Issue #31 documentation rework is pushed, fetch the **new** PR HEAD and required check run and record its result in the PR handoff; do not relabel the old run as a new-HEAD check.

## Issue AC / STS matrix

| Requirement | Evidence / status |
|---|---|
| AC-L5-05 | Real Docker build, healthy three-service Compose, local HTTP UI/API to PostgreSQL, synthetic-only DB; **PASS local** |
| AC-L5-06 | `DATABASE_URL`/`APP_ORIGIN`/`APP_HOST`/`API_PROXY_TARGET`/`TTW_WEB_PORT`, DB and HTTP health checks, migration on API startup, loopback-only published UI; **PASS local** |
| AC-L5-07 | HTTP workflow smoke for login, Publish/Register, duplicate/full, roster/ownership; actual Chromium sign-in/discovery; **PASS local** |
| AC-L5-08 | Original-worktree restart + volume proof retained; **new clean clone at exact `6269c1c8...` independently rebuilt without cache, started healthy, passed HTTP/Browser smoke and real persisted-row verification after restart** (full commands and image IDs above); **PASS Author-local on fresh checkout** |
| AC-L5-09 | README, `.env.docker.example`, same-PR smoke scripts and evidence document included in published [PR #39](https://github.com/cottonlnwza/TTworkshop/pull/39), with historical run provenance and fresh-clone evidence reconciled; **PASS docs consistency for verified prior HEAD**; new-HEAD CI read-back required |
| STS — invalid configuration | `docker compose --env-file /dev/null config --quiet` without synthetic DB password: **EXPECTED_REJECTION**; PASS negative configuration test |
| STS — isolated DB | Internal-only DB and API without published host ports, synthetic demo seed, loopback UI; **PASS local** |

## Security and limits

- Do **not** publish `.env`, synthetic passwords, real customer accounts, cloud keys or production secrets. `.dockerignore` and `.gitignore` exclude `.env`.
- API validates `APP_HOST` against allowlisted `127.0.0.1` and `0.0.0.0`; default local remains loopback. Express Origin controls are unchanged.
- Container and DB images are not a production security attestation; production TLS/reverse proxy, optimized immutable images, cloud budgets, Secret Manager and GCP deployment belong to separate Issue #32.
- Base-branch CI and [PR #39 hosted run #43453774191](https://github.com/cottonlnwza/TTworkshop/actions/runs/43453774191) are distinct: the latter **verified 103/103 on Issue #31 HEAD `6269c1c8...`** before this documentation-only rework. **A new HEAD requires a new live hosted check read-back**. Do not conflate GitHub-hosted CI with the separate Author-local Docker testing. No grading or instructor approval is claimed.
