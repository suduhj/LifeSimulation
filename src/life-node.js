import { attributeRealityContractFor } from "./attribute-reality-contract.js";
import { validateLifeNode } from "./life-node-validator.js";
import { resolveWorldOrigin } from "./world-origin-resolver.js";

export const LIFE_NODE_SCHEMA_VERSION = "mvp.life_node.v1";

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
      cannotOpenScene: echo.titleAllowed === false,
      cannotDriveChoices: echo.choiceDriverAllowed === false,
    };
  }
  for (const [key, role] of Object.entries(response?.event?.assetRoles ?? {})) {
    budgets[safeId(key)] = {
      ...(budgets[safeId(key)] ?? {}),
      roleThisYear: typeof role === "string" ? role : role?.role ?? "background_echo",
      maxSentences: Number.isFinite(role?.maxSentences) ? role.maxSentences : budgets[safeId(key)]?.maxSentences ?? 1,
      cannotOpenScene: role?.cannotOpenScene ?? true,
      cannotDriveChoices: role?.cannotDriveChoices ?? true,
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
