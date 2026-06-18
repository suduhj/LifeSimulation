# Product Requirements

## Project Vision

Build an AI-powered life simulator where players choose a world, draw talents, allocate starting attributes, and live through a branching life story. The main experience should feel like entering a living novel, while still giving players meaningful strategy, replayability, and surprising outcomes.

This is a multi-world life simulator, not only a cultivation game. Cultivation World is one MVP world among three. Product decisions must preserve support for Cthulhu Life World, Post-Apocalyptic Wasteland, and future custom worlds.

World design and runtime data must be separated. Human and AI-developer guidance lives in `.md` files, while game-readable configuration, talents, NPC templates, event seeds, endings, and world-specific systems live in `.json` files under `worlds/<world>/`.

The life-simulation core has priority over every subsystem. Factions, cultivation, eldritch truth, wasteland survival, business, romance, combat, exploration, organizations, and power growth should all feed back into the player character's life path, relationships, aging, choices, consequences, biography, score, and ending.

Content pools are searchable world-material seed libraries, not fixed plot libraries. They control world style, provide generation material, support program filtering, reduce uncontrolled AI improvisation, and help achievements, codex entries, ending statistics, and unlocks. Detailed content-pool rules live in [Content Pool Rules](./content-pool-rules.md). The current human-readable MVP pool draft lives in [MVP Content Pool Draft](./mvp-content-pool-draft.md) and should not be treated as runtime JSON until reviewed.

## Current Direction

The game should include all five player fantasies:

- Story immersion: the main priority. AI writes coherent, emotional, world-aware life events.
- Fate draw: players enjoy rerolling talents and starting conditions.
- Growth strategy: attributes, choices, relationships, and resources affect long-term outcomes.
- World exploration: different worlds should create different rules, risks, cultures, and endings.
- Replayable chaos: unusual talent and event combinations should create memorable runs.

Ordinary player UI must be fully Chinese. Stable backend IDs may only appear in GM/debug surfaces, logs, schemas, and backend runtime data. Do not show player-facing placeholder labels such as `未命名天赋`, `未知天赋`, `重要人物`, `未知身份`, or `身份尚不明确`. If a player-visible talent, NPC, or identity label is missing, the data must be repaired or hidden before display rather than replaced with a generic placeholder. Ordinary browser payloads should not include hidden NPC roles, template IDs, hidden info, or raw backend relationship roles unless the surface is explicitly GM/debug. Player-facing event text must also keep age and causality aligned: the current playable node must clearly show which age it belongs to, use a concrete Chinese event title instead of generic labels such as "人生事件" or "人生片段", and make the branch arise naturally from prior context instead of jumping to a result first. Choices must not suddenly mention people, objects, places, clues, factions, or items that the event body has not already introduced. Choice metadata may show fuzzy risk/difficulty only; it must not pre-announce resolved outcomes such as already obtaining an item, successfully hiding, successfully extracting information, or "成功率" wording that feels like a result guarantee.

## AI Role

The AI should be a hybrid system:

- Early game: acts like a narrative author, giving polished and immersive life events.
- Mid game: acts like a game master, generating events and consequences based on rules.
- Late game: acts more like a world engine, allowing factions, NPCs, and world state to evolve.

Inside an active run, the AI assistant is not a pure strategy guide. It should behave as fate narrator, world host, event trigger, and consequence interpreter. Asking the AI questions, exploring surroundings, analyzing options, or talking to NPCs can consume time, trigger events, reveal information, attract attention, or change the plot.

## Core Loop

1. Player selects a world.
2. Player receives a random identity or creates a limited custom identity.
3. Player draws or rerolls starting talents.
4. Player allocates starting attribute points.
5. The simulation generates a spoiler-safe fate preview as a static dossier, then formal life begins from birth in the life timeline.
6. Opening life records advance strictly by age from 0 to the first action age. Later life may advance by year or by multi-year span when pacing, age, world state, and narrative importance justify it.
7. Each time step triggers one or more story events. AI may decide event count, but events must remain consistent with the world, character state, talents, attributes, history, and rules.
8. Player chooses one of the 3 AI-generated choices, or uses the optional 4th entry to enter a free-form attempted action when the current event allows interaction.
9. AI generates narrative consequences, proposed stat changes, relationship changes, world-state changes, and follow-up options.
10. The game engine validates and applies allowed consequences.
11. The cycle repeats until the player reaches a final ending, death, transcendence, transformation, world-ending outcome, or another world-specific conclusion.
12. The run ends with a life summary, score or evaluation, important choices, unlocked content, and optional replay seed.

