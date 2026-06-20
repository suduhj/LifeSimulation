# Spec-to-Proof Operating System

This is a mandatory project rule for non-trivial changes. It exists to prevent fixes that add a new system beside an old broken path without proving that the old user-impacting behavior is dead.

## Mandatory Spec-to-Proof Rule

For any non-trivial fix, architecture change, AI-output change, UI-visible behavior change, persistence/replay change, state synchronization change, or repeated bug, do not implement immediately.

Every such task must follow Spec-to-Proof Operating System.

## Core Principle

Do not prove what was added.

Prove why the old wrong behavior cannot happen again.

Any new abstraction must replace, disable, migrate, isolate, or test-block an old user-impacting path. New systems that exist beside old active paths are not accepted.

## Required Flow

### 1. Proof Contract First

Before modifying code, produce a Proof Contract and wait for explicit confirmation.

The Proof Contract must include:

#### 1. Intent Lock

- What user-visible result must change?
- What is not the goal?

#### 2. Stage Lock

- Current phase: MVP / test / debug / production / refactor.
- What is normal in this phase?
- What is actually a bug?

#### 3. Failure Lock

- Current observable failure.
- Success condition.
- Acceptance entry point: UI / API / CLI / saved JSON / replay / reload.

#### 4. Path Lock

- Old Source -> Transform -> Sink.
- New Source -> Transform -> Sink.
- Real user entry point.

#### 5. Authority Lock

- The single correct authority for this behavior.
- Old sources that must lose authority.

#### 6. Replacement Lock

| New or changed item | Old path replaced | Old path handling |
| --- | --- | --- |
| TBD | TBD | TBD |

Allowed old path handling values:

- delete
- disable
- migrate
- debug-only
- runtime reject
- test-block

Not allowed:

- keep but do not use
- theoretically unreachable
- prompt will avoid it
- future work will connect it

#### 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| TBD | TBD | TBD |

#### 8. Scope Lock

- Allowed changes.
- Forbidden changes.
- Not handled in this task.
- What to do if a new issue is discovered.

#### 9. Delivery Lock

Final response must include:

- Replacement Matrix.
- Death tests.
- Evidence package.
- Modified files.
- Actual user entry verification.
- Unhandled items.

### 2. User Confirmation Required

Before the user explicitly says:

```text
确认 Proof Contract，开始实现
```

the agent must not:

- modify files
- add tests
- commit
- push
- claim implementation has started

### 3. Repair Rules

After confirmation:

1. Write death tests first.
2. Confirm death tests fail before the fix.
3. Replace the real user path.
4. Delete, disable, migrate, isolate, or test-block the old path.
5. Verify the actual user entry.
6. Provide Evidence Package.

### 4. Completion Standard

A task is not complete because:

- a module was added
- a schema was added
- a selector was added
- a validator was added
- npm test passed
- implementation looks cleaner

A task is complete only when:

- the real Source -> Transform -> Sink was identified
- the correct authority was locked
- the old path was killed or isolated
- a death test proves the old path cannot affect the user result
- the actual user entry was verified
- the Replacement Matrix is provided

## Additional Hard Gates

During Proof Contract phase, only read-only inspection is allowed.

The agent may read files, run read-only commands, and inspect logs.

The agent must not run formatting, generation, migration, build scripts that write files, or any command that mutates workspace state.

If the agent cannot identify the old Source -> Transform -> Sink, it must stop and report the gap.

It must not implement a speculative fix.

Death tests must exercise the actual acceptance entry point whenever possible.

A test that only proves the new abstraction works is not a death test.

A valid death test must show that polluted or wrong old-path input cannot affect the user-visible result.

If an old path is kept as debug-only, the agent must prove it is unreachable from the normal user entry point.

## Proof Contract Template

```markdown
# Proof Contract: <task name>

## 1. Intent Lock

- User-visible result that must change:
- Not the goal:

## 2. Stage Lock

- Current phase:
- Normal in this phase:
- Actual bug:

## 3. Failure Lock

- Current observable failure:
- Success condition:
- Acceptance entry point:

## 4. Path Lock

- Old Source -> Transform -> Sink:
- New Source -> Transform -> Sink:
- Real user entry point:

## 5. Authority Lock

- Single correct authority:
- Old sources that must lose authority:

## 6. Replacement Lock

| New or changed item | Old path replaced | Old path handling |
| --- | --- | --- |
| | | |

Allowed handling: delete / disable / migrate / debug-only / runtime reject / test-block.

## 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| | | |

## 8. Scope Lock

- Allowed changes:
- Forbidden changes:
- Not handled in this task:
- If a new issue is discovered:

## 9. Delivery Lock

Final response must include:

- Replacement Matrix
- Death tests
- Evidence package
- Modified files
- Actual user entry verification
- Unhandled items
```

