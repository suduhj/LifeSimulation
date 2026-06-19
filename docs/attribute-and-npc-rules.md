# Attribute And NPC Rules

This document defines the authoritative attribute, modifier, and NPC generation rules. Talent probability, realm scaling, and order-of-magnitude power rules live in [Talent And Scaling Rules](./talent-and-scaling-rules.md). Age-gated manifestation and outside discovery rules live in [Potential, Manifestation, And Exposure Rules](./potential-manifestation-exposure-rules.md).

## Naming Rules

Use these terms consistently:

- Player character: the protagonist controlled by the player.
- NPC: a non-player person generated or controlled by AI.

Do not call AI-generated NPCs "player characters" or "characters" when the distinction matters.

Incorrect:

- "AI generates characters..."
- "Important characters have talents..."

Correct:

- "AI generates NPCs..."
- "Important NPCs have talents..."

This prevents the player character and AI-generated NPCs from being confused in prompts, code, and documentation.

## Core Attributes

The game has exactly 5 core attributes:

- Appearance
- Intelligence
- Constitution
- Family Background
- Luck

Ordinary player-facing UI must display the same five Chinese labels in every world:

| Backend key | Player label |
|---|---|
| `appearance` | 颜值 |
| `intelligence` | 智力 |
| `constitution` | 体质 |
| `familyBackground` | 家境 |
| `luck` | 运气 |

World-specific labels such as `仙姿`, `悟性`, `根骨`, `出身/底蕴`, or `气运` may appear as talent names, prose flavor, or GM/debug explanation when justified, but they must not replace the five base attribute names in ordinary setup, fate preview, attribute panels, visible changes, or player-facing annual scene text.

Removed as core attributes:

- Spirit
- Charisma
- Combat

These are derived capabilities, not base attributes:

- Stress resilience is judged from Constitution + Intelligence + experience/state history.
- Social charm is judged from Appearance + Family Background + Intelligence + reputation.
- Combat ability is judged from Constitution + skills + profession + realm + equipment.

## Ordinary Person Baseline

The player character starts with 20 base attribute points.

Because there are 5 attributes:

```text
20 / 5 = 4
```

Therefore:

- 4 points in one attribute = ordinary person level.
- 20 total points = ordinary person standard.

Standard ordinary person template:

| Attribute | Points |
|---|---:|
| Appearance | 4 |
| Intelligence | 4 |
| Constitution | 4 |
| Family Background | 4 |
| Luck | 4 |
| Total | 20 |

AI description reference:

> This is a standard ordinary person. Appearance, intelligence, body, family background, and luck have no obvious advantage and no obvious defect.

## Starting Allocation Rules

The player character starts with 20 base attribute points and may freely allocate them across the 5 core attributes.

Extreme allocation is allowed.

Example:

| Appearance | Intelligence | Constitution | Family Background | Luck | Total |
|---:|---:|---:|---:|---:|---:|
| 20 | 0 | 0 | 0 | 0 | 20 |

This means the player character has mortal-limit appearance but terrible intelligence, constitution, family background, and luck.

The system uses the ordinary person baseline to judge whether the player character is above or below normal.

When an attribute is below 4, AI must reflect the defect in story events, NPC reactions, event success rates, and final evaluation.

When an attribute is above 4, AI must reflect the advantage in story opportunities, NPC evaluation, event chances, and growth routes.

## Attribute Limits

Single-attribute mortal range:

- 0-20 = mortal range.
- 20 = mortal single-attribute limit.
- 20+ = beyond conventional mortal range, but not automatically supernatural. The source determines interpretation.

Five-attribute mortal theoretical total:

```text
5 * 20 = 100
```

Therefore:

- 20 total points = ordinary person standard.
- 100 total points = theoretical mortal comprehensive limit.
- Above 100 total points = outside conventional mortal range, but the meaning depends on source.

100 total points does not mean ordinary excellence. It means a theoretical person with top-tier appearance, intelligence, constitution, family background, and luck at the same time. Normal champions, scientists, soldiers, or celebrities may have one or two very high attributes without approaching 100 total.