## Web Player Flow

The web playtest uses a step-by-step creation flow, then switches to a scrolling life timeline.

Creation flow:

1. Home / identity setup page.
2. Attribute allocation page.
3. Talent draw page.
4. Fate preview page.
5. Formal life timeline from age 0, including early-years auto-progression stage nodes.
6. First meaningful branch/current node.
7. Ordinary life-event timeline.
8. Action result merged into the corresponding lived timeline node.
9. Next life event appended below it.

Page separation rules:

- The identity page only contains world, name, gender, personality direction, and race/identity-type tendency. It must not also show talent draw, life events, current run state, or debug information.
- The attribute page only contains the five core attributes: Appearance, Intelligence, Constitution, Family Background, and Luck, with remaining/used points shown as `20 / 20`.
- The talent page is a separate draw-5-keep-3 page.
- The fate preview page shows world, player character basic information, kept talents, five allocated attributes, AI-generated birth background, birth family, parents/guardians in broad terms, destiny preview, surrounding reaction, world context, and current situation.
- The fate preview page must not show initial important NPC lists, unresolved-detail sections, future triggers, route hooks, hidden NPC secrets, talent-manifestation progression, early-years auto progression, or labels such as "future foreshadowing". Hidden NPC functions, unexplained details, true hooks, and age-by-age manifestation belong in backend `hiddenHooks`, `unresolvedThreads`, `opening.earlyLifeTimeline`, internal notes, talent detail cards, or GM/debug surfaces.
- Ordinary fate preview is a backend-sanitized static dossier, not raw AI prose. The browser should receive only safe fields such as birth place, birth family, broad guardian/family context, Family Background expression, destiny preview, surrounding reaction, world context, and current situation. Age-specific early-life narration, suspicious objects, secret NPC functions, route hooks, and unexplained-detail lists must be omitted from ordinary output and stored in backend/GM structures until discovered.
- After the player clicks `开始人生`, the formal life page starts from age 0 and displays early-years nodes in strict age order: 0岁, 1岁, 2岁, and so on until the first meaningful branch. Each node must match that age and contain meaningful life texture, not wrong-age content or empty "learned to walk" filler.
- After the first meaningful branch, the life page becomes a downward timeline. Past life experiences stay above, and the current branch sits at the bottom with three choices and a free-form input box.
- Formal life must not skip 0-1 years or restart from age 2. It must not duplicate the same action resolution or opening text in separate ordinary-player cards.
- The current branch must show a visible `X 岁：具体事件名` title. Its body should first explain what prior life event, family situation, NPC reaction, clue, or immediate scene naturally causes the choice pressure, then present the choices. Do not show a generic card title such as "人生事件".

Within the life timeline, selecting an option should not feel like teleporting to a new unrelated page. The selected action should resolve in place, merge the consequence into the relevant lived timeline node, show the next playable branch at the bottom current node, and scroll toward it. This supports the feeling that the player's life is continuously being written downward.

Action-result writing requirements:

- State what the player just chose or attempted.
- Show the immediate result.
- Show NPC reactions from parents, guardians, mentors, companions, enemies, or other important characters when relevant.
- Show state changes on body, resources, relationships, environment, or world progress.
- Leave non-spoiler future dark lines through unexplained details instead of revealing trigger conditions.
- Transition naturally into the next stage.
- Do not duplicate the same full result in a separate bottom `行动结算` card or standalone `变化提示` event card. Compact visible changes can be attached to the relevant timeline node.

## Shared Simulation Systems

Shared simulation system rules live in `game-design/simulation-systems.md`.

Current shared decisions:

