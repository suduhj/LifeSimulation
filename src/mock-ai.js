import { selectEventGenerationContext } from "./event-source-selector.js";
import { isNpcHiddenFromOpening, visibleNpcLabel } from "./localization.js";

export function generateMockLifeEvent({ run, worlds, seed = 1, eventContract } = {}) {
  const world = worlds?.[run?.worldId];
  if (!world) {
    throw new Error(`Unknown worldId for run: ${run?.worldId}`);
  }

  const generationContext = selectEventGenerationContext({ world, run, seed });
  const eventSeed = generationContext.selectedSeeds[0] ?? buildSyntheticEventSeed(generationContext.sourceType, world);
  const turnId = `turn_${run.eventHistory.length + 1}`;
  const yearsElapsed = chooseYearsElapsed(run, seed);
  const nextAge = run.player.age + yearsElapsed;
  const progressTarget = pickProgressTarget(world);
  const currentProgress = run.worldState.progress?.[progressTarget] ?? 0;

  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId,
    timeSpan: {
      ageStart: run.player.age,
      ageEnd: nextAge,
      yearsElapsed,
      pace: yearsElapsed <= 1 ? "scene_or_short_stage" : "life_stage",
      paceReasonKey: "mvp.mock.continuous_life_journal",
    },
    selectedSeeds: [
      {
        poolType: "event_seed",
        seedId: eventSeed.id,
        adaptationRole: "primary",
        strictness: eventSeed.strictness ?? generationContext.seedStrictness,
        aiAdaptation: eventSeed.aiAdaptation ?? generationContext.aiAdaptation,
        eventSource: generationContext.sourceType,
      },
    ],
    interactionMode: "playable_choices",
    engineCheck: {
      providedByEngine: true,
      checkResult: "not_applicable",
      riskLevel: eventSeed.riskLevel,
      difficultyLabel: "offline_mock",
    },
    playerText: {
      title: buildMockTitle(world.id, nextAge),
      body: buildMockBody(world.id, run, eventSeed, generationContext, nextAge, eventContract),
      visibleChanges: [`${progressLabel(progressTarget)} +1`],
      worldProgressSummary: [`${progressLabel(progressTarget)} 开始变化。`],
      relationshipSummary: [],
    },
    event: {
      eventId: `mock_${eventSeed.id}`,
      lifeStage: run.player.lifeStage,
      riskLabel: eventSeed.riskLevel,
      summaryTags: eventSeed.sceneTags.slice(0, 4),
      sourceType: generationContext.sourceType,
    },
    choices: buildChoices(world.id, eventContract),
    freeform: {
      allowed: true,
      clarificationNeeded: false,
      riskBand: eventSeed.riskLevel,
      fuzzySuccessLabel: "结果难以预料",
      judgmentFactors: ["attributes", "talents", "age", "world_rules", "relationships", "randomness"],
    },
    visibleChanges: [
      {
        type: "progression",
        target: progressTarget,
        amount: 1,
        currentValue: currentProgress + 1,
        source: eventSeed.id,
        duration: "permanent",
        text: `${progressLabel(progressTarget)} +1`,
      },
    ],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [
        {
          target: progressTarget,
          amount: 1,
          source: eventSeed.id,
        },
      ],
      worldStateChanges: [],
      memoryUpdates: [
        {
          type: "event",
          text: `Mock event generated from ${generationContext.sourceType}:${eventSeed.id}.`,
        },
      ],
      growthEvidenceChanges: [],
      scoreDelta: 0,
    },
    internal: {
      judgmentSummary: `Mock AI used ${generationContext.sourceType}:${eventSeed.id} for ${run.worldId}. ${generationContext.sourceInstruction}`,
      validationFlags: ["mock_ai", "engine_owned_state"],
      hiddenStateNotes: "No hidden state revealed in playerText.",
    },
  };
}

function pickProgressTarget(world) {
  if (world.id === "cthulhu") return "truth_exposure";
  if (world.id === "wasteland") return "survival_days";
  return "cultivation_foundation";
}

function buildMockTitle(worldId, age) {
  const prefix = `${age} 岁：`;
  if (worldId === "cthulhu") return `${prefix}街角封条与低声争执`;
  if (worldId === "wasteland") return `${prefix}分水争执与脚印`;
  return `${prefix}山林边的异样`;
}

