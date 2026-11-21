# C-06 candidate guard correction

## Observed failure

In [deploy run 44926944617](https://github.com/cottonlnwza/TTworkshop/actions/runs/44926944617)
the image build and migration completed. The zero-traffic revision
`ttworkshop-00009-tw2` was created but was marked `Retired` and `Active=False`;
the service still reported the prior revision as `latestReadyRevisionName`.
The verifier rejected the candidate. Traffic promotion did not run and the
previous revision continued to serve all production traffic. This is not a
successful C-06 release.

## Proposed correction

- Deploy the immutable image with `--no-traffic --tag=c06-candidate` so the
  candidate has a dedicated Cloud Run URL. The tag is externally reachable
  under the service's existing public access policy, but receives no default
  production traffic.
- Verify that the latest-created revision is the inspected candidate, its
  configured and resolved image digests match, it is Ready and Active, and it
  is not Retired. Verify that the candidate tag and HTTPS URL point to that
  revision while the old revision retains 100% of normal traffic.
- Perform read-only `/health` and `/` smoke checks through the tagged URL before
  allowing traffic promotion. Keep the existing post-promotion verification.

The staging branch did not contain the current main-only deployment workflow
or its provenance guards; this change carries those existing reviewed files
and their CI tests into staging before applying the fix. The release from
staging to main may require resolving add/add conflicts against main's existing
copies; the final release diff must retain the current main history and show
only intended changes. No historical run or Issue state is rewritten.

## Validation and remaining gates

Automated tests use synthetic API snapshots and an isolated local PostgreSQL
database; they cannot prove the new candidate is Ready on the live Cloud Run
service. The tagged-revision behavior, independent review, staging merge,
reviewed release to main, protected production run, resulting revision/digest,
and live smoke must all be verified on the actual release. C-06 remains
**NOT PASSED** until that evidence exists.
