# DEC-11 — Published workshop discovery access

> **F-03 scoped working decision — ACCEPTED for the staging delivery — 2026-11-09**
> Owner scope: [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) · Feature: F-03 · Related: FR-06, BR-01, BR-04, AC/STS-F03-01/02

## Decision

For F-03, only an authenticated user whose server-side role is `PARTICIPANT` may browse the published workshop list or published workshop details.

| Caller | `GET /api/v1/workshops` and `GET /api/v1/workshops/:id` |
|---|---|
| Anonymous | Reject with `401 UNAUTHENTICATED` |
| Authenticated `ORGANIZER` | Reject with `403 FORBIDDEN` |
| Authenticated `PARTICIPANT` | Permit published-only list/detail; never expose DRAFT or owner-private fields |

The backend derives identity and role from the existing authenticated session. A request cannot select or forge its role. For an authorized Participant, a missing or unpublished workshop returns a safe `404`; the response must not reveal a private DRAFT or distinguish another Organizer's private data.

Organizer workshop management remains in the separate F-02 Organizer endpoints. F-03 does not add a public browse mode or an Organizer-as-nonregistrant browse mode.

## Source and rationale

- The official Group Work Specification, Theme 3, requires Participants to discover events and register; it requires Organizers to publish/manage events and protect ownership. It does **not** explicitly require anonymous/public browsing.
- SRS FR-06 assigns published-workshop browsing to a Participant. BR-01 requires unauthenticated and unauthorized protected access to be rejected.
- This scoped decision keeps F-03 within the Participant workflow and avoids introducing an unapproved public-access surface. It is a team policy choice, not an instructor-mandated rule.

## Consequences for F-03

- `GET /workshops` and `GET /workshops/:id` require authenticated `PARTICIPANT` authorization.
- Anonymous list/detail attempts expect `401`; Organizer list/detail attempts expect `403`.
- AC-F03-01/02 and STS-F03-01/02 cover these role boundaries in addition to published-only visibility.
- Registration remains Participant-only as already specified by FR-07 and AC-F03-09.
- No search/filter, public catalog, or new role is introduced.

## Two-stage decision authorization and acceptance gate

This record separates permission to begin implementation from final acceptance of the delivered work. The two stages use the **same Issue #5 / PR #15**; no documentation-only merge or second PR is required.

1. **Pre-implementation scoped authorization (before TDD):** the independent Reviewer must review the exact current PR #15 HEAD, including this access proposal and the related F-03 contract. If accepted, `cottonlnwza` must add a PR conversation comment containing the exact phrase `Approved for Implementation Only — Not Approved for Merge` and `Reviewed Commit SHA: <full exact HEAD SHA>`. The Author must verify the account identity and exact SHA match before starting TDD. This authorizes this Participant-only access choice **only as an F-03 working choice for TDD/implementation**. It is not a GitHub Formal APPROVE, does not authorize merge, does not approve the global SRS/System SDS, and does not constitute instructor approval.
2. **Final working-document acceptance (after implementation):** the same PR #15 remained Draft through TDD and implementation, then received a separate substantive final code/test review and GitHub Formal APPROVE, was merged into `sprint_1_staging` by the teammate, and was independently verified by the Author on the merge commit. This sequence is complete; this scoped decision is part of the accepted F-03 staging working baseline.

Historical stage 1 was recorded by Reviewer `cottonlnwza` on PR #15 for exact HEAD `b81280e9bfbc15a4ba1b7cd4cf19e02499622b71`, and the Author verified identity and SHA equality before TDD. Stage 2 is also complete: Reviewer `cottonlnwza` submitted Formal APPROVE on exact feature HEAD `7ca586b218136a6f3f29c3652aa94541ad77a1f6`; PR #15 was merged into `sprint_1_staging` at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`; and the Author verified the merge commit. **Current status: ACCEPTED for the scoped F-03 staging delivery.** This does not approve the full SRS, System SDS, unrelated decisions, or the instructor baseline.

| Review item | Status at this revision |
|---|---|
| User authorized Participant-only as the F-03 proposal | Confirmed 2026-11-06 |
| Exact-HEAD pre-implementation Reviewer milestone | Recorded by `cottonlnwza`; reviewed SHA `b81280e9bfbc15a4ba1b7cd4cf19e02499622b71` ([comment](https://github.com/cottonlnwza/TTworkshop/pull/15#issuecomment-6690830963)) |
| Author verification of Reviewer identity and exact HEAD SHA | Verified before implementation; local branch and live remote HEAD matched at start |
| Final Formal APPROVE, staging merge and Author verification | **Complete** — [Formal APPROVE](https://github.com/cottonlnwza/TTworkshop/pull/15#pullrequestreview-5814213834) on `7ca586b218136a6f3f29c3652aa94541ad77a1f6`; merged to staging at `c6d87c80b8a0887591e80f93f6cbe24897cc07b9`; [Author post-merge verification](https://github.com/cottonlnwza/TTworkshop/issues/5#issuecomment-6724013761) |
