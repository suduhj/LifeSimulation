# Potential, Manifestation, And Exposure Rules

This document defines how high starting talents and attributes appear over time without making birth or childhood scenes collapse into full adult power fantasy.

## Core Principle

The player character's starting allocation and talents define destiny, potential, growth ceiling, and future tendency.

They do not mean every attribute fully appears at birth.

AI must write each life stage using only the engine-owned current effective value and capability package, plus the current exposure level.

The authoritative implementation lives in `src/growth-ledger.js`. `player.attributes` remains a compatibility/display layer, but the source of truth is `player.growthLedger`.

## Growth Ledger Layers

Every core attribute should support these engine-owned layers:

1. Potential value
   - The maximum or destiny-level value implied by starting points, talents, identity, and growth systems.
   - Represents what the player character may eventually become.
2. Realized value
   - The part of potential already justified by age, training, choices, evidence, and long-term development.
3. Current effective value
   - The currently usable value after maturity caps and temporary modifiers.
   - AI should use this value and the capability package for narration, event checks, and NPC reactions.
4. Maturity cap
   - The age-stage ceiling that prevents infants and children from using adult-level power.
   - Age 18 removes the hard cap, but does not automatically realize all potential.
   - Runtime maturity caps apply only to Constitution and Intelligence. Appearance, Family Background, and Luck return `Number.MAX_SAFE_INTEGER` from `maturityCapForAge()`.
5. Locked potential
   - Potential that still exists but has not been realized.
6. Exposure value
   - How much the outside world has noticed the abnormality.
   - Determines whether family, NPCs, sects, institutions, cults, companies, or hostile forces react.

Example:

```text
Potential:
  Appearance 120
  Intelligence 80
  Constitution 150
  Family Background 20
  Luck 200

Birth current effective:
  Appearance 12
  Intelligence 6
  Constitution 10
  Family Background 20
  Luck hidden

Age 10 current effective:
  Appearance 30
  Intelligence 35
  Constitution 40
  Family Background 20
  Luck partially manifested

Adult:
  Hard maturity cap removed
  Realized value still depends on evidence, training, choices, route progress, and world systems
  Locked potential can remain locked until later
```

## Exposure Scale

| Exposure Value | Outside Reaction |
|---:|---|
| 0-10 | Almost nobody notices anything abnormal. |
| 11-30 | Family or close NPCs think the player character is somewhat special. |
| 31-60 | Nearby people begin to discuss or suspect abnormality. |
| 61-100 | Sects, institutions, organizations, or factions may notice. |
| 100+ | May trigger competition, research, pursuit, worship, recruitment, containment, or assassination. |

Exposure does not only mean public fame. It can also mean medical records, supernatural traces, fate disturbance, cult attention, sect detection, media attention, corporate monitoring, or enemy divination.

## Default Maturity Stages

These are default expression stages. Talents, world rules, identity, and events may add evidence, but they do not let age alone cash out all potential.

| Stage | Age | Expression Rule |
|---|---:|---|
| Birth | 0 | Infant body limit; only vitality, reaction, sensory, family-background, or omen-level expression. |
| Early childhood | 1-3 | Life force, reaction, perception, early memory, and mild above-peer traits. |
| Childhood | 4-6 | Same-age advantages can appear, but adult combat/social/knowledge authority stays locked. |
| Youth | 7-12 | Child-stage capability package; training, study, and pressure can realize more. |
| Adolescence | 13-17 | Larger capability package, but full potential still needs evidence and route progress. |
| Adulthood | 18+ | The hard age cap is removed; locked potential remains locked until realized. |

Rules:

- Family Background usually manifests immediately because birth family, bloodline, identity, sect origin, and social resources are starting conditions.
- Luck may remain hidden and manifest as event tendency instead of a visible number.
- Appearance is not maturity-capped, but it is also not treated as immediate reality. It should be shown as "not yet settled" development rather than locked age-sealed power.
- Mythic talents can alter evidence, exposure, triggers, and capability packages.
- Some talents may manifest early, late, conditionally, or almost invisibly.

Examples:

- Heavenly Beauty may manifest 30% at birth.
- Late Bloomer may manifest only 10% before adulthood.
- Lord Of Reincarnation may remain dormant until death, near-death, or fate reversal.

## Attribute Manifestation Rules

### Appearance

Appearance can manifest early, but it should not appear as adult beauty at birth.

| Stage | Manifestation Style |
|---|---|
| Birth | Facial structure, vitality, aura, unusual beauty, unusual purity, or eerie presence. |
| Childhood | Becomes more refined, liked, protected, envied, or noticed. |
| Youth | Clearly stands out and starts changing social fate. |
| Adulthood | Fully manifests and may trigger love, jealousy, protection, desire, worship, or conflict. |

