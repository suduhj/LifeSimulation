# Technical Standards

## Goals

The technical design should make the game easy to prototype, safe to expand, and reliable when AI output is unpredictable.

## Stack Status

The full app stack is not decided yet. The current MVP tooling baseline is:

- Node.js 20+ for local data validation and tests.
- No external dependencies for the first validator.
- Runtime JSON under `worlds/` is validated by `tools/validate-world-data.mjs`.
- Playtest readiness is checked by `tools/check-playtest-readiness.mjs`.
- Final playtest acceptance should run `npm run check:playtest -- --require-ai`, `npm run check:playtest -- --live-ai-smoke`, and `npm run smoke:ai -- --required` after configuring a real provider.
- Reference schemas live under `schemas/`.
- Local provider secrets can be loaded from a project-root `.env` file through `src/env-loader.js`; explicit shell environment variables override `.env` values.
- The current program skeleton under `src/` uses no external dependencies and proves world loading, interactive setup, personality-direction selection, initial run creation, player-kept draw-5-keep-3 talents, AI/engine-generated opening sequence, initial important NPC generation, mock AI event generation, optional DeepSeek or generic OpenAI-compatible event generation, choice resolution, free-form clarification/confirmation, free-form attempted-action resolution, provider-backed ending summaries, response validation, state-patch-to-DomainEvent conversion, event-sourced run transitions, replay-first save/load, player-facing run summaries, browser playtest APIs, and interactive/scripted CLI smoke testing.

Before UI/backend implementation starts, choose:

- Target platform: web for the player-facing playtest version.
- Frontend framework, if any.
- Backend/runtime, if needed.
- AI provider strategy, including DeepSeek or compatible OpenAI-style APIs.
- Storage strategy for saves, world definitions, logs, and generated story history.

The command-line interface remains a developer/debug surface for deterministic smoke tests, scripted runs, and provider validation. It should not be treated as the final player-facing playtest surface.

## Browser Playtest Architecture

The browser playtest uses the same backend setup, play-session, provider, validation, and save/load modules as the CLI. Frontend code under `web/` is a player presentation layer and must not become an alternate game engine.

The ordinary browser flow is:

1. Identity setup.
2. Attribute allocation.
3. Talent draw.
4. Fate preview.
5. Formal life timeline from birth, including strict age-ordered early-years auto progression nodes.
6. First meaningful branch/current node.
7. Continuous life timeline.

The fate preview displays the static, spoiler-safe dossier portion of a single backend opening `life_event` with `interactionMode: "non_interactive"`, 0 choices, and no free-form input. It must not show initial important NPC lists, unexplained-detail sections, hidden hooks, or early-life auto progression. The formal life timeline then displays per-age `opening_year` LifeNodes projected into `PlayerView.timeline` from age 0 in strict age order before the first playable branch. Legacy `opening.earlyLifeTimeline` data may remain in backend/debug state, but it must not be an ordinary player UI authority. Each early-life node must match its own age. The backend must reject ordinary choice/free-form actions until the opening is advanced to the first playable branch.

Hidden opening hooks, future trigger conditions, route threads, hidden NPC identities, and unresolved-detail material must stay in backend state such as `opening.hiddenHooks`, `opening.unresolvedThreads`, or GM/debug data until the player discovers them through play.

After formal life begins, the frontend should append resolved consequences to a downward timeline and keep the next unresolved `life_event` in the bottom current node. It should not discard prior life context, duplicate the same result in a separate card, or teleport the player to an unrelated blank page.

Ordinary player-facing rendering must suppress empty event/result cards. If an AI response is missing required player-facing text for a playable response, the provider repair/validation path should repair or reject it before the frontend has to display it.

The hidden `GM / 调试` surface is a local tester tool. It may call dev-only backend APIs and display technical fields such as selected seeds, raw AI JSON, validation results, hidden NPC summaries, growth-ledger values, potential/current/realized/locked/exposure values, and world progress. Ordinary player UI must not show raw backend field names.

