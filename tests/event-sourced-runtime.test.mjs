import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  buildGmView,
  buildPlayerView,
  buildPromptView,
  checkRunInvariants,
  createInitialRun,
  generateMockLifeEvent,
  loadMvpWorlds,
  loadRunFromFile,
  patchToDomainEvents,
  replayRun,
  saveRunToFile,
  transitionRun,
} from "../src/index.js";
import { buildStoryStatePatch } from "../src/story-state.js";

describe("event-sourced life runtime", () => {
  it("turns AI state patches into domain events before changing run state", () => {
    const { run, worlds, response } = makeResponseWithPatch();
    const beforeRun = structuredClone(run);

    const events = patchToDomainEvents({ run, response, source: "ai_response" });
    const result = transitionRun({ run, events, response });

    assert.deepEqual(run, beforeRun, "transitionRun must not mutate the input run");
    assert.equal(result.nextRun.player.age, response.timeSpan.ageEnd);
    assert.equal(result.nextRun.worldState.progress.cultivation_foundation, 2);
    assert.equal(
      result.nextRun.player.growthLedger.attributes.constitution.realized,
      run.player.growthLedger.attributes.constitution.realized + 1,
    );
    assert.equal(result.nextRun.memory.at(-1).type, "test_memory");
    assert.equal(result.eventLog.schemaVersion, "mvp.event_log.v1");
    assert.equal(result.nextRun.eventLog.schemaVersion, "mvp.event_log.v1");
    assert.ok(result.eventsAppended.some((event) => event.type === "age.advanced"));
    assert.ok(result.eventsAppended.some((event) => event.type === "growth.evidence_added"));
    assert.ok(result.eventsAppended.some((event) => event.type === "world.progress_changed"));
    assert.ok(result.eventsAppended.some((event) => event.type === "story.fact_closed"));
    assert.ok(result.eventsAppended.some((event) => event.type === "memory.added"));
    assert.ok(result.eventsAppended.some((event) => event.type === "run.event_recorded"));
    assert.equal(result.invariantResult.valid, true, result.invariantResult.errors.join("\n"));
    assert.equal(result.playerView.runId, run.runId);
    assert.equal(result.promptView.runId, run.runId);
    assert.equal(result.gmView.eventLog.events.length, result.nextRun.eventLog.events.length);

    void worlds;
  });

  it("routes applyAiResponseToRun through the append-only event log and deterministic replay", () => {
    const { run, response } = makeResponseWithPatch();

    const nextRun = applyAiResponseToRun(run, response);
    const replayed = replayRun(nextRun.eventLog);

    assert.equal(nextRun.eventLog.events[0].type, "run.created");
    assert.ok(nextRun.eventLog.events.length > 1);
    assert.deepEqual(replayed, nextRun);
  });

  it("rejects illegal transitions before they can become the next run", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 98,
      playerProfile: { name: "Ash", gender: "female", personality: "pragmatic" },
    });
    run.player.age = 8;

    assert.throws(
      () => transitionRun({
        run,
        events: [{
          type: "age.advanced",
          runId: run.runId,
          worldId: run.worldId,
          age: 7,
          source: "test",
          payload: { ageStart: 8, ageEnd: 7, lifeStage: "childhood" },
        }],
      }),
      /age cannot move backwards/,
    );
  });

  it("uses PlayerView and PromptView projections instead of exposing raw run internals", () => {
    const { run } = makeResponseWithPatch();
    const playerView = buildPlayerView(run);
    const promptView = buildPromptView(run);
    const gmView = buildGmView(run);

    const { schemaVersion, runId, worldId, ...ordinaryPlayerView } = playerView;
    const playerJson = JSON.stringify(ordinaryPlayerView);
    assert.equal(runId, run.runId);
    assert.equal(worldId, run.worldId);
    assert.equal(schemaVersion, "mvp.player_view.v1");
    assert.ok(Array.isArray(playerView.player.attributes), "PlayerView attributes must be a label-first array");
    assert.ok(Array.isArray(playerView.importantNPCs[0]?.relationship), "PlayerView relationships must be label-first arrays");
    assert.doesNotMatch(playerJson, /hiddenInfo|growthLedger|maturityCap|lockedPotential|effective/);
    assert.doesNotMatch(playerJson, /npc_|cultivation_foundation|run_started|karma_and_reputation|appearance|intelligence|constitution|familyBackground|luck|affinity|trust|fear|interestBinding|secretLeverage/);
    assert.match(JSON.stringify(promptView), /capabilityPackages/);
    assert.match(JSON.stringify(gmView), /hiddenInfo/);
  });

  it("loads saves from eventLog replay instead of trusting a stale run snapshot", () => {
    const { run, response } = makeResponseWithPatch();
    const nextRun = applyAiResponseToRun(run, response);
    const saveDir = path.join("tmp", "tests", `event-log-save-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(saveDir, { recursive: true });
    const savePath = path.join(saveDir, "run.json");

    saveRunToFile(nextRun, savePath);
    const saved = JSON.parse(fs.readFileSync(savePath, "utf8"));
    saved.player.age = 99;
    saved.worldState.progress.cultivation_foundation = 999;
    fs.writeFileSync(savePath, `${JSON.stringify(saved, null, 2)}\n`, "utf8");

    const loaded = loadRunFromFile(savePath);

    assert.equal(loaded.player.age, nextRun.player.age);
    assert.equal(loaded.worldState.progress.cultivation_foundation, nextRun.worldState.progress.cultivation_foundation);
    assert.deepEqual(loaded, replayRun(nextRun.eventLog));
  });

  it("reports invariant failures for projection leaks", () => {
    const { run } = makeResponseWithPatch();
    const result = checkRunInvariants({
      previousRun: run,
      run,
      playerView: { hiddenInfo: { trueRole: "secret" } },
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("PlayerView must not expose hiddenInfo")));
  });
});

function makeResponseWithPatch() {
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 97,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  const response = generateMockLifeEvent({ run, worlds, seed: 98 });
  response.statePatch.progressionChanges = [
    { target: "cultivation_foundation", amount: 2, source: "test_progress" },
  ];
  response.statePatch.growthEvidenceChanges = [
    {
      attribute: "constitution",
      amount: 1,
      source: "daily_chores",
      reason: "carrying water improved endurance",
      effective: 999,
    },
  ];
  response.statePatch.memoryUpdates = [
    { type: "test_memory", text: "The event-sourced runtime recorded this memory." },
  ];
  response.statePatch.worldStateChanges = [
    buildStoryStatePatch({
      factsAdded: ["jade_talisman_seen"],
      factsClosed: ["jade_talisman_first_discovery"],
      forbiddenRepeats: ["jade_talisman_first_discovery"],
      threadUpdates: [{ threadId: "jade_talisman", stage: "identified", nextPressure: "family_limits_access", updatedAge: response.timeSpan.ageEnd }],
    }, response.timeSpan.ageEnd),
  ];
  return { run, worlds, response };
}
