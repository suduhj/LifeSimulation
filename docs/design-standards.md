# Design Standards

## Experience Direction

The game should feel like a readable, atmospheric life chronicle rather than a busy dashboard. The player should always understand their current life stage, identity, risks, relationships, and meaningful next choices.

## UX Principles

- Lead with story, then reveal mechanics.
- Make choices feel consequential.
- Keep stats visible but not visually louder than the narrative.
- Use clear feedback when talents, attributes, or world rules affect an outcome.
- Make restarting fast and satisfying.

## Core Screens Draft

- Home / identity setup
- Attribute allocation
- Talent draw
- Fate preview
- Life timeline from birth
- First meaningful branch/current node
- Life timeline
- Current event / choice node
- Action result node
- Character state summary
- Relationship/world state summary
- Run history and ending summary
- Unlocks or collection view

## Web Flow Layout

Creation is a guided multi-step flow. Do not place identity setup, attributes, talents, fate preview, events, debug data, and current life state on one crowded page.

Creation pages:

- Identity setup: world, name, gender, personality direction, race/identity-type tendency.
- Attribute allocation: only the five core attributes and `20 / 20` point feedback.
- Talent draw: only draw 5, keep 3, rarity, manifestation type, and player-visible effects.
- Fate preview: world, player character basic information, kept talents, five allocated attributes, AI-generated birth background, birth family, parents/guardians in broad terms, destiny preview, surrounding reaction, world context, and current situation. It must not show initial important NPC lists, unresolved-detail sections, labels such as "future foreshadowing", hidden triggers, talent-manifestation progression, or age-by-age early-life content.
- Fate preview must be rendered as a short static dossier rebuilt from safe fields, not as a long AI story paragraph. Do not directly display provider prose if it contains age-specific early life, hidden objects, suspicious NPC details, future hooks, or unexplained-detail lists. Those belong in backend memory, `opening.earlyLifeTimeline`, or GM/debug views.
- Fate preview must not use player-facing placeholders for missing names or hidden people. If a talent, NPC, or identity cannot be safely localized into Chinese for the ordinary player, the item should not appear in the ordinary UI until the data is repaired or the story justifies revelation.

After formal life begins, use a downward timeline:

- A sticky top summary shows world, age, gender, identity type/race when known, talent summary, and current visible state.
- The middle area is a scrollable life chronology starting from birth. Early-years auto progression belongs here as readable age-ordered nodes from 0岁 to the first action age.
- The bottom current node shows the current branch, three rich choices, and the free-form input.
- After a choice/free-form action, disable inputs immediately, show `命运正在描绘中……`, merge the action result into the relevant lived timeline node, then show the next playable branch in the bottom current node. Do not duplicate the full action result in a separate ordinary-player card.

The key rule is page separation during creation and timeline continuity during life.

## Narrative Timeline Rules

- Fate preview is a static dossier for confirming "who I am": identity, family, birth background, five attributes, kept talents, destiny preview, surrounding reaction, world context, and current situation.
- Fate preview must not spoil hidden hooks or age-by-age manifestation. Do not show "initial important NPCs", "unexplained details", or early-life auto progression to ordinary players. Omens, rumors, strange objects, NPC abnormal reactions, family concealment, true hooks, triggers, route conditions, and talent-manifestation progression belong in backend `hiddenHooks`, `unresolvedThreads`, legacy `opening.earlyLifeTimeline`, internal notes, talent cards, or GM/debug data until the player discovers them through play.
- Early-years auto progression shows the non-interactive growth from birth to first action age inside the formal life timeline through per-age `opening_year` LifeNodes in `PlayerView.timeline`. It must use strict age order from 0岁 onward, and each node body must match its own age. It should still be written with concrete life texture rather than empty yearly filler, and ordinary UI must not rebuild it from fixed fallback templates.
- Formal life begins after the player clicks `开始人生`: the timeline starts at age 0 with early-life nodes, then reaches the first meaningful branch at the bottom current node. It must not duplicate the same opening text in separate cards.
- The middle timeline records lived experience and resolved consequences. The bottom current node is for the current unresolved branch with 3 choices plus optional free-form input.
- Action results are merged into the corresponding lived timeline node with the chosen/attempted action, immediate result, NPC reaction, state changes, non-spoiler future dark line/unexplained detail, and next-stage transition. The UI may show compact visible changes, but should not repeat the same full narrative in a separate `行动结算` card or standalone `变化提示` event card.
- Current playable events must keep age labeling and causality aligned. The visible current node should show the exact age/year of the event in the same visual language as the timeline, and the branch should emerge from the prior situation, not from a reversed explanation of the outcome. The body must introduce relevant people, objects, places, clues, factions, or items before the choices can refer to them.
- Current playable events must use concrete Chinese titles, not generic labels such as "人生事件". If the AI returns a generic title, the engine/frontend should derive a safe concrete title from the event body rather than showing the generic label.
- Choice metadata must not spoil the result. It may display fuzzy risk/difficulty such as `难度较低`, `风险不明`, or `结果难以预料`, but it must not say the player has already successfully obtained, hidden, extracted, defeated, solved something, or use `成功率` wording that feels like a result guarantee before the player chooses.
- The free-form action box is an immersive optional fourth action entry. Its ordinary-player placeholder should be short and story-facing; technical explanations about AI/engine judgment belong in help text, rules, or GM/debug surfaces.
- Blank event cards, blank result cards, and empty change panels must not be visible in ordinary player mode.

