# Shared Simulation Systems

This file defines shared systems that apply to every world unless a world-specific document explicitly overrides them.

## Life Simulator Priority

This project is a multi-world AI life simulator. Systems such as factions, power growth, NPC relationships, exploration, combat, business, cults, sects, shelters, and organizations must serve the player character's life story.

The main unit of play is still a life run: birth, growth, relationships, choices, consequences, aging, transformation, death, transcendence, or another world-specific ending. A subsystem can become important in a run, but it should not replace the life-simulation core unless the player's choices make that subsystem the character's main life project.

Every major subsystem should answer:

- How does this affect the player character's life path?
- How does this change relationships and important NPCs?
- How does this create meaningful choices over years?
- How does this affect endings, biography, score, and world state?
- How does this differ by world?

## Gender Impact

Gender is not cosmetic-only. Gender can deeply affect story routes, NPC reactions, family expectations, social pressure, available relationships, risks, opportunities, inheritance logic, organization recruitment, and world-specific routes.

Rules:

- Different worlds may treat gender differently.
- Different genders may unlock different events, route pressures, dangers, protections, social expectations, and relationship dynamics.
- Gender impact must be world-aware and context-aware, not a simple universal bonus or penalty.
- Gender should create story depth, not reduce the player character to stereotypes.
- If a world has supernatural, cultural, sect, clan, corporate, wasteland, or eldritch systems that care about gender, those effects must be documented in that world's rules.

## Event Format

Player-facing events should use pure text life-simulator format.

The player sees:

- year or age
- concise event text
- 3 AI-generated rich choices
- optional 4th free-form action entry
- visible changes after resolution

The system backend stores events as structured JSON, including event data, options, attribute changes, NPC relationship changes, state changes, progression changes, and world-state changes.

The main event text should be brief enough to keep pacing fast, but both event text and options must be richly written. They cannot be bare commands such as "study", "escape", "fight", "investigate", or "talk".

Each option must describe the player character's intent, method, tone, and implied risk or route direction.

Default option count:

- Normal playable events present exactly 3 AI-generated player-facing choices by default.
- Free-form action input is available through a separate optional 4th entry, not as an AI-generated `choice_4`.
- The 3 choices should represent meaningfully different approaches, not three phrasings of the same action.
- If a future world or special event needs a different option count, that override must be explicit in the world or event rules.

Bad option example:

- Study.
- Run away.
- Fight.

Good option examples:

- Stay after class and quietly ask the old literature teacher why the same missing-person notice appears in three different years.
- Pretend you did not hear the whisper from the basement, return to your room, and lock the door before your parents notice you are awake.
- Accept the stranger's invitation, but insist on meeting in a crowded tea house and bring a trusted classmate as cover.

Each event should include:

- Age or time span.
- Event title or short situation.
- Concise narrative.
- Choices 1/2/3 from AI.
- Optional 4th free-form action entry.
- Visible consequence preview when appropriate.
- Fuzzy success or risk estimate when appropriate.

Options should not be empty labels. Each option should express what the player character is trying to do, what tone it carries, and what kind of risk or opportunity it implies.

Backend event JSON should preserve at least:

- event id
- world id
- run id
- age or time span
- event title
- player-facing narrative
- hidden context
- choices
- free-form action interpretation
- fuzzy success labels
- exact internal checks, if any
- attribute changes
- NPC relationship changes
- temporary state changes
- permanent state changes
- world-specific progression changes
- faction changes
- important NPC updates
- world-state changes
- displayed change summary
- follow-up hooks

## Display Rules

Attribute changes must be shown.

Whenever attributes, relationships, progression values, resources, injuries, temporary states, permanent changes, exposure, or world state change, the game should show those changes after validation.

Attribute change display uses the detailed format by default:

- attribute name
- change amount
- current value after change
- source type
- temporary or permanent status
- expected recovery condition, if recoverable

Examples:

- Intelligence +1 (current 7, source: study growth, permanent).
- Constitution -2 (current 5, source: serious injury, temporary, recovery: rest for 3 months or receive treatment).
- Family Background -5 (current 2, source: family bankruptcy, permanent, recovery: rebuild family assets or join a new patron faction).

If the exact recovery condition is unknown, show a fuzzy condition such as "requires treatment", "requires story recovery", "unknown", or "possibly irreversible".

Success rate should be fuzzy, not exact by default.

Allowed success/risk labels include:

- almost certain
- high chance
- decent chance
- uncertain
- low chance
- very risky
- extremely dangerous
- almost impossible

