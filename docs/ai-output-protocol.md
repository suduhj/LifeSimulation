# AI Output Protocol

This document defines the MVP contract between the game engine and an AI provider such as DeepSeek or an OpenAI-compatible API.

## Core Principle

AI output is a proposal, not authoritative state.

The AI may write narrative, interpret player intent, suggest consequences, and propose state patches. The game engine must parse, validate, and approve those patches before applying them to the save.

In the current runtime, approved patches are still not applied directly. The engine first converts them into DomainEvents, passes them through `transitionRun()`, checks invariants, appends them to `run.eventLog`, and only then exposes the resulting run projection.

## Generation Flow

Each life-simulation event follows this flow:

1. Engine loads the current save.
2. Engine determines world, age, life stage, location, identity, talents, Growth Ledger values, capability packages, developmental-expression limits, exposure values, important NPCs, factions, memory, and world-specific progress.
3. Engine selects one event source from the world's weighted event-source table.
4. If the source is `seed_pool`, the engine filters content pools and selects 1-3 relevant soft seeds.
5. If the source is not `seed_pool`, the engine sends the source instruction and may send no event seeds.
6. Engine sends the selected state summary, event source context, selected seeds when relevant, world constraints, and output schema to AI.
7. AI returns raw JSON matching `schemas/ai-event-response.schema.json`.
8. Engine validates JSON structure and state changes.
9. Engine converts accepted `statePatch` entries into DomainEvents.
10. `transitionRun()` reduces DomainEvents, checks invariants, appends `eventLog`, and builds PlayerView/PromptView/GMView projections.
11. Engine rejects invalid changes, or asks the AI/player for clarification when needed.
12. Player sees pure text life-simulator output, visible changes, 3 AI-generated choices, and an optional 4th free-form entry when interaction mode allows it.

Content seeds are inspiration and constraints, not fixed scripts. The AI must adapt them to the current save, player character, NPC relationships, world progress, and prior memory.

For cross-year `life_event` generation, the engine creates an Annual Year Tick v2 contract internally. This contract is authoritative for the year: `curriculumSlot` and `requiredHumanDelta` define the human-life change; `threeLayerFocus.lifeBase` is primary; `threeLayerFocus.worldFlavor` is secondary; `threeLayerFocus.consequenceEcho` is background-only; `topicProfile` and `forbiddenTopicProfiles` control recent-topic repetition; `assetRoles` and `experienceIntent` further constrain old assets and tone.

Real providers should not receive that raw annual fact package as player-renderable text. The engine compiles it into an Observable Scene Object: visible scene title, main human-life change, secondary world flavor, limited background echoes, forbidden player text, and three choice directions. `curriculumSlot`, `threeLayerFocus`, `topicProfile`, `assetRoles`, `experienceIntent`, and raw thread IDs remain engine/GM/debug concepts.

After a valid annual response is accepted, the engine records a Yearly Outcome Ledger entry. This is not AI-authored state authority. The engine maps the curriculum slot to deterministic growth/exposure impact when needed, appends `annual.outcome_recorded` plus growth/exposure DomainEvents, updates the Growth Ledger, and exposes the result through `panelViews.attributes`.

The MVP event sources are:

- `seed_pool`: use selected soft seeds as style, trigger, and constraint references.
- `ai_free`: generate from world rules and current save when no seed is needed.
- `player_consequence`: continue consequences from prior choices or free-form actions.
- `npc_driven`: let an important NPC push the next situation.
- `world_progress`: trigger pressure from realm, truth, pollution, scarcity, or similar world progress.
- `natural_life`: generate ordinary life-simulation events such as family, school, work, illness, romance, aging, and daily pressure.
- `random_disturbance`: introduce a random disruption shaped by attributes, talents, luck, and world rules.

## Provider Requirement

Use an OpenAI-compatible chat or responses interface when possible. The current MVP provider adapter uses the chat-completions shape at `/chat/completions`; DeepSeek is a preconfigured alias, and `--ai openai-compatible` accepts an explicit compatible base URL and model.

