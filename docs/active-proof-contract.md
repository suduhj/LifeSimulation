# Active Proof Contract

## Status

- Phase: Verification
- User confirmed: yes
- Confirmed phrase: `确认 Proof Contract，开始实现`
- Confirmed at: 2026-06-21
- Branch: current working branch
- Last verified commit: not recorded yet

## Proof Contract

### 1. Intent Lock

- User-visible result that must change:
  - Ordinary player 0-6 early timeline must no longer show the fixed template titles `出生底色`, `依附与感知`, `牙牙学语`, `好奇初醒`, `家庭边界`, `性格成形`, or `岔路前夜`.
  - Ordinary player timeline must be read from `LifeNode -> PlayerView`.
  - 0-6 opening text must vary by world, character/profile, attributes, and family background.
  - High and low family background must create different age-0 birth reality.
  - The three MVP worlds must produce different opening text.
  - Polluted legacy opening fallback data must not appear in ordinary PlayerView or ordinary web UI.
- Not the goal:
  - Do not change the annual director, yearly outcome ledger, growth ledger, AI provider protocol, attribute panel, or post-opening annual repetition behavior.
  - Do not introduce a large new architecture.

### 2. Stage Lock

- Current phase: MVP bugfix.
- Normal in this phase:
  - Same seed and same setup may produce stable results.
  - GM/debug data may retain legacy opening data for diagnosis.
  - Opening can remain engine-generated.
- Actual bug:
  - Ordinary player pages can still show fixed 0-6 opening template titles.
  - Per-age opening content is not fully represented as authoritative LifeNodes for the ordinary timeline.
  - Legacy `opening.earlyLifeTimeline` and web fallback paths can still influence ordinary UI.

### 3. Failure Lock

- Current observable failure:
  - Ordinary timeline shows `0 岁：出生底色`, `1 岁：依附与感知`, `2 岁：牙牙学语`, `3 岁：好奇初醒`, `4 岁：家庭边界`, `5 岁：性格成形`, `6 岁：岔路前夜`.
- Success condition:
  - Ordinary `playerView.timeline` does not contain the fixed opening template titles.
  - Ordinary `playerView.timeline` has opening LifeNodes for ages `0..firstActionAge-1`.
  - Different character/profile/allocation/familyBackground setups in the same world do not produce identical 0-6 bodies.
  - High/low family background age-0 bodies differ.
  - Cultivation, Cthulhu, and Wasteland opening bodies differ.
  - Polluted legacy opening fallback data cannot affect ordinary PlayerView or web timeline.
- Acceptance entry point:
  - API/store: `createWebSessionStore().startRun()` and `submitAction(... advance_opening ...)`.
  - Ordinary surface: `mvp.player_view.v1`.
  - UI: `web/app.js` ordinary timeline rendering.
  - Reload: `loadSession()` returning ordinary PlayerView.

### 4. Path Lock

- Old Source -> Transform -> Sink:
  - `src/opening-origin-ledger.js` `buildOpeningOriginLedger()` / `stageTitleForAge()` / `bodyForAge()` creates fixed stage titles.
  - `src/opening-sequence.js` `generateOpeningSequence()` maps origin ledger nodes into `statePatch.worldStateChanges: opening.earlyLifeTimeline`; legacy `buildEarlyLifeTimeline()` / `earlyLifeTitleForAge()` remains a fixed-title path.
  - `src/domain/events/patch-to-events.js` records `opening.origin_recorded` and only one `life.node_recorded` for the whole opening response, so per-age opening nodes do not become LifeNode authority.
  - `src/selectors/story-panel-selector.js` builds ordinary story timeline from `storyState.lifeNodes`, falling back to legacy event history if LifeNodes are absent.
  - `web/app.js` `buildOpeningTimeline()` / `openingTimelineTitleForAge()` / `openingTimelineBodyFallback()` / `buildTimelineFromLoadedSession()` can push fixed opening entries into `state.lifeTimeline`.
  - `web/app.js` `renderTimeline()` renders `state.lifeTimeline` as the ordinary UI sink.
- New Source -> Transform -> Sink:
  - Opening origin data produces player-visible opening LifeNodes without fixed template titles.
  - `patchToDomainEvents()` converts opening response per-age origin nodes into `life.node_recorded` events.
  - `run-reducer` stores those nodes in `worldState.storyState.lifeNodes`.
  - `story-panel-selector` projects timeline from `storyState.lifeNodes`.
  - `player-surface-projector` creates ordinary `playerView.timeline`.
  - `web/app.js` ordinary timeline reads `session.playerView.timeline` through `syncTimelineFromPlayerSurface()`.
- Real user entry point:
  - Browser start flow: `/api/run/start`, then `/api/run/action` with `advance_opening`, then ordinary timeline rendering from `session.playerView.timeline`.