The game may store exact internal probabilities, but the player-facing UI should usually show fuzzy labels unless a future debug mode or special ability reveals more detail.

## NPC Relationship Display

NPC relationships are multi-dimensional.

Shared base dimensions:

- affinity: liking, affection, friendliness, emotional closeness, romance tendency.
- trust: belief that the player character is reliable, honest, safe, or worth depending on.
- fear: intimidation, awe, terror, pressure, or reluctance to oppose the player character.
- interestBinding: shared benefits, debt, dependency, business ties, faction ties, resource reliance, or mutual usefulness.
- secretLeverage: secrets known, blackmail, hidden knowledge, taboo ties, guilt, or dangerous information one side holds over the other.

This allows NPCs to be emotionally complex. An NPC can love the player character but distrust them, fear them but remain loyal, hate them but depend on them, or be friendly while hiding dangerous information.

Different worlds may add world-specific relationship dimensions.

Examples:

- Cultivation: karma, dao companion bond, master-disciple duty, sect loyalty, oath constraint.
- Cthulhu: contamination dependence, shared dream link, forbidden knowledge bond, cult pressure, entity attention.
- Wasteland: supply debt, survival trust, gang respect, shelter dependency, betrayal risk.

NPC relationships use internal numeric values for each dimension, but player-facing display should use labels plus rough ranges by default.

Default display format:

```text
Friendly (about 60-70)
Wary (about 30-40)
Hostile (about 0-10)
```

Different worlds may override labels, ranges, or presentation style. For example, a cultivation world may emphasize seniority, favor, karma, sect loyalty, or dao companion ties, while a Cthulhu world may emphasize trust, fear, obsession, secrecy, or contamination-linked dependence.

Example labels:

- hostile
- wary
- distant
- neutral
- familiar
- friendly
- close
- loyal
- obsessed
- devoted
- afraid
- dependent
- secretly opposed

Relationship display should use a rough range rather than exact hidden calculations. The game can store exact values internally, but the player should usually see labels such as "friendly (about 60-70)" instead of a precise number.

## Important NPCs

Important NPCs should have structured memory and hidden state.

At the start of a run, the system automatically generates a small number of initial important NPCs based on:

- selected world
- identity
- Family Background
- talents
- birth background

Default initial important NPC count is 3-5.

The exact count varies by identity, Family Background, world rules, talents, and birth background:

- Ordinary stable family backgrounds usually generate 3-4 initial important NPCs.
- Higher Family Background, clan, sect, organization, noble, corporate, or political backgrounds may generate 4-5 initial important NPCs.
- Orphan, refugee, isolated, abandoned, imprisoned, hidden, or low-Family-Background starts may generate 3 initial important NPCs, but those NPCs should matter more.
- Legendary or Mythic talents may add, replace, hide, or distort initial important NPCs when their effects justify it.

Possible initial important NPCs include parents, siblings, neighbors, classmates, teachers, family members, clan elders, sect seniors, peers, early rivals, protectors, or caretakers.

The player cannot manually specify important NPC relationships during normal starting setup. This avoids breaking world logic, route balance, and starting-state fairness.

Each world must have its own NPC template pool. When AI generates important NPCs, it must choose from or reference that world's NPC templates.

During the story, AI may dynamically generate or promote new important NPCs based on events. Examples include rivals, friends, lovers, mentors, teammates, bosses, organization contacts, cult members, sect geniuses, rescuers, betrayers, or enemies.

Important NPCs may include:

- family members
- lovers
- close friends
- rivals
- mentors
- disciples
- faction leaders
- enemies
- hidden protectors
- final bosses
- world-specific key NPCs
- promoted faction members

Important NPCs should track:

- identity
- attributes
- talents, if any
- personality
- stance
- relationship to the player character
- relationship dimensions
- visible goal
- hidden information
- secrets
- faction ties
- attitude toward core world truths
- memories of important shared events
- possible betrayal, sacrifice, protection, romance, rivalry, or transformation routes

AI may generate and maintain important NPCs, but the game should preserve their structured state so they remain consistent across the life run.

Once an NPC is marked as important, they must keep long-term memory across the run. This includes identity, attributes, talents, relationship values, stance, goals, hidden information, and historical events shared with the player character.

### Faction Member Promotion

Faction members can become important NPCs when their actions, relationship to the player character, faction role, betrayal risk, emotional weight, or route impact becomes meaningful.

Faction member layers:

