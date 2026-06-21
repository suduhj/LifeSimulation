# Active Proof Contract

## Status

- Phase: Verification
- User confirmed: yes
- Confirmed phrase: `确认 Proof Contract，开始实现`
- Created at: 2026-06-21
- Branch at repair time: `codex/yearly-outcome-ledger-v1-repair`
- Latest user instruction: only Yearly Outcome Ledger v1; do not implement annual director; do not implement old asset budget.

## Proof Contract: Yearly Outcome Ledger v1

### 1. Intent Lock

- User-visible result that must change:
  - When an annual year advances, the system must record a `YearlyOutcome`.
  - That `YearlyOutcome` must create domain events, including `annual.outcome_recorded` and `growth.evidence_added`.
  - When applicable, it must also create `growth.exposure_changed`.
  - The reducer must apply those events to `growthLedger`.
  - `panelViews.attributes` and ordinary Web UI attribute panel must show the updated realized/effective/exposure values from `growthLedger`.
- Not the goal:
  - Do not implement a new annual director.
  - Do not change curriculum slot selection rules.
  - Do not implement old asset budget.
  - Do not rewrite LifeNode, Player Surface, opening timeline, or prompt architecture.
  - Do not rely on AI returning `growthEvidenceChanges` as the authority for annual growth.

### 2. Stage Lock

- Current phase: MVP repair / state synchronization.
- Normal in this phase:
  - Annual fact packages may still be simple.
  - Curriculum slot selection can remain existing behavior.
  - AI/mock text can still be the renderer.
  - GM/debug paths may still expose raw run/event data.
- Actual bug:
  - Some annual-event paths can still reach `applyAiResponseToRun()` without a required engine-owned `YearlyOutcome`.
  - If AI/mock returns no `growthEvidenceChanges`, old paths can produce narrative progression without `annual.outcome_recorded`, without `growth.evidence_added`, and without a `growthLedger` update.
  - A standalone `yearly-outcome.js` module is not sufficient unless every real annual progression path is forced through it before `patchToDomainEvents()`.

### 3. Failure Lock

- Current observable failure:
  - Annual narrative can advance while the system has no authoritative annual result in `eventLog`.
  - Attribute/growth panel may remain unchanged because the chain `AnnualFactPackage -> YearlyOutcome -> statePatch.growthEvidenceChanges/exposureChanges -> DomainEvents -> reducer -> growthLedger -> panelViews.attributes -> UI` is not enforced on every user-facing annual path.
- Success condition:
  - Advancing a year from the ordinary user path records `annual.outcome_recorded`.
  - Advancing a year from the ordinary user path records `growth.evidence_added`.
  - At least one curriculum slot changes `growthLedger.realized` or `growthLedger.exposure`.
  - `panelViews.attributes` reads the updated `growthLedger` values.
  - Ordinary Web UI renders the updated attribute/current/focus values from `session.panelViews.attributes`.
- Acceptance entry point:
  - API/store: `createWebSessionStore().startRun()` and `createWebSessionStore().submitAction()`.
  - Runtime: `applyAiResponseToRun()` -> `patchToDomainEvents()` -> `transitionRun()` -> `reduceRunEvent()`.
  - Projection: `buildPanelViews()` -> `getAttributePanelView()`.
  - Ordinary UI sink: `web/app.js` rendering `session.panelViews.attributes` and `session.run.panelViews.attributes`.
  - Replay/reload: saved `eventLog` replay through reducer must preserve `yearlyOutcomes` and growth changes.

### 4. Path Lock

#### Current Annual Event Source

- `src/play-session.js`
  - `createPlayableSession()` currently calls `generateMockLifeEvent()` and then `applyAiResponseToRun()` directly.
  - `createPlayableSessionAsync()` currently calls `safeGenerateLifeEvent()` and then `applyAiResponseToRun()` directly.
  - `advanceOpeningSync()` currently calls `generateMockLifeEvent()` and then `applyAiResponseToRun()` directly for the first playable branch.
  - `advanceOpeningAsync()` currently calls `safeGenerateLifeEvent()` and then `applyAiResponseToRun()` directly for the first playable branch.
  - `resolvePlayerActionSync()` and `resolvePlayerActionAsync()` already use `buildContractedMockLifeEvent()` / `buildContractedProviderLifeEvent()`, which call `buildNextEventContract()` and `applyAnnualFactPackageToResponse()`.