Birth narration example:

```text
Your features have not grown open yet, but there is an indescribable clarity and spiritual quality around you. Your parents instinctively feel that you are unlike ordinary children.
```

Do not write:

```text
You are world-endingly beautiful at birth.
```

unless a specific immediate-manifestation talent and world rule justify it.

### Intelligence

High Intelligence should not make a baby behave like an adult unless the talent explicitly grants adult consciousness or born-knowing awareness.

| Stage | Manifestation Style |
|---|---|
| Birth | Clear eyes, unusual quietness, observation, early responsiveness. |
| Childhood | Early speech, strong memory, fast learning. |
| Youth | Understanding far above peers. |
| Adulthood | Full genius-level expression. |

Special exception:

If a talent such as Born Knowing exists, AI may write:

```text
From birth, you have a consciousness that does not belong to an infant, but your body still limits speech, movement, and influence.
```

Even then, the infant body remains a constraint.

### Constitution

High Constitution should not mean the infant can fight like an adult.

| Stage | Manifestation Style |
|---|---|
| Birth | Strong vitality, powerful crying, resistance to illness. |
| Childhood | Grows fast, recovers fast, has high energy. |
| Youth | Sports, combat, survival, and endurance clearly exceed peers. |
| Adulthood | Fully manifests and may reach monstrous body quality. |

If Constitution is extremely high in a mundane world, AI may write:

```text
Doctors find your physical indicators abnormal, but not yet impossible to explain. They advise your parents to schedule regular checks.
```

If exposure is too high, medical institutions, laboratories, or special organizations may notice.

### Family Background

Family Background usually manifests at birth.

It can represent:

- Birth family
- Bloodline
- Wealth
- Sect origin
- Political status
- Corporate backing
- Royal recognition
- Divine family
- Refugee or orphan status

Family Background can also change later:

- Family bankruptcy lowers it.
- Sect recruitment raises it.
- Becoming a true disciple raises it.
- Becoming saint or saintess raises it sharply.
- Exile lowers it.
- Being recognized by royalty raises it sharply.

### Luck

Luck is best handled as hidden manifestation.

At birth and childhood, Luck often appears as event tendency:

- A famous doctor happens to save the child.
- The family nearly goes bankrupt, then gets a sudden reversal.
- An abandoned child is found by a powerful mentor.
- Help appears during crises.
- Random danger turns into opportunity.

High Luck does not mean there is no danger.

High Luck means danger may happen often, but turning points and opportunities are more likely to appear.

## Mythic Talent Manifestation Types

Every Mythic talent should define a `manifestationType`.

### Immediate Manifestation

The abnormality is obvious from birth.

Suitable for:

- Divine body
- Divine beauty
- Ancient god pollution
- Saint reincarnation
- Innate omen

Pros:

- Strong opening impact.
- Easy to understand.

Cons:

- High exposure.
- Attracts protection, competition, research, worship, or danger.

Example:

```text
Talent: Born Divine Beauty
Rarity: Mythic
Appearance Potential: +120
Manifestation Type: Immediate Manifestation
Exposure: High
Effect: The player character is extremely special from birth and may be loved, protected, coveted, fought over, or targeted.
```

### Stage Manifestation

The talent awakens gradually with age.

This should be the default recommendation for most Mythic talents.

Example:

```text
Talent: Origin Body Of Ten Thousand Laws
Rarity: Mythic
Intelligence Potential: +80
Constitution Potential: +80
Manifestation Type: Stage Manifestation
Exposure: Medium
Effect: In childhood the player character appears smart and healthy; in youth the abnormality begins to show; after cultivation or supernatural contact the talent fully erupts.
```

### Conditional Awakening

The talent is hidden until a trigger event.

Suitable triggers:

- Death
- Near-death
- Major failure
- Fate reversal
- First cultivation breakthrough
- Forbidden ritual
- Contact with an eldritch truth

Example:

```text
Talent: Lord Of Reincarnation
Rarity: Mythic
Luck Potential: +100
Intelligence Potential: +40
Manifestation Type: Conditional Awakening
Trigger: Death, major failure, near-death, or fate turning point.
```

### Hidden Destiny

The player character seems ordinary, but fate quietly bends around them.

Example:

```text
Talent: Fate Rewriter
Rarity: Mythic
Luck Potential: +150
Manifestation Type: Hidden Destiny
Exposure: Low
Effect: Outsiders see little abnormality, but impossible reversals often appear during key events.
```