- Gender deeply affects story routes, and different worlds or genders can create different opportunities, risks, social pressure, and route access.
- Player-facing events use pure text life-simulator format: year or age, concise event text, 3 AI-generated rich choices, optional 4th free-form action entry, and visible changes after resolution.
- By default, each normal playable event presents exactly 3 rich choices and offers free-form player input through the separate optional 4th entry.
- Normal free-form input is handled directly without AI restating it. Complex, high-risk, ambiguous, or world-breaking input should be explained first and may require confirmation or clarification.
- Free-form input is an attempted action, not guaranteed reality. It is judged by attributes, talents, age, identity, world rules, narrative plausibility, NPC relationships, faction relationships, current states, historical events, random probability, and hidden difficulty parameters.
- Failed free-form input resolves by risk level. High-risk failures may cause serious consequences, but failures can also create unexpected gains such as clues, NPC contact, hidden route seeds, or new story hooks with a cost.
- Backend events are stored as structured JSON with event data, options, attribute changes, NPC relationship changes, state changes, progression changes, and world-state changes.
- Events and choices must be richly written. Avoid bare options such as "study", "escape", "fight", or "talk".
- Attribute and state changes should be displayed after validation. Attribute changes show change amount, current value, source type, temporary/permanent status, and expected recovery condition when recoverable.
- Success rates are shown fuzzily, such as "high chance", "very risky", or "almost impossible", rather than exact percentages by default.
- NPC relationships use internal numbers, but player-facing display defaults to labels plus rough ranges, such as "friendly (about 60-70)". Different worlds may override relationship labels or presentation style.
- NPC relationships use five shared base dimensions: affinity, trust, fear, interest binding, and secret leverage. Worlds may add their own relationship dimensions.
- Important NPCs have personality, stance, hidden information, faction ties, and persistent memories.
- Initial important NPCs are generated automatically from world, identity, Family Background, talents, and birth background. Generate 3-5 by default, with count adjusted by identity and Family Background. Players cannot manually specify important NPC relationships during normal starting setup. Ordinary fate preview must not list these NPCs unless the player character already plausibly knows them; undiscovered or hidden-function NPCs remain backend/GM-only until revealed by story action and state patches.
- Each world has its own NPC template pool, and AI must use or reference it when generating important NPCs.
- New important NPCs may appear dynamically through story events. Once marked important, they preserve long-term memory across the run.
- Faction members can be promoted into important NPCs when they gain story weight. Members can be ordinary members, backbone members, core members, or full important NPCs such as deputies, heirs, lovers, rivals, traitors, disciples, protectors, or successors. Promotion quantity is controlled by faction scale and life-simulation pacing.
- Important NPC attributes and talents are fuzzy by default. More information unlocks through relationship progress, Intelligence, talents, investigation, observation, faction intelligence, or world-specific methods.
- Important NPC information can be wrong or incomplete when world logic supports it. NPCs may lie, disguise themselves, hide faction ties, fake loyalty, or conceal hostility. Misjudgment strength can differ by world. High Intelligence, strong relationship dimensions, special talents, investigation, long-term observation, faction intelligence, and world-specific detection methods can reduce misjudgment probability.
- Players can join factions and create factions when story and world rules allow it. Faction creation uses default hard requirements plus world-specific requirements: the player character needs a goal, at least one plausible follower or partner, some resource base, an operating place or channel, and a reason others would join or obey, then each world adds its own legitimacy, secrecy, survival, power, or resource requirements. Small-faction growth should be an important route. It uses four shared axes: operations/construction, social politics, conflict/expansion, and ideology/identity. Different worlds weight these axes differently.
- Endings include overall evaluation, score, multiple tags, AI biography summary, attribute settlement, relationship settlement, faction settlement, world-state settlement, and unlocks.
- Every completed run should receive a score.
- Each life run has independent AI memory from birth to death. New runs do not inherit character memories unless a special system says so.
- Account-level data may preserve achievements, gallery/codex records, unlocked talents, unlocked worlds, discovered endings, and meta progression.

## Progression Model

All worlds use age as the shared life-simulation axis. The player should always understand how old their character is and how their life has changed over time.

The default pacing is yearly progression, but AI may compress uneventful periods into multi-year spans. Each step should produce at least one meaningful event, choice, consequence, or summary. Important years may contain larger event chains, while uneventful years may be summarized briefly to preserve rhythm.

High starting potential must not fully appear at birth. Detailed potential, manifestation, exposure, age-gating, and world-reaction rules live in [Potential, Manifestation, And Exposure Rules](./potential-manifestation-exposure-rules.md).

