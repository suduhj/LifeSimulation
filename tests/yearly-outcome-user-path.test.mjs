import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildPanelViews,
  createInitialRun,
  createPlaySession,
  loadMvpWorlds,
  replayRun,
} from "../src/index.js";
import { createWebSessionStore } from "../src/web-session-store.js";

describe("Yearly Outcome Ledger user path", () => {
  it("records yearly outcome and growth events when a started run generates the next annual event", () => {
    const worlds = loadMvpWorlds();
    const startedRun = createStartedRun(worlds);
    const beforeLedger = growthSnapshot(startedRun);
    const beforePanel = attributePanelSnapshot(buildPanelViews(startedRun).attributes);

    const session = createPlaySession({
      run: startedRun,
      worlds,
      seed: 2026062102,
      endingAge: 90,
    });

    const eventTypes = session.currentRun.eventLog.events.map((event) => event.type);
    assert.ok(eventTypes.includes("annual.outcome_recorded"), "annual events must record a YearlyOutcome");
    assert.ok(eventTypes.includes("growth.evidence_added"), "annual events must create growth evidence");
    assert.ok(
      growthChanged(beforeLedger, growthSnapshot(session.currentRun)),
      "YearlyOutcome must change growthLedger.realized or growthLedger.exposure",
    );
    assert.ok(
      panelChanged(beforePanel, attributePanelSnapshot(buildPanelViews(session.currentRun).attributes)),
      "panelViews.attributes must display the updated growthLedger values",
    );
  });

  it("updates the ordinary web attribute panel after loading a started save and generating the next annual event", async () => {
    const worlds = loadMvpWorlds();
    const savePath = path.join("tmp", "tests", `yearly-outcome-user-path-${Date.now()}.json`);
    const sessionIds = ["yearly_outcome_before", "yearly_outcome_loaded"];
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 2026062103,
      sessionIdFactory: () => sessionIds.shift(),
    });
    const preview = store.createSetupPreview(baseSetup());
    const started = await store.startRun({
      ...baseSetup(),
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });
    const beforePanel = attributePanelSnapshot(started.playerView.panels.attributes);
    const beforeLedger = growthSnapshotFromPlayerView(started.playerView);

    const saved = store.saveSession(started.sessionId, { path: savePath });
    const loaded = await store.loadSession({ path: saved.path, aiMode: "mock", endingAge: 90, seed: 2026062104 });

    assert.ok(growthChanged(beforeLedger, growthSnapshotFromPlayerView(loaded.playerView)));
    assert.ok(panelChanged(beforePanel, attributePanelSnapshot(loaded.playerView.panels.attributes)));
  });

  it("updates the ordinary web attribute panel when the player advances from opening into the first annual branch", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 2026062106,
      sessionIdFactory: () => "yearly_outcome_opening_advance",
    });
    const preview = store.createSetupPreview(baseSetup());
    const started = await store.startRun({
      ...baseSetup(),
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });
    const beforePanel = attributePanelSnapshot(started.playerView.panels.attributes);
    const beforeLedger = growthSnapshotFromPlayerView(started.playerView);

    const advanced = await store.submitAction(started.sessionId, { kind: "advance_opening" });

    assert.ok(growthChanged(beforeLedger, growthSnapshotFromPlayerView(advanced.playerView)));
    assert.ok(panelChanged(beforePanel, attributePanelSnapshot(advanced.playerView.panels.attributes)));
  });

  it("replays yearly outcome and growth events into the same growth ledger and panel values", () => {
    const worlds = loadMvpWorlds();
    const startedRun = createStartedRun(worlds);
    const session = createPlaySession({
      run: startedRun,
      worlds,
      seed: 2026062105,
      endingAge: 90,
    });

    const replayed = replayRun(session.currentRun.eventLog);
    assert.ok(replayed.worldState.storyState.yearlyOutcomes.length > 0);
    assert.deepEqual(growthSnapshot(replayed), growthSnapshot(session.currentRun));
    assert.deepEqual(
      attributePanelSnapshot(buildPanelViews(replayed).attributes),
      attributePanelSnapshot(buildPanelViews(session.currentRun).attributes),
    );
  });
});

function createStartedRun(worlds) {
  const opening = createPlaySession({
    run: createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2026062101,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
      allocation: {
        appearance: 4,
        intelligence: 6,
        constitution: 6,
        familyBackground: 2,
        luck: 2,
      },
    }),
    worlds,
    seed: 2026062101,
    endingAge: 90,
  });
  return opening.currentRun;
}

function baseSetup() {
  return {
    worldId: "cultivation",
    name: "Lin Lan",
    gender: "female",
    personality: "curious",
    allocation: { appearance: 4, intelligence: 6, constitution: 6, familyBackground: 2, luck: 2 },
  };
}

function growthSnapshot(run) {
  return Object.fromEntries(
    Object.entries(run.player.growthLedger.attributes).map(([key, attribute]) => [
      key,
      {
        realized: attribute.realized,
        effective: attribute.effective,
        exposure: attribute.exposure,
      },
    ]),
  );
}

function attributePanelSnapshot(attributePanel) {
  return Object.fromEntries(
    (attributePanel.attributes ?? []).map((attribute) => [
      attribute.name,
      {
        current: attribute.current,
        manifested: attribute.manifested,
        exposure: attribute.exposure,
      },
    ]),
  );
}

function growthSnapshotFromPlayerView(playerView) {
  return Object.fromEntries(
    (playerView?.panels?.attributes?.attributes ?? []).map((attribute) => [
      attribute.name,
      {
        realized: attribute.manifested,
        effective: attribute.current,
        exposure: attribute.exposure,
      },
    ]),
  );
}

function growthChanged(before, after) {
  return Object.keys(before).some((key) => (
    (after[key]?.realized ?? 0) > (before[key]?.realized ?? 0)
    || (after[key]?.effective ?? 0) > (before[key]?.effective ?? 0)
    || (after[key]?.exposure ?? 0) > (before[key]?.exposure ?? 0)
  ));
}

function panelChanged(before, after) {
  return Object.keys(before).some((key) => (
    (after[key]?.current ?? 0) > (before[key]?.current ?? 0)
    || (after[key]?.manifested ?? 0) > (before[key]?.manifested ?? 0)
    || (after[key]?.exposure ?? 0) > (before[key]?.exposure ?? 0)
  ));
}
