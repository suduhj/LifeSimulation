export function generateFreeformResolution({ run, sourceEvent, inputText, seed = 1 } = {}) {
  const targetNpc = run.importantNPCs[0];
  const riskLabel = sourceEvent.event.riskLabel ?? "medium";
  const relationshipAmount = riskLabel === "low" ? 1 : -1;

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
      paceReasonKey: "mvp.mock.freeform_resolution",
    },
    selectedSeeds: sourceEvent.selectedSeeds,
    interactionMode: "non_interactive",
    engineCheck: {
      providedByEngine: true,
      checkResult: riskLabel === "low" ? "success" : "partial_success",
      riskLevel: riskLabel,
      difficultyLabel: "自由行动由属性、年龄、关系和世界逻辑共同判定",
    },
    playerText: {
      title: `${run.player.age} 岁：自由行动的回响`,
      body: [
        `你刚才尝试：${inputText}`,
        `即时结果：这天眼下的处境没有因为一句自由输入就被强行改写，这次行动被视为一次真实尝试，而不是一句必然成真的命令。因为你的年龄、属性、天赋、关系和历史都会参与判定，世界只给出了符合当前人生的有限回应。`,
        `NPC反应：${npcVisibleName(targetNpc)}把你的举动记在心里，态度出现了细微偏移。`,
        `状态变化：你的举动可能让当前环境出现新的注意、机会或戒备，也会被写入这局人生记忆。家人、身边人或现场环境的反应会继续影响后续节点，而不是在下一段剧情里消失。`,
        `未来暗线：旁人暂时没有说破原因，但某个不起眼的反应说明，这次尝试并没有被世界完全忽略。`,
        `下一阶段：你仍要在这个世界的规则里生活，接下来的事件会从这次尝试造成的余波里继续展开。`,
      ].join("\n\n"),
      visibleChanges: [`与${npcVisibleName(targetNpc)}的关系 ${signed(relationshipAmount)}`],
      relationshipSummary: [`${npcVisibleName(targetNpc)} 关系 ${signed(relationshipAmount)}`],
      worldProgressSummary: [],
    },
    event: {
      eventId: "resolve_freeform_action",
      lifeStage: run.player.lifeStage,
      riskLabel,
      summaryTags: ["freeform", "attempt"],
    },
    choices: [],
    freeform: {
      allowed: false,
      clarificationNeeded: false,
      interpretedAction: inputText,
      riskBand: riskLabel,
      fuzzySuccessLabel: "部分成功，但可能留下后续风险",
      judgmentFactors: ["attributes", "age", "talents", "npc_relationship", "world_rules", "history"],
    },
    visibleChanges: [
      {
        type: "relationship",
        target: targetNpc.id,
        amount: relationshipAmount,
        currentValue: targetNpc.relationship.affinity + relationshipAmount,
        source: "freeform_action",
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
          source: "freeform_action",
        },
      ],
      importantNPCUpdates: [
        {
          npcId: targetNpc.id,
          memory: {
            type: "freeform_observed",
            text: `Observed free-form action: ${inputText}`,
          },
        },
      ],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: [],
      memoryUpdates: [
        {
          type: "freeform_resolution",
          text: `Resolved free-form action: ${inputText}`,
        },
      ],
      growthEvidenceChanges: [],
      scoreDelta: 0,
    },
    internal: {
      judgmentSummary: `Free-form input was treated as an attempted action, not guaranteed reality. Seed ${seed}.`,
      validationFlags: ["mock_ai", "freeform_attempt"],
      hiddenStateNotes: "No hidden information revealed.",
    },
  };
}

function npcVisibleName(npc) {
  return npc?.roleLabel ?? npc?.playerVisible?.label ?? npc?.playerVisible?.publicRole ?? "身边的人";
}

function signed(value) {
  return value >= 0 ? `+${value}` : String(value);
}