function buildMockBody(worldId, run, eventSeed, generationContext, nextAge, eventContract) {
  const name = run.player.name;
  const sourceText = sourceTypeLabel(generationContext.sourceType);
  // Inject only real lived narrative memory. Skip the run_started seed placeholder and any
  // English/bookkeeping entries, and strip trailing periods so the sentence does not double up.
  const recentMemory = (run.memory ?? [])
    .filter((item) => item?.type !== "run_started" && item?.text && !/[A-Za-z]{4,}/.test(item.text))
    .slice(-2)
    .map((item) => item.text.replace(/[。.\s]+$/, ""))
    .filter(Boolean)
    .join("；");
  const memoryLine = recentMemory
    ? `此前留下的经历仍在影响你：${recentMemory.slice(0, 120)}。`
    : "此前几年形成的家庭态度、天赋迹象和周围人的反应，终于把你推到一个需要表态的小路口。";
  // Context-aware fallback: when this mock fires mid-run (after AI retries are exhausted), weave
  // in a recently known person so it does not feel like a disconnected generic scene. Reuse the
  // visible-NPC localization so hidden/undiscovered NPCs never leak into player text.
  const companionLabel = recentVisibleNpcLabel(run);
  const companionLine = companionLabel ? `${companionLabel}仍和你在一起，让这段日子不算孤单。` : "";
  const theme = eventTheme(eventSeed, generationContext);
  if (eventContract?.annualFactPackage?.primaryDelta?.eventShape === "institution_arrival_changes_life") {
    const requiredHumanDelta = eventContract.annualFactPackage.requiredHumanDelta
      ? `今年的人生主事是：${eventContract.annualFactPackage.requiredHumanDelta}。`
      : "";
    return `${name}这一年不再只是被后山的牵引困住。${memoryLine}${companionLine}${requiredHumanDelta}春末，碧云宗终于派来一名外门弟子到青石村。他带着宗门令牌和搜山符，要查清后山灵兽的传闻，也顺口问起当年灵根检测后被搁置的外门选拔。你想起那只灵兽脖子上的断裂符文铁环，心里隐约觉得它和玉简、宗门令牌之间有某种关联。父亲下意识把你挡在身后，母亲则攥紧袖口，不愿让宗门知道你曾接触过玉简和那只灵兽。村民围在老槐树下七嘴八舌，既盼着宗门解决危险，又害怕自家被牵连。你能感觉到，玉简、灵兽和选拔这三件事终于压到同一个时刻：今年真正改变你生活的，是宗门的人已经站到了你家门前，你必须决定自己要隐瞒、试探，还是让父母陪你说出一部分真相。`;
  }
  if (eventContract?.annualFactPackage?.primaryDelta) {
    return buildAnnualMockBody({ name, memoryLine, companionLine, eventContract });
  }
  if (eventContract?.threadId === "jade_talisman") {
    return `${name}已经站在上一次选择留下的余波里。${memoryLine}${companionLine}玉片已被父亲收起，家里却因此更不安稳。父亲说那东西不该再被外人看见，母亲则反复叮嘱你别靠近后山，像是怕那条路把你带到她无法保护的地方。可越是被拦着，你越能在夜深或风起时感到后山方向仍有一丝牵引，仿佛那枚灵引符只是把门缝推开了一点。眼下真正压到你面前的，不再是要不要碰那枚玉片，而是你要怎样面对家人的阻拦、自己的好奇，以及修仙之路已经投下的影子。`;
  }
  if (worldId === "cthulhu") {
    return `${name}已经有了自己的日常节奏，家庭和学校仍试图把一切维持在正常生活里。${memoryLine}${companionLine}这天，家人带你经过一处熟悉的街角，原本该开着灯的店面却贴上了临时封条，门口有人低声争执，又很快被巡逻人员劝散。母亲把你往身后拉，父亲则低声提醒你不要盯着封条看太久。围绕「${theme}」的细小裂痕从日常里露出来：它还不足以证明异常真相，却足够让敏感的人记住，也让你必须决定是继续装作普通，还是用孩子能做到的方式留意这些不协调。`;
  }
  if (worldId === "wasteland") {
    return `${name}已经明白，废土里的每一次安稳都要付出代价。${memoryLine}${companionLine}清晨分水时，营地边缘传来争吵，照顾你的人把你拉到身后，几个大人围着损坏的水桶和新发现的脚印压低声音。母亲担心你靠近会被迁怒，守卫却说孩子有时能注意到大人忽略的细节。围绕「${theme}」的压力落到营地和家人身上，不是天崩地裂的大事，却会改变你接下来能接触到的人、资源和危险。`;
  }
  return `${name}已经站在早年经历铺出的路口前。${memoryLine}${companionLine}这天你随家人到村边山林取柴，风从竹叶间穿过去，草丛里露出一枚暗红色的小珠。母亲先看见它，脸色变了一下，低声让你不要乱碰；父亲却听见林外传来脚步声，担心有人也冲着这东西而来。你心里隐约明白，这枚小珠和林外的动静都不寻常：是叫住身边的大人、自己先凑近看看那枚小珠，还是先留意林外是谁在靠近，得由你来定。`;
}