- ordinary member: tracked mostly as part of faction numbers, resources, morale, or event hooks.
- backbone member: has a name, role, rough personality, useful skill, loyalty/risk tag, and limited memory.
- core member: has relationship dimensions, goals, hidden information, stronger memory, and can drive events.
- deputy, heir, successor, lover, sworn sibling, disciple, rival, traitor, hostage, or nemesis: promoted to important NPC with persistent structured memory.

Promotion can happen through:

- standout contribution
- player character training or protection
- repeated interaction
- high relationship value
- betrayal or hidden agenda
- crisis, sacrifice, romance, rivalry, succession, or ideological conflict
- world-specific events such as taking a disciple, cult contamination, shelter defense, sect struggle, dream link, or wasteland rescue

The player may deliberately focus on a member and cultivate them into a deputy, lover, rival, successor, betrayer, disciple, bodyguard, priest, general, scientist, scout, or other major role. This should create story commitments and trade-offs, not only bonuses.

The number of promoted important NPCs must be controlled by faction scale and life-simulation pacing. A small group may have only 1-2 promoted members. A large organization may have more, but only NPCs with real story weight should receive full important-NPC memory.

### Important NPC Visibility

Important NPC attributes and talents are not fully visible by default.

Default player-facing visibility is fuzzy:

- broad attribute impressions, such as "smart", "physically weak", "wealthy background", "unusually lucky", or "hard to read"
- visible behavior
- social reputation
- relationship labels and rough ranges
- known faction ties
- known public identity

More information can unlock gradually through:

- higher relationship dimensions, especially trust, affinity, fear, interest binding, or secret leverage
- long-term shared history
- player character Intelligence
- relevant talents or special abilities
- investigation, observation, social inquiry, faction intelligence, or world-specific methods
- NPC mistakes, confessions, betrayal, crisis, combat, illness, ritual exposure, or public events

Unlocked information may include:

- more accurate attribute estimates
- talent clues
- confirmed talents
- hidden goals
- faction ties
- secrets
- weaknesses
- lies or contradictions
- abnormal status

True exact NPC attributes, talents, and hidden information should remain backend state unless the player character has a justified way to know them.

Worlds may customize how NPC information is revealed. For example, cultivation may reveal through realm sensing, reputation, sparring, sect records, or master appraisal; Cthulhu may reveal through dreams, forbidden knowledge, observation, dossiers, or contamination signs; wasteland may reveal through trade history, combat, rumors, scars, and faction records.

### Important NPC Misjudgment

Player-facing NPC information can be wrong or incomplete when world logic supports it.

NPCs may:

- disguise personality
- lie
- hide faction ties
- fake loyalty
- conceal hostility
- pretend weakness
- hide talent or power
- misrepresent family background
- manipulate relationship display
- appear as friends while acting as spies, traitors, cultists, agents, rivals, or hidden protectors

Misjudgment strength is world-specific:

- Cultivation may use hidden realms, concealed cultivation, sect politics, false identities, oath loopholes, karmic masking, or master-disciple manipulation.
- Cthulhu may use false memories, dream influence, cult infiltration, human masks, possession, unreliable perception, official cover stories, or contamination-linked dependence.
- Wasteland may use survival lies, faction betrayal, fake trade deals, hidden infections, gang pressure, resource scams, or shelter politics.

Misjudgment must be narratively justified. It should not randomly overwrite established facts without a cause such as deception, unreliable information, supernatural interference, incomplete observation, or later revelation.

Misjudgment probability can be reduced by:

- high player character Intelligence
- high relationship dimensions, especially trust, affinity, fear, interest binding, or secret leverage depending on context
- relevant talents or special abilities
- investigation
- long-term observation
- faction intelligence
- cross-checking information from multiple NPCs
- world-specific detection methods

Reducing misjudgment probability does not guarantee perfect truth. It can convert false information into suspicion, reveal contradictions, improve confidence level, or unlock an investigation path.

The backend must distinguish:

- true NPC state
- player-facing known state
- suspected state
- false belief
- source of belief
- confidence level
- reveal condition
- misjudgment risk
- misjudgment reduction factors

## Faction System

Players can join factions and create factions when world rules allow it. Faction play is not only a late-game status label. Growing a small faction from a fragile group into a meaningful force is an important gameplay route.

Faction play must remain part of the life simulator. It should generate life events, relationships, obligations, opportunities, losses, and endings for the player character, rather than becoming a separate management game detached from age, identity, family, talents, NPCs, and personal goals.

Faction creation can represent many scales, such as:

