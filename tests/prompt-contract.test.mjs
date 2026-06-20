import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnnualFactPackage,
  buildPromptContract,
  createDeepSeekProvider,
  createInitialRun,
  loadMvpWorlds,
  validatePromptContract,
} from "../src/index.js";

const PROMPT_FORBIDDEN = /RAW_EVENT_BODY_MARKER|playerText|eventHistory|currentEvent|statePatch|annualFactPackage|curriculumSlot|threeLayerFocus|mentor_attention|\u4e3b\u8f74|\u526f\u8f74|\u80cc\u666f\u56de\u54cd|\u65e7\u7ebf\u7d22/;

describe("PromptContract", () => {
  it("projects only safe canonical context and excludes raw history bodies", () => {
    const { run } = buildContaminatedRun();
    const contract = buildPromptContract({
      run,
      observableScene: {
        schemaVersion: "mvp.observable_scene.v1",
        age: 9,
        mainScene: {
          requiredVisibleDelta: "\u5b66\u4e60\u5b89\u6392\u53d1\u751f\u6539\u53d8",
        },
        choices: [],
      },
    });

    const validation = validatePromptContract(contract);
    assert.equal(validation.valid, true, validation.errors.join("; "));
    const serialized = JSON.stringify(contract);
    assert.doesNotMatch(serialized, PROMPT_FORBIDDEN);
    assert.match(serialized, /\u5b66\u4e60\u5b89\u6392\u53d1\u751f\u6539\u53d8|\u5148\u751f\u5f00\u59cb/);
  });

  it("keeps annual real-provider prompts free of backend ids and raw event history", async () => {
    const { worlds, run } = buildContaminatedRun();
    const annualFactPackage = buildAnnualFactPackage({ run, worlds, seed: 2026062004 });
    annualFactPackage.curriculumSlot = "mentor_attention";
    annualFactPackage.requiredHumanDelta = "\u4e00\u4f4d\u53ef\u4fe1\u5927\u4eba\u5f00\u59cb\u66f4\u8ba4\u771f\u5730\u6307\u5bfc\u4f60";
    annualFactPackage.threeLayerFocus = {
      lifeBase: { domain: "mentor_attention", role: "primary" },
      worldFlavor: { element: "subtle_talent_manifestation", role: "secondary" },
      consequenceEcho: { source: "jade_token", role: "background_only" },
    };

    let request;
    const provider = createDeepSeekProvider({
      env: { DEEPSEEK_API_KEY: "unit_live_key_123", DEEPSEEK_BASE_URL: "https://example.deepseek.local" },
      fetchImpl: async (url, init) => {
        request = { url, init };
        return {
          ok: true,
          async json() {
            return { choices: [{ message: { content: JSON.stringify(validLifeEvent(run)) } }] };
          },
        };
      },
    });

    await provider.generateLifeEvent({
      run,
      worlds,
      seed: 2026062005,
      eventContract: { annualFactPackage },
    });

    const body = JSON.parse(request.init.body);
    const userPromptText = body.messages.find((message) => message.role === "user").content;
    const userPrompt = JSON.parse(userPromptText);

    assert.ok(userPrompt.promptContract, "real provider prompt must carry PromptContract");
    assert.doesNotMatch(userPromptText, PROMPT_FORBIDDEN);
    assert.equal(userPrompt.eventContract, undefined);
    assert.equal(userPrompt.eventGeneration, undefined);
  });
});