// Most-recently-known player-visible NPC label, or "" when none is safely shown. Hidden NPCs that
// the player has not discovered are skipped so the fallback never leaks backstage identities.
function recentVisibleNpcLabel(run) {
  const npcs = run?.importantNPCs ?? [];
  for (let index = npcs.length - 1; index >= 0; index -= 1) {
    const npc = npcs[index];
    if (isNpcHiddenFromOpening(npc) && npc?.playerVisible?.discovered !== true) continue;
    const label = visibleNpcLabel(npc);
    if (label) return label;
  }
  return "";
}

function chooseYearsElapsed(run, seed) {
  const age = Number(run?.player?.age ?? 0);
  const hasOnlyOpeningHistory = (run?.eventHistory ?? []).length === 1 && run.eventHistory[0]?.event?.sourceType === "opening_sequence";
  if (hasOnlyOpeningHistory) return 0;
  if (age < 6) return 1;
  return 1 + (Math.abs(Number(seed) || 0) % 2);
}

function buildSyntheticEventSeed(sourceType, world) {
  return {
    id: `generated_${sourceType}`,
    lifeStages: ["birth", "childhood", "adolescence", "youth", "adulthood", "middleAge", "oldAge"],
    sceneTags: [sourceType, "generated_event"],
    riskLevel: sourceType === "random_disturbance" || sourceType === "world_progress" ? "medium" : "low",
    possibleEffects: ["memory_update", "relationship_change", "world_progress_change"],
    aiUseRuleKey: `${world.id}.event.generated_${sourceType}`,
    strictness: "soft",
    aiAdaptation: "must_adapt",
  };
}

function sourceTypeLabel(sourceType) {
  return {
    seed_pool: "素材种子事件",
    ai_free: "AI 自由生成事件",
    player_consequence: "玩家行为后果事件",
    npc_driven: "重要人物驱动事件",
    world_progress: "世界进度事件",
    natural_life: "生活自然事件",
    random_disturbance: "随机扰动事件",
  }[sourceType] ?? "人生变化";
}