Each world also has its own secondary progression system:

- Cultivation World: cultivation realm, sect status, techniques, tribulations, resources, and reputation.
- Cthulhu Life World: truth exposure, sanity or corruption pressure, occult contact, hidden-world awareness, social normalcy, and personal life goals.
- Post-Apocalyptic Wasteland: survival days, shelter or camp stage, resources, injuries, faction trust, and environmental danger.

The shared age axis keeps the game recognizable as a life simulator. The secondary progression system gives each world its own rules and flavor.

## Identity System

The game supports random identity and limited custom identity.

Random identity:

- AI generates the character's name, gender, birth background, family situation, early personality, social position, and starting life context.
- Identity generation must be based on selected world, starting attributes, selected talents, and world rules.
- Birth identity is specifically determined by selected world + Family Background + talents. Attributes and world rules refine the details.
- Legendary and Mythic talents can forcibly alter birth identity when their effects justify it.

Limited custom identity:

- Player may define only name and gender.
- AI generates all other identity details, including background, personality, family, social position, early environment, and starting conflicts.
- AI must still respect selected world, Family Background, attributes, talents, and world rules.

## World Scope

MVP world strategy:

- Use the "few but deep" model.
- Ship 3 carefully designed worlds first.
- Keep the three MVP worlds at comparable skeleton depth before over-specializing any single world.
- Each MVP world should have distinct rules, tone, starting backgrounds, talent restrictions, event types, and ending styles.
- Avoid shipping many shallow worlds in the MVP.
- Same-level MVP world comparison lives in [MVP World Core Skeletons](./mvp-world-core-skeletons.md).

MVP worlds:

1. Cultivation World
   - Core fantasy: rise from mortal life into cultivation, sect politics, secret techniques, trials, breakthroughs, and possible ascension.
   - Human design: `worlds/cultivation/world.md`.
   - Runtime data: `worlds/cultivation/*.json`.
   - Likely focus: long-term growth, talent synergy, faction reputation, resources, danger during breakthroughs, fate encounters, lifespan pressure, and dao choices.
   - MVP realm scope: Mortal, Qi Refining, Foundation Establishment, Golden Core, Nascent Soul, and Spirit Transformation.
   - Formal release realm expansion: Void Refinement, Body Integration, Mahayana, Tribulation Crossing, and Ascension.
   - Core routes: sect route, wandering cultivator route, family/clan route, demonic path, and hidden hermit route.
   - Route switching should be possible when story conditions justify it, such as a clan disciple leaving to become a wandering cultivator or a wandering cultivator being recruited by a sect.
2. Cthulhu Life World
   - Core fantasy: live an entire life inside a Cthulhu-influenced world where normal life, hidden horror, and forbidden truth coexist.
   - Dedicated world design lives in [Cthulhu Life World](./world-cthulhu-life.md).
   - Human design: `worlds/cthulhu/world.md`.
   - Runtime data: `worlds/cthulhu/*.json`.
   - Likely focus: truth exposure, sanity pressure, occult knowledge, strange relationships, hidden cults, unreliable reality, power temptation, transformation, and irreversible choices.
   - The player is not forced into a detective investigation structure.
   - The long-term goal can be slowly revealing the truth of the world, but players may ignore that path and freely pursue ordinary life, ambition, survival, relationships, power, escape, denial, or other personal goals.
   - The world should support extreme paths, not only passive survival. Possible routes include resisting eldritch forces, killing or sealing a Cthulhu-like entity, stealing or inheriting eldritch power, becoming a Cthulhu-like existence, ruling cults, corrupting civilization, destroying the world, saving the world through terrible means, or discovering stranger outcomes.
   - These routes should emerge from accumulated choices, talents, knowledge, sanity/corruption state, relationships, and world-state changes rather than appearing as a single sudden option.
3. Post-Apocalyptic Wasteland
   - Core fantasy: live a whole life in a collapsed world, where scarcity, trust, illness, injury, camp politics, mutation, violence, and moral compromise shape the player character.
   - Human design: `worlds/wasteland/world.md`.
   - Runtime data: `worlds/wasteland/*.json`.
   - Likely focus: survival days, resources, health, shelter/camp stage, trust, scavenging, factions, injuries, long-term trauma, and hard trade-offs.
   - Core routes: lone survivor, camp builder, scavenger, warlord, doctor/technician, mutant adaptation, shelter ruler, and wasteland savior.

