# Active Proof Contract: Real Player Result Repair

## Status

- Phase: Verification
- User confirmed: yes
- Confirmed at: 2026-06-21
- Branch: `codex/story-asset-budget-repair`
- Latest user instruction: repair the real player-visible result after the three implemented stages; do not continue stage 1/2/3, do not add a new architecture.

## 1. Intent Lock

- User-visible result that must change:
  - Ordinary player text must not show contract-template or director-explanation sentences.
  - The current unresolved LifeNode must not be duplicated in the historical timeline.
  - Story Asset Budget must block old assets through annual events, action resolutions, visible changes, mock fallback, and PlayerView projection.
- Not the goal:
  - Do not implement a new annual director.
  - Do not implement a new Yearly Outcome system.
  - Do not redesign attributes.
  - Do not rewrite opening variation.
  - Do not add a new architecture beside the current PlayerView/LifeNode path.

## 2. Stage Lock

- Current phase: real page acceptance repair.
- Normal in this phase:
  - Annual Year Tick v2, Yearly Outcome Ledger, Story Asset Budget, LifeNode, and PlayerView exist.
  - The repair must replace or block old user-impacting paths.
- Actual bug:
  - `annualParagraphs()` turns structured contract fields into player prose.
  - `PlayerView.timeline` includes the latest/current LifeNode, and `PlayerView.currentScene` points to the same node.
  - Asset budgets are enforced for annual background echoes but not consistently for action-resolution prose and visible changes.
  - Mock/provider fallback can output contract explanations instead of lived narrative prose.

## 3. Failure Lock

- Current observable failure:
  - Screenshots show text such as "学习安排、师长要求或技能方向发生变化", "这件事首先改变的是你的日常节奏", "世界味道只作为背景质感", "主事件仍然是今年的人生变化", and "没有盖过今年真正的人生变化".
  - Screenshots show the same age/current node repeated above and below the loading/current separator.
  - Screenshots show old assets such as jade tokens and sect visitors still becoming pressure through player-visible results.
- Success condition:
  - Ordinary `playerView.timeline`, `playerView.currentScene`, `playerView.choices`, and visible change chips contain no contract-template sentences.
  - `playerView.timeline[].nodeId` never equals `playerView.currentScene.nodeId`.
  - Budgeted old assets cannot enter paragraphs, choices, or visible changes beyond their budget.
  - Mock/provider fallback produces player-life prose, not contract explanation prose.
- Acceptance entry point:
  - `/api/run/start`
  - `/api/run/action`
  - `createWebSessionStore().startRun()`
  - `createWebSessionStore().submitAction()`
  - `projectPlayerSurface()`
  - ordinary browser PlayerView rendering.

## 4. Path Lock

- Old Source -> Transform -> Sink:
  - `life-curriculum.requiredHumanDelta`, `observable-year-delta.SLOT_TEXT`, `worldFlavorText()`
  - -> `compileSceneObject()`
  - -> `applyAnnualFactPackageToResponse()`
  - -> `patchToDomainEvents()`
  - -> `buildLifeNodeFromResponse()`
  - -> `annualParagraphs()`
  - -> `life.node_recorded`
  - -> `getStoryPanelView()`
  - -> `buildPlayerViewSnapshot()`
  - -> ordinary web timeline/current scene.
- Old duplicate Source -> Transform -> Sink:
  - latest `storyState.lifeNodes`
  - -> `getStoryPanelView().timeline`
  - -> `buildPlayerViewSnapshot().timeline`
  - -> `buildPlayerViewSnapshot().currentScene = projectedTimeline.at(-1)`
  - -> web renders both `state.lifeTimeline` and `currentNode`.
- Old budget-bypass Source -> Transform -> Sink:
  - action result prose or visible change with jade/sect/back-mountain pressure
  - -> `buildLifeNodeFromResponse(action_resolution)`
  - -> `LifeNodeValidator` does not apply story asset budgets to visible changes
  - -> `projectPlayerSurface()`
  - -> ordinary PlayerView.
- New Source -> Transform -> Sink:
  - structured annual contract
  - -> narrative renderer/fallback prose
  - -> LifeNode with narrative body only
  - -> LifeNodeValidator rejects contract-template phrases and over-budget assets across paragraphs, choices, and visible changes
  - -> PlayerView timeline excludes currentScene
  - -> ordinary web renders historical timeline plus one current node.
- Real user entry point:
  - `createWebSessionStore().startRun()`
  - `createWebSessionStore().submitAction()`
  - browser `web/app.js` rendering of `playerView`.

## 5. Authority Lock

- Single correct authority:
  - Player-visible story prose: validated LifeNode narrative body.
  - Current unresolved scene: `PlayerView.currentScene`.
  - Historical timeline: `PlayerView.timeline`, excluding the current scene.
  - Old-asset admission: StoryAssetBudget enforced at LifeNode and Player Surface boundaries.
- Old sources that must lose authority:
  - Contract field names or contract summaries as player prose.
  - `annualParagraphs()` as a contract explainer.
  - `projectedTimeline.at(-1)` duplicated into both timeline and current scene.
  - Visible change chips as an unchecked way to grant or foreground old assets.
  - Mock fallback contract summaries.

