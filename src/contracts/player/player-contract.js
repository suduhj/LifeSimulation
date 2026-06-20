import { buildPanelViews } from "../../selectors/index.js";

export const PLAYER_CONTRACT_SCHEMA_VERSION = "mvp.player_contract.v1";

export const PLAYER_CONTRACT_FORBIDDEN_KEYS = [
  "currentEvent",
  "eventHistory",
  "playerText",
  "statePatch",
  "annualFactPackage",
  "curriculumSlot",
  "threeLayerFocus",
  "debug",
  "gmView",
  "rawResponse",
];

export const PLAYER_CONTRACT_FORBIDDEN_TERMS = [
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

const PLAYER_CONTRACT_TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "header",
  "currentScene",
  "choices",
  "timeline",
  "panels",
  "visibleChanges",
]);

export function buildPlayerContract({ run, currentEvent, panelViews } = {}) {
  const views = panelViews ?? buildPanelViews(run);
  const candidate = {
    schemaVersion: PLAYER_CONTRACT_SCHEMA_VERSION,
    header: buildHeader({ run, panelViews: views }),
    currentScene: buildCurrentScene({ run, currentEvent }),
    choices: buildChoices(currentEvent),
    timeline: buildTimeline(views),
    panels: buildPanels(views),
    visibleChanges: buildVisibleChanges(currentEvent),
  };

  const validation = validatePlayerContract(candidate);
  if (validation.valid) return candidate;
  return safePlayerContractFallback({ run, panelViews: views });
}

export function validatePlayerContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    return { valid: false, errors: ["PlayerContract must be an object"] };
  }
  if (contract.schemaVersion !== PLAYER_CONTRACT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PLAYER_CONTRACT_SCHEMA_VERSION}`);
  }
  for (const key of ["header", "currentScene", "choices", "timeline", "panels", "visibleChanges"]) {
    if (!(key in contract)) errors.push(`PlayerContract missing ${key}`);
  }
  for (const key of Object.keys(contract)) {
    if (!PLAYER_CONTRACT_TOP_LEVEL_KEYS.has(key)) errors.push(`PlayerContract top-level key is not allowed: ${key}`);
  }
  scanUnsafeContractValue(contract, { errors, path: "playerContract" });
  return { valid: errors.length === 0, errors };
}

export function assertPlayerContractSafe(contract) {
  const validation = validatePlayerContract(contract);
  if (!validation.valid) {
    throw new Error(`PlayerContract unsafe: ${validation.errors.join("; ")}`);
  }
  return contract;
}

export function safePlayerContractFallback({ run, panelViews } = {}) {
  const views = panelViews ?? (run ? buildPanelViews(run) : {});
  return {
    schemaVersion: PLAYER_CONTRACT_SCHEMA_VERSION,
    header: buildHeader({ run, panelViews: views }),
    currentScene: {
      age: safeAge(run),
      nodeType: "safe_fallback",
      body: "当前内容未通过玩家可见安全检查，已暂时隐藏。",
    },
    choices: [],
    timeline: [],
    panels: {
      main: views?.main ? structuredClone(views.main) : {},
      attributes: views?.attributes ? structuredClone(views.attributes) : {},
    },
    visibleChanges: [],
  };
}

function buildHeader({ run, panelViews }) {
  const main = panelViews?.main ?? {};
  const name = main.character?.name ?? run?.player?.name ?? "";
  const age = Number.isFinite(main.character?.age) ? main.character.age : safeAge(run);
  const world = main.world?.label ?? run?.worldId ?? "";
  const growthStage = main.growthStage?.label ?? run?.player?.lifeStage ?? "";
  const coreTalent = main.coreTalents?.[0] ?? "";
  return {
    title: [name, `${age}岁`, world].filter(Boolean).join(" · "),
    characterName: name,
    age,
    world,
    growthStage,
    coreTalent,
  };
}

function buildCurrentScene({ run, currentEvent }) {
  if (!currentEvent) {
    return {
      age: safeAge(run),
      nodeType: "none",
      body: "",
    };
  }
  return {
    age: Number.isFinite(currentEvent?.timeSpan?.ageEnd)
      ? currentEvent.timeSpan.ageEnd
      : Number.isFinite(currentEvent?.timeSpan?.ageStart)
        ? currentEvent.timeSpan.ageStart
        : safeAge(run),
    nodeType: playerNodeType(currentEvent),
    interactionMode: currentEvent?.interactionMode ?? "",
    freeformAllowed: currentEvent?.freeform?.allowed === true,
    body: String(currentEvent?.playerText?.body ?? "").trim(),
  };
}

function buildChoices(currentEvent) {
  return (Array.isArray(currentEvent?.choices) ? currentEvent.choices : []).slice(0, 3).map((choice, index) => ({
    id: choice?.id ?? `choice_${index + 1}`,
    text: String(choice?.text ?? "").trim(),
    riskLabel: choice?.riskLabel ?? "",
    fuzzySuccessLabel: choice?.fuzzySuccessLabel ?? "",
  })).filter((choice) => choice.text);
}

function buildTimeline(panelViews) {
  return (Array.isArray(panelViews?.story?.timeline) ? panelViews.story.timeline : []).map((entry) => ({
    age: entry.age,
    nodeType: entry.nodeType ?? entry.kind ?? "event",
    body: String(entry.body ?? "").trim(),
    changes: visibleChangeTexts(entry.changes),
  })).filter((entry) => entry.body);
}

function buildPanels(panelViews) {
  return {
    main: panelViews?.main ? structuredClone(panelViews.main) : {},
    attributes: panelViews?.attributes ? structuredClone(panelViews.attributes) : {},
    story: {
      timeline: buildTimeline(panelViews),
      visibleFacts: Array.isArray(panelViews?.story?.visibleFacts)
        ? structuredClone(panelViews.story.visibleFacts)
        : [],
    },
  };
}

function buildVisibleChanges(currentEvent) {
  return visibleChangeTexts(currentEvent?.visibleChanges);
}

function visibleChangeTexts(changes = []) {
  return (Array.isArray(changes) ? changes : [])
    .map((change) => {
      if (typeof change === "string") return { text: change };
      return {
        type: change?.type ?? "note",
        target: change?.target ?? "run",
        text: String(change?.text ?? "").trim(),
      };
    })
    .filter((change) => change.text);
}

function playerNodeType(event) {
  if (event?.responseType === "action_resolution") return "action_resolution";
  if (event?.responseType === "ending_summary") return "ending";
  if (event?.interactionMode === "non_interactive") return "opening_year";
  return "annual_event";
}

function safeAge(run) {
  return Math.max(0, Math.floor(Number(run?.player?.age) || 0));
}

function scanUnsafeContractValue(value, { errors, path }) {
  if (typeof value === "string") {
    for (const term of PLAYER_CONTRACT_FORBIDDEN_TERMS) {
      if (term && value.includes(term)) errors.push(`${path} contains forbidden term: ${term}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeContractValue(item, { errors, path: `${path}[${index}]` }));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (PLAYER_CONTRACT_FORBIDDEN_KEYS.includes(key)) {
      errors.push(`${path}.${key} is forbidden`);
    }
    scanUnsafeContractValue(child, { errors, path: `${path}.${key}` });
  }
}
