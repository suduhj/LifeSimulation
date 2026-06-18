# GPT Working Guide

This file is the agent-facing entry point for the Life Simulator project.

## Required Workflow

Before making project changes:

1. Read this file.
2. Read the relevant standard files in `docs/`.
3. Check today's development log in `dev-logs/`.

After making project changes:

1. Update today's development log.
2. Update any affected standard document.
3. Report what changed and what remains.

When the user adds new product, design, technical, or process requirements during conversation, record them in the relevant file under `docs/` and update the daily development log. Important decisions should not live only in chat history.

## Standard Files

- Product requirements: `docs/product-requirements.md`
- Attribute and NPC rules: `docs/attribute-and-npc-rules.md`
- Talent and scaling rules: `docs/talent-and-scaling-rules.md`
- Potential, manifestation, and exposure rules: `docs/potential-manifestation-exposure-rules.md`
- Content pool rules: `docs/content-pool-rules.md`
- MVP content pool draft: `docs/mvp-content-pool-draft.md`
- Runtime data validation: `docs/data-validation.md`
- AI output protocol: `docs/ai-output-protocol.md`
- MVP program skeleton: `docs/mvp-program-skeleton.md`
- World content pool schema reference: `schemas/world-content-pools.schema.json`
- AI event response schema reference: `schemas/ai-event-response.schema.json`
- Runtime data validator: `tools/validate-world-data.mjs`
- Playtest readiness checker: `tools/check-playtest-readiness.mjs`
- MVP world core skeleton comparison: `docs/mvp-world-core-skeletons.md`
- Shared simulation systems: `game-design/simulation-systems.md`
- Cthulhu Life World design: `docs/world-cthulhu-life.md`
- Cthulhu public knowledge runtime rules: `worlds/cthulhu/public-knowledge-rules.json`
- Cthulhu city-stage runtime rules: `worlds/cthulhu/city-archetypes.json`
- Cthulhu opening visibility and exploration runtime rules: `worlds/cthulhu/opening-information-rules.json`
- Cthulhu dynamic danger and trap frequency runtime rules: `worlds/cthulhu/danger-scaling-rules.json`
- Technical standards: `docs/technical-standards.md`
- Design standards: `docs/design-standards.md`
- Execution plan: `docs/execution-plan.md`
- Development logging rules: `docs/development-logging.md`
- Documentation index: `docs/README.md`
- Shared game design folder: `game-design/`
- Runtime world data folder: `worlds/`
- Validation command: `npm run validate:data`
- Content minimum audit command: `npm run audit:content -- --strict`
- Playtest readiness command: `npm run check:playtest`
- Real AI smoke command: `npm run smoke:ai`
- Web playtest end-to-end smoke command: `npm run smoke:web`
- Test command: `npm test`
- MVP skeleton demo command: `npm run demo`
- MVP multi-turn demo example: `npm run demo -- --world cthulhu --turns 3 --save saves/demo-run.json`
- MVP choice demo example: `npm run demo -- --world cultivation --choice choice_2 --save saves/choice-run.json`
- MVP interactive play command: `npm run play`
- CLI help command: `npm run play -- --help`

## Development Logs

- Log folder: `dev-logs/`
- Daily format: `dev-logs/YYYY-MM-DD.md`
- Current initial log: `dev-logs/2026-06-11.md`

Every development session must record:

- Completed work
- Decisions made
- Remaining todo items

## Project Direction

## 不可违背的根本宗旨

本项目不是固定剧情游戏，也不是事件卡牌游戏，而是一个 AI 驱动的人生模拟器。

最重要的体验是：玩家可以自由行动，而不是只能点击固定选项。AI 必须根据玩家当前人生、属性、天赋、年龄、NPC 关系、历史事件、世界状态、势力关系、当前状态和世界观规则，动态推进后续内容。

