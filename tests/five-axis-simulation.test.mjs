import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  applyAnnualFactPackageToResponse,
  buildActionIntent,
  buildAnnualFactPackage,
  buildNextEventContract,
  createInitialRun,
  ensureStoryState,
  generateMockLifeEvent,
  loadMvpWorlds,
  recordSimulationOutcome,
  simulateActionOutcome,
} from "../src/index.js";

const AXIS_KEYS = [
  "lifePressure",
  "talentManifestation",
  "npcRelationship",
  "worldOpportunity",
  "choiceConsequence",
];

describe("five-axis lightweight world simulation", () => {
  it("initializes and normalizes the five story axes", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);

    assert.deepEqual(Object.keys(run.worldState.storyState.axes).sort(), [...AXIS_KEYS].sort());
    assert.equal(run.worldState.storyState.axes.lifePressure.level, 2);
    assert.equal(run.worldState.storyState.axes.choiceConsequence.level, 0);
    assert.deepEqual(run.worldState.storyState.recentEventShapes, []);

    const legacyRun = {
      worldState: {
        storyState: {
          schemaVersion: "mvp.story_state.v1",
          threads: [],
          facts: [],
          closedFacts: [],
          forbiddenRepeats: [],
          activePressures: [],
        },
      },
    };

    const normalized = ensureStoryState(legacyRun);

    assert.deepEqual(Object.keys(normalized.axes).sort(), [...AXIS_KEYS].sort());
    assert.equal(normalized.axes.talentManifestation.cooldown, 0);
    assert.deepEqual(normalized.recentEventShapes, []);
  });

  it("records player action consequences as axis pressure, not only prose memory", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    const sourceEvent = jadeTalismanEvent(run, worlds);
    const afterEvent = applyAiResponseToRun(run, sourceEvent);
    const intent = buildActionIntent({
      run: afterEvent,
      sourceEvent,
      action: { kind: "choice", choiceId: "choice_1" },
    });

    const outcome = simulateActionOutcome({
      run: afterEvent,
      sourceEvent,
      action: { kind: "choice", choiceId: "choice_1" },
      intent,
    });
    const withStoryState = recordSimulationOutcome(afterEvent, outcome);

    assert.ok(outcome.axisUpdates.some((update) => update.axisId === "choiceConsequence" && update.amount >= 3));
    assert.ok(outcome.axisUpdates.some((update) => update.axisId === "npcRelationship"));
    assert.ok(withStoryState.worldState.storyState.axes.choiceConsequence.level > afterEvent.worldState.storyState.axes.choiceConsequence.level);
    assert.equal(withStoryState.worldState.storyState.axes.choiceConsequence.recentDeltas.at(-1).source, "simulation_kernel");
  });

  it("director contracts choose a primary and secondary axis from state pressure", () => {
    const worlds = loadMvpWorlds();
    const run = withJadeChoiceConsequence(createCultivationRun(worlds));

    const contract = buildNextEventContract({ run, worlds, seed: 20260619 });

    assert.equal(contract.primaryAxis, "choiceConsequence");
    assert.equal(contract.secondaryAxis, "npcRelationship");
    assert.equal(contract.annualFactPackage.primaryAxis, "choiceConsequence");
    assert.equal(contract.annualFactPackage.secondaryAxis, "npcRelationship");
    assert.ok(contract.annualFactPackage.axisSnapshot.choiceConsequence.level >= 3);
    assert.ok(contract.backgroundThreads.includes("jade_talisman"));
  });

  it("prioritizes unresolved choice consequences over annual domain preference", () => {
    const worlds = loadMvpWorlds();
    const run = withInstitutionPressure(withJadeChoiceConsequence(createCultivationRun(worlds)));

    const annualFacts = buildAnnualFactPackage({ run, worlds, seed: 20260619 });

    assert.equal(annualFacts.primaryDelta.eventShape, "institution_arrival_changes_life");
    assert.equal(annualFacts.primaryAxis, "choiceConsequence");
    assert.equal(annualFacts.secondaryAxis, "npcRelationship");
  });

  it("annual fact packages write the selected axes back to storyState", () => {
    const worlds = loadMvpWorlds();
    const run = withJadeChoiceConsequence(createCultivationRun(worlds));
    const annualFacts = buildAnnualFactPackage({ run, worlds, seed: 20260619 });
    const renderedEvent = buildRenderedEvent(run, annualFacts);

    const patched = applyAnnualFactPackageToResponse(renderedEvent, annualFacts);
    const storyPatch = patched.statePatch.worldStateChanges.find((change) => change.target === "storyState");

    assert.ok(storyPatch.value.axes.choiceConsequence);
    assert.equal(storyPatch.value.axes.choiceConsequence.lastFeaturedAge, annualFacts.age);
    assert.equal(storyPatch.value.axes.choiceConsequence.recentDeltas.at(-1).eventShape, annualFacts.primaryDelta.eventShape);
    assert.ok(storyPatch.value.axes.npcRelationship.recentDeltas.some((delta) => delta.source === "annual_secondary_axis"));
  });

  it("merged annual patches persist the featured axes on the next run", () => {
    const worlds = loadMvpWorlds();
    const run = withJadeChoiceConsequence(createCultivationRun(worlds));
    const annualFacts = buildAnnualFactPackage({ run, worlds, seed: 20260619 });
    const patched = applyAnnualFactPackageToResponse(buildRenderedEvent(run, annualFacts), annualFacts);

    const nextRun = applyAiResponseToRun(run, patched);

    assert.equal(nextRun.worldState.storyState.axes.choiceConsequence.lastFeaturedAge, annualFacts.age);
    assert.equal(nextRun.worldState.storyState.axes.choiceConsequence.recentDeltas.at(-1).source, "annual_primary_axis");
    assert.ok(nextRun.worldState.storyState.recentEventShapes.includes(annualFacts.primaryDelta.eventShape));
  });
});

