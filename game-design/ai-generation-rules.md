# AI Generation Rules

This file summarizes shared AI generation constraints.

## State Authority

AI may propose narrative text, event consequences, time span, choices, manifestation changes, exposure changes, and world-state changes.

The game engine owns authoritative state. AI output must be validated before state changes are applied.

## Required AI Constraints

- Use the selected world's `world.md` for tone and writing constraints.
- Use `world.config.json` and related JSON files for stable world rules.
- Use manifested values for age-appropriate narration.
- Use potential values only for destiny, future tendency, and hidden long-term logic.
- Use exposure values to decide who notices abnormality.
- Keep the life-simulation core primary. Factions, combat, business, cultivation, investigation, organizations, and other subsystems must serve the player character's life path, relationships, aging, choices, consequences, endings, biography, and world state.
- Do not assume cultivation mechanics apply to other worlds.
- Distinguish player character from NPC.
- Do not generate ordinary NPCs as excellent in all 5 attributes unless special rules allow it.
- Generate birth identity from world + Family Background + talents + attributes. Legendary and Mythic talents may override ordinary identity logic when their structured effects justify it.
- Judge free-form player actions by action plausibility, relevant attributes, talents, relationships/resources, world state/exposure, and random probability. These factors should have different weights depending on action type.
- AI may create traps, misleading clues, and dangerous opportunities, especially in high-difficulty worlds, but they must be justified by world logic and player behavior.
- The in-run AI assistant is not a pure guide. It behaves as fate narrator, world host, event trigger, and consequence interpreter.
- Player requests such as asking the AI, exploring, analyzing options, or talking to NPCs may consume time, trigger events, reveal information, attract attention, or change the plot.
- Important NPCs should have personality, stance, hidden information, faction ties, relationship state, and memories of important shared events.
- Initial important NPCs are generated automatically from world, identity, Family Background, talents, and birth background. Generate 3-5 by default, with count adjusted by identity, Family Background, world rules, talents, and birth background. The player cannot manually specify starting important NPC relationships in normal setup.
- Important NPC generation must use or reference the selected world's NPC template pool.
- AI may dynamically generate or promote important NPCs during the story, but once marked important they require persistent structured memory.
- Faction members can be promoted into important NPCs when they gain story weight. Member layers include ordinary member, backbone member, core member, and full important NPC roles such as deputy, heir, lover, rival, traitor, disciple, protector, or successor. Promotion count must be controlled by faction scale and life-simulation pacing.
- Important NPC attributes and talents are fuzzy by default. Reveal more through relationship progress, Intelligence, talents, investigation, observation, faction intelligence, or world-specific methods.
- Player-facing important NPC information can be wrong or incomplete when world logic supports deception, disguise, hidden faction ties, false identity, supernatural interference, or incomplete observation. Misjudgment strength is world-specific. High Intelligence, high relationship dimensions, relevant talents, special abilities, investigation, long-term observation, faction intelligence, and world-specific detection methods can reduce misjudgment probability.
- Hidden state may guide foreshadowing and consistency, but must not be directly revealed in player-facing text unless the hidden information has been discovered in the save.
- Players may join existing factions or create new factions when the world and story conditions justify it. AI should treat small-faction growth as an important long-term route, not as a cosmetic label.
- Creating a faction uses default hard conditions plus world-specific requirements. Default conditions include a clear goal or ideology, at least one plausible follower/partner, some resource base, an operating place or channel, and a reason others would join or obey. World-specific requirements add cultivation legitimacy/realm/resources, Cthulhu secrecy/cover/occult contact, wasteland supplies/defense/survival trust, or equivalent rules for future worlds.
- Tiny low-threshold factions are allowed when scale matches the character's age and situation, such as a child secret club, student group, small survivor team, or two-person occult circle. Starting influence, resources, and danger must stay appropriately small.
- Player-created factions must track stage, members, resources, base/territory, cohesion, reputation, enemies, allies, recruitment, hidden agenda, public face, growth conditions, collapse risks, and world-specific faction traits.
- Faction growth uses four shared axes: operations/construction, social politics, conflict/expansion, and ideology/identity. All four can appear, but world configuration should weight them differently.
- When generating faction events, pick growth pressures that match the world: cultivation emphasizes lineage, resources, oath, hierarchy, reputation, and sect conflict; Cthulhu emphasizes secrecy, obsession, corruption, social camouflage, official attention, and betrayal; wasteland emphasizes supplies, defense, territory, survival trust, trade, and violent conflict.
- Normal free-form input should be handled implicitly: interpret, judge, and resolve without restating the input.
- Complex, high-risk, ambiguous, or world-breaking free-form input should be explained first and may require confirmation or clarification before resolution.
- Free-form input is an attempted action, not guaranteed reality. Judge it using current attributes, talents, age, identity, world rules, narrative plausibility, NPC relationships, faction relationships, current states, historical events, random probability, and hidden difficulty parameters.
- For important or risky checks, the engine should provide the roll result or difficulty outcome. AI should narrate according to that result instead of inventing success or failure freely.
- Free-form input failure should resolve by risk band. High-risk failure may cause serious consequences, while any failure may also create unexpected gains such as clues, NPC contact, or new hooks with a cost.

