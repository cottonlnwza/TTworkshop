---
name: release
description: >-
  Check independent TTworkshop staging merge gates, main release authorization
  and Author post-merge completion using actual SHA evidence.
---

# Release and post-merge completion

Follow [root AGENTS.md](../../../AGENTS.md). The PR Author can **never** merge
that PR.

## Independent staging merge

1. Re-read current Issue/PR, exact HEAD/base, independent Review identity/formal
   `APPROVED` commit, unresolved review threads, required CI, branch
   protection/rulesets, mergeability, tests, contract/AC/STS/DoD and documents.
2. Verify the **distinct named** `MERGE_STAGING` grant for the authenticated
   teammate. If any required evidence is missing, CI fails, protection blocks,
   approval is stale or any binding finding remains, STOP and report blocker.
   Missing enforcement is not a free bypass; manual fallback must be separately
   authorized **and** consistent with course/project requirements.
3. Only the independently authorized teammate merges; read back real PR merge
   SHA, target staging/tree and review history. Never infer success from an
   attempted API call.

## Author post-merge

Verify actual staging merge SHA and integrated tree; rerun applicable
build/regression/acceptance checks, record actual command/counts and evidence in
the **original Issue**. Mark only achieved AC/DoD, set Project `Done` with
Period/read-back and close the original Issue only if all acceptance and
completion permissions pass. Tracker-only changes need no new source PR.

## Main release/deployment

Require distinct authorization for staging-to-`main` release PR, tagging, GCP
deployment or high-risk billing/IAM/secrets/database changes. Never bypass
mandatory CI or teammate review. Verify versioned image, deployment revision,
persistent data, post-deploy smoke, repeatability and relevant rollback. Do not
conflate staging integration with release or course submission.
