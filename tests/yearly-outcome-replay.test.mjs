import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  applyAnnualFactPackageToResponse,
  createInitialRun,
  loadMvpWorlds,
  recalculateGrowthLedgerForRun,
  replayRun,
} from "../src/index.js";

describe("yearly outcome replay", () => {
  it("stores yearly outcomes as domain events and rebuilds them through replay", () => {
    const run = createCultivationRun(12);
    const annualFacts = buildAnnualFactPackageForSlot("learning_path", 13);
    const response = buildRenderedAnnualEvent(run, annualFacts);

    const nextRun = applyAiResponseToRun(run, applyAnnualFactPackageToResponse(response, annualFacts));
    const replayed = replayRun(nextRun.eventLog);

    assert.ok(nextRun.eventLog.events.some((event) => event.type === "annual.outcome_recorded"));
    assert.ok(nextRun.worldState.storyState.yearlyOutcomes.some((outcome) => outcome.outcomeId === "year_13_learning_path"));
    assert.deepEqual(replayed.worldState.storyState.yearlyOutcomes, nextRun.worldState.storyState.yearlyOutcomes);
  });
});

function createCultivationRun(age) {
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = age;
  recalculateGrowthLedgerForRun(run);
  return run;
}

function buildAnnualFactPackageForSlot(slot, age) {
  return {
    age,
    lifeStage: "adolescence",
    curriculumSlot: slot,
    requiredHumanDelta: "学习路径发生变化",
    primaryAxis: "lifePressure",
    secondaryAxis: "talentManifestation",
    primaryDelta: {
      type: `${slot}_changed`,
      eventShape: `${slot}_annual_change`,
      title: "学习安排改变",
      description: "这一年真正改变的是学习路径，旧线索只作为背景回响。",
      nextPressure: "适应新的学习节奏",
    },
    secondaryDelta: {
      type: "subtle_talent_manifestation",
      eventShape: "subtle_talent_echo",
      title: "天赋轻微显露",
      description: "天赋只轻微影响日常，不抢走年度主线。",
    },
    topicProfile: {
      age,
      topicFamily: "learning_path_shift",
      arena: "school_or_home",
      objectFocus: "book_or_lesson",
      institutionFocus: "family_or_teacher",
      pressureType: "learning_arrangement",
    },
    forbiddenTopicProfiles: [],
    requiredStateChanges: [],
    annualAgenda: {
      age,
      curriculumSlot: slot,
      mustInclude: ["学习路径发生变化"],
      mustNotInclude: ["旧奇遇不能成为主线"],
    },
  };
}

function buildRenderedAnnualEvent(run, annualFacts) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_yearly_replay_${annualFacts.age}`,
    timeSpan: { ageStart: run.player.age, ageEnd: annualFacts.age, yearsElapsed: 1, pace: "scene_or_short_stage" },
    selectedSeeds: [],
    interactionMode: "playable_choices",
    playerText: {
      title: `${annualFacts.age} 岁：学习安排改变`,
      body: "这一年，学习路径发生变化。家中和师长重新安排你的读写与日常练习，旧线索只是偶尔被想起，并没有成为今年的主线。因为新的生活节奏已经出现，你需要选择如何适应这一年的变化。",
    },
    event: { eventId: `yearly_replay_${annualFacts.age}`, riskLabel: "medium", summaryTags: [] },
    choices: [
      { id: "choice_1", text: "认真适应新的学习安排，先把每天的功课稳定下来。", intentTags: ["life"], fuzzySuccessLabel: "难度较低", riskLabel: "low" },
      { id: "choice_2", text: "主动请教师长，弄清新的学习路径对你意味着什么。", intentTags: ["relationship"], fuzzySuccessLabel: "结果难料", riskLabel: "medium" },
      { id: "choice_3", text: "把旧线索暂时放到一边，不让它抢走今年的学习主线。", intentTags: ["consequence"], fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
    ],
    freeform: { allowed: true, clarificationNeeded: false, riskBand: "low" },
    visibleChanges: [],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: [],
      growthEvidenceChanges: [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: [],
      memoryUpdates: [],
      scoreDelta: 0,
    },
    internal: { judgmentSummary: "yearly outcome replay test", validationFlags: [], hiddenStateNotes: "" },
  };
}
