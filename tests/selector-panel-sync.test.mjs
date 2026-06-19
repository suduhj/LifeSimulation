import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAnnualFactPackageToResponse,
  buildPanelViews,
  createInitialRun,
  generateMockLifeEvent,
  loadMvpWorlds,
  patchToDomainEvents,
  transitionRun,
} from "../src/index.js";

describe("selector panel sync after yearly outcome", () => {
  it("reads the updated growth ledger values in panelViews.attributes", () => {
    const worlds = loadMvpWorlds();
    const run = createAcceptanceRun(worlds);
    const beforePanel = buildPanelViews(run).attributes;
    const beforeIntelligence = beforePanel.groups[0].cards[1];
    const rendered = generateMockLifeEvent({ run, worlds, seed: 20260618 });
    const patched = applyAnnualFactPackageToResponse(rendered, learningPathAnnualFactPackage(run), { run });
    const events = patchToDomainEvents({ run, response: patched, source: "acceptance_test" });

    const result = transitionRun({ run, events, response: patched });
    const afterPanel = buildPanelViews(result.nextRun).attributes;
    const afterIntelligence = afterPanel.groups[0].cards[1];

    assert.equal(afterIntelligence.manifested, beforeIntelligence.manifested + 1);
    assert.equal(afterIntelligence.exposure, beforeIntelligence.exposure + 1);
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
