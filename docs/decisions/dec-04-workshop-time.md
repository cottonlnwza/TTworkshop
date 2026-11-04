# DEC-04 — Workshop timestamps and registration deadline boundary

> **PROPOSED v0.1 — NOT APPROVED — 2026-11-04** · Scope: F-02/F-03 date-time interoperability; F-02 write-side validation

## Decision

1. API date-time values use ISO 8601 timestamps with an explicit UTC offset. Reject invalid or timezone-naive date-time inputs rather than interpreting them using the server machine's local timezone.
2. Persist date-time instants in PostgreSQL `timestamptz` (normalized as UTC instants). Compare instants, not formatted local-time strings.
3. UI date-time entry/display uses the university's configured timezone. The timezone identifier is deployment configuration and must not be hard-coded or guessed in this decision record.
4. `registration_deadline` is optional. When absent, the effective registration deadline is `starts_at`. When configured, it must satisfy `registration_deadline <= starts_at`; F-02 validates this at Create when both values exist and re-validates on Publish.
5. Registration is closed at the exact effective deadline: a new registration is eligible only while `now < effective_deadline`; `now >= effective_deadline` is closed.

## Rationale and consequences

- Explicit offsets prevent ambiguous conversion between browser, server and database clocks.
- `timestamptz` stores an instant; the configured university timezone controls presentation, not the stored instant.
- Equality is intentionally closed to avoid accepting a registration at the deadline boundary.
- F-02 owns Create/Publish validation of a configured deadline; F-03 owns registration-time eligibility and defensive fail-closed behavior for malformed persisted PUBLISHED data.
- Tests must cover earlier-than, equal-to and later-than-start configured deadlines, plus just-before/equal-to/after-effective-deadline registration boundaries.

## Status and evidence

**Pending independent teammate review and merge of the authorized Issue #4 documentation PR.** The actual university timezone identifier remains deployment configuration to be supplied; this decision does not select one. This is not instructor approval or implementation evidence.
