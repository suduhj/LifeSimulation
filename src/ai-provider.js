import { detectPlayerTextLeaks, validateAiResponse } from "./ai-response-validator.js";
import { generateChoiceResolution } from "./choice-resolution.js";
import { generateMvpEndingSummary } from "./ending-generator.js";
import { selectEventGenerationContext } from "./event-source-selector.js";
import { generateFreeformResolution } from "./freeform-resolution.js";
import { generateMockLifeEvent } from "./mock-ai.js";
import { firstActionAge, generateOpeningSequence } from "./opening-sequence.js";
import { isUsableProviderValue } from "./provider-config.js";
import { assertStoryContract } from "./story-contract-validator.js";
import { talentLabel, visibleTalentName } from "./localization.js";
import { buildCapabilityPackages, buildDevelopmentalExpression } from "./capability-package.js";
import { buildPromptView } from "./domain/projections/prompt-view.js";
import { compileSceneObject, sceneInputForAi } from "./scene-object-compiler.js";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const OPENAI_COMPATIBLE_MODES = new Set(["openai-compatible", "openai_compatible", "compatible"]);

export function createAiProvider({ mode = "mock", env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const normalizedMode = normalizeAiMode(mode);

  if (normalizedMode === "mock") {
    return {
      mode: "mock",
      async generateOpeningSequence(input) {
        return generateOpeningSequence(input);
      },
      async generateLifeEvent(input) {
        return generateMockLifeEvent(input);
      },
      async generateActionResolution(input) {
        return generateMockActionResolution(input);
      },
      async generateEndingSummary(input) {
        return generateMvpEndingSummary(input);
      },
    };
  }

  if (normalizedMode === "deepseek") {
    return createDeepSeekProvider({ env, fetchImpl });
  }

  if (normalizedMode === "openai-compatible") {
    return createOpenAiCompatibleProvider({ env, fetchImpl });
  }

  throw new Error(`Unknown AI provider mode: ${mode}`);
}

export function createDeepSeekProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!isUsableProviderValue(apiKey)) {
    throw new Error("DEEPSEEK_API_KEY must be set to a real API key when --ai deepseek is used");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is required for the DeepSeek provider");
  }

  const baseUrl = (env.DEEPSEEK_BASE_URL ?? DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, "");
  const model = env.DEEPSEEK_MODEL ?? DEFAULT_DEEPSEEK_MODEL;

  return createChatCompletionsProvider({
    mode: "deepseek",
    providerName: "DeepSeek",
    apiKey,
    baseUrl,
    model,
    fetchImpl,
    extraBody: {
      thinking: { type: "disabled" },
    },
  });
}