内容池只是素材种子和世界风格参考，不是固定剧情库，不是事件白名单，不是固定年龄脚本，不是固定结果路线。不得让玩家每局都只能在预设事件里循环。如果内容池没有合适事件，AI 必须允许根据世界规则和当前存档自由生成合理事件。

引擎负责筛选、校验和保存状态；AI 负责根据当前存档生成自由、真实、连续的人生内容。AI 只能提交 `statePatch`，不能直接替换权威存档。玩家自由输入的行动必须被认真处理为“尝试行动”，再由属性、天赋、年龄、身份、世界规则、剧情合理性、NPC 关系、势力关系、当前状态、历史事件、随机概率和隐藏难度共同判定，不能当作装饰功能。

推进任何系统时必须反复检查：当前实现有没有限制 AI 生成自由？有没有把池子当成固定剧本？有没有削弱玩家自由行动？如果有，必须改回“自由行动 -> AI 合理判定 -> 世界继续变化 -> 人生持续推进”的核心循环。

The project is an AI-powered life simulator. The main priority is story immersion, supported by talent draws, attribute allocation, strategic choices, world exploration, and replayable unexpected outcomes.

Important guardrail: this is a multi-world life simulator, not only a cultivation game. Do not let Cultivation World-specific systems become assumptions for all worlds unless the docs explicitly define them as shared systems.

Important product guardrail: every subsystem must serve the life-simulation core. Factions, cultivation, eldritch truth, wasteland survival, business, romance, combat, exploration, organizations, and power growth should feed back into the player character's life path, relationships, aging, choices, consequences, biography, score, and ending. Do not let any subsystem turn the project into a different genre unless the player character's life choices make that subsystem their main life project.

Highest-priority simulation guardrail: this is not a fixed-plot game, event-card game, or preset route picker. It is an AI-driven life simulator. The core loop is `free action -> AI reasonable judgment -> world state changes -> life continues`. Players must feel that they are living a life inside a world, not cycling through a scripted template. Content pools are material seeds and world-style references, not fixed plot libraries, event whitelists, fixed-age scripts, fixed outcomes, or forced routes. If no pool seed fits the current save, AI must be allowed to generate a reasonable event from world rules, current life state, attributes, talents, age, NPC relationships, prior history, factions, and world progress. Player free-form actions must be treated as meaningful attempted actions and judged seriously, not as decorative text.

Before expanding systems, check whether the implementation restricts AI freedom, treats pools as scripts, or weakens player free action. If it does, revise the design toward the core loop.

Important data rule: separate human/AI-developer world explanation from runtime data. Use `.md` for design explanation and `.json` for game-readable configuration, talents, NPC templates, event seeds, endings, and world-specific systems.

Important content-pool rule: pools are searchable world-material seed libraries, not fixed plot libraries. Use pools to control style, provide generation material, support filtering, reduce AI drift, and support achievements/codex/endings. AI must adapt seeds to the current save. Talent, event, NPC template, and identity seeds have runtime JSON under `worlds/<world>/`. Identity seeds use limited player visibility: name, short description, possible routes, and approximate risk are visible; hidden secrets, true risk, special NPCs, and family details remain backend-generated.

Important playtest-version rule: follow `docs/playtest-version-standard.md`. A real player-facing playtest version must be a web version and requires DeepSeek or another OpenAI-compatible API path; mock AI and CLI play are only for development/offline testing/smoke testing. Event pools are soft reference material, not whitelists. Events may come from seed pools, AI-free generation, player consequences, NPCs, world progress, natural life, or random disturbance.