function buildChoices(worldId, eventContract) {
  if (eventContract?.annualFactPackage?.primaryDelta?.eventShape === "institution_arrival_changes_life") {
    return [
      {
        id: "choice_1",
        text: "先听从父亲的安排，不主动提玉简和灵兽，只观察这名碧云宗外门弟子如何询问村民、如何搜山。",
        intentTags: ["institution", "observe", "restraint"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "找机会试探那名外门弟子，问他是否知道断裂符文铁环和后山灵兽的来历，但不一次说出全部秘密。",
        intentTags: ["institution", "partial_disclosure", "spirit_beast"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "请求父亲陪你一起说明玉简、阵纹和灵兽共鸣的事，至少不要让宗门单独决定那只灵兽的生死。",
        intentTags: ["family", "negotiate", "truth"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
    ];
  }
  if (eventContract?.annualFactPackage?.primaryDelta) {
    return buildAnnualChoices(worldId, eventContract.annualFactPackage);
  }
  if (eventContract?.threadId === "jade_talisman") {
    return [
      {
        id: "choice_1",
        text: "暂时听从父母的限制，把玉片和后山的事放在心里，先观察家中态度会不会松动。",
        intentTags: ["family", "restraint", "jade_talisman"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "不直接违背家人，只在日常里暗中留意后山方向的异常感应，记录它何时变强。",
        intentTags: ["observe", "mountain_pull", "jade_talisman"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "找父亲单独谈一次，试着问清他当年为何接触过修仙者，以及为什么如此戒备。",
        intentTags: ["family", "negotiate", "jade_talisman"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
    ];
  }
  if (worldId === "cthulhu") {
    return [
      {
        id: "choice_1",
        text: "让家人继续按普通生活照顾你，尽量不追问那些不协调的细节。",
        intentTags: ["ordinary_life", "avoidance"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "在能表达情绪时对异常表现出好奇，吸引家人和周围人的注意。",
        intentTags: ["curiosity", "truth"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "本能地回避让你不舒服的人和地点，把危险留给以后再理解。",
        intentTags: ["caution", "survival"],
        fuzzySuccessLabel: "风险不低",
        riskLabel: "medium",
      },
    ];
  }

  if (worldId === "wasteland") {
    return [
      {
        id: "choice_1",
        text: "依赖家人和营地的保护，优先保持健康和安全。",
        intentTags: ["family", "survival"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "更频繁地观察营地里的物资分配和人际冲突，积累早期记忆。",
        intentTags: ["observation", "camp"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "跟随照顾者接近营地边缘，提前接触废土环境的危险气息。",
        intentTags: ["exploration", "danger"],
        fuzzySuccessLabel: "风险不低",
        riskLabel: "medium",
      },
    ];
  }

  return [
    {
      id: "choice_1",
      text: "先靠近照看你的大人，把看到的异物和林外脚步告诉对方，让家人判断该不该声张。",
      intentTags: ["ordinary_life", "family"],
      fuzzySuccessLabel: "难度较低",
      riskLabel: "low",
    },
    {
      id: "choice_2",
      text: "小心把注意力放在那枚暗红小珠上，不急着触碰，先观察它有没有光泽、温度或奇怪动静。",
      intentTags: ["opportunity", "cultivation_entry"],
      fuzzySuccessLabel: "结果难以判断",
      riskLabel: "medium",
    },
    {
      id: "choice_3",
      text: "转头看向林外的脚步声，试着分辨来的是熟人、路人还是可能与这枚珠子有关的人。",
      intentTags: ["exposure", "attention"],
      fuzzySuccessLabel: "风险不明",
      riskLabel: "medium",
    },
  ];
}

function buildAnnualMockBody({ name, memoryLine, companionLine, eventContract }) {
  const {
    primaryDelta,
    backgroundThreads = [],
    curriculumSlot,
    requiredHumanDelta,
    threeLayerFocus,
  } = eventContract.annualFactPackage;
  const backgroundLine = backgroundThreads.length > 0
    ? "此前留下的线索没有消失，只是退到这年生活变化的背后，像一条没有断开的暗线。"
    : "";
  const domainDetail = {
    family: "父母和家中的安排开始改变你每天能做的事：不是单纯把门锁得更紧，而是给你划出新的责任、学习和行动边界。",
    education: "村塾、先生或长辈给了你新的学习任务，这会改变你接下来能接触到的人、书和消息。",
    social: "村里人的议论变成了真实的相处压力，同龄人、邻里和长辈看你的方式都出现了变化。",
    relationship: "一个已经认识的人不再只是旁观，而是提出帮助、条件或新的界限，让你必须重新判断彼此关系。",
    route: "原本悬而未决的方向被推到眼前，你不能再只把疑问藏在心里，而要开始决定自己往哪条路上靠近。",
    resource: "资源和照护方式发生了新调整，这会影响你能去哪里、能做什么，以及谁会为你承担风险。",
    health: "身体、睡眠或精神状态被大人认真看见，接下来的生活安排因此发生改变。",
    world_pressure: "外部压力进入了普通日子，家人和周围人不得不改变原来的生活节奏。",
    institution: "更大的组织终于压到家门口，此前被拖延的事情必须给出回应。",
  }[primaryDelta.domain] ?? "生活里出现了新的变化，让旧问题不能再按原样重复。";
  const curriculumLine = requiredHumanDelta
    ? `今年的主事先落在人生课程「${curriculumSlot}」上：${requiredHumanDelta}。`
    : "";
  const layerLine = threeLayerFocus?.lifeBase
    ? "修仙或世界异常只能作为味道和背景回响，不能抢走这年生活本身的主位。"
    : "";
  return `${name}这一年真正改变生活的，不是把旧场景再走一遍，而是${primaryDelta.title}。${memoryLine}${companionLine}${curriculumLine}${primaryDelta.description}${domainDetail}${backgroundLine}${layerLine}因为父亲、母亲或身边人已经看见了新的生活变化，眼下的压力变成了一个新的年度岔口：你要怎样适应这项安排、怎样观察旧线索在背后的影响，又要不要把自己的想法说给可信的大人听。`;
}

function buildAnnualChoices(worldId, annualFactPackage) {
  const domain = annualFactPackage.primaryDelta.domain;
  if (domain === "education") {
    return [
      {
        id: "choice_1",
        text: "先按新的学习安排做下去，把每天听到的人名、书本内容和长辈态度都记在心里。",
        intentTags: ["education", "observe", "restraint"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "找机会向先生或长辈请教旧线索相关的字句，但把问题问得像普通功课。",
        intentTags: ["education", "ask", "careful"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "和父母商量这项学习安排到底是保护你，还是在替你选择以后要走的路。",
        intentTags: ["family", "negotiate", "route"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
    ];
  }
  if (domain === "resource" || worldId === "wasteland") {
    return [
      {
        id: "choice_1",
        text: "先服从新的分配和行动范围，观察谁在做决定、谁因此得到或失去照顾。",
        intentTags: ["resource", "observe", "survival"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "主动帮照护者做一件力所能及的小事，换取更多关于营地变化的解释。",
        intentTags: ["relationship", "help", "resource"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "留意资源变化背后的危险来源，判断它只是短缺，还是有人在暗中推动。",
        intentTags: ["world_pressure", "observe", "caution"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
    ];
  }
  if (domain === "social" || worldId === "cthulhu") {
    return [
      {
        id: "choice_1",
        text: "维持普通日常，不主动解释传闻，只观察周围人具体改变了哪些态度。",
        intentTags: ["social", "ordinary_life", "observe"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "找一个相对可信的人单独说话，试探对方到底相信传闻到什么程度。",
        intentTags: ["relationship", "ask", "social"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "顺着这些目光去查传闻源头，但尽量不让自己成为新的谈资。",
        intentTags: ["social", "investigate", "caution"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
    ];
  }
  return [
    {
      id: "choice_1",
      text: "先接受这项新的生活安排，把旧线索暂时放在心里，观察它会带来什么变化。",
      intentTags: [domain, "observe", "restraint"],
      fuzzySuccessLabel: "难度较低",
      riskLabel: "low",
    },
    {
      id: "choice_2",
      text: "找机会从侧面打听这项安排的原因，确认它和此前的暗线有没有关系。",
      intentTags: [domain, "ask", "background_thread"],
      fuzzySuccessLabel: "风险不明",
      riskLabel: "medium",
    },
    {
      id: "choice_3",
      text: "主动和可信的大人谈一谈，请对方告诉你这年真正需要担心的是什么。",
      intentTags: ["relationship", "negotiate", domain],
      fuzzySuccessLabel: "结果难以预料",
      riskLabel: "medium",
    },
  ];
}

function progressLabel(id) {
  return {
    cultivation_foundation: "修炼根基",
    truth_exposure: "真相揭露",
    survival_days: "生存天数",
  }[id] ?? "世界进度";
}

function eventTheme(eventSeed, generationContext) {
  const explicitName = String(eventSeed?.name ?? eventSeed?.title ?? "").trim();
  if (explicitName && !looksLikeInternalId(explicitName)) return explicitName;
  // Player-facing fallback only. Never surface the backend source-type label (素材种子事件 etc.)
  // in player body text; that concept belongs to GM/debug surfaces.
  return "眼前的变化";
}

function looksLikeInternalId(value) {
  return /^[a-z][a-z0-9_-]*$/i.test(String(value ?? "").trim());
}
