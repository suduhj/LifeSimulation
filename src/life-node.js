import { attributeRealityContractFor } from "./attribute-reality-contract.js";
import { validateLifeNode } from "./life-node-validator.js";
import { resolveWorldOrigin } from "./world-origin-resolver.js";

export const LIFE_NODE_SCHEMA_VERSION = "mvp.life_node.v1";

export function buildOpeningLifeNodesFromOriginLedger({ run, response, ledger, sourceEventIds = [] } = {}) {
  const nodes = Array.isArray(ledger?.nodes) ? ledger.nodes : [];
  return nodes
    .map((node) => buildOpeningLifeNodeFromOriginNode({ run, response, ledger, node, sourceEventIds }))
    .filter(Boolean);
}

export function buildLifeNodeFromResponse({ run, response, sourceEventIds = [] } = {}) {
  const nodeType = nodeTypeForResponse(response);
  const annualOutcome = response?.statePatch?.yearlyOutcomes?.[0];
  const observableScene = response?.observableScene;
  const age = Math.max(0, Math.floor(Number(
    nodeType === "annual_event"
      ? annualOutcome?.age ?? observableScene?.age ?? response?.timeSpan?.ageEnd ?? response?.timeSpan?.ageStart ?? run?.player?.age
      : response?.timeSpan?.ageEnd ?? response?.timeSpan?.ageStart ?? run?.player?.age,
  ) || 0));
  const visibleContract = visibleContractFor({ response, annualOutcome, observableScene, nodeType });
  const candidate = {
    schemaVersion: LIFE_NODE_SCHEMA_VERSION,
    nodeId: nodeIdFor({ response, age, nodeType, annualOutcome, visibleContract }),
    age,
    nodeType,
    sourceEventIds,
    visibleContract,
    attributeReality: attributeRealityForRun(run),
    originReality: originRealityForRun(run),
    storyAssetBudgets: storyAssetBudgetsFor({ observableScene, response }),
    paragraphs: paragraphsForResponse({ response, visibleContract, nodeType, age, observableScene }),
    choices: choicesForResponse(response),
    visibleChanges: Array.isArray(response?.visibleChanges) ? structuredClone(response.visibleChanges) : [],
  };

  const validation = validateLifeNode(candidate);
  if (validation.ok) return candidate;
  return fallbackLifeNode({ candidate, validation });
}

export function lifeNodeEventPayload(lifeNode) {
  return structuredClone(lifeNode);
}

function nodeTypeForResponse(response = {}) {
  if (response.responseType === "ending_summary" || response.interactionMode === "ending") return "ending";
  if (response.responseType === "action_resolution") return "action_resolution";
  if (response.interactionMode === "non_interactive" || /opening/i.test(String(response.event?.eventId ?? response.turnId ?? ""))) {
    return "opening_year";
  }
  return "annual_event";
}

function nodeIdFor({ response, age, nodeType, annualOutcome, visibleContract }) {
  if (nodeType === "annual_event") {
    const slot = visibleContract?.mainHumanDomain || visibleContract?.curriculumSlot || "annual";
    return annualOutcome?.outcomeId
      ? `life_node_${annualOutcome.outcomeId}`
      : `year_${age}_annual_${safeId(slot)}`;
  }
  const base = response?.turnId || response?.event?.eventId || `${nodeType}_${age}`;
  return `life_node_${safeId(base)}_${nodeType}`;
}

function buildOpeningLifeNodeFromOriginNode({ run, response, ledger, node, sourceEventIds = [] }) {
  if (!Number.isFinite(Number(node?.age))) return undefined;
  const age = Math.max(0, Math.floor(Number(node.age)));
  const visibleContract = {
    requiredLifeDelta: openingRequiredLifeDeltaFor(node),
    mainHumanDomain: "opening_year",
    forbiddenText: [
      "出生底色",
      "依附与感知",
      "牙牙学语",
      "好奇初醒",
      "家庭边界",
      "性格成形",
      "岔路前夜",
      "mentor_attention",
      "curriculumSlot",
    ],
  };
  const candidate = {
    schemaVersion: LIFE_NODE_SCHEMA_VERSION,
    nodeId: `opening_year_${age}_${safeId(run?.runId ?? response?.runId ?? "run")}`,
    age,
    nodeType: "opening_year",
    sourceEventIds,
    visibleContract,
    attributeReality: attributeRealityForRun(run),
    originReality: originRealityForRun(run),
    storyAssetBudgets: {},
    paragraphs: [openingBodyFromOriginNode({ run, node, age })].filter(Boolean),
    choices: [],
    visibleChanges: [],
  };
  const validation = validateLifeNode(candidate);
  if (validation.ok) return candidate;
  return fallbackLifeNode({ candidate, validation });
}

