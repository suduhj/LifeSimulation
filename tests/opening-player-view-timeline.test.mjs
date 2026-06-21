import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  createInitialRun,
  createWebSessionStore,
  generateOpeningSequence,
  loadMvpWorlds,
  projectPlayerSurface,
} from "../src/index.js";

const FIXED_OPENING_TITLES = [
  "出生底色",
  "依附与感知",
  "牙牙学语",
  "好奇初醒",
  "家庭边界",
  "性格成形",
  "岔路前夜",
  "鍑虹敓搴曡壊",
  "渚濋檮涓庢劅鐭",
  "鐗欑墮瀛﹁",
  "濂藉鍒濋啋",
  "瀹跺涵杈圭晫",
  "鎬ф牸鎴愬舰",
  "宀旇矾鍓嶅",
];

describe("Opening PlayerView timeline", () => {
  it("does not expose fixed opening template titles in ordinary PlayerView timeline", async () => {
    const store = createStore("session_opening_titles");
    const started = await startOrdinaryRun(store, {
      name: "林岚",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
    });
    const advanced = await store.submitAction(started.sessionId, { kind: "advance_opening" });

    const openingEntries = openingTimelineEntries(advanced.playerView);
    assert.ok(openingEntries.length >= 5, "ordinary PlayerView should contain age-by-age opening LifeNodes");
    assert.deepEqual(
      openingEntries.map((entry) => entry.age).slice(0, openingEntries.length),
      Array.from({ length: openingEntries.length }, (_, age) => age),
    );

    const serialized = JSON.stringify(openingEntries);
    for (const title of FIXED_OPENING_TITLES) {
      assert.doesNotMatch(serialized, new RegExp(escapeRegExp(title)));
    }
  });

  it("keeps the opening preview current scene at first action age while timeline starts at birth", async () => {
    const store = createStore("session_opening_current_scene", 2026062140);
    const started = await startOrdinaryRun(store, {
      worldId: "cthulhu",
      name: "LinLan",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
    });

    assert.equal(started.playerView.currentScene.nodeType, "opening_year");
    assert.ok(started.playerView.currentScene.age >= 5, `opening preview should auto-advance to first action age, got ${started.playerView.currentScene.age}`);
    assert.match(started.playerView.currentScene.body, /出生地点：/);
    assert.equal(openingBodyAtAge(started.playerView, 0) !== "", true, "ordinary timeline should still start at age 0");
  });

  it("varies 0-6 opening bodies for different characters in the same world", async () => {
    const leftStore = createStore("session_opening_left", 2026062101);
    const rightStore = createStore("session_opening_right", 2026062102);
    const left = await advanceOrdinaryRun(leftStore, {
      name: "林岚",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
    });
    const right = await advanceOrdinaryRun(rightStore, {
      name: "沈明",
      allocation: { appearance: 0, intelligence: 10, constitution: 0, familyBackground: 10, luck: 0 },
    });

    assert.ok(openingTimelineEntries(left.playerView).length >= 5, "left setup should expose age-by-age opening LifeNodes");
    assert.ok(openingTimelineEntries(right.playerView).length >= 5, "right setup should expose age-by-age opening LifeNodes");
    assert.notDeepEqual(
      openingTimelineBodies(left.playerView),
      openingTimelineBodies(right.playerView),
      "same-world opening bodies must respond to setup differences",
    );
  });

  it("uses family background to produce different age-0 birth reality", async () => {
    const lowStore = createStore("session_low_family", 2026062111);
    const highStore = createStore("session_high_family", 2026062112);
    const low = await advanceOrdinaryRun(lowStore, {
      name: "低家境",
      allocation: { appearance: 5, intelligence: 5, constitution: 5, familyBackground: 0, luck: 5 },
    });
    const high = await advanceOrdinaryRun(highStore, {
      name: "高家境",
      allocation: { appearance: 0, intelligence: 0, constitution: 0, familyBackground: 20, luck: 0 },
    });

    assert.ok(openingBodyAtAge(low.playerView, 0), "low family setup should expose age-0 opening body");
    assert.ok(openingBodyAtAge(high.playerView, 0), "high family setup should expose age-0 opening body");
    assert.notEqual(openingBodyAtAge(low.playerView, 0), openingBodyAtAge(high.playerView, 0));
  });

  it("produces different opening text across the three MVP worlds", async () => {
    const worlds = ["cultivation", "cthulhu", "wasteland"];
    const bodies = [];
    for (const worldId of worlds) {
      const store = createStore(`session_${worldId}`, 2026062120);
      const session = await advanceOrdinaryRun(store, {
        worldId,
        name: "世界测试",
        allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
      });
      assert.ok(openingTimelineEntries(session.playerView).length >= 5, `${worldId} should expose age-by-age opening LifeNodes`);
      bodies.push(openingTimelineBodies(session.playerView).join("\n"));
    }

    assert.equal(new Set(bodies).size, worlds.length);
  });

  it("ignores polluted legacy opening fallback when projecting ordinary PlayerView", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2026062130,
      playerProfile: { name: "污染测试", gender: "female", personality: "curious" },
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
    });
    const opening = generateOpeningSequence({ run, worlds, seed: 2026062131 });
    const nextRun = applyAiResponseToRun(run, opening);

    nextRun.worldState.opening.earlyLifeTimeline = [
      { age: 0, title: "出生底色", body: "POLLUTED_OPENING_FALLBACK 出生底色 后山 白鹿" },
    ];
    nextRun.eventHistory.push({
      turnId: "polluted_legacy_event",
      playerText: { body: "POLLUTED_EVENT_HISTORY 出生底色 后山 白鹿" },
    });

    const projected = projectPlayerSurface({ run: nextRun });
    const serialized = JSON.stringify(projected.view);
    assert.doesNotMatch(serialized, /POLLUTED_OPENING_FALLBACK|POLLUTED_EVENT_HISTORY|后山|白鹿|出生底色/);

    const app = fs.readFileSync("web/app.js", "utf8");
    assert.doesNotMatch(app, /openingTimelineTitleForAge/);
    assert.doesNotMatch(app, /openingTimelineBodyFallback/);
    assert.doesNotMatch(app, /state\.session\.playerView \? \[\] : buildOpeningTimeline/);
  });
});

function createStore(sessionId, seed = 2026062100) {
  return createWebSessionStore({
    worlds: loadMvpWorlds(),
    seedFactory: () => seed,
    sessionIdFactory: () => sessionId,
  });
}

async function startOrdinaryRun(store, overrides = {}) {
  const setup = {
    worldId: overrides.worldId ?? "cultivation",
    name: overrides.name ?? "林岚",
    gender: "female",
    personality: "curious",
    allocation: overrides.allocation ?? { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
  };
  const preview = store.createSetupPreview(setup);
  return store.startRun({
    ...setup,
    allocation: preview.allocation,
    keptTalentIds: preview.defaultKeptTalentIds,
    aiMode: "mock",
    endingAge: 90,
  });
}

async function advanceOrdinaryRun(store, overrides = {}) {
  const started = await startOrdinaryRun(store, overrides);
  return store.submitAction(started.sessionId, { kind: "advance_opening" });
}

function openingTimelineEntries(playerView) {
  return (playerView?.timeline ?? []).filter((entry) => entry.nodeType === "opening_year");
}

function openingTimelineBodies(playerView) {
  return openingTimelineEntries(playerView).map((entry) => entry.body);
}

function openingBodyAtAge(playerView, age) {
  return openingTimelineEntries(playerView).find((entry) => entry.age === age)?.body ?? "";
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
