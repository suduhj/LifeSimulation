# Active Proof Contract: Annual Year Tick v2

## Status

- Phase: Repair
- User confirmed: yes
- Confirmed at: 2026-06-21
- Branch: codex/annual-year-tick-v2-repair
- Last verified commit: origin/main at branch creation

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

- Current phase: Repair.
- Normal in this phase:
  - Write death tests first.
  - Confirm death tests fail before production changes.
  - Replace the real annual event generation path.
  - Test-block or runtime-reject old repeated-topic paths.
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
  - `getStoryPanelView()` can fall back to `run.eventHistory` when `storyState.lifeNodes` is empty.
  - This can let polluted raw events reach ordinary PlayerView timeline.
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
| Life Curriculum in annual package | AI/mock freely choosing annual theme | migrate + test-block |
| Topic Ledger forbidden profiles | narrative memory or prompt hoping to avoid repetition | migrate + test-block |
| Three-Layer Focus | old consequence line stealing annual primary event | runtime reject + test-block |
| AnnualAgenda contract | loose raw event generation | migrate + test-block |
| `assertStoryContract` forbidden-topic checks | repeated forbidden topic entering timeline | runtime reject |
| curriculum/topic/agenda domain events | temporary storyState-only tracking | migrate |
| ordinary PlayerView timeline from LifeNodes | `eventHistory` raw fallback in ordinary player path | disable or runtime reject + test-block |

## 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| Ages 5-10 cover at least four distinct curriculum slots | death test through real play/session path | `storyState.curriculum.recentSlots` |
| Same curriculumSlot does not repeat consecutively | death test with seeded recentSlots | generated annual package / LifeNode metadata |
| Same topicFamily / arena / objectFocus cannot consecutively dominate | death test with seeded topicLedger and forbidden topic response | `forbiddenTopicProfiles` and validator error |
| Annual event has human-life main delta | death test response missing requiredHumanDelta | `assertStoryContract` rejection |
| Ordinary timeline displays LifeNode | death test against PlayerView snapshot | `panelViews.story.timeline` / PlayerView timeline entry source |
| Polluted raw eventHistory cannot affect ordinary PlayerView | death test with polluted eventHistory and empty/controlled LifeNodes | PlayerView timeline excludes polluted text |

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

- [ ] Ages 5-10 real play path covers at least four distinct curriculum slots.
- [ ] Consecutive annual years cannot use the same curriculumSlot.
- [ ] Seeded topicLedger blocks repeated topicFamily / arena / objectFocus dominance.
- [ ] Forbidden-topic AI/mock response is rejected before entering PlayerView timeline.
- [ ] Ordinary PlayerView timeline does not display polluted raw eventHistory fallback.
- [ ] Ordinary PlayerView timeline displays annual LifeNodes.

## Implementation Checklist

- [ ] Write death tests.
- [ ] Run death tests and capture RED evidence.
- [ ] Replace or block any old ordinary timeline fallback path found by the tests.
- [ ] Ensure real annual play path consumes AnnualFactPackage / AnnualAgenda.
- [ ] Ensure topic/curriculum records persist through DomainEvents and replay.
- [ ] Ensure validator runtime-rejects repeated forbidden topics and missing human-life delta.
- [ ] Update docs and dev log.

## Evidence Checklist

- [ ] Death tests failed before fix.
- [ ] Death tests passed after fix.
- [ ] `npm test`.
- [ ] `npm run test:contracts`.
- [ ] `npm run validate:data`.
- [ ] `npm run smoke:web`.
- [ ] Actual PlayerView entry verified.
- [ ] Replacement Matrix included.
- [ ] Unhandled items listed.
