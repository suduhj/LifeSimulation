import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnnualFactPackage,
  buildPromptContract,
  createInitialRun,
  loadMvpWorlds,
  projectPlayerSurface,
  validateLifeNode,
} from "../src/index.js";
import { validateSceneCompliance } from "../src/scene-compliance-validator.js";
import { createDefaultAssetLedger, recordAssetSpotlight } from "../src/story-asset-lifecycle.js";

describe("Story Asset Budget repair", () => {
  it("carries recently primary old assets into the annual agenda as budgeted background only", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds, 8);
    run.worldState.storyState.assetLedger = recordAssetSpotlight(createDefaultAssetLedger(), {
      age: 8,
      assetId: "white_deer",
      role: "primary_driver",
    });

    const facts = buildAnnualFactPackage({ run, worlds, seed: 2026062109 });

    assert.equal(facts.assetRoles.white_deer.role, "background_only");
    assert.equal(facts.assetRoles.white_deer.forbiddenRoles.includes("primary_driver"), true);
    assert.equal(facts.annualAgenda.assetRoles.white_deer.role, "background_only");
    assert.equal(facts.annualAgenda.storyAssetBudget.white_deer.roleThisYear, "background_echo");
    assert.equal(facts.annualAgenda.storyAssetBudget.white_deer.maxSentences, 1);
    assert.equal(facts.annualAgenda.storyAssetBudget.white_deer.cannotOpenScene, true);
    assert.equal(facts.annualAgenda.storyAssetBudget.white_deer.cannotDriveChoices, true);
  });

  it("rejects a background-only old asset when it becomes the annual main pressure", () => {
    const scene = buildBudgetedScene();
    const response = cleanLearningResponse();
    response.playerText.body = [
      "This year your learning path changed because the village teacher began giving you a different daily schedule.",
      "The old deer became the main pressure of the whole year, and every adult treated that old clue as the real reason your life moved.",
    ].join("\n\n");

    const result = validateSceneCompliance(response, scene);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /main pressure|main event|old deer/i);
  });

  it("rejects LifeNodes whose story asset budgets are violated before PlayerView projection", () => {
    const node = pollutedBudgetLifeNode();

    const result = validateLifeNode(node);

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /asset budget|first paragraph|choice/i);
  });

  it("does not allow a polluted budget-violating LifeNode to reach ordinary PlayerView", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds, 9);
    run.worldState.storyState.lifeNodes = [safeLearningLifeNode()];
    const previous = projectPlayerSurface({ run }).view;
    run.worldState.playerSurface = { currentView: previous, viewHistory: [previous], rejections: [] };
    run.worldState.storyState.lifeNodes.push(pollutedBudgetLifeNode());

    const projected = projectPlayerSurface({ run });

    assert.equal(projected.accepted, false);
    assert.deepEqual(projected.view, previous);
    assert.doesNotMatch(JSON.stringify(projected.view), /old deer|old booklet|back mountain/i);
  });

  it("keeps PromptContract budget constraints sanitized but present for the renderer", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds, 9);
    const contract = buildPromptContract({
      run,
      observableScene: {
        schemaVersion: "mvp.observable_scene.v1",
        age: 10,
        mainScene: {
          requiredVisibleDelta: "A trusted adult changes the learning arrangement.",
          openingBeat: "The teacher asks the child to stay after class.",
        },
        backgroundEchoes: [
          {
            label: "old deer rumor",
            maxSentences: 1,
            firstParagraphAllowed: false,
            choiceDriverAllowed: false,
            titleAllowed: false,
            textSignals: ["old deer"],
          },
        ],
        choices: [],
      },
    });

    const serialized = JSON.stringify(contract);

    assert.equal(contract.visibleScene.backgroundEchoes[0].label, "old deer rumor");
    assert.equal(contract.visibleScene.backgroundEchoes[0].maxSentences, 1);
    assert.equal(contract.visibleScene.backgroundEchoes[0].cannotOpenScene, true);
    assert.equal(contract.visibleScene.backgroundEchoes[0].cannotDriveChoices, true);
    assert.doesNotMatch(serialized, /assetRoles|primary_driver|storyState|annualFactPackage|curriculumSlot/);
  });
});