Ordinary browser responses must use the Player Surface runtime. The ordinary web API may return `sessionId` plus `playerView` only; raw `run`, `currentEvent`, `resolution`, `playerText`, `statePatch`, legacy `playerContract`, `panelViews`, `rawContract`, and GM/debug fields must not be serialized to the normal player entry point. Dev/GM APIs may keep raw session serialization, but that path is debug-only and must remain separate from ordinary play APIs.

Ordinary browser panels should read the Selector Graph output only after it has been projected into the safe `PlayerView` surface. The main panel reads `playerView.panels.main`, the attribute panel reads `playerView.panels.attributes`, and the story/timeline panel reads `playerView.panels.story`. Legacy `run` fields can remain as dev/debug compatibility data, but new ordinary UI work should treat `PlayerView` as the rendering contract. The ordinary attribute panel is a growth-manifestation dashboard: selector output must already group talent-core attributes, fate-foundation attributes, and cultivation/world progress, including current performance, potential, manifestation progress, age-sealed potential, and exposure labels.

## Architecture Principles

- Use Spec-to-Proof for any non-trivial fix, architecture change, AI-output change, UI-visible behavior change, persistence/replay change, state synchronization change, or repeated bug. Before implementation, produce a Proof Contract, identify the real Source -> Transform -> Sink, lock the correct authority, and wait for explicit user confirmation. New abstractions are not accepted if the old user-impacting path remains active beside them.
- Every replacement must delete, disable, migrate, isolate as debug-only, runtime reject, or test-block the old path. Do not accept "keep but do not use", "theoretically unreachable", "prompt will avoid it", or "future work will connect it" as old-path handling.
- Death tests must prove that polluted or wrong old-path input cannot affect the real user-visible result. Tests that only prove the new abstraction works are not sufficient for repeated bugs or user-visible behavior fixes.
- Build around the core loop: free player action, AI reasonable judgment, validated world-state changes, and continued life progression.
- Do not turn the game into a fixed-plot game, event-card game, or preset-route picker.
- Keep deterministic game rules separate from AI-generated prose.
- Use the Event-Sourced Life Runtime as the authoritative state-change boundary. AI, UI, mock, GM tools, and system flows may propose changes, but accepted changes must become DomainEvents and pass through `transitionRun()`.
- Treat `run.eventLog` as the long-term save authority when present. The current `run` JSON is a projection/snapshot for compatibility and debugging; it must be rebuildable with `replayRun(eventLog)`.
- Only reducers settle DomainEvents into game state, and every transition must pass invariant checks before it can be saved or displayed.
- Use projection views for consumers: PlayerView for ordinary UI, PromptView for AI context, and GMView for developer/debug surfaces. Ordinary PlayerView must not expose hidden information, raw backend IDs, or internal growth-ledger fields.
- Use the Selector Graph as the CQRS read layer for browser panels. Reducers settle DomainEvents into the authoritative run projection; selectors then derive `panelViews.main`, `panelViews.attributes`, and `panelViews.story`. Ordinary UI should render those views first and avoid duplicating attribute, story, progress, peer-evaluation, manifestation-ratio, age-seal, or exposure calculations.
- Use Canonical Life Runtime for ordinary timelines. Accepted responses must be projected into `mvp.life_node.v1`, recorded as `life.node_recorded`, merged into `worldState.storyState.lifeNodes`, and exposed through `panelViews.story.timeline`. Ordinary timelines show age plus node body, not AI `playerText.title`.
- Use Player-Safe Contract System for all ordinary player-visible browser data. `RawContract` may contain AI/provider/session raw material and is for runtime/debug only. `GMContract` may expose debug state. `CanonicalContract` contains authoritative projections such as event log, LifeNodes, Growth Ledger, yearly outcomes, and panel views. `PlayerView` / Player Surface is the ordinary UI input and may contain only header, current scene, choices, timeline, panels, visible changes, and safe public source identifiers. Ordinary rendering must call the Player Surface safety gate before displaying current scene content.
- Player Surface identifiers must be public, opaque IDs. Canonical backend IDs such as curriculum slots, annual outcome IDs, source event IDs, LifeNode IDs, raw event names, or debug source names must be hashed or replaced before entering `playerView.sourceLifeNodeIds`, `playerView.sourceEventIds`, `playerView.currentScene.nodeId`, or `playerView.timeline[].nodeId`.
- Use the Growth Ledger as the authoritative attribute-growth layer. Talent points enter potential immediately, but effective current ability comes only from realized growth, age maturity caps, temporary modifiers, and validated growth evidence.
- Keep attribute type semantics explicit in the Growth Ledger. Only `constitution` and `intelligence` are maturity-capped; `familyBackground` and `luck` are immediate reality attributes; `appearance` is not maturity-capped but is also not born fully realized. Attribute panel peer labels must use the shared attribute tier table.
- Filter starting identity seeds by final Family Background potential after allocation and kept talents are known. The world origin resolver may map fine attribute tiers into coarse origin pools, but the selected identity seed must still be compatible with the resulting family-background tier.
- Generate capability packages and developmental-expression limits from age, effective values, milestones, and world ID. AI may render these limits in prose, but it must not turn locked capabilities into facts.
- Use state-first life simulation for continuity-critical story facts: player actions first become structured intents and simulation outcomes, the engine records authoritative `worldState.storyState` facts/closed facts/thread stages/forbidden repeats, the narrative director issues an event contract for the next branch, and AI/mock providers render prose inside that contract.
- Track five lightweight story axes inside `worldState.storyState.axes`: `lifePressure`, `talentManifestation`, `npcRelationship`, `worldOpportunity`, and `choiceConsequence`. These axes are engine-owned pressure signals, not player-facing prose. Player actions and annual events may add deltas to them; the narrative director uses them to pick a primary and secondary axis for the next event contract.
- Use annual state transition packages as the default cross-year director: the engine must first produce an `annualFactPackage` with the year's primary life delta, primary/secondary axes, required state changes, background threads, and forbidden event shapes. AI/mock providers may render the package, but they must not make an ongoing thread become the year's main event unless the package selected it as the primary delta.
- Use Annual Year Tick v2 for cross-year variety: every annual package must include a `curriculumSlot`, `requiredHumanDelta`, `threeLayerFocus`, `topicProfile`, `forbiddenTopicProfiles`, and `annualAgenda`. The life curriculum slot is the year's primary subject; world flavor is secondary; old choices and long-running clues are background echoes unless the engine explicitly promotes them.
- Persist annual curriculum and topic data through the Event-Sourced Life Runtime. `worldState.storyState.curriculum`, `topicLedger`, and `annualAgendas` must be written as story-state patches, converted into DomainEvents, reduced back into the run projection, and preserved by `replayRun(eventLog)`. Do not add new annual director state only to the snapshot.
- Treat Yearly Outcome Ledger as the annual result authority. Every user-facing annual branch must pass through the annual fact package response wrapper before `applyAiResponseToRun()`: direct `generateMockLifeEvent()` / provider life-event responses are not allowed to be the sole authority for annual growth. A cross-year branch must record `annual.outcome_recorded`; curriculum impact must create growth evidence and/or exposure DomainEvents when applicable; reducers must update Growth Ledger before selectors build `panelViews.attributes`. The same accepted annual response must also record a canonical annual LifeNode so the ordinary timeline is a system projection rather than raw AI prose.
- Manage named recurring story material through Story Asset Lifecycle. Assets such as jade tokens, back mountains, scripture pavilions, mines, sects, and beasts may echo in the background after recent use, but cooldown/background-only roles must stop them from repeatedly becoming the annual primary driver.
- Treat old-asset budgets as hard scene contracts. Recurring assets such as jade tokens, back mountains, white deer, old booklets, scripture pavilions, mines, sects, and beasts can receive `maxSentences`, `cannotOpenScene`, and `cannotDriveChoices`; scene validation must reject over-budget usage.
- Sanitize provider-facing annual prompts. When an Observable Scene Object exists, the prompt should omit raw `eventGeneration`, raw `eventContract`, `annualFactPackage`, `curriculumSlot`, `threeLayerFocus`, `backgroundThreads`, `assetRoles`, and backend asset IDs, leaving only player-observable scene instructions.
- Use PromptContract for provider-facing annual observable-scene prompts. It may include safe run context, recent LifeNode summaries, visible scene deltas, and choice pressure. It must not include raw event bodies, raw `playerText`, event-history dumps, backend annual IDs, debug fields, or backend planning terms.
- Use Opening Origin Ledger for early-life variation. Early-year nodes should be generated from structured origin factors, migrated into per-age `opening_year` LifeNodes, recorded under story state, and exposed through PlayerView so later curriculum bias can reference lived origin signals. `opening.earlyLifeTimeline`, fixed stage titles, and web fallback timelines are debug/compatibility data only; do not reintroduce a fixed 0-6 template as an ordinary player timeline source.
- Use Player Experience Director to balance player-visible rhythm. Repeated pressure years should be interrupted by growth payoff, quiet recovery, relationship warmth, small victory, mystery hint, or world wonder according to recorded experience state.
- Treat AI output as untrusted content that must be validated before it changes game state.
- Real AI provider failures may fall back to local safe mock generation to keep a playtest session alive, but fallback responses must be clearly marked with `provider_fallback` in `internal.validationFlags` and must still pass the same state-patch validation path before changing the run.
- Store world lore, talent definitions, attribute rules, and event schemas as structured data.
- Use stable IDs for worlds, talents, events, NPCs, and endings.
- Make save files portable and debuggable. Save/load boundaries must validate the MVP run shape and fail clearly on malformed or structurally invalid saves. Legacy `mvp.run.v1` saves that predate the Growth Ledger should be migrated into `player.growthLedger` before strict validation. Current event-log saves should load by replay first and use the snapshot only as compatibility/debug data.
- Separate human/AI-developer design docs from runtime data. Use `.md` for world explanation and `.json` for game-readable configuration.
- Keep runtime JSON mostly ASCII and stable-ID driven when possible. Human-facing Chinese labels and prose should live in Markdown or localization tables, not inside core config fields that must validate reliably across Windows tooling.
- Player-facing CLI text, mock output, provider system prompts, docs examples, and tests must stay readable UTF-8 Chinese when they contain Chinese. Do not leave mojibake or replacement characters in files.

