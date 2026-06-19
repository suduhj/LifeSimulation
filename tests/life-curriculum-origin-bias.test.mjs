import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDefaultCurriculumState,
  recordCurriculumSlot,
  selectCurriculumSlot,
} from "../src/index.js";

describe("origin factors bias annual curriculum", () => {
  it("makes learning_path more likely without forcing every selection", () => {
    const baselineLearningCount = countSelections({ originLedger: undefined, slot: "learning_path" });
    const biasedLearningCount = countSelections({ originLedger: learningOriginLedger(), slot: "learning_path" });

    assert.ok(
      biasedLearningCount > baselineLearningCount,
      `expected learning origin to increase learning_path picks, got baseline=${baselineLearningCount}, biased=${biasedLearningCount}`,
    );
    assert.ok(
      biasedLearningCount < 20,
      `origin bias must not force every year/seed into learning_path, got ${biasedLearningCount}`,
    );
  });

  it("keeps at least three distinct slots across five years even with origin bias", () => {
    let curriculum = createDefaultCurriculumState();
    const selected = [];

    for (let age = 7; age < 12; age += 1) {
      const plan = selectCurriculumSlot({
        curriculum,
        age,
        seed: 5000 + age,
        originLedger: learningOriginLedger(),
      });
      selected.push(plan.curriculumSlot);
      curriculum = recordCurriculumSlot(curriculum, plan);
    }

    assert.ok(new Set(selected).size >= 3, `expected at least three distinct slots, got ${selected.join(",")}`);
  });
});

function countSelections({ originLedger, slot }) {
  let count = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const plan = selectCurriculumSlot({
      curriculum: matureCurriculumState(),
      age: 12,
      seed,
      originLedger,
    });
    if (plan.curriculumSlot === slot) count += 1;
  }
  return count;
}

function matureCurriculumState() {
  return {
    schemaVersion: "mvp.life_curriculum.v1",
    lifeStage: "childhood",
    coveredSlots: [
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
    ],
    recentSlots: [
      { age: 7, slot: "family_boundary" },
      { age: 8, slot: "peer_relationship" },
      { age: 9, slot: "body_growth" },
      { age: 10, slot: "village_social_life" },
      { age: 11, slot: "external_attention" },
    ],
  };
}

function learningOriginLedger() {
  return {
    schemaVersion: "mvp.opening_origin_ledger.v1",
    firstActionAge: 7,
    nodes: [
      {
        age: 3,
        stage: "curiosity",
        title: "3岁：好奇初醒",
        body: "early learning",
        originFactors: [
          {
            id: "early_learning_interest",
            category: "learning",
            strength: 2,
            affects: {
              curriculumSlots: ["learning_path", "mentor_attention"],
              attributes: ["intelligence"],
              topicFamilies: ["early_learning"],
            },
          },
        ],
      },
    ],
  };
}
