# Content Pool Rules

This document defines content pools for the AI life simulator.

## Core Definition

A content pool is not a fixed plot library.

A content pool is a searchable world-material seed library used by the game engine and AI when generating life-simulation content.

The pool provides structured seeds. The AI must combine those seeds with the current save state, player character attributes, talents, age, identity, world progress, important NPCs, faction state, history, and risk level before writing the actual event.

## What Pools Are For

Content pools serve seven purposes:

1. Control world style.
2. Provide generation material.
3. Improve consistency across runs.
4. Provide trigger conditions and filtering fields for the program.
5. Reduce uncontrolled AI improvisation.
6. Support balance, achievements, codex entries, ending statistics, and unlocks.
7. Keep different worlds distinct.

Examples:

- Cthulhu Life World should not casually become a monster-fighting leveling game.
- Cultivation World should not suddenly generate modern corporate CEO drama unless a special world-mixing rule exists.
- Wasteland World should not become a normal campus romance show unless the current save has a justified sheltered school-like settlement.

## What Pools Are Not

Do not write pool entries as finished scenes.

Bad event-pool style:

```text
At age 13, the player character meets a missing classmate case at school, chooses to investigate, and finally discovers a cult.
```

This is too fixed. It removes AI adaptation and turns the life simulator into a script.

Bad option style:

```text
Option 1: Investigate.
Option 2: Call the police.
Option 3: Run away.
```

This is too shallow and should not be stored as the pool's main content.

## Seed-Based Writing Style

Pool entries should be written as seeds.

An event seed should describe:

- What kind of situation it can inspire.
- Which life stage and world states it fits.
- Which tags and risks it carries.
- What normal explanations or hidden possibilities may exist.
- How AI should adapt it.
- What effects it may produce.

Example:

```json
{
  "id": "missing_classmate",
  "name": "Missing Classmate",
  "worldId": "cthulhu",
  "type": "event_seed",
  "lifeStages": ["adolescence", "youth"],
  "sceneTags": ["school", "ordinary_life", "light_anomaly"],
  "riskLevel": "medium",
  "requires": {
    "truthExposureMin": 5
  },
  "normalExplanations": [
    "transfer",
    "family_reason",
    "runaway",
    "police_investigation"
  ],
  "hiddenPossibilities": [
    "dream_pollution",
    "cult_contact",
    "official_coverup",
    "assimilation",
    "memory_tampering"
  ],
  "aiUseRule": "Use the player character's truth exposure, sanity pressure, social normalcy, and NPC relationships to choose ordinary or abnormal framing. Do not force investigation.",
  "possibleEffects": [
    "truthExposureUp",
    "sanityPressureUp",
    "socialNormalcyDown",
    "importantNPCClue",
    "ordinaryLifeContinuesIfAvoided"
  ]
}
```

AI may turn this into many different events.

For example, if the player character is 13, in school, has high Intelligence, moderate truth exposure, and a classmate relationship, AI may write:

```text
你 13 岁时，班里一个平时沉默的同学突然失踪。老师说他转学了，但你发现他的课桌里还留着一本写满陌生符号的笔记本。
```

That generated event is not stored in the pool. It belongs to the current run history.

## Runtime Retrieval Flow

The intended runtime flow is:

1. Read current save state.
2. Determine current world, age/life stage, location, identity, goals, active NPCs, faction state, world progress, and danger level.
3. Filter pools by `worldId`, `type`, `lifeStages`, tags, requirements, exclusions, risk level, and prior usage.
4. Select 1-3 relevant seeds.
5. Send only those seeds plus current state summary to AI.
6. AI generates the current event, options, consequences, and structured state changes.
7. Game engine validates the result before applying it.

Do not send the entire world pool to AI for every event.

## Pool Types

Recommended pool types:

- `identity_seed`: starting identity, family, social layer, birth context.
- `talent_seed`: talent definition and mechanical/narrative effects.
- `npc_template_seed`: NPC identity anchor, not a complete person.
- `event_seed`: reusable situation seed.
- `faction_seed`: organization type, route, risk, growth pressure.
- `location_seed`: place type, atmosphere, access, dangers, event hooks.
- `ending_seed`: ending tag or settlement hook.
- `world_rule_seed`: world-specific generation rule or constraint.

## Common Fields

Use stable English IDs in runtime data. Human-facing Chinese names may live in Markdown or localization tables.

Common fields:

```json
{
  "id": "stable_snake_case_id",
  "worldId": "cultivation|cthulhu|wasteland",
  "type": "event_seed",
  "nameKey": "localization.key",
  "lifeStages": ["birth", "childhood", "adolescence", "youth", "adulthood", "middleAge", "oldAge"],
  "sceneTags": ["school", "sect", "camp"],
  "routeTags": ["ordinary_life", "power", "survival"],
  "riskLevel": "low|medium|high|extreme",
  "requires": {},
  "excludes": {},
  "normalExplanations": [],
  "hiddenPossibilities": [],
  "possibleEffects": [],
  "aiUseRule": "Short instruction for AI adaptation.",
  "balanceNotes": "Optional designer note.",
  "codexTags": [],
  "achievementHooks": [],
  "endingHooks": []
}
```

## Requirements And Filtering

Pool entries should support program filtering.

Possible requirement fields:

- age or life stage
- location tag
- identity tag
- attribute minimum or maximum
- manifested value range
- exposure value range
- talent tag
- world progression value
- relationship tag or relationship threshold
- important NPC presence
- faction membership or faction relationship
- prior event tag
- cooldown or one-time usage
- danger level
- route flag
- unlock status

Example:

```json
{
  "requires": {
    "lifeStageAny": ["adolescence", "youth"],
    "locationTagAny": ["school"],
    "truthExposureMin": 5,
    "socialNormalcyMin": 40
  },
  "excludes": {
    "usedEventIds": ["missing_classmate"],
    "routeFlagsAny": ["left_school_permanently"]
  }
}
```

## AI Use Rules

AI must:

- Treat seeds as prompts, not finished scenes.
- Adapt seeds to the current save.
- Respect age, world rules, identity, attributes, manifestation, exposure, relationships, faction state, and history.
- Keep player choice open.
- Avoid forcing one route unless current state justifies it.
- Preserve world tone and world-specific logic.
- Return structured state changes for validation.

AI must not:

- Copy seed text as final event text without adaptation.
- Force investigation, cultivation, combat, romance, faction creation, or main-route progress when the player character did not reasonably enter that path.
- Use one world's seeds in another world unless a future crossover/custom-world rule explicitly permits it.
- Treat NPC templates as all-attribute-perfect people.
- Treat high Luck as perfect safety.

## MVP Quantity Standard

MVP should start with enough seeds to give each world a stable flavor without trying to become complete.

Per MVP world target:

| Pool type | MVP target |
|---|---:|
| Starting identity seeds | about 12 |
| World-specific talent seeds | about 20 |
| Event seeds | about 20-25 |
| NPC template seeds | about 15 |
| Faction seeds | about 6-10 |
| Location seeds | about 8-12 |
| Ending seeds | about 8-12 |

For the current planning stage, identity, talent, event, NPC template, faction, location, and ending seeds now have runtime priority. Each MVP world meets the minimum fuller playtest target; future work can grow pools toward the ideal target.

Current conversion status:

- Talent seeds, event seeds, and NPC template seeds may be converted into runtime JSON after review.
- Identity seeds use limited player visibility. The player sees identity name, short description, possible routes, and approximate risk. Hidden secrets, true risk, special NPCs, family details, and concealed route hooks are generated or stored backstage.
- Faction and location seeds are runtime JSON pools for all three MVP worlds.
- Identity, talent, event, NPC template, faction, location, and ending seeds now meet the fuller playtest minimum target for all three MVP worlds, but can still grow toward the ideal target.

Current runtime status:

- `identity-seeds.json`, `talents.json`, `event-seeds.json`, `npc-templates.json`, `faction-seeds.json`, and `location-seeds.json` exist for each MVP world.
- These JSON files use stable English IDs, tags, and keys.
- Human-facing Chinese names and prose remain in Markdown drafts or future localization tables.
- `npm run audit:content` reports current pool counts against the fuller playtest content target. It is advisory by default. `npm run audit:content -- --strict` now passes when all minimums are met.

## Identity Seed Visibility

Starting identity seeds should not reveal the whole background.

Player-facing identity display includes:

- identity name
- short description
- possible route hints
- approximate risk label

Backend-only identity generation may include:

- family details
- exact class/resource values
- hidden secrets
- special important NPCs
- true risk modifiers
- concealed route hooks
- faction ties
- abnormal exposure causes
- later reveal conditions

This keeps character creation readable while preserving AI surprise and life-simulation depth.

## Review Rule

Before content pool seeds become runtime JSON, they should pass three checks:

- World fit: the seed belongs to the selected world.
- Life-simulation fit: the seed affects a life path, relationship, choice, consequence, biography, score, or ending.
- Retrieval fit: the seed has enough tags and requirements for the program to select it safely.

After conversion, runtime JSON should also pass:

```bash
npm run validate:data
```

See `docs/data-validation.md` for the validator rules and schema references.
