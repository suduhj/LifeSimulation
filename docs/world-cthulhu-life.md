# Cthulhu Life World

This document defines the dedicated design skeleton for the Cthulhu Life World MVP world.

The canonical per-world human-readable file is `worlds/cthulhu/world.md`. Runtime-readable data lives in `worlds/cthulhu/*.json`. This file remains as a docs-level design summary and cross-link.

See also:

- `worlds/cthulhu/world.md`
- `worlds/cthulhu/world.config.json`
- `worlds/cthulhu/city-archetypes.json`
- `worlds/cthulhu/opening-information-rules.json`
- `worlds/cthulhu/danger-scaling-rules.json`
- `worlds/cthulhu/public-knowledge-rules.json`
- `worlds/cthulhu/pollution-rules.json`
- `worlds/cthulhu/talents.json`
- `worlds/cthulhu/npc-templates.json`
- `worlds/cthulhu/event-seeds.json`
- `worlds/cthulhu/endings.json`

## Core Positioning

Cthulhu Life World is a life-simulation world, not a forced detective investigation game.

The player character is born into and lives an entire life inside a fictional modern or near-modern urban society. On the surface, the world is highly similar to reality: ordinary people can go to school, work, fall in love, marry, start businesses, raise families, grow old, and live normal lives. Beneath that surface are Old Ones, abnormal events, pollution, dreams, forbidden knowledge, secret organizations, and unspeakable truth.

The player may pursue the hidden truth of the world, but that is not mandatory. The player may also pursue ordinary life, relationships, career, wealth, power, denial, escape, worship, resistance, corruption, ascension, world salvation, world destruction, or stranger outcomes.

## Stage Model

The formal direction is to support all major stage archetypes: fictional coastal metropolis, old city and surrounding towns, modern university city, corporate city, industrial border city, quiet suburban region, and later expanded regions.

The MVP uses `random_city` as the default stage mode. Each run may generate a different birth city according to the player character's identity, Family Background, Luck, talents, exposure, public abnormality level, and personal goal direction.

City naming uses `benchmark_cities_plus_name_pool`: a few benchmark cities provide stable tone and test targets, while archetype-specific name pools provide replay variety. Current benchmark cities are Haijing, Mowen, and Qingshi.

In the MVP, benchmark cities are hidden generation anchors. Players do not directly see or choose Haijing, Mowen, or Qingshi as presets. The player only sees the final generated birth city, surface social context, and starting background.

Runtime city-stage rules live in `worlds/cthulhu/city-archetypes.json`. These archetypes are constraints for AI generation, not fixed maps or forced plots.

## Opening Information And Exploration

The MVP uses minimal opening information. By default, the player sees only the city name, birth family background, and surface birth context.

Abnormal truth, publicity level, major suspicious organizations, dangerous locations, official abnormal departments, and benchmark-city source are hidden by default.

High Intelligence, high Luck, special talents, high exposure, or special Family Background may reveal extra opening clues. These clues must be partial, ambiguous, and age-appropriate. They should not reveal the full truth at birth unless a Mythic talent explicitly allows it.

The player may freely explore the city, ask NPCs, search online, use relationships, use resources, use talents, follow rumors, observe dreams, or try other reasonable actions to learn more. Exploration may reveal useful information, but it can also attract cults, official abnormal departments, non-human entities, dangerous locations, false information, recruitment, surveillance, sacrifice, research, pollution, or social consequences.

AI may set traps and misleading opportunities. High-difficulty worlds may use frequent traps, but traps must be justified by world logic, player behavior, attributes, talents, relationships, and existing clues.

Runtime opening and exploration rules live in `worlds/cthulhu/opening-information-rules.json`.

## Difficulty And Trap Frequency

The Cthulhu MVP uses `slow_burn_dynamic`.

This means the default is standard slow-burn danger, but trap and danger frequency dynamically change according to truth exposure, corruption or assimilation, occult contact, social normalcy, publicity level, player curiosity or recklessness, protection power, faction ties, and entity attention.

Early life should usually focus on atmosphere, odd family details, dreams, rumors, and small warning signs. Danger rises when the player character actively pursues hidden truth, enters forbidden spaces, uses occult methods, accumulates corruption, loses normal social cover, or becomes visible to cults, official abnormal departments, entities, or factions.

Runtime danger scaling rules live in `worlds/cthulhu/danger-scaling-rules.json`.

## Public Knowledge Model

The default public state is: abnormalities are semi-public, but the truth is highly sealed.

Ordinary people know that strange events, rumors, disappearances, cult crimes, shared dreams, sealed towns, unexplained bodies, and abnormal accidents exist. They do not know the underlying truth of Old Ones, corruption, dream contamination, forbidden knowledge, or unspeakable entities.

Official institutions know more, but they do not publicly admit the truth. Public explanations should usually frame abnormal events as disease, accident, crime, rumor, religious incident, mental illness, internet urban legend, natural disaster, terrorist incident, or experimental accident.

The default abnormality publicity level is `2`: strange rumors are widespread, but official sources deny the abnormal truth. This may rise or fall by region, era, event scale, and the player character's actions.

Runtime rules live in `worlds/cthulhu/public-knowledge-rules.json`. Human-facing detail lives in `worlds/cthulhu/world.md`.

## Design Guardrails

