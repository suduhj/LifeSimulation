import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  createInitialRun,
  createWebSessionStore,
  loadMvpWorlds,
  projectPlayerSurface,
  validateLifeNode,
} from "../src/index.js";

const CONTRACT_TEMPLATE_PHRASES = [
  "学习安排、师长要求或技能方向发生变化",
  "这件事首先改变的是你的日常节奏",
  "世界味道只作为背景质感",
  "主事件仍然是今年的人生变化",
  "没有盖过今年真正的人生变化",
  "对主角",
  "真正遇到的变化，落在普通生活能看见的地方",
  "眼下的选择不是重走旧场景",
];

describe("real player result repair death tests", () => {
  it("ordinary PlayerView timeline does not include the current unresolved scene", async () => {
    const session = await startCultivationSession();
    const advanced = await session.store.submitAction(session.sessionId, { kind: "advance_opening" });

    const currentNodeId = advanced.playerView.currentScene.nodeId;
    const timelineNodeIds = advanced.playerView.timeline.map((entry) => entry.nodeId);

    assert.ok(currentNodeId, "current scene must have a public node id");
    assert.equal(timelineNodeIds.includes(currentNodeId), false);
  });

  it("ordinary PlayerView never exposes annual contract-template prose", async () => {
    const session = await startCultivationSession();
    const advanced = await session.store.submitAction(session.sessionId, { kind: "advance_opening" });
    const serialized = JSON.stringify(advanced.playerView);

    for (const phrase of CONTRACT_TEMPLATE_PHRASES) {
      assert.doesNotMatch(serialized, new RegExp(escapeRegex(phrase)), phrase);
    }
  });

  it("LifeNodeValidator rejects contract-template sentences before projection", () => {
    const result = validateLifeNode({
      schemaVersion: "mvp.life_node.v1",
      nodeId: "life_node_polluted_contract_template",
      age: 7,
      nodeType: "annual_event",
      sourceEventIds: ["life.node_recorded:polluted"],
      visibleContract: {
        requiredLifeDelta: "学习安排发生变化",
        mainHumanDomain: "learning_path",
      },
      paragraphs: [
        "7岁这一年，学习安排、师长要求或技能方向发生变化。",
        "这件事首先改变的是你的日常节奏，世界味道只作为背景质感，主事件仍然是今年的人生变化。眼下的选择不是重走旧场景。",
      ],
      choices: [{ id: "choice_1", text: "按新的学习安排做下去。" }],
      visibleChanges: [],
    });

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /contract-template|template/i);
  });

  it("Player Surface rejects old assets foregrounded through visibleChanges", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2026062117,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    run.player.age = 8;
    run.worldState.storyState.lifeNodes = [safeLearningNode()];
    const previous = projectPlayerSurface({ run }).view;
    run.worldState.playerSurface = { currentView: previous, viewHistory: [previous], rejections: [] };
    run.worldState.storyState.lifeNodes.push({
      schemaVersion: "mvp.life_node.v1",
      nodeId: "life_node_visible_change_asset_bypass",
      age: 9,
      nodeType: "annual_event",
      sourceEventIds: ["life.node_recorded:polluted_visible_change"],
      visibleContract: {
        requiredLifeDelta: "学习安排发生变化",
        mainHumanDomain: "learning_path",
      },
      storyAssetBudgets: {
        jade_token: {
          roleThisYear: "background_echo",
          maxSentences: 0,
          cannotOpenScene: true,
          cannotDriveChoices: true,
          mainPressureAllowed: false,
          textSignals: ["玉片", "宗门"],
        },
      },
      paragraphs: ["先生改变了你的每日学习安排，父母也开始重新分配你在家的时间。"],
      choices: [{ id: "choice_1", text: "按新的学习安排做下去。" }],
      visibleChanges: [{ type: "item", text: "获得宗门执事留下的玉片（未鉴定）" }],
    });

    const projected = projectPlayerSurface({ run });

    assert.equal(projected.accepted, false);
    assert.deepEqual(projected.view, previous);
  });

  it("frontend current-scene timeline entries preserve nodeId for dedupe", () => {
    const appSource = fs.readFileSync("web/app.js", "utf8");

    assert.match(appSource, /function timelineEntryFromPlayerSurface[\s\S]*nodeId:\s*scene\.nodeId/);
  });
});

async function startCultivationSession() {
  const worlds = loadMvpWorlds();
  const store = createWebSessionStore({
    worlds,
    seedFactory: () => 2026062116,
    sessionIdFactory: () => "session_real_player_result_repair",
  });
  const preview = store.createSetupPreview({
    worldId: "cultivation",
    name: "林岚",
    gender: "female",
    personality: "curious",
    allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
  });
  const started = await store.startRun({
    worldId: "cultivation",
    name: "林岚",
    gender: "female",
    personality: "curious",
    allocation: preview.allocation,
    keptTalentIds: preview.defaultKeptTalentIds,
    aiMode: "mock",
    endingAge: 90,
  });
  return { store, sessionId: started.sessionId };
}

function safeLearningNode() {
  return {
    schemaVersion: "mvp.life_node.v1",
    nodeId: "life_node_safe_learning_for_visible_change_guard",
    age: 8,
    nodeType: "annual_event",
    sourceEventIds: ["life.node_recorded:safe"],
    visibleContract: {
      requiredLifeDelta: "学习安排发生变化",
      mainHumanDomain: "learning_path",
    },
    storyAssetBudgets: {},
    paragraphs: [
      "先生改变了你的每日学习安排，父母也开始重新分配你在家的时间。",
      "这次变化让你接触到更多文字和日常任务。",
    ],
    choices: [{ id: "choice_1", text: "按新的学习安排做下去。" }],
    visibleChanges: [],
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