If the provider supports JSON response mode or structured output, enable it. If not, the prompt must still require:

- raw JSON only
- no Markdown fence
- no commentary outside JSON
- no hidden chain-of-thought
- concise internal judgment summaries instead of full reasoning

## Engine Input To AI

For `life_event`, the engine prompt should include:

- selected world ID and world design summary
- current run ID and turn ID
- PromptView data produced by the engine, not an ad-hoc raw save dump
- player character age, life stage, identity, gender, talents, and attribute layers
- Growth Ledger summary: potential, realized value, current effective value, maturity cap, locked potential, evidence, milestones, and exposure
- capability packages and developmental-expression limits, including allowed expressions, locked capabilities, check tags, and forbidden actions
- current exposure values and who may notice them
- important NPC visible state, hidden state summary, and relationship labels
- faction state and faction relationship summary
- world-specific progression state
- recent run memory and unresolved hooks
- event generation context: `sourceType`, `sourceInstruction`, pool mode, seed strictness, adaptation mode, and whether AI free generation is allowed when no seed fits
- selected content seeds, usually 1-3 when `sourceType` is `seed_pool`
- player selected choice or free-form input, if resolving an action
- annual outcome and experience context when available: `curriculumSlot`, `requiredHumanDelta`, `threeLayerFocus`, `topicProfile`, `forbiddenTopicProfiles`, `assetRoles`, `experienceIntent`, and background-only asset restrictions
- hard constraints from `game-design/ai-generation-rules.md`
- required output schema version

When an Observable Scene Object is present, it is the prose authority for the turn. The AI must render only that observable scene into `playerText` and choices. It must not expose raw backend planning fields such as `annualFactPackage`, `curriculumSlot`, `threeLayerFocus`, `backgroundThreads`, `assetRoles`, `人生课程`, `年度变化`, `旧线索`, `背景回响`, `主轴`, or `副轴`.

Do not send the whole content pool every turn.

For `action_resolution`, the engine prompt should include:

- the source event that the player is responding to
- the selected choice ID and selected choice text, or the free-form action text
- a reminder that player input is an attempted action, not guaranteed reality
- the same player state, world state, important NPC state, memory, and world constraints used for life events
- the required output shape for `responseType: "action_resolution"`

The AI should resolve the immediate consequences, propose visible changes, update memory/NPC relationships when justified, and return three rich follow-up choices unless the result requires another interaction mode.

For `ending_summary`, the engine prompt should include:

- final player state, including age, life stage, identity, gender, personality direction, talents, attribute layers, statuses, and score so far
- final world state, world-specific progress, factions, important NPC relationship states, recent memories, and recent events
- ending seed candidates for the selected world
- the required output shape for `responseType: "ending_summary"`

The AI should write a biography-style life summary, final score, ending tags, relationship summary, and world-progress summary. It must use `interactionMode: "ending"`, return 0 choices, set `freeform.allowed` to false, and propose the final ending record through `statePatch.worldStateChanges`.

Hidden state may guide foreshadowing and consistency, but must not be directly revealed in `playerText` unless the hidden information has been discovered in the save. For example, if an NPC is secretly a cult member, the AI may write suspicious behavior or unease when justified, but must not write "you do not know he is a cult member" before the reveal.

NPC identity is layered. The prompt may include `playerVisible` and `hiddenInfo`, but player-facing text must use only `playerVisible` or other surface-level wording justified by the current scene. Raw NPC IDs, true templates, true roles, hidden factions, future route functions, and "you later learn..." spoilers belong only in `internal`, GM/debug output, or backend memory. If the story reveals a hidden identity, the response must also propose an `importantNPCUpdates` patch that updates the NPC's player-visible identity.

