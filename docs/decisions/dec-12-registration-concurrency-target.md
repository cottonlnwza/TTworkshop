# DEC-12 — Registration concurrency test target

> **F-03 test profile — implementation-only authorization recorded; final acceptance pending — 2026-11-07**
> Owner scope: [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) · Feature: F-03 · Related: BR-06, NFR-03, AC/STS-F03-06

## Decision

Use the team-reported **10 concurrent registration attempts for one remaining seat** as the F-03 implementation test profile authorized by the exact-HEAD Reviewer milestone:

- Start with a published workshop with capacity 1 and zero ACTIVE registrations.
- Submit 10 overlapping requests from 10 distinct authenticated Participants.
- Exactly one request commits an ACTIVE registration; the other nine are rejected.
- The persisted ACTIVE count is exactly 1 and never exceeds capacity.
- Verify the result against the real PostgreSQL test database, not a mock or an in-memory counter.

## Mandatory invariant vs. provisional numeric profile

- **Mandatory course-level outcome:** capacity must never be exceeded, including competing requests for the final place. The official Group Work Specification, Theme 3, Sprint 1 example requires enforcing capacity and one active registration per Participant/event, including competing final-place requests.
- **Team test target:** the number `10` is a team-reported test/load profile authorized for this F-03 implementation. The course material does not prescribe ten concurrent requests or require exactly nine rejections as an instructor-mandated numeric threshold.
- If the Reviewer changes the numeric profile, retain a real concurrent last-seat test that proves the no-overbooking invariant and update AC/STS consistently. Do not weaken or remove the mandatory invariant.

## Proposed technical verification

Use distinct Participant identities and a synchronized start barrier so requests genuinely overlap. Assert both response outcomes and the database postcondition after all transactions settle. The implementation uses PostgreSQL row locking (`SELECT ... FOR UPDATE`) to serialize registrations per Workshop, checks PUBLISHED/deadline/ACTIVE count and inserts within one transaction, with a database-enforced partial unique index for ACTIVE `(workshop_id, participant_user_id)`. The exact-HEAD Reviewer milestone authorizes this strategy for implementation; execution evidence is recorded in `docs/evidence/p1-05-f03.md`.

## Deferred boundaries

- NFR-04 response-time target and NFR-05 responsive viewport targets remain separate later-sprint proposals; this F-03 record does not approve them.
- The 10-request functional concurrency test is executed against real PostgreSQL as recorded in `docs/evidence/p1-05-f03.md`; this is not a performance benchmark.

## Two-stage decision authorization and acceptance gate

This record separates permission to use the proposed numeric test profile during implementation from final acceptance of the delivered work. The mandatory no-overbooking invariant is a course-level outcome and is **not** conditional on the optional numeric profile.

1. **Pre-implementation scoped authorization (before TDD):** the independent Reviewer must review the exact current PR #15 HEAD, including this profile and the F-03 contract. If accepted, `cottonlnwza` must add a PR conversation comment containing the exact phrase `Approved for Implementation Only — Not Approved for Merge` and `Reviewed Commit SHA: <full exact HEAD SHA>`. The Author must verify the account identity and exact SHA match before starting TDD. This authorizes use of the 10-request / one-seat profile **only as an F-03 working test target**. If the Reviewer changes the number or profile, the contract AC/STS and this record must be updated on the same Draft PR before the milestone is issued. This is not a GitHub Formal APPROVE, merge permission, global SRS/System SDS approval, or instructor approval.
2. **Final working-document acceptance (after implementation):** the same PR #15 must remain Draft through TDD and implementation, then receive a separate substantive final code/test review and GitHub Formal APPROVE, be merged into `sprint_1_staging` by the teammate, and be independently verified by the Author on the merge commit. Only after that sequence is this scoped profile part of the accepted staging working baseline.

Until stage 1 is recorded and verified, the numeric profile is **PROPOSED / NOT AUTHORIZED FOR IMPLEMENTATION**; the mandatory no-overbooking invariant remains required. Stage 1 was recorded by Reviewer `cottonlnwza` on PR #15 for exact HEAD `b81280e9bfbc15a4ba1b7cd4cf19e02499622b71`, and the Author verified identity and SHA equality before TDD. Its current status is **AUTHORIZED FOR F-03 IMPLEMENTATION ONLY / NOT FINALLY ACCEPTED**. Neither stage approves the full SRS/System SDS or instructor baseline.

| Review item | Status at this revision |
|---|---|
| Existing 10-request profile retained as a proposal | Authorized for F-03 implementation, 2026-11-07 |
| Exact-HEAD pre-implementation Reviewer milestone | Recorded by `cottonlnwza`; reviewed SHA `b81280e9bfbc15a4ba1b7cd4cf19e02499622b71` ([comment](https://github.com/cottonlnwza/TTworkshop/pull/15#issuecomment-6690830963)) |
| Author verification of Reviewer identity and exact HEAD SHA | Verified before implementation; local branch and live remote HEAD matched at start |
| Final Formal APPROVE, staging merge and Author verification | Pending after implementation |