function openingRequiredLifeDeltaFor(node = {}) {
  const factor = Array.isArray(node.originFactors) ? node.originFactors[0] : undefined;
  return {
    learning: "早年学习兴趣开始留下痕迹",
    household: "家庭日常责任开始塑造你",
    social: "同龄关系开始影响你的成长",
    care: "照护与身体状态改变了家人的安排",
    talent: "天赋迹象只在日常边缘轻微显露",
  }[factor?.category] ?? "出生与早年环境塑造了你的生活底色";
}

function openingBodyFromOriginNode({ run, node, age }) {
  const body = String(node?.body ?? "").trim();
  if (age === 0) {
    return [birthRealityPrefix(run), body].filter(Boolean).join("");
  }
  return body;
}

function birthRealityPrefix(run) {
  const family = run?.player?.growthLedger?.attributes?.familyBackground?.potential
    ?? run?.player?.attributes?.familyBackground?.potential
    ?? 4;
  const worldId = run?.worldId;
  const tier = family >= 12 ? "high" : family <= 3 ? "low" : "ordinary";
  const byWorld = {
    cultivation: {
      high: "你出生在能接触宗门、商号或修真旧账的人家，最先包围你的不是贫寒，而是资源、规矩和旁人的期待。",
      ordinary: "你出生在能维持安稳日子的普通人家，家里给得起照看，却仍要小心衡量仙门传闻带来的风险。",
      low: "你出生在资源紧巴的凡人家庭，柴米、活计和长辈的谨慎比仙门传说更早压到生活里。",
    },
    cthulhu: {
      high: "你出生在体面街区或专业家庭里，医院、档案、社交关系和沉默的规矩从一开始就围住了你。",
      ordinary: "你出生在表面正常的城市家庭，日常秩序仍能运转，只是某些新闻和传闻被大人轻轻避开。",
      low: "你出生在城市边缘或拮据家庭里，照看你的人更关心房租、工作和安全，异常只能被压成沉默。",
    },
    wasteland: {
      high: "你出生在掌握物资、医疗、技术或营地关系的家庭里，生存压力没有消失，却从一开始就带着责任和目光。",
      ordinary: "你出生在勉强有秩序的营地家庭，水、药、食物和监护人的判断共同决定你能怎样长大。",
      low: "你出生在缺粮、临时棚屋或边缘队伍附近，活下去本身就是第一件被全家盯紧的事。",
    },
  };
  return byWorld[worldId]?.[tier] ?? byWorld.cthulhu[tier];
}

function visibleContractFor({ response, annualOutcome, observableScene, nodeType }) {
  const requiredLifeDelta = annualOutcome?.curriculum?.requiredHumanDelta
    || observableScene?.mainScene?.requiredVisibleDelta
    || response?.event?.purpose
    || response?.playerText?.body?.slice(0, 80)
    || "";
  const mainHumanDomain = annualOutcome?.curriculum?.slot
    || observableScene?.mainScene?.domain
    || response?.event?.sceneType
    || nodeType;
  return {
    requiredLifeDelta,
    mainHumanDomain,
    forbiddenText: [
      ...(observableScene?.forbiddenText ?? []),
      "mentor_attention",
      "curriculumSlot",
      "年度变化",
      "人生课程",
      "旧线索",
      "背景回响",
      "主轴",
      "副轴",
    ],
  };
}

function attributeRealityForRun(run) {
  const attributes = run?.player?.growthLedger?.attributes ?? run?.player?.attributes ?? {};
  return Object.fromEntries(["appearance", "intelligence", "constitution", "familyBackground", "luck"].map((attribute) => {
    const value = attributes[attribute]?.effective ?? attributes[attribute]?.potential ?? attributes[attribute]?.manifested ?? 0;
    return [attribute, attributeRealityContractFor({ attribute, value, worldId: run?.worldId })];
  }));
}

function originRealityForRun(run) {
  const resolved = run?.worldState?.opening?.resolvedOrigin
    ?? run?.worldState?.storyState?.originLedger?.resolvedOrigin;
  if (resolved) return structuredClone(resolved);
  return resolveWorldOrigin({ run, seed: run?.seed ?? run?.setup?.seed ?? 1 });
}