## Content Data Layout

Shared human-facing design rules:

- `game-design/core-rules.md`
- `game-design/attribute-system.md`
- `game-design/talent-system.md`
- `game-design/ai-generation-rules.md`
- `game-design/simulation-systems.md`

Per-world layout:

```text
worlds/<world>/
  world.md
  world.config.json
  identity-seeds.json
  talents.json
  npc-templates.json
  event-seeds.json
  faction-seeds.json
  location-seeds.json
  endings.json
  <world-specific-system>.json
```

MVP world folders:

- `worlds/cultivation/`
- `worlds/cthulhu/`
- `worlds/wasteland/`

## AI Provider Modes

The CLI defaults to `--ai mock` so the game can run offline.

Use DeepSeek with:

```powershell
$env:DEEPSEEK_API_KEY="your_api_key_here"
npm run play -- --ai deepseek
```

Optional settings:

- `DEEPSEEK_MODEL`, default `deepseek-v4-flash`
- `DEEPSEEK_BASE_URL`, default `https://api.deepseek.com`

DeepSeek mode uses the OpenAI-compatible chat completions shape and requires JSON object output. The engine validates the returned JSON before applying any state patch.

Use another OpenAI-compatible chat-completions service with:

```powershell
$env:OPENAI_COMPATIBLE_API_KEY="your_api_key_here"
$env:OPENAI_COMPATIBLE_BASE_URL="https://your-provider.example/v1"
$env:OPENAI_COMPATIBLE_MODEL="your-model-id"
npm run play -- --ai openai-compatible
```