- Keep age as the shared life-simulation axis.
- Do not force the player into an investigator role.
- Do not reveal the full truth too early.
- Let normal life and hidden horror coexist.
- Make truth pursuit optional but meaningful.
- Let extreme routes emerge from accumulated choices, talents, relationships, exposure, corruption, knowledge, and world-state changes.
- Use potential, manifestation, and exposure rules for abnormal birth, childhood, and talent expression.
- Preserve the multi-world project foundation; Cthulhu mechanics must not become global rules unless explicitly promoted to shared systems.
- Use randomized city-stage selection for MVP instead of a single fixed default city.
- Use benchmark cities plus a name pool for MVP city naming.
- Keep benchmark cities hidden from player-facing selection in MVP.
- Show minimal opening city information by default.
- Allow high Intelligence, high Luck, special talents, exposure, or special Family Background to reveal ambiguous extra opening clues.
- Keep Cthulhu public knowledge separate from full truth: ordinary NPCs may know rumors, but they must not automatically understand eldritch causes.
- Use official factions, public explanation libraries, and incident-handling flow when abnormal events become visible.

## World-Specific Progression

Cthulhu Life World uses age as the main axis and these secondary progression values:

- Truth Exposure: how much of the real world structure the player character understands.
- Sanity Pressure: mental strain from contradiction, fear, forbidden knowledge, trauma, and cosmic contact.
- Corruption Or Assimilation: how much the player character is changed by eldritch influence.
- Occult Contact: degree of contact with rituals, cults, relics, entities, dreams, symbols, or forbidden texts.
- Social Normalcy: how normal the player character appears to family, NPCs, institutions, and society.
- Personal Goal Progress: progress toward the player character's chosen life direction.

These values should affect event generation, NPC reactions, available choices, hidden routes, and endings.

## Core Route Space

The world should support at least these route families:

- Ordinary Life Route: ignore or avoid the hidden world while pursuing relationships, career, family, status, survival, or happiness.
- Truth Pursuit Route: gradually uncover what the world really is and decide what to do with that knowledge.
- Resistance Route: fight cults, seal entities, protect NPCs, destroy relics, or oppose eldritch influence.
- Power Route: steal, bargain for, inherit, or cultivate eldritch power.
- Assimilation Route: become increasingly non-human, become a vessel, saint, avatar, or Cthulhu-like existence.
- World Salvation Route: save the world through sacrifice, terrible choices, forbidden methods, or partial truth control.
- World Destruction Route: corrupt civilization, awaken entities, lead cults, or become the catastrophe.
- Escape Or Denial Route: flee, forget, suppress memories, live behind false normalcy, or make a bargain to avoid truth.

Routes are not exclusive. A player character may shift from denial to truth pursuit, from resistance to power, from victim to cult leader, or from ordinary life to cosmic-scale influence.

## Event Types

Potential event categories:

- Family and childhood unease
- Strange dreams
- Unexplained coincidences
- Social exclusion or fascination
- Hidden books, symbols, songs, or places
- Cult contact
- Institutional attention
- Religious or occult pressure
- NPC disappearance, transformation, or obsession
- Forbidden knowledge opportunity
- Power temptation
- Sanity crisis
- Body or perception mutation
- Protective relationship
- Betrayal or sacrifice
- Entity attention
- Truth breakthrough
- Route-defining bargain
- World-scale escalation

## AI Behavior Rules

AI should:

- Treat ordinary life as real, not as filler before horror.
- Let NPCs have personal motives, not only cult/horror functions.
- Make horror gradual unless the player's choices or exposure justify sudden escalation.
- Track the difference between fear, madness, corruption, knowledge, and transformation.
- Let high Luck create dangerous opportunities and unlikely reversals, not perfect safety.
- Use exposure to decide who notices abnormality.
- Use world tolerance and protection power before deciding whether institutions, cults, or entities can reach the player character.
- Avoid making every strange event directly connected to the final truth.
- Use the public knowledge model before escalating institutional reactions: first local normal handling, then official abnormal intervention when ordinary explanations fail.
- Let the selected city archetype affect family background, local NPCs, event seeds, organization presence, public explanation style, and truth density.
- If a benchmark city is selected, preserve its core premise. If a name-pool city is selected, let AI generate local institutions, districts, rumors, and family context from the archetype.
- Do not tell the player whether a generated city came from a benchmark city or a name pool unless a future debug or creator mode exposes it.
- When the player freely explores or asks questions, judge actions by plausibility, relevant attributes, talents, relationships/resources, world state/exposure, and random probability. Bad outcomes are allowed when justified.

AI should not:

- Force every run into an investigation plot.
- Reveal the cosmic truth in early childhood without a justified trigger.
- Treat corruption as only a loss condition.
- Treat sanity pressure as only a simple health bar.
- Make all cult NPCs stupid, evil, or identical.
- Make every powerful entity immediately omniscient about the player character.

## Ending Families

Potential ending families:

- Ordinary life ending
- Denial ending
- Partial truth ending
- Full truth ending
- Resistance ending
- Sealing ending
- Entity-killer ending
- Vessel ending
- Cult leader ending
- Eldritch inheritance ending
- Cthulhu-like ascension ending
- World salvation ending
- World destruction ending
- Disappearance ending
- Rewritten reality ending

## Open Questions

- What is the default tone: slow-burn dread, urban weirdness, gothic family horror, cosmic fantasy, or dark heroic?
- How recoverable should sanity pressure and corruption be?
- Should the player character be able to directly communicate with eldritch entities?
- What are the first 10 world-specific talents?
- Should a future creator/debug mode expose benchmark city selection for testing?
- What should the first high-risk exploration trap examples be for each city archetype?
- What should the first concrete scoring categories be for Cthulhu endings?
