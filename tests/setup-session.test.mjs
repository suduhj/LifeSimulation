import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createInitialRun,
  createRunFromSetup,
  createSetupPreview,
  drawStartingTalents,
  loadMvpWorlds,
  normalizeGender,
  normalizePlayerName,
  normalizePersonality,
  parseAllocationInput,
  parseTalentSelectionInput,
  resolveWorldId,
} from "../src/index.js";
import { checkPlaytestReadiness, checkPlaytestReadinessAsync } from "../tools/check-playtest-readiness.mjs";

describe("playable setup session", () => {
  it("resolves world, name, gender, and 20-point allocation input", () => {
    const worlds = loadMvpWorlds();

    assert.equal(resolveWorldId("1", worlds), "cultivation");
    assert.equal(resolveWorldId("cthulhu", worlds), "cthulhu");
    assert.equal(resolveWorldId("2", worlds), "cthulhu");
    assert.equal(normalizePlayerName(" 林岚 "), "林岚");
    assert.equal(normalizePlayerName(""), "未命名");
    assert.equal(normalizeGender("女"), "female");
    assert.equal(normalizeGender("2"), "male");
    assert.equal(normalizePersonality("3"), "curious");
    assert.equal(normalizePersonality("现实"), "pragmatic");
    assert.equal(normalizePersonality(""), "random");
    assert.deepEqual(parseAllocationInput("6,6,4,2,2"), {
      appearance: 6,
      intelligence: 6,
      constitution: 4,
      familyBackground: 2,
      luck: 2,
    });
  });

  it("reports core playtest readiness while treating real AI env as advisory", () => {
    const result = checkPlaytestReadiness({ env: {} });

    assert.equal(result.ok, true);
    assert.ok(result.items.some((item) => item.label === "real AI provider environment" && item.ok === false && item.required === false));
    assert.ok(result.items.some((item) => item.label === "root README quick start" && item.ok === true));
    assert.ok(result.items.some((item) => item.label === "core life-simulator systems" && item.ok === true));
    assert.ok(result.items.some((item) => item.label === "open event generation rules" && item.ok === true));
  });

  it("can require a real AI provider for final playtest readiness", () => {
    const missing = checkPlaytestReadiness({ env: {}, requireAi: true });
    const placeholders = checkPlaytestReadiness({
      env: {
        DEEPSEEK_API_KEY: "your_deepseek_api_key_here",
        OPENAI_COMPATIBLE_API_KEY: "your_api_key_here",
        OPENAI_COMPATIBLE_BASE_URL: "https://your-provider.example/v1",
        OPENAI_COMPATIBLE_MODEL: "your-model-id",
      },
      requireAi: true,
    });
    const withDeepSeek = checkPlaytestReadiness({ env: { DEEPSEEK_API_KEY: "unit_live_key_123" }, requireAi: true });
    const withCompatible = checkPlaytestReadiness({
      env: {
        OPENAI_COMPATIBLE_API_KEY: "unit_live_key_123",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.compatible.local/v1",
        OPENAI_COMPATIBLE_MODEL: "test-model",
      },
      requireAi: true,
    });

    assert.equal(missing.ok, false);
    assert.equal(placeholders.ok, false);
    assert.ok(missing.items.some((item) => item.label === "real AI provider environment" && item.required === true && item.ok === false));
    assert.equal(withDeepSeek.ok, true);
    assert.equal(withCompatible.ok, true);
  });

  it("can run a required live AI smoke as part of async final playtest readiness", async () => {
    let requestCount = 0;
    const fetchImpl = async (_url, init) => {
      requestCount += 1;
      const body = JSON.parse(init.body);
      const prompt = JSON.parse(body.messages.find((message) => message.role === "user").content);
      return {
        ok: true,
        async json() {
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify(buildValidSmokeResponse({
                    runId: prompt.run?.runId ?? prompt.opening?.run?.runId,
                    worldId: prompt.run?.worldId ?? prompt.opening?.run?.worldId,
                    responseType: requestCount === 1 ? "life_event" : requestCount === 2 ? "action_resolution" : "ending_summary",
                    turnId: `turn_live_smoke_${requestCount}`,
                  })),
                },
              },
            ],
          };
        },
      };
    };

    const result = await checkPlaytestReadinessAsync({
      env: {
        OPENAI_COMPATIBLE_API_KEY: "unit_live_key_123",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.compatible.local/v1",
        OPENAI_COMPATIBLE_MODEL: "test-model",
      },
      liveAiSmoke: true,
      fetchImpl,
    });

    assert.equal(result.ok, true);
    assert.equal(requestCount, 3);
    assert.ok(result.items.some((item) => item.label === "real AI live smoke" && item.required === true && item.ok === true));
  });

  it("fails async final playtest readiness live smoke without provider configuration", async () => {
    const result = await checkPlaytestReadinessAsync({ env: {}, liveAiSmoke: true });

    assert.equal(result.ok, false);
    assert.ok(result.items.some((item) => item.label === "real AI provider environment" && item.required === true && item.ok === false));
    assert.ok(result.items.some((item) => item.label === "real AI live smoke" && item.required === true && item.ok === false));
  });

  it("rejects allocations that do not total 20", () => {
    assert.throws(() => parseAllocationInput("10,10,10,0,0"), /必须等于 20/);
  });

  it("lets the player keep exactly 3 talents from the draw", () => {
    const worlds = loadMvpWorlds();
    const preview = createSetupPreview({
      worlds,
      worldId: "cthulhu",
      seed: 12345,
      playerProfile: { name: "鏋楀矚", gender: "female", personality: "curious" },
      allocation: parseAllocationInput("4,4,4,4,4"),
    });

    const selected = parseTalentSelectionInput("1,3,5", preview.talentDraw);

    assert.deepEqual(selected, [preview.talentDraw[0].id, preview.talentDraw[2].id, preview.talentDraw[4].id]);
    assert.throws(() => parseTalentSelectionInput("1,1,2", preview.talentDraw), /不能重复/);
    assert.throws(() => parseTalentSelectionInput("1,2,missing_talent", preview.talentDraw), /只能选择本次抽到/);
  });

  it("creates an initial run with the player-selected kept talents", () => {
    const worlds = loadMvpWorlds();
    const preview = createSetupPreview({
      worlds,
      worldId: "wasteland",
      seed: 24680,
      playerProfile: { name: "Ash", gender: "female", personality: "pragmatic" },
      allocation: parseAllocationInput("2,6,6,2,4"),
    });
    const keptTalentIds = parseTalentSelectionInput("1,2,3", preview.talentDraw);

    const run = createRunFromSetup({ worlds, preview, keptTalentIds });

    assert.deepEqual(run.setup.keptTalentIds, keptTalentIds);
    assert.equal(run.player.personality.id, "pragmatic");
    assert.equal(run.setup.personality.id, "pragmatic");
    assert.deepEqual(
      run.player.talents.map((talent) => talent.id),
      keptTalentIds,
    );
  });

  it("keeps createInitialRun backward-compatible with automatic talent selection", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 13579,
      playerProfile: { name: "娌堥潚", gender: "male" },
    });

    assert.equal(run.setup.talentDraw.length, 5);
    assert.equal(run.setup.talentDrawRarities.length, 5);
    assert.equal(run.setup.talentDrawRarityRolls.length, 5);
    assert.equal(run.setup.talentRarityProbabilities.mythic, 1);
    assert.equal(run.setup.keptTalentIds.length, 3);
  });

  it("draws talents by rarity probability before choosing the concrete talent", () => {
    const talents = [
      { id: "common_1", rarity: "common", effects: {}, manifestationType: "stage", tags: [] },
      { id: "common_2", rarity: "common", effects: {}, manifestationType: "stage", tags: [] },
      { id: "fine_1", rarity: "fine", effects: {}, manifestationType: "stage", tags: [] },
      { id: "rare_1", rarity: "rare", effects: {}, manifestationType: "stage", tags: [] },
      { id: "epic_1", rarity: "epic", effects: {}, manifestationType: "stage", tags: [] },
      { id: "legendary_1", rarity: "legendary", effects: {}, manifestationType: "stage", tags: [] },
      { id: "mythic_1", rarity: "mythic", effects: {}, manifestationType: "stage", tags: [] },
    ];
    const rng = {
      rolls: [0.449, 0, 0.451, 0, 0.731, 0, 0.891, 0, 0.961, 0],
      next() {
        return this.rolls.shift() ?? 0;
      },
      int(maxExclusive) {
        return Math.floor(this.next() * maxExclusive);
      },
      pick(items) {
        return items[this.int(items.length)];
      },
    };

    const result = drawStartingTalents(talents, rng, 5);

    assert.deepEqual(
      result.rarityRolls.map((roll) => roll.targetRarity),
      ["common", "fine", "rare", "epic", "legendary"],
    );
    assert.deepEqual(
      result.talents.map((talent) => talent.rarity),
      ["common", "fine", "rare", "epic", "legendary"],
    );
    assert.equal(new Set(result.talents.map((talent) => talent.id)).size, 5);
  });
});

