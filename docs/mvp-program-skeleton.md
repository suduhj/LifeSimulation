# MVP Program Skeleton

This document describes the first real program skeleton for the AI life simulator.

## Current Scope

The skeleton is not the full game yet. It proves the core runtime path that the future web playtest will use:

1. Load the three MVP worlds from `worlds/`.
2. Create an initial run from world, name, gender, personality direction, identity seed, rarity-weighted draw-5-keep-3 talents, player-kept 3 talents, and 20-point attributes.
3. Generate 3-5 initial important NPCs from the selected world's NPC template pool.
4. Track attribute growth through the engine-owned Growth Ledger: base, identity bonus, talent potential, growth bonus, temporary modifier, permanent modifier, potential, maturity cap, realized value, current effective value, locked potential, milestones, evidence, and exposure.
5. Generate capability packages and developmental-expression limits from age, effective attributes, milestones, and world ID so AI prose cannot treat locked potential as current ability.
6. Load world-specific event, NPC, faction, and location seed pools as searchable runtime context.
7. Select one of the seven event source types using world-specific weights.
8. Generate AI life events from either soft content seeds or open world/context rules, without treating pools as fixed scripts.
9. Validate each AI response against the MVP protocol rules.
10. Convert accepted `statePatch` changes into DomainEvents, pass them through `transitionRun()`, reduce them into the next run projection, and reject transitions that fail invariants.
11. Apply AI growth only through `growthEvidenceChanges`, which becomes a growth DomainEvent before the Growth Ledger converts it into realized growth.
12. Resolve player choices and free-form attempted actions into `action_resolution` responses with provider support.
13. Convert resolved player actions into lightweight state-first story facts: intent, simulation outcome, closed facts, thread stage, next pressure, forbidden repeat scene skeletons, and five-axis pressure deltas.
14. Track five engine-owned story axes in `worldState.storyState.axes`: life pressure, talent manifestation, NPC relationships, world opportunity, and choice consequence.
15. Generate an Annual Year Tick v2 package for cross-year branches. The package first chooses a human-life curriculum slot, then declares the yearly life delta, primary/secondary axes, required human delta, three-layer focus, topic profile, forbidden topic profiles, background threads, and required state changes before AI prose is generated.
16. Persist annual curriculum and topic data through `statePatch -> DomainEvents -> reducer -> run projection`: `storyState.curriculum`, `storyState.topicLedger`, and `storyState.annualAgendas` must survive save/load replay.
17. Generate the next playable life event from a narrative director contract. The annual fact package owns the year's main life delta, curriculum slot, and selected axes; tracked threads such as clues, family pressure, institutions, resources, and world danger can support it as background instead of replaying a settled discovery or repeated scene structure.
18. Save and load portable run JSON with MVP run-state validation. Current saves include `eventLog`; load prefers `replayRun(eventLog)` over trusting the snapshot.
19. Build PlayerView, PromptView, and GMView projections from the authoritative run so ordinary UI, AI prompts, and debug tools do not consume the same raw surface.
20. Build Selector Graph panel views from the authoritative run: `panelViews.main`, `panelViews.attributes`, and `panelViews.story` are the browser panel contract, while raw run internals stay compatibility/debug data.
21. Run a developer-facing command-line setup, event loop, status summary display, and MVP short-run ending summary.
22. Start every new life with a non-interactive opening sequence: birth background card, fate preview, and automatic early-year progression to the first meaningful branch.

The real player-facing playtest target is a web version. The current CLI is useful for engine smoke tests, scripted runs, save validation, and AI provider validation, but it should not be treated as the final playable surface for testers.

The default play mode is still local `mock` generation so the game can run offline and tests stay deterministic. Real AI generation is available through `--ai deepseek` or `--ai openai-compatible`. In real AI modes, normal life-event generation, player action resolution, and ending summaries go through the provider and must pass the same JSON validation before any state patch is applied.

If a real provider fails during a playtest turn after startup, the session falls back to the local safe generator for that specific life event, action resolution, or ending summary. This is a continuity safety net, not a substitute for real AI: fallback responses are marked with `provider_fallback` flags in `internal.validationFlags`, preserve the authoritative engine validation path, and keep the save playable instead of crashing the current life.

