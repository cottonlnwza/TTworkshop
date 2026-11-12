# DEC-02 — Workshop fields and publication requirements

> **v0.1 choice accepted for F-02 scoped working use; global SRS/SDS NOT APPROVED** · 2026-11-05 reconciliation [Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11). Original proposal: 2026-11-04, [Issue #4](https://github.com/cottonlnwza/TTworkshop/issues/4). Evidence: [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10); [acceptance ledger](p1-ex01-working-acceptance-ledger.md).

## Decision

For the F-02 Draft/Publish workflow, use the following candidate Workshop fields:

| Field | Proposed type / rule | Required to create DRAFT? | Required to publish? |
|---|---|---:|---:|
| `title` | Text | No | Yes |
| `description` | Text | No | Yes |
| `location` | Text | No | Yes |
| `starts_at` | Date-time instant | No | Yes |
| `ends_at` | Date-time instant | No | Yes; must be later than `starts_at` |
| `capacity` | Integer | No | Yes; must be greater than zero |
| `registration_deadline` | Optional date-time instant | No | No; when supplied it must not be later than `starts_at` |

The authenticated Organizer identity is assigned by the server to `owner_user_id`; clients cannot select or override ownership. The server controls `status`; a new record starts as `DRAFT` and only the valid owner transition may publish it. Do not add field-length limits or other constraints until they are separately specified and reviewed.

## Rationale and consequences

- The field set supports the Sprint 1 workshop publication journey and the existing FR-03/04, BR-01–04 and BR-08 draft requirements.
- Field optionality during DRAFT creation is governed by DEC-03; this record establishes which fields are required at publication.
- Capacity is stored as an integer and checked as positive at publication; the database must preserve the invariant.
- `registration_deadline` is optional; its timestamp representation and exact deadline boundary are governed by DEC-04.
- Any change to the field set or required-at-publication policy requires a versioned decision and corresponding SRS/contract/traceability update before implementation.

## Status and evidence

**Historical review completed:** PR #10 was peer-APPROVED by `cottonlnwza` on `671a98e`, merged into `sprint_1_staging` at `a863246`, and independently verified after merge by its Author (recorded in Issue #4). That review expressly conditioned **scoped working-choice acceptance** on merge and Author verification; both occurred. This does **not** approve every SRS/SDS decision, constitute instructor sign-off, or demonstrate F-02 implementation. [Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11) reconciles current evidence without changing the historical PR.
