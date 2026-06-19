import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import { createInitialRun, getMainPanelView, loadMvpWorlds } from "../src/index.js";

const FORBIDDEN_PLAYER_SUMMARY_LABELS = [
  "\u5f53\u524d\u538b\u529b",
  "\u7ecf\u5386\u4e8b\u4ef6",
  "\u5f53\u524d\u8bc4\u5206",
  "\u5267\u60c5\u538b\u529b",
];

describe("ordinary player summary panel", () => {
  it("does not project pressure, event count, score, or story pressure into main summary lines", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 20260619,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
    });
    run.eventHistoryCount = 7;
    run.score = 99;
    run.worldState.storyState.activePressures = [
      { threadId: "acceptance", pressureId: "acceptance_pressure", age: run.player.age },
    ];

    const view = getMainPanelView(run);
    const summaryText = view.summaryLines.join("\n");

    for (const label of FORBIDDEN_PLAYER_SUMMARY_LABELS) {
      assert.doesNotMatch(summaryText, new RegExp(label));
    }
  });

  it("keeps web renderRun ordinary summary path free of forbidden player-facing labels", () => {
    const source = fs.readFileSync("web/app.js", "utf8");
    const renderRunStart = source.indexOf("function renderRun(run)");
    const renderVisibleChangesStart = source.indexOf("function renderVisibleChanges", renderRunStart);
    assert.ok(renderRunStart >= 0, "web/app.js must contain renderRun");
    assert.ok(renderVisibleChangesStart > renderRunStart, "renderRun section must be identifiable");
    const renderRunSource = source.slice(renderRunStart, renderVisibleChangesStart);

    for (const label of FORBIDDEN_PLAYER_SUMMARY_LABELS) {
      assert.doesNotMatch(renderRunSource, new RegExp(label));
    }
    assert.doesNotMatch(renderRunSource, /renderProgressLines/);
  });
});
