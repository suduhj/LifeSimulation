import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createInitialRun,
  getAttributePanelView,
  getMainPanelView,
  loadMvpWorlds,
  recalculateGrowthLedgerForRun,
} from "../src/index.js";

describe("player summary panel", () => {
  it("uses a minimal growth summary instead of exposing pressure and score bookkeeping", () => {
    const run = createCultivationRun(13);
    run.score = 88;
    run.eventHistory = [{ age: 12, title: "旧事件" }];
    run.worldState.storyState.activePressures = ["family_limits_access"];
    run.worldState.storyState.axes.lifePressure.level = 9;

    const view = getMainPanelView(run);
    const json = JSON.stringify(view);

    assert.equal(view.character.name, "Lin Lan");
    assert.equal(view.character.age, 13);
    assert.ok(view.summaryLines.some((line) => line.includes("Lin Lan")));
    assert.ok(view.summaryLines.some((line) => line.includes("成长阶段")));
    assert.ok(view.summaryLines.some((line) => line.includes("核心天赋")));
    assert.equal(Object.hasOwn(view, "currentPressure"), false);
    assert.equal(Object.hasOwn(view, "eventCount"), false);
    assert.equal(Object.hasOwn(view, "score"), false);
    assert.equal(Object.hasOwn(view, "storyPressure"), false);
    assert.doesNotMatch(json, /当前压力|经历事件|当前评分|剧情压力|family_limits_access/);
  });

  it("derives attribute panel values from growthLedger instead of stale display attributes", () => {
    const run = createCultivationRun(13);
    recalculateGrowthLedgerForRun(run);
    const expected = run.player.growthLedger.attributes.intelligence.effective;
    run.player.attributes.intelligence.effective = 999;
    run.player.attributes.intelligence.manifested = 999;

    const view = getAttributePanelView(run);
    const intelligence = view.groups[0].cards[1];

    assert.equal(intelligence.current, expected);
    assert.notEqual(intelligence.current, 999);
  });
});

function createCultivationRun(age) {
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = age;
  recalculateGrowthLedgerForRun(run);
  return run;
}
