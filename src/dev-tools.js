import { validateAiResponse } from "./ai-response-validator.js";
import { createDomainEvent } from "./domain/events/event-factory.js";
import { transitionRun } from "./runtime/transition-run.js";

export const DEV_PRESETS = [
  { id: "ordinary_person", name: "标准普通人", allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 } },
  { id: "extreme_appearance", name: "极端颜值流", allocation: { appearance: 20, intelligence: 0, constitution: 0, familyBackground: 0, luck: 0 } },
  { id: "extreme_intelligence", name: "极端智力流", allocation: { appearance: 0, intelligence: 20, constitution: 0, familyBackground: 0, luck: 0 } },
  { id: "extreme_family", name: "极端家境流", allocation: { appearance: 0, intelligence: 0, constitution: 0, familyBackground: 20, luck: 0 } },
  { id: "low_luck_unlucky", name: "低运气倒霉人", allocation: { appearance: 4, intelligence: 5, constitution: 5, familyBackground: 6, luck: 0 } },
  { id: "high_luck_fated", name: "高运气命运之子", allocation: { appearance: 0, intelligence: 0, constitution: 0, familyBackground: 0, luck: 20 } },
  { id: "mythic_baby", name: "神话天赋婴儿", allocation: { appearance: 4, intelligence: 6, constitution: 6, familyBackground: 2, luck: 2 }, devTalentId: "dev_mythic_baby" },
  { id: "high_exposure_anomaly", name: "高暴露异常体", allocation: { appearance: 6, intelligence: 6, constitution: 6, familyBackground: 1, luck: 1 }, exposureOverride: 85, devTalentId: "dev_immediate_anomaly" },
].map(markDevOnly);

export const DEV_TALENTS = [
  buildDevTalent("dev_high_potential_low_manifestation", "高潜力低显化", "mythic", "stage", { intelligence: 120, constitution: 80 }, { manifestedRatio: 0.02 }),
  buildDevTalent("dev_immediate_anomaly", "立即显化异常", "mythic", "immediate", { appearance: 80, constitution: 80 }, { exposureBonus: 80 }),
  buildDevTalent("dev_conditional_awakening", "条件觉醒", "legendary", "conditional", { intelligence: 40, luck: 40 }, { awakensOnMajorCrisis: true }),
  buildDevTalent("dev_hidden_destiny", "隐藏命格", "legendary", "hidden_destiny", { luck: 100 }, { hiddenFateBias: true }),
  buildDevTalent("dev_numeric_stress", "数值压力测试", "mythic", "stage", { appearance: 250, intelligence: 250, constitution: 250, familyBackground: 250, luck: 250 }, { stressTest: true }),
  { ...buildDevTalent("dev_mythic_baby", "神话天赋婴儿", "mythic", "stage", { intelligence: 100, constitution: 100, luck: 100 }, { exposureBonus: 40 }), catalogVisible: false },
];