Event generation is not limited to fixed pool entries. Each world config defines seven weighted event sources:

- `seed_pool`
- `ai_free`
- `player_consequence`
- `npc_driven`
- `world_progress`
- `natural_life`
- `random_disturbance`

The engine selects a source each turn. Only `seed_pool` requires selected event seeds; other sources tell the AI to generate from the current save, world rules, NPCs, relationships, history, and world progress. Pool entries are open soft seeds with `strictness: "soft"` and `aiAdaptation: "must_adapt"`, so they guide style and constraints without becoming fixed scripts.

The project must keep checking the core simulator loop: free player action, AI reasonable judgment, validated world-state changes, and continued life progression. The skeleton should not evolve into a fixed-age event deck, a repeated card pool, or a preset route machine. If a content seed does not fit the current save, the AI provider context must preserve room for free generation from world rules and current life history.

## Commands

Run tests:

```bash
npm test
```

Replay saved bug fixtures:

```bash
npm run replay:bugs
```

Check event-sourced architecture guardrails:

```bash
npm run test:architecture
```

Validate runtime world data:

```bash
npm run validate:data
```

Audit content thickness against the fuller playtest target:

```bash
npm run audit:content
```

This reports gaps without failing. Use strict mode when the project is ready to make the playtest content target blocking:

```bash
npm run audit:content -- --strict
```

Check the core playtest readiness gate:

```bash
npm run check:playtest
```

This verifies package scripts, the three MVP worlds, runtime data validation, minimum content scale, core simulator systems, open event-generation rules, README quick start, and whether a real AI provider environment is configured. Missing real AI keys are reported as a warning because mock mode remains valid for offline development.

Run the browser end-to-end smoke:

```bash
npm run smoke:web
```

This starts the local web backend on an auto-selected temporary port and exercises the player-facing browser API flow: home page, world list, setup preview, run start, choice resolution, free-form attempted action, save, load, and ending. It also checks the returned HTML/API payloads for provider-key leakage patterns. For a real-provider web smoke after configuring `.env`, run `npm run smoke:web -- --ai deepseek`.

Run the browser playtest:

```bash
npm run web
```

Open `http://127.0.0.1:5181`. If port `5181` is unavailable, use the fallback URL printed by the server. Do not use port `5173` for this project because that port is reserved for `music_agent`. Do not use port `0001`/port 1 because Chromium blocks it as unsafe.

The browser UI talks to the local Node backend. AI provider keys stay in `.env` or shell environment variables on the server side; frontend files must not read `.env`, receive API keys, construct provider auth headers, or call provider APIs directly.

The ordinary browser UI is Chinese-first. Backend IDs, schema fields, selected seeds, validation flags, save paths, and provider diagnostics are not ordinary player-facing text. The frontend must localize world names, talent names, rarity labels, manifestation types, progress labels, risk labels, and summaries from stable runtime IDs. Developer-only details may live behind the developer panel, but the normal player flow should feel like a life simulator, not a JSON/debug console.

Ordinary browser panels use `panelViews` from the Selector Graph. Main status should read `panelViews.main`; current/realized/potential/locked/exposure rows should read `panelViews.attributes`; story/timeline support data should read `panelViews.story`. The web client may keep legacy `run` fallbacks for older payloads, but new ordinary UI code should not recompute panel state from `player.growthLedger`, raw `storyState`, or event-log internals.

Attribute displays must use player-facing Growth Ledger language: `当前` for current effective ability, `已兑现` for realized growth, `潜能` for total potential, `未兑现` for still-locked potential, and `关注` for exposure/attention. Ordinary UI should not show raw backend labels such as `effective`, `realized`, `maturityCap`, or `growthLedger`.

Ordinary UI must not patch missing player-visible names with generic placeholders. If a selected talent, NPC, or identity has no safe Chinese display label, the engine/frontend should repair the mapping or hide the undiscovered item instead of showing "未命名天赋", "未知天赋", "重要人物", "未知身份", "身份尚不明确", or an English backend ID.

