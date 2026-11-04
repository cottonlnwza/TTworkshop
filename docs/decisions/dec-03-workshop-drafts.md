# DEC-03 — Incomplete Workshop DRAFT policy

> **PROPOSED v0.2 — NOT APPROVED — 2026-11-04** · Scope: F-02 Workshop Draft & Publish (P1-04 / Issue #4)

## Decision

Allow an Organizer to create and save an incomplete `DRAFT`. All fields listed in DEC-02 may be absent during DRAFT creation, subject to basic type validation for any supplied value and the cross-field deadline rule below. The server derives `owner_user_id` from the authenticated session and sets `status = DRAFT`.

The owning Organizer may update the same workshop while its persisted status is `DRAFT`, using a partial update. Only DEC-02 workshop fields may be changed; `id`, `owner_user_id`, `status`, and server-managed timestamps are not client-writable. The server must derive ownership from the session, reject updates by another Organizer or a Participant, and reject updates once the workshop is `PUBLISHED`. Validate supplied field types and validate the merged persisted-plus-request values for cross-field rules whenever both values are available, including `registration_deadline <= starts_at`. An invalid update must leave the stored DRAFT unchanged.

Publishing is a separate validated transition. Before changing status to `PUBLISHED`, the server requires `title`, `description`, `location`, `starts_at`, `ends_at`, and a positive integer `capacity`; it also enforces `ends_at > starts_at` and the DEC-04 configured-deadline rule. A failed Publish returns a validation error and leaves the record in `DRAFT` without a partial state change.

If both `registration_deadline` and `starts_at` are supplied at Create, validate `registration_deadline <= starts_at` before inserting the DRAFT. If `starts_at` is absent, defer that comparison until Publish, when both values are available. An absent deadline remains valid and uses the DEC-04 default for registration eligibility.

## Rationale and consequences

- Organizers can save progress without inventing placeholder values for fields they have not entered.
- Organizers can complete a previously saved partial DRAFT without creating a replacement record; Create → Update same DRAFT → Publish is one coherent workflow.
- Draft updates do not authorize editing a PUBLISHED workshop or changing ownership/publication state.
- Publish remains the single gate for a complete, eligible, discoverable Workshop.
- UI validation is helpful feedback only; the API and persistence layer enforce the same rules.
- AC/STS-F02-01 and AC/STS-F02-08 cover partial creation and completion of the same DRAFT; a dedicated AC/STS covers the complete Create → Update → Publish flow and authorization boundaries.

## Status and evidence

**Pending independent teammate review and merge of the authorized Issue #4 documentation PR.** v0.2 addresses PR #10 Reviewer R-01 by defining owner-only, DRAFT-only partial update. This is a scoped proposal, not instructor approval, implementation evidence, or approval of the full product baseline.
