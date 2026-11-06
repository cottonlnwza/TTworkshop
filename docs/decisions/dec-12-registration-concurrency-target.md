# DEC-12 — Registration concurrency test target

> **PROPOSED F-03 test profile — two-stage Reviewer gate — 2026-11-06**
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

## Two-stage decision authorization and acceptance gate

This record separates permission to use the proposed numeric test profile during implementation from final acceptance of the delivered work. The mandatory no-overbooking invariant is a course-level outcome and is **not** conditional on the optional numeric profile.

1. **Pre-implementation scoped authorization (before TDD):** the independent Reviewer must review the exact current PR #15 HEAD, including this profile and the F-03 contract. If accepted, `cottonlnwza` must add a PR conversation comment containing the exact phrase `Approved for Implementation Only — Not Approved for Merge` and `Reviewed Commit SHA: <full exact HEAD SHA>`. The Author must verify the account identity and exact SHA match before starting TDD. This authorizes use of the 10-request / one-seat profile **only as an F-03 working test target**. If the Reviewer changes the number or profile, the contract AC/STS and this record must be updated on the same Draft PR before the milestone is issued. This is not a GitHub Formal APPROVE, merge permission, global SRS/System SDS approval, or instructor approval.
2. **Final working-document acceptance (after implementation):** the same PR #15 must remain Draft through TDD and implementation, then receive a separate substantive final code/test review and GitHub Formal APPROVE, be merged into `sprint_1_staging` by the teammate, and be independently verified by the Author on the merge commit. Only after that sequence is this scoped profile part of the accepted staging working baseline.

Until stage 1 is recorded and verified, the numeric profile is **PROPOSED / NOT AUTHORIZED FOR IMPLEMENTATION**; the mandatory no-overbooking invariant remains required. After stage 1 but before stage 2, the numeric profile is **AUTHORIZED FOR F-03 IMPLEMENTATION ONLY / NOT FINALLY ACCEPTED**. Neither stage approves the full SRS/System SDS or instructor baseline.

| Review item | Status at this revision |
|---|---|
| Existing 10-request profile retained as a proposal | Confirmed for F-03 draft, 2026-11-06 |
| Exact-HEAD pre-implementation Reviewer milestone | Pending; no qualifying comment recorded |
| Author verification of Reviewer identity and exact HEAD SHA | Pending |
| Final Formal APPROVE, staging merge and Author verification | Pending after implementation |
