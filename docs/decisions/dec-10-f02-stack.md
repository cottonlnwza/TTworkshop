# DEC-10-F02 — F-02 stack and persistence-layer selection

> **v0.1 choice accepted for F-02 scoped working use; global architecture NOT APPROVED** · 2026-11-05 reconciliation [Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11). Original proposal: 2026-11-04, [Issue #4](https://github.com/cottonlnwza/TTworkshop/issues/4). Evidence: [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10); [acceptance ledger](p1-ex01-working-acceptance-ledger.md).

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

**Historical review completed:** PR #10 peer-APPROVED `671a98e`, merged as `a863246`, and Author-verified (Issue #4); Reviewer explicitly conditioned acceptance of the scoped working stack choice on those events. F-01's existing implementation remains the integration precedent, not evidence F-02 has been written or that global GCP/CI architecture is approved. See [Issue #11's ledger](p1-ex01-working-acceptance-ledger.md).
