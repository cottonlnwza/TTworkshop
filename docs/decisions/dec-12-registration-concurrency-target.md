# DEC-12 — Registration concurrency test target

> **PROPOSED F-03 test profile — PENDING independent Reviewer consideration — 2026-11-06**
> Owner scope: [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) · Feature: F-03 · Related: BR-06, NFR-03, AC/STS-F03-06

## Decision proposal

Keep the existing team-reported **10 concurrent registration attempts for one remaining seat** as the provisional F-03 concurrency test profile:

- Start with a published workshop with capacity 1 and zero ACTIVE registrations.
- Submit 10 overlapping requests from 10 distinct authenticated Participants.
- Exactly one request commits an ACTIVE registration; the other nine are rejected.
- The persisted ACTIVE count is exactly 1 and never exceeds capacity.
- Verify the result against the real PostgreSQL test database, not a mock or an in-memory counter.

## Mandatory invariant vs. provisional numeric profile

- **Mandatory course-level outcome:** capacity must never be exceeded, including competing requests for the final place. The official Group Work Specification, Theme 3, Sprint 1 example requires enforcing capacity and one active registration per Participant/event, including competing final-place requests.
- **Provisional team target:** the number `10` is a team-reported test/load profile. The course material does not prescribe ten concurrent requests or require exactly nine rejections as a numeric threshold.
- If the Reviewer changes the numeric profile, retain a real concurrent last-seat test that proves the no-overbooking invariant and update AC/STS consistently. Do not weaken or remove the mandatory invariant.

## Proposed technical verification

Use distinct Participant identities and a synchronized start barrier so requests genuinely overlap. Assert both response outcomes and the database postcondition after all transactions settle. The proposed PostgreSQL approach is to serialize registrations per Workshop row (for example, `SELECT ... FOR UPDATE`), check PUBLISHED/deadline/ACTIVE count and insert within one transaction, with a database-enforced partial unique index for ACTIVE `(workshop_id, participant_user_id)`. This is a design proposal requiring Reviewer approval and real-DB verification, not proof that a migration or registration implementation exists.

## Deferred boundaries

- NFR-04 response-time target and NFR-05 responsive viewport targets remain separate later-sprint proposals; this F-03 record does not approve them.
- No benchmark result, concurrency test execution, or implementation is claimed by this decision record.

## Status and approval gate

**Status: PROPOSED / NOT APPROVED.** The 10-request profile remains provisional until independent Reviewer consideration. The capacity invariant itself remains required by the official course brief. This record does not approve the full SRS/System SDS or instructor baseline.

| Review item | Status |
|---|---|
| Existing 10-request profile retained as a proposal | Confirmed for F-03 draft, 2026-11-06 |
| Independent teammate Reviewer decision | Pending |
| Staging merge and Author verification | Pending |