export function createOpenAiCompatibleProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.OPENAI_COMPATIBLE_API_KEY;
  const baseUrl = env.OPENAI_COMPATIBLE_BASE_URL;
  const model = env.OPENAI_COMPATIBLE_MODEL;
  const missing = [];
  if (!isUsableProviderValue(apiKey)) missing.push("OPENAI_COMPATIBLE_API_KEY");
  if (!isUsableProviderValue(baseUrl)) missing.push("OPENAI_COMPATIBLE_BASE_URL");
  if (!isUsableProviderValue(model)) missing.push("OPENAI_COMPATIBLE_MODEL");
  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required when --ai openai-compatible is used`);
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is required for the OpenAI-compatible provider");
  }

  return createChatCompletionsProvider({
    mode: "openai-compatible",
    providerName: "OpenAI-compatible",
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    fetchImpl,
  });
}

function createChatCompletionsProvider({ mode, providerName, apiKey, baseUrl, model, fetchImpl, extraBody = {} }) {
  return {
    mode,
    async generateOpeningSequence({ run, worlds, seed = 1 } = {}) {
      const world = worlds?.[run?.worldId];
      if (!world) {
        throw new Error(`Unknown worldId for ${providerName} opening sequence: ${run?.worldId}`);
      }

      const prompt = buildOpeningSequencePrompt({ run, world, seed });
      return requestValidatedAiResponse({
        baseUrl,
        model,
        apiKey,
        fetchImpl,
        providerName,
        responseType: "life_event",
        systemPrompt: buildSystemPrompt({ responseType: "life_event", interactionMode: "non_interactive_opening" }),
        prompt,
        extraBody,
      });
    },
    async generateLifeEvent({ run, worlds, seed = 1, minNextAge, eventContract } = {}) {
      const world = worlds?.[run?.worldId];
      if (!world) {
        throw new Error(`Unknown worldId for ${providerName} generation: ${run?.worldId}`);
      }

      const generationContext = selectEventGenerationContext({ world, run, seed });
      const prompt = buildLifeEventPrompt({ run, world, seed, generationContext, minNextAge, eventContract });
      return assertStoryContract(await requestValidatedAiResponse({
        baseUrl,
        model,
        apiKey,
        fetchImpl,
        providerName,
        responseType: "life_event",
        systemPrompt: buildSystemPrompt({ responseType: "life_event" }),
        prompt,
        extraBody,
      }), eventContract);
    },
    async generateActionResolution({ run, sourceEvent, action, worlds, seed = 1 } = {}) {
      const world = worlds?.[run?.worldId];
      if (!world) {
        throw new Error(`Unknown worldId for ${providerName} action resolution: ${run?.worldId}`);
      }

      const prompt = buildActionResolutionPrompt({ run, sourceEvent, action, world, seed });
      return requestValidatedAiResponse({
        baseUrl,
        model,
        apiKey,
        fetchImpl,
        providerName,
        responseType: "action_resolution",
        systemPrompt: buildSystemPrompt({ responseType: "action_resolution" }),
        prompt,
        extraBody,
      });
    },
    async generateEndingSummary({ run, worlds, seed = 1, endingAge = 6, endingReason = "mvp_short_run" } = {}) {
      const world = worlds?.[run?.worldId];
      if (!world) {
        throw new Error(`Unknown worldId for ${providerName} ending summary: ${run?.worldId}`);
      }

      const prompt = buildEndingSummaryPrompt({ run, world, seed, endingAge, endingReason });
      return requestValidatedAiResponse({
        baseUrl,
        model,
        apiKey,
        fetchImpl,
        providerName,
        responseType: "ending_summary",
        systemPrompt: buildSystemPrompt({ responseType: "ending_summary" }),
        prompt,
        extraBody,
      });
    },
  };
}

function normalizeAiMode(mode) {
  const normalized = String(mode ?? "mock").trim().toLowerCase();
  if (OPENAI_COMPATIBLE_MODES.has(normalized)) return "openai-compatible";
  return normalized;
}

function generateMockActionResolution({ action, ...input } = {}) {
  if (action?.kind === "freeform") {
    return generateFreeformResolution({
      ...input,
      inputText: action.text,
    });
  }
  return generateChoiceResolution({
    ...input,
    choiceId: action?.choiceId,
  });
}

const PROVIDER_REQUEST_TIMEOUT_MS = 60000;

async function requestChatCompletionsJson({ baseUrl, model, apiKey, fetchImpl, providerName, systemPrompt, prompt, extraBody = {} }) {
  // Bound each provider request so a hung connection cannot stall the retry loop in play-session.
  // On timeout the request aborts and rejects; the session layer retries, then falls back to mock.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(prompt),
          },
        ],
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0.8,
        ...extraBody,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${providerName} request failed: HTTP ${response.status} ${body.slice(0, 300)}`);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${providerName} response did not include message content`);
    }

    return parseJsonObject(content);
  } finally {
    clearTimeout(timer);
  }
}

async function requestValidatedAiResponse({ baseUrl, model, apiKey, fetchImpl, providerName, responseType, systemPrompt, prompt, extraBody = {} }) {
  const firstParsed = await requestChatCompletionsJson({
    baseUrl,
    model,
    apiKey,
    fetchImpl,
    providerName,
    systemPrompt,
    prompt,
    extraBody,
  });
  const firstNormalized = coerceResolutionOutcome(
    ensureActionConsequence(
      normalizePlayablePresentation(firstParsed, { responseType, prompt }),
      { responseType, prompt },
    ),
    { responseType },
  );
  const firstValidation = validateAiResponse(firstNormalized);
  const firstErrors = [...firstValidation.errors, ...detectPlayerTextLeaks(firstNormalized)];
  if (firstErrors.length === 0) {
    return firstNormalized;
  }

  const repairPrompt = buildJsonRepairPrompt({
    responseType,
    originalPrompt: prompt,
    invalidResponse: firstNormalized,
    validationErrors: firstErrors,
  });
  const repairedParsed = await requestChatCompletionsJson({
    baseUrl,
    model,
    apiKey,
    fetchImpl,
    providerName,
    systemPrompt: buildJsonRepairSystemPrompt({ responseType }),
    prompt: repairPrompt,
    extraBody,
  });
  const normalizedRepaired = coerceResolutionOutcome(
    ensureActionConsequence(
      normalizePlayablePresentation(normalizeRepairedAiResponse(repairedParsed, { responseType, prompt }), { responseType, prompt }),
      { responseType, prompt },
    ),
    { responseType },
  );
  const repairedValidation = validateAiResponse(normalizedRepaired);
  const repairedErrors = [...repairedValidation.errors, ...detectPlayerTextLeaks(normalizedRepaired)];
  if (repairedErrors.length > 0) {
    throw new Error(`${providerName} AI response failed validation after repair: ${repairedErrors.join("; ")}`);
  }
  return normalizedRepaired;
}

function buildSystemPrompt({ responseType = "life_event", interactionMode } = {}) {
  const baseRules = [
    "你是多世界 AI 人生模拟器的命运旁白和世界主持人。",
    "只输出一个 JSON 对象，不要 Markdown，不要解释，不要输出 JSON 以外的文字。",
    "schemaVersion 必须是 mvp.ai_event_response.v1。",
    `本次只生成 responseType=${responseType} 的 JSON 响应。`,
    "AI 只能提出 statePatch；权威存档由游戏引擎验证后修改。",
    "属性成长以引擎的 growthLedger / capabilityPackages / developmentalExpression 为准；AI 不得直接决定 effective、realized 或 maturityCap。",
    "如果剧情确实带来成长，只能在 statePatch.growthEvidenceChanges 提交证据，由引擎审核后兑现；不要把潜能直接写成已经掌握的能力。",
    "不得把 hiddenStateNotes 或 NPC 隐藏秘密直接泄露到 playerText，除非存档已经揭露。",
    "NPC 有 playerVisible 与 hiddenInfo 两层。playerText 只能使用 playerVisible 中主角当前知道的称呼；hiddenInfo、真实身份、内部ID、未发现的幕后关系只能用于一致性，不能直接写给玩家。",
    "普通玩家可见文本必须全中文，严禁输出英文ID、原始字段名、内部 role、内部 seedId、hiddenHooks、unresolvedThreads、manifested、potential、exposure、未命名天赋、未知天赋、重要人物、未知身份等占位或后台词。信息缺失时要用已知中文称呼重写或不写，不要暴露缺失状态。",
    "recentMemory、recentEvents、eventGeneration、continuityRules、immediatePriorResolution、selectedSeeds、internal 等都是后台上下文，只能用于你的推理和保持连贯，严禁逐字或近似照抄进 playerText。尤其严禁在 playerText 出现：英文句子（如 Run started in cultivation…）、形如 noble_dynasty_child 的下划线英文 ID、以及“素材种子/seed/sourceType/事件来源/生成规则/年龄限制”等后台或元叙述词。要把这些后台信息改写成主角当前能感知到的纯中文剧情，或干脆不写。",
    "如果剧情要揭露隐藏人物真实身份，必须有玩家行动、属性、关系或事件因果支持，并通过 statePatch 更新该 NPC 的 playerVisible/knownIdentity；揭露前只能写模糊身份和可观察行为。",
    "出生和童年要按显化值写，不能把潜力直接写成全部显化。",
    "玩家自由输入只是尝试行动，不是说什么就发生什么；必须根据属性、年龄、天赋、世界观、NPC关系、历史和风险进行判定。",
  ];

  if (responseType === "ending_summary") {
    return [
      ...baseRules,
      "interactionMode 必须是 ending。",
      "choices 必须是空数组。",
      "freeform.allowed 必须是 false。",
      "必须生成玩家可读的人生传记总结、总评分、结局标签、关系总结和世界进度总结。",
      "statePatch.worldStateChanges 必须写入 target=ending 的最终结局数据；statePatch.scoreDelta 必须给出最终评分变化。",
    ].join("\n");
  }

  if (interactionMode === "non_interactive_opening") {
    return [
      ...baseRules,
      "这是新人生开局的命运预览与后台早年时间线生成，不是玩家可操作事件。",
      "interactionMode 必须是 non_interactive。",
      "choices 必须是空数组。",
      "freeform.allowed 必须是 false，freeform.clarificationNeeded 必须是 false。",
      "playerText.title 必须是“命运预览”或类似中文标题。",
      "playerText.body 只能包含静态命运档案：出生地点、出生家庭、父母/监护人概况、家境表现、命运预览、周围目光、世界底色、当前处境。",
      "playerText.body 禁止出现“初始重要NPC”“人际关系”“未解释细节”“未解释物品”“未来伏笔”“天赋显化”“天赋初显”“早年自动推进”“出生与早年”等区块或裸标题。",
      "playerText.body 不要写 0岁、1岁、2岁等早年推进内容；早年经历必须放到 statePatch.worldStateChanges 的 opening.earlyLifeTimeline。",
      "opening.earlyLifeTimeline 必须是数组，严格包含从 0 岁到 firstActionAge-1 岁的逐岁节点；age 依次为 0,1,2...，不能缺岁、跳岁或重复年龄。",
      "opening.earlyLifeTimeline 每个节点 title 使用“X 岁：阶段名”，body 只写该年龄能合理发生的内容，不能在 0 岁正文里写七岁、六岁等其他年龄内容。",
      "不得让玩家在出生瞬间做重大选择；第一个真正分岔由后续 playable_choices 事件生成。",
      "statePatch 必须把 opening.phase 设为 first_branch_ready，写入 opening.firstActionAge、opening.hiddenHooks、opening.unresolvedThreads、opening.earlyLifeTimeline，并更新早年显化值；不得直接结束人生。",
    ].join("\n");
  }

  if (responseType === "action_resolution") {
    return [
      ...baseRules,
      "这是对玩家上一步行动的结算，不是新的人生分岔。",
      "interactionMode 必须是 non_interactive。",
      "choices 必须是空数组，不要生成任何选项或 choice_4。",
      "freeform.allowed 必须是 false；下一段人生分岔和新的自由行动入口由引擎在随后单独生成。",
      "要写清楚：玩家这次行动如何展开、当下与随后一段时间的结果、相关人物如何反应、身体/资源/关系/世界进度有什么变化，并用不剧透的方式留下暗线。",
      "playerText.title 仍写“X 岁：事件名”，X 必须等于 timeSpan.ageEnd。",
      "必须照常给出 statePatch 与 visibleChanges 承载机械后果；散文不要复述已由 visibleChanges 表达的数值增减。",
      "玩家自由输入只是尝试行动，不能因为玩家说了就保证成功；必须按属性、年龄、天赋、世界观、NPC关系、历史和风险判定。",
    ].join("\n");
  }

  return [
    ...baseRules,
    "interactionMode 必须是 playable_choices。",
    "choices 必须恰好 3 个，id 必须是 choice_1、choice_2、choice_3。不要生成 choice_4。",
    "第 4 项自由行动由 UI 提供，不属于 choices 数组。",
    "freeform.allowed 必须为 true。",
    "事件和选项必须是中文玩家可读文本，选项要丰富，不能是一两个词。",
    "playerText.title 必须写明事件发生年龄，格式为“X 岁：事件名”，X 必须等于 timeSpan.ageEnd；playerText.body 也必须围绕该年龄的当前处境书写，不能出现与 timeSpan 冲突的年龄。",
    "playerText.title 不能写“人生事件”“人生片段”“命运片段”“当前事件”“新的事件”等泛化标题，必须是当前处境的具体中文标题。",
    "playerText.body 正文至少要有两三句，先交代当前年龄下的具体处境、相关人物反应、物品/地点来历和选择压力，再给出选项；不要只写一句事件摘要。",
    "人生分岔必须由前文自然引出：用最近早年经历、上一段行动后果、家庭争执、NPC反应、线索或处境变化推动当前三个选项。不要写成随机弹出的事件卡，也不要把结果当成原因倒着写。",
    "选项里出现的人、物品、地点、组织或线索，必须先在 playerText.body 中铺垫过。例如选项提到道士、玉片、符文、后山或丹药，正文必须先说明它们为何在场、主角知道多少、为什么现在要选择。",
    "选项不能提前宣布成功，也不能把结局写成前提。选项只描述尝试方向、风险、方法或取舍，不要写成结果宣告。",
    "如果正文出现后来者、来人、陌生人或某个NPC，必须先在 playerText.body 中交代其声音、脚步、身影、身份表象或为何会出现在当前地点；不能只在选项里突然出现。",
    "choices[].fuzzySuccessLabel 只能写模糊风险或难度，例如“风险不明”“难度较低”“结果难以预料”“风险较高”。不能复述行动目标，不能写“说服母亲交易”“找到替代药材”“跟踪并获取信息”等像结果或意图摘要的文字。",
    "正式人生页会先显示 opening.earlyLifeTimeline 中从 0 岁开始的完整早年时间线；当前 playable_choices 事件只负责生成第一个真正人生分岔，不要再重复命运预览或早年阶段。",
    "每个新事件必须承接 recentEvents 和 recentMemory，说明此前选择如何继续影响当前处境，不能像随机事件卡一样割裂。",
    "不要机械一年一个事件；除非剧情需要，应该按关键阶段、关键节点或自然生活段落推进。",
    "事件来源由 engine 在 eventGeneration.sourceType 中提供。只有 sourceType=seed_pool 时才需要使用 selectedSeeds；其他来源应按来源说明生成，不要硬套池子事件。",
    "内容池是开放式软种子池，只能作为灵感、风格和约束，不能当成固定剧本或事件白名单。",
  ].join("\n");
}

function buildJsonRepairSystemPrompt({ responseType }) {
  return [
    "你是多世界 AI 人生模拟器的 JSON 协议修复器。",
    "只输出一个 JSON 对象，不要 Markdown，不要解释，不要输出 JSON 以外的文字。",
    "你的任务不是重写剧情，而是在尽量保留原意的前提下修复结构、字段和值，使其通过引擎校验。",
    `修复后的 responseType 必须保持为 ${responseType}。`,
    "schemaVersion 必须是 mvp.ai_event_response.v1。",
    "AI 仍然只能提出 statePatch；不得绕过引擎直接修改权威存档。",
    "不要泄露 hiddenStateNotes 或 NPC 隐藏秘密到 playerText，除非原始上下文已经揭露。",
    "如果 playerText（标题、正文、选项文本）里出现英文句子、形如 noble_dynasty_child 的下划线英文 ID，或“素材种子/seed/sourceType/事件来源/run started”等后台词，必须就地改写成纯中文的剧情表达，绝不能保留这些后台字符串。这类修复属于必须修复项，不要因此回退或丢弃其余正确内容。",
    "不要新增 choice_4；正常可玩响应只能有 choice_1、choice_2、choice_3。",
    "玩家自由输入只是尝试行动，不能因为玩家说了就保证成功。",
  ].join("\n");
}

function buildJsonRepairPrompt({ responseType, originalPrompt, invalidResponse, validationErrors }) {
  return {
    task: "repair_ai_event_response_json",
    targetResponseType: responseType,
    validationErrors,
    repairRules: [
      "Return one complete corrected AI response JSON object.",
      "Preserve the same worldId, runId, player-facing meaning, selected seeds, and intended consequences when possible.",
      "Add missing required arrays as empty arrays if no safe change is justified.",
      "Every visibleChanges item must be an object shaped like { type, target, amount?, currentValue?, source?, duration?, text }.",
      "If a visible change is only prose, convert it to { type: \"note\", target: \"run\", text: \"...\" }.",
      "For playable life_event/action_resolution responses, provide exactly 3 rich choices with ids choice_1, choice_2, choice_3.",
      "For ending_summary responses, use interactionMode ending, choices [], and freeform.allowed false.",
      "Rewrite any backend leak in playerText (title, body, choice text) into pure in-world Chinese: remove English sentences, raw snake_case ids (e.g. noble_dynasty_child), and backend concept words (素材种子/seed/sourceType/run started). Keep the player-facing meaning; only strip the leaked backend strings.",
      "Do not convert validation repair into a story event; the returned object must be the repaired target response.",
    ],
    originalPrompt,
    invalidResponse,
  };
}

function normalizeRepairedAiResponse(response, { responseType, prompt } = {}) {
  if (!response || typeof response !== "object" || Array.isArray(response)) return response;
  const playerText = normalizePlayerText(response.playerText, response);
  const runSnapshot = prompt?.run ?? {};
  const currentAge = Number.isFinite(runSnapshot.currentAge) ? runSnapshot.currentAge : 0;
  const normalizedResponseType = response.responseType ?? responseType;
  return {
    ...response,
    schemaVersion: response.schemaVersion ?? "mvp.ai_event_response.v1",
    responseType: normalizedResponseType,
    worldId: textOrFallback(response.worldId, runSnapshot.worldId ?? prompt?.world?.id ?? ""),
    runId: textOrFallback(response.runId, runSnapshot.runId ?? ""),
    turnId: textOrFallback(response.turnId, `turn_${normalizedResponseType}_${prompt?.seed ?? "repair"}`),
    timeSpan: normalizeTimeSpan(response.timeSpan, { responseType: normalizedResponseType, currentAge }),
    selectedSeeds: Array.isArray(response.selectedSeeds) ? response.selectedSeeds : [],
    interactionMode: normalizeInteractionMode(response.interactionMode, normalizedResponseType),
    playerText,
    event: normalizeEvent(response.event, {
      responseType: normalizedResponseType,
      seed: prompt?.seed,
      lifeStage: runSnapshot.lifeStage,
    }),
    freeform: normalizeFreeform(response.freeform, normalizedResponseType),
    visibleChanges: normalizeVisibleChanges(response.visibleChanges),
    statePatch: ensureEndingStatePatch(response.statePatch, prompt),
    internal: normalizeInternal(response.internal),
  };
}

function normalizePlayablePresentation(response, { responseType, prompt } = {}) {
  if (!response || typeof response !== "object" || Array.isArray(response)) return response;
  const normalizedResponseType = response.responseType ?? responseType;
  if (normalizedResponseType !== "life_event" && normalizedResponseType !== "action_resolution") return response;
  const currentAge = Number.isFinite(response.timeSpan?.ageEnd)
    ? response.timeSpan.ageEnd
    : Number.isFinite(prompt?.run?.currentAge)
      ? prompt.run.currentAge
      : 0;
  const body = response.playerText?.body ?? "";
  return {
    ...response,
    playerText: {
      ...(response.playerText ?? {}),
      title: withPlayableAgeTitle(response.playerText?.title, currentAge, body),
    },
    choices: Array.isArray(response.choices)
      ? response.choices.map((choice) => ({
          ...choice,
          intentTags: sanitizeIntentTags(choice?.intentTags),
          fuzzySuccessLabel: sanitizeFuzzySuccessLabel(choice?.fuzzySuccessLabel),
          riskLabel: sanitizeRiskLabel(choice?.riskLabel),
        }))
      : response.choices,
  };
}

function withPlayableAgeTitle(title, age, body = "") {
  const cleanTitle = String(title ?? "").trim().replace(/^(?:\d+|[零一二三四五六七八九十两]+)\s*岁\s*[:：、-]?\s*/, "");
  return `${age} 岁：${derivePlayableTitle(cleanTitle, body)}`;
}

function derivePlayableTitle(title, body = "") {
  if (title && !genericPlayableTitle(title)) return title;
  const text = String(body ?? "").replace(/\s+/g, "");
  if (/瘟疫|疫病|病/.test(text) && /玉片|玉/.test(text)) return "玉片与病势";
  if (/母亲|父亲|家人|监护/.test(text) && /交易|换|药|丹药/.test(text)) return "家中的抉择";
  if (/竹林|林中|树林/.test(text) && /珠|红光|暗红/.test(text)) return "竹林里的异物";
  if (/母亲|父亲|家人|监护/.test(text) && /争执|商量|犹豫|分歧/.test(text)) return "家中的分歧";
  if (/宗门|仙门|修士|灵根/.test(text)) return "仙缘初近";
  if (/梦|医院|失踪|怪谈|官方/.test(text)) return "平静下的异常";
  if (/水源|口粮|辐射|营地|拾荒/.test(text)) return "生存的压力";
  return "眼前的抉择";
}

function genericPlayableTitle(title) {
  return /^(人生事件|人生片段|命运片段|事件|当前事件|新的事件|命运的岔道|选择时刻|生活事件)$/.test(String(title ?? "").trim());
}

function sanitizeFuzzySuccessLabel(label) {
  const text = String(label ?? "").trim();
  if (!text) return "结果难以预料";
  if (/^成功率/.test(text)) return text.replace(/^成功率/, "可能性");
  if (/成功(?:获取|获得|隐藏|套取|击败|说服|逃脱|完成|进入|发现|掌控|解决)/.test(text)) return "结果难以预料";
  if (/说服|交易|跟踪|获取|获得|找到|发现|隐藏|套取|击败|逃脱|完成|进入|掌控|解决|保持警惕|替代药材|线索/.test(text)) return "结果难以预料";
  if (/必定|一定|保证|直接成功|必然/.test(text)) return "结果难以预料";
  return text;
}

// DeepSeek frequently returns playable choices that are valid prose but omit the engine-only
// intentTags/riskLabel fields. The validator requires both (and choice-resolution reads
// choice.intentTags / choice.riskLabel directly), so without backfilling here a complete,
// player-good response is rejected and the turn degrades into the age-aware mock. Normalize on
// the first pass so valid-but-incomplete choices pass without a repair round-trip.
function sanitizeIntentTags(tags) {
  if (Array.isArray(tags)) {
    const cleaned = tags
      .filter((tag) => typeof tag === "string" && tag.trim())
      .map((tag) => tag.trim());
    if (cleaned.length > 0) return cleaned;
  }
  return ["player_choice"];
}

const CHOICE_RISK_BANDS = new Set(["low", "medium", "high", "extreme", "safe"]);

function sanitizeRiskLabel(label) {
  const text = String(label ?? "").trim().toLowerCase();
  return CHOICE_RISK_BANDS.has(text) ? text : "medium";
}

// Mirrors tools/qa-free-actions.mjs isConsequential: the statePatch arrays + scoreDelta + any
// visibleChanges that make a resolution leave a real trace on the run.
const CONSEQUENCE_PATCH_KEYS = [
  "attributeChanges",
  "manifestationChanges",
  "exposureChanges",
  "relationshipChanges",
  "importantNPCUpdates",
  "factionChanges",
  "progressionChanges",
  "worldStateChanges",
  "memoryUpdates",
  "growthEvidenceChanges",
];

function isConsequentialResolution(response) {
  if (Array.isArray(response?.visibleChanges) && response.visibleChanges.length > 0) return true;
  const patch = response?.statePatch ?? {};
  if (typeof patch.scoreDelta === "number" && patch.scoreDelta !== 0) return true;
  return CONSEQUENCE_PATCH_KEYS.some((key) => Array.isArray(patch[key]) && patch[key].length > 0);
}

// Every resolved player action must leave at least a continuity trace. DeepSeek sometimes returns
// a vivid action_resolution whose statePatch arrays and visibleChanges are all empty, so the action
// has no mechanical consequence and the next turn has nothing in recentMemory to grow from (Bug B).
// When a resolution is non-consequential, backfill a minimal, player-safe memory of the action so
// the run remembers it (memoryUpdates flow into run.memory -> recentMemory in later prompts). This
// is the engine floor: we record that the action happened, but deliberately do NOT fabricate
// relationship/attribute numbers that could contradict the narrative the AI already wrote. Guarded
// to a present statePatch object so a wholly-missing statePatch still routes to validation/repair.
function ensureActionConsequence(response, { responseType, prompt } = {}) {
  if (responseType !== "action_resolution") return response;
  if (!response || typeof response !== "object" || Array.isArray(response)) return response;
  const patch = response.statePatch;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return response;
  if (isConsequentialResolution(response)) return response;

  return {
    ...response,
    statePatch: {
      ...patch,
      memoryUpdates: [
        ...(Array.isArray(patch.memoryUpdates) ? patch.memoryUpdates : []),
        { type: "free_action", text: buildActionMemoryText(prompt) },
      ],
    },
  };
}

function buildActionMemoryText(prompt) {
  const age = prompt?.run?.currentAge;
  const agePart = Number.isFinite(age) ? `${age}岁` : "这一程";
  const raw = resolutionActionText(prompt);
  const actionPart = raw ? raw.replace(/\s+/g, "").slice(0, 60) : "做出的这次选择";
  return `${agePart}：${actionPart}。这次行动当时没有立刻改变局面，但已经在身边留下了痕迹，后续会继续发酵。`;
}

function resolutionActionText(prompt) {
  const action = prompt?.action;
  if (!action) return "";
  if (action.kind === "choice") return String(action.selectedChoice?.text ?? "").trim();
  return String(action.freeformText ?? action.text ?? "").trim();
}

// The action resolution is the OUTCOME of the player's action — its prose + statePatch are merged
// into the lived timeline. It is not a new interactive branch; the next branch (with its 3 choices
// and free-form entry) is generated separately. Coerce every action_resolution into a
// non-interactive outcome so the model never spends tokens on, and the UI never surfaces, unused
// follow-up choices. Runs after normalization on both the first and repaired passes.
function coerceResolutionOutcome(response, { responseType } = {}) {
  if (responseType !== "action_resolution") return response;
  if (!response || typeof response !== "object" || Array.isArray(response)) return response;
  const freeform = response.freeform && typeof response.freeform === "object" && !Array.isArray(response.freeform)
    ? { ...response.freeform, allowed: false }
    : { allowed: false, clarificationNeeded: false, riskBand: "none", judgmentFactors: [] };
  return {
    ...response,
    interactionMode: "non_interactive",
    choices: [],
    freeform,
  };
}

function normalizeInteractionMode(interactionMode, responseType) {
  const allowed = new Set(["playable_choices", "freeform_confirmation", "non_interactive", "ending", "system_only"]);
  if (allowed.has(interactionMode)) return interactionMode;
  if (responseType === "life_event" || responseType === "action_resolution") return "playable_choices";
  if (responseType === "ending_summary") return "ending";
  if (responseType === "clarification_request") return "freeform_confirmation";
  return interactionMode;
}

function normalizePlayerText(playerText, response) {
  if (playerText && typeof playerText === "object" && !Array.isArray(playerText)) {
    return {
      ...playerText,
      visibleChanges: normalizeVisibleChanges(playerText.visibleChanges),
    };
  }
  if (typeof playerText === "string" && playerText.trim()) {
    return {
      title: textOrFallback(response.title, "未定的抉择"),
      body: normalizePlayableBodyText(playerText.trim()),
      visibleChanges: [],
    };
  }
  if (typeof response.title === "string" || typeof response.body === "string") {
    return {
      title: textOrFallback(response.title, "未定的抉择"),
      body: normalizePlayableBodyText(typeof response.body === "string" ? response.body : ""),
      visibleChanges: [],
    };
  }
  return {
    title: "未定的抉择",
    body: normalizePlayableBodyText(""),
    visibleChanges: [],
  };
}

function normalizePlayableBodyText(body) {
  // Do not fabricate narrative filler. If the provider body is missing or too thin, return it
  // as-is so validateAiResponse rejects it; requestValidatedAiResponse then throws and the
  // session layer (safeGenerateLifeEvent / safeGenerateActionResolution) falls back to the
  // age-aware mock generator instead of showing invented placeholder text to the player.
  return String(body ?? "").trim();
}

function textOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeVisibleChanges(changes) {
  if (changes === undefined || changes === null) return [];
  if (!Array.isArray(changes)) return changes;
  return changes.map((change, index) => {
    if (typeof change === "string") {
      return {
        type: "note",
        target: "run",
        text: change.trim() || `可见变化 ${index + 1}`,
      };
    }
    if (!change || typeof change !== "object" || Array.isArray(change)) {
      return change;
    }
    const text = typeof change.text === "string" && change.text.trim()
      ? change.text
      : summarizeVisibleChange(change, index);
    return {
      ...change,
      type: typeof change.type === "string" && change.type.trim() ? change.type : "note",
      target: typeof change.target === "string" && change.target.trim() ? change.target : "run",
      text,
    };
  });
}

function normalizeFreeform(freeform, responseType) {
  if (freeform && typeof freeform === "object" && !Array.isArray(freeform)) {
    return freeform;
  }
  if (responseType === "ending_summary") {
    return {
      allowed: false,
      clarificationNeeded: false,
      riskBand: "none",
      judgmentFactors: ["provider_repair_normalized"],
    };
  }
  if (responseType === "clarification_request") {
    return {
      allowed: true,
      clarificationNeeded: true,
      riskBand: "high",
      judgmentFactors: ["provider_repair_normalized"],
      confirmationPrompt: "请确认是否继续执行这个高风险自由行动。",
    };
  }
  return {
    allowed: true,
    clarificationNeeded: false,
    riskBand: "medium",
    judgmentFactors: ["provider_repair_normalized"],
  };
}

function normalizeTimeSpan(timeSpan, { responseType, currentAge }) {
  const fallback = defaultTimeSpan({ responseType, currentAge });
  if (!timeSpan || typeof timeSpan !== "object" || Array.isArray(timeSpan)) return fallback;

  const ageStart = finiteNumberOrFallback(timeSpan.ageStart, fallback.ageStart);
  const rawAgeEnd = finiteNumberOrFallback(timeSpan.ageEnd, fallback.ageEnd);
  const ageEnd = Math.max(ageStart, rawAgeEnd);
  const yearsElapsed = finiteNumberOrFallback(timeSpan.yearsElapsed, Math.max(0, ageEnd - ageStart));
  const pace = typeof timeSpan.pace === "string" && timeSpan.pace.trim() ? timeSpan.pace.trim() : fallback.pace;

  return {
    ...timeSpan,
    ageStart,
    ageEnd,
    yearsElapsed: Math.max(0, yearsElapsed),
    pace,
  };
}

function defaultTimeSpan({ responseType, currentAge }) {
  const sceneMoment = responseType === "ending_summary" || responseType === "action_resolution" || responseType === "clarification_request";
  return {
    ageStart: currentAge,
    ageEnd: sceneMoment ? currentAge : currentAge + 1,
    yearsElapsed: sceneMoment ? 0 : 1,
    pace: sceneMoment ? "scene_moment" : "yearly",
  };
}

function finiteNumberOrFallback(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeEvent(event, { responseType, seed, lifeStage }) {
  if (event && typeof event === "object" && !Array.isArray(event)) return event;
  return {
    eventId: `${responseType ?? "response"}_${seed ?? "repair"}`,
    lifeStage: lifeStage ?? "unknown",
    riskLabel: "medium",
    summaryTags: ["provider_repair_normalized"],
  };
}

function normalizeInternal(internal) {
  if (internal && typeof internal === "object" && !Array.isArray(internal)) {
    return {
      judgmentSummary: textOrFallback(internal.judgmentSummary, "Provider repair normalized protocol envelope."),
      validationFlags: Array.isArray(internal.validationFlags) ? internal.validationFlags : ["provider_repair_normalized"],
      hiddenStateNotes: typeof internal.hiddenStateNotes === "string" ? internal.hiddenStateNotes : "",
    };
  }
  return {
    judgmentSummary: "Provider repair normalized missing protocol envelope.",
    validationFlags: ["provider_repair_normalized"],
    hiddenStateNotes: "",
  };
}

// Player-facing fallback labels for attribute targets, so a visible change with no Chinese text
// never renders the raw English key (e.g. "intelligence +2") to the player. The observable
// attribute runtime keeps the same five player-facing names in every world.
const ATTRIBUTE_FALLBACK_LABELS = {
  appearance: "颜值",
  intelligence: "智力",
  constitution: "体质",
  familyBackground: "家境",
  luck: "运气",
};

function summarizeVisibleChange(change, index) {
  const rawTarget = typeof change.target === "string" && change.target.trim() ? change.target : `变化 ${index + 1}`;
  const target = ATTRIBUTE_FALLBACK_LABELS[rawTarget] ?? rawTarget;
  const amount = typeof change.amount === "number" ? ` ${change.amount >= 0 ? "+" : ""}${change.amount}` : "";
  return `${target}${amount}`;
}

function normalizeStatePatch(statePatch) {
  const emptyPatch = {
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
  };
  if (!statePatch || typeof statePatch !== "object" || Array.isArray(statePatch)) {
    return emptyPatch;
  }
  const normalized = { ...emptyPatch, ...statePatch };
  for (const key of [
    "attributeChanges",
    "manifestationChanges",
    "exposureChanges",
    "relationshipChanges",
    "importantNPCUpdates",
    "factionChanges",
    "progressionChanges",
    "worldStateChanges",
    "memoryUpdates",
    "growthEvidenceChanges",
  ]) {
    if (!Array.isArray(normalized[key])) normalized[key] = [];
  }
  if (typeof normalized.scoreDelta !== "number") normalized.scoreDelta = 0;
  return normalized;
}

function ensureEndingStatePatch(statePatch, prompt) {
  const normalized = normalizeStatePatch(statePatch);
  if (prompt?.task !== "generate_ending_summary") return normalized;

  const fallbackEnding = buildFallbackEndingValue(normalized, prompt);
  const endingIndex = normalized.worldStateChanges.findIndex((change) => change?.target === "ending");
  if (endingIndex >= 0) {
    const change = normalized.worldStateChanges[endingIndex];
    const currentValue = change.value && typeof change.value === "object" && !Array.isArray(change.value) ? change.value : {};
    change.value = {
      ...fallbackEnding,
      ...currentValue,
      id: textOrFallback(currentValue.id, fallbackEnding.id),
      name: textOrFallback(currentValue.name, fallbackEnding.name),
      tags: Array.isArray(currentValue.tags) ? currentValue.tags : fallbackEnding.tags,
      score: Number.isFinite(currentValue.score) ? currentValue.score : fallbackEnding.score,
      age: Number.isFinite(currentValue.age) ? currentValue.age : fallbackEnding.age,
      completed: true,
    };
    if (typeof change.source !== "string" || !change.source.trim()) {
      change.source = "provider_repair_normalized";
    }
    return normalized;
  }

  normalized.worldStateChanges.push({
    target: "ending",
    value: fallbackEnding,
    source: "provider_repair_normalized",
  });
  return normalized;
}

function buildFallbackEndingValue(statePatch, prompt) {
  const run = prompt?.run ?? {};
  return {
    id: `ai_summary_${prompt?.seed ?? "ending"}`,
    name: "AI 阶段性人生总结",
    tags: ["ai_summary", "provider_repair_normalized"],
    score: Math.max(0, Number(statePatch.scoreDelta) || Number(run.scoreSoFar) || 0),
    age: Number.isFinite(run.currentAge) ? run.currentAge : 0,
    completed: true,
    seed: prompt?.seed,
  };
}

function buildOpeningSequencePrompt({ run, world, seed }) {
  const firstAge = firstActionAge(run);
  return {
    task: "generate_birth_background_and_destiny_preview",
    seed,
    requiredShape: {
      responseType: "life_event",
      interactionMode: "non_interactive",
      choices: "empty array; no player-facing choices in birth and early childhood",
      freeform: "allowed false; free input opens only at first meaningful branch",
      statePatch: "must include all required arrays and scoreDelta; set opening.phase=first_branch_ready and store opening.earlyLifeTimeline",
    },
    openingRules: {
      firstActionAge: firstAge,
      defaultAutoAdvance: "0 to firstActionAge-1 must be stored as strict age-by-age timeline entries. first meaningful branch usually appears from 5 to 8.",
      specialEarlyChoiceRule: "Only born-knowing, reincarnation memory, immediate mythic manifestation, or similar special talents can justify earlier light choices; body and age limits still apply.",
      bodyMustInclude: [
        "birth place",
        "birth family",
        "parents or guardians",
        "how family background concretely appears",
        "how selected talents currently leave initial signs",
        "destiny preview: what the talents mean now, their blessing/risk, and why the player should care",
        "how nearby people see the player character",
        "how world background affects this birth",
        "initial situation",
      ],
      mustNotDo: [
        "do not provide choices",
        "do not open freeform",
        "do not show initial important NPC lists in playerText",
        "do not show unexplained details or future hook sections in playerText",
        "do not put early-life auto progression in playerText.body",
        "do not write future ages or future trigger conditions in the fate preview",
        "do not write empty yearly diary like age 0 born, age 1 walk; each yearly node still needs concrete age-appropriate life texture",
        "do not force a fixed plot route",
        "do not reveal hidden NPC secrets directly",
        "do not write internal NPC ids, raw roles, hidden true roles, or future identity reveals in playerText",
        "do not show labels like future foreshadowing or reveal future trigger conditions in playerText",
      ],
      hiddenHookRule: "True foreshadowing, hidden clues, hidden NPC identities, future trigger conditions, and route hooks must be stored in statePatch.worldStateChanges under opening.hiddenHooks/opening.unresolvedThreads or in internal.hiddenStateNotes. PlayerText may only show current, non-spoiler destiny texture.",
      earlyLifeTimelineRule: "statePatch.worldStateChanges must include target=opening.earlyLifeTimeline with one entry for every age from 0 to firstActionAge-1, in order. Example firstActionAge=7 means ages [0,1,2,3,4,5,6]. Do not include firstActionAge itself; that age is reserved for the first playable branch. Each body must match that exact age and avoid mentioning other ages.",
    },
    run: buildRunPromptSnapshot(run),
    world: buildWorldPromptSnapshot(world),
  };
}

function buildLifeEventPrompt({ run, world, seed, generationContext, minNextAge, eventContract }) {
  const lastEvent = run.eventHistory?.at(-1);
  const rawObservableScene = eventContract?.annualFactPackage?.primaryDelta
    ? sceneInputForAi(compileSceneObject({ run, annualFactPackage: eventContract.annualFactPackage }))
    : eventContract?.observableScene ?? null;
  const observableScene = sanitizeObservableSceneForPrompt(rawObservableScene);
  const safeEventContract = observableScene ? undefined : eventContract;
  const immediatePriorResolution = lastEvent?.responseType === "action_resolution"
    ? {
        title: lastEvent.playerText?.title,
        body: lastEvent.playerText?.body,
        resolvedFacts: run.worldState?.storyState?.facts ?? [],
        closedFacts: run.worldState?.storyState?.closedFacts ?? [],
        nextPressure: run.worldState?.storyState?.activePressures?.at(-1) ?? null,
      }
    : null;
  const timeProgression = Number.isFinite(minNextAge)
    ? {
        previousBranchAge: minNextAge - 1,
        minNextAge,
        rule: `上一段人生已经结算到 ${minNextAge - 1} 岁。这是新的人生分岔，时间必须向前推进：timeSpan.ageEnd 必须 ≥ ${minNextAge}（可按剧情自然跳过 1 到几年），标题“X 岁”的 X 等于 ageEnd，正文也写这个更晚的年龄。不要停留在上一段的年龄，也不要在同一年里再开一个新分岔。`,
      }
    : null;
  return {
    task: "generate_next_life_event",
    seed,
    requiredShape: {
      responseType: "life_event",
      interactionMode: "playable_choices",
      choices: "exactly 3 rich choices, ids choice_1..choice_3",
      freeform: "allowed true; UI provides optional 4th entry separately",
      statePatch: "must include all required arrays and scoreDelta",
    },
    timeProgression,
    eventGeneration: observableScene ? undefined : {
      sourceType: generationContext.sourceType,
      sourceInstruction: generationContext.sourceInstruction,
      poolMode: generationContext.poolMode,
      seedStrictness: generationContext.seedStrictness,
      aiAdaptation: generationContext.aiAdaptation,
      allowAiFreeGenerationWhenNoSeedFits: generationContext.allowAiFreeGenerationWhenNoSeedFits,
      selectedSeeds: generationContext.selectedSeeds,
      rule: "selectedSeeds are soft references, not fixed scripts. If sourceType is not seed_pool, generate from the sourceInstruction and current save instead of forcing a pool seed.",
    },
    immediatePriorResolution,
    continuityRules: {
      mustContinueFrom: "recentEvents, recentMemory, currentAge, NPC relationships, world progress, and unresolved foreshadowing.",
      growFromPriorResolution: "If immediatePriorResolution is present, this new branch must grow directly out of that resolution's consequence and its closing transition/dark-line. Continue the same lived thread and the people/tensions it left open; do not restart with an unrelated scene or ignore what just happened.",
      mustNotRepeat: "Do not repeat the birth background or early-life auto progression as if it is happening again.",
      firstBranchRule: "If this is the first playable branch after opening, timeSpan.ageStart/currentAge/timeSpan.ageEnd/yearsElapsed must be currentAge/currentAge/currentAge/0. It is the first choice node at the current age, not another auto-advance.",
      ageRule: "Every playable event title must be formatted as 'X 岁：事件名', where X equals timeSpan.ageEnd. Body and choices must fit that exact age.",
      causalityRule: "The current branch should arise from a prior situation or line of tension. Write the preceding context first, then the choice pressure; never reverse cause and effect.",
      pacingRule: "Avoid empty yearly logs. Generate a meaningful life node with enough context for the player to choose.",
    },
    observableScene,
    sceneRule: observableScene
      ? "observableScene 是唯一可写给玩家的年度场景合同。标题、正文和选项必须围绕 mainScene.requiredVisibleDelta；backgroundEchoes 只能轻轻提到，不能进入标题、开头或选项核心。forbiddenText 中的词不得出现在 playerText、choices 或 visibleChanges。"
      : undefined,
    eventContract: safeEventContract,
    contractRule: safeEventContract
      ? "eventContract is the authoritative narrative contract from the engine. Render it into Chinese prose and three choices without exposing backend field names. Do not violate mustNotInclude, closedFacts, forbiddenSceneSkeletons, forbiddenEventShapes, requiredStateChanges, or choiceIntents. Do not reopen a closed fact as a first discovery."
      : "No explicit event contract was selected for this turn; follow world rules and current save state.",
    run: buildRunPromptSnapshot(run),
    world: buildWorldPromptSnapshot(world),
  };
}

function sanitizeObservableSceneForPrompt(scene) {
  if (!scene) return null;
  return {
    schemaVersion: scene.schemaVersion,
    age: scene.age,
    title: scene.title,
    mainScene: scene.mainScene
      ? {
          openingBeat: scene.mainScene.openingBeat,
          requiredVisibleDelta: scene.mainScene.requiredVisibleDelta,
        }
      : undefined,
    worldFlavor: scene.worldFlavor?.text ? { text: scene.worldFlavor.text } : undefined,
    backgroundEchoes: (scene.backgroundEchoes ?? []).map((echo) => ({
      label: echo.label,
      limit: Number.isFinite(echo.maxSentences) ? `最多 ${echo.maxSentences} 句` : "最多一句",
      cannotOpenScene: echo.firstParagraphAllowed === false,
      cannotDriveChoices: echo.choiceDriverAllowed === false,
      textSignals: (echo.textSignals ?? []).filter((signal) => (
        typeof signal === "string" && signal.trim() && !/[a-z_]/i.test(signal)
      )),
    })),
    choices: (scene.choices ?? []).map((choice) => ({
      id: choice.id,
      textSeed: choice.textSeed,
      fuzzySuccessLabel: choice.fuzzySuccessLabel,
      riskLabel: choice.riskLabel,
    })),
  };
}

function buildActionResolutionPrompt({ run, sourceEvent, action, world, seed }) {
  const selectedChoice = action?.kind === "choice" ? sourceEvent.choices.find((choice) => choice.id === action.choiceId) : undefined;
  const chosenActionText = action?.kind === "choice" ? selectedChoice?.text : action?.text;
  const unresolvedThreads = run.worldState?.opening?.unresolvedThreads ?? [];
  return {
    task: "resolve_player_action",
    seed,
    requiredShape: {
      responseType: "action_resolution",
      interactionMode: "non_interactive",
      choices: "must be an empty array []; this is the outcome of the player's action, not a new branch with options",
      freeform: "allowed false; the next branch and its free-form entry are generated separately by the engine",
      statePatch: "must include all required arrays and scoreDelta",
    },
    resolutionWritingRule: {
      mustInclude: [
        "玩家刚才选择了什么或尝试了什么",
        "即时结果：玩家角色做了什么，当下发生了什么",
        "NPC反应：父母、监护人、师父、同伴、敌人或其他重要人物如何反应",
        "状态变化：身体、资源、关系、世界进度或环境有什么变化",
        "未来暗线：用不剧透的方式留下未解释细节，不要直接写未来触发条件",
        "下一阶段过渡：自然衔接到下一岁、下一阶段或下一节点",
      ],
      rule: "Do not write only one sentence of consequence. The result must feel like life continuing downward in a timeline.",
      proseVsNumbersRule: "散文保持叙事：写发生了什么、谁如何反应、接下来往哪走。不要在正文里复述已由 visibleChanges 承载的数值增减（例如不要写“关系+3”“智力+2”）。数值归 visibleChanges，正文归故事；否则合并进时间线节点后会变成“散文+数据表”双重报告。",
    },
    continuityRules: {
      immediatePriorSituation: {
        title: sourceEvent.playerText?.title,
        body: sourceEvent.playerText?.body,
        rule: "This resolution MUST continue directly from this exact prior situation. The consequence is caused by the player's specific action inside this specific scene, not generic life filler.",
      },
      chosenActionText,
      mustContinueFrom: "immediatePriorSituation + chosenActionText: name the concrete people, objects, places, and tensions already established in the prior situation; do not introduce unestablished entities in the consequence.",
      unresolvedThreads,
      threadRule: "unresolvedThreads are backend continuity anchors. Use them to keep the world consistent and to seed non-spoiler dark lines, but do not dump them into playerText as a list or reveal hidden triggers.",
    },
    action: {
      kind: action?.kind,
      choiceId: action?.choiceId,
      freeformText: action?.text,
      selectedChoice,
      rule: "Resolve the player action as an attempted action. Do not grant impossible results just because the player typed them.",
    },
    sourceEvent: {
      responseType: sourceEvent.responseType,
      turnId: sourceEvent.turnId,
      title: sourceEvent.playerText?.title,
      body: sourceEvent.playerText?.body,
      event: sourceEvent.event,
      selectedSeeds: sourceEvent.selectedSeeds,
      visibleChanges: sourceEvent.visibleChanges,
    },
    run: buildRunPromptSnapshot(run),
    world: buildWorldPromptSnapshot(world),
  };
}

function buildEndingSummaryPrompt({ run, world, seed, endingAge, endingReason }) {
  return {
    task: "generate_ending_summary",
    seed,
    ending: {
      responseType: "ending_summary",
      reason: endingReason,
      endingAge,
      interactionMode: "ending",
      choices: "must be an empty array",
      freeform: "allowed false",
      statePatch: "must store final ending data in worldStateChanges target ending and include scoreDelta",
      rule: "Write a biography-style life summary and final score from the current save. Do not reveal hidden NPC secrets unless already discovered.",
    },
    run: {
      ...buildRunPromptSnapshot(run),
      statuses: run.statuses,
      factions: run.factions,
      scoreSoFar: run.score ?? 0,
    },
    world: {
      ...buildWorldPromptSnapshot(world),
      endingSeeds: (world.endings?.endings ?? []).map((ending) => ({
        id: ending.id,
        name: ending.name,
        tags: ending.tags,
      })),
    },
  };
}

function chooseFirstActionAge(run) {
  const talentIds = new Set((run.player?.talents ?? []).map((talent) => talent.id));
  const hasEarlyConsciousness = [...talentIds].some((id) => /reincarnation|memory|fate|destiny|mythic|dream_walker/.test(id));
  const intelligence = run.player?.attributes?.intelligence?.potential ?? 4;
  if (hasEarlyConsciousness || intelligence >= 20) return 5;
  return 7;
}

function buildRunPromptSnapshot(run) {
  const promptView = buildPromptView(run);
  return {
    ...promptView,
    player: {
      ...promptView.player,
      talents: (run.player.talents ?? []).map((talent) => ({
        name: visibleTalentName(talent) || talentLabel(talent.id),
        rarity: talent.rarity,
        manifestationType: talent.manifestationType,
        tags: talent.tags,
        effects: talent.effects,
      })),
    },
    recentEvents: run.eventHistory.slice(-5).map((event) => ({
      responseType: event.responseType,
      eventId: event.event?.eventId,
      title: event.playerText?.title,
      body: event.playerText?.body?.slice(0, 1600),
      summaryTags: event.event?.summaryTags,
      selectedSeeds: event.selectedSeeds,
    })),
  };
}

function buildWorldPromptSnapshot(world) {
  return {
    id: world.id,
    name: world.config.name,
    primaryAxis: world.config.primaryAxis,
    secondaryProgression: world.config.secondaryProgression,
    routeFamilies: world.config.routeFamilies,
    aiTone: world.config.aiTone,
    forbiddenAssumptions: world.config.forbiddenAssumptions,
    factionSeeds: (world.factionSeeds?.factions ?? []).map((faction) => ({
      id: faction.id,
      typeTags: faction.typeTags,
      routeTags: faction.routeTags,
      riskLevel: faction.riskLevel,
      joinRequirementTags: faction.joinRequirementTags,
      creationRequirementTags: faction.creationRequirementTags,
      resourceTags: faction.resourceTags,
      conflictTags: faction.conflictTags,
    })),
    locationSeeds: (world.locationSeeds?.locations ?? []).map((location) => ({
      id: location.id,
      lifeStages: location.lifeStages,
      sceneTags: location.sceneTags,
      accessTags: location.accessTags,
      riskLevel: location.riskLevel,
      eventHooks: location.eventHooks,
      factionHooks: location.factionHooks,
    })),
  };
}

function parseJsonObject(content) {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}
