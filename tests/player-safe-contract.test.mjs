import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  assertPlayerContractSafe,
  buildGmContract,
  buildPanelViews,
  buildPlayerContract,
  buildRawContract,
  createInitialRun,
  loadMvpWorlds,
  safePlayerContractFallback,
  validatePlayerContract,
} from "../src/index.js";

const FORBIDDEN_KEYS = [
  "currentEvent",
  "eventHistory",
  "playerText",
  "statePatch",
  "annualFactPackage",
  "curriculumSlot",
  "threeLayerFocus",
  "debug",
  "gmView",
];

const FORBIDDEN_TERMS = [
  "mentor_attention",
  "curriculumSlot",
  "\u4eba\u751f\u8bfe\u7a0b",
  "\u80cc\u666f\u56de\u54cd",
  "\u4e3b\u8f74",
  "\u526f\u8f74",
  "\u65e7\u7ebf\u7d22",
];

describe("Player-Safe Contract System", () => {
  it("builds a player contract that drops raw event fields and polluted backend terms", () => {
    const run = buildRun();
    const dirtyEvent = buildDirtyEvent(run);
    const contract = buildPlayerContract({
      run,
      currentEvent: dirtyEvent,
      panelViews: buildPanelViews(run),
    });

    assertPlayerContractSafe(contract);
    const serialized = JSON.stringify(contract);

    assert.equal(contract.schemaVersion, "mvp.player_contract.v1");
    for (const key of FORBIDDEN_KEYS) {
      assert.doesNotMatch(serialized, new RegExp(`"${key}"`));
    }
    for (const term of [...FORBIDDEN_TERMS, "\u540e\u5c71", "\u767d\u9e7f"]) {
      assert.doesNotMatch(serialized, new RegExp(term));
    }
  });

  it("carries ordinary interaction state inside the player contract for clean scenes", () => {
    const run = buildRun();
    const event = buildCleanEvent(run);
    const contract = buildPlayerContract({
      run,
      currentEvent: event,
      panelViews: buildPanelViews(run),
    });

    assertPlayerContractSafe(contract);
    assert.equal(contract.currentScene.interactionMode, "playable_choices");
    assert.equal(contract.currentScene.freeformAllowed, true);
    assert.equal(contract.choices.length, 3);
  });

  it("rejects unsafe player contracts and provides a safe fallback", () => {
    const run = buildRun();
    const unsafeContract = {
      schemaVersion: "mvp.player_contract.v1",
      header: { title: "Lin Lan" },
      currentScene: {
        body: "mentor_attention curriculumSlot \u65e7\u7ebf\u7d22",
      },
      choices: [],
      timeline: [],
      panels: {},
      visibleChanges: [],
      statePatch: {},
    };

    const validation = validatePlayerContract(unsafeContract);
    assert.equal(validation.valid, false);
    assert.throws(() => assertPlayerContractSafe(unsafeContract), /PlayerContract unsafe/);

    const fallback = safePlayerContractFallback({ run, reason: "unit_test" });
    assertPlayerContractSafe(fallback);
    assert.doesNotMatch(JSON.stringify(fallback), /mentor_attention|statePatch|curriculumSlot/);
  });

  it("keeps raw and GM contracts allowed to contain raw debugging material", () => {
    const run = buildRun();
    const dirtyEvent = buildDirtyEvent(run);

    const raw = buildRawContract({
      currentEvent: dirtyEvent,
      rawResponse: dirtyEvent,
      validatorReports: [{ message: "mentor_attention may exist in raw" }],
    });
    const gm = buildGmContract({ run, currentEvent: dirtyEvent, rawResponse: dirtyEvent });

    assert.match(JSON.stringify(raw), /playerText|statePatch|mentor_attention|curriculumSlot/);
    assert.match(JSON.stringify(gm), /currentEvent|playerText|statePatch|mentor_attention|curriculumSlot/);
  });

  it("ships player and GM contract schemas as explicit gates", () => {
    const playerSchema = JSON.parse(fs.readFileSync("schemas/player-contract.schema.json", "utf8"));
    const gmSchema = JSON.parse(fs.readFileSync("schemas/gm-contract.schema.json", "utf8"));

    assert.equal(playerSchema.$id, "https://lifesimulation.local/schemas/player-contract.schema.json");
    assert.equal(playerSchema.additionalProperties, false);
    assert.ok(playerSchema.required.includes("header"));
    assert.ok(playerSchema.required.includes("panels"));
    assert.equal(gmSchema.$id, "https://lifesimulation.local/schemas/gm-contract.schema.json");
  });
});

