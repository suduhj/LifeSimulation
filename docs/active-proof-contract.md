# Active Proof Contract: Story Asset Budget

## Status

- Phase: Verification
- User confirmed: yes
- Confirmed at: 2026-06-21
- Branch: `codex/story-asset-budget-repair`
- Latest user instruction: only Story Asset Budget; do not implement a new annual director, Yearly Outcome Ledger, opening variation, or attribute system changes.

## 1. Intent Lock

- User-visible result that must change:
  - White deer, back mountain, jade token, booklet, mine, scripture pavilion, sect, spirit beast, and similar old assets cannot repeatedly take over yearly main events.
  - Old adventure assets may appear only as budgeted background echoes.
  - Choices must not keep driving the player back to old assets when the yearly curriculum is about a human-life change.
  - Violating old-asset text must not enter ordinary `PlayerView.timeline`, `currentScene`, or `choices`.
- Not the goal:
  - Do not implement a new annual director.
  - Do not implement Yearly Outcome Ledger.
  - Do not rewrite the 0-6 opening variation system.
  - Do not redesign the attribute system or attribute panel.
  - Do not rely on prompt wording alone.

## 2. Stage Lock

- Current phase: Repair.
- Normal in this phase:
  - Story Asset Lifecycle, AnnualFactPackage asset roles, Observable Scene, SceneComplianceValidator, LifeNode, and PlayerView already exist.
  - The task is to make the asset budget authoritative on the real user path and prove old paths are blocked.
- Actual bug:
  - `assetRoles` can remain advisory unless `AnnualAgenda`, validators, LifeNode validation, and PlayerView projection all enforce it.
  - A polluted or unvalidated LifeNode can still carry old-asset text toward ordinary PlayerView unless `LifeNodeValidator` and Player Surface projection reject it.
  - Prompt-only asset instructions are not sufficient proof.

## 3. Failure Lock

- Current observable failure:
  - Old assets can open the annual body, appear in multiple sentences, drive all choices, or become yearly pressure even when the curriculum slot is unrelated.
  - Directly polluted LifeNodes may bypass response validators.
- Success condition:
  - Old assets cannot appear in the first paragraph when budgeted as background-only.
  - Old assets can appear in at most one body sentence when budgeted as a background echo.
  - Old assets cannot drive choices.
  - An asset with a recent `primary_driver` spotlight cannot become `primary_driver` again during cooldown.
  - If the current `curriculumSlot` is not about that asset, the asset cannot become the main pressure.
  - `LifeNodeValidator` rejects asset-budget violations.
  - Ordinary `PlayerView` rejects or preserves a previous safe view instead of showing polluted budget violations.
- Acceptance entry point:
  - `createPlaySession` / `handlePlayerInput`
  - `applyAiResponseToRun`
  - `projectPlayerSurface` / `buildPlayerViewSnapshot`
  - ordinary web `playerView`
  - eventLog replay / saved JSON

## 4. Path Lock

- Old Source -> Transform -> Sink:
  - `storyState.assetLedger`, old facts, old threads, or recent topic profile
  - -> `buildAnnualFactPackage()`
  - -> `assetRoles` inside annual facts
  - -> `compileSceneObject()` / `observableScene.backgroundEchoes`
  - -> AI/mock `playerText` and `choices`
  - -> partial `assertStoryContract()` / `validateSceneCompliance()`
  - -> `buildLifeNodeFromResponse()`
  - -> `life.node_recorded`
  - -> reducer stores `storyState.lifeNodes`
  - -> `getStoryPanelView()`
  - -> `buildPlayerViewSnapshot()`
  - -> ordinary web timeline/current scene/choices.
- Old dangerous bypass:
  - Direct or replayed `life.node_recorded`
  - -> `storyState.lifeNodes`
  - -> `LifeNodeValidator` does not check `storyAssetBudgets`
  - -> PlayerView can display old-asset budget violations.
- New Source -> Transform -> Sink:
  - StoryAssetLifecycle
  - -> StoryAssetBudget
  - -> `AnnualFactPackage.assetRoles`
  - -> `AnnualAgenda.assetRoles` / `storyAssetBudget`
  - -> sanitized AI prompt with player-visible budget constraints
  - -> AI/mock response
  - -> StoryContractValidator + SceneComplianceValidator runtime reject
  - -> LifeNodeValidator budget check
  - -> `life.node_recorded`
  - -> reducer
  - -> `storyState.lifeNodes`
  - -> Player Surface validation
  - -> ordinary PlayerView timeline/current scene/choices.
- Real user entry point:
  - `createPlaySession()`
  - `createPlaySessionAsync()`
  - `advanceOpeningSync()` / `advanceOpeningAsync()`
  - `handlePlayerInput()` / `handlePlayerInputAsync()`
  - `createWebSessionStore().startRun()` / `submitAction()`