## Structured Output Expectation

AI responses should eventually be parsed into structured data.

The current MVP event response protocol is defined in `docs/ai-output-protocol.md`, with a reference schema at `schemas/ai-event-response.schema.json`.

Player-facing output uses pure text life-simulator format, but backend state uses JSON-like structured records. Events and choices must be richly written, even when the visible format is concise. Do not output empty one-word options such as "study", "escape", "fight", or "talk".

Default event interaction format:

- Normal playable events should provide exactly 3 rich player-facing choices by default.
- Non-interactive events, death events, ending summaries, clarification requests, forced consequences, and system-only transition events may provide 0 choices or a different interaction mode.
- Normal playable events should expose free-form player input through a separate optional fourth interaction entry.
- Free-form input should be presented as an optional fourth interaction entry separate from the 3 AI-generated choices; AI must not output it as `choice_4`.
- The 3 choices must cover different intents, methods, tones, risks, or route directions.
- Content seeds are inspiration and constraints, not fixed scripts. AI must adapt them to the current save, player character, NPC relationships, world progress, and prior memory.

Backend event records should include:

- eventId
- worldId
- runId
- narrative
- timeSpan
- events
- choices
- freeformInputAllowed
- freeformActionInterpretation
- freeformClarificationNeeded
- freeformJudgmentFactors
- freeformHiddenReasoningSummary
- freeformRiskBand
- freeformFailureReason
- unexpectedGain
- costPaid
- consequences
- hiddenContext
- internalChecks
- attributeChanges
- attributeChangeDisplay
- attributeChangeSource
- attributeChangeDuration
- attributeRecoveryCondition
- manifestationChanges
- exposureChanges
- relationshipChanges
- relationshipDisplayLabel
- relationshipDisplayRange
- relationshipDimensions
- worldSpecificRelationshipDimensions
- temporaryStateChanges
- permanentStateChanges
- progressionChanges
- worldStateChanges
- nextPrompt
- displayedChanges
- fuzzySuccessLabel
- importantNPCUpdates
- importantNPCGeneration
- importantNPCPromotion
- factionMemberLayer
- promotedFactionMember
- importantNPCMemory
- importantNPCVisibleInfo
- importantNPCHiddenInfo
- importantNPCInfoUnlocks
- importantNPCTrueState
- importantNPCKnownState
- importantNPCFalseBeliefs
- importantNPCMisjudgment
- importantNPCMisjudgmentRisk
- importantNPCMisjudgmentReductionFactors
- factionChanges
- factionCreation
- factionGrowth
- factionGrowthAxes
- factionGrowthAxisWeights
- factionStage
- factionResources
- factionMembers
- factionCohesion
- factionReputation
- factionBase
- factionTerritory
- factionEnemies
- factionAllies
- factionCollapseRisk
- scoreDelta
- responseType
- interactionMode
- selectedSeeds
- visibleChanges
- engineCheck
