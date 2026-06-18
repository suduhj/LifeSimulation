# Talent And Scaling Rules

This document defines talent rarity, talent probability, attribute growth scale, realm scaling, and how AI should interpret numerical changes at different power levels. Age-gated manifestation and outside discovery are defined in [Potential, Manifestation, And Exposure Rules](./potential-manifestation-exposure-rules.md).

## Talent Rarity Probability

Each single talent draw uses this rarity distribution:

| Rarity | Probability |
|---|---:|
| Common | 45% |
| Fine | 28% |
| Rare | 16% |
| Epic | 7% |
| Legendary | 3% |
| Mythic | 1% |

The player draws 5 talents and keeps 3.

Runtime draw rule:

1. Each of the 5 draw slots rolls a rarity using the table above.
2. The engine then chooses one not-yet-drawn talent from that rarity pool.
3. If that rarity pool is empty, the engine falls back to any not-yet-drawn talent so setup cannot dead-end on small MVP pools.
4. The draw is deterministic for the same world and seed.
5. Automatic fallback selection keeps the highest-rarity 3 talents, but player setup can choose any 3 from the drawn 5.

## Baseline Attribute Principles

The 5 core attributes are:

- Appearance
- Intelligence
- Constitution
- Family Background
- Luck

Ordinary person baseline:

| Attribute | Points |
|---|---:|
| Appearance | 4 |
| Intelligence | 4 |
| Constitution | 4 |
| Family Background | 4 |
| Luck | 4 |
| Total | 20 |

Rules:

- 20 total points = ordinary person standard.
- 4 points in one attribute = ordinary person level.
- 20 points in one attribute = mortal single-attribute limit.
- 100 total points = theoretical mortal comprehensive limit.

100 total points is not normal excellence. It represents a theoretical person who is near the mortal limit in appearance, intelligence, constitution, family background, and luck at the same time.

## Mortal And Transcendent Total Attribute Tiers

Cultivation realm version scope:

- MVP uses the classic long-chain front half: Mortal, Qi Refining, Foundation Establishment, Golden Core, Nascent Soul, and Spirit Transformation.
- Formal release expands the classic long chain with Void Refinement, Body Integration, Mahayana, Tribulation Crossing, and Ascension.
- Higher-realm numeric bands should continue the order-of-magnitude principle unless a world rule explicitly overrides it.

Total attribute tiers:

| Tier | Total Attribute Range | Meaning |
|---|---:|---|
| Ordinary person | Around 20 | Standard ordinary person. |
| Excellent mortal | 26-50 | Good student, athletic person, minor wealthy family, or strong individual. |
| Top mortal | 51-80 | Elite soldier, champion fighter, top scientist, financial heir, or similar. |
| Mortal limit | 81-100 | Theoretical real-world mortal comprehensive limit. |
| Qi Refining | 100-1,000 | Initial transcendence; clearly beyond ordinary people. |
| Foundation Establishment | 1,000-10,000 | Life-level leap; can fight hundreds or thousands depending on context. |
| Golden Core | 10,000-100,000 | Can suppress a city or dominate a region. |
| Nascent Soul | 100,000-1,000,000 | High-level existence that can change a large area's fate. |
| Spirit Transformation | 1,000,000-10,000,000 | Near world-level influence. |
| Void Refinement | 10,000,000-100,000,000 | Formal release realm; large-scale law and void-level influence. |
| Body Integration | 100,000,000-1,000,000,000 | Formal release realm; body, law, and domain begin to unify. |
| Mahayana | 1,000,000,000-10,000,000,000 | Formal release realm; near-ascension existence. |
| Tribulation Crossing | 10,000,000,000-100,000,000,000 | Formal release realm; final mortal-world catastrophe and ascension threshold. |
| Ascension | 100,000,000,000+ | Formal release endpoint or gateway into a higher world. |

Each major realm is an order-of-magnitude leap. Cultivation should not feel like a small fitness increase.

Incorrect scaling:

```text
Mortal 100
Qi Refining 120
Foundation Establishment 150
Golden Core 200
```

Correct scaling:

```text
Mortal limit 100
Qi Refining 100-1,000
Foundation Establishment 1,000-10,000
Golden Core 10,000-100,000
Nascent Soul 100,000-1,000,000
Spirit Transformation 1,000,000-10,000,000
```

## Interpreting Attribute Gains

Do not judge a point gain by fixed value alone. The same +10 can be huge in the mortal stage and almost meaningless in the Nascent Soul stage.

Use two judgments:

- Absolute points gained.
- Percentage of the current tier's range width.

Formula:

```text
impact strength = gained points / current tier range width
```

Example:

- Mortal practical growth band: 20-100, width about 80.
- +8 in this band is 8 / 80 = 10%, a clear improvement.
- Foundation Establishment band: 1,000-10,000, width 9,000.
- +8 in this band is about 0.09%, almost unnoticeable.

## Universal Impact Table

Use this table in all worlds when judging the narrative and mechanical meaning of attribute changes.

| Gain As Current Tier Width | Impact |
|---:|---|
| Under 1% | Almost unnoticeable; only a tiny change. |
| 1%-5% | Small improvement; AI may describe it lightly. |
| 5%-10% | Clear improvement; related event success rates should rise. |
| 10%-25% | Important improvement; can affect routes. |
| 25%-50% | Major improvement; strength or destiny clearly changes. |
| 50%-100% | Near qualitative change; very strong within the same tier. |
| Crosses tier upper bound | Qualitative change; enters a new tier or realm. |

Examples:

- Mortal +5: from 20 to 25, standard ordinary person becomes above ordinary.
- Mortal +20: from 20 to 40, clearly better than ordinary people and able to get more early opportunities.
- Qi Refining +20: in the 100-1,000 band, this is only about 2%, a small improvement.
- Foundation Establishment +500: in the 1,000-10,000 band, this is about 5.5%, a clear improvement.
- Nascent Soul +10,000: in the 100,000-1,000,000 band, this is about 1%, a normal accumulation.

## Realm Breakthrough Rules

Realm breakthroughs do not add fixed small values. A breakthrough moves the character into a new total attribute range.

| Breakthrough | Expected Total Attribute Change |
|---|---|
| Mortal -> Qi Refining | Moves from 20-100 into 100-1,000. |
| Qi Refining -> Foundation Establishment | Moves from hundreds into 1,000-10,000. |
| Foundation Establishment -> Golden Core | Moves from thousands into 10,000-100,000. |
| Golden Core -> Nascent Soul | Moves from tens of thousands into 100,000-1,000,000. |
| Nascent Soul -> Spirit Transformation | Moves from hundreds of thousands into 1,000,000-10,000,000. |
| Spirit Transformation -> Void Refinement | Formal release: moves from millions into 10,000,000-100,000,000. |
| Void Refinement -> Body Integration | Formal release: moves from tens of millions into 100,000,000-1,000,000,000. |
| Body Integration -> Mahayana | Formal release: moves from hundreds of millions into 1,000,000,000-10,000,000,000. |
| Mahayana -> Tribulation Crossing | Formal release: moves from billions into 10,000,000,000-100,000,000,000. |
| Tribulation Crossing -> Ascension | Formal release: crosses into 100,000,000,000+ or transitions to a higher-world ruleset. |

Example:

```text
Qi Refining peak: total attributes 850
Breakthrough to Foundation Establishment:
  not 850 + 50 = 900
  but directly enters the Foundation Establishment band
```

Possible Foundation Establishment totals:

- Weak foundation: 1,200-2,000.
- Solid foundation: 3,000-5,000.
- Excellent foundation: 5,000-8,000.
- Unusual or destiny-grade foundation: near the upper band, if justified by talents, resources, identity, or world events.

## Attribute Growth Sources In Cultivation Worlds

The same 5 attributes continue to exist after entering a cultivation world, but their meaning expands.

Example growth sources:

| Source | Example Effects |
|---|---|
| Mortal martial training | Constitution +5, Intelligence +1. |
| Qi Refining success | Constitution +80, Intelligence +30, Luck +10, Appearance +5. |
| Foundation Establishment success | Constitution +500, Intelligence +200, Luck +100, Appearance +50, Family Background may rise through sect status. |
| Golden Core success | Constitution +5,000, Intelligence +2,000, Luck +1,000, Appearance +300, Family Background may rise through sect or title. |

These are examples, not fixed formulas. The important rule is that transcendent growth can enter higher orders of magnitude when the world system justifies it.

## Family Background In Transcendent Worlds

Family Background is not only household wealth.

In modern or mundane worlds, it may mean:

- Money
- Family
- Connections
- Education resources
- Social protection

In cultivation worlds, it may also mean:

- Origin
- Sect resources
- Cultivation background
- Master lineage
- Faction status
- Magic artifacts
- Cave residence
- Spirit stones

Examples:

| Event | Family Background Change |
|---|---:|
| Joins an ordinary sect | +50 |
| Becomes an inner disciple | +200 |
| Becomes a true disciple | +800 |
| Becomes holy land saint or saintess | +5,000 |

This does not mean the family became richer. It means the character's resource background and institutional backing improved.

## Appearance In Transcendent Worlds

Appearance is not only facial beauty.

In transcendent worlds, it can also mean:

- Physical appearance
- Temperament
- Dao rhythm
- Divinity
- Bloodline beauty
- Life-level attraction

Examples:

| Event | Appearance Change |
|---|---:|
| Marrow cleansing | +20 |
| Foundation transformation | +50 |
| Immortal body awakening | +500 |
| Divinity revealed | +5,000 |

If a Nascent Soul elder has high Appearance, AI should interpret it as life level, aura, temperament, Dao rhythm, or divine pressure, not merely ordinary facial beauty.

## Talent Design Principles

Talents must not be only fixed point bonuses.

Player-facing talent details must not be only a generic sentence. Each visible talent card should provide:

- Chinese talent name.
- Rarity.
- Manifestation type.
- Detailed explanation of what the talent means in the selected world.
- Point bonuses. This is mandatory in every player-facing talent introduction. If the talent has attribute bonuses, show exact values such as `悟性 +35；根骨 +35`. If it has no direct opening point bonus, show `无直接开局点数加成`.
- Attribute impact, including how the listed point bonuses enter talent potential and later manifestation.
- Narrative effect: what routes, judgments, clues, growth, or NPC reactions it tends to influence.
- Possible risk: attention, jealousy, exploitation, pollution, research, conflict, fate pressure, or other world-appropriate costs.
- Manifestation explanation: why the talent may not fully appear at birth.

Do not reveal hidden trigger conditions, future route scheduling, or GM-only hooks in ordinary talent details. These belong in backend data and GM/debug surfaces.

Talents belong to two broad types:

1. Starting numeric talents
   - Affect the mortal opening.
   - Examples: Appearance +5, Intelligence +8, Constitution +10, Family Background +15, Luck +10.
   - These are very meaningful in the mortal stage.
2. Growth multiplier talents
   - Affect long-term progression.
   - Examples: cultivation gains +20%, breakthrough gains +30%, higher breakthrough success rate, better foundation quality, more rare encounters, high-realm growth does not decay.
   - These may be much stronger than opening bonuses in late-game cultivation.

High-rarity talents should often combine:

- Initial attribute bonuses.
- Growth multipliers.
- Special mechanisms.
- Hidden events.
- Route changes.
- Side effects.

## Talent Rarity Reference Ranges

These are reference ranges, not strict limits. Specific talents may deviate when justified by side effects, world restrictions, or unique mechanisms.

| Rarity | Opening Attribute Reference | Design Role |
|---|---|---|
| Common | Usually +1 to +2 to one attribute. | Mostly affects mortal stage. |
| Fine | Usually +4 to +6 to one attribute. | Makes one area clearly above ordinary. |
| Rare | Usually +8 to +15 to one attribute. | Can determine early mortal route. |
| Epic | Usually +15 to +30 to one attribute, or +20 to +40 total. | Can push a character near top mortal level in a field. |
| Legendary | Usually +40 to +80 total and a strong mechanism. | Should include long-term growth or destiny-level route pressure. |
| Mythic | Usually +80 to +150 total and a fate-level mechanism or long-term multiplier. | Can reshape the whole run. |

## Talent Examples

Common:

- Good Looking: Appearance +2.
- Quick Learner: Intelligence +2.
- Healthy Body: Constitution +2.
- Stable Home: Family Background +2.
- Small Blessing: Luck +2.

Fine:

- Study Seedling: Intelligence +5.
- Healthy Body: Constitution +5.
- Comfortable Family: Family Background +5.

Rare:

- Naturally Clever: Intelligence +10.
- Natural Beauty: Appearance +10.
- Martial Seedling: Constitution +12.
- Little Lucky Star: Luck +10.

Epic:

- Excellent Comprehension: Intelligence +25, improves cultivation understanding.
- Born With Divine Strength: Constitution +30, greatly improves combat, sport, and survival checks.
- Noble Origin: Family Background +30.

Legendary:

- Child Of Destiny: Luck +50, hidden encounter rate increases, major crises are more likely to produce a reversal.
- Innate Immortal Bone: Constitution +40, Intelligence +20, cultivation breakthrough success increases, each realm breakthrough grants +20% extra attributes.

Mythic:

- Origin Body Of Ten Thousand Laws: Intelligence +50, Constitution +50, adapts strongly to all supernatural systems, each realm breakthrough grants +30% extra attributes, learning methods across cultivation, magic, technology, and martial systems is easier.
- Fate Rewriter: Luck +80, can rewrite one major failure per run, key events are more likely to trigger hidden branches, but the player character is more likely to be pulled into world-level events.

Mythic talents are not powerful only because of large opening numbers. Their real value is that they change late-game growth, route access, fate pressure, and hidden endings.

Every Mythic talent should also define manifestation type:

- Immediate manifestation.
- Stage manifestation.
- Conditional awakening.
- Hidden destiny.

See [Potential, Manifestation, And Exposure Rules](./potential-manifestation-exposure-rules.md) for the authoritative rules.