- `src/narrative-director.js`
  - `buildNextEventContract()` calls `buildAnnualFactPackage()`.
- `src/annual-state-transition.js`
  - `buildAnnualFactPackage()` creates the current annual fact package.
  - `applyAnnualFactPackageToResponse()` currently builds a `YearlyOutcome` and appends it to `statePatch`.
- `src/yearly-outcome.js`
  - `buildYearlyOutcome()` maps curriculum slots to `growthImpact`.
  - `applyYearlyOutcomeToResponse()` appends `growthEvidenceChanges`, `exposureChanges`, and `yearlyOutcomes`.

#### Current Break In AI/statePatch/growthLedger Chain

- The chain is enforced only when `applyAnnualFactPackageToResponse()` is called.
- `applyAiResponseToRun()` accepts any validated response and immediately calls `patchToDomainEvents()`.
- `patchToDomainEvents()` converts existing `statePatch.yearlyOutcomes`, `statePatch.growthEvidenceChanges`, and `statePatch.exposureChanges`; it does not synthesize a missing `YearlyOutcome` from an annual response.
- Therefore old direct annual paths can bypass `YearlyOutcome` entirely:
  - raw AI/mock `statePatch` with no annual outcome stays authoritative;
  - `growth.evidence_added` is absent if AI/mock did not provide growth evidence;
  - `growthLedger` does not change;
  - attribute panel has no updated values to show.

#### Current Attribute Panel Source

- `src/selectors/attribute-panel-selector.js`
  - `getAttributePanelView(run)` reads `run.player.growthLedger.attributes` first.
  - Attribute cards use `ledger.effective`, `ledger.realized`, `ledger.potential`, and `ledger.exposure`.
- `src/selectors/index.js`
  - `buildPanelViews(run)` returns `{ attributes: getAttributePanelView(run) }`.
- `src/web-session-store.js`
  - `serializeSession()` exposes `panelViews` and `run.panelViews` for ordinary browser panels.
- `web/app.js`
  - `currentPanelViews()` reads `session.panelViews` and `session.run.panelViews`.
  - `renderRunFromPlayerSurface()` calls `renderSummaryAttributes(panelViews?.attributes, ...)`.
  - `renderSummaryAttributes()` calls `renderAttributeGrowthPanel()` when selector groups are present.
  - `renderAttributeGrowthCard()` renders current/manifested/sealed/exposure labels from selector card data.

#### Old Source -> Transform -> Sink

- Old Source:
  - AI/mock annual `response.statePatch` and direct annual event paths in `play-session.js`.
- Old Transform:
  - `applyAiResponseToRun()` -> `patchToDomainEvents()` converts only what the raw patch already contains.
  - Missing `yearlyOutcomes` means no `annual.outcome_recorded`.
  - Missing `growthEvidenceChanges` means no `growth.evidence_added`.
- Old Sink:
  - `run.player.growthLedger` remains unchanged.
  - `buildPanelViews().attributes` sees unchanged ledger values.
  - `session.panelViews.attributes`, `session.run.panelViews.attributes`, and ordinary Web UI show unchanged attribute/growth panel values.

#### New Source -> Transform -> Sink

- New Source:
  - `AnnualFactPackage` is the source for annual system result.
- New Transform:
  - Every user-facing annual event must be wrapped by `applyAnnualFactPackageToResponse()` before `applyAiResponseToRun()`.
  - `buildYearlyOutcome()` creates the authoritative annual result.
  - `applyYearlyOutcomeToResponse()` appends `statePatch.yearlyOutcomes`, `growthEvidenceChanges`, and `exposureChanges`.
  - `patchToDomainEvents()` emits `annual.outcome_recorded`, `growth.evidence_added`, and, when present, `growth.exposure_changed`.
  - `run-reducer.js` applies growth events to `growthLedger`, then recalculates and syncs attributes.