The browser playtest creation flow is split into separate pages: identity setup, attribute allocation, talent draw, and spoiler-safe fate preview. After the player clicks `开始人生`, the formal life surface opens as a scrolling life journal starting from age 0: early-years nodes appear in strict age order, the current unresolved branch sits at the bottom, and each action resolution is written into the timeline before the next current branch is shown. This UI structure is part of the MVP skeleton because it protects the life-simulator feel from collapsing into a crowded setup/debug dashboard or repeated event-card stack.

The web playtest includes a hidden `GM / 调试` tester panel. This is a local developer/tester tool, not a formal player feature. It can apply test opening presets, add test-only talents, inject world-specific test scenarios, show hidden debug state, and copy a test report for the current turn. All test-only content must be tagged with `testOnly: true` or `visibility: "dev_only"` and must not be used by ordinary player draws, ordinary event pools, or natural triggers.

The ordinary browser setup must not expose an ending-age field. Web sessions that omit `endingAge` use a hidden estimated lifespan derived from the run state. Deterministic tests and smoke flows may still pass an internal `endingAge` to reach endings quickly. MVP ending state records one of five categories: natural death, accidental/failure death, goal completion, world ending, or special-state ending.

The web playtest must not duplicate the previous `action_resolution` as a full separate bottom card. The player needs to see how a selected option or free-form attempted action was judged, but that result should be written into the life timeline with compact visible changes. The bottom current node is reserved for the next unresolved branch.

Every current playable node must expose its age consistently in the UI and event data. The title/current node should show the same age as `timeSpan.ageEnd`, and the branch should be caused by prior context such as a family disagreement, NPC reaction, clue, opportunity, or world pressure before presenting the three choices plus optional free-form input.

## Opening Sequence Rules

A new life must not start with playable choices or open free-form input. The flow is:

1. Player finishes setup: world, name, gender, personality, 20-point attributes, draw 5 keep 3.
2. The engine (mock mode) or AI provider (real mode) generates a non-interactive opening `life_event` with `interactionMode: "non_interactive"`, 0 choices, and `freeform.allowed: false`.
3. The opening response contains a spoiler-safe birth-background card (birth place, family, guardians in broad terms, family-background expression, early talent signs, destiny preview, outside reaction, world context, and current situation). It must not show initial important NPC lists, unexplained-detail sections, future triggers, route hooks, or early-years auto progression in ordinary `playerText`.
4. Rich early-years auto progression is stored in backend state as `opening.earlyLifeTimeline`, with nodes for every age from 0 to `firstActionAge - 1`. It must not skip 0岁 or 1岁, duplicate ages, or put later-age content into an earlier-age node. It should still avoid empty filler such as "age 0 born, age 1 walk"; each age node needs concrete, age-appropriate life texture. Hidden hooks, route triggers, unexplained details, and true foreshadowing belong in backend `opening.hiddenHooks`, `opening.unresolvedThreads`, or internal/GM debug state.
5. The opening response advances `player.age` to the first action age. The default first meaningful branch appears between ages 5 and 8 (7 by default; 5 with early-consciousness talents such as reincarnation memory or immediate mythic manifestation).
6. The web UI shows this as a fate-preview dossier (talents, five allocated attributes, and static background/destiny text only) with a single `开始人生` button.
7. Clicking `开始人生` generates the first playable `life_event` and opens the formal life page. The timeline begins with the age-0 early-life node from `opening.earlyLifeTimeline`, continues 1岁, 2岁, and so on in order, then reaches the first playable branch at the bottom current node.
8. Only after this transition does the first playable `life_event` expose 3 rich choices and the optional 4th free-form entry. The opening phase blocks premature choice/free-form input without consuming turns.
9. The formal life timeline must not skip the birth/early-years record, must not start abruptly from age 2, and must not duplicate the same opening or action-resolution text in separate ordinary-player cards.

Real AI opening generation uses the same response validator. If the provider fails, the local opening generator is the fallback and the response is flagged `provider_fallback`.

After each player action, the resolution should state the chosen/attempted action, cover immediate result, NPC reactions, state changes, non-spoiler future dark lines/unexplained details, and a transition into the next stage so events do not feel disconnected. The frontend writes that resolution into the timeline and hides blank event/result cards in ordinary player mode.

For final playtest acceptance, require real AI configuration:

