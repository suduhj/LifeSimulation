# Runtime Data Validation

This document defines the first MVP guardrail for program-readable world data.

## Purpose

World data is not prose. It is runtime configuration that the game engine, AI prompt builder, save validator, achievements, codex, and ending system will read.

The validator exists to catch low-level drift before it reaches AI generation:

- invalid JSON
- world folder and `worldId` mismatch
- invalid stable IDs
- unsupported rarity, risk, life stage, or manifestation values
- missing generation anchors in identity, talent, event, and NPC template pools
- content pools that fall below the current MVP quantity baseline

This matters because the game is a multi-world AI life simulator. If the data layer drifts, the AI will quietly mix worlds, misread seeds, or generate outcomes the engine cannot safely apply.

## Command

Run the validator from the project root:

```bash
npm run validate:data
```

Equivalent direct command:

```bash
node tools/validate-world-data.mjs
```

Run tests:

```bash
npm test
```

## Current Validated Files

The validator scans all JSON files under `worlds/`.

For MVP, the key pool files are:

- `worlds/cultivation/identity-seeds.json`
- `worlds/cultivation/talents.json`
- `worlds/cultivation/event-seeds.json`
- `worlds/cultivation/npc-templates.json`
- `worlds/cthulhu/identity-seeds.json`
- `worlds/cthulhu/talents.json`
- `worlds/cthulhu/event-seeds.json`
- `worlds/cthulhu/npc-templates.json`
- `worlds/wasteland/identity-seeds.json`
- `worlds/wasteland/talents.json`
- `worlds/wasteland/event-seeds.json`
- `worlds/wasteland/npc-templates.json`

It also parses and lightly checks world config, endings, realms, and world-specific rule JSON.

## Stable ID Rule

Runtime IDs and tags use snake_case:

```text
^[a-z][a-z0-9_]*$
```

Use stable IDs for:

- world IDs
- seed IDs
- tags
- event effect keys
- route tags
- ending tags
- runtime progress IDs

Do not use Chinese prose in runtime IDs or tags. Human-facing Chinese text belongs in Markdown docs, localization files, or generated player text.

## MVP Pool Minimums

The validator currently enforces these minimums:

| Pool | Minimum |
|---|---:|
| `identity_seed_pool` | 8 |
| `talent_seed_pool` | 20 |
| `event_seed_pool` | 20 |
| `npc_template_seed_pool` | 12 |

These are not final content targets. They are guardrails that prevent an MVP world from becoming too thin compared with the others.

## Schema Reference

Reference schemas live in `schemas/`:

- `schemas/world-content-pools.schema.json`
- `schemas/ai-event-response.schema.json`

The local validator is the practical authority for now because it can include project-specific checks such as world-folder matching and CJK warnings.

## When To Run

Run validation after:

- adding or editing runtime JSON
- converting a Markdown draft into JSON
- changing ID naming rules
- adding a new MVP or custom world folder
- changing AI response fields that the engine will parse

Do not treat validation as narrative QA. It checks structure and low-level consistency. Tone, pacing, and life-simulation quality still need design review and playtesting.