Formal release world strategy:

- Add player-customized worlds.
- Players should be able to provide a world premise, genre, social rules, power system, danger level, and tone.
- The game should turn custom world input into structured world rules before simulation starts.
- AI can help draft custom world content, but the game should still validate and structure it.

## Attribute System

Detailed attribute and NPC generation rules live in [Attribute And NPC Rules](./attribute-and-npc-rules.md). That document is authoritative for attribute ranges, source layers, temporary/permanent modifiers, derived capabilities, and NPC generation.

Core attributes:

- Appearance: affects looks, first impressions, social opportunities, fame, and attraction.
- Intelligence: affects learning, strategy, problem solving, research, comprehension, and career growth.
- Constitution: affects health, endurance, lifespan, disease resistance, recovery, and physical survival.
- Family Background: affects starting class, resources, protection, inheritance, education, and social connections.
- Luck: affects rare events, accidents, discoveries, coincidences, and unexpected opportunities.

Derived capabilities:

- Stress resilience is judged from Constitution + Intelligence + experience/state history.
- Social charm is judged from Appearance + Family Background + Intelligence + reputation.
- Combat ability is judged from Constitution + skills + profession + realm + equipment.

Starting attribute setup:

- Player may randomly roll attributes or freely allocate points.
- Free allocation has a base distributable point cap of 20.
- Single-attribute mortal range is 0-20.
- 4 points is ordinary person level for a single attribute.
- Talent effects can add points beyond the base cap.
- Starting or mortal-stage talent-enhanced attributes may break past 20 and can reach the 20-60 range depending on rarity and source.
- Cultivation realms, supernatural systems, divine sources, and late-game growth can exceed 60 according to scaling rules.
- Attribute values should influence both mechanics and narrative interpretation.
- Final attribute values must preserve source layers: base allocation, identity bonus, talent bonus, growth bonus, temporary state modifiers, and permanent injury modifiers.

## Talent Rarity

Detailed talent probability, scaling, realm-breakthrough, and gain-impact rules live in [Talent And Scaling Rules](./talent-and-scaling-rules.md).

Talent rarities:

- Common
- Fine
- Rare
- Epic
- Legendary
- Mythic

Single-talent draw probabilities:

| Rarity | Probability |
|---|---:|
| Common | 45% |
| Fine | 28% |
| Rare | 16% |
| Epic | 7% |
| Legendary | 3% |
| Mythic | 1% |

Talent draw rules:

- Player draws 5 talents.
- Player selects 3 talents to keep.
- Talent pools include both universal talents and world-specific talents.

Each talent should define:

- Name
- Rarity
- Short description
- Mechanical effect
- Narrative effect
- World restrictions, if any
- Hidden downside, if any

Talent effects may:

- Increase or decrease attributes.
- Change available life routes.
- Trigger hidden events.
- Add side effects or trade-offs.
- Modify AI narrative assumptions.
- Unlock world-specific opportunities.

Mythic talents:

- Should appear extremely rarely.
- May change the entire run.
- Can redefine the character's route, identity, destiny, relationship with the world, or access to hidden endings.
- Must still be tracked as structured effects so the game can reason about them consistently.

Scaling principles:

- 20 total attribute points is the ordinary person standard.
- 100 total attribute points is the theoretical mortal comprehensive limit.
- Cultivation and similar supernatural systems must use order-of-magnitude growth, not small flat increases.
- Attribute gain impact depends on both absolute points and percentage of current tier width.
- Realm breakthroughs move the player character into a new tier range instead of adding a small fixed value.
- Attributes have potential, manifestation, and exposure layers. AI should write only the currently manifested portion and use exposure to decide who notices.

## Open Questions

- What are the exact rules, tone, and progression goals for each MVP world?
- What should the random attribute roll rules be compared with free allocation?
- Resolved: normal playable events show 3 AI-generated choices plus a separate optional 4th free-form action entry; non-interactive, death, ending, forced consequence, clarification, and system transition events may use another interaction mode.
- Which entries from the MVP content pool draft should become runtime JSON first?