Talent bonuses can push attributes beyond 20. During starting or mortal-stage setup, a talent-enhanced attribute may rise into the 20-60 range depending on rarity and source. Cultivation realms, supernatural systems, divine sources, and late-game growth can exceed this range according to the scaling rules.

## Single-Attribute Rating Table

| Points | Tier | AI Description |
|---:|---|---|
| 0 | Extreme defect | Almost no advantage in this area; may severely drag down life outcomes. |
| 1 | Very poor | Clearly weaker than ordinary people. |
| 2 | Poor | Has an obvious shortcoming. |
| 3 | Slightly below ordinary | A little weaker than ordinary people. |
| 4 | Ordinary | Normal ordinary person level. |
| 5-6 | Above ordinary | Has a modest advantage. |
| 7-9 | Excellent | Clearly stronger than ordinary people. |
| 10-12 | Elite | Can gain obvious advantages through this attribute. |
| 13-16 | Top mortal | Rare top-level mortal ability. |
| 17-20 | Mortal limit | World-class, historical, almost legendary mortal level. |
| 20+ | Beyond conventional | Interpretation depends on source; not automatically supernatural. |

Runtime rules:

- `attributeTierForValue()` uses this exact table.
- Attribute panel peer labels must come from this shared tier function, not from a separate UI-only threshold table.
- The old coarse origin buckets (`strained`, `ordinary`, `notable`, `advantaged`, `extraordinary`) are only world-origin pool buckets; they are not the player-visible attribute tier table.

## Attribute Descriptions

### Appearance

| Points | Description |
|---:|---|
| 0-1 | Severe appearance disadvantage; easily mocked, ignored, or excluded. |
| 2 | Poor appearance; not socially appealing. |
| 3 | Slightly below ordinary; appearance gives no advantage. |
| 4 | Ordinary appearance. |
| 5-6 | Pleasant, clean, or somewhat attractive. |
| 7-9 | Striking appearance that often attracts attention. |
| 10-12 | Celebrity-level appearance that can change opportunities. |
| 13-16 | Top-tier beauty or handsomeness that affects judgment. |
| 17-20 | Mortal appearance limit; world-shaking beauty or handsomeness. |
| 20+ | Unconventional beauty, possibly from bloodline, charm, divinity, magic, or cultivation. |

### Intelligence

| Points | Description |
|---:|---|
| 0-1 | Severe comprehension disadvantage. |
| 2 | Learns with difficulty and reacts slowly. |
| 3 | Slightly below ordinary. |
| 4 | Ordinary comprehension. |
| 5-6 | Good learning ability. |
| 7-9 | Smart and likely to stand out. |
| 10-12 | Top student, professional talent, or strong strategist. |
| 13-16 | Genius level; can enter top fields. |
| 17-20 | Mortal intelligence limit; historical genius. |
| 20+ | Unusual cognition, possibly from cultivation insight, magic wisdom, AI support, or divine revelation. |

### Constitution

| Points | Description |
|---:|---|
| 0-1 | Extremely weak; easily sick or injured. |
| 2 | Physically weak. |
| 3 | Slightly below ordinary. |
| 4 | Ordinary constitution. |
| 5-6 | Healthy with good energy. |
| 7-9 | Strong and clearly above ordinary physical ability. |
| 10-12 | Professional athlete or elite soldier level. |
| 13-16 | Champion fighter, elite special forces, or top warrior level. |
| 17-20 | Mortal body limit; legendary real-world physical quality. |
| 20+ | Source-dependent, possibly from cultivation, mutation, cybernetics, magic enhancement, or bloodline awakening. |

### Family Background

| Points | Description |
|---:|---|
| 0-1 | Extreme poverty, orphanhood, refugee status, or bottom-level hardship. |
| 2 | Poor family; obvious lack of resources. |
| 3 | Slightly below ordinary family. |
| 4 | Ordinary family. |
| 5-6 | Comfortable family with slightly better resources. |
| 7-9 | Wealthy family with better education and connections. |
| 10-12 | Noble, powerful, rich, or local elite family. |
| 13-16 | Top financial family, aristocracy, royal lineage, or major sect descendant. |
| 17-20 | Mortal social-resource limit; national or world-level top origin. |
| 20+ | May come from imperial bloodline, holy land heir, interstellar nobility, divine family, or similar special identity. |

