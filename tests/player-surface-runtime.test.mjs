import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertPlayerSurfaceSafe,
  createInitialRun,
  createWebSessionStore,
  loadMvpWorlds,
  projectPlayerSurface,
} from "../src/index.js";

const RAW_RESPONSE_KEYS = [
  "run",
  "session",
  "currentEvent",
  "eventHistory",
  "playerText",
  "statePatch",
  "playerContract",
  "panelViews",
  "rawContract",
  "gmContract",
];

describe("Dual-Surface Life Runtime", () => {
  it("ordinary start/action responses expose only a saved PlayerView surface, not raw session state", async () => {
    const store = createStore("surface_session_plain");
    const preview = store.createSetupPreview(baseSetup());
    const started = await store.startRun({
      ...baseSetup(),
      allocation: preview.allocation,
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });

    assertOnlyPlayerViewPayload(started);
    assertPlayerSurfaceSafe(started.playerView);
    assert.equal(started.playerView.schemaVersion, "mvp.player_view.v1");

    const advanced = await store.submitAction(started.sessionId, { kind: "advance_opening" });
    assertOnlyPlayerViewPayload(advanced);
    assertPlayerSurfaceSafe(advanced.playerView);
  });

  it("projects from canonical LifeNodes and ignores polluted currentEvent, eventHistory, and opening text", () => {
    const run = buildRunWithSafeLifeNode();
    run.eventHistory.push({
      turnId: "polluted_history",
      playerText: { body: "OLD_PATH_HISTORY 后山 白鹿 curriculumSlot 主轴" },
    });
    run.worldState.opening = {
      earlyLifeTimeline: [
        { age: 0, title: "出生底色", body: "OLD_PATH_OPENING 出生底色 后山" },
      ],
    };
    const pollutedCurrentEvent = {
      responseType: "life_event",
      playerText: { body: "OLD_PATH_CURRENT_EVENT 后山 白鹿 curriculumSlot" },
      choices: [{ id: "choice_1", text: "追白鹿去后山" }],
      statePatch: { worldStateChanges: [{ target: "annualFactPackage", value: { curriculumSlot: "mentor_attention" } }] },
    };

    const projected = projectPlayerSurface({ run, currentEvent: pollutedCurrentEvent });
    assertPlayerSurfaceSafe(projected.view);

    const serialized = JSON.stringify(projected.view);
    assert.match(serialized, /学习安排发生改变/);
    assert.doesNotMatch(serialized, /OLD_PATH_CURRENT_EVENT|OLD_PATH_HISTORY|OLD_PATH_OPENING|后山|白鹿|curriculumSlot|主轴|出生底色/);
  });

  it("masks canonical backend ids before they reach the ordinary PlayerView surface", () => {
    const run = buildRunWithSafeLifeNode();
    run.worldState.storyState.lifeNodes[0].nodeId = "life_node_year_11_mentor_attention";
    run.worldState.storyState.lifeNodes[0].sourceEventIds = [
      "annual.outcome_recorded:year_11_mentor_attention",
    ];

    const projected = projectPlayerSurface({ run });

    assert.equal(projected.accepted, true);
    assertPlayerSurfaceSafe(projected.view);
    const serialized = JSON.stringify(projected.view);
    assert.doesNotMatch(serialized, /mentor_attention|annual\.outcome_recorded|life_node_year_11/);
    assert.match(projected.view.currentScene.nodeId, /^node_annual_event_8_[a-f0-9]{12}$/);
    assert.match(projected.view.sourceEventIds[0], /^source_[a-f0-9]{12}$/);
  });

  it("rejects unsafe projection output and preserves the previous safe view", () => {
    const run = buildRunWithSafeLifeNode();
    const previous = projectPlayerSurface({ run }).view;
    run.worldState.playerSurface = { currentView: previous, viewHistory: [previous], rejections: [] };
    run.worldState.storyState.lifeNodes.push({
      schemaVersion: "mvp.life_node.v1",
      nodeId: "life_node_unsafe_backend",
      age: 9,
      nodeType: "annual_event",
      sourceEventIds: ["life.node_recorded:unsafe"],
      visibleContract: { requiredLifeDelta: "mentor_attention", mainHumanDomain: "learning_path" },
      paragraphs: ["mentor_attention curriculumSlot 主轴 后山"],
      choices: [{ id: "choice_1", text: "继续追旧线索" }],
      visibleChanges: [],
    });

    const projected = projectPlayerSurface({ run });

    assert.equal(projected.accepted, false);
    assert.deepEqual(projected.view, previous);
    assert.ok(projected.rejection.errors.length > 0);
    assert.doesNotMatch(JSON.stringify(projected.view), /mentor_attention|curriculumSlot|主轴|后山/);
  });
  it("disables legacy eventHistory as an ordinary PlayerView timeline source", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2026062103,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
    });
    run.player.age = 8;
    run.worldState.storyState.lifeNodes = [];
    run.eventHistory.push({
      turnId: "old_annual_raw",
      responseType: "life_event",
      interactionMode: "playable_choices",
      timeSpan: { ageStart: 7, ageEnd: 8, yearsElapsed: 1 },
      playerText: {
        title: "8 age legacy annual title",
        body: "legacy safe looking annual text should not become ordinary timeline",
      },
      choices: [{ id: "choice_1", text: "take the old safe looking choice" }],
      event: { eventId: "old_raw", sourceType: "ai_raw" },
    });

    const projected = projectPlayerSurface({ run });

    assert.equal(projected.accepted, true);
    assert.equal(projected.view.currentScene.nodeType, "none");
    assert.deepEqual(projected.view.timeline, []);
    assert.doesNotMatch(JSON.stringify(projected.view ?? {}), /legacy safe looking annual text|legacy annual title|old safe looking choice/);
  });
});

