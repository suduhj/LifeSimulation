# Active Proof Contract: Annual Year Tick v2

## Status

- Phase: Verification
- User confirmed: yes
- Confirmed at: 2026-06-21
- Branch: `codex/annual-year-tick-v2-repair`
- Latest user instruction: only Annual Year Tick v2; do not implement Yearly Outcome Ledger; do not implement old asset budget.
- Note: `origin/main` was merged into this branch after PR creation to resolve conflicts. The active proof contract remains this Annual Year Tick v2 repair.

## 1. Intent Lock

- User-visible result that must change:
  - From age 5 through 10, annual events must not repeatedly advance the same back mountain / jade / sect topic.
  - Annual events must have a clear human-life main change.
  - Ordinary PlayerView timeline must show annual LifeNodes, not raw AI playerText or eventHistory fallback.
- Not the goal:
  - Do not implement Yearly Outcome Ledger in this task.
  - Do not implement the full old asset budget system in this task.
  - Do not change the 0-6 opening variation system in this task.
  - Do not redesign the attribute growth panel in this task.

## 2. Stage Lock

- Current phase: Verification.
- Normal in this phase:
  - Death tests have been written and red/green verified.
  - The real annual event generation path has been replaced.
  - Old repeated-topic paths are test-blocked or runtime-rejected.
- Actual bug:
  - A new curriculum/topic module existing beside the old annual path is not enough.
  - Annual events can still repeat if raw AI/mock playerText, stale topic paths, or eventHistory fallback can affect ordinary PlayerView timeline.

## 3. Failure Lock

- Current observable failure:
  - Age 7+ annual events can feel like the same back mountain / jade / sect event repeating.
  - Human-life yearly change is not guaranteed as the main event.
  - Ordinary timeline must be proven to come from LifeNode / PlayerView, not raw fallback.
- Success condition:
  - Ages 5-10 cover at least four distinct life curriculum slots.
  - The same curriculumSlot does not appear in consecutive annual years.
  - The same topicFamily, arena, or objectFocus cannot consecutively dominate annual years.
  - Annual event text and choices must satisfy the required human-life delta.
  - Ordinary PlayerView timeline displays annual LifeNodes.
  - Ordinary UI does not read AI raw playerText or eventHistory fallback.
- Acceptance entry point:
  - PlayerView snapshot.
  - Ordinary web UI.
  - eventLog replay / saved run JSON.

## 4. Path Lock

- Old Source -> Transform -> Sink:
  - `generateMockLifeEvent` or `aiProvider.generateLifeEvent`
  - -> raw AI/mock `playerText`
  - -> `applyAiResponseToRun`
  - -> `patch-to-events`
  - -> `life.node_recorded`
  - -> `storyState.lifeNodes`
  - -> `getStoryPanelView`
  - -> `buildPlayerViewSnapshot`
  - -> ordinary web timeline.
- Old dangerous fallback:
  - `getStoryPanelView()` could fall back to `run.eventHistory` when `storyState.lifeNodes` was empty.
  - That path could let raw events reach ordinary PlayerView timeline.
- New Source -> Transform -> Sink:
  - `buildNextEventContract`
  - -> `buildAnnualFactPackage`
  - -> `selectCurriculumSlot`
  - -> `buildTopicProfile` / `forbiddenTopicProfiles`
  - -> `threeLayerFocus`
  - -> `AnnualAgenda`
  - -> AI/mock renderer bound by contract
  - -> `assertStoryContract`
  - -> `applyAnnualFactPackageToResponse`
  - -> DomainEvents: `story.curriculum_recorded`, `story.topic_recorded`, `story.annual_agenda_recorded`, `life.node_recorded`
  - -> reducer
  - -> `storyState.lifeNodes`
  - -> `getStoryPanelView`
  - -> `buildPlayerViewSnapshot`
  - -> ordinary web timeline.
- Real user entry point:
  - `createPlaySession` / `createPlaySessionAsync`
  - `advanceOpening`
  - `resolvePlayerAction`
  - web UI consuming PlayerView.

## 5. Authority Lock

- Single correct authority:
  - Annual topic and yearly human-life direction: AnnualFactPackage / AnnualAgenda.
  - Ordinary player display: LifeNode -> PlayerView timeline.
