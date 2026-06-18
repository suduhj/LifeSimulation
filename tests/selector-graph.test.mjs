import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  buildPanelViews,
  createInitialRun,
  generateMockLifeEvent,
  getAttributePanelView,
  getMainPanelView,
  getStoryPanelView,
  loadMvpWorlds,
} from "../src/index.js";
import { createWebSessionStore } from "../src/web-session-store.js";

describe("selector graph panel views", () => {
  it("projects main, attribute, and story panels from the same run without raw backend fields", () => {
    const { run } = makeRunWithStory();

    const panelViews = buildPanelViews(run);

    assert.equal(panelViews.schemaVersion, "mvp.panel_views.v1");
    assert.deepEqual(panelViews.main, getMainPanelView(run));
    assert.deepEqual(panelViews.attributes, getAttributePanelView(run));
    assert.deepEqual(panelViews.story, getStoryPanelView(run));

    assert.equal(panelViews.main.schemaVersion, "mvp.main_panel_view.v1");
    assert.equal(panelViews.main.character.name, "Lin Lan");
    assert.equal(panelViews.main.character.age, run.player.age);
    assert.equal(panelViews.main.world.id, "cultivation");
    assert.ok(panelViews.main.world.label);
    assert.ok(panelViews.main.growthStage.label);
    assert.ok(Array.isArray(panelViews.main.summaryLines));

    assert.equal(panelViews.attributes.schemaVersion, "mvp.attribute_panel_view.v1");
    assert.equal(panelViews.attributes.title, "属性面板");
    assert.equal(panelViews.attributes.character.name, "Lin Lan");
    assert.equal(panelViews.attributes.attributes.length, 5);
    assert.ok(panelViews.attributes.attributes.every((attribute) => attribute.name && !attribute.attributeId && !attribute.kind));
    assert.ok(panelViews.attributes.attributes.every((attribute) => Number.isFinite(attribute.current)));
    assert.ok(panelViews.attributes.attributes.every((attribute) => attribute.peerLabel && attribute.potentialLabel && attribute.exposureLabel));

    assert.equal(panelViews.story.schemaVersion, "mvp.story_panel_view.v1");
    assert.equal(panelViews.story.title, "剧情面板");
    assert.ok(panelViews.story.timeline.length > 0);
    assert.ok(panelViews.story.recentEvents.length > 0);
    assert.ok(panelViews.story.currentPressure);

    const ordinaryJson = JSON.stringify({
      main: panelViews.main,
      attributes: panelViews.attributes,
      story: panelViews.story,
    });
    assert.doesNotMatch(ordinaryJson, /growthLedger|maturityCap|effective|lockedPotential|eventLog|hiddenInfo/);
    assert.doesNotMatch(ordinaryJson, /\b(?:appearance|intelligence|constitution|familyBackground|luck|jade_talisman|family_limits_access|cultivation_foundation)\b/);
  });

  it("updates attribute panel values after growth evidence events are reduced", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 42,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
      allocation: {
        appearance: 4,
        intelligence: 6,
        constitution: 6,
        familyBackground: 2,
        luck: 2,
      },
      keptTalentIds: ["chaos_spirit_embryo", "strong_blood", "steady_hands"],
    });
    const before = getAttributePanelView(run).attributes[2];
    const response = generateMockLifeEvent({ run, worlds, seed: 122 });
    response.statePatch.growthEvidenceChanges = [
      {
        attribute: "constitution",
        amount: 2,
        source: "selector_test_training",
        reason: "daily chores improve endurance",
        effective: 999,
      },
    ];

    const nextRun = applyAiResponseToRun(run, response);
    const after = getAttributePanelView(nextRun).attributes[2];

    assert.equal(after.realized, before.realized + 2);
    assert.ok(after.current <= after.realized);
    assert.equal(after.potential, before.potential);
    assert.equal(after.locked, Math.max(0, after.potential - after.realized));
  });

  it("serializes panelViews through the web session API so UI panels can read selectors", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260623,
      sessionIdFactory: () => "selector_session",
    });
    const preview = store.createSetupPreview({
      worldId: "cultivation",
      name: "Lin Lan",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 4, intelligence: 6, constitution: 6, familyBackground: 2, luck: 2 },
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

    assert.equal(session.panelViews.schemaVersion, "mvp.panel_views.v1");
    assert.equal(session.run.panelViews.schemaVersion, "mvp.panel_views.v1");
    assert.deepEqual(session.panelViews, session.run.panelViews);
    assert.equal(session.panelViews.main.character.name, "Lin Lan");
    assert.equal(session.panelViews.attributes.attributes.length, 5);
    assert.ok(Array.isArray(session.panelViews.story.timeline));
  });
});

function makeRunWithStory() {
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 120,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  const response = generateMockLifeEvent({ run, worlds, seed: 121 });
  response.statePatch.worldStateChanges = [
    {
      target: "storyState",
      value: {
        facts: ["jade_talisman_seen"],
        closedFacts: ["jade_talisman_first_discovery"],
        activePressures: ["family_limits_access"],
        forbiddenRepeats: ["jade_talisman_first_discovery"],
        recentEventShapes: ["family_conflict_after_jade"],
        threads: [
          {
            threadId: "jade_talisman",
            stage: "restricted",
            nextPressure: "family_limits_access",
          },
        ],
      },
    },
  ];
  return { run: applyAiResponseToRun(run, response), worlds };
}