Generic OpenAI-compatible mode intentionally requires the base URL and model to be explicit. It sends the same JSON-object prompt contract as DeepSeek mode, but omits DeepSeek-only request fields such as `thinking`.

Provider-backed play must cover `life_event`, `action_resolution`, and `ending_summary`. Mock mode may generate all three locally for offline testing, but real AI modes should not fall back to mock prose for endings.

Missing real-AI API keys do not block local file work, mock-mode development, data validation, content audits, schema tests, or provider request-shape tests. They only block live provider smoke tests that prove DeepSeek or another OpenAI-compatible service can generate valid story JSON in the local environment.

Use `npm run smoke:ai` after setting provider credentials to verify that the configured real AI service can return a valid `life_event` JSON response. Use `npm run smoke:ai -- --required` when missing provider credentials should fail the check instead of skipping.

## AI Integration Rules

AI should not directly own the authoritative game state. The game engine should provide:

- Current world context
- Selected content pool seeds, usually 1-3 relevant seeds rather than the entire pool
- Player stats and history
- World NPC template pool
- Initial important NPC count target, default 3-5
- Valid choices
- Event constraints
- Current age and permitted time-span range
- Growth Ledger snapshot: potential, realized value, current effective value, maturity cap, locked potential, evidence, milestones, and exposure values
- Capability packages and developmental-expression contracts, including allowed expressions, locked capabilities, check tags, and forbidden actions
- Identity, talents, attributes, relationships, and world-specific progression state
- Desired output schema
- Story-state contract when available: closed facts, active thread stage, next pressure, required inclusions, forbidden repeats, and choice-intent direction. The AI may render these into player-facing Chinese prose, but must not reopen a closed fact or repeat a forbidden scene skeleton.
- Annual fact package when available: yearly life-delta purpose, primary domain/type, primary axis, secondary axis, required state changes, background threads, event-shape history, and forbidden yearly event shapes. The AI may use ongoing threads as background or supporting pressure, but the package's primary delta and selected axes are the authority for what this year is about. The engine writes the annual delta and featured-axis updates back to `worldState.storyState` through a state patch; prose is never the authority for the year's facts.

