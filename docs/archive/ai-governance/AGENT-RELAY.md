# TTworkshop Agent Relay — Deterministic Handoff Protocol

**Policy status:** GOVERNANCE TEXT MERGED via independently approved PR #28 into `sprint_1_staging@5754f30cf61a4266ad5204a7002dd3212d5861a8`; Sprint 2 integration under Issue #34 remains subject to its own review/merge. **Controller runtime, automatic staging merge and batch execution are NOT enabled by this document**. Separate human action-specific authorization, independently verified reviews and enforced required checks remain mandatory.
**Scope:** future controlled collaboration for `cottonlnwza/TTworkshop` only. No Python Controller/GUI implementation, Lab 5 work, new Issues, `main` auto-merge or deployment under this policy proposal.

## 1. Fixed identities and source of truth

| Agent | Machine/bridge | GitHub account | Per-PR role |
|---|---|---|---|
| A | Mac / ComGu_Core | `cottonlnwza` | Developer or Reviewer |
| B | Windows / ComTon | `thananun-7203` | Developer or Reviewer |

Roles are **bound per Issue/PR**. The Developer (PR Author) and independent Reviewer MUST be different GitHub accounts. Neither agent may access or impersonate the other's authenticated account. Both students supervise/understand their work. The Controller is deterministic message transport/orchestration only; no LLM judgment, code edits, reviews, approvals, merge calls or inferred authorization. **Authoritative facts** come from authenticated user grants and live GitHub branch/PR/commit/review/check/Issue/Project read-back, not a relay message.

## 2. Batch Grant — distinct action-specific human permissions

A user-approved grant record **MUST** capture: `batch_id` (Controller assigns), human approver identity + explicit approval evidence, repository, ordered finite `issue_ids`, per-Issue requirement scope + dependencies, Developer/Reviewer GitHub identities, allowed staging target, permitted action names/principals/Issue IDs, start/expiry, retry ceiling, stop conditions, revocation handling and immutable audit entry. Accepted action labels are `IMPLEMENT`, `TEST`, `COMMIT_PUSH`, `OPEN_PR`, `SUBMIT_REVIEW`, `MERGE_STAGING`, `VERIFY_POST_MERGE`, `UPDATE_CHECKLIST`, `UPDATE_PROJECT`, `CLOSE_ISSUE`. A grant to submit review binds the Reviewer GitHub account; a grant to merge binds the independent teammate, target staging branch and current explicitly approved PR HEAD after live verification. Subgrants are separately explicit even if approved in one batch interaction.

This governance design was merged as policy text in PR #28, but **no Controller runtime, automatic staging merge, or blanket grants are activated**. Existing individual Review/Merge/Closure permissions prevail until separate implementation, enforced protections and explicit human grants are independently verified. A human may revoke/pause at any time. Any Issue not named in the batch, new scope, `main`, release tag, deploy, submission or new batch needs new explicit approval. No Controller decision creates permission.

## 3. Handoff payload and Controller envelope

**Agent-created payload MUST NOT contain** `MESSAGE_ID`, `SEQUENCE` or `DELIVERY_STATE`. The Controller validates the payload and adds a durable metadata envelope **before delivery**. Fields marked `nullable` use JSON `null` for a root message; `REPLY_TO` must be an existing message ID for replies. Schema validation (JSON Schema or an equivalent strict validator) must reject unknown mandatory values, invalid GitHub accounts/roles and malformed SHA before routing.

**Authoritative logical schema** (illustrative values, not a sent message or approval):

```json
{
  "MESSAGE_TYPE": "HANDOFF",
  "FROM_AGENT": "A",
  "FROM_GITHUB": "cottonlnwza",
  "FROM_ROLE": "DEVELOPER",
  "TO_AGENT": "B",
  "TO_GITHUB": "thananun-7203",
  "TO_ROLE": "REVIEWER",
  "REPOSITORY": "cottonlnwza/TTworkshop",
  "ISSUE": 7,
  "PR": 13,
  "COMMIT_SHA": "<verified-40-character-git-sha>",
  "STATUS": "READY_FOR_REVIEW",
  "COMPLETED": ["Implemented scoped feature", "Added required tests"],
  "TEST_RESULTS": [{"command":"npm test", "passed":12,"failed":0,"skipped":0,"environment":"isolated"}],
  "EVIDENCE": [{"kind":"PR","url":"https://github.com/cottonlnwza/TTworkshop/pull/13"}],
  "REQUIRED_ACTION": ["independently review exact PR HEAD", "submit authorized formal GitHub review"],
  "NEXT_EXPECTED_STATUS": ["APPROVED", "CHANGES_REQUESTED"]
}
```