Highest-priority player-facing UI rule: ordinary player screens must be fully Chinese and must not show backend IDs, raw schema keys, missing-data placeholders, or debug concepts. Every current playable life node must show the exact event age in the visible title and left timeline/current-node age marker, use a concrete Chinese event title instead of generic labels such as "人生事件", "人生片段", "命运片段", "当前事件", or "新的事件", and establish the prior situation before presenting choices. The event body must first explain what previous life context, family disagreement, NPC reaction, clue, opportunity, danger, relationship change, or world pressure naturally causes this branch; only then may it present the three choices plus optional free-form input. Choices must not mention people, objects, places, clues, factions, or items that the body has not already introduced. Choice metadata may show fuzzy chance/risk only; it must not pre-announce resolved outcomes such as already obtaining an item, successfully hiding, successfully extracting information, or "成功率" wording that feels like a result guarantee. Prefer risk/difficulty wording such as "难度较低", "风险不明", or "结果难以预料". Free-form input is the optional fourth attempted action and should use immersive player wording, while technical judgment details belong in rules, tooltips, or GM/debug surfaces.

Important validation rule: run `npm run validate:data` after editing runtime JSON. The local validator is the current practical authority for MVP runtime data checks. Reference schemas live in `schemas/`, but project-specific checks such as world-folder matching and MVP pool minimums live in `tools/validate-world-data.mjs`.

Important API security rule: never expose DeepSeek/OpenAI-compatible API keys to the browser. Real AI requests must go through the backend/server-side provider adapter only. Frontend files under `web/` must not read `.env`, mention real provider secret variable names, build `Authorization` headers, include `Bearer` tokens, or receive API keys from player input. Local `.env` and `.env.*` files must stay ignored by git; only `.env.example` with safe placeholders may be committed. Do not print API keys in logs, errors, diagnostics, docs, tests, or final answers. When checking provider configuration, report only configured/missing/placeholder status, never secret values.

Important player-facing frontend rule: ordinary player UI must display Chinese. English stable IDs may remain in backend fields, JSON, schemas, logs, and developer/debug surfaces only. World names, talent names, rarities, manifestation types, buttons, labels, prompts, risk text, and state summaries must use frontend localization mappings instead of raw IDs such as `cthulhu`, `pleasant_smile`, `common`, or `hidden_destiny`. Product/model names such as DeepSeek, OpenAI, and Claude may remain in English. Save paths, `schemaVersion`, selected seeds, validation flags, and other technical details must not appear in ordinary player mode; if exposed, they belong in developer mode only.

Highest-priority ordinary UI localization rule: ordinary player-facing UI and player-facing AI text must never surface backend IDs or missing-data placeholders. Do not show raw IDs such as `poor_scholar_child`, `sacrifice`, `exploiter`, `lover`, `NPC_4`, `heavenly_spirit_root`, `manifested`, `potential`, or `exposure`. Do not replace missing names with player-facing placeholders such as "未命名天赋", "未知天赋", "重要人物", "未知身份", or "身份尚不明确". If a selected talent, NPC, identity, or event lacks a safe Chinese player-visible label, fix the mapping/data, hide the undiscovered item, or repair the AI output before rendering ordinary UI. Ordinary web API payloads should also avoid shipping hidden NPC roles, template IDs, hidden info, or raw backend relationship roles to the browser player surface; GM/debug mode may show backend IDs and missing-field diagnostics.

Important GM/debug rule: the web playtest may include a hidden top-right `GM / 调试` entry for local tester mode. Test presets, test scenarios, and test-only talents must be marked `testOnly: true` or `visibility: "dev_only"` and must not enter formal player talent draws, ordinary event pools, or natural triggers. The GM panel may show hidden fields such as potential, manifested values, exposure, NPC hidden summaries, selected seeds, AI raw JSON, and statePatch validation, but ordinary player UI must not show those technical details.

Important ending UX rule: ordinary web setup must not ask the player to fill an ending age. Lifespan and ending timing are hidden system mechanics derived from world, attributes, talents, realm/progress, injuries, illness, pollution, mutation, medical or cultivation factors, and high-risk events. The playtest supports five ending categories: natural death, accidental/failure death, goal completion, world ending, and special-state ending. Test/dev flows may still pass an internal `endingAge` for deterministic smoke tests.

Important web-port rule: do not use port `5173` for this project because that port is reserved for `music_agent`. Do not use port `0001`/port 1 either because Chromium blocks it with `ERR_UNSAFE_PORT`. The browser playtest defaults to `http://127.0.0.1:5181`; if that port is occupied, use the fallback URL printed by `npm run web`.