AI should return:

- Narrative text
- Proposed next time span, such as one year or multiple years
- One or more story events for the time span
- Richly written choices, not one-word commands
- Exactly 3 rich player-facing choices for normal playable events by default; death, ending, clarification, forced consequence, pure display, and system-only transition responses may use 0 choices or another interaction mode
- Free-form input availability through a separate optional 4th interaction entry; AI must not output `choice_4`
- Free-form action interpretation and judgment factors
- Clarification flag for complex, high-risk, ambiguous, or world-breaking free-form input
- Engine-generated clarification requests should use `responseType: "clarification_request"`, `interactionMode: "freeform_confirmation"`, 0 choices, and no state patch side effects before confirmation
- Free-form risk band, failure reason, unexpected gain, and cost paid
- Proposed event consequences
- Ending summaries with biography text, score, ending tags, relationship summary, world progress summary, and final ending state patch when `responseType` is `ending_summary`
- Attribute change display data: change amount, current value, source type, duration type, and recovery condition
- NPC relationship display data: internal value, player-facing label, and rough display range
- NPC relationship dimensions: affinity, trust, fear, interest binding, secret leverage, plus optional world-specific dimensions
- Important NPC visible information, hidden information, and information unlock records
- Important NPC true state, known state, false beliefs, and misjudgment records
- Important NPC misjudgment risk and reduction factors
- Important NPC promotion from faction member layers, including promotion reason and memory activation
- Faction join, creation, creation-requirement check, world-specific requirement check, low-threshold faction scale check, growth axis weights, growth, stage, resource, member, base, territory, cohesion, reputation, enemy, ally, hidden agenda, and collapse-risk changes
- Proposed growth evidence, manifestation compatibility changes, and exposure changes
- Suggested choices 1/2/3
- Optional 4th-entry free-form action interpretation
- Optional world-state changes

The game engine must validate consequences before applying them.

AI may help decide pacing, event count, event content, and consequences, but the system must preserve structured state. AI output should be parsed into a schema before any state changes are applied.

The MVP AI event response contract is documented in `docs/ai-output-protocol.md`, with a reference schema in `schemas/ai-event-response.schema.json`.

