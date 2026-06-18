# Core Rules

This file is the human and AI-developer entry point for shared game rules.

## Game Foundation

This project is a multi-world AI life simulator. It is not only a cultivation game.

The player chooses a world, receives a random or limited custom identity, draws talents, allocates starting attributes, and then simulates a life from birth to an ending.

## Shared Flow

1. Choose world.
2. Randomize identity or enter limited custom identity.
3. Draw 5 talents and keep 3.
4. Allocate or roll starting attributes.
5. Begin life from birth.
6. Advance by year or AI-approved multi-year span.
7. Trigger one or more story events.
8. Player chooses one of the 3 AI-generated options, or uses the optional 4th entry to enter a free-form attempted action.
9. AI proposes consequences.
10. Game engine validates and applies state changes.
11. Continue until death, ending, transcendence, transformation, world-scale outcome, or another world-specific conclusion.

## Shared Identity Rule

Birth identity is determined by the selected world, Family Background, and talents together.

- The selected world defines the possible identity space.
- Family Background determines class, resources, protection, inheritance, family structure, education access, and social position.
- Talents can bend or override normal identity logic when their rarity and effect justify it.
- Legendary and Mythic talents may forcibly change the player character's birth identity, such as turning an otherwise ordinary birth into a reincarnated being, divine heir, cursed bloodline, hidden experiment, saint candidate, noble descendant, or other world-specific special identity.
- Identity must still be represented as structured state. AI can propose identity details, but the game engine should validate whether the identity follows world rules, Family Background, and talent effects.
- Limited custom identity only lets the player set name and gender. Background, personality, family, social position, and starting context are generated from world + Family Background + talents + attributes.

Do not treat identity as pure flavor. It should influence NPC reactions, early opportunities, available routes, protection power, exposure risk, and the player's initial relationship to the world's hidden systems.

## Shared World Rule

Each world must define:

- Human-readable world design in `world.md`.
- Runtime world configuration in `world.config.json`.
- World-specific talents.
- NPC identity-anchor templates.
- Event seeds.
- Endings.
- Any world-specific systems.

Human-facing `.md` files explain tone, world logic, writing constraints, and design intent. Runtime `.json` files provide stable data for the game program.

## Shared System References

Shared simulation systems are defined in `game-design/simulation-systems.md`.

Those rules cover:

- gender impact
- event format
- display rules
- NPC relationship display
- important NPC state
- faction system
- ending system
- scoring system
- player actions and AI assistant role
- run-level and account-level memory
