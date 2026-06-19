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

describe("yearly outcome ledger events", () => {
  it("records an annual outcome and growth evidence event when an annual fact package is applied", () => {
    const worlds = loadMvpWorlds();
    const run = createAcceptanceRun(worlds);
    const annualFactPackage = learningPathAnnualFactPackage(run);
    const rendered = generateMockLifeEvent({ run, worlds, seed: 20260618 });

    const patched = applyAnnualFactPackageToResponse(rendered, annualFactPackage, { run });
    const events = patchToDomainEvents({ run, response: patched, source: "acceptance_test" });
    const result = transitionRun({ run, events, response: patched });
    const eventTypes = result.eventLog.events.map((event) => event.type);

    assert.ok(eventTypes.includes("annual.outcome_recorded"));
    assert.ok(eventTypes.includes("growth.evidence_added"));
    assert.ok(eventTypes.includes("growth.exposure_changed"));
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
    threeLayerFocus: {
      lifeBase: { domain: "learning_path", role: "primary" },
      worldFlavor: { element: "subtle_talent_manifestation", intensity: "low", role: "secondary" },
      consequenceEcho: { source: "", role: "background_only" },
    },
    topicProfile: {
      age,
      topicFamily: "learning_path_shift",
      arena: "school_or_home",
      objectFocus: "book_or_lesson",
      pressureType: "learning_arrangement",
      curriculumSlot: "learning_path",
    },
    forbiddenTopicProfiles: [],
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
    rankedAxes: [],
    axisSnapshot: {},
    requiredStateChanges: ["annual_curriculum_learning_path"],
    requiredTextSignals: ["learning path changes"],
    backgroundThreads: [],
    forbiddenEventShapes: [],
    eventShapeHistory: [],
    freshnessRules: {},
    enforcementRequired: false,
  };
}
