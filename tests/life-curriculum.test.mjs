import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CHILDHOOD_CURRICULUM_SLOTS,
  createDefaultCurriculumState,
  recordCurriculumSlot,
  requiredHumanDeltaForSlot,
  selectCurriculumSlot,
} from "../src/life-curriculum.js";

describe("life curriculum director", () => {
  it("chooses varied childhood life slots instead of repeating the same yearly pressure", () => {
    let curriculum = createDefaultCurriculumState();
    const selected = [];

    for (let age = 5; age <= 10; age += 1) {
      const plan = selectCurriculumSlot({ curriculum, age, seed: 20260619 + age });
      selected.push(plan.curriculumSlot);
      curriculum = recordCurriculumSlot(curriculum, plan);
    }

    assert.equal(selected.length, 6);
    assert.ok(new Set(selected).size >= 4, `expected at least 4 slots, got ${selected.join(",")}`);
    for (let index = 1; index < selected.length; index += 1) {
      assert.notEqual(selected[index], selected[index - 1], "curriculum slot should not repeat in adjacent years");
    }
    for (const slot of selected) {
      assert.ok(CHILDHOOD_CURRICULUM_SLOTS.includes(slot));
    }
  });

  it("returns a concrete human-life delta for every curriculum slot", () => {
    for (const slot of CHILDHOOD_CURRICULUM_SLOTS) {
      const delta = requiredHumanDeltaForSlot(slot);
      assert.equal(typeof delta, "string");
      assert.ok(delta.length > 12, `${slot} should have a playable human-life requirement`);
    }
  });

  it("lets old consequences influence selection without permanently taking the primary slot", () => {
    const curriculum = {
      ...createDefaultCurriculumState(),
      coveredSlots: ["family_boundary"],
      recentSlots: [
        { age: 6, slot: "family_boundary", lifeStage: "childhood", requiredHumanDelta: "old ban repeated" },
      ],
    };

    const plan = selectCurriculumSlot({
      curriculum,
      age: 7,
      seed: 7,
      preferredDomain: "route",
      consequencePressure: 10,
    });

    assert.notEqual(plan.curriculumSlot, "family_boundary");
    assert.ok(plan.requiredHumanDelta);
  });
});