Important web-flow rule: creation must be a step-by-step flow, not a crowded all-in-one page. The required order is home/identity setup -> attribute allocation -> talent draw -> fate preview -> formal life timeline from birth -> first meaningful branch/current node. Fate preview is a static dossier for confirming "who I am"; it may show world, identity, five allocated attributes, selected talents, birth family, guardian/family context, destiny preview, world context, and current situation. It must not show initial important NPC lists, unexplained-detail sections, talent-manifestation progression, early-years auto progression, future triggers, hidden hooks, hidden NPC functions, birth-to-childhood progression, or route conditions. These belong in talent detail cards, backend `hiddenHooks`, `unresolvedThreads`, hidden NPC state, `opening.earlyLifeTimeline`, internal notes, or GM/debug surfaces until the player discovers them through play. After the player clicks `开始人生`, use a downward life journal starting at age 0 from `opening.earlyLifeTimeline`: early-years nodes must be stored in age order from 0 up to the first action age, each node body must match its own age, and the current unresolved branch stays at the bottom current node. When the player chooses or submits free-form action, the resolved consequence should merge into the corresponding lived timeline node, while the next unresolved branch appears at the bottom current node. Do not duplicate full action results in a separate ordinary-player card, do not show standalone "变化提示" event cards, and do not show blank event/result cards. Do not mix identity setup, attributes, talents, fate preview, events, current state, and debug data into one ordinary player page.

Highest-priority fate-preview safety rule: ordinary fate preview must be built as a backend-sanitized static dossier, not by directly rendering AI provider prose. The ordinary browser may show only safe dossier fields such as `出生地点`, `出生家庭`, `父母/监护人`, `家境表现`, `命运预览`, `周围目光`, `世界底色`, and `当前处境`. If provider text includes age-specific early-life narration, hidden clue objects, suspicious NPC details, future route hooks, "未解释细节", "初始重要NPC", "人际关系", "天赋显化", or similar content, the backend must omit it from ordinary player output and keep it in `opening.earlyLifeTimeline`, `hiddenHooks`, `unresolvedThreads`, hidden NPC memory, internal notes, or GM/debug surfaces. The fate page confirms the opening dossier; the life page tells the story from age 0.

Important narrative-pacing rule: the UI and AI output should feel like a continuous life chronicle, not a test dashboard, fixed event deck, or mechanical page. Early-years auto progression should still be age-ordered from 0, but each age node must be meaningful and age-appropriate instead of a flat log or wrong-age filler. Every action resolution must state what the player chose or attempted, immediate result, NPC reaction, state changes, non-spoiler future dark line/unexplained detail, and a natural transition into the next stage. Talent cards must show Chinese name, rarity, and manifestation type by default, with click/hover details for attribute impact, narrative effect, possible risk, and manifestation explanation. Player-facing attribute layer labels are `当前表现`, `天赋潜能`, and `异常关注`; raw backend terms and IDs belong only in backend/GM/debug contexts.

Important event-age and causality rule: every current playable event must clearly show the age/year it happens at, using the same age as the left timeline/current node and `timeSpan.ageEnd`. The event title should follow `X 岁：事件名` or an equivalent Chinese age-marked format. The body and choices must fit that age. A branch must be caused by prior life context first, then present the choice pressure: a family disagreement, NPC reaction, clue, opportunity, danger, relationship change, or world pressure should naturally lead into the three choices plus optional free-form input. Do not generate a choice node as a random card, and do not reverse cause and effect by describing outcomes before the situation that triggered them.

Important player-knowledge rule: ordinary UI and player-facing AI text must only show what the player character currently knows. Hidden NPC true identities, raw NPC IDs, backend role keys, future route functions, hidden factions, and "you later learn..." spoilers belong only in backend memory, `hiddenInfo`, `hiddenHooks`, `unresolvedThreads`, internal notes, or GM/debug surfaces until the save justifies discovery. If an NPC reveals deeper identity, the AI must have scene/action/attribute/relationship justification and must propose an `importantNPCUpdates` patch that updates player-visible identity.