- New Sink:
  - `growthLedger` is updated by reducer events.
  - `getAttributePanelView()` reads updated ledger values.
  - `panelViews.attributes` carries updated values into ordinary session serialization.
  - ordinary Web UI renders those values from selector panel views.

#### Real User Entry Point

- Browser/API ordinary path:
  - `/api/run/start` -> `createWebSessionStore().startRun()`
  - `/api/run/action` -> `createWebSessionStore().submitAction()`
  - returned payload includes `panelViews` and `run.panelViews`
  - ordinary UI renders `panelViews.attributes`

### 5. Authority Lock

- Single correct authority:
  - Annual growth/result authority: `YearlyOutcome`.
  - Persistent truth: domain events in `eventLog`.
  - Current state: reducer-produced `run.player.growthLedger`.
  - Ordinary display: `panelViews.attributes`.
- Old sources that must lose authority:
  - AI/raw `statePatch.growthEvidenceChanges` as the only annual growth authority.
  - Raw `manifestationChanges` as annual growth authority.
  - Raw `attributeChanges` as annual curriculum-growth authority.
  - Direct `generateMockLifeEvent()` / `safeGenerateLifeEvent()` annual paths that skip `AnnualFactPackage`.
  - UI fallback reading raw `run.player.attributes` when selector panel data is available.

### 6. Replacement Lock

| New or changed item | Old path replaced | Old path handling |
| --- | --- | --- |
| Engine-owned `YearlyOutcome` for each annual event | AI/mock raw annual `statePatch` as sole annual result source | migrate + test-block |
| Contracted annual response wrapper before `applyAiResponseToRun()` | Direct `generateMockLifeEvent()` / `safeGenerateLifeEvent()` annual paths in `play-session.js` | migrate |
| Required `statePatch.yearlyOutcomes` for annual events | Annual response with no `annual.outcome_recorded` | runtime reject or test-block |
| `growthEvidenceChanges` synthesized from curriculum slot | AI returning no growth patch causing no yearly growth | migrate + death test |
| `growth.exposure_changed` from yearly outcome exposure impact | Exposure changing only if AI raw patch happens to include it | migrate + death test |
| Reducer-applied `growthLedger` | UI or selectors inferring annual growth from text/raw attributes | disable + test-block |
| `panelViews.attributes` as ordinary UI source | Web UI fallback using raw `run.player.attributes` despite selector panel availability | debug-only fallback + test-block |
| Replay of `annual.outcome_recorded` and growth events | Story snapshot-only annual outcome that disappears or is ignored on replay | migrate + death test |

Allowed handling: delete / disable / migrate / debug-only / runtime reject / test-block.

### 7. Proof Lock

| Goal | Proof method | Evidence |
| --- | --- | --- |
| Advancing one year records `annual.outcome_recorded` | Death test through ordinary/session or transition path that previously skipped `applyAnnualFactPackageToResponse()` | Red failure before fix; green after fix |
| Advancing one year records `growth.evidence_added` | Death test with AI/mock response whose growth patch is empty | Red failure before fix; green after fix |
| A curriculum slot changes `growthLedger.realized` or `growthLedger.exposure` | Death test comparing before/after ledger values after transition | Red/green output and ledger fragment |
| `panelViews.attributes` shows updated values | Death test building selector after transition and comparing card values | Red/green output and panel fragment |
| Ordinary UI attribute panel shows updated values | Death test through `createWebSessionStore()` returned `panelViews.attributes`; static/UI render check for `renderAttributeGrowthPanel()` source | Red/green output and UI/panel fragment |
| Old annual raw path cannot bypass YearlyOutcome | Death test exercises direct annual source path and asserts eventLog contains annual/growth events | Red/green output |
| Replay/reload preserves yearly outcome and growth | Death test replaying eventLog or save/load and comparing `storyState.yearlyOutcomes` + ledger values | Red/green output |

