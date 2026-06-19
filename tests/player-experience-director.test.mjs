import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  applyAnnualFactPackageToResponse,
  buildAnnualFactPackage,
  createDefaultExperienceState,
  createInitialRun,
  loadMvpWorlds,
  recordExperienceIntent,
  replayRun,
  selectExperienceIntent,
  summarizeExperienceRhythm,
} from "../src/index.js";

describe("Player Experience Director", () => {
  it("keeps pressure streaks short and schedules growth plus social/relationship beats", () => {
    let experience = createDefaultExperienceState();
    const intents = [];
    const slots = [
      "family_boundary",
      "household_responsibility",
      "learning_path",
      "peer_relationship",
      "mentor_attention",
      "body_growth",
      "health_or_care",
      "village_social_life",
      "talent_subtle_manifestation",
      "external_attention",
    ];

    for (let index = 0; index < 10; index += 1) {
      const plan = selectExperienceIntent({
        experience,
        age: 7 + index,
        seed: 9000 + index,
        curriculumSlot: slots[index],
      });
      intents.push(plan.intent);
      experience = recordExperienceIntent(experience, plan);
    }

    const summary = summarizeExperienceRhythm(experience);
    assert.ok(summary.pressureStreakMax <= 2, `pressure streak too long: ${intents.join(",")}`);
    assert.ok(intents.includes("growth_payoff"), `expected a growth payoff beat: ${intents.join(",")}`);
    assert.ok(
      intents.includes("relationship_warmth") || intents.includes("social_pressure"),
      `expected relationship or social beat: ${intents.join(",")}`,
    );
  });

  it("persists the annual experience intent through event replay", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    const facts = buildAnnualFactPackage({ run, worlds, seed: 20260619 });
    const response = applyAnnualFactPackageToResponse(buildRenderedAnnualEvent(run, facts), facts, { run });

    const nextRun = applyAiResponseToRun(run, response);
    const replayed = replayRun(nextRun.eventLog);

    assert.ok(facts.experienceIntent);
    assert.equal(facts.annualAgenda.experienceIntent, facts.experienceIntent);
    assert.ok(nextRun.worldState.storyState.experience.recentIntents.some((item) => item.intent === facts.experienceIntent));
    assert.deepEqual(replayed.worldState.storyState.experience, nextRun.worldState.storyState.experience);
  });
});

function createCultivationRun(worlds) {
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = 6;
  return run;
}

function buildRenderedAnnualEvent(run, annualFacts) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_experience_${annualFacts.age}`,
    timeSpan: { ageStart: run.player.age, ageEnd: annualFacts.age, yearsElapsed: 1, pace: "scene_or_short_stage" },
    selectedSeeds: [],
    interactionMode: "playable_choices",
    playerText: {
      title: `${annualFacts.age} 岁：${annualFacts.curriculumSlot}`,
      body: `此前家人和村里都注意到你的生活正在变化。这天父亲和母亲重新谈起今年的安排，村里也有人压低声音议论你的表现。今年的主变化是：${annualFacts.requiredHumanDelta}。体验节奏落在 ${annualFacts.experienceIntent}。眼下你要在顺着安排观察、和相关的人谈一谈、把旧线索先放在背景里三种态度之间选择。`,
    },
    event: { eventId: `experience_${annualFacts.age}`, riskLabel: "medium", summaryTags: [] },
    choices: [
      { id: "choice_1", text: "顺着今年的安排观察变化，先不急着反抗父母和村里的决定。", intentTags: ["life"], fuzzySuccessLabel: "低风险", riskLabel: "low" },
      { id: "choice_2", text: "找一个相关的人谈一谈，弄清楚这次态度变化背后的原因。", intentTags: ["relationship"], fuzzySuccessLabel: "结果难料", riskLabel: "medium" },
      { id: "choice_3", text: "把旧线索先放在背景里，只记录它如何影响今年的日常安排。", intentTags: ["consequence"], fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
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
    internal: { judgmentSummary: "experience director test", validationFlags: [], hiddenStateNotes: "" },
  };
}
