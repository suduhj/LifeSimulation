import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { loadProjectEnv } from "../src/index.js";
import { smokeAiProvider } from "../tools/smoke-ai-provider.mjs";

describe("AI provider smoke checker", () => {
  it("skips cleanly when no real AI provider environment is configured", async () => {
    const result = await smokeAiProvider({ env: {}, args: [] });

    assert.equal(result.status, "skipped");
    assert.match(result.reason, /No real AI provider/);
    assert.match(result.hint, /\.env\.example/);
  });

  it("fails when smoke is required but no real AI provider is configured", async () => {
    const result = await smokeAiProvider({ env: {}, args: ["--required"] });

    assert.equal(result.status, "failed");
    assert.match(result.reason, /No real AI provider/);
  });

  it("treats copied dotenv placeholders as unconfigured", async () => {
    const result = await smokeAiProvider({
      env: {
        DEEPSEEK_API_KEY: "your_deepseek_api_key_here",
        OPENAI_COMPATIBLE_API_KEY: "your_api_key_here",
        OPENAI_COMPATIBLE_BASE_URL: "https://your-provider.example/v1",
        OPENAI_COMPATIBLE_MODEL: "your-model-id",
      },
      args: ["--required"],
    });

    assert.equal(result.status, "failed");
    assert.match(result.reason, /No real AI provider/);
  });

  it("calls the configured provider and validates a real-provider shaped life event", async () => {
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      const body = JSON.parse(init.body);
      const prompt = JSON.parse(body.messages.find((message) => message.role === "user").content);
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(buildValidResponse(prompt.run?.runId ?? prompt.opening?.run?.runId)) } }] };
        },
      };
    };

    const result = await smokeAiProvider({
      env: {
        OPENAI_COMPATIBLE_API_KEY: "unit_live_key_123",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.compatible.local/v1",
        OPENAI_COMPATIBLE_MODEL: "test-model",
      },
      args: ["--world", "cthulhu", "--seed", "42"],
      fetchImpl,
    });

    assert.equal(result.status, "passed");
    assert.equal(result.mode, "openai-compatible");
    assert.equal(request.url, "https://example.compatible.local/v1/chat/completions");
    assert.equal(result.summary.lifeEventChoices, 3);
  });

  it("can use project dotenv values for provider smoke configuration", async () => {
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      const body = JSON.parse(init.body);
      const prompt = JSON.parse(body.messages.find((message) => message.role === "user").content);
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: JSON.stringify(buildValidResponse(prompt.run?.runId ?? prompt.opening?.run?.runId)) } }] };
        },
      };
    };

    const dir = path.join("tmp", "tests", `smoke-dotenv-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const envPath = path.join(dir, ".env");
    const env = loadProjectEnv({
      baseEnv: {},
      envFilePath: envPath,
    });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      envPath,
      [
        "OPENAI_COMPATIBLE_API_KEY=dotenv-key",
        "OPENAI_COMPATIBLE_BASE_URL=https://dotenv.compatible.local/v1",
        "OPENAI_COMPATIBLE_MODEL=dotenv-model",
      ].join("\n"),
      "utf8",
    );
    const dotenvEnv = loadProjectEnv({ baseEnv: {}, envFilePath: envPath });
    const result = await smokeAiProvider({
      env: dotenvEnv,
      args: ["--world", "cthulhu", "--seed", "44"],
      fetchImpl,
    });
    const body = JSON.parse(request.init.body);

    assert.equal(env.OPENAI_COMPATIBLE_API_KEY, undefined);
    assert.equal(result.status, "passed");
    assert.equal(body.model, "dotenv-model");
    assert.equal(request.init.headers.Authorization, "Bearer dotenv-key");
    assert.equal(request.url, "https://dotenv.compatible.local/v1/chat/completions");
  });
});

function buildValidResponse(runId) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: "cthulhu",
    runId,
    turnId: "turn_ai_smoke",
    timeSpan: { ageStart: 0, ageEnd: 1, yearsElapsed: 1, pace: "yearly" },
    selectedSeeds: [{ poolType: "event_seed", seedId: "ai_smoke_seed", adaptationRole: "primary" }],
    interactionMode: "playable_choices",
    playerText: {
      title: "真实 AI 烟测事件",
      body: "这是一段用于验证真实 AI provider 输出协议的测试事件。这天，家人和身边的人都在讨论眼前的小变化，母亲担心你年纪太小，父亲则觉得可以让你先学会观察。\n\n因为此前的生活已经留下了一些细节，当前处境不是凭空出现的事件卡，而是顺着家庭反应、环境压力和你的性格自然推到眼前。\n\n你现在能做的还有限，只能在稳妥观察、主动询问和谨慎记录之间选择一个方向，让后续人生继续承接这一次判断。",
      visibleChanges: [],
    },
    event: { eventId: "ai_smoke_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["smoke"] },
    choices: [
      { id: "choice_1", text: "保持普通生活节奏，先观察周围的人和事。", intentTags: ["observe"], fuzzySuccessLabel: "成功率较高", riskLabel: "low" },
      { id: "choice_2", text: "主动询问家人最近有没有发生奇怪的传闻。", intentTags: ["ask"], fuzzySuccessLabel: "结果难以判断", riskLabel: "medium" },
      { id: "choice_3", text: "把注意力放到自我成长上，暂时不卷入异常。", intentTags: ["growth"], fuzzySuccessLabel: "风险不低", riskLabel: "medium" },
    ],
    freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["smoke"] },
    visibleChanges: [],
    statePatch: {
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
    },
    internal: { judgmentSummary: "smoke", validationFlags: ["ai_smoke"], hiddenStateNotes: "" },
  };
}