- family group
- school club
- street crew
- investigation circle
- survivor squad
- camp
- trade caravan
- sect branch
- cult cell
- company
- guild
- secret society
- resistance cell
- player-created organization

Factions can have:

- name
- type
- stage or level
- ideology
- leader
- leadership legitimacy
- members
- key members
- resources
- territory
- base or headquarters
- reputation
- public influence
- internal cohesion
- relationship with the player character
- relationships with other factions
- conflicts
- alliances
- hidden agenda
- public face
- recruitment rules
- promotion rules
- exit cost
- growth conditions
- collapse risks

Faction relationships and conflicts should affect events, NPC reactions, access to resources, threats, endings, and world-state changes.

Faction creation uses a default hard-condition model plus world-specific requirements.

Default creation requirements:

- A clear goal, ideology, survival need, business purpose, doctrine, or shared interest.
- At least one plausible follower, partner, investor, dependent, disciple, believer, teammate, or protected NPC.
- Some resource base, such as money, supplies, land, shelter, contacts, reputation, knowledge, weapons, techniques, secrets, legal cover, or abnormal leverage.
- A place or channel to operate, such as a home, club room, camp, shop, cave dwelling, online forum, hidden room, safe house, sect branch, caravan, or territory.
- A reason others would join or obey, such as trust, fear, benefit, charisma, debt, blood ties, authority, prophecy, ideology, protection, shared danger, or visible ability.

World-specific creation requirements are added on top of the default model:

- Cultivation: personal strength, realm, inheritance, sect permission, clan status, master backing, territory, spiritual resources, oath constraints, reputation, or a legitimate banner.
- Cthulhu: secrecy, cover identity, shared obsession, occult knowledge, protection from official attention, contact with forbidden objects or dreams, social camouflage, or resistance/cult legitimacy.
- Wasteland: food, water, shelter, weapons, medical supplies, survival trust, defense ability, territory, transport, trade value, or proof that the player character can keep people alive.

Low-threshold factions are allowed when scale is tiny. A child can form a secret club, a teenager can form a study group, an outcast can gather two companions, or a survivor can lead a three-person scavenging team. However, the faction's starting stage, resources, influence, and risks must match its scale.

The player may attempt to create a faction through free-form input, but success is judged by attributes, talents, age, identity, NPC relationships, existing reputation, resources, world rules, danger level, and narrative plausibility. Failure may still create a faction seed, such as one interested follower, a rumor, a future recruitment hook, or an enemy who notices the attempt.

Faction creation should not be a free menu action with no cost.

Small-faction growth should create recurring gameplay, including:

- recruitment and member loyalty
- resource gathering
- base building or territory control
- internal disputes
- external enemies
- alliances and betrayals
- public reputation
- hidden agenda exposure
- leadership challenges
- ideological drift
- world-specific threats

Faction growth uses four shared axes. All four exist, but each world can weight them differently:

1. Operations and construction: resources, base, logistics, members, rules, output, public services, territory maintenance, and institutional stability.
2. Social politics: recruitment, loyalty, betrayal, internal factions, succession, romance ties, patronage, hostage-like dependence, family pressure, and interpersonal power.
3. Conflict and expansion: rivals, enemies, defense, coercion, raids, wars, suppression, assassination, lawsuits, public scandal, hostile takeover, or supernatural conflict.
4. Ideology and identity: doctrine, mission, oath, faith, dao lineage, survival principle, corporate culture, cult belief, public image, moral line, and how the faction changes when its ideals drift.

World weight examples:

- Cultivation: ideology/lineage, power hierarchy, resources, reputation, oath constraints, sect politics, and conflict with rival sects usually matter most.
- Cthulhu: secrecy, ideology, hidden truth, corruption pressure, social camouflage, internal obsession, official attention, and betrayal risk usually matter most.
- Wasteland: operations, supplies, defense, territory, survival trust, member skills, trade routes, and violent conflict usually matter most.

Faction growth should affect available choices, event pools, NPC generation, relationship dimensions, resources, endings, and the world state. A faction can protect the player character, expose them, consume their time, create enemies, unlock routes, or become the player's main life project.

Faction members can be promoted into important NPCs according to the important NPC promotion rules. Player attention, repeated interaction, faction role, crisis performance, hidden agenda, romance, betrayal, mentorship, succession, or world-specific relevance can justify promotion.

Worlds customize faction types:

- Cultivation: sect, clan, alliance, rogue cultivator band, chamber of commerce, demonic cult, hidden inheritance line.
- Cthulhu: school club, occult salon, cult cell, official task group, corporate research unit, secret society, resistance circle, dream-linked community.
- Wasteland: survivor camp, shelter, gang, scavenger crew, militia, trade caravan, raider band, settlement council.

