# Playtest Version Standard

This document defines what "playable MVP / playtest version" means for this project.

## Core Principle

The playtest version should have complete systems with reduced content scale.

It should feel like the formal game loop works end to end, while the amount of content is only about 10%-20% of the final target.

## Required Player Surface

The player-facing playtest version must be a web version.

The current CLI can remain as a developer/debug smoke-test surface, but it is not the final player playtest surface. A version should not be called the real player-facing playtest until the core loop can be played from a browser with real AI provider support.

The web playtest must preserve the same core loop:

1. Choose world.
2. Create player character with limited custom identity.
3. Allocate attributes and keep 3 talents from a draw of 5.
4. Generate and display a spoiler-safe fate preview with birth background, five allocated attributes, selected talents, family/guardian context, early talent signs, destiny preview, world context, and current situation.
5. Keep initial important NPC lists, unexplained details, hidden hooks, and future triggers in backend/GM state. After `开始人生`, display early-years auto progression from `opening.earlyLifeTimeline` as strict age-ordered nodes starting at 0岁 before the first meaningful player branch.
6. Display AI-generated life events as pure-text life-simulator output in a continuous timeline.
7. Provide 3 rich AI-generated choices plus a separate optional free-form action input after the first branch.
8. Save and continue a life run locally at minimum.
9. Show visible state, relationship, and world-progress changes after validated AI output.

The creation flow must be split into separate pages instead of one crowded form:

- identity setup
- attribute allocation
- talent draw
- fate preview
- formal life timeline from birth

Fate preview must not reveal future triggers, route hooks, hidden NPC secrets, initial important NPC lists, unexplained-detail sections, or labels such as "future foreshadowing". True hidden hooks, ambiguous clues, and future reveal conditions belong in backend `hiddenHooks`, `unresolvedThreads`, internal notes, or GM/debug surfaces.

Free-form input is not available during identity setup, fate preview, or non-interactive early-years timeline nodes. It opens only when the first meaningful branch is reached, except for rare age-appropriate special cases explicitly produced by the opening rules.

## Required Systems

The playtest version must include:

- Three worlds: Cultivation World, Cthulhu Life World, and Post-Apocalyptic Wasteland.
- AI integration through DeepSeek or another OpenAI-compatible API. Mock AI is only a development and offline test mode.
- Player character creation: name, gender, personality direction, and world choice.
- Five-attribute allocation: Appearance, Intelligence, Constitution, Family Background, and Luck, with 20 starting points.
- Talent system: draw 5, keep 3, with all rarity levels from Common through Mythic.
- Attribute potential, manifested value, and exposure value. These are core differentiators from a normal life simulator.
- AI-generated story events with 3 rich choices plus a separate optional free-form input entry.
- Free-form input judgment. Ordinary input can resolve directly; complex, high-risk, ambiguous, or world-breaking input should require explanation or confirmation.
- Important NPCs with persistent memory and saved relationship changes.
- World-specific progress, such as cultivation realm, Cthulhu truth/corruption, or wasteland resources/radiation.
- Visible state changes for attributes, relationships, statuses, and world progress.
- Local save and load.
- Death or ending summary with biography-style summary and score.
- AI output validation. AI may only submit a `statePatch`; the engine validates before applying it.
- Loading feedback on every submitted choice or free-form attempted action. The UI should immediately disable controls and show a message such as `命运正在描绘中……`.
- Hidden local tester mode for GM/debug operations, with all test-only presets, talents, and scenario triggers marked `testOnly: true` or `visibility: "dev_only"` and excluded from ordinary player generation.

## Not Required Yet

The playtest version does not need:

- account system
- membership or payment system
- leaderboard
- player-customized worlds
- large codex/gallery systems
- mobile or multi-platform apps
- hundreds of talents
- hundreds of fixed events
- complex equipment or inventory

## Content Scale Targets

Per world playtest content target:

- Starting identity seeds: 15-20
- World-specific talents: 30-50
- Event seeds: 50-80
- NPC templates: 20-30
- Ending tags/seeds: 20-30
- World-specific progress values: 5-8
- Faction templates: 8-15
- Location templates: 10-20

Event seeds are not full fixed plots. They are flexible event directions.

## Open Event Pool Rule

Content pools are not event whitelists.

Pools are:

- style references
- generation material
- trigger directions
- constraints
- maintenance and balance handles

Pools are not:

- fixed scripts
- mandatory event lists
- the only allowed event source

Each event seed should be treated as soft reference material:

```json
{
  "strictness": "soft",
  "aiAdaptation": "must_adapt"
}
```

The AI must adapt seeds to the current save, player character, NPC relationships, world progress, and memory. If no seed fits, AI may generate a new event from world rules.

## Event Sources

Events may come from seven sources:

1. `seed_pool`: selected from event seeds.
2. `ai_free`: generated by AI from world rules when no seed fits or when variety is needed.
3. `player_consequence`: generated from prior player choices or free-form actions.
4. `npc_driven`: driven by important NPC goals, relationships, secrets, or actions.
5. `world_progress`: triggered by world-specific progress values.
6. `natural_life`: ordinary life events such as school, work, illness, romance, family conflict, marriage, children, unemployment, aging, or death.
7. `random_disturbance`: random disruptions influenced by attributes, talents, world rules, and luck.

## Default Event Source Weights

Cultivation World:

- `seed_pool`: 35
- `ai_free`: 20
- `player_consequence`: 15
- `npc_driven`: 10
- `world_progress`: 10
- `natural_life`: 5
- `random_disturbance`: 5

Cthulhu Life World:

- `natural_life`: 30
- `ai_free`: 20
- `seed_pool`: 20
- `player_consequence`: 10
- `npc_driven`: 10
- `world_progress`: 5
- `random_disturbance`: 5

Post-Apocalyptic Wasteland:

- `seed_pool`: 30
- `world_progress`: 20
- `ai_free`: 15
- `player_consequence`: 15
- `npc_driven`: 10
- `random_disturbance`: 5
- `natural_life`: 5

## Generation Flow

Each event generation should:

1. Read the current save.
2. Determine world, age stage, location/context, identity, goal, NPC relationships, prior actions, and world progress.
3. Choose one event source using the selected world's weights.
4. If source is `seed_pool`, filter 1-3 relevant seeds.
5. If no seed fits, allow AI-free generation.
6. Send current state, world rules, event source, selected seeds if any, and generation requirements to AI.
7. AI returns event JSON.
8. Engine validates JSON and `statePatch`.
9. Player sees pure text life-simulator output.

## Experience Standard

A player should feel:

- the three worlds have different flavor
- each run starts differently
- the same talent can matter differently across worlds
- high attributes do not instantly overpower the run because manifestation is age-gated
- free-form input matters
- important NPCs remember the player
- ordinary life and major events both exist
- events are not fixed scripts
- AI-generated content continues from history
- death or ending has a complete summary