function buildRun() {
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 2026062001,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = 9;
  run.worldState.storyState.lifeNodes = [
    {
      schemaVersion: "mvp.life_node.v1",
      nodeId: "life_node_safe_learning",
      age: 8,
      nodeType: "annual_event",
      visibleContract: {
        requiredLifeDelta: "\u5b66\u4e60\u5b89\u6392\u53d1\u751f\u6539\u53d8",
        mainHumanDomain: "learning_path",
      },
      paragraphs: ["\u5148\u751f\u5f00\u59cb\u66f4\u8ba4\u771f\u5730\u7167\u770b\u4f60\u7684\u5b66\u4e60\u3002"],
      choices: [],
      visibleChanges: [],
    },
  ];
  return run;
}

function buildCleanEvent(run) {
  const dirty = buildDirtyEvent(run);
  return {
    ...dirty,
    playerText: {
      title: "9 \u5c81\uff1a\u65b0\u7684\u5b66\u4e60\u5b89\u6392",
      body: "\u5148\u751f\u5f00\u59cb\u66f4\u8ba4\u771f\u5730\u6307\u5bfc\u4f60\uff0c\u5bb6\u4eba\u4e5f\u91cd\u65b0\u5b89\u6392\u4f60\u7684\u65e5\u5e38\u3002",
      visibleChanges: [],
    },
    choices: [
      { id: "choice_1", text: "\u6309\u7167\u65b0\u5b89\u6392\u8ba4\u771f\u5b66\u4e60", riskLabel: "low", fuzzySuccessLabel: "\u96be\u5ea6\u8f83\u4f4e" },
      { id: "choice_2", text: "\u95ee\u6e05\u5148\u751f\u4e3a\u4ec0\u4e48\u66f4\u5173\u5fc3\u4f60", riskLabel: "medium", fuzzySuccessLabel: "\u7ed3\u679c\u96be\u4ee5\u9884\u6599" },
      { id: "choice_3", text: "\u56de\u5bb6\u548c\u7236\u6bcd\u5546\u91cf\u8fd9\u4efd\u5b89\u6392", riskLabel: "medium", fuzzySuccessLabel: "\u98ce\u9669\u4e0d\u9ad8" },
    ],
    visibleChanges: [],
    freeform: { allowed: true },
    statePatch: { growthEvidenceChanges: [] },
  };
}

function buildDirtyEvent(run) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: "turn_dirty_player_contract",
    timeSpan: { ageStart: 8, ageEnd: 9, yearsElapsed: 1, pace: "yearly" },
    interactionMode: "playable_choices",
    playerText: {
      title: "9 \u5c81\uff1amentor_attention",
      body: "curriculumSlot=mentor_attention\u3002\u4eca\u5e74\u4e3b\u8f74\u53c8\u662f\u65e7\u7ebf\u7d22\uff1a\u53bb\u540e\u5c71\u8ffd\u767d\u9e7f\u3002",
      visibleChanges: ["\u80cc\u666f\u56de\u54cd"],
    },
    choices: [
      { id: "choice_1", text: "\u56f4\u7ed5\u65e7\u7ebf\u7d22\u53bb\u540e\u5c71", riskLabel: "medium", fuzzySuccessLabel: "\u7ed3\u679c\u4e0d\u660e" },
    ],
    freeform: { allowed: false },
    visibleChanges: [{ type: "note", target: "story", text: "\u526f\u8f74\uff1a\u767d\u9e7f" }],
    statePatch: {
      growthEvidenceChanges: [],
      worldStateChanges: [{ target: "annualFactPackage", value: { curriculumSlot: "mentor_attention" } }],
    },
  };
}
