import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  applyAnnualFactPackageToResponse,
  createInitialRun,
  loadMvpWorlds,
  recalculateGrowthLedgerForRun,
} from "../src/index.js";

describe("annual growth impact", () => {
  it("adds learning-path growth even when the AI response has no growth evidence patch", () => {
    const run = createCultivationRun(12);
    openGrowthRoom(run, "intelligence");
    const before = attributeSnapshot(run, "intelligence");
    const annualFacts = buildAnnualFactPackageForSlot("learning_path", 13);
    const response = buildRenderedAnnualEvent(run, annualFacts);
    response.statePatch.growthEvidenceChanges = [];

    const patched = applyAnnualFactPackageToResponse(response, annualFacts);
    const nextRun = applyAiResponseToRun(run, patched);
    const after = attributeSnapshot(nextRun, "intelligence");

    assert.equal(after.realized, before.realized + 1);
    assert.equal(after.exposure, before.exposure + 1);
  });

  it("turns body-growth curriculum into constitution realization", () => {
    const run = createCultivationRun(8);
    openGrowthRoom(run, "constitution");
    const before = attributeSnapshot(run, "constitution");
    const annualFacts = buildAnnualFactPackageForSlot("body_growth", 9);
    const response = buildRenderedAnnualEvent(run, annualFacts);
    response.statePatch.growthEvidenceChanges = [];

    const nextRun = applyAiResponseToRun(run, applyAnnualFactPackageToResponse(response, annualFacts));
    const after = attributeSnapshot(nextRun, "constitution");

    assert.equal(after.realized, before.realized + 2);
    assert.equal(after.potential, before.potential);
  });

  it("keeps external-attention years focused on exposure instead of free ability growth", () => {
    const run = createCultivationRun(8);
    const beforeTotalRealized = totalRealized(run);
    const beforeTotalExposure = totalExposure(run);
    const annualFacts = buildAnnualFactPackageForSlot("external_attention", 9);
    const response = buildRenderedAnnualEvent(run, annualFacts);
    response.statePatch.growthEvidenceChanges = [];

    const nextRun = applyAiResponseToRun(run, applyAnnualFactPackageToResponse(response, annualFacts));

    assert.equal(totalRealized(nextRun), beforeTotalRealized);
    assert.equal(totalExposure(nextRun), beforeTotalExposure + 2);
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

function openGrowthRoom(run, attribute) {
  run.player.growthLedger.attributes[attribute].growthBonus += 20;
  recalculateGrowthLedgerForRun(run);
}

function attributeSnapshot(run, attribute) {
  const ledger = run.player.growthLedger.attributes[attribute];
  const display = run.player.attributes[attribute];
  return {
    realized: ledger.realized,
    potential: ledger.potential,
    exposure: display.exposure,
  };
}

function totalRealized(run) {
  return Object.values(run.player.growthLedger.attributes)
    .reduce((sum, attribute) => sum + attribute.realized, 0);
}

function totalExposure(run) {
  return Object.values(run.player.attributes)
    .reduce((sum, attribute) => sum + attribute.exposure, 0);
}

function buildAnnualFactPackageForSlot(slot, age) {
  return {
    age,
    lifeStage: "childhood",
    curriculumSlot: slot,
    requiredHumanDelta: humanDeltaForSlot(slot),
    primaryAxis: "lifePressure",
    secondaryAxis: "talentManifestation",
    primaryDelta: {
      type: `${slot}_changed`,
      eventShape: `${slot}_annual_change`,
      title: titleForSlot(slot),
      description: "这一年真正改变的是日常生活安排，而旧线索只作为背景回响。",
      nextPressure: "适应新的年度变化",
    },
    secondaryDelta: {
      type: "subtle_talent_manifestation",
      eventShape: "subtle_talent_echo",
      title: "天赋轻微显露",
      description: "天赋只轻微影响日常，不抢走年度主线。",
    },
    topicProfile: {
      age,
      topicFamily: `${slot}_shift`,
      arena: slot === "learning_path" ? "school_or_home" : "home_or_village",
      objectFocus: slot === "learning_path" ? "book_or_lesson" : "daily_life",
      institutionFocus: "family_or_teacher",
      pressureType: `${slot}_pressure`,
    },
    forbiddenTopicProfiles: [],
    requiredStateChanges: [],
    annualAgenda: {
      age,
      curriculumSlot: slot,
      mustInclude: [humanDeltaForSlot(slot)],
      mustNotInclude: ["旧奇遇不能成为主线"],
    },
  };
}

function humanDeltaForSlot(slot) {
  const values = {
    learning_path: "学习路径发生变化",
    body_growth: "身体成长带来新的承载变化",
    external_attention: "外界开始更明显地注意你",
  };
  return values[slot] ?? "年度生活发生变化";
}

function titleForSlot(slot) {
  const values = {
    learning_path: "学习安排改变",
    body_growth: "身体成长",
    external_attention: "外界关注",
  };
  return values[slot] ?? "年度变化";
}

function buildRenderedAnnualEvent(run, annualFacts) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_yearly_outcome_${annualFacts.age}`,
    timeSpan: { ageStart: run.player.age, ageEnd: annualFacts.age, yearsElapsed: 1, pace: "scene_or_short_stage" },
    selectedSeeds: [],
    interactionMode: "playable_choices",
    playerText: {
      title: `${annualFacts.age} 岁：${annualFacts.primaryDelta.title}`,
      body: `这一年，真正改变你生活的是：${annualFacts.requiredHumanDelta}。父母、师长和村里人的安排都随之调整，旧线索只在背景里轻轻回响，没有抢走今年的主线。因为新的日常节奏已经出现，你需要决定如何面对这份变化，并让自己的生活往前走。`,
    },
    event: { eventId: `yearly_outcome_${annualFacts.age}`, riskLabel: "medium", summaryTags: [] },
    choices: [
      { id: "choice_1", text: "先顺着新的安排观察变化，看看它会怎样影响这一年的生活。", intentTags: ["life"], fuzzySuccessLabel: "难度较低", riskLabel: "low" },
      { id: "choice_2", text: "主动和相关的人谈一谈，弄清他们为什么做出这样的安排。", intentTags: ["relationship"], fuzzySuccessLabel: "结果难料", riskLabel: "medium" },
      { id: "choice_3", text: "把旧线索记在心里，但不让它抢走今年的日常主线。", intentTags: ["consequence"], fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
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
    internal: { judgmentSummary: "yearly outcome test", validationFlags: [], hiddenStateNotes: "" },
  };
}
