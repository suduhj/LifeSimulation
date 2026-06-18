const AMBIGUOUS_PATTERNS = [
  /^(看看|随便|都行|继续|探索|调查|处理|行动)$/i,
  /^(look|explore|investigate|do something)$/i,
];

const WORLD_BREAKING_PATTERNS = [
  /直接.*(成仙|飞升|无敌|满级|通关|杀死克苏鲁|毁灭世界|统治世界)/,
  /(成为|变成).*(神|克苏鲁|旧日|仙人|无敌)/,
  /(kill|destroy).*(cthulhu|world|everyone)/i,
  /(become|turn into).*(god|cthulhu|immortal|invincible)/i,
];

const EXTREME_RISK_PATTERNS = [
  /(自杀|献祭自己|屠杀|灭门|引爆|放火|杀光|吞噬全城|召唤旧日|公开真相)/,
  /(suicide|massacre|sacrifice myself|burn down|summon|nuke|kill everyone)/i,
];

const HIGH_RISK_WORLD_PATTERNS = [
  /(旧日|克苏鲁|邪神|禁忌仪式|污染源|邪教仪式|官方异常部门|夺舍|渡劫|秘境核心|掠夺者营地)/,
  /(old one|cthulhu|outer god|forbidden ritual|cult ritual|anomaly agency|raider camp)/i,
];

export function assessFreeformClarification({ run, sourceEvent, inputText } = {}) {
  const text = String(inputText ?? "").trim();
  const reasons = [];
  const riskFactors = [];

  if (text.length < 4 || AMBIGUOUS_PATTERNS.some((pattern) => pattern.test(text))) {
    reasons.push("action_too_ambiguous");
    riskFactors.push("输入过于含糊，AI 无法稳定判断具体目标、方式和风险。");
  }
  if (WORLD_BREAKING_PATTERNS.some((pattern) => pattern.test(text))) {
    reasons.push("world_breaking_or_impossible");
    riskFactors.push("输入包含强行改写世界、越过成长阶段或直接获得不合理结果的意图。");
  }
  if (EXTREME_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    reasons.push("extreme_harm_or_irreversible_action");
    riskFactors.push("输入可能造成极端伤害、不可逆后果或严重偏离当前人生处境。");
  }
  if (HIGH_RISK_WORLD_PATTERNS.some((pattern) => pattern.test(text))) {
    reasons.push("high_risk_world_contact");
    riskFactors.push("输入会主动接触高风险世界要素，可能触发追杀、污染、暴露或死亡。");
  }
  if ((sourceEvent?.event?.riskLabel === "high" || sourceEvent?.event?.riskLabel === "extreme") && text.length < 12) {
    reasons.push("high_risk_scene_needs_specific_method");
    riskFactors.push("当前场景风险较高，需要玩家确认更具体的行动方式。");
  }
  if ((run?.player?.age ?? 0) <= 6 && WORLD_BREAKING_PATTERNS.some((pattern) => pattern.test(text))) {
    reasons.push("age_stage_mismatch");
    riskFactors.push("当前年龄阶段无法直接执行该行动，除非确认这是尝试、愿望或异常触发。");
  }

  return {
    clarificationNeeded: reasons.length > 0,
    reasons,
    riskFactors,
    riskBand: reasons.some((reason) => reason.includes("extreme") || reason.includes("world_breaking")) ? "extreme" : reasons.length > 0 ? "high" : "medium",
  };
}

export function generateFreeformClarificationRequest({ run, sourceEvent, inputText, assessment, seed = 1 } = {}) {
  const riskFactors = assessment?.riskFactors ?? [];
  const riskText = riskFactors.length > 0 ? riskFactors.join(" ") : "这个自由行动需要确认具体意图。";
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "clarification_request",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_${run.eventHistory.length + 1}_clarify`,
    timeSpan: {
      ageStart: run.player.age,
      ageEnd: run.player.age,
      yearsElapsed: 0,
      pace: "scene_moment",
      paceReasonKey: "mvp.freeform_clarification",
    },
    selectedSeeds: sourceEvent.selectedSeeds ?? [],
    interactionMode: "freeform_confirmation",
    engineCheck: {
      providedByEngine: true,
      checkResult: "confirmation_required",
      riskLevel: assessment?.riskBand ?? "high",
      difficultyLabel: "自由行动需要确认后才会执行判定",
    },
    playerText: {
      title: "需要确认自由行动",
      body: `你输入的行动是：“${inputText}”。${riskText} 如果继续，系统会把它当作一次高风险尝试来判定，而不是保证成功。`,
      visibleChanges: ["本次行动尚未执行，未消耗剧情结算。"],
      relationshipSummary: [],
      worldProgressSummary: [],
    },
    event: {
      eventId: "clarify_freeform_action",
      lifeStage: run.player.lifeStage,
      riskLabel: assessment?.riskBand ?? "high",
      summaryTags: ["freeform", "clarification"],
    },
    choices: [],
    freeform: {
      allowed: false,
      clarificationNeeded: true,
      interpretedAction: inputText,
      riskBand: assessment?.riskBand ?? "high",
      fuzzySuccessLabel: "需要确认",
      judgmentFactors: ["ambiguity", "risk", "world_rules", "age", "current_scene"],
      confirmationPrompt: "输入 y 确认执行，输入 n 取消并回到当前事件。",
    },
    visibleChanges: [],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: [],
      memoryUpdates: [],
      growthEvidenceChanges: [],
      scoreDelta: 0,
    },
    internal: {
      judgmentSummary: `Free-form clarification required before resolution. Seed ${seed}.`,
      validationFlags: ["engine_clarification", "freeform_confirmation_required", ...(assessment?.reasons ?? [])],
      hiddenStateNotes: "Clarification request has not executed the attempted action.",
    },
  };
}
