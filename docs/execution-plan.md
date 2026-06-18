# Execution Plan

## Phase 0: Product Definition

Goal: finish the AI development prompt and core game specification.

Deliverables:

- Initial world list
- Attribute system
- Talent rarity and examples
- AI role and prompt rules
- First playable loop
- MVP feature scope

Acceptance gate:

- A developer or AI coding agent can build the MVP without needing to invent core rules.

## Phase 1: Prototype

Goal: create a playable vertical slice that proves the core loop and prepares for the MVP's 3-world structure.

Deliverables:

- One complete world
- Random identity and limited custom identity setup
- Talent draw: draw 5, player keeps 3
- Attribute setup: random roll or free allocation with 20 base points across 5 core attributes
- Attribute source tracking for base, identity, talent, growth, temporary state, and permanent changes
- Potential, manifestation, and exposure layers for attributes
- Age-gated manifestation so birth and childhood only show age-appropriate power
- Life simulation beginning from birth
- AI-paced yearly or multi-year event loop
- 3 AI-generated choices plus optional 4th-entry free-form action response
- AI-generated event text
- Validated AI-generated consequences
- Ending summary with score, tags, biography-style life summary, relationship settlement, and world-progress settlement
- First mock-AI program skeleton proving world load, initial run, one generated event, and response validation
- Repeatable mock run loop with validated `statePatch` application and portable JSON save/load
- Initial important NPC generation and basic choice-resolution path that changes relationships and memory
- Interactive/scripted CLI playtest with setup wizard, numbered choices 1/2/3, optional 4th-entry free-form attempted actions, short-run ending, quit, and save
- Browser playtest UI backed by the same setup/session/provider/save modules, with AI provider keys kept server-side
- Browser creation flow split into identity setup, attribute allocation, talent draw, fate preview, early-years auto progression, first meaningful branch, and formal life timeline
- Non-interactive opening sequence that generates birth background, initial family/NPC context, early talent manifestation, world atmosphere, and early-years narrative before any player choice or free-form input is allowed
- Formal browser life page that appends action results and next events downward in a continuous timeline instead of replacing the run with disconnected screens
- Hidden local `GM / 调试` tester entry for dev-only presets, scenario injection, debug state, raw AI JSON, validation results, and copyable test reports, with all test-only content excluded from ordinary player generation

Acceptance gate:

- A player can complete one full life run from start to ending in the browser, beginning with separated setup pages, seeing a fate preview and early-years auto progression, then continuing through a timeline with 3 rich choices plus a separate free-form attempted action.

## Phase 2: Systems

Goal: make the game replayable and rule-driven.

Deliverables:

- 3 MVP worlds using the few-but-deep model: Cultivation World, Cthulhu Life World, and Post-Apocalyptic Wasteland
- Project-wide multi-world design guardrail: Cultivation World must not consume the whole product direction
- Shared yearly age-based life progression across all worlds
- World-specific secondary progression systems for realms, truth exposure, and survival/camp state
- Cultivation World MVP realm chain: Mortal, Qi Refining, Foundation Establishment, Golden Core, Nascent Soul, and Spirit Transformation
- Formal release cultivation expansion: Void Refinement, Body Integration, Mahayana, Tribulation Crossing, and Ascension
- Cultivation World supports sect, wandering cultivator, and family/clan routes, including route switching when justified by story state
- Cthulhu Life World routes for ordinary life, truth pursuit, resistance, eldritch inheritance, ascension, world salvation, and world destruction
- Larger talent pool
- Universal and world-specific talent pools
- Talent rarity probability table
- Attribute scaling rules for mortal tiers and cultivation realms
- Gain impact calculation based on current tier width
- Realm breakthrough rules that move the player character into new numerical bands
- Manifestation and exposure rules for mythic talents and abnormal childhood events
- Mythic talents that can alter a full run
- NPC generation rules using identity anchors, composite probability, and anti-all-excellent constraints
- Save/load
- Event history
- Relationship or world-state system
- AI output validation
- Runtime data validation for world JSON
- AI event response protocol and schema

Acceptance gate:

- Runs feel meaningfully different based on world, talents, stats, and choices.
- Runtime JSON passes `npm run validate:data`.
- Tooling tests pass `npm test`.

## Phase 3: Custom Worlds

Goal: prepare the formal release feature that lets players create custom worlds.

Deliverables:

- Custom world creation flow
- Structured world schema generated from player input
- AI-assisted world drafting
- Validation for custom world rules, tone, danger level, and power systems
- Ability to start a life run inside a custom world

Acceptance gate:

- A player can describe a custom world and complete a coherent life run inside it.

## Phase 4: Polish

Goal: improve presentation, UX, and content quality.

Deliverables:

- Improved UI
- Better narrative pacing
- Run summary and unlocks
- Error handling for AI failures
- Prompt tuning and content QA

Acceptance gate:

- The game is understandable, replayable, and presentable to testers.

## Daily Execution Rule

At the end of each development session:

1. Update today's file in `dev-logs/`.
2. List completed work.
3. List decisions made.
4. List remaining todos.
5. Update docs when standards or scope changed.