Ordinary player-facing text must be Chinese and must not expose backend IDs, raw schema keys, or missing-data placeholders. Do not output raw labels such as `poor_scholar_child`, `sacrifice`, `exploiter`, `lover`, `NPC_4`, `manifested`, `potential`, or `exposure`, and do not replace missing names with player-facing placeholders such as "未命名天赋", "未知天赋", "重要人物", "未知身份", or "身份尚不明确". If safe Chinese player-visible wording is unavailable, the AI should omit the undiscovered item or write around the known scene facts.

For attribute growth, AI prose must follow the engine-provided capability package. Potential means destiny or future ceiling, not current ability. Current checks and narration use `effective`/current capability only, and player-facing prose should express this as ordinary Chinese such as "当前能表现", "还没有完全兑现", or age-appropriate ability, not raw field names.

Player-facing attribute names are fixed across worlds: 颜值, 智力, 体质, 家境, 运气. Do not switch the ordinary UI or visible changes to world-specific base-attribute aliases. Family Background is an origin constraint and must be consistent with the World Origin Resolver; high 家境 cannot be narrated as a poor or bottom-tier origin unless a later event explicitly destroys that background.

Backend context sent only for reasoning and continuity — `recentMemory`, `recentEvents`, `eventGeneration` (including `sourceType`), `continuityRules`, `immediatePriorResolution`, `selectedSeeds`, and `internal` — must never be copied verbatim or paraphrased into `playerText`. In particular, `playerText` (title, body, and choice text) must never contain English sentences, raw snake_case IDs such as `noble_dynasty_child`, or backend concept words such as `素材种子`, `seed`, `sourceType`, `事件来源`, or `run started`. Rewrite any such backend information as pure in-world Chinese that the player character can actually perceive, or omit it.

## AI Output Shape

The AI response uses `schemaVersion: "mvp.ai_event_response.v1"`.

`responseType` can be one of:

- `life_event`
- `action_resolution`
- `clarification_request`
- `forced_consequence`
- `ending_summary`
- `memory_update`
- `json_repair`

Required top-level sections:

- `timeSpan`: age start/end, years elapsed, and pacing reason.
- `selectedSeeds`: the seed IDs used and how they were adapted.
- `interactionMode`: how the player may interact with this response.
- `playerText`: the text shown to the player.
- `event`: structured event metadata.
- `choices`: 3 AI-generated rich choices for normal playable events by default; special modes may use 0 choices.
- `freeform`: free-form input availability and risk handling.
- `visibleChanges`: structured changes displayed to the player.
- `statePatch`: proposed changes.
- `internal`: short judgment summary and validation flags for debugging.

The player-facing text remains pure text life-simulator style. The backend stores the structured fields.

For playable life events, `playerText.title` should clearly show the event age, such as `X 岁：事件名`, and `X` must match `timeSpan.ageEnd`. The title must be a concrete Chinese event title, not a generic label such as "人生事件", "人生片段", "命运片段", "当前事件", or "新的事件". The body and choices must fit that age. The event should first establish the prior situation or pressure that naturally causes the branch, then present the three choices; do not generate a random card-like node or reverse cause and effect. If choices mention a person, object, place, clue, faction, item, newcomer, stranger, or NPC, the body must first introduce their sound, shadow, surface identity, known origin, location, or why they are present.

For `ending_summary`, `interactionMode` should be `ending`, `choices` should be empty, `freeform.allowed` should be false, and `statePatch.worldStateChanges` should store final ending data such as ending ID, score, tags, completion flag, and ending age.

## Opening Sequence Requirement

Every new run starts with an opening-sequence `life_event` before any playable event:

- `interactionMode` must be `non_interactive`, `choices` must be empty, and `freeform.allowed` must be false.
- `playerText` must contain a spoiler-safe birth-background card only: birth place, birth family, parents/guardians in broad terms, how Family Background concretely appears, destiny preview, how nearby people react, how the world background shapes this birth, and initial situation.
- `playerText` must not show "initial important NPC", "initial relationship", "unexplained detail", "future foreshadowing", "talent manifestation", early-life auto-progression, hidden triggers, route hooks, undiscovered NPC secrets, or future event conditions. Hidden NPC functions, ambiguous clues, omens, strange objects, NPC abnormal reactions, family concealment, true hooks, route conditions, and age-by-age talent manifestation belong in backend/GM state, talent detail cards, or the formal life timeline until discovered.
- The web backend must not directly trust provider opening prose for ordinary fate preview. It builds the player-facing fate preview deterministically from structured run data (engine `buildFatePreviewDossier`), not from provider prose, showing only a safe dossier subset: birth place, birth family, family-background expression, destiny preview, and current situation. Provider opening prose, age-specific early-life narration, hidden clue objects, suspicious NPC details, family/NPC name lists, talent-manifestation blocks, future route hooks, and unexplained-detail labels must never reach the fate page. The omitted material can still be preserved in `opening.earlyLifeTimeline`, `opening.hiddenHooks`, `opening.unresolvedThreads`, NPC hidden state, `internal.hiddenStateNotes`, or GM/debug output.
- True hidden hooks, future trigger conditions, and unresolved route threads must be stored in `statePatch.worldStateChanges` under targets such as `opening.hiddenHooks` or `opening.unresolvedThreads`, or in `internal.hiddenStateNotes` for GM/debug use.
- Early-years auto progression must be stored separately in `statePatch.worldStateChanges` as `opening.earlyLifeTimeline`. It must be an age-ordered array from age 0 to `firstActionAge - 1` with no missing, duplicated, or skipped ages. Each node body must match its own age and avoid mentioning later ages as if they had already happened. The writing should still avoid empty filler; early years are life undertone, family relationships, talent manifestation, and world rules.
- `timeSpan` advances from birth to the first action age. The first meaningful branch defaults to ages 5-8 (engine default 7; 5 when early-consciousness talents such as reincarnation memory, born-knowing, or immediate mythic manifestation justify it). Body and age limits still apply to any early ability. The engine owns this age: it clamps the opening's resulting age to its computed `firstActionAge` even when the provider returns a smaller `timeSpan.ageEnd`, so a disobedient provider cannot drop the first playable branch onto an infant.
- `statePatch` should update early manifestation values and set `opening.phase` to `first_branch_ready`. It must not end the run, force a fixed route, or reveal hidden NPC secrets.
- The engine prompt for real providers is built by `buildOpeningSequencePrompt` and validated with the same response validator; provider failure falls back to the local opening generator with `provider_fallback` flags.

After the player advances past the opening, the first playable `life_event` must have prior context: it should build on the opening's foreshadowing rather than asking the player to act without background.

The web UI displays the opening response as:

- fate preview: talents and five allocated attributes plus an engine-built static dossier (birth place, birth family, family-background expression, destiny preview, and current situation). It must not render provider opening prose, age-specific early-life narration, NPC/family name lists, talent-manifestation blocks, hidden clues, or unexplained-detail sections.
- formal life timeline: readable `opening.earlyLifeTimeline` nodes in strict age order from age 0 to the first action age, followed by the first playable branch at the bottom current node

These are presentation layers. The backend still treats the opening as a single non-interactive `life_event` and must not allow choices or free-form input until the first playable branch is generated.

## Action Resolution Continuity

After a player choice or free-form action, `action_resolution` responses should cover six layers so events do not feel disconnected: what the player chose or attempted, immediate result, NPC reactions, state changes (body, relationships, environment, resources, world progress), non-spoiler future dark lines/unexplained details, and a natural transition into the next age or stage.

In the web life timeline, a resolved action should be merged into the corresponding lived timeline node as consequence text and compact visible changes. The next unresolved life event should appear in the bottom current node, not be duplicated as another completed timeline card. Do not create a standalone ordinary-player `行动结算` or `变化提示` event card. The player can scroll upward through lived history while the current branch remains clearly available at the bottom.

## Choice Rules

Normal playable events should provide exactly 3 rich choices by default.

