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
    assert.equal(panelViews.attributes.title, "成长显化面板");
    assert.equal(panelViews.attributes.character.name, "Lin Lan");
    assert.match(panelViews.attributes.header.characterLine, /Lin Lan · \d+岁 · /);
    assert.equal(panelViews.attributes.header.growthStage, panelViews.attributes.growthStage);
    assert.ok(panelViews.attributes.header.coreTalent);
    assert.equal(panelViews.attributes.groups.length, 3);

    const [talentGroup, fateGroup, progressGroup] = panelViews.attributes.groups;
    assert.equal(talentGroup.title, "天赋主属性");
    assert.deepEqual(
      talentGroup.cards.map((card) => card.name),
      ["颜值", "智力", "体质"],
    );
    assert.equal(fateGroup.title, "基础命格");
    assert.deepEqual(
      fateGroup.cards.map((card) => card.name),
      ["家境", "运气"],
    );
    assert.equal(progressGroup.title, "修行进度");
    assert.deepEqual(
      progressGroup.items.map((item) => item.name),
      ["境界", "根基", "功法", "资源"],
    );

    const rootBone = talentGroup.cards.find((card) => card.name === "体质");
    assert.ok(rootBone);
    assert.equal(rootBone.currentLabel, "当前表现");
    assert.equal(rootBone.manifestedLabel, "显化进度");
    assert.equal(rootBone.ageSealTitle, "年龄封存");
    assert.equal(rootBone.exposureTitle, "外界关注");
    assert.ok(Number.isFinite(rootBone.current));
    assert.ok(Number.isFinite(rootBone.potential));
    assert.ok(Number.isFinite(rootBone.manifested));
    assert.ok(Number.isFinite(rootBone.manifestedMax));
    assert.ok(Number.isFinite(rootBone.manifestedRatio));
    assert.ok(Number.isFinite(rootBone.ageSealed));
    assert.ok(rootBone.peerLabel);
    assert.ok(rootBone.potentialLabel);
    assert.ok(rootBone.ageSealLabel);
    assert.ok(rootBone.exposureLabel);
    assert.equal(rootBone.manifestedMax, rootBone.potential);
    assert.equal(rootBone.ageSealed, Math.max(0, rootBone.potential - rootBone.manifested));

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
    assert.doesNotMatch(ordinaryJson, /growthLedger|maturityCap|effective|lockedPotential|eventLog|hiddenInfo|未兑现/);
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
    const before = findAttributeCard(getAttributePanelView(run), "体质");
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
    const after = findAttributeCard(getAttributePanelView(nextRun), "体质");

    assert.equal(after.manifested, before.manifested + 2);
    assert.ok(after.current <= after.manifested);
    assert.equal(after.potential, before.potential);
    assert.equal(after.ageSealed, Math.max(0, after.potential - after.manifested));
    assert.equal(after.manifestedMax, after.potential);
  });

  it("uses the character age stage in the attribute panel header instead of always saying childhood", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 43,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
    });
    run.player.age = 18;

    const view = getAttributePanelView(run);

    assert.match(view.header.characterLine, /成年/);
    assert.doesNotMatch(view.header.characterLine, /幼年/);
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
    assert.equal(session.panelViews.attributes.groups.length, 3);
    assert.equal(session.panelViews.attributes.attributes.length, 5);
    assert.ok(findAttributeCard(session.panelViews.attributes, "体质"));
    assert.ok(Array.isArray(session.panelViews.story.timeline));
  });
});

function findAttributeCard(view, name) {
  return (view.groups ?? [])
    .flatMap((group) => group.cards ?? [])
    .find((card) => card.name === name);
}

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
