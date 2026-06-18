# Project Documentation Index

This folder contains the working standards for the AI life simulator project.

## Standards

- [Product Requirements](./product-requirements.md): game vision, target experience, core loops, and feature scope.
- [Attribute And NPC Rules](./attribute-and-npc-rules.md): authoritative attribute range, source layering, derived capabilities, and NPC generation rules.
- [Talent And Scaling Rules](./talent-and-scaling-rules.md): talent rarity probabilities, power tiers, cultivation scaling, gain impact, and breakthrough rules.
- [Potential, Manifestation, And Exposure Rules](./potential-manifestation-exposure-rules.md): staged attribute manifestation, exposure, age gating, mythic talent manifestation types, and world reactions.
- [Content Pool Rules](./content-pool-rules.md): defines content pools as searchable seed libraries, not fixed plot libraries.
- [Runtime Data Validation](./data-validation.md): validator command, schema references, stable ID rules, and MVP pool minimums.
- [AI Output Protocol](./ai-output-protocol.md): DeepSeek/OpenAI-compatible event JSON contract, choices, free-form input, state patches, and validation rules.
- [MVP Program Skeleton](./mvp-program-skeleton.md): current Node skeleton, mock AI event flow, state-first story continuity flow, CLI demo, and next implementation layer.
- [Playtest Version Standard](./playtest-version-standard.md): defines the required systems, reduced content scale, open event pools, event sources, and experience bar for a real playable MVP.
- [MVP World Core Skeletons](./mvp-world-core-skeletons.md): same-level comparison of Cultivation, Cthulhu Life, and Wasteland world skeletons.
- [MVP Content Pool Draft](./mvp-content-pool-draft.md): human-readable draft of the three MVP worlds' identity, talent, event, and NPC seeds. Not runtime JSON yet.
- Shared simulation systems: `game-design/simulation-systems.md` covers gender impact, event format, display rules, NPC relationships, important NPCs, factions, endings, scoring, AI assistant role, and memory.
- [Cthulhu Life World](./world-cthulhu-life.md): dedicated design skeleton for the Cthulhu MVP world.
- [Technical Standards](./technical-standards.md): stack decisions, architecture rules, AI integration boundaries, and data handling.
- [Design Standards](./design-standards.md): UX principles, UI direction, content tone, and accessibility expectations.
- [Execution Plan](./execution-plan.md): phased implementation order, acceptance gates, and testing expectations.
- [Development Logging](./development-logging.md): how to maintain daily completed work and todo records.

Key current UX requirement: the web playtest uses a step-by-step creation flow, then a scrolling life timeline. Details live in [Product Requirements](./product-requirements.md), [Design Standards](./design-standards.md), [MVP Program Skeleton](./mvp-program-skeleton.md), and [AI Output Protocol](./ai-output-protocol.md).

Key current architecture requirement: continuity-critical story facts live in structured `worldState.storyState`, not in AI prose. Player actions are converted into intent and simulation outcomes first; cross-year branches are directed by an engine-owned annual fact package before AI/mock rendering. The annual package supplies the year's primary life delta and keeps ongoing threads as background pressure, while the validator rejects reopened closed facts, forbidden scene skeletons, and forbidden yearly event shapes. Details live in [Technical Standards](./technical-standards.md) and [MVP Program Skeleton](./mvp-program-skeleton.md).

## Runtime World Data

Human and AI-developer world design lives in `worlds/<world>/world.md`.

Program-readable world data lives beside it as JSON:

- `world.config.json`
- `identity-seeds.json`
- `city-archetypes.json` for Cthulhu-style randomized city-stage data
- `opening-information-rules.json` for Cthulhu-style opening visibility and city exploration risk data
- `danger-scaling-rules.json` for Cthulhu-style dynamic difficulty and trap frequency data
- `talents.json`
- `npc-templates.json`
- `event-seeds.json`
- `endings.json`
- world-specific files such as `realms.json` or `pollution-rules.json`
- Cthulhu-specific public knowledge data lives in `worlds/cthulhu/public-knowledge-rules.json`

Current MVP world folders:

- `worlds/cultivation/`
- `worlds/cthulhu/`
- `worlds/wasteland/`

Shared human-facing design rules also live in `game-design/`.

Runtime schemas and tools:

- `schemas/world-content-pools.schema.json`
- `schemas/ai-event-response.schema.json`
- `tools/validate-world-data.mjs`

Validation commands:

- `npm run validate:data`
- `npm run audit:content -- --strict`
- `npm run check:playtest`
- `npm test`
- `npm run web`
- `npm run play`

## Working Rule

When the project changes, update the relevant standard document before or during implementation. Do not let code drift away from the documented product, technical, and design decisions.