Non-interactive events, death events, ending summaries, clarification requests, forced consequences, and system-only transition events may provide 0 choices or a different interaction mode.

When a normal playable event allows free-form input, the UI should present it as an optional fourth interaction entry, not as one of the 3 AI-generated choices.

Each choice must be richer than a one-word command. It should communicate intent, method, tone, and likely route direction.

Good:

```text
表面接受老师的解释，但私下把那本写满陌生符号的笔记藏起来，等晚上独自研究。
```

Bad:

```text
调查
```

Each choice includes a fuzzy success or risk label, such as:

- 几乎没有风险
- 难度较低
- 风险不低
- 风险极大
- 几乎不可能
- 结果难以判断

These labels are not action results. Do not write result-spoiling labels such as "成功获取灵珠", "成功隐藏观察", "成功套取信息", "直接成功", or any wording that announces the outcome before the player chooses. Avoid "成功率" wording in ordinary player-facing choice metadata because it reads like a result guarantee. The label may describe difficulty or risk only, for example "难度较低", "风险不明", or "结果难以预料".

## Free-Form Input Rules

Free-form input is an attempted action, not guaranteed reality.

The AI must judge it using:

- current attributes
- talents
- age
- identity
- world rules
- narrative plausibility
- NPC relationships
- faction relationships
- current states
- historical events
- random probability
- hidden difficulty parameters

Normal free-form input can be interpreted and resolved directly.

Complex, high-risk, ambiguous, or world-breaking input should set `freeform.clarificationNeeded` to `true` and explain what must be confirmed before resolution. Engine-generated clarification requests use `interactionMode: "freeform_confirmation"`, provide 0 choices, and must not apply state changes until the player confirms.

For important or risky checks, the engine should provide the roll result or difficulty outcome. The AI should narrate according to that result instead of inventing success or failure freely.

Example engine-provided check:

```json
{
  "checkResult": "partial_success",
  "riskLevel": "high"
}
```

If the player tries to sneak into a cult ritual, the AI can then narrate a partial success: the player character gets close enough to hear something useful, but someone notices a trace or begins to suspect them.

## State Patch Rules

`statePatch` must describe proposed changes, not directly overwrite the save.

It should include arrays for:

- attribute changes
- manifestation changes
- exposure changes
- relationship changes
- important NPC updates
- faction changes
- status changes
- progression changes
- world-state changes
- memory updates
- growth evidence changes
- score delta

The current MVP run loop applies these patches conservatively:

- `attributeChanges`: compatibility path that adjusts a named attribute source layer and realized growth unless flags say otherwise.
- `manifestationChanges`: compatibility path that adjusts or sets realized growth for an attribute, still capped by the Growth Ledger.
- `exposureChanges`: adjusts an attribute exposure value, or a run-level exposure counter such as official attention.
- `relationshipChanges`: adjusts a known important NPC relationship dimension.
- `importantNPCUpdates`: updates an existing important NPC, or creates one only when `create: true` is present.
- `factionChanges`: creates, updates, or removes a faction record, including relationship, progress, flags, and memory.
- `statusChanges`: adds, updates, removes, or clears player/NPC statuses.
- `progressionChanges`: adjusts world progress bars such as realm, truth exposure, or survival days.
- `worldStateChanges`: sets simple world-state fields, appends flags, updates nested paths, or stores final ending data.
- `memoryUpdates`: appends run memory entries.
- `growthEvidenceChanges`: preferred growth path. AI may submit evidence such as training, chores, study, injury recovery, or practice; the engine decides how much realized growth actually becomes effective.
- `scoreDelta`: adjusts the run score.
- `yearlyOutcomes`: engine-owned annual result records. Providers should not invent them; the annual transition layer inserts them when a cross-year agenda is settled.

The engine does not allow AI to replace the whole save. Patches must target specific fields.

AI must not directly author or overwrite `effective`, `realized`, `maturityCap`, or `lockedPotential`. Those values are recalculated by `src/growth-ledger.js`.

