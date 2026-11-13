# Issue #31 / L5-02 — Docker runtime and reproducibility evidence (Period 2)

**Scope:** local development/demo Compose stack only. **Not** GCP, course submission, HTTPS production, or a main release. Author `cottonlnwza`; target `sprint_2_staging`; base `5c31095f32880f3b575ee29ada0710795673a6df` from completed Issue #30 / merged PR #36. Exact PR head and hosted check-run URLs must be added only after actual push/CI.

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

## Issue AC / STS matrix

| Requirement | Evidence / status |
|---|---|
| AC-L5-05 | Real Docker build, healthy three-service Compose, local HTTP UI/API to PostgreSQL, synthetic-only DB; **PASS local** |
| AC-L5-06 | `DATABASE_URL`/`APP_ORIGIN`/`APP_HOST`/`API_PROXY_TARGET`/`TTW_WEB_PORT`, DB and HTTP health checks, migration on API startup, loopback-only published UI; **PASS local** |
| AC-L5-07 | HTTP workflow smoke for login, Publish/Register, duplicate/full, roster/ownership; actual Chromium sign-in/discovery; **PASS local** |
| AC-L5-08 | Real `docker compose restart`, persisted DB workshop and named volume verified; clean uncached `docker compose build --no-cache --quiet` **PASS** (from current worktree), separate fresh Git clone from scratch **NOT VERIFIED** |
| AC-L5-09 | README, `.env.docker.example`, this evidence document, smoke scripts and same PR; **PASS in working tree / pending PR** |
| STS — invalid configuration | `docker compose --env-file /dev/null config --quiet` without synthetic DB password: **EXPECTED_REJECTION**; PASS negative configuration test |
| STS — isolated DB | Internal-only DB and API without published host ports, synthetic demo seed, loopback UI; **PASS local** |

## Security and limits

- Do **not** publish `.env`, synthetic passwords, real customer accounts, cloud keys or production secrets. `.dockerignore` and `.gitignore` exclude `.env`.
- API validates `APP_HOST` against allowlisted `127.0.0.1` and `0.0.0.0`; default local remains loopback. Express Origin controls are unchanged.
- Container and DB images are not a production security attestation; production TLS/reverse proxy, optimized immutable images, cloud budgets, Secret Manager and GCP deployment belong to separate Issue #32.
- The existing 103/103 hosted CI suite on the base commit is NOT a test run of this Issue #31 HEAD. Hosted CI on PR #31 must be read back before sending to Reviewer. No grading or instructor approval is claimed.
