import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAiProvider, createDeepSeekProvider, createInitialRun, createOpenAiCompatibleProvider, generateMvpEndingSummary, loadMvpWorlds, runMockTurns } from "../src/index.js";

describe("AI provider adapter", () => {
  it("uses mock provider by default-compatible mode", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 123,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const provider = createAiProvider({ mode: "mock" });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 456 });

    assert.equal(provider.mode, "mock");
    assert.equal(event.responseType, "life_event");
    assert.equal(event.choices.length, 3);
  });

  it("uses mock provider for action resolution through the shared provider interface", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 124,
      playerProfile: { name: "林岚", gender: "female" },
    });
    const provider = createAiProvider({ mode: "mock" });
    const sourceEvent = await provider.generateLifeEvent({ run, worlds, seed: 456 });
    const actionText = "我试着观察家人的异常反应";
    const resolution = await provider.generateActionResolution({
      run,
      sourceEvent,
      action: { kind: "freeform", text: actionText },
      worlds,
      seed: 789,
    });

    assert.equal(resolution.responseType, "action_resolution");
    assert.equal(resolution.freeform.interpretedAction, actionText);
    assert.equal(resolution.interactionMode, "non_interactive");
    assert.equal(resolution.choices.length, 0);
  });

  it("requires DEEPSEEK_API_KEY for deepseek mode", () => {
    assert.throws(() => createDeepSeekProvider({ env: {}, fetchImpl: async () => ({}) }), /DEEPSEEK_API_KEY/);
  });

  it("rejects placeholder DeepSeek keys copied from dotenv examples", () => {
    assert.throws(
      () => createDeepSeekProvider({ env: { DEEPSEEK_API_KEY: "your_deepseek_api_key_here" }, fetchImpl: async () => ({}) }),
      /real API key/,
    );
  });

  it("requires explicit OpenAI-compatible provider configuration", () => {
    assert.throws(
      () => createOpenAiCompatibleProvider({ env: { OPENAI_COMPATIBLE_API_KEY: "unit_live_key_123" }, fetchImpl: async () => ({}) }),
      /OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_MODEL/,
    );
  });

  it("calls DeepSeek chat completions and validates returned JSON", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 321,
      playerProfile: { name: "Ash", gender: "female", personality: "pragmatic" },
    });
    const expected = buildValidLifeEventResponse(run, {
      turnId: "turn_ai_test",
      title: "测试事件",
      body: "这是一个用于测试 DeepSeek 适配器的事件。",
      validationFlag: "deepseek_test",
    });
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(expected) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local", DEEPSEEK_MODEL: "deepseek-test" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 654 });
    const body = JSON.parse(request.init.body);
    const systemPrompt = body.messages.find((message) => message.role === "system").content;
    const userPrompt = JSON.parse(body.messages.find((message) => message.role === "user").content);

    assert.equal(request.url, "https://example.deepseek.local/chat/completions");
    assert.equal(request.init.headers.Authorization, "Bearer unit_live_key_123");
    assert.equal(body.model, "deepseek-test");
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.deepEqual(body.thinking, { type: "disabled" });
    assertNoMojibake(systemPrompt);
    assert.match(systemPrompt, /多世界 AI 人生模拟器/);
    assert.match(systemPrompt, /玩家自由输入只是尝试行动/);
    assert.match(systemPrompt, /choices 必须恰好 3 个/);
    assert.match(systemPrompt, /第 4 项自由行动由 UI 提供/);
    assert.match(systemPrompt, /开放式软种子池/);
    assert.match(systemPrompt, /不能当成固定剧本或事件白名单/);
    assert.equal(userPrompt.eventGeneration.poolMode, "open_soft_seed_pool");
    assert.equal(userPrompt.eventGeneration.seedStrictness, "soft");
    assert.equal(userPrompt.eventGeneration.aiAdaptation, "must_adapt");
    assert.equal(userPrompt.eventGeneration.allowAiFreeGenerationWhenNoSeedFits, true);
    assert.equal(userPrompt.run.player.personality.id, "pragmatic");
    assert.equal(typeof userPrompt.eventGeneration.sourceInstruction, "string");
    assert.ok(userPrompt.world.factionSeeds.length >= 8);
    assert.ok(userPrompt.world.locationSeeds.length >= 10);
    assert.equal("eventSeedCandidates" in userPrompt.world, false);
    assert.equal(event.responseType, "life_event");
  });

  it("asks the provider to repair invalid AI JSON once before accepting it", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 341,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "缺少选项", body: "这个响应缺少足够的选项。", visibleChanges: [] },
      event: { eventId: "invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [{ id: "choice_1", text: "只有一个选项，不能满足正常可玩事件要求。", intentTags: ["test"], fuzzySuccessLabel: "成功率较高", riskLabel: "low" }],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "turn_repaired",
      title: "修复后的事件",
      body: "这是一次由协议修复后恢复的事件。",
      validationFlag: "json_repair_test",
    });
    const requests = [];
    const fetchImpl = async (url, init) => {
      requests.push({ url, init });
      const content = requests.length === 1 ? invalid : repaired;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(content) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 342 });
    const repairBody = JSON.parse(requests[1].init.body);
    const repairSystemPrompt = repairBody.messages.find((message) => message.role === "system").content;
    const repairUserPrompt = JSON.parse(repairBody.messages.find((message) => message.role === "user").content);

    assert.equal(requests.length, 2);
    assertNoMojibake(repairSystemPrompt);
    assert.match(repairSystemPrompt, /JSON 协议修复器/);
    assert.match(repairSystemPrompt, /不得绕过引擎直接修改权威存档/);
    assert.equal(repairUserPrompt.task, "repair_ai_event_response_json");
    assert.equal(repairUserPrompt.targetResponseType, "life_event");
    assert.ok(repairUserPrompt.validationErrors.some((error) => error.includes("exactly 3 choices")));
    assert.equal(event.turnId, "turn_repaired");
    assert.equal(event.choices.length, 3);
  });

  it("backfills choice intentTags and riskLabel so valid-but-incomplete DeepSeek output skips repair", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 360,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    // DeepSeek often returns rich, player-good prose but drops the engine-only choice fields
    // (intentTags/riskLabel). Before the normalizer backfilled them, validation rejected the
    // whole turn and it degraded into the age-aware mock mid-run. This must now pass on the
    // first call without a repair round-trip.
    const incomplete = buildValidLifeEventResponse(run, {
      turnId: "turn_incomplete_choice_fields",
      title: "缺字段的选项",
      body: "这个响应叙事完整，但每个选项都漏掉了 intentTags 和 riskLabel。",
      validationFlag: "incomplete_choice_fields_test",
    });
    for (const choice of incomplete.choices) {
      delete choice.intentTags;
      delete choice.riskLabel;
    }

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(incomplete) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 361 });

    assert.equal(count, 1, "valid-but-incomplete choices must pass on the first call without a repair round-trip");
    assert.equal(event.turnId, "turn_incomplete_choice_fields");
    assert.equal(event.choices.length, 3);
    for (const choice of event.choices) {
      assert.ok(Array.isArray(choice.intentTags) && choice.intentTags.length > 0, "intentTags must be backfilled as a non-empty array");
      assert.equal(typeof choice.riskLabel, "string");
      assert.ok(choice.riskLabel.length > 0, "riskLabel must be backfilled as a non-empty string");
    }
  });

  it("backfills a memory consequence when a DeepSeek action_resolution leaves statePatch and visibleChanges empty", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 400,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    run.player.age = 15;
    const sourceEvent = buildValidLifeEventResponse(run, {
      turnId: "turn_bug_b_source",
      title: "15 岁：营地的清晨",
      body: "营地的大人们为脚印和水桶争执，你攒下的旧世界零件还藏在外套里。",
      validationFlag: "bug_b_source",
    });
    // A vivid resolution that forgets to encode any consequence: emptyStatePatch() has all arrays
    // empty + scoreDelta 0, and visibleChanges is []. Schema-valid but non-consequential (Bug B).
    const resolution = buildValidLifeEventResponse(run, {
      turnId: "turn_bug_b_resolution",
      title: "零件与短刀",
      body: "你把攒下的旧世界零件拿去和黑市中间人交换，他答应给你一把短刀，但要你先帮他打探一个守卫的底细。",
      validationFlag: "bug_b_resolution",
    });
    resolution.responseType = "action_resolution";
    resolution.timeSpan = { ageStart: 15, ageEnd: 15, yearsElapsed: 0, pace: "scene_moment" };
    resolution.playerText.title = "15 岁：零件与短刀";

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(resolution) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const result = await provider.generateActionResolution({
      run,
      sourceEvent,
      action: { kind: "freeform", text: "我把捡到的旧世界零件偷偷攒起来，想换一把能防身的武器。" },
      worlds,
      seed: 401,
    });

    assert.equal(count, 1, "a non-consequential resolution must be floored in place, not sent for a repair round-trip");
    const floored = result.statePatch.memoryUpdates.find((update) => update.type === "free_action");
    assert.ok(floored, "a free_action memory must be backfilled so the run remembers the action");
    assert.match(floored.text, /旧世界零件/, "the backfilled memory must summarize the player's actual action");
    assert.equal(isResolutionConsequential(result), true, "the floored resolution must satisfy the consequence contract");
  });

  it("does not add a floor consequence when an action_resolution already has one", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 402,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    run.player.age = 9;
    const sourceEvent = buildValidLifeEventResponse(run, {
      turnId: "turn_consequence_source",
      title: "9 岁：深夜的低语",
      body: "你假装睡着，听见父母在隔壁压低声音说话。",
      validationFlag: "consequence_source",
    });
    const resolution = buildValidLifeEventResponse(run, {
      turnId: "turn_has_consequence",
      title: "9 岁：偷听之后",
      body: "你屏住呼吸偷听，母亲察觉了你的动静，对你的态度悄悄变了。",
      validationFlag: "has_consequence",
    });
    resolution.responseType = "action_resolution";
    resolution.timeSpan = { ageStart: 9, ageEnd: 9, yearsElapsed: 0, pace: "scene_moment" };
    resolution.playerText.title = "9 岁：偷听之后";
    resolution.visibleChanges = [{ type: "relationship", target: "guardian", text: "与母亲的关系略有变化" }];

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(resolution) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const result = await provider.generateActionResolution({
      run,
      sourceEvent,
      action: { kind: "freeform", text: "我假装睡着，偷听父母深夜压低声音在说什么。" },
      worlds,
      seed: 403,
    });

    assert.equal(count, 1);
    assert.equal(result.statePatch.memoryUpdates.some((update) => update.type === "free_action"), false, "must not inject a floor memory when the AI already provided a consequence");
    assert.deepEqual(result.visibleChanges, [{ type: "relationship", target: "guardian", text: "与母亲的关系略有变化" }]);
  });

  it("normalizes prose-only visibleChanges after provider repair before validation", async () => {    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 345,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_visible_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "可见变化错误", body: "第一次响应故意缺少可见变化结构。", visibleChanges: [] },
      event: { eventId: "visible_invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "turn_visible_repaired",
      title: "修复后的事件",
      body: "修复响应保留了故事内容，但把可见变化写成了字符串。",
      validationFlag: "visible_repair_test",
    });
    repaired.visibleChanges = ["真相揭露 +1", { amount: 2 }];
    repaired.playerText.visibleChanges = ["真相揭露 +1"];

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 346 });

    assert.equal(event.turnId, "turn_visible_repaired");
    assert.deepEqual(event.visibleChanges[0], { type: "note", target: "run", text: "真相揭露 +1" });
    assert.equal(event.visibleChanges[1].type, "note");
    assert.equal(event.visibleChanges[1].target, "run");
    assert.equal(event.playerText.visibleChanges[0].type, "note");
  });

  it("normalizes a missing statePatch after provider repair into a no-op patch", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 347,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_missing_patch_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "补丁错误", body: "第一次响应故意缺少选择。", visibleChanges: [] },
      event: { eventId: "missing_patch_invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "turn_missing_patch_repaired",
      title: "修复后的事件",
      body: "修复响应忘记了 statePatch，适配器应当补成 no-op patch。",
      validationFlag: "state_patch_repair_test",
    });
    delete repaired.statePatch;

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 348 });

    assert.equal(event.turnId, "turn_missing_patch_repaired");
    assert.deepEqual(event.statePatch.attributeChanges, []);
    assert.deepEqual(event.statePatch.worldStateChanges, []);
    assert.equal(event.statePatch.scoreDelta, 0);
  });

  it("normalizes repaired interactionMode and playerText envelope shape", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 349,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_envelope_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "外壳错误", body: "第一次响应故意缺少选择。", visibleChanges: [] },
      event: { eventId: "envelope_invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "turn_envelope_repaired",
      title: "被提升的标题",
      body: "修复响应把 playerText 写成字符串。",
      validationFlag: "envelope_repair_test",
    });
    repaired.interactionMode = "interactive";
    repaired.title = "被提升的标题";
    repaired.playerText = "修复响应把正文直接放成字符串，但其他选择与补丁仍然有效。这天，母亲和父亲因为你最近的细微变化低声商量，家里人都在权衡该如何照看你，眼下的处境就这样自然推到了面前。";

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 350 });

    assert.equal(event.interactionMode, "playable_choices");
    assert.equal(event.playerText.title, "1 岁：被提升的标题");
    assert.match(event.playerText.body, /修复响应把正文直接放成字符串/);
    assert.doesNotMatch(event.playerText.body, /AI 返回了事件结果|缺少正文结构|不是凭空出现的事件卡/);
    assert.equal(event.choices.length, 3);
  });

  it("restores safe protocol envelope fields from the prompt after provider repair", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 353,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_envelope_missing_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "外壳缺失", body: "第一次响应故意缺少选择。", visibleChanges: [] },
      event: { eventId: "envelope_missing_invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "will_be_removed",
      title: "外壳修复事件",
      body: "修复响应只有核心叙事字段，缺少部分协议外壳。",
      validationFlag: "envelope_prompt_repair_test",
    });
    delete repaired.worldId;
    delete repaired.runId;
    delete repaired.turnId;
    delete repaired.timeSpan;
    delete repaired.selectedSeeds;
    delete repaired.event;
    delete repaired.visibleChanges;
    delete repaired.internal;

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 354 });

    assert.equal(event.worldId, run.worldId);
    assert.equal(event.runId, run.runId);
    assert.equal(event.turnId, "turn_life_event_354");
    assert.equal(event.timeSpan.ageStart, 0);
    assert.equal(event.timeSpan.ageEnd, 1);
    assert.deepEqual(event.selectedSeeds, []);
    assert.equal(event.event.eventId, "life_event_354");
    assert.deepEqual(event.visibleChanges, []);
    assert.ok(event.internal.validationFlags.includes("provider_repair_normalized"));
    assert.equal(event.choices.length, 3);
  });

  it("normalizes malformed repaired timeSpan fields from provider repair", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 357,
      playerProfile: { name: "RepairTester", gender: "female", personality: "curious" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_malformed_timespan_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "Malformed time", body: "The first response intentionally misses playable choices.", visibleChanges: [] },
      event: { eventId: "malformed_timespan_invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "turn_malformed_timespan_repaired",
      title: "重新修复的时间跨度事件",
      body: "修复响应返回了格式错误的时间跨度字段，适配器需要补回一个有效的协议外壳。",
      validationFlag: "timespan_repair_test",
    });
    repaired.timeSpan = {
      ageStart: "",
      ageEnd: "1",
      yearsElapsed: "1",
      pace: "",
    };

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 358 });

    assert.equal(event.timeSpan.ageStart, 0);
    assert.equal(event.timeSpan.ageEnd, 1);
    assert.equal(event.timeSpan.yearsElapsed, 1);
    assert.equal(event.timeSpan.pace, "yearly");
  });

  it("fills missing fixed protocol envelope fields without inventing choices", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 355,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_fixed_envelope_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "固定字段缺失", body: "第一次响应故意缺少选择。", visibleChanges: [] },
      event: { eventId: "fixed_envelope_invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "turn_fixed_envelope_repaired",
      title: "重新得到的标题",
      body: "envelope-repair",
      validationFlag: "fixed_envelope_repair_test",
    });
    delete repaired.schemaVersion;
    delete repaired.freeform;

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 356 });

    assert.equal(event.schemaVersion, "mvp.ai_event_response.v1");
    assert.equal(event.playerText.title, "1 岁：重新得到的标题");
    assert.ok(event.playerText.body.trim().length >= 70);
    assert.equal(event.freeform.allowed, true);
    assert.equal(event.choices.length, 3);
  });

  it("rejects a degenerate narrative body so the session falls back to mock", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 357,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const invalid = {
      ...buildValidLifeEventResponse(run, {
        turnId: "turn_degenerate_invalid",
        title: "缺正文",
        body: "x",
        validationFlag: "degenerate_test",
      }),
      choices: [],
    };
    const repaired = buildValidLifeEventResponse(run, {
      turnId: "turn_degenerate_repaired",
      title: "缺正文",
      body: "x",
      validationFlag: "degenerate_test",
    });
    delete repaired.playerText; // provider could not produce a usable narrative body

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });

    // No fabricated filler: a missing narrative body must fail validation and reject, which lets
    // safeGenerateLifeEvent fall back to the age-aware mock generator instead of showing placeholder text.
    await assert.rejects(
      () => provider.generateLifeEvent({ run, worlds, seed: 358 }),
      /failed validation after repair: .*playerText\.body/,
    );
  });

  it("fails clearly when provider JSON repair is still invalid", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 351,
      playerProfile: { name: "Ash", gender: "female", personality: "pragmatic" },
    });
    const invalid = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_still_invalid",
      timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
      selectedSeeds: [],
      interactionMode: "playable_choices",
      playerText: { title: "仍然无效", body: "这个响应仍然没有三个选项。", visibleChanges: [] },
      event: { eventId: "still_invalid_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
      choices: [],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
      visibleChanges: [],
      statePatch: emptyStatePatch(),
      internal: { judgmentSummary: "invalid", validationFlags: ["test"], hiddenStateNotes: "" },
    };
    const fetchImpl = async () => ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: JSON.stringify(invalid) } }] };
      },
    });

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });

    await assert.rejects(
      () => provider.generateLifeEvent({ run, worlds, seed: 352 }),
      /DeepSeek AI response failed validation after repair: playable_choices responses must provide exactly 3 choices/,
    );
  });

  it("calls OpenAI-compatible chat completions without DeepSeek-only request fields", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 421,
      playerProfile: { name: "Yun", gender: "male", personality: "ambitious" },
    });
    const expected = buildValidLifeEventResponse(run, {
      turnId: "turn_openai_compatible_test",
      title: "测试事件",
      body: "这是一个用于测试通用 OpenAI-compatible 适配器的事件。",
      validationFlag: "openai_compatible_test",
    });
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(expected) } }] };
        },
      };
    };

    const provider = createAiProvider({
      mode: "openai_compatible",
      env: {
        OPENAI_COMPATIBLE_API_KEY: "compatible-key",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.compatible.local/v1/",
        OPENAI_COMPATIBLE_MODEL: "compatible-model",
      },
      fetchImpl,
    });
    const event = await provider.generateLifeEvent({ run, worlds, seed: 876 });
    const body = JSON.parse(request.init.body);
    const userPrompt = JSON.parse(body.messages.find((message) => message.role === "user").content);
    const systemPrompt = body.messages.find((message) => message.role === "system").content;

    assert.equal(provider.mode, "openai-compatible");
    assert.equal(request.url, "https://example.compatible.local/v1/chat/completions");
    assert.equal(request.init.headers.Authorization, "Bearer compatible-key");
    assert.equal(body.model, "compatible-model");
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.equal("thinking" in body, false);
    assertNoMojibake(systemPrompt);
    assert.match(systemPrompt, /玩家自由输入只是尝试行动/);
    assert.equal(userPrompt.eventGeneration.poolMode, "open_soft_seed_pool");
    assert.equal(userPrompt.run.player.personality.id, "ambitious");
    assert.equal(event.responseType, "life_event");
  });

  it("calls DeepSeek to resolve player actions with source-event context", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 654,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const sourceEvent = buildValidLifeEventResponse(run, {
      turnId: "turn_source",
      title: "平静表面",
      body: "生活里出现了一点不协调。",
      validationFlag: "source_test",
    });
    const expected = {
      ...sourceEvent,
      responseType: "action_resolution",
      turnId: "turn_action_test",
      timeSpan: { ageStart: 0, ageEnd: 0, yearsElapsed: 0, pace: "scene_moment" },
      playerText: {
        title: "0 岁：观察后的回响",
        body: "你刚才选择了观察异常，而不是立刻把它说成确定的真相。这天，家人和身边的人都在讨论眼前的小变化，母亲担心你年纪太小，父亲则觉得可以让你先学会观察。\n\n因为此前的生活已经留下了一些细节，当前处境不是凭空出现的事件卡，而是顺着家庭反应、环境压力和你的性格自然推到眼前。\n\n你现在能做的还有限，只能在继续观察、询问家人和谨慎记录之间选择一个方向，让后续人生继续承接这一次判断。",
        visibleChanges: [],
      },
      event: { eventId: "resolve_choice_2", lifeStage: "birth", riskLabel: "medium", summaryTags: ["observe"] },
      internal: { judgmentSummary: "resolved", validationFlags: ["deepseek_test"], hiddenStateNotes: "" },
    };
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(expected) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const resolution = await provider.generateActionResolution({
      run,
      sourceEvent,
      action: { kind: "choice", choiceId: "choice_2" },
      worlds,
      seed: 987,
    });
    const body = JSON.parse(request.init.body);
    const userPrompt = JSON.parse(body.messages.find((message) => message.role === "user").content);
    const systemPrompt = body.messages.find((message) => message.role === "system").content;

    assertNoMojibake(systemPrompt);
    assert.match(systemPrompt, /responseType=action_resolution/);
    assert.match(systemPrompt, /玩家自由输入只是尝试行动/);
    assert.equal(userPrompt.task, "resolve_player_action");
    assert.equal(userPrompt.action.kind, "choice");
    assert.equal(userPrompt.action.choiceId, "choice_2");
    assert.equal(userPrompt.action.selectedChoice.id, "choice_2");
    assert.equal(userPrompt.run.player.personality.id, "curious");
    assert.equal(userPrompt.sourceEvent.event.eventId, "test_event");
    assert.equal(resolution.responseType, "action_resolution");
  });

  it("calls DeepSeek to generate ending summaries with ending-specific prompt rules", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 765,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const advanced = runMockTurns({ run, worlds, turns: 2, seed: 770 });
    const expected = generateMvpEndingSummary({ run: advanced, worlds, seed: 880, endingAge: 2 });
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(expected) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const ending = await provider.generateEndingSummary({ run: advanced, worlds, seed: 880, endingAge: 2 });
    const body = JSON.parse(request.init.body);
    const userPrompt = JSON.parse(body.messages.find((message) => message.role === "user").content);
    const systemPrompt = body.messages.find((message) => message.role === "system").content;

    assertNoMojibake(systemPrompt);
    assert.match(systemPrompt, /responseType=ending_summary/);
    assert.match(systemPrompt, /interactionMode 必须是 ending/);
    assert.match(systemPrompt, /choices 必须是空数组/);
    assert.equal(userPrompt.task, "generate_ending_summary");
    assert.equal(userPrompt.ending.interactionMode, "ending");
    assert.equal(userPrompt.run.player.personality.id, "curious");
    assert.ok(userPrompt.world.endingSeeds.length > 0);
    assert.equal(ending.responseType, "ending_summary");
    assert.equal(ending.choices.length, 0);
  });

  it("normalizes repaired ending summaries so the authoritative run stores a completed ending", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 766,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    const advanced = runMockTurns({ run, worlds, turns: 2, seed: 771 });
    const invalid = generateMvpEndingSummary({ run: advanced, worlds, seed: 881, endingAge: 2 });
    invalid.statePatch.worldStateChanges = [];
    const repaired = structuredClone(invalid);
    repaired.turnId = "turn_repaired_ending_without_patch";
    repaired.playerText.body = "修复后的结局总结仍然漏掉了 ending statePatch，需要适配器补齐最小权威结局状态。";

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const ending = await provider.generateEndingSummary({ run: advanced, worlds, seed: 881, endingAge: 2 });
    const endingChange = ending.statePatch.worldStateChanges.find((change) => change.target === "ending");

    assert.equal(ending.responseType, "ending_summary");
    assert.equal(endingChange.value.completed, true);
    assert.equal(endingChange.source, "provider_repair_normalized");
  });

  it("normalizes incomplete repaired ending world-state values", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 767,
      playerProfile: { name: "EndingRepairTester", gender: "female", personality: "curious" },
    });
    const advanced = runMockTurns({ run, worlds, turns: 2, seed: 772 });
    const invalid = generateMvpEndingSummary({ run: advanced, worlds, seed: 882, endingAge: 2 });
    invalid.statePatch.worldStateChanges = [];
    const repaired = structuredClone(invalid);
    repaired.turnId = "turn_incomplete_ending_value";
    repaired.statePatch.worldStateChanges = [
      {
        target: "ending",
        value: {
          tags: ["partial_ai_ending"],
        },
      },
    ];

    let count = 0;
    const fetchImpl = async () => {
      count += 1;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(count === 1 ? invalid : repaired) } }] };
        },
      };
    };

    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    const ending = await provider.generateEndingSummary({ run: advanced, worlds, seed: 882, endingAge: 2 });
    const endingChange = ending.statePatch.worldStateChanges.find((change) => change.target === "ending");

    assert.equal(endingChange.value.completed, true);
    assert.equal(endingChange.value.id, "ai_summary_882");
    assert.equal(endingChange.value.name, "AI 阶段性人生总结");
    assert.deepEqual(endingChange.value.tags, ["partial_ai_ending"]);
    assert.equal(endingChange.source, "provider_repair_normalized");
  });

  it("sends action-resolution continuity context to the provider", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 660,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    run.worldState.opening = { unresolvedThreads: ["被删掉的新闻仍未解释"] };
    const sourceEvent = buildValidLifeEventResponse(run, {
      turnId: "turn_src_continuity",
      title: "平静表面",
      body: "ORIGIN_SITUATION_MARKER 母亲压低声音换了电视频道。",
      validationFlag: "src",
    });
    const expected = {
      ...sourceEvent,
      responseType: "action_resolution",
      turnId: "turn_resolve_continuity",
      timeSpan: { ageStart: 0, ageEnd: 0, yearsElapsed: 0, pace: "scene_moment" },
      event: { eventId: "resolve_choice_2", lifeStage: "birth", riskLabel: "medium", summaryTags: ["observe"] },
      internal: { judgmentSummary: "resolved", validationFlags: ["deepseek_test"], hiddenStateNotes: "" },
    };
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return { ok: true, async json() { return { choices: [{ message: { content: JSON.stringify(expected) } }] }; } };
    };
    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    await provider.generateActionResolution({
      run,
      sourceEvent,
      action: { kind: "choice", choiceId: "choice_2" },
      worlds,
      seed: 661,
    });
    const userPrompt = JSON.parse(JSON.parse(request.init.body).messages.find((m) => m.role === "user").content);
    assert.ok(userPrompt.continuityRules, "continuityRules must be present");
    assert.match(userPrompt.continuityRules.immediatePriorSituation.body, /ORIGIN_SITUATION_MARKER/);
    assert.equal(userPrompt.continuityRules.chosenActionText, sourceEvent.choices.find((c) => c.id === "choice_2").text);
    assert.deepEqual(userPrompt.continuityRules.unresolvedThreads, ["被删掉的新闻仍未解释"]);
    assert.ok(userPrompt.resolutionWritingRule.proseVsNumbersRule, "prose-vs-numbers rule must be present");
  });

  it("passes the immediate prior resolution into the next life-event prompt", async () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 662,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    run.player.age = 7;
    run.eventHistory.push({
      responseType: "action_resolution",
      turnId: "turn_prior_resolution",
      playerText: { title: "7 岁：选择的回响", body: "PRIOR_RESOLUTION_MARKER 你的追问让母亲沉默了很久。" },
      event: { eventId: "resolve_choice_1" },
    });
    const expected = buildValidLifeEventResponse(run, {
      turnId: "turn_next_event",
      title: "新的处境",
      body: "NEXT_EVENT 这天家里气氛仍然紧绷。",
      validationFlag: "next",
    });
    expected.timeSpan = { ageStart: 7, ageEnd: 7, yearsElapsed: 0, pace: "scene_or_short_stage" };
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return { ok: true, async json() { return { choices: [{ message: { content: JSON.stringify(expected) } }] }; } };
    };
    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl,
    });
    await provider.generateLifeEvent({ run, worlds, seed: 663 });
    const userPrompt = JSON.parse(JSON.parse(request.init.body).messages.find((m) => m.role === "user").content);
    assert.ok(userPrompt.immediatePriorResolution, "immediatePriorResolution must be present");
    assert.match(userPrompt.immediatePriorResolution.body, /PRIOR_RESOLUTION_MARKER/);
    assert.ok(userPrompt.continuityRules.growFromPriorResolution, "growFromPriorResolution rule must be present");
  });
});