This type is safer in mundane worlds because it is less likely to trigger research, containment, or exploitation.

## World Reaction Rules

The same abnormal infant must produce different reactions in different worlds.

### Mundane Urban World

Mundane worlds explain abnormality through ordinary logic first.

AI reactions may include:

- Parents shocked, worried, proud, or afraid.
- Doctors suggest examinations.
- Family hides the abnormality.
- Media attention grows only if exposure rises.
- Special institutions may intervene.
- The child may still grow up normally if exposure stays low.
- Dangerous abnormalities may lead to research, isolation, abandonment, protection, or exploitation.

Do not write that the whole world knows immediately unless exposure and event chain justify it.

### Cultivation World

In cultivation worlds, abnormal talent is opportunity and danger.

AI reactions may include:

- Family sees immortal fate.
- Sect tests spiritual roots or physique.
- Powerful cultivators compete to recruit the player character.
- Family invests resources.
- Clan members become jealous.
- Enemy factions covet the player character.
- The player character may face possession, bone stealing, arranged marriage, protection, or assassination.

Mythic talent in cultivation is usually interpreted as heavenly genius rather than mere monsterhood, but heavenly geniuses are not safe.

### Cthulhu Or Weird World

In Cthulhu or weird worlds, abnormality is not necessarily good.

AI reactions may include:

- Parents fear the child.
- Villagers or neighbors avoid the family.
- Religious groups pay attention.
- Eldritch entities draw closer.
- Stronger abnormalities increase pollution risk.
- The player character may be treated as sacrifice, vessel, blessed one, omen, or future threat.

### Cyberpunk World

Cyberpunk worlds commodify abnormality.

AI reactions may include:

- Corporations want genetic testing.
- Financial groups want contracts.
- Black markets want to sell the data.
- Cybernetic companies pay attention.
- Family may protect or betray the player character.
- High attributes bring resources but also surveillance.

## Research, Containment, And Protection Checks

Whether the player character is researched, contained, protected, recruited, or hunted depends on four factors:

```text
abnormal consequence risk =
  manifested value
  + exposure value
  + world tolerance
  + protection power
```

World tolerance means how normal the world considers abnormal power.

Protection power includes family, sect, wealth, secrecy, mentors, luck, political status, and supernatural backing.

Examples in a mundane world:

| Situation | Likely Result |
|---|---|
| High manifestation, high exposure, low Family Background | Easy to discover, research, abandon, or exploit. |
| High manifestation, high exposure, high Family Background | Family may protect, hide, or control information. |
| High manifestation, high Appearance, kind parents | May be loved and protected, but still worried over. |
| High manifestation, high Luck | Crises often produce turns. |
| Low manifestation, low exposure | Grows normally, only gradually seeming excellent. |

Examples in a cultivation world:

| Situation | Likely Result |
|---|---|
| High manifestation, high exposure | Sects compete, family invests resources. |
| High manifestation, low Family Background | May be discovered by a master or coveted by criminals. |
| High manifestation, high Luck | More likely to meet benefactors. |
| High manifestation, no protection | Easy to suffer bone theft, stolen opportunities, or hostile recruitment. |

## Growth Evidence Rule

AI cannot directly set current effective power.

When a scene justifies growth, AI may submit:

```json
{
  "attribute": "constitution",
  "amount": 1,
  "source": "daily_chores",
  "reason": "长期劈柴和跑腿让体力基础提升"
}
```

The engine records this evidence, increases realized value when valid, recalculates current effective value, and keeps locked potential separate.

## UI Rule

After talents and point allocation, the player may see potential values, realized values, current effective values, and locked potential.

Example:

```text
Destiny Potential:
  Appearance 120
  Intelligence 80
  Constitution 150
  Family Background 20
  Luck 200
```

The simulation should separately compute the birth manifested values.

Example:

```text
Current Effective At Birth:
  Appearance 12
  Intelligence 6
  Constitution 10
  Family Background 20
  Luck hidden

Locked Potential:
  Appearance 108
  Intelligence 74
  Constitution 140
  Luck 200
```

This lets the player know the character is extraordinary without forcing AI to write impossible infant scenes.

## AI Writing Rule

AI must never narrate only from potential value when the current life stage has not manifested it yet.

Correct:

```text
Potential Appearance 120, birth manifested Appearance 12:
AI describes unusual purity, vitality, aura, parental intuition, and possible attention.
```

Incorrect:

```text
AI describes a newborn as having fully adult, world-shattering beauty.
```

Potential defines destiny. Realized growth defines what has been earned or unlocked. Current effective value defines what can actually be used now. Locked potential defines what still waits. Exposure defines who notices.