The first program skeleton is documented in `docs/mvp-program-skeleton.md`.

## Content Pool Runtime Rules

Content pools are searchable seed libraries, not fixed scripts.

Runtime should:

- Store stable pool entries as structured data after review.
- Filter by world, life stage, location, identity, route tags, world progress, relationships, faction state, risk, requirements, exclusions, cooldown, and prior usage.
- Send only the most relevant 1-3 seeds to AI for a specific generation step.
- Require AI to adapt seeds to the current save instead of copying seed text.
- Allow AI to generate a reasonable event from current save context when no seed fits or when the selected event source is not `seed_pool`.
- Avoid fixed ages, fixed outcomes, fixed routes, and repeated preset-event loops unless a specific world rule or player-caused consequence justifies them.
- Keep generated final events in run history, not back in the pool.
- Use stable English IDs, tags, keys, and structured effect fields in runtime JSON. Human-facing Chinese names and prose should remain in Markdown or localization tables.

Human-readable pool rules live in `docs/content-pool-rules.md`. The current draft content lives in `docs/mvp-content-pool-draft.md` and is not runtime JSON yet.

Current runtime pool files:

- `worlds/<world>/identity-seeds.json`: starting identity seed pool with limited player visibility and backend hidden generation fields.
- `worlds/<world>/talents.json`: world-specific talent seed pool.
- `worlds/<world>/event-seeds.json`: event seed pool.
- `worlds/<world>/npc-templates.json`: NPC template seed pool.

Identity seed player-facing fields should expose only name key, short description key, possible route tags, and approximate risk. Hidden family details, true risk, special NPCs, concealed route hooks, and reveal conditions are backend-only.

Runtime content pool data should pass:

```bash
npm run validate:data
npm run audit:content -- --strict
npm run check:playtest
```

The validator enforces JSON parsing, world-folder matching, stable IDs, key enums, MVP pool minimums, and seed anchors. Reference schema: `schemas/world-content-pools.schema.json`.

## Character Setup Rules

Identity:

- Random identity lets AI generate all identity fields.
- Limited custom identity lets the player provide only name, gender, and one broad personality direction.
- Personality direction is a stable ID plus player-facing label and AI hint. MVP options are `cautious`, `ambitious`, `curious`, `empathetic`, `rebellious`, `pragmatic`, and `random`.
- AI-generated background, family, social position, and starting context must be derived from world rules, attributes, talents, and personality direction.

Attributes:

- Attribute keys are `appearance`, `intelligence`, `constitution`, `familyBackground`, and `luck`.
- `stressResilience`, `socialCharm`, and `combatAbility` are derived capabilities, not core attributes.
- Each attribute should track an engine-owned ledger entry: base, identity bonus, talent potential, growth bonus, temporary modifier, permanent modifier, potential, maturity cap, realized value, effective/current value, locked potential, milestones, evidence, and exposure.
- Attribute setup supports random rolling and free allocation.
- Free allocation has a base point cap of 20.
- Single-attribute mortal range is 0-20, with 4 as ordinary person baseline.
- Talent effects may push final attribute values above the normal allocation cap.
- Starting or mortal-stage talent-enhanced attributes may reach the 20-60 range depending on rarity and source.
- Cultivation realms, supernatural systems, divine sources, and late-game growth can exceed 60 according to scaling rules.
- Attribute values must preserve source layers: base allocation, identity bonus, talent bonus, growth bonus, temporary state modifier, and permanent injury modifier.
- AI must use the capability package and current effective value for age-appropriate narration and checks, not full potential value.
- AI may propose growth only through structured `growthEvidenceChanges`; it must not directly author `effective`, `realized`, or `maturityCap`.
- Exposure determines outside discovery, attention, protection, recruitment, research, pursuit, worship, containment, or assassination.

Talents:

