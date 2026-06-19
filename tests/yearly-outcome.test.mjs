import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnnualOutcomeContract,
  buildYearlyOutcome,
  createInitialRun,
  growthImpactForCurriculumSlot,
  loadMvpWorlds,
  validateStoryContract,
} from "../src/index.js";

describe("Yearly Outcome Ledger v1", () => {
  it("builds a yearly outcome contract from the annual fact package", () => {
    const run = createCultivationRun(12);
    const annualFactPackage = buildAnnualFactPackageForSlot("learning_path", 13);

    const contract = buildAnnualOutcomeContract({ run, annualFactPackage });

    assert.equal(contract.schemaVersion, "mvp.annual_outcome_contract.v1");
    assert.equal(contract.age, 13);
    assert.equal(contract.curriculum.slot, "learning_path");
    assert.equal(contract.curriculum.requiredHumanDelta, annualFactPackage.requiredHumanDelta);
    assert.deepEqual(contract.expectedGrowthImpact.realizedGrowth, [
      {
        attribute: "intelligence",
        amount: 1,
        source: "annual_learning_path",
        reason: "新的学习路径让理解和记忆能力得到稳定锻炼",
      },
    ]);
    assert.deepEqual(contract.expectedGrowthImpact.exposureGrowth, [
      {
        attribute: "intelligence",
        amount: 1,
        source: "annual_learning_path",
        reason: "学习表现更容易被师长注意",
      },
    ]);
  });

  it("records the final yearly outcome the system recognizes", () => {
    const run = createCultivationRun(12);
    const annualFactPackage = buildAnnualFactPackageForSlot("learning_path", 13);
    const response = { playerText: { body: "这一年，学习安排确实发生了变化。" } };

    const outcome = buildYearlyOutcome({ run, annualFactPackage, response });

    assert.equal(outcome.schemaVersion, "mvp.yearly_outcome.v1");
    assert.equal(outcome.outcomeId, "year_13_learning_path");
    assert.equal(outcome.age, 13);
    assert.equal(outcome.curriculum.slot, "learning_path");
    assert.equal(outcome.humanOutcome.type, "learning_path_changed");
    assert.equal(outcome.growthImpact.potentialGrowth.length, 0);
    assert.equal(outcome.topicImpact.topicProfile.topicFamily, "learning_path_shift");
    assert.equal(outcome.panelImpact.playerSummaryMode, "minimal_growth");
    assert.deepEqual(outcome.panelImpact.hiddenFields, [
      "currentPressure",
      "eventCount",
      "score",
      "storyPressure",
    ]);
  });

  it("maps body growth to root-bone growth and external attention to exposure", () => {
    const bodyGrowth = growthImpactForCurriculumSlot({
      slot: "body_growth",
      run: createCultivationRun(8),
    });
    const externalAttention = growthImpactForCurriculumSlot({
      slot: "external_attention",
      run: createCultivationRun(8),
    });

    assert.deepEqual(bodyGrowth.realizedGrowth, [
      {
        attribute: "constitution",
        amount: 2,
        source: "annual_body_growth",
        reason: "身体成长让根骨与承载力自然增强",
      },
    ]);
    assert.equal(bodyGrowth.exposureGrowth.length, 0);
    assert.equal(externalAttention.realizedGrowth.length, 0);
    assert.equal(externalAttention.exposureGrowth.reduce((sum, item) => sum + item.amount, 0), 2);
    assert.equal(externalAttention.potentialGrowth.length, 0);
  });

  it("rejects yearly events whose choices abandon the annual curriculum", () => {
    const contract = {
      curriculumSlot: "learning_path",
      requiredHumanDelta: "学习路径发生变化",
      annualOutcomeContract: buildAnnualOutcomeContract({
        run: createCultivationRun(12),
        annualFactPackage: buildAnnualFactPackageForSlot("learning_path", 13),
      }),
    };
    const response = {
      playerText: {
        title: "13 岁：学习安排改变",
        body: "这一年，学习路径发生变化，师长和家里重新安排了你的功课。",
      },
      choices: [
        { text: "趁夜继续去后山追查玉佩和洞府线索。" },
        { text: "潜入藏书阁寻找旧玉简背后的秘密。" },
        { text: "打听宗门矿场是否还会强迫孩子服役。" },
      ],
    };

    const validation = validateStoryContract(response, contract);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("choices do not support curriculum slot learning_path")));
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
  return run;
}

function buildAnnualFactPackageForSlot(slot, age) {
  return {
    age,
    lifeStage: "adolescence",
    curriculumSlot: slot,
    requiredHumanDelta: "学习路径发生变化",
    primaryDelta: {
      type: "learning_path_changed",
      eventShape: "learning_path_shift",
      title: "学习安排改变",
      description: "学习安排发生变化，日常生活因此被重新组织。",
      nextPressure: "适应新的学习节奏",
    },
    topicProfile: {
      age,
      topicFamily: "learning_path_shift",
      arena: "school_or_home",
      objectFocus: "book_or_lesson",
      institutionFocus: "family_or_teacher",
      pressureType: "learning_arrangement",
    },
  };
}
