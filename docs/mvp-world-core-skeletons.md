# MVP World Core Skeletons

This document compares the three MVP worlds at the same abstraction level. Human-readable world details live in each `worlds/<world>/world.md`; runtime-readable configuration lives in `worlds/<world>/*.json`.

## Shared Rule

All three MVP worlds are life-simulation worlds. Age, relationships, important NPCs, choices, consequences, biography, score, and endings remain central. World-specific systems add flavor and rules, but they must feed back into the player character's life path.

## Cultivation World

- Core fantasy: grow from mortal life into supernatural cultivation while navigating sects, clans, inheritance, breakthroughs, lifespan, enemies, and dao choices.
- Secondary progression: realm, cultivation foundation, sect/clan status, resources, karma/reputation, lifespan pressure.
- MVP scope: Mortal, Qi Refining, Foundation Establishment, Golden Core, Nascent Soul, Spirit Transformation.
- Main routes: sect disciple, wandering cultivator, clan heir, demonic path, hidden cultivator.
- Faction emphasis: lineage, hierarchy, resources, oaths, reputation, rival sect conflict.
- Main danger: breakthrough failure, enemies, resource competition, betrayal, heavenly tribulation, being used by stronger powers.

## Cthulhu Life World

- Core fantasy: live a normal human life inside a modern society where abnormal truth is hidden but leaking.
- Secondary progression: truth exposure, sanity pressure, corruption/assimilation, occult contact, social normalcy, personal goal.
- MVP scope: random modern city-stage with abnormality publicity level 2 by default.
- Main routes: ordinary life, truth pursuit, secret organization, cult/legacy, dream route, resistance, ascension, salvation/destruction.
- Faction emphasis: secrecy, social camouflage, forbidden knowledge, official attention, obsession, betrayal, corruption.
- Main danger: being noticed, misinformation, sanity pressure, pollution, social collapse, official intervention, entity attention.

## Wasteland World

- Core fantasy: survive and grow through a collapsed world where scarcity, trust, injury, camp politics, and moral pressure shape a whole life.
- Secondary progression: survival days, camp stage, resources, injuries, faction trust, environmental danger.
- MVP scope: personal survival plus small-to-medium camp/faction growth.
- Main routes: lone survivor, camp builder, scavenger, warlord, doctor/technician, mutant adaptation, shelter ruler, wasteland savior.
- Faction emphasis: operations, supplies, defense, territory, survival trust, trade routes, violent conflict.
- Main danger: hunger, thirst, disease, injury, betrayal, resource collapse, raids, environmental hazards, irreversible damage.

## Runtime Configuration Checklist

Each MVP world should maintain:

- `world.md`: human/AI-developer world overview.
- `world.config.json`: stable runtime identity, progression, route, tone, faction, and guardrail fields.
- `talents.json`: world-specific talents.
- `npc-templates.json`: NPC identity anchor templates.
- `event-seeds.json`: reusable event seeds.
- `endings.json`: ending tags and settlement hooks.
- Extra system JSON when the world needs dedicated mechanics.
