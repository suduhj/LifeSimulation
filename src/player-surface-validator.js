export const PLAYER_VIEW_SCHEMA_VERSION = "mvp.player_view.v1";

export const PLAYER_SURFACE_FORBIDDEN_KEYS = [
  "run",
  "session",
  "currentEvent",
  "eventHistory",
  "playerText",
  "statePatch",
  "playerContract",
  "panelViews",
  "rawContract",
  "gmContract",
  "annualFactPackage",
  "curriculumSlot",
  "threeLayerFocus",
  "openingLedger",
  "earlyLifeTimeline",
  "debug",
  "gmView",
  "rawResponse",
];

export const PLAYER_SURFACE_FORBIDDEN_TERMS = [
  "mentor_attention",
  "curriculumSlot",
  "threeLayerFocus",
  "annualFactPackage",
  "backgroundThreads",
  "assetRoles",
  "OLD_PATH_CURRENT_EVENT",
  "OLD_PATH_HISTORY",
  "OLD_PATH_OPENING",
  "人生课程",
  "背景回响",
  "主轴",
  "副轴",
  "旧线索",
];

const PLAYER_VIEW_TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "viewId",
  "sourceLifeNodeIds",
  "sourceEventIds",
  "header",
  "currentScene",
  "timeline",
  "choices",
  "panels",
  "visibleChanges",
  "generatedAtTurn",
  "safetyHash",
]);

export function validatePlayerSurface(view) {
  const errors = [];
  if (!view || typeof view !== "object" || Array.isArray(view)) {
    return { ok: false, errors: ["PlayerView must be an object"] };
  }
  if (view.schemaVersion !== PLAYER_VIEW_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PLAYER_VIEW_SCHEMA_VERSION}`);
  }
  for (const key of ["viewId", "header", "currentScene", "timeline", "choices", "panels", "visibleChanges", "safetyHash"]) {
    if (!(key in view)) errors.push(`PlayerView missing ${key}`);
  }
  for (const key of Object.keys(view)) {
    if (!PLAYER_VIEW_TOP_LEVEL_KEYS.has(key)) errors.push(`PlayerView top-level key is not allowed: ${key}`);
  }
  scanUnsafeValue(view, { errors, path: "playerView" });
  return { ok: errors.length === 0, errors };
}

export function assertPlayerSurfaceSafe(view) {
  const validation = validatePlayerSurface(view);
  if (!validation.ok) {
    throw new Error(`PlayerView unsafe: ${validation.errors.join("; ")}`);
  }
  return view;
}

export function scanUnsafeValue(value, { errors, path }) {
  if (typeof value === "string") {
    for (const term of PLAYER_SURFACE_FORBIDDEN_TERMS) {
      if (term && value.includes(term)) errors.push(`${path} contains forbidden term: ${term}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeValue(item, { errors, path: `${path}[${index}]` }));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (PLAYER_SURFACE_FORBIDDEN_KEYS.includes(key)) {
      errors.push(`${path}.${key} is forbidden`);
    }
    scanUnsafeValue(child, { errors, path: `${path}.${key}` });
  }
}