- Talent draw presents 5 talents and lets the player keep 3.
- Talent pools are split into universal talents and world-specific talents.
- Talent rarity values are `common`, `fine`, `rare`, `epic`, `legendary`, and `mythic`.
- Single-talent rarity probabilities are Common 45%, Fine 28%, Rare 16%, Epic 7%, Legendary 3%, Mythic 1%.
- Talent effects must be represented as structured data where possible: attribute modifiers, route modifiers, hidden event triggers, side effects, world restrictions, and narrative tags.
- Talent effects should support starting numeric bonuses, growth multipliers, breakthrough modifiers, hidden event triggers, route changes, and side effects.
- Mythic talents should define manifestation type: immediate manifestation, stage manifestation, conditional awakening, or hidden destiny.
- Mythic talents are extremely rare and may change the whole run, but they still need structured effects so AI and deterministic rules can reference them.

Scaling:

- Total attribute tiers and realm bands are defined in `docs/talent-and-scaling-rules.md`.
- Gain impact should be calculated from both absolute value and current tier width percentage.
- Realm breakthroughs should move the player character into the next tier range instead of applying small fixed bonuses.
- Cultivation realm scaling must use order-of-magnitude jumps.

## Data Model Draft

Core entities:

- World
- PlayerRun
- PlayerCharacterProfile
- NPC
- NPCTemplate
- DerivedCapability
- AttributeSource
- AttributeChange
- AttributeChangeDisplay
- RecoveryCondition
- TemporaryState
- PermanentChange
- Identity
- AttributeSet
- AttributeLayer
- GrowthLedger
- DomainEvent
- EventLog
- RunTransition
- InvariantCheck
- PlayerView
- PromptView
- GMView
- RawContract
- CanonicalContract
- PlayerContract
- GMContract
- PromptContract
- PanelViews
- MainPanelView
- AttributePanelView
- StoryPanelView
- ReplayFixture
- GrowthEvidence
- CapabilityPackage
- DevelopmentalExpression
- PotentialValue
- RealizedValue
- EffectiveValue
- MaturityCap
- LockedPotentialValue
- ManifestedValue
- ExposureValue
- Talent
- TalentPool
- TalentEffect
- TalentRarityTable
- PowerTier
- Realm
- Breakthrough
- GrowthMultiplier
- Event
- Choice
- EventOption
- FreeformInputRule
- FreeformJudgment
- FreeformClarification
- FreeformFailureResolution
- EventResolution
- DisplayedChange
- HiddenEventContext
- InternalCheck
- FreeformAction
- Consequence
- Relationship
- RelationshipDisplay
- RelationshipDimension
- WorldSpecificRelationshipDimension
- ImportantNPCState
- ImportantNPCMemory
- ImportantNPCVisibleInfo
- ImportantNPCHiddenInfo
- ImportantNPCInfoUnlock
- ImportantNPCTrueState
- ImportantNPCKnownState
- ImportantNPCFalseBelief
- ImportantNPCMisjudgment
- ImportantNPCMisjudgmentRisk
- ImportantNPCMisjudgmentReductionFactor
- ImportantNPCGenerationRule
- ImportantNPCPromotionRule
- ImportantNPCPromotionReason
- FactionMemberLayer
- FactionMemberPromotion
- Faction
- FactionStage
- FactionMembership
- FactionCreationRule
- FactionCreationRequirement
- FactionCreationCheck
- WorldFactionRequirement
- LowThresholdFactionRule
- FactionGrowthRule
- FactionGrowthAxis
- FactionGrowthAxisWeight
- FactionResource
- FactionBase
- FactionTerritory
- FactionCohesion
- FactionReputation
- FactionHiddenAgenda
- FactionCollapseRisk
- FactionRelationship
- ScoreRecord
- EndingSummary
- BiographySummary
- RunMemory
- AccountProgression
- WorldState
- TimeStep
- Ending
- StoryState
- StoryAxis
- StoryThread
- StoryFact
- ClosedFact
- ForbiddenRepeat
- ActivePressure
- ActionIntent
- SimulationOutcome
- EventContract
- AnnualFactPackage
- AnnualAgenda
- LifeCurriculum
- CurriculumSlot
- TopicLedger
- TopicProfile
- ThreeLayerFocus
- StoryContractValidation
- OpeningOriginLedger
- StoryAssetLifecycle
- PlayerExperienceDirector
- YearlyOutcome
- ExperienceQAReport