export const DEV_SCENARIOS = {
  cultivation: [
    scenario("spirit_root_test", "灵根检测", "cultivation_foundation", 2, "medium"),
    scenario("sect_recruitment", "宗门收徒", "sect_attention", 2, "medium"),
    scenario("talent_exposure", "天赋暴露", "sect_attention", 3, "high", { exposure: 12 }),
    scenario("peer_jealousy", "同辈嫉妒", "karmic_pressure", 2, "medium"),
    scenario("secret_realm", "秘境", "cultivation_foundation", 3, "high"),
    scenario("breakthrough_qi_refining", "突破炼气", "cultivation_foundation", 5, "medium"),
    scenario("breakthrough_foundation", "突破筑基", "cultivation_foundation", 10, "high"),
    scenario("body_possession", "夺舍", "karmic_pressure", 5, "extreme"),
    scenario("demonic_temptation", "魔修诱惑", "karmic_pressure", 3, "high"),
    scenario("heavenly_tribulation", "天劫", "karmic_pressure", 8, "extreme"),
  ],
  cthulhu: [
    scenario("ordinary_life", "普通生活", "social_normalcy", 1, "low"),
    scenario("light_anomaly", "轻微异常", "occult_contact", 1, "medium"),
    scenario("missing_classmate", "同学失踪", "truth_exposure", 2, "medium"),
    scenario("hospital_anomaly", "医院异常", "sanity_pressure", 2, "high"),
    scenario("official_questioning", "官方问询", "truth_exposure", 1, "medium"),
    scenario("internet_urban_legend", "网络怪谈", "occult_contact", 2, "medium"),
    scenario("dream_pollution", "梦境污染", "corruption_assimilation", 3, "high"),
    scenario("cult_contact", "邪教接触", "occult_contact", 4, "high"),
    scenario("truth_reveal_rise", "真相揭露上升", "truth_exposure", 5, "high"),
    scenario("pollution_rise", "污染上升", "corruption_assimilation", 5, "extreme"),
    scenario("social_normalcy_drop", "社会正常度下降", "social_normalcy", -3, "high"),
  ],
  wasteland: [
    scenario("ration_shortage", "口粮短缺", "resource_security", -2, "medium"),
    scenario("water_source_found", "水源发现", "resource_security", 3, "medium"),
    scenario("radiation_sandstorm", "辐射沙暴", "radiation_burden", 4, "high"),
    scenario("scavenging", "拾荒", "survival_days", 2, "medium"),
    scenario("raider_extortion", "掠夺者索贡", "faction_trust", -2, "high"),
    scenario("mutant_beast_attack", "变异兽袭击", "survival_days", 1, "extreme"),
    scenario("shelter_infighting", "避难所内斗", "faction_trust", -3, "high"),
    scenario("plague_outbreak", "疫病爆发", "resource_security", -3, "high"),
    scenario("old_world_ruin", "旧世界遗迹", "survival_days", 3, "high"),
    scenario("settlement_foundation", "建立聚落", "camp_stage", 3, "medium"),
  ],
};

export function getDevToolsCatalog() {
  return {
    visibility: "dev_only",
    presets: DEV_PRESETS.map((preset) => ({
      ...preset,
      testOnly: true,
      visibility: "dev_only",
    })),
    talents: DEV_TALENTS.filter((talent) => talent.catalogVisible !== false)
      .map(({ catalogVisible, effects, ...talent }) => ({ ...talent, effects })),
    scenarios: DEV_SCENARIOS,
  };
}