- Old sources that must lose authority:
  - Raw AI/mock `playerText`.
  - `run.eventHistory` fallback for ordinary timeline.
  - Stale jade/back mountain/sect threads as annual primary drivers.
  - Prompt-only avoidance of repeated topics.

## 6. Replacement Lock

| New or changed item | Old path replaced | Old path handling |
| --- | --- | --- |
| Contracted annual play-session branches | direct `generateMockLifeEvent` / provider raw life event | migrate + test-block |
| Life Curriculum in annual package | AI/mock freely choosing annual theme | migrate + test-block |
| Active Topic Ledger annual focus selection | repeated topic only detected after selection | migrate + test-block |
| Three-Layer Focus | old consequence line stealing annual primary event | runtime reject + test-block |
| AnnualAgenda contract | loose raw event generation | migrate + test-block |
| `assertStoryContract` forbidden-topic checks | repeated forbidden topic entering timeline | runtime reject |
| curriculum/topic/agenda domain events | temporary storyState-only tracking | migrate |
| ordinary PlayerView timeline from LifeNodes | `eventHistory` raw fallback in ordinary player path | disable + test-block |

## 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| Ages 5-10 cover at least four distinct curriculum slots | death test through real play/session path | `storyState.curriculum.recentSlots` |
| Same curriculumSlot does not repeat consecutively | death test through real play/session path | `storyState.curriculum.recentSlots` |
| Same topicFamily / arena / objectFocus cannot consecutively dominate | death test with seeded topicLedger and annual package selection | `topicProfile` changes |
| Annual event has human-life main delta | story-contract tests and annual package tests | `requiredHumanDelta` / validator |
| Ordinary timeline displays LifeNode | death test against PlayerView snapshot | PlayerView timeline `nodeType: annual_event` |
| Raw eventHistory cannot affect ordinary PlayerView | death test with legacy eventHistory and no LifeNodes | PlayerView timeline empty/safe |

## 8. Scope Lock

- Allowed changes:
  - `src/life-curriculum.js`
  - `src/topic-ledger.js`
  - `src/annual-state-transition.js`
  - `src/narrative-director.js`
  - `src/story-contract-validator.js`
  - `src/selectors/story-panel-selector.js`
  - `src/player-surface-projector.js`
  - domain event/reducer code only where annual curriculum/topic/agenda/lifeNode persistence requires it
  - tests for Annual Year Tick v2 and PlayerView timeline path
  - docs and dev log
- Forbidden changes:
  - Yearly Outcome Ledger.
  - Attribute growth system.
  - Full old asset budget system.
  - Opening variation rewrite.
  - Broad UI redesign.
- Not handled in this task:
  - Asset sentence budgets.
  - Attribute panel changes.
  - 0-6 opening variation.
- If a new issue is discovered:
  - Record it as follow-up and do not expand this task unless the user explicitly confirms a new Proof Contract.

## 9. Delivery Lock

Final response must include:

- Replacement Matrix.
- Death tests with red and green evidence.
- Evidence package.
- Modified files.
- Actual user entry verification.
- Unhandled items.

## Death Tests

- [x] Ages 5-10 real play path covers at least four distinct curriculum slots.
- [x] Consecutive annual years cannot use the same curriculumSlot.
- [x] Seeded topicLedger blocks repeated topicFamily / arena / objectFocus dominance.
- [x] Forbidden-topic AI/mock response is rejected before entering PlayerView timeline.
- [x] Ordinary PlayerView timeline does not display legacy raw eventHistory fallback.
- [x] Ordinary PlayerView timeline displays annual LifeNodes.

## Implementation Checklist

- [x] Write death tests.
- [x] Run death tests and capture RED evidence.
- [x] Replace or block any old ordinary timeline fallback path found by the tests.
- [x] Ensure real annual play path consumes AnnualFactPackage / AnnualAgenda.
- [x] Ensure topic/curriculum records persist through DomainEvents and replay.
- [x] Ensure validator runtime-rejects repeated forbidden topics and missing human-life delta.
- [x] Update docs and dev log.

## Evidence Checklist

- [x] Death tests failed before fix.
- [x] Death tests passed after fix.
- [x] `npm test`.
- [x] `npm run test:contracts`.
- [x] `npm run validate:data`.
- [x] `npm run smoke:web`.
- [x] Actual PlayerView entry verified.
- [ ] Replacement Matrix included in final response.
- [ ] Unhandled items listed in final response.