**Controller-generated envelope**, absent from Agent payload:

```json
{
  "MESSAGE_ID": "<controller-persisted-unique-id>",
  "SEQUENCE": "<controller-persisted-monotonic-integer>",
  "REPLY_TO": null,
  "BATCH_ID": "<authorized-batch-id>",
  "GRANT_ID": "<approved-action-specific-grant-id>",
  "DELIVERY_STATE": "QUEUED",
  "CREATED_AT": "<ISO-8601-UTC>",
  "ATTEMPT": 0,
  "MAX_HOPS": 12,
  "PAYLOAD": {"MESSAGE_TYPE":"HANDOFF","STATUS":"READY_FOR_REVIEW","REPOSITORY":"cottonlnwza/TTworkshop","ISSUE":7,"PR":13,"COMMIT_SHA":"<exact-validated-sha>","FROM_AGENT":"A","TO_AGENT":"B"}
}
```

**Minimum machine-validation rules:** `MESSAGE_TYPE` must equal `HANDOFF`; `STATUS` and `NEXT_EXPECTED_STATUS` must belong to declared enums; `FROM_AGENT`/`TO_AGENT` are `A`/`B` and must differ for an independent review; role must be `DEVELOPER`/`REVIEWER` and agree with live PR authorship/reviewer; `REPOSITORY` must exactly equal the approved repository, `ISSUE` must be a positive allowlisted integer, `PR` must be a live positive integer for review/merge (nullable only for pre-PR assignment), and `COMMIT_SHA` must be a valid exact verified 40-hex commit if PR already exists. `COMPLETED`, `EVIDENCE`, `REQUIRED_ACTION`, `TEST_RESULTS` must be typed arrays with validated URLs/counts; `NEXT_EXPECTED_STATUS` is a nonempty enum subset. Envelope `MESSAGE_ID` is unique, `SEQUENCE` is a persisted monotonic positive integer, `REPLY_TO` is null on root or references a known message in the same batch, `ATTEMPT` is bounded, and `DELIVERY_STATE` is one of `QUEUED`, `SENT`, `ACKNOWLEDGED`, `FAILED`, `DEAD_LETTER`. **Do not accept the illustrative SHA placeholders as actual message input.** A future implementation may express these constraints as versioned JSON Schema plus semantic GitHub/grant checks; schema validation by itself does not authorize any action.

`MESSAGE_ID`, `SEQUENCE`, `REPLY_TO`, delivery timestamps/state, idempotency keys and retry counter are Controller-owned; never have an AI guess or increment them. Sender/receiver and role bindings must agree with authenticated channels, live GitHub Author/Reviewer and the grant. Bind message to exact **repo / Issue / PR / commit** (for pre-PR assignment permit `PR:null` and documented early-phase status; **never** `READY_FOR_REVIEW` without real PR). Never send tokens, session cookies, personal secrets, real passwords or credentials. Validate content size, allowed URLs, SHA format, enum and JSON types; log only redacted metadata.

## 4. Status model, message vs GitHub action

Allowed work statuses: `READY_FOR_REVIEW`, `REVIEW_IN_PROGRESS`, `CHANGES_REQUESTED`, `APPROVED`, `BLOCKED`, `MERGED`, `ISSUE_COMPLETED`. Controller mode `WAITING_FOR_USER` means no new work is dispatched. An agent may propose a status but **controller must corroborate required real GitHub state and action receipt** before adopting it as authoritative. `APPROVED` requires exact-HEAD independently authored GitHub Formal Review ID/state; `MERGED` requires actual target commit/parents/tree; `ISSUE_COMPLETED` requires original Issue closed completed + evidence-backed AC/DoD + Project `Done`/correct Period, not merely successful message delivery.

Representative transitions:

| From | Allowed event / evidence | To |
|---|---|---|
| Assigned + valid grant | Developer PR/HEAD/evidence verified | `READY_FOR_REVIEW` |
| `READY_FOR_REVIEW` | Receiver validates active Handoff and opens live review | `REVIEW_IN_PROGRESS` |
| `REVIEW_IN_PROGRESS` | Formal GitHub `REQUEST_CHANGES` on exact HEAD | `CHANGES_REQUESTED` |
| `CHANGES_REQUESTED` | Author fixes **same PR**, commits/test/evidence new HEAD | `READY_FOR_REVIEW` |
| `REVIEW_IN_PROGRESS` | Formal independent GitHub `APPROVED` on current HEAD and no binding blockers | `APPROVED` |
| `APPROVED` | Specific `MERGE_STAGING` grant + all live release gates + independent teammate merge verified | `MERGED` |
| `MERGED` | Actual merge tested; original Issue/Project completion authorized + read back | `ISSUE_COMPLETED` |
| Any action | Invalid grant, changed SHA/policy, test/API/session failure, pause, dependency blockage | `BLOCKED` / pause state |

