import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAnnualFactPackageToResponse,
  buildPanelViews,
  createInitialRun,
  generateMockLifeEvent,
  getStoryPanelView,
  loadMvpWorlds,
  patchToDomainEvents,
  transitionRun,
} from "../src/index.js";

describe("Canonical Life Runtime life nodes", () => {
  it("records annual responses as canonical LifeNode events and replays them into storyState", () => {
    const worlds = loadMvpWorlds();
    const run = createLifeNodeRun(worlds);
    const annualFactPackage = learningPathAnnualFactPackage(run);
    const rendered = generateMockLifeEvent({ run, worlds, seed: 2026061901 });
    const patched = applyAnnualFactPackageToResponse(rendered, annualFactPackage, { run });

    const events = patchToDomainEvents({ run, response: patched, source: "life_node_acceptance" });
    const lifeNodeEvents = events.filter((event) => event.type === "life.node_recorded");

    assert.equal(lifeNodeEvents.length, 1);
    assert.equal(lifeNodeEvents[0].payload.schemaVersion, "mvp.life_node.v1");
    assert.equal(lifeNodeEvents[0].payload.nodeType, "annual_event");
    assert.equal(lifeNodeEvents[0].payload.age, annualFactPackage.age);
    assert.equal(lifeNodeEvents[0].payload.title, undefined);
    assert.match(lifeNodeEvents[0].payload.paragraphs.join("\n"), /学习|安排|先生|文字|课堂|书/);
    assert.doesNotMatch(lifeNodeEvents[0].payload.paragraphs.join("\n"), /curriculumSlot|threeLayerFocus|人生课程|年度变化|旧线索|背景回响|主轴|副轴/);

    const result = transitionRun({ run, events, response: patched });
    const lifeNodes = result.nextRun.worldState.storyState.lifeNodes ?? [];

    assert.equal(lifeNodes.length, 1);
    assert.deepEqual(lifeNodes[0], lifeNodeEvents[0].payload);
  });

  it("projects story timeline from LifeNodes without playerText titles", () => {
    const worlds = loadMvpWorlds();
    const run = createLifeNodeRun(worlds);
    const annualFactPackage = learningPathAnnualFactPackage(run);
    const rendered = generateMockLifeEvent({ run, worlds, seed: 2026061902 });
    rendered.playerText.title = "8 岁：先生的新安排";
    const patched = applyAnnualFactPackageToResponse(rendered, annualFactPackage, { run });
    const events = patchToDomainEvents({ run, response: patched, source: "life_node_acceptance" });
    const result = transitionRun({ run, events, response: patched });

    const panelViews = buildPanelViews(result.nextRun);
    const storyPanel = getStoryPanelView(result.nextRun);
    const firstNode = storyPanel.timeline.at(-1);

    assert.deepEqual(panelViews.story, storyPanel);
    assert.equal(firstNode.age, annualFactPackage.age);
    assert.equal(firstNode.title, undefined);
    assert.equal(firstNode.nodeType, "annual_event");
    assert.ok(firstNode.body.length > 20);
    assert.doesNotMatch(JSON.stringify(storyPanel.timeline), /先生的新安排/);
  });

  it("deduplicates LifeNodes by nodeId and keeps action results separate from annual events", () => {
    const worlds = loadMvpWorlds();
    const run = createLifeNodeRun(worlds);
    const annualFactPackage = learningPathAnnualFactPackage(run);
    const rendered = generateMockLifeEvent({ run, worlds, seed: 2026061903 });
    const patched = applyAnnualFactPackageToResponse(rendered, annualFactPackage, { run });
    const events = patchToDomainEvents({ run, response: patched, source: "life_node_acceptance" });
    const duplicatedEvents = [...events, ...events.filter((event) => event.type === "life.node_recorded")];
    const result = transitionRun({ run, events: duplicatedEvents, response: patched });
    const lifeNodes = result.nextRun.worldState.storyState.lifeNodes ?? [];

    assert.equal(lifeNodes.length, 1);

    const actionBody = "你选择按先生的安排继续学习，这个决定让你接下来的日子变得更有规矩。";
    const actionResponse = {
      ...patched,
      turnId: "action_result_1",
      responseType: "action_resolution",
      interactionMode: "normal",
      playerText: {
        title: "选择后结果",
        body: actionBody,
      },
      choices: [],
      statePatch: {
        ...patched.statePatch,
        yearlyOutcomes: [],
        growthEvidenceChanges: [],
        exposureChanges: [],
        worldStateChanges: [],
      },
    };
    const actionEvents = patchToDomainEvents({ run: result.nextRun, response: actionResponse, source: "life_node_acceptance" });
    const actionResult = transitionRun({ run: result.nextRun, events: actionEvents, response: actionResponse });
    const allNodes = actionResult.nextRun.worldState.storyState.lifeNodes ?? [];

    assert.equal(allNodes.length, 2);
    assert.equal(allNodes[0].nodeType, "annual_event");
    assert.equal(allNodes[1].nodeType, "action_resolution");
    assert.notEqual(allNodes[0].paragraphs.join("\n"), allNodes[1].paragraphs.join("\n"));
  });
});

function createLifeNodeRun(worlds) {
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
    requiredHumanDelta: "学习路径发生变化",
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
      requiredHumanDelta: "学习路径发生变化",
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
      title: "学习安排改变",
      description: "这一年，一位可信大人改变了对你的学习或照看方式。",
      nextPressure: "learning_path_adjusted",
    },
    primaryAxis: "lifePressure",
    secondaryAxis: "talentManifestation",
    rankedAxes: [],
    axisSnapshot: {},
    requiredStateChanges: ["annual_curriculum_learning_path"],
    requiredTextSignals: ["学习路径发生变化"],
    backgroundThreads: [],
    forbiddenEventShapes: [],
    eventShapeHistory: [],
    freshnessRules: {},
    enforcementRequired: false,
  };
}