Family Background is an origin/reality constraint, not an age-sealed personal ability. High Family Background must resolve into a compatible concrete origin such as a wealthy, resource-holding, professional, elite, sect-adjacent, old-money, shelter-management, technical, medical, or inherited-resource family depending on the world. It must not be rendered as a poor hunter household, starving refugee, bankrupt family, or other low-origin state unless the save contains a later loss event.

Low Family Background likewise must not be rendered as an elite family, old-money house, resource allocator, sect branch, or management household. The engine-owned `World Origin Resolver` records a compatible origin in structured state so opening text, eventLog, replay, and panels agree.

Starting identity seeds must be filtered after allocation and kept talents determine final Family Background potential. A low or ordinary final family value must not select `medium_to_high`, `high`, or `high_variance` family-background identities. A high final family value must not select `low`, `very_low`, or `low_to_medium` family-background identities.

### Luck

| Points | Description |
|---:|---|
| 0-1 | Extremely unlucky; bad events happen frequently. |
| 2 | Poor luck and frequent obstacles. |
| 3 | Slightly below ordinary. |
| 4 | Ordinary luck. |
| 5-6 | Occasionally lucky. |
| 7-9 | Good luck and frequent opportunities. |
| 10-12 | Lucky person who often benefits at key moments. |
| 13-16 | Favored by fate; rare opportunities become common. |
| 17-20 | Mortal luck limit, as if favored by destiny. |
| 20+ | May involve fate law, protagonist aura, divine favor, reincarnation fortune, or similar sources. |

## Attribute Source Layers

Final attribute values must preserve their sources.

Attributes also have potential, manifested, and exposure layers. Potential describes future height, manifested value describes current expression, and exposure describes who notices. See [Potential, Manifestation, And Exposure Rules](./potential-manifestation-exposure-rules.md).

The attribute panel uses an Attribute Reality Contract for display:

- 体质 may show `年龄封存`, because a child body cannot carry all potential yet.
- 智力 may show `经验封存`, because cognition also needs learning, memory, and life experience.
- 颜值 shows `尚未定型`, not age-sealed power.
- 家境 shows `家庭底色`, not age-sealed power.
- 运气 shows `机缘倾向`, not age-sealed power.

The runtime separates two concepts:

```js
MATURITY_CAPPED_ATTRIBUTES = new Set(["constitution", "intelligence"])
IMMEDIATE_REALITY_ATTRIBUTES = new Set(["familyBackground", "luck"])
```

`appearance` is not maturity-capped, but it is also not immediate reality. It can grow and change as "not yet settled" appearance development without being shown as age-sealed power.

Formula:

```text
final attribute =
  base allocation
  + identity bonus
  + talent bonus
  + growth bonus
  + temporary state modifier
  + permanent injury modifier
```

Example:

```text
Constitution =
  base constitution 4
  + identity bonus 1
  + talent bonus 3
  + growth bonus 5
  + temporary serious injury -4
  + permanent injury -2
```

The system must store attribute sources so AI can distinguish whether the player character or NPC is:

- Born strong.
- Trained into strength.
- Strong because of talent.
- Strengthened by cultivation, magic, cybernetics, mutation, pollution, or other world-specific source.
- Weakened by injury, disease, curse, bankruptcy, root damage, or soul pollution.

## Attribute Change Display

Whenever an attribute changes, the player-facing display must show:

- Attribute name.
- Change amount.
- Current value after change.
- Source type.
- Whether the change is temporary or permanent.
- Expected recovery condition, if recoverable.

Examples:

```text
Intelligence +1 (current 7, source: study growth, permanent)
Constitution -2 (current 5, source: serious injury, temporary, recovery: rest for 3 months or receive treatment)
Family Background -5 (current 2, source: family bankruptcy, permanent, recovery: rebuild family assets or join a new patron faction)
```

If recovery is unclear, use a fuzzy recovery condition such as:

- requires treatment
- requires rest
- requires story recovery
- unknown
- possibly irreversible

The backend must store the same information structurally so later events can distinguish growth, temporary injury, permanent damage, identity change, talent effect, faction support, pollution, curse, or other sources.