function createStore(sessionId) {
  return createWebSessionStore({
    worlds: loadMvpWorlds(),
    seedFactory: () => 2026062101,
    sessionIdFactory: () => sessionId,
  });
}

function baseSetup() {
  return {
    worldId: "cultivation",
    name: "林岚",
    gender: "female",
    personality: "curious",
    allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
  };
}

function assertOnlyPlayerViewPayload(payload) {
  assert.ok(payload.sessionId, "ordinary payload may keep sessionId for subsequent commands");
  assert.ok(payload.playerView, "ordinary payload must include playerView");
  assert.deepEqual(Object.keys(payload).sort(), ["playerView", "sessionId"].sort());
  const serialized = JSON.stringify(payload);
  for (const key of RAW_RESPONSE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${key}"`), `ordinary payload must not include ${key}`);
  }
}

function buildRunWithSafeLifeNode() {
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 2026062102,
    playerProfile: { name: "林岚", gender: "female", personality: "curious" },
  });
  run.player.age = 8;
  run.worldState.storyState.lifeNodes = [
    {
      schemaVersion: "mvp.life_node.v1",
      nodeId: "life_node_safe_learning",
      age: 8,
      nodeType: "annual_event",
      sourceEventIds: ["life.node_recorded:safe"],
      visibleContract: {
        requiredLifeDelta: "学习安排发生改变",
        mainHumanDomain: "learning_path",
      },
      paragraphs: [
        "先生开始更认真地指导你，家人也把每日读书和帮忙的时辰重新排好。",
        "这一年真正改变的是学习安排发生改变。",
      ],
      choices: [
        { id: "choice_1", text: "认真跟着先生的新安排学习", riskLabel: "low", fuzzySuccessLabel: "难度较低" },
        { id: "choice_2", text: "问清楚先生为什么忽然重视你", riskLabel: "medium", fuzzySuccessLabel: "结果难以预料" },
        { id: "choice_3", text: "回家和父母商量新的学习节奏", riskLabel: "medium", fuzzySuccessLabel: "风险不高" },
      ],
      visibleChanges: [{ type: "growth", text: "学习安排发生改变" }],
    },
  ];
  return run;
}
