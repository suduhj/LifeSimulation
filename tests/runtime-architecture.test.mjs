import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

describe("event-sourced runtime architecture", () => {
  it("keeps state transitions behind DomainEvents, reducers, invariants, projections, and replay", () => {
    const runLoop = fs.readFileSync("src/run-loop.js", "utf8");
    const saveStore = fs.readFileSync("src/save-store.js", "utf8");
    const provider = fs.readFileSync("src/ai-provider.js", "utf8");
    const webStore = fs.readFileSync("src/web-session-store.js", "utf8");
    const devTools = fs.readFileSync("src/dev-tools.js", "utf8");
    const packageJson = fs.readFileSync("package.json", "utf8");

    assert.match(runLoop, /patchToDomainEvents/);
    assert.match(runLoop, /transitionRun/);
    assert.doesNotMatch(runLoop, /function applyStatePatch/);
    assert.match(saveStore, /replayRun/);
    assert.match(saveStore, /ensureEventLog/);
    assert.match(provider, /buildPromptView/);
    assert.match(webStore, /buildPlayerView/);
    assert.match(webStore, /buildGmView/);
    assert.match(devTools, /createDomainEvent/);
    assert.match(devTools, /transitionRun/);
    assert.doesNotMatch(devTools, /rebuildGrowthLedgerFromAttributes/);
    assert.match(packageJson, /"replay:bugs"/);
    assert.match(packageJson, /"test:architecture"/);
  });

  it("keeps ordinary projection data label-first instead of backend-key-first", () => {
    const playerView = fs.readFileSync("src/domain/projections/player-view.js", "utf8");

    assert.match(playerView, /buildPlayerAttributes/);
    assert.match(playerView, /Object\.entries\(run\.player\?\.attributes/);
    assert.doesNotMatch(playerView, /Object\.fromEntries\(Object\.entries\(run\.player\?\.attributes/);
    assert.match(playerView, /buildPlayerRelationship/);
    assert.match(playerView, /RELATIONSHIP_LABELS/);
    assert.doesNotMatch(playerView, /relationship:\s*npc\.relationship/);
  });
});