export function applyDevPresetToRun(run, presetId) {
  const preset = DEV_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown dev preset: ${presetId}`);
  const events = [];
  for (const [key, value] of Object.entries(preset.allocation)) {
    const currentBase = run.player.attributes[key]?.base ?? 0;
    events.push(devEvent(run, "growth.attribute_layer_changed", {
      target: key,
      sourceLayer: "base",
      amount: value - currentBase,
      applyToManifested: false,
      source: `dev_preset_${preset.id}`,
    }));
  }
  if (preset.exposureOverride !== undefined) {
    for (const key of Object.keys(run.player.attributes ?? {})) {
      events.push(devEvent(run, "growth.exposure_changed", {
        target: key,
        value: preset.exposureOverride,
        source: `dev_preset_${preset.id}`,
      }));
    }
  }
  if (preset.devTalentId) {
    events.push(...devTalentEvents(run, preset.devTalentId));
  }
  events.push(devEvent(run, "memory.added", { type: "dev_preset", text: `Applied dev preset ${preset.id}.` }));
  events.push(devEvent(run, "world.flag_added", { flag: "dev_mode_used" }));
  return transitionRun({ run, events }).nextRun;
}

export function applyDevTalentToRun(run, talentId) {
  const events = [
    ...devTalentEvents(run, talentId),
    devEvent(run, "memory.added", { type: "dev_talent", text: `Applied dev-only talent ${talentId}.` }),
    devEvent(run, "world.flag_added", { flag: "dev_mode_used" }),
  ];
  return transitionRun({ run, events }).nextRun;
}

export function buildDevScenarioResponse({ run, scenarioId } = {}) {
  const scenarioItem = (DEV_SCENARIOS[run.worldId] ?? []).find((item) => item.id === scenarioId);
  if (!scenarioItem) throw new Error(`Unknown dev scenario for ${run.worldId}: ${scenarioId}`);
  const progressCurrent = run.worldState.progress?.[scenarioItem.progressTarget] ?? 0;
  const exposureTarget = scenarioItem.extra?.exposure ? "appearance" : undefined;

  const response = {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_${run.eventHistory.length + 1}_dev_${scenarioItem.id}`,
    timeSpan: {
      ageStart: run.player.age,
      ageEnd: run.player.age,
      yearsElapsed: 0,
      pace: "scene_moment",
      paceReasonKey: "dev.scenario_injection",
    },
    selectedSeeds: [
      {
        poolType: "event_seed",
        seedId: `dev_${scenarioItem.id}`,
        adaptationRole: "primary",
        strictness: "soft",
        aiAdaptation: "must_adapt",
        visibility: "dev_only",
        testOnly: true,
      },
    ],
    interactionMode: "playable_choices",
    engineCheck: {
      providedByEngine: true,
      checkResult: "not_applicable",
      riskLevel: scenarioItem.riskLevel,
      difficultyLabel: "开发者测试场景",
    },
    playerText: {
      title: `${run.player.age} 岁：测试场景：${scenarioItem.name}`,
      body: [
        `【测试员模式】这天，GM 强制触发「${scenarioItem.name}」，用于检查当前世界在该类场景下的承接能力。`,
        `因为这是开发者测试场景，当前处境会直接落到角色、家庭或周围环境上，但仍必须按 ${run.player.age} 岁能够理解和行动的范围来写。`,
        `眼下可测试的不是固定结果，而是玩家如何面对这个局面：继续推进、谨慎收集信息，或主动放大后续影响。该内容标记为 dev_only/testOnly，不会进入正式玩家的自然事件池。`,
      ].join("\n\n"),
      visibleChanges: [`${scenarioItem.progressLabel} ${signed(scenarioItem.amount)}`],
      relationshipSummary: [],
      worldProgressSummary: [`${scenarioItem.progressLabel} ${progressCurrent} -> ${progressCurrent + scenarioItem.amount}`],
    },
    event: {
      eventId: `dev_${scenarioItem.id}`,
      lifeStage: run.player.lifeStage,
      riskLabel: scenarioItem.riskLevel,
      summaryTags: ["dev_only", "testOnly", scenarioItem.id],
      sourceType: "dev_scenario",
    },
    choices: [
      choice("choice_1", "按当前测试场景继续推进，观察 AI 如何承接这个局面。", "low"),
      choice("choice_2", "让玩家角色谨慎应对，优先收集信息并控制风险。", scenarioItem.riskLevel),
      choice("choice_3", "让玩家角色主动冒险，放大该测试场景的后续影响。", scenarioItem.riskLevel),
    ],
    freeform: {
      allowed: true,
      clarificationNeeded: false,
      riskBand: scenarioItem.riskLevel,
      fuzzySuccessLabel: "测试场景，结果由后续行动判定",
      judgmentFactors: ["dev_scenario", "attributes", "talents", "world_progress"],
    },
    visibleChanges: [
      {
        type: "progression",
        target: scenarioItem.progressTarget,
        amount: scenarioItem.amount,
        currentValue: progressCurrent + scenarioItem.amount,
        source: `dev_${scenarioItem.id}`,
        duration: "permanent",
        text: `${scenarioItem.progressLabel} ${signed(scenarioItem.amount)}`,
      },
      ...(exposureTarget ? [{
        type: "exposure",
        target: exposureTarget,
        amount: scenarioItem.extra.exposure,
        currentValue: (run.player.attributes[exposureTarget]?.exposure ?? 0) + scenarioItem.extra.exposure,
        source: `dev_${scenarioItem.id}`,
        duration: "permanent",
        text: `异常关注 ${signed(scenarioItem.extra.exposure)}`,
      }] : []),
    ],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: exposureTarget ? [{ target: exposureTarget, amount: scenarioItem.extra.exposure, source: `dev_${scenarioItem.id}` }] : [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [{ target: scenarioItem.progressTarget, amount: scenarioItem.amount, source: `dev_${scenarioItem.id}` }],
      worldStateChanges: [{ target: "lastDevScenario", value: scenarioItem.id, source: "dev_tools" }],
      memoryUpdates: [{ type: "dev_scenario", text: `Triggered dev scenario ${scenarioItem.id}.` }],
      growthEvidenceChanges: [],
      scoreDelta: 0,
    },
    internal: {
      judgmentSummary: `Dev-only scenario ${scenarioItem.id} injected by GM panel.`,
      validationFlags: ["dev_only", "testOnly", "engine_owned_state"],
      hiddenStateNotes: "This response is visible only through developer testing tools.",
    },
  };

  const validation = validateAiResponse(response);
  return { response, validation };
}