## Ending System

Endings should include all of the following:

- overall evaluation
- score
- multiple ending tags
- AI biography summary
- attribute settlement
- relationship settlement
- faction settlement
- world-state settlement
- important choice summary
- unlocked achievements, talents, worlds, or records when applicable

Ending tags can include world-specific labels, route labels, moral labels, relationship labels, power labels, survival labels, and hidden ending labels.

The biography summary should read like a life record, not a single result screen.

## Scoring System

Every completed run should receive a score.

The score should be multi-factor rather than only "good" or "bad". Possible scoring factors:

- survival or lifespan
- personal goal progress
- world-specific progression
- attribute growth
- relationship outcomes
- faction influence
- hidden truth discovered
- moral or destructive impact
- difficulty
- rarity of route
- ending rarity
- achievements unlocked

The score does not need to imply that a destructive ending is "morally good". It can score rarity, influence, power, tragedy, survival, or completion separately from moral evaluation.

## Player Actions And AI Assistant Role

Every player request inside a run can be part of gameplay.

When the player asks the AI, explores surroundings, analyzes options, talks to NPCs, searches for information, tests a plan, or requests advice, it may:

- consume time
- trigger an event
- change NPC reactions
- reveal information
- create false confidence
- attract attention
- alter route direction
- increase risk
- reduce risk
- change world state

The AI assistant inside the game is not a pure strategy guide.

It should act like:

- fate narrator
- world host
- event trigger
- consequence interpreter

It may explain what the player character can reasonably infer, but it should not safely reveal hidden truth, exact probabilities, hidden NPC secrets, or optimal routes unless the character's state justifies it.

## Free-Form Input Handling

Free-form input is not wish fulfillment. The player can attempt any action, but whether it happens depends on the game state and world rules.

Normal free-form input:

- AI does not need to restate the player's input.
- AI directly interprets the action, applies the rules, and gives the result.
- The backend stores the interpretation and judgment reason.

Complex, high-risk, ambiguous, or world-breaking input:

- AI should first explain how it understands the input.
- If needed, AI should ask for confirmation or clarification before resolving it.
- AI should not execute an input that would break world logic, ignore age limits, bypass major constraints, or grant impossible outcomes without a justified mechanism.

Free-form action judgment must consider:

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

The backend should preserve:

- original player input
- interpreted action
- whether clarification was needed
- judgment factors
- hidden reasoning summary
- fuzzy success or risk label
- exact internal checks, if any
- result
- state changes

The player-facing result should be written as story outcome and visible changes, not as raw calculation.

## Free-Form Failure Resolution

Free-form action failure uses risk-based consequences plus possible unexpected gains.

Failure is not always a dead end. A failed action may still create clues, NPC contact, route changes, or new story hooks, but the gain should usually come with cost.

Risk bands:

- Low risk: failure may waste time, miss an opportunity, create mild embarrassment, or slightly reduce a relationship.
- Medium risk: failure may cost resources, damage relationships, cause minor injury, increase stress, expose information, or close a route temporarily.
- High risk: failure may cause serious injury, major relationship loss, faction hostility, arrest, pursuit, corruption, pollution, loss of social normalcy, or dangerous attention.
- Extreme risk: failure may cause death, permanent injury, irreversible transformation, severe pollution, possession, exile, faction war, major world-state change, or ending-level consequences.

Possible unexpected gains:

- clue gained
- new NPC met
- hidden route revealed
- enemy exposed
- faction noticed the player character
- useful item found
- false assumption corrected
- new location unlocked
- talent or attribute manifestation triggered
- future event hook created

Unexpected gains should not erase the failure. They should make the failure interesting, not harmless.

The backend should preserve:

- risk band
- failure reason
- consequence severity
- unexpected gain, if any
- cost paid
- new hook, if any

## Memory System

Each life-simulation save has independent AI memory.

Run-level memory:

- starts at birth
- persists until death or ending
- remembers the player character's life history
- remembers important NPCs, relationships, choices, injuries, secrets, factions, and world-state changes
- does not carry character memory into a new life run

Account-level memory:

- may preserve achievements
- may preserve gallery or codex entries
- may preserve unlocked talents
- may preserve unlocked worlds
- may preserve discovered endings
- may preserve meta progression

New life runs should not inherit the previous player character's personal memories unless a specific meta, reincarnation, loop, or talent system explicitly enables that.