## Player-Facing Language

- Ordinary player UI must be Chinese-first. Stable backend IDs may appear only in GM/debug surfaces.
- Talent cards must show Chinese name, rarity, and manifestation type by default. Clicking or hovering should reveal a real detailed description, point bonuses, attribute impact, narrative effect, possible risk, and manifestation explanation. Any player-facing talent introduction must include a `点数加成` line. If the talent has attribute bonuses, list concrete values such as `悟性 +35；根骨 +35`; if it has no direct opening point bonus, explicitly show `无直接开局点数加成`. Details must use the talent's effects, tags, rarity, and world context rather than a generic template. Hidden triggers and future route conditions remain GM/backend-only.
- The state summary must include the player's current talents and the current values of the five attribute layers as they change during the story. Talent details are opened by click/hover. Explanations for `当前表现`, `天赋潜能`, and `异常关注` should live behind inline help or detail UI, not as always-visible long tutorial text.
- Important NPCs in ordinary UI must use the player's current knowledge only. Undiscovered hidden NPCs, true roles, backstage factions, and raw IDs must not appear in fate preview, initial relationships, timeline text, state summary, or choices. They may appear only in GM/debug data.
- Base attribute labels are fixed across all worlds: 颜值, 智力, 体质, 家境, 运气. Do not replace them with 修仙-only aliases such as 仙姿, 悟性, 根骨, 出身/底蕴, or 气运 in ordinary UI.
- Frontend display terms for attribute layers are:
  - `potential` -> `天赋潜能`
  - `manifested` -> `当前表现`
  - `exposure` -> `异常关注`
- Attribute-card sealing terms are attribute-specific: 体质 uses `年龄封存`, 智力 uses `经验封存`, 颜值 uses `尚未定型`, 家境 uses `家庭底色`, and 运气 uses `机缘倾向`.
- Ordinary annual event text must never expose backend planning terms such as `人生课程`, `年度变化`, `旧线索`, `背景回响`, `主轴`, `副轴`, raw snake_case IDs, `curriculumSlot`, `threeLayerFocus`, `backgroundThreads`, or `assetRoles`. These are GM/debug or engine-contract concepts only.

## Observable Scene Runtime

Annual scenes use the Observable Scene Runtime boundary:

```text
System Truth
  -> Attribute Reality Contract
  -> World Origin Resolver
  -> Observable Year Delta
  -> Scene Object
  -> AI / Mock Slot Rendering
  -> Scene Compliance Validator
  -> Canonical LifeNode
  -> EventLog / GrowthLedger / PanelViews
```

The system truth can contain IDs, curriculum slots, topic ledgers, asset roles, yearly outcomes, and growth evidence. Ordinary player-facing text only receives the compiled Scene Object: visible title intent, current human-life change, limited world flavor, background echoes with role limits, and three choice directions. Background echoes may lightly appear, but they cannot own the title, first paragraph, or choices unless the engine promotes them to the main scene.

After validation, ordinary timeline display uses canonical `LifeNode` records rather than raw AI `playerText`. A timeline node shows the age and body text; event titles are not rendered in the ordinary timeline. `annual_event`, `action_resolution`, `opening_year`, and `ending` nodes must keep separate `nodeId` values so a yearly event and a later choice result cannot duplicate the same body as two different cards.

## Visual Direction Draft

The visual style is not final. Early direction:

- Text-forward interface with strong atmosphere.
- World-specific visual accents.
- Clear rarity colors for talents.
- Calm layout for reading, with enough density for strategic decisions.
- Avoid generic fantasy UI unless a selected world specifically calls for it.

## Content Tone

The default tone should be immersive, flexible, and world-aware. The game can support serious, dramatic, funny, tragic, or absurd runs, but each world should have a consistent voice.

## Accessibility

- Text must be readable on desktop and mobile.
- Important information cannot rely on color alone.
- Long AI text should be skimmable with headings, emphasis, or structured event summaries.
- Controls should be keyboard-friendly where possible.