function createCultivationRun(worlds) {
  return createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "林岚", gender: "female", personality: "curious" },
  });
}

function withJadeChoiceConsequence(run) {
  return recordSimulationOutcome(run, {
    factsAdded: ["father_identified_jade_as_spirit_marker", "mother_fears_cultivation_path"],
    factsClosed: ["jade_talisman_first_discovery"],
    forbiddenRepeats: ["forest_jade_object_footsteps_choice_skeleton"],
    axisUpdates: [
      { axisId: "choiceConsequence", amount: 4, reason: "玉片事件已经改变家庭选择", source: "test" },
      { axisId: "npcRelationship", amount: 3, reason: "父母态度成为下一压力", source: "test" },
      { axisId: "lifePressure", amount: 1, reason: "家庭生活边界收紧", source: "test" },
    ],
    threadUpdates: [{
      threadId: "jade_talisman",
      stage: "identified",
      nextPressure: "family_blocks_mountain_access",
      updatedAge: run.player.age,
    }],
  });
}

function withInstitutionPressure(run) {
  return recordSimulationOutcome(run, {
    factsAdded: [
      "cave_jade_slip_found",
      "spirit_beast_non_hostile_confirmed",
      "biyun_selection_invited",
    ],
    threadUpdates: [
      {
        threadId: "bamboo_forest_spirit_beast",
        stage: "non_hostile_confirmed",
        nextPressure: "sect_arrives_to_handle_beast",
        updatedAge: run.player.age,
      },
      {
        threadId: "biyun_selection",
        stage: "pending",
        nextPressure: "selection_delay_must_be_explained",
        updatedAge: run.player.age,
      },
    ],
  });
}

function jadeTalismanEvent(run, worlds) {
  const event = generateMockLifeEvent({ run, worlds, seed: 1 });
  return {
    ...event,
    runId: run.runId,
    worldId: run.worldId,
    turnId: `turn_jade_${run.eventHistory.length + 1}`,
    timeSpan: { ageStart: run.player.age, ageEnd: run.player.age, yearsElapsed: 0, pace: "scene_or_short_stage" },
    playerText: {
      ...event.playerText,
      title: `${run.player.age} 岁：山林中的异样`,
      body: "你随家人到村边山林取柴，草丛里露出一枚暗红色的小珠。母亲先看见它，脸色变了一下，低声让你不要乱碰；父亲却听见林外传来脚步声，担心有人也冲着这东西而来。",
    },
    choices: [
      {
        id: "choice_1",
        text: "先靠近照看你的大人，把看到的异物和林外脚步告诉对方，让家人判断该不该声张。",
        intentTags: ["family", "jade_talisman"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "小心把注意力放在那枚暗红小珠上，不急着触碰，先观察它有没有光泽、温度或奇怪动静。",
        intentTags: ["observe", "jade_talisman"],
        fuzzySuccessLabel: "结果难以判断",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "转头看向林外的脚步声，试着分辨来的是熟人、路人还是可能与这枚珠子有关的人。",
        intentTags: ["listen", "jade_talisman"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
    ],
  };
}

function buildRenderedEvent(run, annualFacts) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: "turn_five_axis_patch",
    timeSpan: { ageStart: run.player.age, ageEnd: annualFacts.age, yearsElapsed: 1, pace: "scene_or_short_stage" },
    selectedSeeds: [],
    interactionMode: "playable_choices",
    playerText: {
      title: `${annualFacts.age} 岁：旧事回到家中`,
      body: "这天父亲和母亲在家里重新谈起后山禁令。玉片的旧事没有重新开始，却让父母的态度、你的选择和家中的气氛一起变了。你必须面对上次选择留下的后果，也要判断谁会帮你、谁会拦你。",
    },
    event: { eventId: "five_axis_patch", riskLabel: "medium", summaryTags: [] },
    choices: [
      { id: "choice_1", text: "先听从家里的安排，观察父母到底担心什么。", intentTags: ["family"], fuzzySuccessLabel: "难度较低", riskLabel: "low" },
      { id: "choice_2", text: "试着和父亲单独谈谈，让他说出他知道的旧事。", intentTags: ["relationship"], fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
      { id: "choice_3", text: "暗中整理所有线索，但暂时不再主动靠近后山。", intentTags: ["choice_consequence"], fuzzySuccessLabel: "结果难以预料", riskLabel: "medium" },
    ],
    freeform: { allowed: true, clarificationNeeded: false, riskBand: "low" },
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
      scoreDelta: 0,
    },
    internal: { judgmentSummary: "test", validationFlags: [], hiddenStateNotes: "" },
  };
}