export function buildDevReport({ sessionId, entry } = {}) {
  const session = entry.session;
  const run = session.currentRun;
  const response = session.currentEvent;
  const validation = validateAiResponse(response);
  return {
    visibility: "dev_only",
    generatedAt: new Date().toISOString(),
    sessionId,
    aiMode: entry.aiMode,
    seed: entry.seed,
    run: {
      runId: run.runId,
      worldId: run.worldId,
      age: run.player.age,
      lifeStage: run.player.lifeStage,
      attributes: run.player.attributes,
      worldProgress: run.worldState.progress,
      statuses: run.statuses,
      importantNPCsHidden: (run.importantNPCs ?? []).map((npc) => ({
        id: npc.id,
        role: npc.role,
        knownIdentity: npc.knownIdentity,
        hiddenInfo: npc.hiddenInfo,
        relationship: npc.relationship,
        flags: npc.flags,
      })),
      recentMemory: run.memory.slice(-8),
    },
    eventSource: response?.event?.sourceType,
    selectedSeeds: response?.selectedSeeds ?? [],
    aiRawJson: response,
    statePatch: response?.statePatch,
    statePatchValidation: validation,
  };
}

function buildDevTalent(id, name, rarity, manifestationType, attributePotential, extraEffects = {}) {
  return {
    id,
    name,
    rarity,
    manifestationType,
    testOnly: true,
    visibility: "dev_only",
    tags: ["dev_only", "testOnly"],
    effects: {
      attributePotential,
      ...extraEffects,
    },
  };
}

function markDevOnly(item) {
  return {
    ...item,
    testOnly: true,
    visibility: "dev_only",
  };
}

function scenario(id, name, progressTarget, amount, riskLevel, extra = {}) {
  return {
    id,
    name,
    progressTarget,
    progressLabel: progressLabel(progressTarget),
    amount,
    riskLevel,
    testOnly: true,
    visibility: "dev_only",
    extra,
  };
}

function choice(id, text, riskLabel) {
  return {
    id,
    text,
    intentTags: ["dev_only", "testOnly"],
    fuzzySuccessLabel: riskLabel === "low" ? "成功率较高" : riskLabel === "extreme" ? "风险极大" : "结果难以判断",
    riskLabel,
  };
}

function devTalentEvents(run, talentId) {
  const talent = DEV_TALENTS.find((item) => item.id === talentId);
  if (!talent) throw new Error(`Unknown dev talent: ${talentId}`);
  const events = [];
  if (!run.player.talents.some((item) => item.id === talent.id)) {
    events.push(devEvent(run, "player.talent_added", {
      id: talent.id,
      rarity: talent.rarity,
      manifestationType: talent.manifestationType,
      tags: talent.tags,
      testOnly: true,
      visibility: "dev_only",
      effects: talent.effects,
    }));
  }
  for (const [key, amount] of Object.entries(talent.effects.attributePotential ?? {})) {
    events.push(devEvent(run, "growth.attribute_layer_changed", {
      target: key,
      sourceLayer: "talentPotential",
      amount,
      applyToManifested: talent.manifestationType === "immediate",
      source: `dev_talent_${talent.id}`,
    }));
    if (talent.effects.exposureBonus) {
      events.push(devEvent(run, "growth.exposure_changed", {
        target: key,
        amount: talent.effects.exposureBonus,
        source: `dev_talent_${talent.id}`,
      }));
    }
  }
  return events;
}

function devEvent(run, type, payload) {
  return createDomainEvent({
    type,
    run,
    source: "gm_tool",
    turnId: `gm_${run.eventLog?.events?.length ?? run.eventHistory?.length ?? 0}`,
    payload,
    metadata: { reason: "GM/dev tool state change" },
  });
}

function progressLabel(id) {
  return {
    cultivation_foundation: "修炼根基",
    sect_attention: "宗门关注",
    karmic_pressure: "因果压力",
    truth_exposure: "真相揭露",
    sanity_pressure: "理智压力",
    corruption_assimilation: "污染/同化",
    occult_contact: "神秘接触",
    social_normalcy: "社会正常度",
    survival_days: "生存天数",
    camp_stage: "营地阶段",
    resource_security: "资源安全",
    radiation_burden: "辐射负担",
    faction_trust: "势力信任",
  }[id] ?? id;
}

function signed(value) {
  return value >= 0 ? `+${value}` : String(value);
}