```bash
npm run check:playtest -- --require-ai
npm run check:playtest -- --live-ai-smoke
npm run smoke:ai -- --required
npm run smoke:web -- --ai deepseek
```

The strict readiness mode reads shell variables and the project `.env` file. `--require-ai` fails when neither DeepSeek nor a generic OpenAI-compatible provider is configured. `--live-ai-smoke` also calls the configured provider and validates real life-event, action-resolution, and ending-summary JSON, so it requires network/API access.

Run the skeleton demo:

```bash
npm run demo
```

Run the interactive playtest:

```bash
npm run play
```

This uses mock AI by default.

Run with DeepSeek:

```powershell
$env:DEEPSEEK_API_KEY="your_api_key_here"
npm run play -- --ai deepseek
```

Optional DeepSeek settings:

```powershell
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
$env:DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

If `--ai deepseek` is used without `DEEPSEEK_API_KEY`, startup fails clearly instead of silently pretending to use real AI.

Run a live real-AI smoke test after configuring a provider:

```bash
npm run smoke:ai
```

Without provider environment variables, the smoke test skips cleanly. Use `npm run smoke:ai -- --required` when the check should fail if no real provider is configured.

Run with a generic OpenAI-compatible chat-completions provider:

```powershell
$env:OPENAI_COMPATIBLE_API_KEY="your_api_key_here"
$env:OPENAI_COMPATIBLE_BASE_URL="https://your-provider.example/v1"
$env:OPENAI_COMPATIBLE_MODEL="your-model-id"
npm run play -- --ai openai-compatible
```

`--ai openai_compatible` and `--ai compatible` are accepted aliases for the same provider mode. Generic OpenAI-compatible mode requires all three environment variables so the game never guesses the target service or model.

Without `--world` or `--load`, the playtest starts a setup wizard:

1. Choose one of the three MVP worlds.
2. Enter player character name and gender.
3. Choose a personality direction: cautious, ambitious, curious, empathetic, rebellious, pragmatic, or AI-generated.
4. Allocate the five attributes in order: Appearance, Intelligence, Constitution, Family Background, Luck.
5. Review the drawn 5 talents and keep 3.
6. Begin the birth-to-life event loop.

Run the playtest with command-line setup values:

```bash
npm run play -- --world cthulhu --name LinLan --gender female --personality curious
```

During play, the first screen after setup is the opening fate preview; enter `开始` or `start` to reach the first meaningful branch. Then enter `1`, `2`, or `3` to choose one of the AI-generated options. Enter `4` to open the optional free-form action input. Enter `q` to save and quit. If a free-form action is ambiguous, high-risk, or world-breaking, the engine shows a `clarification_request`; enter `y` to confirm it as an attempted action or `n` to cancel.

MVP playtest runs have a short-run ending threshold. By default, `npm run play` ends at age 12 with an `ending_summary` that includes a score, tags, biography-style summary, relationship summary, and world-progress summary. The default is 12 because the opening sequence already advances early years to age 5-7 before the first playable branch. Use `--ending-age <number>` to shorten or lengthen this during testing.

Run a scripted playtest for smoke testing:

```bash
npm run play -- --world cthulhu --name LinLan --gender female --script "1;4:我尝试观察那个医生;q" --save saves/linlan-play.json
```

Run a fully scripted setup and playtest:

```bash
npm run play -- --setup-script "2;LinLan;female;curious;6,6,4,2,2;1,3,5" --script "1;q" --save saves/linlan-setup-play.json
```

The older 5-part setup script format `world;name;gender;allocation;talents` remains valid and defaults personality to `random`.

Run a full short MVP life to ending:

```bash
npm run play -- --setup-script "2;LinLan;female;curious;6,6,4,2,2;1,3,5" --script "1;2;4:我观察家人的反应;1;3" --ending-age 6 --save saves/linlan-ending.json
```

Run a specific world:

```bash
npm run demo -- --world cultivation --name ShenQing --gender male --seed 777
```

Run multiple mock turns:

```bash
npm run demo -- --world cthulhu --name LinLan --gender female --seed 12345 --turns 3
```

Save the resulting run:

```bash
npm run demo -- --world wasteland --name Ash --gender female --seed 999 --turns 2 --save saves/ash-run.json
```

`tmp/` and `saves/` are local runtime-output folders and are ignored by git.

Resolve a choice in the first event:

```bash
npm run demo -- --world cultivation --name ShenQing --gender male --seed 777 --choice choice_2 --save saves/shenqing-run.json
```

World IDs:

- `cultivation`
- `cthulhu`
- `wasteland`

## Program Entry Points

- `src/world-loader.js`: loads MVP world runtime JSON.
- `src/initial-run.js`: creates the first run state.
- `src/runtime/event-log.js`: creates and normalizes append-only event logs. New runs receive a `run.created` event.
- `src/runtime/transition-run.js`: the transition firewall. It applies DomainEvents through reducers, appends them to the event log, builds projections, and checks invariants.
- `src/runtime/replay-run.js`: rebuilds a run projection deterministically from an event log.
- `src/runtime/invariants.js`: rejects illegal state transitions such as age rollback, reopened closed facts, thread-stage rollback, Growth Ledger overflow, and PlayerView leaks.
- `src/domain/events/event-factory.js`: creates typed DomainEvents.
- `src/domain/events/patch-to-events.js`: converts accepted AI `statePatch` data into DomainEvents.
- `src/domain/reducers/run-reducer.js`: the deterministic reducer that settles DomainEvents into the current run projection.
- `src/domain/projections/player-view.js`: ordinary player projection with label-first, hidden-info-free data.
- `src/domain/projections/prompt-view.js`: AI prompt projection with capability packages, developmental-expression limits, and structured state context.
- `src/domain/projections/gm-view.js`: developer/debug projection with full run and hidden information.
- `src/selectors/`: Selector Graph read layer that builds `panelViews.main`, `panelViews.attributes`, and `panelViews.story` for browser panels.
- `src/growth-ledger.js`: owns attribute potential, maturity caps, realized growth, effective current ability, locked potential, growth evidence, and compatibility sync back to `player.attributes`.
- `src/capability-package.js`: turns the Growth Ledger into age/world-appropriate capabilities, check tags, forbidden actions, and developmental-expression limits for AI rendering.
- `src/npc-generator.js`: generates initial important NPCs from world templates.
- `src/event-source-selector.js`: chooses the weighted event source and soft seed context for the next AI turn.
- `src/annual-state-transition.js`: builds an engine-owned annual fact package for cross-year branches, selects the year's primary life delta plus primary/secondary story axes, detects stale yearly shapes, and produces the story-state patch for annual facts and featured-axis updates.
- `src/life-curriculum.js`: chooses the annual human-life curriculum slot and required human delta so each year has a concrete life-simulation subject before world flavor is applied.
- `src/topic-ledger.js`: records recent annual topic profiles and blocks overused arenas, objects, topic families, and pressure types from returning as the year's main event.
- `src/action-intent.js`: turns a selected choice or free-form action into a lightweight structured intent for continuity-critical story handling.
- `src/simulation-kernel.js`: records authoritative story facts and thread progression before AI prose becomes the next event context.
- `src/story-state.js`: stores and merges `worldState.storyState` with five story axes, facts, closed facts, active pressures, thread stages, forbidden repeats, recent event shapes, annual curriculum history, topic ledger history, and annual agendas.
- `src/narrative-director.js`: converts story state and annual fact packages into an event contract for the next branch, including selected primary/secondary axes, curriculum slot, three-layer focus, and forbidden topic profiles.
- `src/story-contract-validator.js`: rejects generated events that reopen closed facts, repeat forbidden scene skeletons, reuse forbidden annual event shapes, ignore the annual curriculum slot, or promote a forbidden topic profile.
- `src/mock-ai.js`: generates a protocol-shaped mock event.
- `src/ai-provider.js`: provides `mock`, `deepseek`, and generic `openai-compatible` providers for life events, action resolution, and ending summaries.
- `src/choice-resolution.js`: turns a selected choice into a mock action resolution.
- `src/freeform-clarification.js`: detects ambiguous, high-risk, or world-breaking free-form inputs and creates confirmation requests.
- `src/freeform-resolution.js`: resolves confirmed or ordinary free-form input as an attempted action, not guaranteed reality.
- `src/ending-generator.js`: generates MVP short-run ending summaries with score, tags, biography, and final state patch.
- `src/personality-options.js`: defines player personality-direction options and aliases.
- `src/setup-session.js`: parses playable setup choices for world, name, gender, personality direction, attribute allocation, and draw-5-keep-3 talent selection.
- `src/play-session.js`: pure play-session state machine for 3 AI choices, optional 4th free-form entry, and quit.
- `src/web-session-store.js`: browser-facing session adapter that reuses setup, play-session, provider, summary, and save/load modules without exposing provider keys.
- `src/web-server.js`: local web playtest server and backend API proxy. Defaults to port `5181`, with fallback ports if the OS denies or occupies that port.
- `src/dev-tools.js`: local GM/tester-mode catalog, opening presets, test-only talents, scenario injection responses, and copyable debug reports. These are `dev_only/testOnly` tools and are not part of ordinary player content pools.
- `src/ai-response-validator.js`: validates MVP AI response rules that JSON schema alone cannot express.
- `src/run-loop.js`: validates accepted AI responses, converts `statePatch` into DomainEvents, and advances a run through `transitionRun()`.
- `src/run-validator.js`: validates MVP run/save shape before save/load acceptance, including required Growth Ledger entries.
- `src/run-summary.js`: formats player-facing run summaries for current/realized/potential/locked attribute growth, progress, statuses, important NPC relationships, and factions.
- `src/save-store.js`: saves portable run JSON with `eventLog`, loads event-log saves by replay, and migrates legacy `mvp.run.v1` saves that predate `player.growthLedger`.
- `src/cli.js`: prints a smoke-test demo.
- `src/play-cli.js`: runs the interactive or scripted CLI playtest.
- `src/index.js`: public exports for tests and future app layers.
- `tools/audit-playtest-content.mjs`: reports world-pool counts against the fuller playtest content target.
- `tools/check-playtest-readiness.mjs`: checks the core playtest gate, including scripts, world data, content minimums, core simulator systems, open event-generation rules, README coverage, and real-AI provider environment warning.
- `tools/smoke-ai-provider.mjs`: runs a live real-AI JSON smoke test when provider credentials are configured.
- `tools/smoke-web-playtest.mjs`: starts the local web backend and exercises the browser playtest flow end to end without exposing provider keys.
- `tools/replay-bugs.mjs`: replays regression fixtures from `tests/replay-fixtures/` and verifies expected facts, thread stages, and PlayerView leak guards.
- `tools/test-architecture.mjs`: static architecture guard that checks state transitions are routed through the event-sourced runtime.

## Current Guardrails

- The full app stack is still undecided.
- The default CLI mode is mock AI; real AI calls require `--ai deepseek` with `DEEPSEEK_API_KEY` or `--ai openai-compatible` with `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL`, and `OPENAI_COMPATIBLE_MODEL`.
- The browser playtest uses the local backend API. Provider keys must remain server-side and must never appear in frontend files or API responses.
- Real AI prompts include the selected event source context so providers follow the same open soft-pool rules as mock mode.
- Real AI action-resolution prompts include the source event, selected choice or free-form text, player state, world state, important NPCs, memory, and world constraints.
- Real AI ending-summary prompts include the final run state, recent memories, recent events, important NPCs, factions, world progress, and ending seed candidates. Ending responses use `interactionMode: "ending"` with 0 choices.
- AI response validation is intentionally stricter than raw schema for normal playable events.
- Normal playable events must have 3 rich choices.
- Non-interactive response types may have 0 choices.
- State changes are proposed in `statePatch`; player-facing display changes are in `visibleChanges`.
- The run loop no longer applies `statePatch` directly. Accepted patches become DomainEvents, reducers settle them into the authoritative run projection, and invariants guard the transition before save/display.
- The event log is the replay authority for current saves. The run snapshot remains for compatibility and debugging, but load uses `replayRun(eventLog)` when present.
- Ordinary UI receives PlayerView and Selector Graph `panelViews` alongside legacy compatibility fields. New ordinary display work should read `panelViews` for page panels and PlayerView for compact player-safe data; raw run internals belong to GM/debug surfaces.
- The run loop treats the Growth Ledger as the authority for attributes. Compatibility `manifestationChanges` adjust realized growth, while `growthEvidenceChanges` is the preferred AI-facing route for growth evidence. Age alone does not cash out all potential, even at adulthood.
- Capability packages and developmental-expression contracts are included in AI prompts so high potential cannot be rendered as infant combat power, adult strength, or fully awakened mythic talent unless the ledger has made that capability effective.
- Continuity-critical story facts now live in `worldState.storyState`. AI output text is not the authority for whether a thread has been discovered, identified, closed, or advanced; the engine records those facts and passes a narrative contract into the next event.
- Five-axis pressure now lives in `worldState.storyState.axes`. The director chooses a primary and secondary axis from engine-owned pressure signals, so repeated scenes are avoided by a general state mechanism rather than a one-off cooldown for a single plotline.
- The current state-first MVP protects the cultivation jade-talisman/lingyinfu thread from repeated first-discovery loops. When the thread is identified, later events may keep the stored object and mountain pull as background pressure, but they must not rediscover the same object and footsteps.
- Cross-year branches now go through an annual state transition package. The next event contract must introduce a new yearly life delta such as institutional arrival, education shift, social reputation shift, family route decision, resource reallocation, health shift, relationship shift, route commitment, or world-pressure change. Stale yearly shapes are forbidden from becoming the main event again, and the selected axes are written back into `storyState` for the next director pass.
- Annual Year Tick v2 adds a curriculum-first agenda. The director chooses the human-life curriculum slot first, schedules world flavor as secondary, treats old consequences as background echoes, records topic profiles in `storyState.topicLedger`, and validates that recently overused arenas/objects/topic families/pressure types cannot dominate the next year.
- Talent setup uses deterministic rarity-weighted draws: Common 45%, Fine 28%, Rare 16%, Epic 7%, Legendary 3%, Mythic 1%, then the player keeps 3 of the 5 drawn talents.
- Only validated AI responses can be applied to a run.
- Important NPCs are generated by the system, not specified manually by the player.
- Free-form input is an optional 4th interaction entry, not a replacement for the 3 AI-generated choices.
- Ambiguous, high-risk, or world-breaking free-form input uses `clarification_request` with `interactionMode: "freeform_confirmation"` and 0 choices before any action resolution is applied.
- Event pools are not event whitelists. If no seed fits, or if the selected source is not `seed_pool`, AI may generate a fitting event from world rules and current save context.
- Player free-form actions are first-class attempted actions. They must be interpreted, risk-checked, optionally clarified, resolved, remembered, and allowed to reshape later AI context when the result is validated by the engine.
- The setup wizard can be driven interactively or by `--setup-script` for smoke tests. Setup scripts accept both the old 5-part format and the newer 6-part format with personality direction.
- CLI play displays a run summary with personality direction, attribute current/realized/potential/locked/exposure values, world progress, player statuses, important NPC relationship labels with rough ranges, and faction summaries.
- MVP short-run endings use `ending_summary`, `interactionMode: "ending"`, 0 choices, and a final `worldStateChanges` patch that stores `run.ending`. In real AI mode, the provider writes the biography-style ending summary and score proposal before the engine validates it.
- Save files are plain JSON for early debugging and portability. Load/save rejects malformed JSON or structurally invalid MVP runs, while legacy `mvp.run.v1` saves without a Growth Ledger are first migrated into the current authority shape and then validated.
- Runtime world data remains separate from human-facing Markdown.
- Faction and location pools are now runtime JSON for all three MVP worlds and are included in real-AI prompt context as generation constraints and hooks, not fixed scenes.
- The three MVP worlds meet the minimum fuller playtest content target reported by `npm run audit:content -- --strict`; ideal counts remain a later expansion target.

## Next Layer

The next skeleton layer should add:

- richer browser playtest UX, including clearer save management, ending display, relationship panels, and mobile polish
- richer interactive CLI controls, including clearer existing-save loading and denser per-turn panels
- expanding identity, talent, event, NPC, faction, location, and ending pool counts from minimum targets toward ideal targets reported by `npm run audit:content`
- save migration/versioning once the run shape starts changing across releases
- account-level unlock/achievement hooks for future talent and world discovery
- friendlier provider configuration, live provider smoke tests with real keys, and optional per-provider request-body overrides