function assertNoMojibake(text) {
  assert.doesNotMatch(text, /�|鈥|鐨|鍑|鎴|浣|绋|鏋|娌|琛|杈|閫|寮|涓|鍙|瑙|棰|灞|澶|绠|淇|绾|缁|浜|鍔|鏅|瀹|妯|敓|闄|琚|鎵|纭/);
}

// Mirrors tools/qa-free-actions.mjs isConsequential: a resolution leaves a real trace via any
// visibleChanges, a non-zero scoreDelta, or any non-empty statePatch array.
function isResolutionConsequential(resolution) {
  if (Array.isArray(resolution?.visibleChanges) && resolution.visibleChanges.length > 0) return true;
  const patch = resolution?.statePatch ?? {};
  if (typeof patch.scoreDelta === "number" && patch.scoreDelta !== 0) return true;
  return [
    "attributeChanges",
    "manifestationChanges",
    "exposureChanges",
    "relationshipChanges",
    "importantNPCUpdates",
    "factionChanges",
    "progressionChanges",
    "worldStateChanges",
    "memoryUpdates",
  ].some((key) => Array.isArray(patch[key]) && patch[key].length > 0);
}

function buildValidLifeEventResponse(run, { turnId, title, body, validationFlag }) {
  const eventBody = buildPlayableTestBody(body);
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId,
    timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
    selectedSeeds: [{ poolType: "event_seed", seedId: "test_seed", adaptationRole: "primary" }],
    interactionMode: "playable_choices",
    playerText: { title: title?.includes("岁：") ? title : `1 岁：${title}`, body: eventBody, visibleChanges: [] },
    event: { eventId: "test_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["test"] },
    choices: [
      { id: "choice_1", text: "选择一个稳妥的生活方向，先留在家人身边观察周围变化。", intentTags: ["test"], fuzzySuccessLabel: "难度较低", riskLabel: "low" },
      { id: "choice_2", text: "主动询问身边的人，看看能不能得到更多线索。", intentTags: ["test"], fuzzySuccessLabel: "结果难以判断", riskLabel: "medium" },
      { id: "choice_3", text: "保持谨慎，把发现记录下来，等待更合适的时机。", intentTags: ["test"], fuzzySuccessLabel: "风险不低", riskLabel: "medium" },
    ],
    freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["test"] },
    visibleChanges: [],
    statePatch: emptyStatePatch(),
    internal: { judgmentSummary: "test", validationFlags: [validationFlag], hiddenStateNotes: "" },
  };
}

function buildPlayableTestBody(body) {
  const base = String(body ?? "").trim();
  return [
    `${base} 这天，家人和身边的人都在讨论眼前的小变化，母亲担心你年纪太小，父亲则觉得可以让你先学会观察。`,
    "因为此前的生活已经留下了一些细节，当前处境不是凭空出现的事件卡，而是顺着家庭反应、环境压力和你的性格自然推到眼前。",
    "你现在能做的还有限，只能在稳妥观察、主动询问和谨慎记录之间选择一个方向，让后续人生继续承接这一次判断。",
  ].join("\n\n");
}

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