A new commit, changed base, revoked authorization or policy SHA change invalidates the pending state and demands revalidation; do not reuse an outdated APPROVE/READY event as a new decision.

## 5. Reliable routing, deduplication and recovery

- Maintain durable queue, per-batch ordered sequence, message/event journal and atomic persist-before-send record; acknowledge **receipt** separately from completed GitHub action. At-least-once transport is acceptable only with **idempotent** recipients/actions and dedupe by message ID + scope + SHA + action key; never double-post a Review, merge or close an Issue on retry.
- The Controller validates sender/receiver/channel/role and authorization *again at delivery*. Acknowledgement, automatic retry and receipt do not establish build/test/review/merge/Issue completion. Only authenticated GitHub read-back reconciles action state.
- Use bounded retries + exponential backoff/jitter for transient transport/API errors (respect API rate limits), then dead-letter/`BLOCKED` with visible error and human next action. No infinite ping-pong: bounded hop count, loop detection on `REPLY_TO`/status/Issue/HEAD, and max review cycles or human escalation for repeated unchanged-HEAD failures.
- Stale/out-of-order/replayed messages: compare sequence and live HEAD/base/review/grant/policy; quarantine mismatches, request a fresh Agent payload where necessary, never overwrite a newer status with an older one.
- On Controller restart, replay the durable log, reconcile queued/in-flight messages and actual GitHub state, then resume only safe unfinished actions. Actions with ambiguous outcomes need **read-back first**, not blind retries. Queue contents must be redacted and access-controlled.
- Every message must include sender/receiver GitHub IDs, Issue/PR/commit scope, completed work, actual test results/limits, source evidence, requested next action and expected status. An error is recorded with exact component, redacted code, attempts, owner and recovery instruction.

## 6. Human override and controller modes

- **`AUTO`:** route only granted actions in the named batch while all live gates pass. Do not infer permission for other work.
- **`PAUSE A` / `PAUSE B`:** stop dispatching *new* work to that Agent, preserve queue/in-flight state; the other Agent may proceed only on independent, unblocked dependencies. Do not forcibly terminate unsafe critical sections; let the current operation reach a safe checkpoint and record whether a GitHub action actually occurred.
- **`MANUAL`:** stop all automatic dispatch; preserve resumable state. User can direct Agents within their own valid authorization.
- **`RESUME`:** re-read active policy SHA, human grants, live Issue/PR/HEAD/reviews/checks/Project, pending queue/in-flight actions and dedupe state; abandon stale actions and restart only from verified safe state.
- **`STATUS`:** read-only summary of each Agent availability/mode/current Issue/PR/HEAD, queue depth, latest ACK and GitHub action receipt, pending grants, blockers and errors. No mutation.
- **Human override always wins**, including revocation/scope correction. Overrides cannot waive course review/tests or mandatory authorizations.

## 7. Staging merge conditions and stop rules

Never auto-merge `main`. For a named staging target, the independent authenticated teammate must read live target/base/HEAD, Reviewer actor, Formal GitHub approval current to HEAD, all binding threads, required checks, branch protection/ruleset enforcement, AC/STS/DoD/matrix evidence, mergeability and action-specific signed grant. **No enforceable protection/required check config = AUTO MERGE BLOCKED**; route a manual human authorization path instead. After merge verify actual SHA/parents/tree and Author post-merge tests before original-Issue completion and dispatch of next dependency.

When *every* Issue in the approved finite batch is independently verified `ISSUE_COMPLETED`, **stop issuing work**, freeze the queue, set `WAITING_FOR_USER`, and provide a single summary of Issues, PRs, Reviewed HEADs/Formal Reviews, test counts, merge SHAs and evidence. Never create new Issues or new batches automatically; any course-to-repo gap audit only proposes new work for the user to authorize.

## 8. Required implementation acceptance scenarios for a future, separately authorized Controller Issue

**Do not implement here.** A future Controller must demonstrate deterministic tests for: duplicate delivery; out-of-order/reply-before-parent; wrong receiver/account; invalid/missing grant; formal review message without actual review; new commit invalidating prior approval; missing required checks or unprotected staging; failed tests; API rate limit/timeout; PAUSE A/B and MANUAL during work; restart after ambiguous GitHub write; retry with idempotency; loop/review-cycle bound; stale policy SHA; independent Issue dependency; end-of-batch `WAITING_FOR_USER`; redaction of credentials. These are proposed future acceptance cases, not tests run in this governance audit.