function buildContaminatedRun() {
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 2026062003,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = 8;
  run.eventHistory.push({
    responseType: "life_event",
    turnId: "turn_raw_history",
    event: { eventId: "mentor_attention" },
    playerText: {
      title: "RAW_TITLE mentor_attention",
      body: "RAW_EVENT_BODY_MARKER curriculumSlot \u65e7\u7ebf\u7d22 \u4e3b\u8f74",
    },
    selectedSeeds: [{ seedId: "jade_token" }],
  });
  run.worldState.storyState.lifeNodes = [
    {
      schemaVersion: "mvp.life_node.v1",
      nodeId: "life_node_prompt_safe",
      age: 8,
      nodeType: "annual_event",
      visibleContract: {
        requiredLifeDelta: "\u5b66\u4e60\u5b89\u6392\u53d1\u751f\u6539\u53d8",
        mainHumanDomain: "learning_path",
      },
      paragraphs: ["\u5148\u751f\u5f00\u59cb\u66f4\u8ba4\u771f\u5730\u6307\u5bfc\u4f60\u3002"],
      choices: [],
      visibleChanges: [],
    },
  ];
  return { worlds, run };
}

function validLifeEvent(run) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: "turn_prompt_contract_response",
    timeSpan: { ageStart: 8, ageEnd: 9, yearsElapsed: 1, pace: "yearly" },
    selectedSeeds: [],
    interactionMode: "playable_choices",
    playerText: {
      title: "9 \u5c81\uff1a\u5148\u751f\u7684\u7167\u770b",
      body: "\u5148\u751f\u5f00\u59cb\u66f4\u8ba4\u771f\u5730\u6307\u5bfc\u4f60\uff0c\u4f60\u7684\u5b66\u4e60\u5b89\u6392\u53d1\u751f\u4e86\u53ef\u89c1\u7684\u6539\u53d8\u3002\n\n\u5bb6\u4eba\u56e0\u6b64\u91cd\u65b0\u5b89\u6392\u4f60\u6bcf\u5929\u7684\u65f6\u95f4\uff0c\u8ba9\u4f60\u5728\u5b66\u4e60\u548c\u5bb6\u52a1\u4e4b\u95f4\u627e\u5230\u65b0\u7684\u8282\u594f\u3002\n\n\u4f60\u9700\u8981\u51b3\u5b9a\u5982\u4f55\u9762\u5bf9\u8fd9\u4efd\u66f4\u4e25\u8083\u7684\u671f\u5f85\u3002",
      visibleChanges: [],
    },
    event: { eventId: "test_learning_event", lifeStage: "childhood", riskLabel: "low", summaryTags: ["learning"] },
    choices: [
      { id: "choice_1", text: "\u5148\u6309\u5148\u751f\u7684\u5b89\u6392\u5b66\u4e0b\u53bb\uff0c\u770b\u770b\u81ea\u5df1\u80fd\u505a\u5230\u4ec0\u4e48\u7a0b\u5ea6\u3002", intentTags: ["study"], fuzzySuccessLabel: "\u96be\u5ea6\u8f83\u4f4e", riskLabel: "low" },
      { id: "choice_2", text: "\u627e\u673a\u4f1a\u95ee\u5148\u751f\u4e3a\u4ec0\u4e48\u7a81\u7136\u66f4\u5173\u5fc3\u4f60\u7684\u5b66\u4e60\u3002", intentTags: ["ask"], fuzzySuccessLabel: "\u7ed3\u679c\u96be\u4ee5\u9884\u6599", riskLabel: "medium" },
      { id: "choice_3", text: "\u628a\u8fd9\u4efd\u7167\u770b\u5148\u653e\u5728\u5fc3\u91cc\uff0c\u6697\u4e2d\u89c2\u5bdf\u5927\u4eba\u4eec\u7684\u6001\u5ea6\u3002", intentTags: ["observe"], fuzzySuccessLabel: "\u98ce\u9669\u4e0d\u9ad8", riskLabel: "medium" },
    ],
    freeform: { allowed: true, clarificationNeeded: false, riskBand: "low", judgmentFactors: ["age", "learning"] },
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
      growthEvidenceChanges: [],
      scoreDelta: 0,
    },
    internal: { judgmentSummary: "ok", validationFlags: ["prompt_contract_test"], hiddenStateNotes: "" },
  };
}
