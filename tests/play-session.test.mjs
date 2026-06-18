import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  createInitialRun,
  createPlaySession,
  createPlaySessionAsync,
  formatRunSummary,
  handlePlayerInput,
  handlePlayerInputAsync,
  loadRunFromFile,
  loadMvpWorlds,
  normalizePlayerInput,
  saveRunToFile,
} from "../src/index.js";

describe("interactive play session", () => {
  it("normalizes numbered choices and command words", () => {
    assert.deepEqual(normalizePlayerInput("1"), { kind: "choice", choiceId: "choice_1" });
    assert.deepEqual(normalizePlayerInput("choice_3"), { kind: "choice", choiceId: "choice_3" });
    assert.deepEqual(normalizePlayerInput("4"), { kind: "freeform_prompt" });
    assert.deepEqual(normalizePlayerInput("4:我试着观察那个医生"), {
      kind: "freeform",
      text: "我试着观察那个医生",
    });
    assert.deepEqual(normalizePlayerInput("q"), { kind: "quit" });
    assert.deepEqual(normalizePlayerInput("退出"), { kind: "quit" });
    assert.deepEqual(normalizePlayerInput("确认"), { kind: "confirm_freeform" });
    assert.deepEqual(normalizePlayerInput("继续"), { kind: "confirm_freeform" });
    assert.deepEqual(normalizePlayerInput("执行"), { kind: "confirm_freeform" });
    assert.deepEqual(normalizePlayerInput("取消"), { kind: "cancel_freeform" });
    assert.deepEqual(normalizePlayerInput("我试着观察那个医生"), { kind: "invalid" });
  });

  it("starts a new life in the opening background phase without premature choices", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 12345,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const session = createPlaySession({ run, worlds, seed: 5000 });

    assert.equal(session.openingPhase, "background");
    assert.equal(session.inputRequired, "opening_continue");
    assert.equal(session.currentEvent.responseType, "life_event");
    assert.equal(session.currentEvent.interactionMode, "non_interactive");
    assert.equal(session.currentEvent.choices.length, 0);
    assert.equal(session.currentEvent.freeform.allowed, false);
    assert.ok(session.currentRun.player.age >= 5, `opening should auto-advance early years, got age ${session.currentRun.player.age}`);
    assert.match(session.currentEvent.playerText.body, /出生地点：/);
    assert.match(session.currentEvent.playerText.body, /命运预览：/);
    assert.match(session.currentEvent.playerText.body, /当前处境：/);
    assert.doesNotMatch(session.currentEvent.playerText.body, /身世卡|出生时间|父母\/监护人|初始重要NPC|未解释细节|早年自动推进|天赋显化|天赋初显|0岁|1岁|2岁/);
    assert.ok(Array.isArray(session.currentRun.worldState.opening?.earlyLifeTimeline));
    assert.deepEqual(
      session.currentRun.worldState.opening.earlyLifeTimeline.map((entry) => entry.age),
      Array.from({ length: session.currentRun.player.age }, (_, age) => age),
    );
    assert.ok(session.currentRun.worldState.opening.earlyLifeTimeline.every((entry) => !/[0-9零一二三四五六七八九十两]\s*岁/.test(entry.body)));
    assert.equal(session.currentRun.eventHistory.length, 1);
  });

  it("blocks choices and free-form input until the player advances past the opening", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 12346,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const session = createPlaySession({ run, worlds, seed: 5100 });

    const blockedChoice = handlePlayerInput({ session, input: "1" });
    assert.equal(blockedChoice.inputRequired, "opening_continue");
    assert.equal(blockedChoice.currentRun.eventHistory.length, session.currentRun.eventHistory.length);

    const blockedFreeform = handlePlayerInput({ session, input: "4:我想立刻调查真相" });
    assert.equal(blockedFreeform.inputRequired, "opening_continue");
    assert.equal(blockedFreeform.currentRun.eventHistory.length, session.currentRun.eventHistory.length);

    const advanced = handlePlayerInput({ session, input: "开始人生" });
    assert.equal(advanced.openingPhase, "first_branch");
    assert.equal(advanced.currentEvent.responseType, "life_event");
    assert.equal(advanced.currentEvent.interactionMode, "playable_choices");
    assert.equal(advanced.currentEvent.choices.length, 3);
    assert.equal(advanced.currentEvent.freeform.allowed, true);
  });

  it("handles a numbered choice and produces the next playable event", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2222,
      playerProfile: { name: "沈青", gender: "male" },
    });
    const opening = createPlaySession({ run, worlds, seed: 6000 });
    const session = handlePlayerInput({ session: opening, input: "start" });
    const next = handlePlayerInput({ session, input: "2" });

    assert.equal(next.quit, false);
    assert.equal(next.resolution.responseType, "action_resolution");
    assert.equal(next.currentRun.eventHistory.length, 4);
    assert.equal(next.currentEvent.responseType, "life_event");
    assert.ok(next.currentRun.memory.some((entry) => entry.type === "choice_resolution"));
  });

  it("formats player-facing run summaries with attributes, progress, NPCs, and statuses", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 2244,
      playerProfile: { name: "林岚", gender: "female" },
    });
    run.statuses.push({ id: "watched", label: "被注意", duration: "temporary", stacks: 1 });
    run.factions.push({
      id: "official_abnormal_cell",
      name: "Official Abnormal Cell",
      relationship: { attention: 8 },
      progress: {},
      flags: [],
      memory: [],
    });

    const lines = formatRunSummary(run);

    assert.ok(lines.some((line) => line.includes("角色状态")));
    assert.ok(lines.some((line) => line.includes("颜值潜力")));
    assert.ok(lines.some((line) => line.includes("世界进度")));
    assert.ok(lines.some((line) => line.includes("被注意")));
    assert.ok(lines.some((line) => line.includes("重要NPC")));
    assert.ok(lines.some((line) => line.includes("Official Abnormal Cell")));
  });

  it("uses the AI provider for async action resolution and the following event", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2323,
      playerProfile: { name: "沈青", gender: "male" },
    });
    const calls = [];
    const baseProvider = {
      mode: "test",
      async generateLifeEvent(input) {
        calls.push(["life", input.run.eventHistory.length]);
        const { generateMockLifeEvent } = await import("../src/mock-ai.js");
        return generateMockLifeEvent(input);
      },
      async generateActionResolution(input) {
        calls.push(["action", input.action.kind, input.action.choiceId]);
        const { generateChoiceResolution } = await import("../src/choice-resolution.js");
        return generateChoiceResolution({
          run: input.run,
          sourceEvent: input.sourceEvent,
          choiceId: input.action.choiceId,
          worlds: input.worlds,
          seed: input.seed,
        });
      },
    };
    const opening = await createPlaySessionAsync({ run, worlds, seed: 6100, aiProvider: baseProvider });
    assert.equal(opening.openingPhase, "background");
    const session = await handlePlayerInputAsync({ session: opening, input: "start" });
    const next = await handlePlayerInputAsync({ session, input: "2" });

    assert.deepEqual(calls.map((call) => call[0]), ["life", "action", "life"]);
    assert.equal(next.resolution.responseType, "action_resolution");
    assert.equal(next.currentEvent.responseType, "life_event");
  });

  it("falls back to safe local events when the async provider cannot generate the first branch event", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 2324,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const failingProvider = {
      mode: "test-failing",
      async generateLifeEvent() {
        throw new Error("provider unavailable");
      },
    };

    const opening = await createPlaySessionAsync({ run, worlds, seed: 6110, aiProvider: failingProvider });
    assert.equal(opening.openingPhase, "background");
    assert.equal(opening.currentRun.eventHistory.length, 1);

    const session = await handlePlayerInputAsync({ session: opening, input: "start" });

    assert.equal(session.currentEvent.responseType, "life_event");
    assert.ok(session.currentEvent.internal.validationFlags.includes("provider_fallback"));
    assert.ok(session.currentEvent.internal.validationFlags.includes("provider_fallback_life_event"));
    assert.match(session.currentEvent.internal.hiddenStateNotes, /provider unavailable/);
    assert.equal(session.currentRun.eventHistory.length, 2);
  });

  it("retries the async provider before falling back to a mock event", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 2326,
      playerProfile: { name: "林岚", gender: "female" },
    });
    let attempts = 0;
    const flakyProvider = {
      mode: "test-flaky",
      async generateLifeEvent(input) {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("transient provider error");
        }
        const { generateMockLifeEvent } = await import("../src/mock-ai.js");
        return generateMockLifeEvent(input);
      },
    };

    const opening = await createPlaySessionAsync({ run, worlds, seed: 6120, aiProvider: flakyProvider });
    const session = await handlePlayerInputAsync({ session: opening, input: "start" });

    assert.ok(attempts >= 2, "should retry the provider after the first failure");
    assert.equal(session.currentEvent.responseType, "life_event");
    assert.ok(
      !session.currentEvent.internal.validationFlags.includes("provider_fallback"),
      "a successful retry should use provider content, not the mock fallback",
    );
  });

  it("falls back to safe local action resolution and next event when the async provider fails during play", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2325,
      playerProfile: { name: "沈青", gender: "male" },
    });
    const provider = {
      mode: "test-partial-failing",
      async generateLifeEvent(input) {
        const { generateMockLifeEvent } = await import("../src/mock-ai.js");
        return generateMockLifeEvent(input);
      },
      async generateActionResolution() {
        throw new Error("action provider unavailable");
      },
    };

    const opening = await createPlaySessionAsync({ run, worlds, seed: 6120, aiProvider: provider });
    const session = await handlePlayerInputAsync({ session: opening, input: "start" });
    const next = await handlePlayerInputAsync({ session, input: "1" });

    assert.equal(next.resolution.responseType, "action_resolution");
    assert.ok(next.resolution.internal.validationFlags.includes("provider_fallback_action_resolution"));
    assert.match(next.resolution.internal.hiddenStateNotes, /action provider unavailable/);
    assert.equal(next.currentEvent.responseType, "life_event");
    assert.ok(next.currentRun.eventHistory.length >= 4);
  });

  it("falls back to a safe local ending summary when the async provider fails at ending time", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 2326,
      playerProfile: { name: "Ash", gender: "female" },
    });
    const provider = {
      mode: "test-ending-failing",
      async generateLifeEvent(input) {
        const { generateMockLifeEvent } = await import("../src/mock-ai.js");
        return generateMockLifeEvent(input);
      },
      async generateActionResolution(input) {
        const { generateChoiceResolution } = await import("../src/choice-resolution.js");
        return generateChoiceResolution({
          run: input.run,
          sourceEvent: input.sourceEvent,
          choiceId: input.action.choiceId,
          worlds: input.worlds,
          seed: input.seed,
        });
      },
      async generateEndingSummary() {
        throw new Error("ending provider unavailable");
      },
    };

    const opening = await createPlaySessionAsync({ run, worlds, seed: 6130, aiProvider: provider });
    const session = { ...opening, endingAge: opening.currentRun.player.age };
    const ended = await handlePlayerInputAsync({ session, input: "start" });

    assert.equal(ended.ended, true);
    assert.equal(ended.currentEvent.responseType, "ending_summary");
    assert.ok(ended.currentEvent.internal.validationFlags.includes("provider_fallback_ending_summary"));
    assert.match(ended.currentEvent.internal.hiddenStateNotes, /ending provider unavailable/);
    assert.equal(ended.currentRun.ending.completed, true);
  });

  it("uses the AI provider for async ending summaries", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 2366,
      playerProfile: { name: "Ash", gender: "female" },
    });
    const calls = [];
    const baseProvider = {
      mode: "test",
      async generateLifeEvent(input) {
        calls.push(["life", input.run.eventHistory.length]);
        const { generateMockLifeEvent } = await import("../src/mock-ai.js");
        return generateMockLifeEvent(input);
      },
      async generateActionResolution(input) {
        calls.push(["action", input.action.kind, input.action.choiceId]);
        const { generateChoiceResolution } = await import("../src/choice-resolution.js");
        return generateChoiceResolution({
          run: input.run,
          sourceEvent: input.sourceEvent,
          choiceId: input.action.choiceId,
          worlds: input.worlds,
          seed: input.seed,
        });
      },
      async generateEndingSummary(input) {
        calls.push(["ending", input.run.player.age, input.endingAge]);
        const { generateMvpEndingSummary } = await import("../src/ending-generator.js");
        return generateMvpEndingSummary(input);
      },
    };

    const opening = await createPlaySessionAsync({ run, worlds, seed: 6150, endingAge: 99, aiProvider: baseProvider });
    const session = await handlePlayerInputAsync({ session: opening, input: "start" });
    const endingSession = { ...session, endingAge: session.currentRun.player.age + 1 };
    const ended = await handlePlayerInputAsync({ session: endingSession, input: "1" });

    assert.deepEqual(calls.map((call) => call[0]), ["life", "action", "life", "ending"]);
    assert.equal(ended.ended, true);
    assert.equal(ended.currentEvent.responseType, "ending_summary");
    assert.equal(ended.currentEvent.interactionMode, "ending");
    assert.equal(ended.currentRun.ending.completed, true);
  });

  it("handles free-form input as an attempted action instead of guaranteed success", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 3333,
      playerProfile: { name: "Ash", gender: "female" },
    });
    const opening = createPlaySession({ run, worlds, seed: 7000 });
    const session = handlePlayerInput({ session: opening, input: "start" });
    const next = handlePlayerInput({ session, input: "4:我尝试偷偷靠近营地边缘找水" });

    assert.equal(next.resolution.responseType, "action_resolution");
    assert.ok(next.resolution.freeform.interpretedAction.includes("找水"));
    assert.ok(next.resolution.internal.validationFlags.includes("freeform_attempt"));
    assert.equal(next.currentRun.eventHistory.length, 4);
  });

  it("asks for confirmation before resolving high-risk free-form input", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 3334,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const opening = createPlaySession({ run, worlds, seed: 7010, endingAge: 99 });
    const session = handlePlayerInput({ session: opening, input: "start" });
    const riskyInput = "我直接杀死克苏鲁并统治世界";
    const clarification = handlePlayerInput({ session, input: `4:${riskyInput}` });

    assert.equal(clarification.currentEvent.responseType, "clarification_request");
    assert.equal(clarification.currentEvent.interactionMode, "freeform_confirmation");
    assert.equal(clarification.currentEvent.choices.length, 0);
    assert.equal(clarification.pendingFreeformConfirmation.inputText, riskyInput);
    assert.equal(clarification.currentRun.eventHistory.length, session.currentRun.eventHistory.length);

    const ignored = handlePlayerInput({ session: clarification, input: "1" });
    assert.equal(ignored.inputRequired, "freeform_confirmation");
    assert.equal(ignored.currentRun.eventHistory.length, session.currentRun.eventHistory.length);

    const cancelled = handlePlayerInput({ session: clarification, input: "n" });
    assert.equal(cancelled.pendingFreeformConfirmation, undefined);
    assert.equal(cancelled.currentEvent.event.eventId, session.currentEvent.event.eventId);
    assert.equal(cancelled.currentRun.eventHistory.length, session.currentRun.eventHistory.length);

    const confirmed = handlePlayerInput({ session: clarification, input: "y" });
    assert.equal(confirmed.resolution.responseType, "action_resolution");
    assert.equal(confirmed.pendingFreeformConfirmation, undefined);
    assert.ok(confirmed.currentRun.eventHistory.length > session.currentRun.eventHistory.length);
  });

  it("requires the optional fourth entry before accepting a custom free-form action", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 3434,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const opening = createPlaySession({ run, worlds, seed: 7400 });
    const session = handlePlayerInput({ session: opening, input: "start" });

    const promptOnly = handlePlayerInput({ session, input: "4" });
    const directText = handlePlayerInput({ session, input: "我尝试观察那个医生" });

    assert.equal(promptOnly.inputRequired, "freeform_prompt");
    assert.equal(promptOnly.currentRun.eventHistory.length, 2);
    assert.equal(directText.inputRequired, "invalid");
    assert.equal(directText.currentRun.eventHistory.length, 2);
  });

  it("can continue a saved run without resetting age or history", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 4444,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const opening = createPlaySession({ run, worlds, seed: 8000 });
    const started = handlePlayerInput({ session: opening, input: "start" });
    const advanced = handlePlayerInput({ session: started, input: "1" });
    const saveDir = path.join("tmp", "tests", `life-sim-continue-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(saveDir, { recursive: true });
    const savePath = path.join(saveDir, "run.json");

    saveRunToFile(advanced.currentRun, savePath);
    const loaded = loadRunFromFile(savePath);
    const continued = createPlaySession({ run: loaded, worlds, seed: 8100 });

    assert.equal(continued.currentRun.player.age, loaded.player.age + 1);
    assert.equal(continued.currentRun.eventHistory.length, loaded.eventHistory.length + 1);
    assert.equal(continued.currentRun.runId, loaded.runId);
  });

  it("avoids immediately repeating recent seed-pool event seeds when alternatives exist", () => {
    const worlds = loadMvpWorlds();
    forceSeedPoolOnly(worlds.cthulhu);
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 5555,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const opening = createPlaySession({ run, worlds, seed: 9000 });
    const first = handlePlayerInput({ session: opening, input: "start" });
    const second = handlePlayerInput({ session: first, input: "1" });

    const firstSeed = first.currentEvent.selectedSeeds[0].seedId;
    const secondSeed = second.currentEvent.selectedSeeds[0].seedId;
    assert.notEqual(secondSeed, firstSeed);
  });

  it("avoids repeating recent seed-pool life-event seeds across multiple choice resolutions", () => {
    const worlds = loadMvpWorlds();
    forceSeedPoolOnly(worlds.cthulhu);
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 7777,
      playerProfile: { name: "林岚", gender: "female" },
    });
    let session = createPlaySession({ run, worlds, seed: 9200, endingAge: 99 });
    session = handlePlayerInput({ session, input: "start" });
    const seenLifeEventSeeds = [session.currentEvent.selectedSeeds[0].seedId];

    for (let index = 0; index < 4; index += 1) {
      session = handlePlayerInput({ session, input: "1" });
      const nextSeed = session.currentEvent.selectedSeeds[0].seedId;
      assert.equal(seenLifeEventSeeds.includes(nextSeed), false);
      seenLifeEventSeeds.push(nextSeed);
    }
  });

  it("ends the MVP short run when the configured ending age is reached", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 6666,
      playerProfile: { name: "Ash", gender: "female" },
    });
    const opening = createPlaySession({ run, worlds, seed: 9100, endingAge: 2 });
    const ended = handlePlayerInput({ session: opening, input: "start" });

    assert.equal(ended.ended, true);
    assert.equal(ended.currentEvent.responseType, "ending_summary");
    assert.equal(ended.currentEvent.interactionMode, "ending");
    assert.equal(ended.currentEvent.choices.length, 0);
    assert.equal(ended.currentRun.ending.completed, true);
  });
});

function forceSeedPoolOnly(world) {
  world.config.eventGeneration.sourceWeights = {
    seed_pool: 100,
    ai_free: 0,
    player_consequence: 0,
    npc_driven: 0,
    world_progress: 0,
    natural_life: 0,
    random_disturbance: 0,
  };
}