function buildValidSmokeResponse({ runId, worldId, responseType, turnId }) {
  const ending = responseType === "ending_summary";
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType,
    worldId,
    runId,
    turnId,
    timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: ending ? 0 : 1, pace: ending ? "scene_moment" : "yearly" },
    selectedSeeds: [],
    interactionMode: ending ? "ending" : "playable_choices",
    playerText: {
      title: ending ? "烟测结局" : "烟测事件",
      body: ending
        ? "这是一段用于最终验收烟测的结局总结。"
        : "这是一段用于最终验收烟测的模拟内容。这天，家人和身边的人都在讨论眼前的小变化，母亲担心你年纪太小，父亲则觉得可以让你先学会观察。\n\n因为此前的生活已经留下了一些细节，当前处境不是凭空出现的事件卡，而是顺着家庭反应、环境压力和你的性格自然推到眼前。\n\n你现在能做的还有限，只能在稳妥观察、主动询问和谨慎记录之间选择一个方向，让后续人生继续承接这一次判断。",
      visibleChanges: [],
      relationshipSummary: ending ? ["关系保持稳定。"] : undefined,
      worldProgressSummary: ending ? ["世界进度已结算。"] : undefined,
    },
    event: { eventId: `smoke_${responseType}`, lifeStage: "childhood", riskLabel: "low", summaryTags: ["smoke"] },
    choices: ending
      ? []
      : [
          { id: "choice_1", text: "保持普通生活节奏，先观察周围的人和事。", intentTags: ["observe"], fuzzySuccessLabel: "难度较低", riskLabel: "low" },
          { id: "choice_2", text: "主动询问身边的人，看看是否有新的线索。", intentTags: ["ask"], fuzzySuccessLabel: "结果难以判断", riskLabel: "medium" },
          { id: "choice_3", text: "把注意力放到自我成长上，等待更合适的时机。", intentTags: ["growth"], fuzzySuccessLabel: "风险不低", riskLabel: "medium" },
        ],
    freeform: { allowed: !ending, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["smoke"] },
    visibleChanges: [],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: ending ? [{ target: "ending", value: { id: "smoke_ending", name: "烟测结局", completed: true, score: 1, tags: ["smoke"], age: 1 } }] : [],
      memoryUpdates: [],
      scoreDelta: ending ? 1 : 0,
    },
    internal: { judgmentSummary: "smoke", validationFlags: ["live_smoke_test"], hiddenStateNotes: "" },
  };
}

