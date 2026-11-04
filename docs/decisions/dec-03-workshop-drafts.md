# DEC-03 — Incomplete Workshop DRAFT policy

> **PROPOSED v0.1 — NOT APPROVED — 2026-11-04** · Scope: F-02 Workshop Draft & Publish (P1-04 / Issue #4)

## Decision

Allow an Organizer to create and save an incomplete `DRAFT`. All fields listed in DEC-02 may be absent during DRAFT creation, subject to basic type validation for any supplied value and the cross-field deadline rule below. The server derives `owner_user_id` from the authenticated session and sets `status = DRAFT`.

Publishing is a separate validated transition. Before changing status to `PUBLISHED`, the server requires `title`, `description`, `location`, `starts_at`, `ends_at`, and a positive integer `capacity`; it also enforces `ends_at > starts_at` and the DEC-04 configured-deadline rule. A failed Publish returns a validation error and leaves the record in `DRAFT` without a partial state change.

If both `registration_deadline` and `starts_at` are supplied at Create, validate `registration_deadline <= starts_at` before inserting the DRAFT. If `starts_at` is absent, defer that comparison until Publish, when both values are available. An absent deadline remains valid and uses the DEC-04 default for registration eligibility.

## Rationale and consequences

- Organizers can save progress without inventing placeholder values for fields they have not entered.
- Publish remains the single gate for a complete, eligible, discoverable Workshop.
- UI validation is helpful feedback only; the API and persistence layer enforce the same rules.
- Existing AC/STS-F02-01 and AC/STS-F02-08 must distinguish successful partial-DRAFT creation from rejected incomplete publication.

## Status and evidence

**Pending independent teammate review and merge of the authorized Issue #4 documentation PR.** This is a scoped proposal, not instructor approval, implementation evidence, or approval of the full product baseline.
