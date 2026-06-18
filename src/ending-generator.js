import { talentLabel, visibleNpcLabel } from "./localization.js";

export function shouldTriggerMvpEnding(run, { endingAge = 6 } = {}) {
  return Number.isFinite(endingAge) && run.player.age >= endingAge && !run.ending;
}

export function generateMvpEndingSummary({ run, worlds, seed = 1, endingAge = 6 } = {}) {
  const world = worlds?.[run?.worldId];
  if (!world) {
    throw new Error(`Unknown worldId for ending: ${run?.worldId}`);
  }

  const endingSeed = pickEndingSeed(run, world);
  const score = calculateMvpScore(run, endingSeed);
  const endingTags = [...new Set([...(endingSeed.tags ?? []), ...deriveRunTags(run)])];
  const endingType = classifyEndingType(endingTags);
  const endingName = localizeEndingName(endingSeed.id, endingSeed.name);

  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "ending_summary",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_${run.eventHistory.length + 1}`,
    timeSpan: {
      ageStart: run.player.age,
      ageEnd: run.player.age,
      yearsElapsed: 0,
      pace: "single_event",
      paceReasonKey: "mvp.ending_check",
    },
    selectedSeeds: [
      {
        poolType: "ending_seed",
        seedId: endingSeed.id,
        adaptationRole: "primary",
      },
    ],
    interactionMode: "ending",
    engineCheck: {
      providedByEngine: true,
      checkResult: "not_applicable",
      riskLevel: "safe",
      difficultyLabel: `MVP ending check at age ${endingAge}`,
    },
    playerText: {
      title: `结局：${endingName}`,
      body: buildEndingBiography(run, world, endingSeed, score),
      visibleChanges: [`总评 ${score}`, `结局类型：${endingTypeLabel(endingType)}`],
      relationshipSummary: buildRelationshipSummary(run),
      worldProgressSummary: buildWorldProgressSummary(run),
    },
    event: {
      eventId: `ending_${endingSeed.id}`,
      lifeStage: run.player.lifeStage,
      riskLabel: "safe",
      summaryTags: endingTags,
    },
    choices: [],
    freeform: {
      allowed: false,
      clarificationNeeded: false,
      riskBand: "safe",
      fuzzySuccessLabel: "人生已经结算",
      judgmentFactors: ["age", "world_progress", "attributes", "relationships", "score"],
    },
    visibleChanges: [
      {
        type: "score",
        target: "final_score",
        amount: score,
        currentValue: score,
        source: "mvp_ending",
        duration: "permanent",
        text: `总评 ${score}`,
      },
      {
        type: "world_state",
        target: "ending",
        source: endingSeed.id,
        duration: "permanent",
        text: `达成结局：${endingName}`,
      },
    ],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: [
        {
          target: "ending",
          value: {
            id: endingSeed.id,
            name: endingName,
            type: endingType,
            tags: endingTags,
            score,
            age: run.player.age,
            completed: true,
            seed,
          },
          source: "mvp_ending",
        },
      ],
      memoryUpdates: [
        {
          type: "ending_summary",
          text: `Ended with ${endingSeed.id}, score ${score}.`,
        },
      ],
      scoreDelta: score,
    },
    internal: {
      judgmentSummary: `MVP ending ${endingSeed.id} generated from world progress and run summary.`,
      validationFlags: ["mock_ai", "ending_summary", "mvp_ending"],
      hiddenStateNotes: "Ending summary does not reveal undiscovered hidden NPC secrets.",
    },
  };
}

function pickEndingSeed(run, world) {
  const endings = world.endings?.endings ?? [];
  if (endings.length === 0) {
    throw new Error(`World ${world.id} has no endings`);
  }

  if (world.id === "cthulhu") {
    const truth = run.worldState.progress.truth_exposure ?? 0;
    const normalcy = run.worldState.progress.social_normalcy ?? 0;
    if (truth >= 5) return endings.find((ending) => ending.id === "entity_killer") ?? endings[0];
    if (normalcy <= -3) return endings.find((ending) => ending.id === "cthulhu_like_ascension") ?? endings[0];
    return endings.find((ending) => ending.id === "ordinary_life_preserved") ?? endings[0];
  }

  if (world.id === "cultivation") {
    const foundation = run.worldState.progress.cultivation_foundation ?? 0;
    if (foundation >= 5) return endings.find((ending) => ending.id === "spirit_transformation_overlord") ?? endings[0];
    return endings.find((ending) => ending.id === "ordinary_mortal_life") ?? endings[0];
  }

  if (world.id === "wasteland") {
    const survivalDays = run.worldState.progress.survival_days ?? 0;
    const factionTrust = run.worldState.progress.faction_trust ?? 0;
    if (factionTrust >= 4) return endings.find((ending) => ending.id === "camp_founder") ?? endings[0];
    if (survivalDays >= 5) return endings.find((ending) => ending.id === "quiet_survivor") ?? endings[0];
    return endings[0];
  }

  return endings[0];
}

function calculateMvpScore(run, endingSeed) {
  const attributePotential = Object.values(run.player.attributes).reduce((sum, attribute) => sum + (attribute.potential ?? 0), 0);
  const progressScore = Object.values(run.worldState.progress).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
  const relationshipScore = run.importantNPCs.reduce((sum, npc) => sum + Math.max(0, npc.relationship?.affinity ?? 0), 0);
  const endingBonus = (endingSeed.tags ?? []).includes("power") ? 10 : 5;
  return Math.max(0, Math.round(attributePotential + progressScore * 3 + relationshipScore * 0.2 + endingBonus));
}

function deriveRunTags(run) {
  const tags = ["mvp_ending", run.player.lifeStage];
  const strongestAttribute = Object.entries(run.player.attributes).sort((left, right) => {
    return (right[1].potential ?? 0) - (left[1].potential ?? 0);
  })[0]?.[0];
  if (strongestAttribute) tags.push(`strong_${strongestAttribute}`);
  return tags;
}

function buildEndingBiography(run, world, endingSeed, score) {
  const progress = buildWorldProgressSummary(run).join("；") || "世界进度仍然平缓";
  const talents = run.player.talents.map((talent) => localizeTalentId(talent.id)).join("、") || "没有保留天赋";
  const worldName = localizeWorldName(world.id, world.config?.name);
  const endingName = localizeEndingName(endingSeed.id, endingSeed.name);
  return `${run.player.name} 在 ${worldName} 的人生抵达了阶段性结局。出生身份、保留天赋 ${talents} 和一路选择共同塑造了这条人生路线。到 ${run.player.age} 岁时，${progress}。最终评分为 ${score}，结局被记录为「${endingName}」。`;
}

function buildRelationshipSummary(run) {
  return run.importantNPCs
    .slice(0, 3)
    .map((npc) => {
      const label = visibleNpcLabel(npc);
      return label ? `${label} 关系约 ${npc.relationship?.affinity ?? 0}` : "";
    })
    .filter(Boolean);
}

function buildWorldProgressSummary(run) {
  return Object.entries(run.worldState.progress)
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .map(([key, value]) => `${progressLabel(key)} ${value}`);
}

function classifyEndingType(tags) {
  const tagSet = new Set(tags ?? []);
  if (tagSet.has("death") || tagSet.has("victim") || tagSet.has("tribulation") || tagSet.has("backlash")) {
    return "accidental_or_failure_death";
  }
  if (tagSet.has("world_destruction") || tagSet.has("catastrophe") || tagSet.has("social_normalcy_collapse")) {
    return "world_ending";
  }
  if (tagSet.has("assimilation") || tagSet.has("inhuman") || tagSet.has("mutation") || tagSet.has("controlled_life")) {
    return "special_state_ending";
  }
  if (tagSet.has("power") || tagSet.has("legacy") || tagSet.has("faction_creation") || tagSet.has("mvp_peak")) {
    return "goal_completion";
  }
  return "natural_death";
}

function endingTypeLabel(type) {
  return {
    natural_death: "自然死亡",
    accidental_or_failure_death: "意外死亡 / 失败死亡",
    goal_completion: "目标完成结局",
    world_ending: "世界结局",
    special_state_ending: "特殊状态结局",
  }[type] ?? "人生结局";
}

function localizeWorldName(id, fallback) {
  return {
    cultivation: "修仙世界",
    cthulhu: "克苏鲁生活世界",
    wasteland: "末日废土世界",
  }[id] ?? fallback ?? id;
}

function localizeEndingName(id, fallback) {
  return {
    ordinary_life_preserved: "守住普通人生",
    entity_killer: "弑杀不可名状者",
    cthulhu_like_ascension: "旧日化升格",
    world_destroyer: "世界毁灭者",
    truth_buried_family_life: "掩埋真相的家庭人生",
    official_containment_asset: "官方收容资产",
    watcher_martyr: "守望者殉道",
    cult_high_priest: "邪教大祭司",
    cult_sacrifice: "祭品人生",
    dream_city_resident: "梦城居民",
    dream_city_escapee: "梦城逃离者",
    forbidden_scholar: "禁忌学者",
    ordinary_mortal_life: "凡人一生",
    failed_breakthrough: "突破失败",
    spirit_transformation_overlord: "化神霸主",
    sect_elder_settlement: "宗门长老",
    wandering_immortal_trace: "游仙踪迹",
    clan_pillar_life: "家族支柱",
    demonic_path_ascendant: "魔道升格",
    demonic_path_devoured: "魔道反噬",
    quiet_survivor: "沉默幸存者",
    camp_founder: "营地奠基者",
    wasteland_tyrant: "废土暴君",
    raider_crown: "掠夺者王冠",
    raider_victim: "掠夺者刀下亡魂",
    greenhouse_savior: "温室救世者",
    water_baron: "水源领主",
    water_war_casualty: "水源战争牺牲者",
  }[id] ?? fallback ?? id;
}

function localizeTalentId(id) {
  return talentLabel(id);
}

function progressLabel(id) {
  return {
    cultivation_foundation: "修炼根基",
    truth_exposure: "真相揭露",
    sanity_pressure: "理智压力",
    corruption_assimilation: "污染/同化",
    occult_contact: "神秘接触",
    social_normalcy: "社会正常度",
    personal_goal: "个人目标",
    survival_days: "生存天数",
    camp_stage: "营地阶段",
    resource_security: "资源安全",
    radiation_burden: "辐射负担",
    faction_trust: "势力信任",
  }[id] ?? id;
}