Important talent-detail rule: talent details shown to ordinary players must be real world-aware explanations, not shallow generic template text. Use the talent's Chinese name, rarity, manifestation type, attribute effects, tags, world context, narrative effect, possible risk, and manifestation logic. Every player-facing talent introduction must include a `点数加成` line. If there are attribute bonuses, show exact values such as `悟性 +35；根骨 +35`; if there is no direct opening point bonus, explicitly show `无直接开局点数加成`. Do not expose hidden trigger conditions or future route scheduling in ordinary talent details.

The AI role is hybrid:

- Early game: narrative author
- Mid game: game master
- Late game: world simulation engine

## Current Product Assumptions

- The player chooses from multiple worlds.
- The MVP uses a few-but-deep world strategy with 3 carefully designed worlds.
- The 3 MVP worlds are Cultivation World, Cthulhu Life World, and Post-Apocalyptic Wasteland.
- Cultivation World is only one MVP world. Always preserve design space for Cthulhu Life World, Post-Apocalyptic Wasteland, and future custom worlds.
- The three MVP worlds should be developed at comparable skeleton depth before over-specializing one world.
- MVP world folders are `worlds/cultivation/`, `worlds/cthulhu/`, and `worlds/wasteland/`. Each should have `world.md` plus runtime JSON files.
- Same-level world comparison lives in `docs/mvp-world-core-skeletons.md`.
- Content pool rules live in `docs/content-pool-rules.md`; current three-world pool content is a draft in `docs/mvp-content-pool-draft.md`.
- Runtime seed pools now include `identity-seeds.json`, `talents.json`, `event-seeds.json`, and `npc-templates.json` under each MVP world folder.
- Shared game design summaries live in `game-design/`.
- All worlds use age as the shared life-simulation axis, while each world also has a unique secondary progression system.
- All worlds use yearly progression by default.
- Cthulhu Life World is not a forced investigation game. The player can pursue the truth of the world, ignore it and live freely, resist eldritch forces, kill or seal eldritch entities, inherit eldritch power, become a Cthulhu-like existence, save the world, destroy the world, or discover other extreme outcomes.
- Cthulhu Life World formal stage direction is "all major stage archetypes", but MVP uses random city-stage selection instead of one fixed default city.
- Cthulhu MVP city naming uses benchmark cities plus archetype-specific name pools. Benchmark cities stabilize tone and testing; name-pool cities preserve replay variety.
- Cthulhu benchmark cities are hidden generation anchors in MVP. Do not expose Haijing, Mowen, or Qingshi as player-selectable presets unless a future creator/debug mode explicitly adds that.
- Current Cthulhu benchmark cities are Haijing, Mowen, and Qingshi.
- Cthulhu MVP city-stage selection should consider identity, Family Background, Luck, talents, exposure, public abnormality level, and personal goal direction.
- Cthulhu MVP opening information is minimal by default: city name, birth family background, and surface birth context. High Intelligence, high Luck, special talents, high exposure, or special Family Background may reveal partial ambiguous clues.
- Cthulhu players may freely explore, ask NPCs, search online, use relationships/resources/talents, follow rumors, observe dreams, or attempt other reasonable methods to learn more. These actions can create bad outcomes such as cult attention, official attention, entity attention, dangerous locations, false information, sanity pressure, pollution, surveillance, recruitment, sacrifice, or research.
- AI may set traps and misleading opportunities. High-difficulty worlds may use frequent traps, but they must be justified by world logic, player behavior, attributes, talents, relationships, and existing clues.
- Cthulhu default difficulty is slow-burn dynamic: early danger is usually restrained, then trap and danger frequency rise or fall based on truth exposure, corruption/assimilation, occult contact, social normalcy, publicity level, player behavior, protection power, factions, and entity attention.
- Shared systems: gender can deeply affect routes; player-facing events use pure text life-simulator format; normal playable events show exactly 3 AI-generated rich choices by default and expose free-form input through a separate optional 4th entry; AI must not generate `choice_4`; normal free-form input is handled directly after the player chooses the 4th entry, while complex/high-risk/ambiguous/world-breaking input is explained first and may require confirmation; free-form input is judged by attributes, talents, age, identity, world rules, plausibility, NPC relationships, faction relationships, current states, history, randomness, and hidden difficulty; free-form failure resolves by risk band and may also create unexpected gains with a cost; backend events are stored as structured JSON; event text and options must be richly written, never bare one-word commands; all attribute/state changes are displayed with change amount, current value, source type, temporary/permanent status, and recovery condition when recoverable; success rates are fuzzy; NPC relationship values are internal and use five base dimensions: affinity, trust, fear, interest binding, and secret leverage; player-facing relationship display defaults to labels plus rough ranges, with world-specific dimensions and display overrides allowed; initial important NPCs are automatically generated from world, identity, Family Background, talents, and birth background using world NPC template pools, default count 3-5, and players cannot manually specify important NPC relationships in normal setup; important NPCs keep identity, attributes, talents, relationship values, stance, goals, hidden information, faction ties, history, and memories; faction members can be ordinary members, backbone members, core members, or promoted full important NPCs such as deputies, heirs, lovers, rivals, traitors, disciples, protectors, or successors, with promotion count controlled by faction scale and life-simulation pacing; important NPC attributes and talents are fuzzy by default and unlock through relationships, Intelligence, talents, investigation, observation, faction intelligence, or world-specific methods; important NPC information can be wrong or incomplete when world logic supports deception, disguise, hidden faction ties, false identity, supernatural interference, or incomplete observation, with world-specific misjudgment strength; high Intelligence, high relationship dimensions, relevant talents, investigation, long-term observation, faction intelligence, and world-specific detection methods can reduce misjudgment probability; players can join or create factions, faction creation uses default hard conditions plus world-specific requirements, tiny low-threshold factions are allowed when scale fits age/situation, and growing a small faction into a meaningful force is an important route; faction growth uses four axes: operations/construction, social politics, conflict/expansion, and ideology/identity, with different worlds weighting them differently; endings include score, tags, AI biography, and settlement; each run has independent memory while account-level achievements/unlocks persist.
- Cthulhu Life World has a dedicated design file. Use it when discussing tone, routes, sanity pressure, corruption, occult contact, truth exposure, and endings.
- Cthulhu Life World default public state is abnormality semi-public but truth highly sealed. Ordinary people know rumors and strange events exist, but do not understand Old Ones, corruption, forbidden knowledge, or the real abnormal structure.
- Cthulhu Life World default abnormality publicity level is 2: strange rumors are widespread, but official sources deny the abnormal truth.
- Cthulhu official institutions know more but do not publicly admit the truth. They explain visible abnormal events as disease, accident, crime, rumor, religious incident, mental illness, internet urban legend, natural disaster, terrorist incident, experimental accident, or similar ordinary causes.
- Cthulhu official factions include stability-maintenance, containment, research, compromise/surrender, and resistance. Do not treat official power as simply good or evil.
- For Cthulhu visible abnormal events, use the public knowledge model and official handling flow before escalating: local normal handling, unexplained details, abnormal department intervention, lockdown, news modification, public explanation, contact monitoring, abnormal item recovery, then memory handling, containment, elimination, or recruitment.
- The formal release should support player-customized worlds generated and structured with AI assistance.
- The player draws talents with rarity tiers: Common, Fine, Rare, Epic, Legendary, Mythic.
- Talent setup is draw 5, keep 3. Talent pools include universal talents and world-specific talents.
- Single-talent rarity probabilities are Common 45%, Fine 28%, Rare 16%, Epic 7%, Legendary 3%, Mythic 1%.
- Talent effects can modify attributes, change routes, trigger hidden events, and add side effects. Mythic talents are extremely rare and can change the whole run.
- Talents can be starting numeric talents, long-term growth multiplier talents, breakthrough modifiers, hidden-event triggers, route changers, or side-effect trade-offs.
- The player allocates starting attributes: Appearance, Intelligence, Constitution, Family Background, and Luck.
- Do not use Spirit, Charisma, or Combat as core attributes. Stress resilience, social charm, and combat ability are derived capabilities.
- Starting attributes can be random or freely allocated. Free allocation has a base cap of 20 points, average ordinary baseline is 4 per attribute, and talent bonuses can exceed the cap.
- Single core attributes use 0-20 as the mortal range. Starting or mortal-stage talent-enhanced attributes may reach 20-60 depending on rarity and source. Cultivation realms and supernatural growth can exceed this using scaling rules.
- Total attribute tiers: around 20 ordinary person, 26-50 excellent mortal, 51-80 top mortal, 81-100 mortal limit, 100-1,000 Qi Refining, 1,000-10,000 Foundation Establishment, 10,000-100,000 Golden Core, 100,000-1,000,000 Nascent Soul, 1,000,000-10,000,000 Spirit Transformation, 10,000,000+ higher realms.
- Cultivation World MVP uses Mortal, Qi Refining, Foundation Establishment, Golden Core, Nascent Soul, and Spirit Transformation. Formal release expands to Void Refinement, Body Integration, Mahayana, Tribulation Crossing, and Ascension.
- Cultivation World supports sect, wandering cultivator, and family/clan routes, and the player character may switch routes when story conditions justify it.
- Attribute gain impact depends on both absolute points and the gain's percentage of the current tier width. Realm breakthroughs move into a new tier range instead of adding small fixed values.
- Attribute source layers must be preserved: base allocation, identity bonus, talent bonus, growth bonus, temporary state modifier, and permanent injury modifier.
- Attributes have three layers: potential value, manifested value, and exposure value. Potential defines future height, manifested value defines current age-appropriate expression, and exposure defines who notices.
- AI must not write full potential as fully active at birth. It should use current manifested values and age stage to narrate birth, childhood, youth, and adulthood.
- Default manifestation ratios: birth 5%-15%, early childhood 10%-30%, youth 30%-50%, adolescence 50%-80%, adulthood 80%-100%. Family Background usually manifests immediately; Luck may manifest as hidden event tendency.
- Mythic talents should define manifestation type: immediate manifestation, stage manifestation, conditional awakening, or hidden destiny.
- Outside reaction depends on manifested value, exposure value, world tolerance, and protection power. Different worlds must react differently to abnormal children.
- AI-generated people are NPCs. Do not call NPCs "player characters"; keep player character and NPC terminology separate.
- NPC templates are identity anchors, not full all-excellent templates. Ordinary NPCs must not be strong in all 5 attributes unless they are key NPCs, main-story core NPCs, special rivals/bosses/hidden NPCs, or have Legendary/Mythic talents.
- Identity setup supports random identity or limited custom identity. Custom identity allows only name and gender; AI generates background, personality, family, social position, and starting context from the world, attributes, and talents.
- Birth identity is determined by world + Family Background + talents, with attributes refining details. Legendary and Mythic talents can forcibly alter identity when their effects justify it.
- Core run flow: choose world, random/choose identity, draw talents, allocate attributes, simulate from birth, let AI pace yearly or multi-year events, let the player choose or freely input actions, validate AI consequences, and produce a final ending.
- AI-generated content must be constrained by structured rules and validated before changing authoritative game state.
- AI event generation uses the protocol in `docs/ai-output-protocol.md`. AI responses are proposals; the engine must validate parsed JSON and state patches before applying them to a run.

## Collaboration Rule

When the user is still defining the game, ask focused questions and keep refining the eventual AI development prompt. Prefer one important question at a time unless the user asks for a full questionnaire.