function createCultivationRun(worlds, age) {
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260621,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = age;
  return run;
}

function buildBudgetedScene() {
  return {
    schemaVersion: "mvp.observable_scene.v1",
    age: 10,
    title: "Learning changes",
    mainScene: {
      requiredVisibleDelta: "Learning path changes",
      lifeBaseRole: "primary",
    },
    backgroundEchoes: [
      {
        label: "old deer",
        textSignals: ["old deer"],
        maxMentions: 1,
        maxSentences: 1,
        titleAllowed: false,
        firstParagraphAllowed: false,
        choiceDriverAllowed: false,
        mainPressureAllowed: false,
      },
    ],
    choices: [],
    forbiddenText: [],
  };
}

function cleanLearningResponse() {
  return {
    playerText: {
      title: "10 age: learning changes",
      body: "This year your learning path changed.",
    },
    choices: [
      { id: "choice_1", text: "Follow the new learning arrangement." },
      { id: "choice_2", text: "Ask the teacher why the arrangement changed." },
      { id: "choice_3", text: "Discuss the new schedule with family." },
    ],
  };
}

function safeLearningLifeNode() {
  return {
    schemaVersion: "mvp.life_node.v1",
    nodeId: "life_node_safe_learning_asset_budget",
    age: 9,
    nodeType: "annual_event",
    sourceEventIds: ["life.node_recorded:safe"],
    visibleContract: {
      requiredLifeDelta: "Learning path changes",
      mainHumanDomain: "learning_path",
    },
    storyAssetBudgets: {},
    paragraphs: [
      "The teacher changed your daily learning arrangement and asked you to stay after class.",
      "The real change this year is the way adults arrange your study and chores.",
    ],
    choices: [
      { id: "choice_1", text: "Follow the new learning arrangement.", riskLabel: "low", fuzzySuccessLabel: "easy" },
      { id: "choice_2", text: "Ask the teacher why the arrangement changed.", riskLabel: "medium", fuzzySuccessLabel: "uncertain" },
      { id: "choice_3", text: "Talk with family about the new schedule.", riskLabel: "medium", fuzzySuccessLabel: "uncertain" },
    ],
    visibleChanges: [],
  };
}

function pollutedBudgetLifeNode() {
  return {
    schemaVersion: "mvp.life_node.v1",
    nodeId: "life_node_polluted_old_asset_budget",
    age: 10,
    nodeType: "annual_event",
    sourceEventIds: ["life.node_recorded:polluted"],
    visibleContract: {
      requiredLifeDelta: "Learning path changes",
      mainHumanDomain: "learning_path",
    },
    storyAssetBudgets: {
      white_deer: {
        roleThisYear: "background_echo",
        maxSentences: 1,
        cannotOpenScene: true,
        cannotDriveChoices: true,
        textSignals: ["old deer", "back mountain", "old booklet"],
      },
    },
    paragraphs: [
      "The old deer opens the year and pulls you back toward the back mountain before the learning change is established.",
      "The old deer becomes the main event again, while the teacher and family fade into the background.",
    ],
    choices: [
      { id: "choice_1", text: "Follow the old deer to the back mountain.", riskLabel: "medium", fuzzySuccessLabel: "uncertain" },
      { id: "choice_2", text: "Search for the old booklet near the old deer trail.", riskLabel: "medium", fuzzySuccessLabel: "uncertain" },
      { id: "choice_3", text: "Ask whether the old deer is hiding the real clue.", riskLabel: "medium", fuzzySuccessLabel: "uncertain" },
    ],
    visibleChanges: [],
  };
}
