import { buildCapabilityPackages, buildDevelopmentalExpression } from "../../capability-package.js";

export const PROMPT_CONTRACT_SCHEMA_VERSION = "mvp.prompt_contract.v1";

export const PROMPT_CONTRACT_FORBIDDEN_KEYS = [
  "currentEvent",
  "eventHistory",
  "playerText",
  "statePatch",
  "annualFactPackage",
  "curriculumSlot",
  "threeLayerFocus",
  "rawResponse",
  "debug",
];

export const PROMPT_CONTRACT_FORBIDDEN_TERMS = [
  "RAW_EVENT_BODY_MARKER",
  "mentor_attention",
  "curriculumSlot",
  "threeLayerFocus",
  "annualFactPackage",
  "backgroundThreads",
  "assetRoles",
  "人生课程",
  "背景回响",
  "主轴",
  "副轴",
  "旧线索",
];

export function buildPromptContract({ run, observableScene, choicePressure } = {}) {
  const contract = {
    schemaVersion: PROMPT_CONTRACT_SCHEMA_VERSION,
    runContext: buildPromptSafeRunSnapshot(run),
    recentLifeNodes: buildRecentLifeNodeSummaries(run),
    visibleScene: buildVisibleScene(observableScene),
    choicePressure: cleanPromptText(choicePressure),
  };
  const validation = validatePromptContract(contract);
  if (validation.valid) return contract;
  return {
    schemaVersion: PROMPT_CONTRACT_SCHEMA_VERSION,
    runContext: buildPromptSafeRunSnapshot(run),
    recentLifeNodes: [],
    visibleScene: buildVisibleScene(observableScene),
    choicePressure: "",
  };
}

export function buildPromptSafeRunSnapshot(run) {
  return {
    schemaVersion: "mvp.prompt_safe_run.v1",
    runId: run?.runId,
    worldId: run?.worldId,
    currentAge: Math.max(0, Math.floor(Number(run?.player?.age) || 0)),
    lifeStage: run?.player?.lifeStage,
    player: {
      name: run?.player?.name,
      gender: run?.player?.gender,
      personality: run?.player?.personality?.label ?? run?.player?.personality?.id,
      talents: (run?.player?.talents ?? []).map((talent) => ({
        rarity: talent.rarity,
        manifestationType: talent.manifestationType,
        tags: Array.isArray(talent.tags) ? talent.tags.slice(0, 6) : [],
      })),
      attributes: structuredClone(run?.player?.attributes ?? {}),
      capabilityPackages: buildCapabilityPackages(run),
      developmentalExpression: buildDevelopmentalExpression(run),
    },
  };
}

export function validatePromptContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    return { valid: false, errors: ["PromptContract must be an object"] };
  }
  if (contract.schemaVersion !== PROMPT_CONTRACT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PROMPT_CONTRACT_SCHEMA_VERSION}`);
  }
  scanUnsafePromptValue(contract, { errors, path: "promptContract" });
  return { valid: errors.length === 0, errors };
}

export function assertPromptContractSafe(contract) {
  const validation = validatePromptContract(contract);
  if (!validation.valid) {
    throw new Error(`PromptContract unsafe: ${validation.errors.join("; ")}`);
  }
  return contract;
}

function buildRecentLifeNodeSummaries(run) {
  return (run?.worldState?.storyState?.lifeNodes ?? []).slice(-5).map((node) => ({
    age: node.age,
    type: nodeTypeLabel(node.nodeType),
    summary: cleanPromptText((node.paragraphs ?? []).join("\n").slice(0, 240)),
    visibleDelta: cleanPromptText(node.visibleContract?.requiredLifeDelta ?? ""),
  })).filter((node) => node.summary || node.visibleDelta);
}

function buildVisibleScene(scene) {
  if (!scene) return undefined;
  return {
    age: scene.age,
    requiredVisibleDelta: cleanPromptText(scene.mainScene?.requiredVisibleDelta ?? ""),
    openingBeat: cleanPromptText(scene.mainScene?.openingBeat ?? ""),
    worldFlavor: cleanPromptText(scene.worldFlavor?.text ?? scene.worldFlavor?.element ?? ""),
    choices: (scene.choices ?? []).slice(0, 3).map((choice, index) => ({
      id: choice.id ?? `choice_${index + 1}`,
      textSeed: cleanPromptText(choice.textSeed ?? choice.text ?? ""),
      riskLabel: choice.riskLabel ?? "",
      fuzzySuccessLabel: choice.fuzzySuccessLabel ?? "",
    })),
  };
}

function nodeTypeLabel(nodeType) {
  return {
    opening_year: "早年节点",
    annual_event: "年度节点",
    action_resolution: "选择结果",
    ending: "结局",
  }[nodeType] ?? "人生节点";
}

function cleanPromptText(value) {
  let text = String(value ?? "");
  for (const term of PROMPT_CONTRACT_FORBIDDEN_TERMS) {
    text = text.replaceAll(term, "");
  }
  return text.replace(/\s+/g, " ").trim();
}

function scanUnsafePromptValue(value, { errors, path }) {
  if (typeof value === "string") {
    for (const term of PROMPT_CONTRACT_FORBIDDEN_TERMS) {
      if (term && value.includes(term)) errors.push(`${path} contains forbidden term: ${term}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafePromptValue(item, { errors, path: `${path}[${index}]` }));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (PROMPT_CONTRACT_FORBIDDEN_KEYS.includes(key)) {
      errors.push(`${path}.${key} is forbidden`);
    }
    scanUnsafePromptValue(child, { errors, path: `${path}.${key}` });
  }
}
