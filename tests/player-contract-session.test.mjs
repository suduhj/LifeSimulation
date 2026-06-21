import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertPlayerSurfaceSafe,
  createWebSessionStore,
  loadMvpWorlds,
} from "../src/index.js";

describe("web session Player Surface serialization", () => {
  it("serializes only a safe PlayerView for ordinary UI consumption", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 2026062006,
      sessionIdFactory: () => "session_player_contract",
    });
    const preview = store.createSetupPreview({
      worldId: "cultivation",
      name: "Lin Lan",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
    });

    const session = await store.startRun({
      worldId: "cultivation",
      name: "Lin Lan",
      gender: "female",
      personality: "curious",
      allocation: preview.allocation,
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });

    assert.deepEqual(Object.keys(session).sort(), ["playerView", "sessionId"].sort());
    assert.ok(session.playerView, "ordinary session payload must include playerView");
    assertPlayerSurfaceSafe(session.playerView);
    const serialized = JSON.stringify(session);
    assert.doesNotMatch(serialized, /currentEvent|eventHistory|playerText|statePatch|annualFactPackage|curriculumSlot|threeLayerFocus|debug|gmView|playerContract|rawContract|panelViews/);
  });
});