function storyAssetBudgetsFor({ observableScene, response }) {
  const budgets = {};
  for (const echo of observableScene?.backgroundEchoes ?? []) {
    const key = safeId(echo.assetId || echo.label || "background_echo");
    budgets[key] = {
      roleThisYear: echo.role ?? "background_echo",
      maxSentences: Number.isFinite(echo.maxSentences) ? echo.maxSentences : 1,
      cannotOpenScene: echo.firstParagraphAllowed === false,
      cannotDriveChoices: echo.choiceDriverAllowed === false,
      textSignals: Array.isArray(echo.textSignals) ? [...echo.textSignals] : [],
      mainPressureAllowed: echo.mainPressureAllowed !== false,
    };
  }
  for (const [key, role] of Object.entries(response?.event?.assetRoles ?? {})) {
    budgets[safeId(key)] = {
      ...(budgets[safeId(key)] ?? {}),
      roleThisYear: typeof role === "string" ? role : role?.role ?? "background_echo",
      maxSentences: Number.isFinite(role?.maxSentences) ? role.maxSentences : budgets[safeId(key)]?.maxSentences ?? 1,
      cannotOpenScene: role?.cannotOpenScene ?? true,
      cannotDriveChoices: role?.cannotDriveChoices ?? true,
      textSignals: Array.isArray(role?.textSignals) ? [...role.textSignals] : budgets[safeId(key)]?.textSignals ?? [],
      mainPressureAllowed: role?.mainPressureAllowed !== false && budgets[safeId(key)]?.mainPressureAllowed !== false,
    };
  }
  return budgets;
}

function paragraphsForResponse({ response, visibleContract, nodeType, age, observableScene }) {
  if (nodeType === "annual_event") return annualParagraphs({ visibleContract, observableScene, age });
  const body = stripTitleFromBody(response?.playerText?.body ?? "", age);
  const paragraphs = String(body)
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length) return paragraphs;
  if (nodeType === "action_resolution") return ["你的选择已经落下，身边的人和接下来的日子因此出现了新的变化。"];
  if (nodeType === "ending") return ["这一段人生走到尾声，留下的结果被系统记录下来。"];
  return [`这一年真正改变的是：${visibleContract.requiredLifeDelta || "身边生活出现了新的安排"}`];
}

function annualParagraphs({ visibleContract, observableScene, age }) {
  const requiredDelta = visibleContract?.requiredLifeDelta || observableScene?.mainScene?.requiredVisibleDelta || "身边生活出现了新的安排";
  const openingBeat = observableScene?.mainScene?.openingBeat || "";
  const worldFlavor = observableScene?.worldFlavor?.text || observableScene?.worldFlavor?.element || "";
  const first = `${age}岁这一年，${requiredDelta}。${openingBeat}`.trim();
  const second = worldFlavor
    ? `这件事首先改变的是你的日常节奏，${worldFlavor}只在旁边添了一层世界气息，没有盖过今年真正的人生变化。`
    : "这件事首先改变的是你的日常节奏，也让身边人对你的安排和目光出现了新的方向。";
  return [first, second].filter(Boolean);
}

function choicesForResponse(response = {}) {
  return (Array.isArray(response.choices) ? response.choices : []).slice(0, 3).map((choice, index) => ({
    id: choice?.id ?? `choice_${index + 1}`,
    text: String(choice?.text ?? "").trim(),
    riskLabel: choice?.riskLabel ?? "unknown",
    fuzzySuccessLabel: choice?.fuzzySuccessLabel ?? "",
  })).filter((choice) => choice.text);
}

function fallbackLifeNode({ candidate, validation }) {
  const lifeDelta = candidate.visibleContract?.requiredLifeDelta || "身边生活出现了新的安排";
  const paragraphs = candidate.nodeType === "action_resolution"
    ? ["你的选择被记录下来，眼下的生活因此出现了新的后续。"]
    : [`这一年，${lifeDelta}。`];
  return {
    ...candidate,
    paragraphs,
    choices: sanitizeChoices(candidate.choices),
    visibleChanges: sanitizeVisibleChanges(candidate.visibleChanges),
    internalValidationErrors: validation.errors,
  };
}

function sanitizeChoices(choices = []) {
  return (choices ?? []).map((choice, index) => ({
    id: choice.id ?? `choice_${index + 1}`,
    text: choice.text || "先稳住眼下的新变化，再观察身边人的反应。",
    riskLabel: choice.riskLabel ?? "unknown",
    fuzzySuccessLabel: choice.fuzzySuccessLabel ?? "",
  }));
}

function sanitizeVisibleChanges(changes = []) {
  return (Array.isArray(changes) ? changes : []).filter((change) => {
    const text = typeof change === "string" ? change : change?.text;
    return !/\b[a-z][a-z0-9]*_[a-z0-9_]+\b/i.test(String(text ?? ""));
  });
}

function stripTitleFromBody(body, age) {
  const text = String(body ?? "").trim();
  if (!text) return "";
  return text.replace(new RegExp(`^\\s*${age}\\s*岁\\s*[:：][^\\n]+\\n?`), "").trim();
}

function safeId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-z0-9_\u4e00-\u9fa5-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    || "node";
}
