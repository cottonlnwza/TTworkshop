# F-01 — Authentication, Session and Role Authorization

> **DRAFT v0.1 — NOT APPROVED — 2026-11-03** · P1-02 [Issue #2](https://github.com/cottonlnwza/TTworkshop/issues/2) · Implementation [Issue #3](https://github.com/cottonlnwza/TTworkshop/issues/3) · Sprint 1
> Source: `docs/srs.md` DRAFT v0.1.1 FR-01, FR-02, BR-01, NFR-01, NFR-07; `docs/features.md` F-01; `docs/system-sds.md` sections 7–8. All paths/DTOs below are **PROPOSED**, not an approved contract or existing API. **No application tests executed.**

## 1. Goal, dependencies and scope

An existing synthetic, seeded Participant or Organizer authenticates using credentials, receives a protected session, reads server-derived identity and logs out. Unauthorized/wrong-role requests must be rejected **at the API**, not just hidden in UI. No self-registration, password reset, social login, admin role or production identity provider is in Sprint 1.

**Depends on:** team approval of SRS/SDS; DEC-01 role model; DEC-10 stack/DB/session approach; ARCH-01/02/07 runtime. F-02/F-03/F-04 depend on the identity/role guard established here. Seed two Organizers and at least two Participants to prove cross-owner isolation in later feature tests. All identities/data are synthetic.

**Decision holds (not silently resolved):** DEC-10 session cookie vs token, expiry/revocation/storage, cookie CSRF defenses, login-ID normalization, initial account provisioning and rate-limit policy. The interface below *illustrates* the opaque-cookie option from System SDS; tests and implementation must follow approved changes.

## 2. Feature SDS — behavior and rejection

1. Anonymous user visits `/login`; sends a credential pair via TLS and receives a new server-bound session only if hash verification succeeds.
2. `/auth/me` resolves identity from the server session: `id`, `role` and safe display/email fields only. Do not accept a client-provided `role` or `user_id` as authorization.
3. Protected API middleware verifies session validity, expiration and role; record-owner validation happens again in each F-02–F-04 service. Wrong role/foreign owner receives safe rejection.
4. Logout invalidates/revokes the active server-side session; a subsequent protected request with the old session is unauthorized.
5. Bad credential, missing/expired session, bad payload and disabled/unrecognized role must not expose password hashes, tokens or another user's data. Credential verification should avoid user enumeration.

| Operation | Anonymous | Participant | Organizer |
|---|---|---|---|
| Login | credential check | re-login policy OPEN | re-login policy OPEN |
| `/auth/me` / logout | reject | own session | own session |
| Protected Participant operations | reject | if owner/role matches | reject |
| Protected Organizer operations | reject | reject | only own workshop |

## 3. UI contract (proposed)

| Screen/state | Observable behavior |
|---|---|
| `/login` | Labeled login identifier and password, required-field messages, submit pending state, generic bad-credential feedback without revealing whether account exists |
| Authenticated navigation | Role-specific allowed links from `/auth/me`; no trusted role/owner passed from browser |
| Session expired / unauthorized | Safe 401 feedback and navigation to login; no protected content flash or stale private record |
| Logout | Explicit request, clear private UI/session state and prevent authenticated navigation; failure must not be mislabeled success |

Proposed screen fields are email and password; exact email normalization/limits and session lifetime are **OPEN**. A hidden button does not replace API enforcement. UI must handle loading, validation, 401, 403 and transport errors.

## 4. API contract (proposed; names/statuses to approve)

Base `/api/v1`; JSON success envelope `{"data": ...}`; failure `{"error":{"code":"...","message":"..."}}`; never return stack traces, credential hashes or session tokens in JSON.

| Method / path | Request | Success | Error categories |
|---|---|---|---|
| `POST /auth/login` | `{"email":"seed@example.test","password":"<synthetic>"}` | `200`, `{"data":{"user":{"id":"u-1","role":"PARTICIPANT","email":"seed@example.test"}}}` and a secure, HttpOnly session cookie if approved | `400 VALIDATION`, `401 INVALID_CREDENTIALS`; no user-enumerating detail |
| `GET /auth/me` | valid cookie | `200` `{"data":{"id":"u-1","role":"PARTICIPANT","email":"seed@example.test"}}` | `401 UNAUTHENTICATED` |
| `POST /auth/logout` | valid cookie plus anti-CSRF control if cookie chosen | `204`, invalidated cookie/server session | `401` unauthenticated; logout idempotence policy OPEN |

**Security/shape:** all protected routes deny unauthenticated calls; server derives role/user ID; never trust request `role`. Cookie-based mutation endpoints require approved CSRF/Origin protection and `Secure` when HTTPS. Exact 403-vs-404 private-owner policy is specified alongside consuming features, not decided here.

## 5. Data contract and persistence (proposed; not a migration)

| Logical data | Candidate fields and integrity |
|---|---|
| `User` | `id` primary key; normalized unique `email`; `password_hash` (never plaintext); `role` enum `PARTICIPANT / ORGANIZER`; `created_at`; no user-supplied role escalation |
| `Session`, if chosen | `id`/digest, `user_id` FK, `expires_at`, `revoked_at`, `created_at`; only active unexpired sessions accepted; hash token or use equivalent secure state |

Migrations and seed are planned in implementation Issue #3, **not generated here**. Storage/hash algorithm, session rotation/expiry, replay and CSRF mechanism must be approved under DEC-10/ARCH-02 before code. Seed-only secrets must never be real production secrets.

## 6. Acceptance criteria — uniquely identified and observable

| AC ID | Outcome and linked requirement |
|---|---|
| **AC-F01-01** | Correct seeded Participant credentials establish a session; subsequent `me` returns that same Participant's server-side identity (FR-01/02). |
| **AC-F01-02** | Seeded Organizer authenticates and obtains Organizer identity; browser-selected role does not override stored role (FR-02, BR-01). |
| **AC-F01-03** | Bad credentials (unknown user or wrong password) never authenticate and reveal no account-existence/private information (FR-01, NFR-01). |
| **AC-F01-04** | Missing/expired/revoked session cannot call any sampled protected API or retrieve private data (BR-01, NFR-01). |
| **AC-F01-05** | Participant is rejected by Organizer-only API, and Organizer by Participant-only registration API, with no state mutation (FR-02, BR-01). |
| **AC-F01-06** | Logout invalidates the old session, so `me` fails afterward and the UI no longer displays private identity (FR-01). |
| **AC-F01-07** | Persisted seed accounts store only secure password hashes and avoid committed real secrets; response payloads omit hashes/session tokens (NFR-01/07). |
| **AC-F01-08** | Empty/malformed credential payload yields safe validation response and an accessible field-level UI message, without creating a session (FR-01). |

## 7. Software Test Specification (STS) — PLANNED, NOT EXECUTED

Use real API and approved session implementation for integration tests. All IDs link to a corresponding AC; exact test file paths will be assigned in Issue #3.

| TEST ID | AC | Level | Input / precondition → action → expected |
|---|---|---|---|
| **STS-F01-01** | AC-F01-01 | API+DB | Seed Participant; correct credentials → login then `me` → 200 with correct ID/role and active session |
| **STS-F01-02** | AC-F01-02 | API+DB | Seed Organizer; submit valid credentials + client `role=PARTICIPANT` → role remains ORGANIZER from DB |
| **STS-F01-03** | AC-F01-03 | API negative | Unknown email and wrong password → login denied generically; neither case exposes private data |
| **STS-F01-04** | AC-F01-04 | API negative | No cookie / expired session / revoked session → protected `me` or feature endpoint returns 401 with zero private data |
| **STS-F01-05** | AC-F01-05 | API+DB security | Participant calls `POST /workshops`; Organizer calls `POST /workshops/:id/registrations` → 403 and no changed rows |
| **STS-F01-06** | AC-F01-06 | API+UI E2E | Login → logout → call `me` with old session and navigate back → 401/no private page state |
| **STS-F01-07** | AC-F01-07 | Security inspection | Seeded DB row + API output + repo diff → hash only, safe response fields, no committed production secret |
| **STS-F01-08** | AC-F01-08 | UI+API negative | Missing email/password and malformed JSON → 400 + field feedback, no issued session |

**Evidence on implementation:** RED then GREEN when appropriate, exact command, test filename/assertion, DB engine, test count/status, commit SHA and PR. Status of all STS IDs: **NOT IMPLEMENTED / NOT EXECUTED**.

## 8. Feature Definition of Done — NOT MET

- [ ] Team-approved baseline and F-01 contract/DEC-10 session/security decisions recorded before implementation.
- [ ] UI + server + durable DB implemented with versioned migrations/seed; role guard and login/current user/logout work end-to-end.
- [ ] All AC-F01-01–08 mapped STS executed (negative role/session checks included); no skipped/failing mandatory checks; secure storage verified.
- [ ] Actual RED→GREEN, local build/test evidence and tested SHA recorded on relevant PR; substantive teammate review and approved staging merge, then post-merge verification.
- [ ] No live credentials/secrets committed; reproduction/config instructions and observed results versioned.

**Change record:** v0.1, 2026-11-03, initial PRE-IMPLEMENTATION DRAFT for P1-02; author `cottonlnwza`, proposed reviewer `thananun-7203`; **PENDING PEER REVIEW + BOTH STUDENTS' CONTRACT/BASELINE APPROVAL**.