### 5. Authority Lock

- Single correct authority:
  - Timeline content authority: `LifeNode`.
  - Ordinary player projection: `PlayerView` / Player Surface.
  - Ordinary UI may render only `PlayerView.timeline`.
- Old sources that must lose authority:
  - `opening.earlyLifeTimeline`.
  - `originLedger.nodes[].title`.
  - `openingTimelineTitleForAge()`.
  - `openingTimelineBodyFallback()`.
  - Ordinary use of `buildOpeningTimeline()`.
  - Event-history fallback in ordinary PlayerView timeline.
  - Raw `currentEvent.playerText`.

### 6. Replacement Lock

| New or changed item | Old path replaced | Old path handling |
| --- | --- | --- |
| Per-age opening LifeNodes from event conversion | `opening.earlyLifeTimeline` directly or indirectly driving ordinary timeline | migrate |
| Multiple `opening_year` LifeNodes | One opening preview LifeNode representing all 0-6 years | migrate |
| PlayerView timeline from LifeNodes only | `story-panel-selector` eventHistory fallback in ordinary surface | disable + test-block |
| Web ordinary timeline from `session.playerView.timeline` only | `web/app.js` ordinary `buildOpeningTimeline()` fallback | runtime reject + test-block |
| Origin ledger stage titles | Fixed player-visible opening titles | debug-only + test-block |
| Legacy `buildEarlyLifeTimeline()` path | Old hardcoded per-age opening templates | delete or debug-only |
| Player surface validation/static tests | Polluted old opening fallback entering ordinary UI | runtime reject + test-block |

Allowed handling: delete / disable / migrate / debug-only / runtime reject / test-block.

### 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| PlayerView does not show fixed opening titles | Death test through `startRun` / `advance_opening`, scanning `playerView.timeline` | Red/green test output |
| Same-world different setups vary 0-6 opening bodies | Death test comparing timeline bodies for different setup inputs | Red/green test output |
| High/low family background age-0 bodies differ | Death test comparing age-0 bodies | Red/green test output |
| Three worlds produce different opening bodies | Death test over cultivation / cthulhu / wasteland | Red/green test output |
| Polluted legacy fallback is unreachable | Death test injecting polluted `opening.earlyLifeTimeline` and legacy data before PlayerView projection | Red/green test output |
| Ordinary web no longer renders old fallback | Static/death test plus `smoke:web` and screenshot | Evidence package |
| Old path handling is explicit | Replacement Matrix and diff | Final response |

### 8. Scope Lock

- Allowed changes:
  - `docs/active-proof-contract.md`.
  - Opening/LifeNode/PlayerView/timeline source files needed to replace the actual user path.
  - Opening / PlayerView / contract tests.
  - Relevant docs and `dev-logs/2026-06-21.md`.
- Forbidden changes:
  - Annual director.
  - Yearly outcome ledger.
  - Growth ledger.
  - AI provider protocol broad rewrite.
  - Attribute panel behavior.
  - Post-opening repetition systems.
  - Direct merge to main.
- Not handled in this task:
  - 7+ annual event repetition.
  - Old asset budgets for back mountain, white deer, jade token, etc.
  - Attribute growth linkage.
- If a new issue is discovered:
  - Stop expanding scope, record it as follow-up, and do not mix it into this repair.

### 9. Delivery Lock

Final response must include:

- Replacement Matrix.
- Death tests.
- Evidence package.
- Modified files.
- Actual user entry verification.
- Unhandled items.
- PR link.

## Death Tests

- [x] Ordinary `PlayerView.timeline` must not show fixed opening template titles.
- [x] Same world with different character/attributes/familyBackground must not produce identical 0-6 opening bodies.
- [x] High and low family background age-0 birth reality must differ.
- [x] Cultivation, Cthulhu, and Wasteland opening text must differ.
- [x] Polluted old opening fallback must not appear in ordinary PlayerView or ordinary web UI.

## Implementation Checklist

- [x] Write death tests first.
- [x] Run death tests and record red failure.
- [x] Convert per-age opening origin nodes into LifeNodes.
- [x] Remove or debug-isolate fixed opening title authority.
- [x] Disable ordinary web fallback path from legacy opening templates.
- [x] Update docs and dev log.
- [x] Run full verification.
- [ ] Push branch and create PR without merging main.

## Evidence Checklist

- [x] Death tests failed before fix.
- [x] Death tests passed after fix.
- [x] `npm test`.
- [x] `npm run test:contracts`.
- [x] `npm run validate:data`.
- [x] `npm run smoke:web`.
- [x] Ordinary player entry screenshot.
- [x] `PlayerView.timeline` fragment.
- [x] `git diff --stat`.
- [ ] Replacement Matrix in final response.
