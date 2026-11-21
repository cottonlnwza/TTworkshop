# TTworkshop Agent Relay — Deterministic Handoff Protocol

**Policy status:** Agent Relay **design text** was independently reviewed and merged in Issue #27 / PR #28 into `sprint_1_staging` and separately merged to `sprint_2_staging` through Issue #34 / PR #35; the protocol is **NOT IMPLEMENTED / NOT RUNNING**. A design merge is not a Controller deployment. Issue #45 / PR #47 proposes a separate human/chat one-time authorization amendment **targeting Sprint 2**; the new grant semantics are **NOT ACTIVE** until independently reviewed and authorized for that branch. The agreed shared policy reference remains `sprint_1_staging` unless separately changed or synchronized; a Sprint 2-only merge does not update that ref. **No Controller implementation is authorized by this text.**
**Scope:** future controlled collaboration for `cottonlnwza/TTworkshop` only. No Python Controller/GUI implementation, Lab 5 work, new Issues, `main` auto-merge or deployment under this policy proposal.

## 1. Fixed identities and source of truth

| Agent | Machine/bridge | GitHub account | Per-PR role |
|---|---|---|---|
| A | Mac / ComGu_Core | `cottonlnwza` | Developer or Reviewer |
| B | Windows / ComTon | `thananun-7203` | Developer or Reviewer |

Roles are **bound per Issue/PR**. The Developer (PR Author) and independent Reviewer MUST be different GitHub accounts. Neither agent may access or impersonate the other's authenticated account. Both students supervise/understand their work. The Controller is deterministic message transport/orchestration only; no LLM judgment, code edits, reviews, approvals, merge calls or inferred authorization. **Authoritative facts** come from authenticated user grants and live GitHub branch/PR/commit/review/check/Issue/Project read-back, not a relay message.

## 1A. Efficient agent-to-agent review loop — Issue #37 text merged; Controller runtime INACTIVE

**Intended future lifecycle (not a running Controller):** a single initial bounded human grant with separately named action/principal rights → Agent A implements/tests/evidences one Issue PR → Agent B independently reviews all six axes and records one consolidated decision → `CHANGES_REQUESTED` automatically routes actionable binding findings back to A **within the original work grant** → A corrects/retests same PR and resubmits with new HEAD → B re-reviews all six axes → actual exact-HEAD Formal `APPROVED` plus a distinct valid staging-merge grant and passing live protected gates permits B's authenticated staging merge → A validates merged SHA/tests and completes original Issue/Project under distinct valid completion grants. A message alone is **never** a Formal Review or merge.

**Signal rather than noise:** Coalesce duplicate handoffs keyed by repository/Issue/PR/HEAD/decision; no repeated ACK-as-PR-comment or re-posted status with no meaningful state change. One durable queue ACK is a delivery fact only. A new HEAD, new material evidence, binding defect or reviewer decision is meaningful and may require a fresh message. No arbitrary count limit; preserve all real audit events, bounded retry/loop detection and safe pause. Neither Agent uses the other's account, and a future relay cannot fabricate new permission, conduct review or click merge.

**Activation distinction:** The Issue #37 process-policy text and the Issue #27 Relay *design* have already been merged into the Sprint 1 policy ref. However, **no Controller/GUI, unattended execution, App/credential setup or permission change has been implemented by those documentation merges**. The separately proposed human upfront-grant amendment in Issue #45 is not active until its own independent authorized merge.

## 2. Future Controller Batch Grant — distinct action-specific permissions

**For a future Controller only**, a user-approved machine grant record **MUST** capture: `batch_id` (Controller assigns), human approver identity + approval evidence, repository, ordered finite `issue_ids`, per-Issue scope/dependencies, Developer/Reviewer GitHub identities, staging target, action/principal grants, expiry/retry/stop/revocation and audit log. Accepted labels include `IMPLEMENT`, `TEST`, `COMMIT_PUSH`, `OPEN_PR`, `SUBMIT_REVIEW`, `MERGE_STAGING`, `VERIFY_POST_MERGE`, `UPDATE_CHECKLIST`, `UPDATE_PROJECT`, `CLOSE_ISSUE`. Formal Review binds a different authenticated Reviewer; staging Merge binds the independent teammate (never the Developer PR Author), exact branch and live verified PR HEAD. Subgrants remain separate even when approved once. These Controller-generated metadata requirements do **not** apply to an ordinary human's explicit authorization in chat or the original Issue/PR while no Controller exists.

Issue #45 proposes that **one human Issue intake decision can approve several separately identified actor/action permissions** without waiting for a Controller, and that an explicit user-assigned PR review link authorizes that Reviewer's Formal Review. Only its independent governance Review and authorized Merge into `sprint_2_staging` can adopt that branch-local amendment; syncing the common `sprint_1_staging` policy ref requires a separate action. The Controller itself remains nonexistent. Until then, prior separate grants still apply. A human can revoke/pause any grant. New Issue/scope, `main`, release tag, deploy or submission need their own authorization. No Controller decision or payload creates permission.

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

Never auto-merge `main` and NEVER allow Developer to merge their own PR. For a named staging target, the independent authenticated teammate must read live target/base/HEAD, Reviewer actor, Formal GitHub approval current to HEAD, all binding threads, required checks, branch protection/ruleset enforcement, AC/STS/DoD/matrix evidence, mergeability and valid action-specific human grant. **No enforceable protection/required check config = AUTO MERGE BLOCKED.** A human-authorized independent manual path may have been explicitly granted up front under future Issue #45 policy, but cannot waive binding course gates. After a verified independent merge, only the Author handles actual post-merge checks, Project `Done` and original Issue completion under valid grants.

When *every* Issue in the approved finite batch is independently verified `ISSUE_COMPLETED`, **stop issuing work**, freeze the queue, set `WAITING_FOR_USER`, and provide a single summary of Issues, PRs, Reviewed HEADs/Formal Reviews, test counts, merge SHAs and evidence. Never create new Issues or new batches automatically; any course-to-repo gap audit only proposes new work for the user to authorize.

## 8. Required implementation acceptance scenarios for a future, separately authorized Controller Issue

**Do not implement here.** A future Controller must demonstrate deterministic tests for: duplicate delivery; out-of-order/reply-before-parent; wrong receiver/account; invalid/missing grant; formal review message without actual review; new commit invalidating prior approval; missing required checks or unprotected staging; failed tests; API rate limit/timeout; PAUSE A/B and MANUAL during work; restart after ambiguous GitHub write; retry with idempotency; loop/review-cycle bound; stale policy SHA; independent Issue dependency; end-of-batch `WAITING_FOR_USER`; redaction of credentials. These are proposed future acceptance cases, not tests run in this governance audit.