### 8. Scope Lock

- Allowed changes:
  - `docs/active-proof-contract.md`
  - `src/yearly-outcome.js`
  - `src/annual-state-transition.js`
  - `src/play-session.js`
  - `src/domain/events/patch-to-events.js`
  - `src/domain/reducers/run-reducer.js`
  - `src/story-state.js`
  - `src/selectors/attribute-panel-selector.js` only if selector fails to read updated ledger values
  - `web/app.js` only if ordinary UI bypasses `panelViews.attributes`
  - Tests for yearly outcome ledger, annual growth impact, selector/panel sync, ordinary web/player surface entry, replay/reload
  - Documentation and dev log for this repair
- Forbidden changes:
  - Annual director or curriculum selection redesign.
  - Old asset budget.
  - Opening timeline changes.
  - LifeNode architecture rewrite.
  - Prompt/AI provider broad rewrite.
  - Attribute type-system changes unrelated to proving yearly outcome drives the panel.
  - Direct push to or merge into `main`.
- Not handled in this task:
  - Repetition of annual topics.
  - Back mountain / white deer / jade token budget.
  - 0-6 opening variation.
  - Full UI redesign of the growth panel.
- If a new issue is discovered:
  - Stop expanding scope.
  - Record it as follow-up.
  - Continue only if it blocks the locked YearlyOutcome Source -> Transform -> Sink proof.

### 9. Delivery Lock

Final response must include:

- Replacement Matrix.
- Death tests, with red and green evidence.
- Evidence package.
- Modified files.
- Actual user entry verification.
- `eventLog` fragment containing `annual.outcome_recorded` and `growth.evidence_added`.
- `growthLedger` before/after fragment.
- `panelViews.attributes` fragment showing updated values.
- Ordinary UI evidence or `smoke:web` evidence.
- Unhandled items.
- PR link if implementation proceeds after confirmation.

## Death Tests Planned

- [ ] Advancing one year through the actual user/session path records `annual.outcome_recorded`.
- [ ] Advancing one year through the actual user/session path records `growth.evidence_added`.
- [ ] AI/mock returning no growth patch still receives engine-owned yearly growth from curriculum slot.
- [ ] At least one curriculum slot changes `growthLedger.realized` or `growthLedger.exposure`.
- [ ] `panelViews.attributes` reads the updated growth ledger values.
- [ ] Ordinary `panelViews.attributes` shows the updated attribute/focus values.
- [ ] Old direct annual path cannot reach ordinary user result without a `YearlyOutcome`.
- [ ] Replay/reload preserves `YearlyOutcome` and the growth ledger changes.

## Implementation Checklist

- [x] After user confirmation, create/switch to a dedicated branch for Yearly Outcome Ledger v1.
- [x] Write death tests first.
- [x] Run targeted death tests and capture red failures.
- [x] Replace direct annual response paths with the YearlyOutcome path.
- [x] Ensure missing yearly outcome on annual events is rejected or test-blocked.
- [x] Ensure reducer updates `growthLedger` from growth events.
- [x] Ensure selector/playerView/UI read updated values.
- [x] Update docs and dev log.
- [x] Run targeted tests.
- [x] Run `npm test`.
- [x] Run `npm run test:contracts`.
- [x] Run `npm run validate:data`.
- [x] Run `npm run smoke:web`.
- [ ] Push branch and create PR without merging main.

## Evidence Checklist

- [x] `git diff --stat`.
- [x] Death tests red output.
- [x] Death tests green output.
- [x] Full verification command outputs.
- [x] `eventLog` fragment with `annual.outcome_recorded`.
- [x] `eventLog` fragment with `growth.evidence_added`.
- [x] `eventLog` fragment with `growth.exposure_changed` when applicable.
- [x] `growthLedger` before/after.
- [x] `panelViews.attributes` before/after.
- [x] Ordinary user entry verification.
- [ ] Replacement Matrix in final response.
