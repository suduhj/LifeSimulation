import { identityLabel, isNpcHiddenFromOpening, talentLabel, visibleNpcLabel, visibleTalentName } from "./localization.js";
import { buildOpeningOriginLedger } from "./opening-origin-ledger.js";

const ATTRIBUTE_KEYS = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];

export function generateOpeningSequence({ run, worlds, seed = 1 } = {}) {
  const world = worlds?.[run?.worldId];
  if (!world) throw new Error(`Unknown worldId for opening sequence: ${run?.worldId}`);

  const actionAge = firstActionAge(run);
  const identity = run.setup?.identitySeed;
  const hiddenHooks = buildOpeningHiddenHooks(run, world);
  const originLedger = buildOpeningOriginLedger({ run, worlds, seed, actionAge });
  const earlyLifeTimeline = originLedger.nodes.map((node) => ({
    age: node.age,
    title: node.title,
    body: node.body,
  }));

  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_${run.eventHistory.length + 1}_opening`,
    timeSpan: {
      ageStart: run.player.age,
      ageEnd: actionAge,
      yearsElapsed: actionAge - run.player.age,
      pace: "early_life_auto",
      paceReasonKey: "opening.background_and_early_life",
    },
    selectedSeeds: [
      {
        poolType: "identity_seed",
        seedId: identity?.id ?? "unknown_identity",
        adaptationRole: "birth_background",
        strictness: "soft",
        aiAdaptation: "must_adapt",
      },
    ],
    interactionMode: "non_interactive",
    engineCheck: {
      providedByEngine: true,
      checkResult: "not_applicable",
      riskLevel: "safe",
      difficultyLabel: "opening_sequence",
    },
    playerText: {
      title: "命运预览",
      body: buildFatePreviewDossier({ run, world }),
      visibleChanges: ["命运档案已生成", "开始人生后会从 0 岁进入完整人生时间线"],
      relationshipSummary: [],
      worldProgressSummary: ["身份、身世、家庭背景和天赋风险已形成"],
    },
    event: {
      eventId: "opening_background_and_early_life",
      lifeStage: "childhood",
      riskLabel: "safe",
      summaryTags: ["opening", "background", "early_life_auto"],
      sourceType: "opening_sequence",
    },
    choices: [],
    freeform: {
      allowed: false,
      clarificationNeeded: false,
      riskBand: "none",
      fuzzySuccessLabel: "早年自动推进阶段暂不开放自由行动",
      judgmentFactors: ["world", "identity", "attributes", "talents", "family", "important_npcs"],
    },
    visibleChanges: [
      {
        type: "world_state",
        target: "opening",
        currentValue: "background_generated",
        source: "opening_sequence",
        duration: "permanent",
        text: "身世与早年背景已生成",
      },
      {
        type: "age",
        target: "player.age",
        amount: actionAge - run.player.age,
        currentValue: actionAge,
        source: "opening_sequence",
        duration: "permanent",
        text: `年龄 ${run.player.age} -> ${actionAge}`,
      },
    ],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: buildEarlyManifestationChanges(run, actionAge),
      exposureChanges: [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: [
        { target: "opening.phase", value: "first_branch_ready", source: "opening_sequence" },
        { target: "opening.firstActionAge", value: actionAge, source: "opening_sequence" },
        { target: "opening.hiddenHooks", value: hiddenHooks, source: "opening_sequence" },
        { target: "opening.unresolvedThreads", value: hiddenHooks.map((hook) => hook.playerVisibleThread), source: "opening_sequence" },
        { target: "opening.earlyLifeTimeline", value: earlyLifeTimeline, source: "opening_sequence" },
      ],
      openingOriginLedgers: [originLedger],
      memoryUpdates: [
        {
          type: "opening_sequence",
          text: `Opening background generated at seed ${seed}; first meaningful branch begins around age ${actionAge}.`,
        },
      ],
      growthEvidenceChanges: [],
      scoreDelta: 0,
    },
    internal: {
      judgmentSummary: "Generated spoiler-safe birth preview, backend hidden hooks, early-life timeline, and first-action age before playable choices.",
      validationFlags: ["opening_sequence", "non_interactive", "engine_owned_state"],
      hiddenStateNotes: JSON.stringify({
        rule: "Opening sequence can use hidden identity/NPC context. playerText must not show initial important NPC lists, unresolved details labels, future triggers, or age-by-age early-life progression.",
        hiddenHooks,
        earlyLifeTimeline,
      }),
    },
  };
}

// Backend-built, spoiler-safe fate dossier. Ordinary fate preview must be a static
// dossier derived from structured run data, never raw AI provider prose. Birth events,
// early-life narration, family/NPC detail, talent manifestation, and hidden clues must
// not appear here; they live in opening.earlyLifeTimeline, hiddenHooks, or GM/debug.
export function buildFatePreviewDossier({ run, world } = {}) {
  if (!run || !world) return "";
  const identity = run.setup?.identitySeed;
  return [
    `出生地点：${birthPlace(run, world, identity)}`,
    `出生家庭：${describeFamily(run, world, identity)}`,
    `家境表现：${familyBackgroundText(run)}`,
    `命运预览：${describeDestinyPreview(run, world)}`,
    `当前处境：${initialSituationText(run, world)}`,
  ].join("\n");
}

export function firstActionAge(run) {
  const talentIds = new Set((run.player.talents ?? []).map((talent) => talent.id));
  const hasEarlyConsciousness = [...talentIds].some((id) => /reincarnation|memory|fate|destiny|mythic|dream_walker/.test(id));
  const intelligence = run.player.attributes.intelligence?.potential ?? 4;
  if (hasEarlyConsciousness || intelligence >= 20) return 5;
  return 7;
}

function buildEarlyManifestationChanges(run, actionAge) {
  const ratio = actionAge <= 5 ? 0.24 : 0.34;
  return ATTRIBUTE_KEYS.map((target) => {
    const attribute = run.player.attributes[target];
    const value = target === "familyBackground" ? attribute.potential : Math.max(attribute.manifested, Math.floor(attribute.potential * ratio));
    return {
      target,
      value,
      source: "opening_sequence",
      clampToPotential: true,
    };
  });
}

function birthPlace(run, world, identity) {
  if (world.id === "cultivation") return cultivationBirthPlace(run, identity);
  if (world.id === "wasteland") return wastelandBirthPlace(run, identity);
  return cthulhuBirthPlace(run, identity);
}

function cultivationBirthPlace(run, identity) {
  const family = run.player.attributes.familyBackground?.potential ?? 4;
  if (family >= 12) return "靠近宗门山脉的修真家族宅院";
  if (family >= 7) return "有灵田和行商往来的边境小城";
  return "远离仙门的凡人村镇";
}

function cthulhuBirthPlace(run) {
  const family = run.player.attributes.familyBackground?.potential ?? 4;
  if (family >= 10) return "近现代都市中靠近大学、医院和旧报社的体面街区";
  if (family <= 2) return "传闻很多却没人愿意深谈的旧城区边缘";
  return "表面正常、偶尔流传怪事的现代城市社区";
}

function wastelandBirthPlace(run) {
  const family = run.player.attributes.familyBackground?.potential ?? 4;
  if (family >= 10) return "有武装和净水设备的小型避难所";
  if (family <= 2) return "临时拼成的废土棚屋与流民营边缘";
  return "勉强维持秩序的废土聚落";
}

function describeFamily(run, world, identity) {
  const visible = identity?.playerVisible?.description ?? identityLabel(identity?.id) ?? "普通家庭";
  if (world.id === "cultivation") return `${visible}。家中对仙门传闻既向往又畏惧，但不会轻易把孩子推到风口浪尖。`;
  if (world.id === "wasteland") return `${visible}。活下去比体面更重要，资源决定了亲情能保持多少温度。`;
  return `${visible}。一家人仍按普通社会的方式生活，但会本能避开某些解释不清的新闻和传闻。`;
}

function guardianText(run, world) {
  const family = run.player.attributes.familyBackground?.potential ?? 4;
  if (world.id === "cultivation") {
    if (family <= 3) return "家中长辈靠手艺或农活维持生活，对仙门传闻既敬又怕。";
    if (family >= 10) return "家中长辈能调动宗族、商路或修行资源，也更在意你的天赋是否会带来风波。";
    return "家中长辈能给你稳定照看，但是否让你接近仙门仍需要反复权衡。";
  }
  if (world.id === "wasteland") {
    if (family <= 3) return "监护人只能在资源短缺中尽力护住你，很多选择从出生起就带着生存压力。";
    if (family >= 10) return "监护人掌握一定物资或避难所关系，能保护你，也会把你卷入资源责任。";
    return "监护人在聚落规则下照顾你，亲情和生存利益常常交织。";
  }
  if (family <= 3) return "父母或监护人在普通社会边缘维持生活，遇到怪事时更倾向沉默和回避。";
  if (family >= 10) return "父母或监护人拥有较好的资源与社会关系，能为你遮风挡雨，也更擅长压下异常传闻。";
  return "父母或监护人按普通人的方式照顾你，对异常只保持含糊的警惕。";
}

function familyBackgroundText(run) {
  const value = run.player.attributes.familyBackground?.potential ?? 4;
  if (value <= 1) return "资源极度紧张，很多选择从出生起就被贫困或失序压缩。";
  if (value <= 3) return "家中能维持基本生活，但缺少保护、教育和人脉。";
  if (value <= 6) return "普通但稳定，能给你留下正常成长空间。";
  if (value <= 9) return "家庭资源不错，教育、人脉或安全环境明显优于普通人。";
  if (value <= 12) return "家庭拥有地位、财富或势力背景，你从出生起就被更多人注意。";
  return "出身足以改变命运开局，也会把权力、期待和风险一起带来。";
}

function describeTalentManifestation(run, world) {
  const talents = run.player.talents ?? [];
  if (talents.length === 0) return "暂时没有显眼天赋，命运更像一张还没写字的纸。";
  return talents
    .map((talent) => {
      const name = talentName(talent, world);
      return name ? `${rarityText(talent.rarity)}天赋「${name}」以${manifestationText(talent.manifestationType)}的方式留下早期痕迹` : "";
    })
    .filter(Boolean)
    .join("；") || "天赋迹象仍很模糊，命运更像一张还没写字的纸。";
}

function describeDestinyPreview(run, world) {
  const talents = run.player.talents ?? [];
  if (world.id === "cultivation") return cultivationDestinyPreview(run, world, talents);
  if (world.id === "wasteland") return wastelandDestinyPreview(run, world, talents);
  return cthulhuDestinyPreview(run, world, talents);
}

function cultivationDestinyPreview(run, world, talents) {
  const fragments = [];
  const spiritTalent = talents.find((talent) => hasTag(talent, "spirit_root") || /spirit_root|root|linggen|dao_body|spirit_embryo/.test(talent.id));
  const swordTalent = talents.find((talent) => hasTag(talent, "sword") || /sword|blade/.test(talent.id));
  const craftTalent = talents.find((talent) => hasTag(talent, "alchemy") || hasTag(talent, "herb") || /alchemy|herb|craft|artisan|steady_hand/.test(talent.id));
  const destinyTalent = talents.find((talent) => hasTag(talent, "destiny") || hasTag(talent, "luck") || talent.manifestationType === "hidden_destiny");

  if (spiritTalent) {
    const name = talentName(spiritTalent, world);
    const rarity = rarityText(spiritTalent.rarity);
    fragments.push(`你天生拥有${rarity === "普通" ? "可被仙门评估的" : `极其罕见的${rarity}`}资质「${name}」，这可能是踏入仙途的门槛。但这份天赋既是恩赐也是风险，若被大势力知晓，你可能被保护、争夺、利用，若一直隐忍不发，也可能埋没于凡尘。`);
  }
  if (swordTalent) fragments.push("你似乎对剑与锋芒有天然亲和，手很稳，面对细小变化时比同龄人更容易保持专注。");
  if (craftTalent) fragments.push("你对药草、火候、器物或手工细节格外敏感，这种细致可能让你走向不只一种修行路线。");
  if (!spiritTalent && destinyTalent) fragments.push("你的命格并不张扬，却总在关键处留下偏转；好事和麻烦都可能更容易找到你。");
  if (fragments.length === 0) fragments.push("你的天赋尚未显得惊世骇俗，但命运的重量已经压在根骨、悟性、出身和气运之间。");
  return fragments.join(" ");
}

function cthulhuDestinyPreview(run, world, talents) {
  const fragments = [];
  const dreamTalent = talents.find((talent) => hasTag(talent, "dream") || hasTag(talent, "truth") || /dream|truth|omen|memory/.test(talent.id));
  const destinyTalent = talents.find((talent) => hasTag(talent, "destiny") || hasTag(talent, "luck") || talent.manifestationType === "hidden_destiny");
  const charmTalent = talents.find((talent) => hasTag(talent, "appearance") || hasTag(talent, "social") || /smile|voice|beauty|charm/.test(talent.id));

  if (dreamTalent) fragments.push(`你对梦境、记忆和日常细节中的错位更敏感，这能让你察觉被多数人忽略的痕迹，也意味着你更容易靠近危险真相。`);
  if (destinyTalent) fragments.push("你的命运常在危机边缘出现转机，但转机不等于安全，它也可能把你推向更深的事件中心。");
  if (charmTalent) fragments.push("你更容易获得他人的善意或关注，这在普通生活里是保护，在异常事件里也可能变成被盯上的理由。");
  if (fragments.length === 0) fragments.push("你出生在表面正常的社会里，天赋暂时只像性格、直觉和反应速度的差异，不会立刻解释世界底层的黑暗。");
  return fragments.join(" ");
}

function wastelandDestinyPreview(run, world, talents) {
  const fragments = [];
  const survivalTalent = talents.find((talent) => hasTag(talent, "survival") || hasTag(talent, "wasteland") || /survival|scavenger|water|radiation|mutation/.test(talent.id));
  const bodyTalent = talents.find((talent) => hasTag(talent, "constitution") || /body|tough|blood|mutation/.test(talent.id));
  const destinyTalent = talents.find((talent) => hasTag(talent, "destiny") || hasTag(talent, "luck") || talent.manifestationType === "hidden_destiny");

  if (survivalTalent) fragments.push("你天生更能适应废土的资源压力和危险气味，能从细小痕迹里判断水、食物、脚步和交易是否可靠。");
  if (bodyTalent) fragments.push("你的身体底子或恢复倾向异于常人，这在废土是活下去的本钱，也可能被别人视作可交换的资源。");
  if (destinyTalent) fragments.push("你的命运像总能在废墟缝隙中找到路，但每一次转机都可能伴随更高代价。");
  if (fragments.length === 0) fragments.push("你的出生没有把你直接推上废土传奇的位置，但属性、家境和性格已经决定了你能承受多少饥饿、恐惧与背叛。");
  return fragments.join(" ");
}

function hasTag(talent, tag) {
  return (talent.tags ?? []).includes(tag);
}

function talentName(talent, world) {
  const sourceTalent = world?.talentPool?.talents?.find((item) => item.id === talent.id);
  return visibleTalentName(sourceTalent) || visibleTalentName(talent) || talentLabel(talent.id);
}

function outsideReactionText(run, world) {
  const exposure = Math.max(...ATTRIBUTE_KEYS.map((key) => run.player.attributes[key]?.exposure ?? 0));
  if (exposure >= 70) {
    if (world.id === "cultivation") return "家族和附近修士都可能意识到你不寻常，保护与觊觎会同时出现。";
    if (world.id === "wasteland") return "营地里的人会把异常当成资源、危险或交易筹码。";
    return "家人与医生会试图用现实语言解释异常，官方或异常组织也可能留下记录。";
  }
  if (exposure >= 30) return "亲近的人觉得你有些特别，但还不足以让外界立刻定性。";
  return "大多数人只把你当成略有特点的孩子，真正的潜力仍藏在命运深处。";
}

function describeWorldBirthContext(run, world) {
  if (world.id === "cultivation") return "仙凡有别，灵根、宗门和家族出身会决定一个孩子能否踏上修行路。";
  if (world.id === "wasteland") return "旧世界已经破碎，水、药、武器和可信任的人比道理更珍贵。";
  return "社会表面正常，怪事常被解释成疾病、事故、犯罪、谣言或精神问题，真相被更深地压住。";
}

function describeInitialNpcs(run) {
  const npcs = openingVisibleNpcs(run);
  if (npcs.length === 0) return "暂无重要NPC。";
  return npcs.slice(0, 5).map((npc) => `${visibleNpcLabel(npc)}（关系：${relationshipHint(npc)}）`).join("；");
}

function openingVisibleNpcs(run) {
  return (run.importantNPCs ?? []).filter((npc) => !isNpcHiddenFromOpening(npc));
}

function initialSituationText(run, world) {
  if (world.id === "cultivation") return "你尚未真正接触修行，命运仍停在家庭、出身、资质与风险之间。";
  if (world.id === "wasteland") return "你还不能独自求生，开局处境由资源、监护、身体底子与聚落规则共同决定。";
  return "你还不知道世界底层有什么，开局仍被普通家庭、日常社会和隐约异常共同包围。";
}

function describeUnexplainedDetail(run, world) {
  const strongest = ATTRIBUTE_KEYS
    .map((key) => [key, run.player.attributes[key]?.potential ?? 0])
    .sort((left, right) => right[1] - left[1])[0]?.[0];
  if (world.id === "cultivation") {
    if (strongest === "familyBackground") return "家中有一件被长辈收得很深的旧物，每次提起仙门，屋里都会短暂安静。";
    if (strongest === "luck") return "你出生那夜山外有异光掠过，村里老人只说那不是普通雷火。";
    if (strongest === "constitution") return "你偶尔握住粗糙符纸时，纸边会微微发热，家人却只说是错觉。";
    return "偶尔有路过修士多看你一眼，却又像不愿多事般匆匆离开。";
  }
  if (world.id === "wasteland") {
    if (strongest === "familyBackground") return "监护人藏着一枚旧世界身份牌，只有在夜里清点物资时才会取出来看。";
    if (strongest === "luck") return "几次危险靠近营地时，你总会先听见别人忽略的细小金属声。";
    if (strongest === "constitution") return "医生给你量体温时停顿了一下，随后把记录页撕下来换了一张。";
    return "营地里有些人提到你的名字时会压低声音，像是在衡量一件还没定价的东西。";
  }
  if (strongest === "familyBackground") return "家里有一只从不上锁却没人愿意打开的旧抽屉，里面偶尔传出纸张摩擦声。";
  if (strongest === "luck") return "你总会在怪事发生前几天做同一个梦，但醒来后只记得潮湿的街灯。";
  if (strongest === "intelligence") return "你太早学会分辨大人说谎时的停顿，也太早发现某些新闻第二天会消失。";
  return "某次体检后，医生把父母叫到走廊尽头说了很久，回来时他们只说一切正常。";
}

function buildOpeningHiddenHooks(run, world) {
  const strongest = ATTRIBUTE_KEYS
    .map((key) => [key, run.player.attributes[key]?.potential ?? 0])
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? "luck";
  const firstNpc = run.importantNPCs?.[0]?.id ?? "initial_guardian";
  const worldHook = {
    cultivation: {
      hookId: "opening_unexplained_cultivation_anchor",
      playerVisibleThread: "家中旧物、路过修士或灵气反应仍未解释。",
      hiddenTrigger: "Can later connect to spirit-root testing, wandering cultivator attention, sect recruitment, or family/clan secrets.",
    },
    cthulhu: {
      hookId: "opening_unexplained_cthulhu_anchor",
      playerVisibleThread: "被删掉的新闻、重复梦境或家庭回避仍未解释。",
      hiddenTrigger: "Can later connect to official attention, dream contamination, occult family history, or hidden-city truth exposure.",
    },
    wasteland: {
      hookId: "opening_unexplained_wasteland_anchor",
      playerVisibleThread: "旧世界物品、体检异常或营地低语仍未解释。",
      hiddenTrigger: "Can later connect to shelter inheritance, old-world facility access, mutation adaptation, or faction leverage.",
    },
  }[world.id] ?? {
    hookId: "opening_unexplained_world_anchor",
    playerVisibleThread: "出生时留下的异常细节仍未解释。",
    hiddenTrigger: "Can later connect to world-specific hidden routes.",
  };

  return [
    {
      ...worldHook,
      strongestAttribute: strongest,
      relatedNpcId: firstNpc,
      visibility: "gm_only",
    },
  ];
}

function buildEarlyLifeTimeline(run, world, actionAge) {
  return Array.from({ length: Math.max(0, actionAge) }, (_, age) => ({
    age,
    title: `${age} 岁：${earlyLifeTitleForAge(age, actionAge)}`,
    body: earlyLifeBodyForAge(run, world, age, actionAge),
  }));
}

function earlyLifeTitleForAge(age, actionAge) {
  if (age === 0) return "出生底色";
  if (age === 1) return "依附与感知";
  if (age === 2) return "牙牙学语";
  if (age === 3) return "好奇初醒";
  if (age === 4) return "家庭边界";
  if (age === 5) return "性格成形";
  if (age === actionAge - 1) return "岔路前夜";
  return "缓慢成长";
}

function earlyLifeBodyForAge(run, world, age, actionAge) {
  if (age === 0) return birthStageText(run, world);
  if (world.id === "cultivation") return cultivationEarlyLifeBody(run, age, actionAge);
  if (world.id === "wasteland") return wastelandEarlyLifeBody(run, age, actionAge);
  return cthulhuEarlyLifeBody(run, age, actionAge);
}

function birthStageText(run, world) {
  const talentText = describeTalentManifestation(run, world);
  if (world.id === "cultivation") {
    return `你出生时还只是襁褓中的孩子，家人能看见的不是完整天赋，而是气息、体温、哭声和周围灵气的细小异样。${talentText}。长辈没有把这些当成定论，只在照看你时更加谨慎。`;
  }
  if (world.id === "wasteland") {
    return `你出生在资源紧张的环境里，最先决定命运的不是远大理想，而是水、药、暖处和监护人的判断。${talentText}。大人只把这些当成活下去的好兆头，暂时没人敢声张。`;
  }
  return `你出生在表面正常的城市生活里，医院、街区和家庭仍按普通逻辑运转。${talentText}。这些迹象没有立刻改变生活，只让家人多了几分无法说清的警惕。`;
}

function cultivationEarlyLifeBody(run, age, actionAge) {
  if (age === 1) return "你开始认得家人的声音，也会被山风、符纸味和香火气吸引。大人只把这些当成孩子的敏感，没有让你接近真正的修行物。";
  if (age === 2) return "你能说出简单词句，常在大人提到仙门时安静下来。家里仍把你当作幼童照看，不会让你承担超出身体的事。";
  if (age === 3) return "你能稳稳走跑，也开始模仿长辈摆弄木枝、石子和草药。偶尔出现的专注只像小孩子的偏好，还不足以证明什么。";
  if (age === 4) return "你听得懂更多家中谈话，知道仙门既让人向往，也让人害怕。家人开始避开某些话题，免得你把不能说的事讲给外人。";
  if (age === 5) return "你能帮家里做一些轻巧杂事，也会在玩耍中显出更稳的手、更快的理解或更好的运气。天赋仍是苗头，不是可以随意使用的力量。";
  if (age >= actionAge - 1) return "你已经能理解家人的犹豫：平安留在凡尘，或冒险靠近仙门，都不再只是大人的闲谈。第一道真正需要表态的岔路正在靠近。";
  return "你的生活仍以家庭、村镇和简单学习为主。偶尔出现的异样会被家人压下，变成日常里不被外人知道的小心。";
}

function cthulhuEarlyLifeBody(run, age, actionAge) {
  if (age === 1) return "你开始认得熟悉的人声和房间气味。家人仍用普通生活照顾你，只在新闻或怪谈出现时悄悄换台。";
  if (age === 2) return "你会说简单的话，也会对某些声音、梦和陌生人的视线表现出异常安静。大人把这解释成敏感，没有让你接触更多信息。";
  if (age === 3) return "你开始在家中探索，记住一些大人以为你听不懂的停顿。世界仍像正常城市，只是偶尔有些话题会突然中断。";
  if (age === 4) return "你能分辨亲近的人何时紧张，也开始对反复出现的梦或新闻片段产生印象。家人仍希望你像普通孩子一样长大。";
  if (age === 5) return "你逐渐能把细节连起来，却还没有能力独自追查。普通生活仍能继续，异常只像影子一样贴在日常边缘。";
  if (age >= actionAge - 1) return "你已经能理解一些回避和谎言，也第一次意识到自己可以选择靠近、远离，或假装什么都没有发生。";
  return "你的生活大多仍是家庭、邻里和日常照看。某些不协调的细节被大人压低声音处理，没有成为公开秘密。";
}

function wastelandEarlyLifeBody(run, age, actionAge) {
  if (age === 1) return "你开始认得监护人的脚步和水袋碰撞声。废土没有给孩子太多浪漫，温暖、干净和安静已经是难得的保护。";
  if (age === 2) return "你会说一些简单词句，也学会在大人紧张时保持安静。食物、药和安全角落比玩具更常出现在你的生活里。";
  if (age === 3) return "你能在营地边缘走动，开始分辨熟人和陌生队伍。大人不会让你靠近危险，只让你记住几条最基本的规矩。";
  if (age === 4) return "你开始理解资源为什么会让人争吵，也知道某些门、箱子和武器不能随便碰。生存规则比道理更早进入你的生活。";
  if (age === 5) return "你能做一些轻巧活计，也会用自己的方式观察水、食物和人群的变化。能力仍很稚嫩，却已经影响大人如何安排你。";
  if (age >= actionAge - 1) return "你逐渐明白废土上的选择很少完全安全。留在保护里、学习求生，或接近某个机会，都将成为真正的分岔。";
  return "你的成长被营地秩序和资源压力塑造。多数日子没有大事，却都在教你分辨危险和依靠。";
}

function describeEarlyYears(run, world, actionAge) {
  if (world.id === "cultivation") {
    return `0到${actionAge}岁之间，你在家人的保护和试探中长大。某些长辈发现你对灵气、符纸或山林气息有异于同龄人的反应，却不敢轻易声张。几年里，家中对“要不要让你接近仙门”的争论越来越多，而你也逐渐明白，离家求道和平安长大从来不是同一条路。`;
  }
  if (world.id === "wasteland") {
    return `0到${actionAge}岁之间，你先学会分辨水的味道、脚步声的远近和大人沉默时的危险。你不是每天都经历大事，但每一次口粮分配、每一次沙暴封门、每一次陌生队伍靠近，都在教你废土的规矩：活着需要依靠，也需要判断。`;
  }
  return `0到${actionAge}岁之间，你的生活大多数时候仍像普通孩子：家人照顾你，邻里谈论新闻，学校和医院的名字偶尔出现在大人的对话里。可某些细节一直不协调：被迅速删除的怪谈、反复出现的梦、家人突然压低的声音，以及某个陌生人似乎过早注意到了你。`;
}

function relationshipHint(npc) {
  const relationship = npc.relationship ?? {};
  const trust = relationship.trust ?? 0;
  const affinity = relationship.affinity ?? 0;
  if (trust + affinity >= 20) return "亲近";
  if (trust + affinity >= 5) return "熟悉";
  if ((relationship.fear ?? 0) > 10) return "畏惧";
  return "初识";
}

function rarityText(rarity) {
  return {
    common: "普通",
    fine: "精良",
    rare: "稀有",
    epic: "史诗",
    legendary: "传说",
    mythic: "神话",
  }[rarity] ?? rarity;
}

function manifestationText(type) {
  return {
    immediate: "立即显化",
    stage: "阶段显化",
    conditional: "条件觉醒",
    hidden_destiny: "隐藏命格",
  }[type] ?? type;
}