## 5. Authority Lock

- Single correct authority:
  - Old asset eligibility and yearly role: StoryAssetLifecycle / StoryAssetBudget.
  - Annual contract carrier: AnnualAgenda asset budget fields.
  - Player-visible admission: SceneComplianceValidator + LifeNodeValidator + Player Surface validation.
  - Ordinary display: LifeNode -> PlayerView.
- Old sources that must lose authority:
  - AI raw `playerText`.
  - AI raw `choices`.
  - `eventHistory`.
  - Prompt-only avoidance.
  - Unvalidated `storyState.lifeNodes`.
  - Old threads/facts directly turning an old asset into the yearly main pressure.

## 6. Replacement Lock

| New or changed item | Old path replaced | Old path handling |
| --- | --- | --- |
| explicit StoryAssetBudget object | loose `assetRoles` without yearly contract authority | migrate |
| `AnnualAgenda.assetRoles/storyAssetBudget` | annual agenda not carrying asset budget | migrate + test-block |
| prompt-safe asset budget view | raw/internal asset budget fields in AI context | disable + test-block |
| SceneCompliance budget death tests | prompt-only old-asset avoidance | runtime reject + test-block |
| LifeNodeValidator budget checks | polluted LifeNodes accepted despite asset budget violations | runtime reject + test-block |
| PlayerView polluted LifeNode rejection | old-asset violations reaching ordinary UI | runtime reject + test-block |
| asset spotlight replay proof | temporary runtime-only cooldown | migrate + test-block |

## 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| old assets cannot open first paragraph | death test with background-only asset in first paragraph | validator error |
| old assets can appear at most one sentence | death test with two asset-bearing sentences | sentence budget error |
| old assets cannot drive choices | death test with choices all centered on old asset | choice-driver error |
| recently primary asset cannot be primary again | death test seeded asset ledger age N then annual package N+1 | `assetRoles` / budget role |
| unrelated curriculum cannot use old asset as main pressure | death test with `learning_path` + old asset main pressure | contract/scene validation error |
| LifeNodeValidator blocks budget violation | death test polluted LifeNode with `storyAssetBudgets` | `validateLifeNode().ok === false` |
| polluted LifeNode cannot affect PlayerView | death test through `projectPlayerSurface()` | rejected view or previous safe view |
| AI prompt is sanitized | death test serializing annual provider prompt | no raw budget ids/fields such as `assetRoles`, `primary_driver` |

## 8. Scope Lock

- Allowed changes:
  - `src/story-asset-lifecycle.js`
  - `src/annual-state-transition.js`
  - `src/observable-year-delta.js`
  - `src/scene-object-compiler.js`
  - `src/scene-compliance-validator.js`
  - `src/story-contract-validator.js`
  - `src/life-node-validator.js`
  - `src/life-node.js`
  - `src/player-surface-projector.js` or `src/player-surface-validator.js` only to block polluted LifeNodes from ordinary PlayerView
  - domain event / reducer / story-state wiring only if required for asset budget replay
  - tests for Story Asset Budget and PlayerView old-asset pollution
  - docs and dev log
- Forbidden changes:
  - New annual director.
  - Yearly Outcome Ledger.
  - 0-6 opening variation.
  - Attribute growth/type system.
  - Broad UI redesign.
  - Direct merge to `main`.
- Not handled in this task:
  - New content pool writing.
  - Full semantic 70/30 classifier.
  - World-specific story expansion.
- If a new issue is discovered:
  - Record it as follow-up and do not expand this task without a new confirmed Proof Contract.

## 9. Delivery Lock

Final response must include:

- Replacement Matrix.
- Death tests with red and green evidence.
- Evidence package.
- Modified files.
- Actual user entry verification.
- Unhandled items.

## Death Tests

- [x] recently primary old asset cannot become primary again during cooldown.
- [x] AnnualAgenda carries asset budget fields.
- [x] first paragraph old-asset violation is rejected.
- [x] old asset exceeding one sentence is rejected.
- [x] old asset choice-driver violation is rejected.
- [x] unrelated curriculum + old asset main pressure is rejected.
- [x] LifeNodeValidator rejects `storyAssetBudgets` violations.
- [x] polluted LifeNode cannot reach ordinary PlayerView.
- [x] annual provider prompt does not expose raw asset budget internals.

## Implementation Checklist

- [x] Write death tests.
- [x] Run death tests and capture RED evidence.
- [x] Make StoryAssetBudget explicit and carried by AnnualAgenda.
- [x] Enforce budget in scene/story validators.
- [x] Enforce budget in LifeNode validation.
- [x] Ensure PlayerView rejects polluted LifeNode path.
- [x] Sanitize prompt budget fields.
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