## 6. Replacement Lock

| New or changed item | Old path replaced | Old path handling |
| --- | --- | --- |
| narrative annual LifeNode body | `annualParagraphs()` contract explanation prose | migrate + test-block |
| template-text guard | validators not detecting contract-template prose | runtime reject + test-block |
| PlayerView timeline/current split | latest node appears in both timeline and current scene | disable + test-block |
| web current entry identity preservation | currentScene-to-timeline entries lose `nodeId` and dodge dedupe | migrate + test-block |
| asset budget over visible changes | old assets foregrounded by visible change chips | runtime reject + test-block |
| action/fallback asset budget guard | action result bypasses annual budget path | runtime reject + test-block |
| fallback narrative renderer | fallback outputs contract explanation text | migrate + test-block |

## 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| PlayerView has no current/timeline duplicate | death test through `createWebSessionStore` | `currentScene.nodeId` absent from `timeline` |
| contract-template prose cannot reach PlayerView | death test through real web session and direct polluted LifeNode | no forbidden template phrases |
| LifeNodeValidator blocks template sentences | direct validator death test | `validateLifeNode().ok === false` |
| visibleChanges cannot bypass asset budget | polluted LifeNode with budget and visible change | Player Surface rejection |
| fallback/mock annual prose is narrative, not contract explanation | web-session mock/fallback death test | no template phrases after `submitAction` |
| web rendering avoids duplicate current node | static/behavior test for node identity | frontend keeps nodeId and dedupes |

## 8. Scope Lock

- Allowed changes:
  - `src/life-node.js`
  - `src/life-node-validator.js`
  - `src/player-surface-projector.js`
  - `src/scene-object-compiler.js`
  - `src/scene-compliance-validator.js`
  - `src/story-contract-validator.js`
  - `src/mock-ai.js`
  - `web/app.js`
  - tests for real PlayerView/page acceptance
  - docs and dev log
- Forbidden changes:
  - New annual director.
  - New Yearly Outcome architecture.
  - Attribute system changes.
  - Opening 0-6 variation work.
  - Broad UI redesign.
  - Direct merge to `main`.
- Not handled in this task:
  - New content pool writing.
  - Full semantic prose quality scoring.
  - Non-MVP world expansion.
- If a new issue is discovered:
  - Record it as follow-up unless it blocks the listed acceptance path.

## 9. Delivery Lock

Final response must include:

- Replacement Matrix.
- Death tests with red/green evidence.
- Evidence package.
- Modified files.
- Actual user entry verification.
- Unhandled items.

## Death Tests

- [x] ordinary PlayerView timeline must not include currentScene nodeId.
- [x] ordinary PlayerView must not contain contract-template phrases.
- [x] LifeNodeValidator must reject contract-template phrases.
- [x] Player Surface must reject old assets foregrounded through visibleChanges.
- [x] mock/provider fallback annual path must not output contract explanation text.
- [x] web current-scene timeline entry must preserve nodeId for dedupe.

## Implementation Checklist

- [x] Write death tests.
- [x] Run death tests and capture RED evidence.
- [x] Replace contract-template LifeNode prose with narrative prose.
- [x] Add template-text runtime rejection.
- [x] Split PlayerView historical timeline from current scene.
- [x] Preserve current-scene identity in frontend dedupe path.
- [x] Extend asset budget checks to visible changes/action results.
- [x] Update docs and dev log.

## Evidence Checklist

- [x] Death tests failed before fix.
- [x] Death tests passed after fix.
- [x] `npm test`.
- [x] `npm run test:contracts`.
- [x] `npm run validate:data`.
- [x] `npm run smoke:web`.
- [x] Actual PlayerView entry verified.
- [ ] Browser screenshot captured.
- [ ] Replacement Matrix included in final response.
- [ ] Unhandled items listed in final response.

## Verification Notes

- Death-test RED evidence: `node --test tests/real-player-result-repair.test.mjs` failed 5/5 before the repair on duplicate current node, template prose, missing validator rejection, visibleChanges asset bypass, and frontend nodeId loss.
- Death-test GREEN evidence: the same command passed 5/5 after the repair.
- Full verification completed on 2026-06-21:
  - `npm test`: 271 tests passed.
  - `npm run test:contracts`: 15 tests passed.
  - `npm run validate:data`: validation passed across 30 runtime data files.
  - `npm run smoke:web`: web playtest smoke passed with mock mode.
- Actual PlayerView entry evidence:
  - `currentScene.nodeId`: `node_annual_event_6_611e93862288`.
  - `currentNodeDuplicatedInTimeline`: `false`.
  - forbidden phrase hits: `[]`.
  - `currentScene.body`: `6岁这一年，一位先生、长辈或可信的大人开始更认真地看待你。\n\n那位大人不再只把你当成跟着跑的孩子，开始给你更具体的提醒，也观察你是否能稳定地回应。`
- Browser screenshot note: local Playwright is not installed and Chrome DevTools `Page` / `Runtime` automation timed out in this environment, so no screenshot file was captured for this repair.
