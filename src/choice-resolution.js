import { createRng } from "./random.js";

export function generateChoiceResolution({ run, sourceEvent, choiceId, seed = 1 } = {}) {
  const rng = createRng(`${run.runId}:${choiceId}:${seed}`);
  const choice = sourceEvent.choices.find((item) => item.id === choiceId);
  if (!choice) {
    throw new Error(`Unknown choiceId: ${choiceId}`);
  }

  const targetNpc = run.importantNPCs[0];
  const relationshipAmount = choice.intentTags.includes("avoidance") ? -2 : 3 + rng.int(4);
  const progressTarget = sourceEvent.visibleChanges[0]?.target ?? "personal_goal";

  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "action_resolution",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_${run.eventHistory.length + 1}`,
    timeSpan: {
      ageStart: run.player.age,
      ageEnd: run.player.age,
      yearsElapsed: 0,
      pace: "scene_moment",
      paceReasonKey: "mvp.mock.choice_resolution",
    },
    selectedSeeds: sourceEvent.selectedSeeds,
    interactionMode: "non_interactive",
    engineCheck: {
      providedByEngine: true,
      checkResult: "partial_success",
      riskLevel: choice.riskLabel,
      difficultyLabel: choice.fuzzySuccessLabel,
    },
    playerText: {
      title: `${run.player.age} 岁：选择的回响`,
      body: [
        `你刚才选择了：${choice.text}`,
        `即时结果：这天眼下的处境并没有因为一句话立刻结束，你只是用当前年龄能做到的方式回应了它。因为此前发生的事已经让家人和周围人保持警惕，你的举动很快被注意到，事情开始朝新的方向偏移。`,
        `NPC反应：${npcVisibleName(targetNpc)}对你的态度出现细微变化，其他亲近的人也开始用新的眼光观察你。`,
        `状态变化：家庭、资源或当前环境会按这个选择重新调整，这段经历也会进入后续判定。村里、家中或眼前场景的反应不会清零，后续事件会继续承接这次留下的影响。`,
        `未来暗线：有些人没有当场表态，只是在你转身后多看了一眼，这个细节暂时还没人解释。`,
        `下一阶段：命运不会清零重来，接下来的生活会沿着这次选择留下的痕迹继续向前。`,
      ].join("\n\n"),
      visibleChanges: [`与${npcVisibleName(targetNpc)}的关系 ${signed(relationshipAmount)}`],
      relationshipSummary: [`${npcVisibleName(targetNpc)} 关系 ${signed(relationshipAmount)}`],
      worldProgressSummary: [`${progressLabel(progressTarget)}继续变化。`],
    },
    event: {
      eventId: `resolve_${choice.id}`,
      lifeStage: run.player.lifeStage,
      riskLabel: choice.riskLabel,
      summaryTags: choice.intentTags,
    },
    choices: [],
    freeform: {
      allowed: false,
      clarificationNeeded: false,
      riskBand: choice.riskLabel,
      fuzzySuccessLabel: "取决于后续行动",
      judgmentFactors: ["choice", "npc_relationship", "world_rules", "history"],
    },
    visibleChanges: [
      {
        type: "relationship",
        target: targetNpc.id,
        amount: relationshipAmount,
        currentValue: targetNpc.relationship.affinity + relationshipAmount,
        source: choice.id,
        duration: "permanent",
        text: `与${npcVisibleName(targetNpc)}的关系 ${signed(relationshipAmount)}`,
      },
    ],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: [],
      relationshipChanges: [
        {
          npcId: targetNpc.id,
          dimension: "affinity",
          amount: relationshipAmount,
          source: choice.id,
        },
      ],
      importantNPCUpdates: [
        {
          npcId: targetNpc.id,
          memory: {
            type: "choice_observed",
            text: `Observed player choice ${choice.id}.`,
          },
        },
      ],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: [],
      memoryUpdates: [
        {
          type: "choice_resolution",
          text: `Resolved ${choice.id} from ${sourceEvent.event.eventId}.`,
        },
      ],
      growthEvidenceChanges: [],
      scoreDelta: 0,
    },
    internal: {
      judgmentSummary: `Mock choice resolution for ${choice.id}.`,
      validationFlags: ["mock_ai", "choice_resolution"],
      hiddenStateNotes: "Relationship change is visible; hidden NPC stance remains hidden.",
    },
  };
}

function npcVisibleName(npc) {
  return npc?.roleLabel ?? npc?.playerVisible?.label ?? npc?.playerVisible?.publicRole ?? "身边的人";
}

function signed(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function progressLabel(id) {
  return {
    cultivation_foundation: "修炼根基",
    truth_exposure: "真相揭露",
    survival_days: "生存天数",
    personal_goal: "个人目标",
  }[id] ?? id;
}