AI must not author DomainEvents directly. DomainEvents are engine-owned records created after validation by `src/domain/events/patch-to-events.js`; only reducers may turn them into run state.

AI must not author Yearly Outcome Ledger records directly. Annual outcome settlement is engine-owned: the response is validated first, then the engine inserts yearly outcomes and converts curriculum impact into growth/exposure DomainEvents.

Example growth evidence:

```json
{
  "attribute": "constitution",
  "amount": 1,
  "source": "daily_chores",
  "reason": "长期劈柴、跑腿和恢复训练让体力基础有了可验证增长"
}
```

`visibleChanges` must separately list what the player should see this turn.

Example:

```json
{
  "type": "attribute",
  "target": "intelligence",
  "amount": 2,
  "currentValue": 18,
  "source": "study_event",
  "duration": "permanent",
  "text": "智力 +2"
}
```

Every visible attribute or state change must be displayable to the player with:

- change amount
- current value
- source type
- temporary or permanent status
- recovery condition when recoverable

## Validation Rules

The engine must reject or repair AI output when:

- JSON cannot be parsed
- required fields are missing
- normal playable events do not provide 3 rich choices
- non-interactive response types pretend to be normal playable events
- event uses another world's mechanics without justification
- AI treats potential value as fully effective at birth, childhood, or any age without ledger support
- AI turns locked capabilities from the capability package into already-owned facts
- AI grants success just because the player typed it
- AI invents the outcome of an important or risky check when the engine already provided a result
- AI leaks hidden information in player-facing text before the save has revealed it
- AI exposes raw NPC IDs, backend role keys, true templates, hidden route roles, or future NPC reveal facts in ordinary `playerText`
- AI leaks backend context into `playerText` (title, body, or choice text): raw snake_case IDs such as `noble_dynasty_child`, leaked English sentences/phrases such as `Run started in cultivation with identity seed`, or backend concept tokens such as `素材种子`, `sourceType`, or `run started`. This is enforced on real-provider output by `detectPlayerTextLeaks`; a leaking response is routed into repair and then to the mock fallback. The guard is intentionally applied only to provider output, not to author-controlled mock/dev/GM/engine responses.
- AI leaks Observable Scene Runtime backend planning terms such as `人生课程`, `年度变化`, `旧线索`, `背景回响`, `主轴`, `副轴`, `curriculumSlot`, `threeLayerFocus`, `backgroundThreads`, or `assetRoles` into ordinary player text.
- AI promotes a background-only scene echo into the title, first paragraph, or choice driver when the Scene Object marks it as background-only.
- AI makes ordinary NPCs all-excellent without special justification
- AI applies state changes outside allowed ranges or rules
- AI skips visible reporting for attribute/state changes
- AI contradicts persistent run memory
- AI promotes an `assetRoles` background-only asset, forbidden arena, forbidden object, forbidden topic family, or forbidden pressure type into the annual main event
- AI ignores the annual `curriculumSlot` or writes choices around an old clue/asset instead of the required human-life delta
- AI or the adapter fabricates placeholder narrative, or surfaces AI-failure/generation-rule wording such as "AI 返回了事件结果" or "不是凭空出现的事件卡" in `playerText`, instead of routing a degenerate body to the mock fallback

## Failure Handling

If AI output fails validation:

1. Keep the authoritative save unchanged.
2. Store the failed response in a development-only debug log if logging is enabled.
3. Ask the same provider for one `json_repair`-style repair using the validation errors, the original prompt context, and the invalid response.
4. Validate the repaired response with the same engine validator before applying any patch.
5. If repair still fails, show a clear provider error, keep the save unchanged, and later fall back to a safe event or ask the player to retry.

Repair requests are protocol repairs, not story-authority overrides. The AI may fix missing fields, invalid choice counts, malformed enums, and incomplete `statePatch` arrays, but it still cannot replace the authoritative save or guarantee a player-declared outcome.

