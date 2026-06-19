import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildYearlyOutcome,
  createInitialRun,
  growthImpactForCurriculumSlot,
  loadMvpWorlds,
} from "../src/index.js";

describe("Yearly Outcome Ledger enhancement", () => {
  it("records the annual experience intent and a concrete outcome shape", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    const yearlyOutcome = buildYearlyOutcome({
      run,
      annualFactPackage: {
        age: 8,
        curriculumSlot: "learning_path",
        requiredHumanDelta: "学习路径发生变化",
        experienceIntent: "growth_payoff",
        topicProfile: {
          topicFamily: "learning_path_shift",
          arena: "school_or_home",
          objectFocus: "book_or_lesson",
          pressureType: "learning_arrangement",
        },
      },
    });

    assert.equal(yearlyOutcome.experienceIntent, "growth_payoff");
    assert.equal(yearlyOutcome.curriculum.slot, "learning_path");
    assert.equal(yearlyOutcome.humanOutcome.type, "learning_path_changed");
    assert.ok(yearlyOutcome.growthImpact.realizedGrowth.length > 0);
  });

  it("always explains silent years with noGrowthReason", () => {
    const impact = growthImpactForCurriculumSlot({
      run: createCultivationRun(loadMvpWorlds()),
      curriculumSlot: "external_attention",
      age: 9,
    });

    assert.equal(impact.realizedGrowth.length, 0);
    assert.ok(impact.exposureGrowth.length > 0 || impact.noGrowthReason.length > 0);
  });
});

function createCultivationRun(worlds) {
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = 7;
  return run;
}
