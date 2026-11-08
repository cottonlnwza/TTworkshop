# Merge, Integration, Kanban and Release Rules

Read root \`AGENTS.md\` and \`ISSUE-PR-POLICY.md\`, plus applicable mode policy and approved official course/repo release sources. The default path is:

\`feature or docs branch → PR to sprint_N_staging → independent peer review → teammate merge → Author post-merge verification → original Issue completion\`

A separate authorized release/integration Issue with independently reviewed release PR is required for \`sprint_N_staging → main\` when the agreed workflow calls for release. No direct unreviewed push or self-merge to \`main\`. Do not infer deploy or production readiness from staging merge.

## Before approve/merge
- Verify the exact reviewed HEAD, applicable AC/STS/DoD, actual tests and evidence, independent reviewer and all blocking review threads.
- Developer/Reviewer must complete in-scope current-status documentation in the same work PR; only genuinely future merge facts belong in post-merge Issue evidence.
- No unstated instructor approval, global SRS/SDS approval, hosted CI or cloud deployment claims.

## Post-merge
- Verify actual merged commit and target branch/head (may have advanced after merge), and that intended feature tree/content is integrated. Run required Author tests against the merged code with isolated test DB, and report commands, environment, SHA, counts and limits.
- In original Issue record completion evidence, update evidenced checklist and Project #4 Status/Period with read-back, and close only after separately authorized completion gates. An approved PR or merge alone is not \`Done\`.
- If post-merge tests FAIL, report the exact regression and issue state; a genuine new repository edit after a merged work PR requires a separately approved bounded fix Issue/PR, not a second PR under the previous Issue. Do not manufacture a fix ticket for historical snapshots or tracker-only status completion.
- Release Auditor uses verified live artifacts (Issue, PR, merged staging commit, applicable acceptance tests, versioned course deliverables and real deployment evidence); report \`READY / BLOCKED / NOT VERIFIED\`, never invent successful deployment.
