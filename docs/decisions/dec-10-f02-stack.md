# DEC-10-F02 — F-02 stack and persistence-layer selection

> **PROPOSED v0.1 — NOT APPROVED — 2026-11-04** · Scope: F-02 Workshop Draft & Publish (P1-04 / Issue #4)

## Decision

For F-02, propose reusing the stack already present in the F-01 implementation rather than introducing a second framework or persistence abstraction:

| Layer | F-02 proposal | Basis / boundary |
|---|---|---|
| Web UI | React 19 + TypeScript + Vite 8 | Matches the existing F-01 application |
| API | Node.js + TypeScript + Express 5 | Matches the existing F-01 API |
| Database | PostgreSQL 15+ | Relational persistence consistent with the existing F-01 database |
| Data access | `pg` driver with parameterized SQL and explicit transactions; no ORM selected | Matches the existing F-01 migration/query approach; preserve PostgreSQL constraints and transaction semantics |
| Authentication | Reuse the existing F-01 server-side session and `HttpOnly` cookie middleware; derive Organizer identity server-side | F-02 consumes F-01 identity and must not create a parallel auth mechanism |

F-02 adds its Workshop schema through versioned SQL migrations and uses the repository's existing test conventions. Any implementation must verify the actual F-01 interfaces and current migration/test conventions before relying on them.

## Rationale and consequences

- Reuse reduces integration risk and avoids introducing an unreviewed ORM or competing auth flow.
- PostgreSQL constraints and transactions remain available for ownership and publication invariants.
- This decision is **F-02-scoped**. It does not approve the complete System SDS, deployment architecture, production runtime, CI/CD, Docker/GCP choices, or all later features.
- If the existing F-01 implementation or course handout conflicts with this proposal, stop and reconcile the decision and SDS before implementation.

## Status and evidence

**Pending independent teammate review and merge of the authorized Issue #4 documentation PR.** F-01 is the implementation precedent; this record does not claim that every proposed F-02 choice has already been implemented or that the global architecture is approved.
