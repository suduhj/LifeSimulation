import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  assessFreeformClarification,
  createInitialRun,
  generateFreeformClarificationRequest,
  generateChoiceResolution,
  generateMvpEndingSummary,
  generateMockLifeEvent,
  loadMvpWorlds,
  loadRunFromFile,
  runMockTurns,
  saveRunToFile,
  validateAiResponse,
  validateRunState,
} from "../src/index.js";

describe("MVP engine skeleton", () => {
  it("loads the three MVP worlds with their core runtime pools", () => {
    const worlds = loadMvpWorlds();

    assert.deepEqual(Object.keys(worlds).sort(), ["cthulhu", "cultivation", "wasteland"]);
    for (const world of Object.values(worlds)) {
      assert.equal(world.config.primaryAxis, "age");
      assert.ok(world.identitySeeds.identitySeeds.length >= 8);
      assert.ok(world.talentPool.talents.length >= 20);
      assert.ok(world.eventSeeds.eventSeeds.length >= 20);
      assert.ok(world.npcTemplates.templates.length >= 12);
      assert.ok(world.factionSeeds.factions.length >= 8);
      assert.ok(world.locationSeeds.locations.length >= 10);
    }
  });

  it("creates a deterministic initial run with identity, draw-5-keep-3 talents, and attribute layers", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 12345,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
      allocation: {
        appearance: 4,
        intelligence: 8,
        constitution: 3,
        familyBackground: 2,
        luck: 3,
      },
    });

    assert.equal(run.worldId, "cthulhu");
    assert.equal(run.player.name, "林岚");
    assert.equal(run.player.gender, "female");
    assert.equal(run.player.personality.id, "curious");
    assert.equal(run.player.personality.label, "好奇探索");
    assert.equal(typeof run.player.personality.aiHint, "string");
    assert.equal(run.setup.personality.id, "curious");
    assert.equal(run.setup.talentDraw.length, 5);
    assert.equal(run.player.talents.length, 3);
    assert.equal(run.player.age, 0);
    assert.equal(run.player.attributes.intelligence.base, 8);
    assert.ok(run.player.attributes.intelligence.potential >= 8);
    assert.ok(run.player.attributes.intelligence.manifested <= run.player.attributes.intelligence.potential);
    assert.equal(run.player.growthLedger.schemaVersion, "mvp.growth_ledger.v1");
    assert.equal(run.player.growthLedger.attributes.intelligence.base, 8);
    assert.equal(run.player.attributes.intelligence.manifested, run.player.growthLedger.attributes.intelligence.effective);
    assert.ok(run.worldState.progress);
    assert.ok(run.importantNPCs.length >= 3);
    assert.ok(run.importantNPCs.length <= 5);
    assert.ok(run.importantNPCs[0].relationship);
    assert.equal(run.importantNPCs[0].memory.length >= 1, true);
    assert.ok(run.memory.length >= 1);
  });

  it("generates a mock playable life event that passes the AI response validator", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 777,
      playerProfile: { name: "沈青", gender: "male" },
    });

    const response = generateMockLifeEvent({ run, worlds, seed: 888 });
    const validation = validateAiResponse(response);

    assert.equal(validation.valid, true, validation.errors.join("\n"));
    assert.equal(response.responseType, "life_event");
    assert.equal(response.interactionMode, "playable_choices");
    assert.equal(response.choices.length, 3);
    assert.ok(response.visibleChanges.length >= 1);
    assert.ok(response.selectedSeeds.length >= 1);
  });

  it("rejects normal playable events that do not provide three rich choices", () => {
    const validation = validateAiResponse({
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: "wasteland",
      runId: "run_test",
      turnId: "turn_test",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "短事件", body: "一次很短的事件。", visibleChanges: [] },
      event: { eventId: "short_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [{ id: "choice_1", text: "只给一个选项是不够的", intentTags: ["test"], fuzzySuccessLabel: "未知", riskLabel: "low" }],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: [] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "test", validationFlags: [], hiddenStateNotes: "" },
    });

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("playable_choices")));
  });

  it("rejects playable events that look like thin event cards instead of life branches", () => {
    const response = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: "cultivation",
      runId: "run_test",
      turnId: "turn_test",
      timeSpan: { ageStart: 3, ageEnd: 3, yearsElapsed: 0, pace: "scene_or_short_stage", paceReasonKey: "test" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: {
        title: "3 岁：人生片段",
        body: "枫溪镇爆发瘟疫，母亲面临玉片交易抉择。",
        visibleChanges: [],
      },
      event: { eventId: "thin_card_event", lifeStage: "childhood", riskLabel: "medium", summaryTags: ["test"] },
      choices: [
        {
          id: "choice_1",
          text: "告诉母亲，可以用玉片换丹药，先救镇上的孩子，但提醒她小心那道士的来历。",
          intentTags: ["family"],
          fuzzySuccessLabel: "说服母亲交易并保持警惕",
          riskLabel: "medium",
        },
        {
          id: "choice_2",
          text: "劝母亲不要交出玉片，自己强撑病体，根据母亲教的草药知识去后山寻找替代药材。",
          intentTags: ["exploration"],
          fuzzySuccessLabel: "在后山找到替代药材或线索",
          riskLabel: "high",
        },
        {
          id: "choice_3",
          text: "假装顺从，等母亲和道士交易时偷偷跟踪道士，看他离开后去了哪里，同时记下玉片上的符文。",
          intentTags: ["stealth"],
          fuzzySuccessLabel: "尝试跟踪并获取信息",
          riskLabel: "high",
        },
      ],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "medium", judgmentFactors: [] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "test", validationFlags: [], hiddenStateNotes: "" },
    };

    const validation = validateAiResponse(response);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("concrete event title")));
    assert.ok(validation.errors.some((error) => error.includes("choice context")));
    assert.ok(validation.errors.some((error) => error.includes("fuzzySuccessLabel")));
  });

  it("rejects AI responses with non-numeric time spans before they can corrupt a run", () => {
    const validation = validateAiResponse({
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: "cthulhu",
      runId: "run_test",
      turnId: "turn_test",
      timeSpan: { ageStart: 0, ageEnd: "one", yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "测试事件", body: "这是一个用于验证时间跨度的测试事件。", visibleChanges: [] },
      event: { eventId: "bad_time_span", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [
        { id: "choice_1", text: "选择一个足够丰富的测试行动文本。", intentTags: ["test"], fuzzySuccessLabel: "较高", riskLabel: "low" },
        { id: "choice_2", text: "选择第二个足够丰富的测试行动文本。", intentTags: ["test"], fuzzySuccessLabel: "一般", riskLabel: "low" },
        { id: "choice_3", text: "选择第三个足够丰富的测试行动文本。", intentTags: ["test"], fuzzySuccessLabel: "较低", riskLabel: "low" },
      ],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: [] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "test", validationFlags: [], hiddenStateNotes: "" },
    });

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("timeSpan.ageEnd")));
  });

  it("rejects playable AI responses that treat the optional free-form entry as choice_4", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 2026,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const response = generateMockLifeEvent({ run, worlds, seed: 2027 });
    response.choices[2] = {
      ...response.choices[2],
      id: "choice_4",
      text: "把自由输入行动错误地当成 AI 生成的第四个选项。",
    };

    const validation = validateAiResponse(response);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("choice_4 is reserved")));
  });

  it("accepts free-form clarification requests with confirmation mode and zero choices", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 2028,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const sourceEvent = generateMockLifeEvent({ run, worlds, seed: 2029 });
    const inputText = "我直接杀死克苏鲁并统治世界";
    const assessment = assessFreeformClarification({
      run,
      sourceEvent,
      inputText,
    });
    const clarification = generateFreeformClarificationRequest({
      run,
      sourceEvent,
      inputText,
      assessment,
      seed: 2030,
    });
    const validation = validateAiResponse(clarification);

    assert.equal(assessment.clarificationNeeded, true);
    assert.equal(validation.valid, true, validation.errors.join("\n"));
    assert.equal(clarification.responseType, "clarification_request");
    assert.equal(clarification.interactionMode, "freeform_confirmation");
    assert.equal(clarification.choices.length, 0);
    assert.equal(clarification.freeform.clarificationNeeded, true);
  });

  it("applies accepted mock events to advance the run state", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 2468,
      playerProfile: { name: "林岚", gender: "female" },
    });

    const advanced = runMockTurns({ run, worlds, turns: 2, seed: 3000 });

    assert.equal(advanced.player.age, 2);
    assert.equal(advanced.player.lifeStage, "childhood");
    assert.equal(advanced.eventHistory.length, 2);
    assert.ok(advanced.memory.length >= 3);
    assert.equal(advanced.worldState.progress.truth_exposure, 2);
    assert.equal(advanced.eventHistory[0].responseType, "life_event");
  });

  it("resolves a player choice into an action response with relationship and memory changes", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 8642,
      playerProfile: { name: "沈青", gender: "male" },
    });
    const eventResponse = generateMockLifeEvent({ run, worlds, seed: 8643 });
    const afterEvent = runMockTurns({ run, worlds, turns: 1, seed: 8643 });

    const resolution = generateChoiceResolution({
      run: afterEvent,
      sourceEvent: eventResponse,
      choiceId: "choice_2",
      worlds,
      seed: 9000,
    });
    const validation = validateAiResponse(resolution);

    assert.equal(validation.valid, true, validation.errors.join("\n"));
    assert.equal(resolution.responseType, "action_resolution");
    assert.equal(resolution.interactionMode, "non_interactive");
    assert.equal(resolution.choices.length, 0);
    assert.ok(resolution.statePatch.relationshipChanges.length >= 1);

    const advanced = runMockTurns({ run: afterEvent, worlds, turns: 0 });
    const applied = applyAiResponseToRun(advanced, resolution);

    assert.equal(applied.eventHistory.length, 2);
    assert.ok(applied.importantNPCs[0].relationship.affinity !== afterEvent.importantNPCs[0].relationship.affinity);
    assert.ok(applied.memory.some((entry) => entry.type === "choice_resolution"));
  });

  it("applies broad state patches for manifestation, exposure, NPCs, factions, statuses, and world state", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 5050,
      playerProfile: { name: "林岚", gender: "female" },
      allocation: {
        appearance: 4,
        intelligence: 8,
        constitution: 3,
        familyBackground: 2,
        luck: 3,
      },
    });
    const response = generateMockLifeEvent({ run, worlds, seed: 5051 });
    response.statePatch.manifestationChanges = [{ target: "intelligence", amount: 3 }];
    response.statePatch.exposureChanges = [
      { target: "luck", amount: 12 },
      { target: "official_attention", amount: 5 },
    ];
    response.statePatch.importantNPCUpdates = [
      {
        npcId: "npc_dynamic_observer",
        create: true,
        role: "watcher",
        knownIdentity: { role: "watcher", certainty: "unknown" },
        relationship: { affinity: 1, trust: 0, fear: 5, interestBinding: 15, secretLeverage: 0 },
        flags: ["newly_noticed"],
        memory: { type: "first_seen", text: "Noticed the player character during an abnormal event." },
      },
      {
        npcId: run.importantNPCs[0].id,
        relationshipChanges: { trust: 4 },
        hiddenInfo: { suspicion: "rising" },
        flags: ["saw_abnormal_detail"],
      },
    ];
    response.statePatch.factionChanges = [
      {
        factionId: "official_abnormal_cell",
        name: "Official Abnormal Cell",
        type: "official",
        relationshipChanges: { attention: 8 },
        progressChanges: { investigation: 2 },
        flags: ["monitoring"],
        memory: { type: "file_opened", text: "A low-priority file was opened." },
      },
    ];
    response.statePatch.statusChanges = [
      {
        target: "player",
        statusId: "watched",
        label: "被远处注意",
        duration: "temporary",
        stackDelta: 1,
        effects: { exposureRisk: 2 },
      },
      {
        target: run.importantNPCs[0].id,
        statusId: "uneasy",
        label: "不安",
        duration: "temporary",
      },
    ];
    response.statePatch.worldStateChanges = [
      { target: "flag", value: "first_official_trace" },
      { target: "city.abnormalRumorLevel", amount: 2 },
    ];

    const applied = applyAiResponseToRun(run, response);

    assert.equal(
      applied.player.growthLedger.attributes.intelligence.realized,
      run.player.growthLedger.attributes.intelligence.realized + 3,
    );
    assert.equal(applied.player.attributes.intelligence.manifested, applied.player.growthLedger.attributes.intelligence.effective);
    assert.ok(
      applied.player.growthLedger.attributes.intelligence.effective <= applied.player.growthLedger.attributes.intelligence.maturityCap,
      "manifested/effective must obey the maturity cap even after manifestationChanges",
    );
    assert.equal(applied.player.attributes.luck.exposure, run.player.attributes.luck.exposure + 12);
    assert.equal(applied.exposure.official_attention, 5);
    assert.ok(applied.worldState.flags.includes("first_official_trace"));
    assert.equal(applied.worldState.city.abnormalRumorLevel, 2);
    assert.ok(applied.statuses.some((status) => status.id === "watched" && status.stacks === 1));
    assert.ok(applied.importantNPCs[0].statuses.some((status) => status.id === "uneasy"));
    assert.equal(applied.importantNPCs[0].relationship.trust, run.importantNPCs[0].relationship.trust + 4);
    assert.equal(applied.importantNPCs[0].hiddenInfo.suspicion, "rising");
    assert.ok(applied.importantNPCs.some((npc) => npc.id === "npc_dynamic_observer"));
    assert.equal(applied.factions[0].id, "official_abnormal_cell");
    assert.equal(applied.factions[0].relationship.attention, 8);
    assert.equal(applied.factions[0].progress.investigation, 2);
  });

  it("generates and applies an ending summary with score, tags, and final run state", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 97531,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const advanced = runMockTurns({ run, worlds, turns: 6, seed: 98000 });

    const ending = generateMvpEndingSummary({ run: advanced, worlds, seed: 99000, endingAge: 6 });
    const validation = validateAiResponse(ending);
    const applied = applyAiResponseToRun(advanced, ending);

    assert.equal(validation.valid, true, validation.errors.join("\n"));
    assert.equal(ending.responseType, "ending_summary");
    assert.equal(ending.interactionMode, "ending");
    assert.equal(ending.choices.length, 0);
    assert.equal(applied.ending.completed, true);
    assert.equal(applied.worldState.ending.id, applied.ending.id);
    assert.ok(applied.score > 0);
    assert.ok(applied.memory.some((entry) => entry.type === "ending_summary"));
  });

  it("rejects ending summaries that do not write the ending into the authoritative state patch", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 97532,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const ending = generateMvpEndingSummary({ run, worlds, seed: 99001, endingAge: 0 });
    ending.statePatch.worldStateChanges = [];

    const validation = validateAiResponse(ending);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("target ending")));
  });

  it("saves and loads a run as portable JSON", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 1357,
      playerProfile: { name: "Ash", gender: "female" },
    });
    const advanced = runMockTurns({ run, worlds, turns: 1, seed: 1400 });
    const saveDir = path.join("tmp", "tests", `life-sim-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(saveDir, { recursive: true });
    const savePath = path.join(saveDir, "run.json");

    saveRunToFile(advanced, savePath);
    const loaded = loadRunFromFile(savePath);

    assert.deepEqual(loaded, advanced);
    assert.equal(loaded.player.age, 1);
    assert.equal(loaded.eventHistory.length, 1);
  });

  it("validates save files before accepting them", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 4242,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const validation = validateRunState(run);

    assert.equal(validation.valid, true, validation.errors.join("\n"));

    const invalidRun = structuredClone(run);
    invalidRun.setup.allocation.luck = 99;
    const invalidValidation = validateRunState(invalidRun);

    assert.equal(invalidValidation.valid, false);
    assert.ok(invalidValidation.errors.some((error) => error.includes("setup.allocation must total 20")));
    assert.throws(() => saveRunToFile(invalidRun, path.join("tmp", "tests", "invalid-run.json")), /saveRunToFile input failed run validation/);

    const missingPersonalityRun = structuredClone(run);
    delete missingPersonalityRun.player.personality;
    const missingPersonalityValidation = validateRunState(missingPersonalityRun);

    assert.equal(missingPersonalityValidation.valid, false);
    assert.ok(missingPersonalityValidation.errors.some((error) => error.includes("player.personality")));
  });

  it("rejects malformed or structurally invalid save files on load", () => {
    const saveDir = path.join("tmp", "tests", `invalid-save-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(saveDir, { recursive: true });
    const badJsonPath = path.join(saveDir, "bad-json.json");
    const badShapePath = path.join(saveDir, "bad-shape.json");

    fs.writeFileSync(badJsonPath, "{ not json", "utf8");
    fs.writeFileSync(
      badShapePath,
      JSON.stringify({
        schemaVersion: "mvp.run.v1",
        runId: "run_bad",
        worldId: "cthulhu",
        player: {},
      }),
      "utf8",
    );

    assert.throws(() => loadRunFromFile(badJsonPath), /Could not parse save file/);
    assert.throws(() => loadRunFromFile(badShapePath), /failed run validation/);
  });
});

function emptyStatePatch() {
  return {
    attributeChanges: [],
    manifestationChanges: [],
    exposureChanges: [],
    relationshipChanges: [],
    importantNPCUpdates: [],
    factionChanges: [],
    progressionChanges: [],
    worldStateChanges: [],
    memoryUpdates: [],
    scoreDelta: 0,
  };
}
