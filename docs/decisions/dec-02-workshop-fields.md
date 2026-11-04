# DEC-02 — Workshop fields and publication requirements

> **PROPOSED v0.1 — NOT APPROVED — 2026-11-04** · Scope: F-02 Workshop Draft & Publish (P1-04 / Issue #4)

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

**Pending independent teammate review and merge of the authorized Issue #4 documentation PR.** This is a scoped proposal, not instructor approval, implementation evidence, or approval of the full product baseline.