After a provider repair response, the adapter may normalize narrow safe shape mistakes before validation, such as restoring `schemaVersion`, converting a prose-only `visibleChanges` item into `{ "type": "note", "target": "run", "text": "..." }`, filling a missing/partial `statePatch` with empty arrays and `scoreDelta: 0`, deriving the required `interactionMode` from `responseType`, wrapping prose/title/body output into the required `playerText` object, filling default `freeform` envelope fields, restoring or coercing protocol envelope fields already known from the original prompt such as `worldId`, `runId`, numeric `timeSpan` fields, `selectedSeeds`, `event`, and `internal`, or completing minimum ending envelope metadata (`id`, `name`, `completed`) from engine-known context. This normalization must not invent authoritative state changes, relationship changes, progress changes, route-specific ending wins, player-success outcomes, hidden reveals, or missing player choices.

The adapter must also not fabricate a player-facing narrative body to pass validation. When the provider omits a usable `playerText.body`, the adapter leaves it empty/thin so the validator rejects the response; `requestValidatedAiResponse` then throws and the session layer (`safeGenerateLifeEvent`, `safeGenerateActionResolution`, `safeGenerateOpeningSequence`) falls back to the age-aware mock generator with `provider_fallback` flags. This keeps ordinary players from ever seeing invented placeholder prose or AI-failure tells; debug/generation-rule wording belongs only in GM/debug surfaces.

## Prompt Skeleton

Use this as the shape of the system/developer prompt, not as final wording:

```text
You are the fate narrator and world host for a multi-world AI life simulator.
Return only raw JSON matching schemaVersion mvp.ai_event_response.v1.
The engine owns state. You only propose narrative and statePatch changes.
Use Growth Ledger current effective values and capability packages for age-appropriate narration.
Use potential values only for destiny and long-term tendency.
If growth is justified, submit statePatch.growthEvidenceChanges; do not directly author effective, realized, maturityCap, or lockedPotential.
Do not author DomainEvents, eventLog entries, or direct run mutations. The engine converts accepted statePatch entries into DomainEvents and reducers settle state.
If observableScene is present, render its mainScene.requiredVisibleDelta as the year's main human-life change. Keep worldFlavor secondary and backgroundEchoes within their allowed roles. Do not promote old clue objects, old arenas, or background-only assets into the title, opening paragraph, or choices.
If an internal annual contract is present, the provider-facing surface should be observableScene. Render observableScene.mainScene.requiredVisibleDelta as the year's main human-life change. Keep worldFlavor secondary and backgroundEchoes within their allowed roles. Do not promote old clue objects, old arenas, forbidden topic profiles, forbidden pressure types, recently featured assets, or background-only assets into the title, opening paragraph, or choices.
Do not author yearlyOutcomes or annual.outcome_recorded events. The engine records Yearly Outcome Ledger entries and converts curriculum impact into growth/exposure DomainEvents after validation.
Do not narrate locked capabilities as already usable.
Use exposure values to decide who notices abnormalities.
Keep the selected world distinct. Do not import mechanics from other worlds unless the context explicitly allows it.
Use eventGeneration.sourceType and sourceInstruction. Only sourceType=seed_pool requires selected content seeds.
Content seeds are inspiration and constraints, not fixed scripts. Adapt them to the current save.
If no seed fits, or if the event source is not seed_pool, generate a reasonable event from the world rules and current save context.
For normal playable events, generate exactly 3 rich choices and allow free-form input as a separate optional 4th interaction entry by default.
For death, ending, clarification, forced consequence, or system-only transition responses, use the correct interaction mode and do not force 3 choices.
Do not reveal hidden state in playerText unless the save has already discovered it.
If the engine provides a check result, narrate according to that result instead of inventing success or failure.
Judge free-form actions by attributes, talents, age, identity, world rules, relationships, factions, current states, history, randomness, and hidden difficulty.
Do not output chain-of-thought. Use short judgment summaries in internal fields.
```
