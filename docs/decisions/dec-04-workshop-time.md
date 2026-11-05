# DEC-04 — Workshop timestamps and registration deadline boundary

> **v0.1 F-02 scoped working choice accepted; global SRS/SDS NOT APPROVED** · 2026-11-05 reconciliation [Issue #11](https://github.com/cottonlnwza/TTworkshop/issues/11). Original proposal: 2026-11-04. Evidence: [PR #10](https://github.com/cottonlnwza/TTworkshop/pull/10); [acceptance ledger](p1-ex01-working-acceptance-ledger.md).

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

**Historical review completed:** PR #10 peer-APPROVED `671a98e`, merged as `a863246`, and Author-verified (Issue #4); its Reviewer expressly stated conditional F-02 scoped working acceptance, now evidenced. **The actual university timezone identifier remains an unselected configuration value**, not permission to guess it. F-03 must independently validate registration-time eligibility under its own Issue. No global/instructor approval or executable validation is implied. See [Issue #11's ledger](p1-ex01-working-acceptance-ledger.md).
