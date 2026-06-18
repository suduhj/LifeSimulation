import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createInitialRun, generateMockLifeEvent, loadMvpWorlds } from "../src/index.js";

describe("mock life event memory injection", () => {
  it("injects only real lived narrative memory, skipping run_started and bookkeeping", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 7,
      playerProfile: { name: "林岚", gender: "male", personality: "curious" },
    });
    run.player.age = 6;
    run.eventHistory = [{ responseType: "life_event", event: { sourceType: "natural_life" } }];
    run.memory = [
      { type: "run_started", text: "新的人生开始了，命运尚未展开。" },
      { type: "event", text: "Resolved choice_1 from turn_2." },
      { type: "event", text: "你在河边溺水，被一只银色小兽救起，与它的羁绊加深。" },
    ];

    const body = generateMockLifeEvent({ run, worlds, seed: 7 }).playerText.body;

    assert.doesNotMatch(body, /新的人生开始了/, "must not inject the run_started seed placeholder");
    assert.doesNotMatch(body, /Resolved|choice_1/, "must not inject English bookkeeping memory");
    assert.doesNotMatch(body, /。。/, "must not produce a doubled period after memory");
    assert.match(body, /银色小兽|羁绊/, "should carry the real lived narrative memory");
  });

  it("falls back to neutral prose when no lived narrative memory is available", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 8,
      playerProfile: { name: "林岚", gender: "male", personality: "curious" },
    });
    run.player.age = 6;
    run.eventHistory = [{ responseType: "life_event", event: { sourceType: "natural_life" } }];
    run.memory = [
      { type: "run_started", text: "新的人生开始了，命运尚未展开。" },
      { type: "event", text: "Mock event generated from natural_life." },
    ];

    const body = generateMockLifeEvent({ run, worlds, seed: 8 }).playerText.body;

    assert.doesNotMatch(body, /新的人生开始了/);
    assert.doesNotMatch(body, /Mock event generated/);
    assert.doesNotMatch(body, /。。/);
  });

  it("weaves a recently known visible NPC into the context-aware fallback", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 11,
      playerProfile: { name: "林岚", gender: "male", personality: "curious" },
    });
    run.player.age = 6;
    run.eventHistory = [{ responseType: "life_event", event: { sourceType: "natural_life" } }];
    run.memory = [{ type: "event", text: "你在河边溺水，被一只银色小兽救起。" }];
    run.importantNPCs = [{
      id: "npc_silver",
      importance: "important",
      role: "companion",
      roleTags: ["companion"],
      playerVisible: { label: "银团", publicRole: "灵兽伙伴", discovered: true },
      knownIdentity: { role: "银团", certainty: "surface_only" },
      relationship: {},
    }];

    const body = generateMockLifeEvent({ run, worlds, seed: 11 }).playerText.body;

    assert.match(body, /银团/, "should reference the recent visible NPC");
  });

  it("does not reference an undiscovered hidden NPC in the fallback body", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 12,
      playerProfile: { name: "林岚", gender: "male", personality: "curious" },
    });
    run.player.age = 6;
    run.eventHistory = [{ responseType: "life_event", event: { sourceType: "natural_life" } }];
    run.importantNPCs = [{
      id: "npc_secret",
      importance: "important",
      role: "cult_member",
      roleTags: ["cult"],
      templateId: "cult_member",
      playerVisible: { discovered: false },
      knownIdentity: {},
      relationship: {},
    }];

    const body = generateMockLifeEvent({ run, worlds, seed: 12 }).playerText.body;

    assert.doesNotMatch(body, /cult|npc_secret|仍和你在一起/, "must not leak or reference an undiscovered hidden NPC");
  });
});
