import { buildStoryStatePatch } from "./story-state.js";

export function simulateActionOutcome({ run, sourceEvent, action, intent } = {}) {
  if (intent?.threadId === "jade_talisman") {
    return {
      intent,
      factsAdded: [
        "father_identified_jade_as_spirit_marker",
        "mother_fears_cultivation_path",
      ],
      factsClosed: ["jade_talisman_first_discovery"],
      forbiddenRepeats: ["forest_jade_object_footsteps_choice_skeleton"],
      axisUpdates: [
        {
          axisId: "choiceConsequence",
          amount: 4,
          reason: "jade_talisman_choice_created_family_consequence",
          source: "simulation_kernel",
        },
        {
          axisId: "npcRelationship",
          amount: 2,
          reason: "parents_reacted_to_jade_talisman_truth",
          source: "simulation_kernel",
        },
        {
          axisId: "lifePressure",
          amount: 1,
          reason: "family_restriction_changed_daily_life",
          source: "simulation_kernel",
        },
      ],
      threadUpdates: [
        {
          threadId: "jade_talisman",
          stage: "identified",
          nextPressure: "family_blocks_mountain_access",
          updatedAge: run?.player?.age ?? sourceEvent?.timeSpan?.ageEnd ?? 0,
        },
      ],
      memoryText: "玉片已被父亲识别为修仙者使用的灵引符，母亲因此更加畏惧修仙之路，家里开始限制你靠近后山。",
    };
  }

  return {
    intent,
    factsAdded: [],
    factsClosed: [],
    forbiddenRepeats: [],
    axisUpdates: [],
    threadUpdates: [],
    memoryText: buildGenericMemory(action),
  };
}

export function applySimulationOutcomeToResponse(response, outcome, age = response?.timeSpan?.ageEnd ?? 0) {
  if (!response || !outcome) return response;
  const next = structuredClone(response);
  next.statePatch ??= {};
  next.statePatch.worldStateChanges = [
    ...(Array.isArray(next.statePatch.worldStateChanges) ? next.statePatch.worldStateChanges : []),
    buildStoryStatePatch(outcome, age),
  ];
  if (outcome.memoryText) {
    next.statePatch.memoryUpdates = [
      ...(Array.isArray(next.statePatch.memoryUpdates) ? next.statePatch.memoryUpdates : []),
      { type: "simulation_outcome", text: outcome.memoryText },
    ];
  }
  next.internal ??= {};
  next.internal.validationFlags = [
    ...(Array.isArray(next.internal.validationFlags) ? next.internal.validationFlags : []),
    "state_first_simulation",
  ];
  next.internal.hiddenStateNotes = [next.internal.hiddenStateNotes, JSON.stringify({ simulationOutcome: outcome })]
    .filter(Boolean)
    .join("\n");
  return next;
}

function buildGenericMemory(action) {
  if (action?.kind === "freeform" && action.text) return `玩家尝试了自由行动：${action.text}`;
  if (action?.kind === "choice" && action.choiceId) return `玩家选择了 ${action.choiceId}，该选择已进入后续人生状态。`;
  return "";
}