## Testing Expectations

- `npm test` must pass for local MVP tooling.
- `npm run validate:data` must pass after runtime JSON edits.
- Unit tests for deterministic rules, talent effects, attribute calculations, and save/load.
- Regression tests for Growth Ledger behavior: talent bonuses enter potential without immediate adult effective power, maturity caps prevent infant/child overexpression, adulthood does not auto-realize all potential, `growthEvidenceChanges` is the route to realized growth, and legacy saves without `player.growthLedger` migrate on load before validation.
- Schema validation tests for AI response formats.
- Integration tests for a complete short life run.
- Regression tests for state-first continuity: closed story facts must not be reopened, forbidden scene skeletons must not repeat, and mock/provider fallback must consume the same event contract as normal generation.
- Regression tests for annual state transitions: cross-year branches must receive a new annual life delta, repeated yearly shapes across family/education/social/institution/resource/health/relationship/route/world-pressure domains must not become the year's main event again, annual facts must be written back to story state, and the validator must reject forbidden event-shape reuse.
- Regression tests for Annual Year Tick v2: ages 5-10 should cover at least four curriculum slots, curriculum/topic/agenda records must survive statePatch-to-DomainEvent replay, forbidden topic profiles must block recent arenas/objects/topic families/pressure types from returning as the main event, and story-contract validation must reject responses that ignore the curriculum slot.
- Regression tests for Yearly Outcome Ledger: annual branches must emit `annual.outcome_recorded`, growth evidence, and exposure events where applicable; real user/session paths that create the first playable branch or reload a started save must not bypass YearlyOutcome; replay must preserve yearly outcomes; Growth Ledger values must change from those events; `panelViews.attributes` must read the updated values.
- Regression tests for origin-led experience runtime: early-life bodies must vary across runs, origin factors may bias curriculum without forcing a fixed route, asset lifecycle cooldowns must block repeated primary use, and experience rhythm must avoid unbroken pressure streaks.
- Multi-run acceptance should include `node tools/experience-qa.mjs --runs 10 --age-end 12 --ai mock` before a player-facing release candidate.
- Regression tests for the Event-Sourced Life Runtime: state patches must convert to DomainEvents before mutating state, `transitionRun()` must not mutate its input run, replay must rebuild the same run from `eventLog`, illegal transitions must fail invariants, and PlayerView must remain label-first and hidden-info-free.
- Regression tests for Selector Graph panel views: main, attribute, and story panels must derive from the same run, web session serialization must expose `panelViews`, the attribute panel must expose grouped growth-manifestation cards, and ordinary frontend rendering must use `panelViews` instead of recomputing panels from raw run internals.
- Contract gate tests must run with `npm run test:contracts`. They must verify legacy PlayerContract schema/safety where retained, PlayerView schema/safety, Raw/GM debug separation, PromptContract leak prevention, web/player static forbidden-field scans, ordinary session serialization of only `sessionId` plus safe `playerView`, and Player Surface rejection of polluted old paths.
- Severe continuity or state bugs should receive replay fixtures under `tests/replay-fixtures/` and be covered by `npm run replay:bugs`.
- Manual narrative QA for tone, coherence, and replay value.

## Security And Privacy

- Do not commit real API keys.
- Keep API keys in environment variables or local-only config.
- `.env` and `.env.*` must remain ignored by git. Only `.env.example` with safe placeholder values may be committed.
- The browser/frontend must never read `.env`, receive API keys, construct provider `Authorization` headers, or call DeepSeek/OpenAI-compatible APIs directly.
- All real AI provider calls must go through the backend provider adapter, where keys stay server-side.
- Logs, diagnostics, tests, docs, and UI responses must never print real API key values. Configuration checks should report only missing/configured/placeholder status.
- Do not send unnecessary personal user data to AI providers.
- Log prompts and AI responses in development only when useful for debugging.
