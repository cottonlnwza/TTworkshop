# DEC-11 — Published workshop discovery access

> **PROPOSED F-03 scoped decision — PENDING independent Reviewer consideration — 2026-11-06**
> Owner scope: [Issue #5](https://github.com/cottonlnwza/TTworkshop/issues/5) · Feature: F-03 · Related: FR-06, BR-01, BR-04, AC/STS-F03-01/02

## Decision proposal

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
- This proposal keeps F-03 within the Participant workflow and avoids introducing an unapproved public-access surface. It is a team policy proposal, not an instructor-mandated rule.

## Consequences for F-03

- `GET /workshops` and `GET /workshops/:id` require authenticated `PARTICIPANT` authorization.
- Anonymous list/detail attempts expect `401`; Organizer list/detail attempts expect `403`.
- AC-F03-01/02 and STS-F03-01/02 cover these role boundaries in addition to published-only visibility.
- Registration remains Participant-only as already specified by FR-07 and AC-F03-09.
- No search/filter, public catalog, or new role is introduced.

## Status and approval gate

**Status: PROPOSED / NOT APPROVED.** The user authorized this as the proposal to send for independent Reviewer consideration. It must not be treated as an accepted team decision until the Reviewer explicitly considers it and the applicable scoped document change is approved, merged into `sprint_1_staging`, and independently verified by the Author. This record does not approve the full SRS, System SDS, or instructor baseline.

| Review item | Status |
|---|---|
| User authorized Participant-only as the F-03 proposal | Confirmed 2026-11-06 |
| Independent teammate Reviewer decision | Pending |
| Staging merge and Author verification | Pending |
