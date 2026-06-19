import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAnnualFactPackageToResponse,
  createInitialRun,
  generateMockLifeEvent,
  loadMvpWorlds,
  patchToDomainEvents,
  transitionRun,
} from "../src/index.js";

describe("annual growth impact", () => {
  it("creates fallback growth and exposure impact from the curriculum slot when AI returns no growth patch", () => {
    const worlds = loadMvpWorlds();
    const run = createAcceptanceRun(worlds);
    const before = structuredClone(run.player.growthLedger.attributes.intelligence);
    const rendered = generateMockLifeEvent({ run, worlds, seed: 20260618 });
    rendered.statePatch.growthEvidenceChanges = [];
    rendered.statePatch.exposureChanges = [];

    const patched = applyAnnualFactPackageToResponse(rendered, learningPathAnnualFactPackage(run), { run });

    assert.ok(patched.statePatch.growthEvidenceChanges.length > 0);
    assert.ok(patched.statePatch.exposureChanges.length > 0);

    const events = patchToDomainEvents({ run, response: patched, source: "acceptance_test" });
    const result = transitionRun({ run, events, response: patched });
    const after = result.nextRun.player.growthLedger.attributes.intelligence;

    assert.equal(after.realized, before.realized + 1);
    assert.equal(after.exposure, before.exposure + 1);
  });
});

function createAcceptanceRun(worlds) {
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
    allocation: {
      appearance: 4,
      intelligence: 6,
      constitution: 6,
      familyBackground: 2,
      luck: 2,
    },
  });
  run.player.age = 7;
  return run;
}

function learningPathAnnualFactPackage(run) {
  const age = (run?.player?.age ?? 0) + 1;
  return {
    schemaVersion: "mvp.annual_fact_package.v1",
    age,
    lifeStage: "childhood",
    curriculumSlot: "learning_path",
    requiredHumanDelta: "learning path changes",
    topicProfile: {
      age,
      topicFamily: "learning_path_shift",
      arena: "school_or_home",
      objectFocus: "book_or_lesson",
      pressureType: "learning_arrangement",
      curriculumSlot: "learning_path",
    },
    annualAgenda: {
      age,
      lifeStage: "childhood",
      curriculumSlot: "learning_path",
      requiredHumanDelta: "learning path changes",
      primaryDeltaShape: "learning_path_changes_life",
      primaryAxis: "lifePressure",
      secondaryAxis: "talentManifestation",
      topicFamily: "learning_path_shift",
      arena: "school_or_home",
    },
    primaryDelta: {
      domain: "education",
      type: "education_shift",
      eventShape: "learning_path_changes_life",
      title: "learning arrangement changes",
      description: "A new learning arrangement changes the year.",
      nextPressure: "learning_path_adjusted",
    },
    primaryAxis: "lifePressure",
    secondaryAxis: "talentManifestation",
    requiredStateChanges: ["annual_curriculum_learning_path"],
    forbiddenEventShapes: [],
  };
}