## Temporary And Permanent Decreases

Temporary states lower attributes until recovery.

| Temporary State | Effect |
|---|---|
| Cold | Constitution -1 |
| Serious injury | Constitution -4 |
| Fatigue | Constitution -2 |
| Insomnia | Intelligence -1 |
| Bad luck entanglement | Luck -3 |

Permanent decreases change the long-term life route.

| Permanent Change | Effect |
|---|---|
| Disfigurement | Appearance -5 permanently. |
| Lost hand | Constitution -2 permanently, and affects combat-related checks. |
| Damaged foundation | Constitution decreases and cultivation efficiency decreases. |
| Family bankruptcy | Family Background -5 permanently. |
| Damaged fate | Luck -3 permanently. |

Permanent decreases are not only punishment. They can unlock new story routes such as:

- Revenge route.
- Demonic cultivation route.
- Cybernetic transformation route.
- Strange bargain route.
- Hidden growth route.

## NPC Generation Rules

NPC templates are identity-anchor templates, not full attribute templates.

Each identity template only determines the NPC's core advantage attribute. Examples:

- Financial heir: guarantees very high Family Background.
- Top student: guarantees higher Intelligence.
- Professional athlete: guarantees higher Constitution.
- Natural beauty: guarantees higher Appearance.

All non-anchor attributes must be generated separately. They may be below ordinary, ordinary, or above ordinary.

Composite NPCs have one or more extra attributes clearly above ordinary in addition to their identity anchor. Composite NPCs should be less common.

Default generation probabilities:

| NPC Type | Probability |
|---|---:|
| Single-core NPC | 70% |
| Dual-core NPC | 20% |
| Three-core NPC | 8% |
| Four-core NPC | 2% |
| Five-strong NPC | 0% |

Without special talents, ordinary NPCs must not be generated with all 5 attributes clearly excellent.

An NPC may have all 5 attributes clearly excellent only if at least one condition is true:

1. The NPC is a key NPC.
2. The NPC has a Legendary or Mythic talent.
3. The NPC is a main-story core NPC.
4. The NPC is a rival, child of destiny, final boss, hidden NPC, or similarly special existence.

AI must distinguish between advantages from identity and personal ability.

Incorrect:

```text
Financial heir NPC = high Family Background + high Appearance + high Intelligence + high Constitution + high Luck
```

Correct:

```text
Financial heir NPC = high Family Background; all other attributes are generated from the NPC's own setup.
```

## NPC Player-Visible Identity Layers

Every important NPC must maintain two identity layers:

- Player-visible identity: what the player character currently knows or can reasonably infer.
- Hidden identity: true template, true role, faction ties, secrets, danger level, and future reveal hooks.

Ordinary player UI and player-facing AI text may only use the player-visible identity. Raw IDs such as `npc_4_alchemist_elder`, backend role keys such as `experimenter`, and hidden labels such as "true role" must not appear outside GM/debug surfaces.

If an NPC is hidden, disguised, not yet encountered, or important as a future reveal, the ordinary UI should display neutral language such as "重要人物", "身份尚不明确", "路过的人", "熟悉的长辈", or another surface-level label justified by the current story. Do not display the true template, special role, or future route function until the player discovers it.

An NPC can reveal a deeper identity only when justified by the save state:

- the NPC actively reveals it in a plausible scene;
- the player investigates, observes, asks, or uses relationships/resources/talents;
- the player's Intelligence, Luck, relevant talents, world progress, or prior clues support the reveal;
- the AI proposes an `importantNPCUpdates` state patch that upgrades the player-visible identity.

Foreshadowing is allowed, but it must be non-spoiler. Write strange behavior, evasive speech, unexplained objects, rumors, or contradictions. Do not write "you later learn this person is..." or expose a hidden title before discovery.

## AI NPC Generation Core Rules

When AI generates NPCs:

- Identity determines the anchor.
- Attributes determine specific strengths and weaknesses.
- Talents determine special breakthroughs.
- Composite NPCs appear with low probability.
- Ordinary NPCs cannot be strong in all 5 attributes.
- Important NPCs may break ordinary limits because of talent or story role.
- AI must not default to making elite-origin NPCs excellent at everything.
