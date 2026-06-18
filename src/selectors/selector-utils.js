import { visibleTalentName } from "../localization.js";
import { SETUP_ATTRIBUTE_KEYS, SETUP_ATTRIBUTE_LABELS } from "../setup-session.js";

export const PANEL_VIEW_SCHEMA_VERSION = "mvp.panel_views.v1";

export const WORLD_LABELS = {
  cultivation: "修仙世界",
  cthulhu: "克苏鲁生活世界",
  wasteland: "末日废土",
};

export const LIFE_STAGE_LABELS = {
  birth: "出生期",
  childhood: "童年",
  adolescence: "少年早期",
  youth: "青年",
  adulthood: "成年",
  middleAge: "中年",
  oldAge: "老年",
};

export const DEVELOPMENT_STAGE_LABELS = {
  infant: "出生感知期",
  toddler: "幼儿依附期",
  early_child: "幼年显化期",
  child: "童年成长期",
  adolescent: "少年成长期",
  adult: "成年兑现期",
};

export const PROGRESS_LABELS = {
  realm: "境界",
  cultivation_foundation: "修行根基",
  realm_stage: "境界阶段",
  sect_attention: "宗门关注",
  karmic_pressure: "因果压力",
  truth_exposure: "真相暴露",
  sanity_pressure: "理智压力",
  corruption_assimilation: "污染同化",
  occult_contact: "神秘接触",
  social_normalcy: "日常稳定",
  personal_goal: "个人目标",
  survival_days: "生存天数",
  camp_stage: "营地阶段",
  resource_security: "资源安全",
  radiation_burden: "辐射负担",
  faction_trust: "势力信任",
};

export const STORY_AXIS_LABELS = {
  lifePressure: "生活压力",
  talentManifestation: "天赋显化",
  npcRelationship: "人际关系",
  worldOpportunity: "世界机会",
  choiceConsequence: "旧选择后果",
};

export function worldLabel(worldId) {
  return WORLD_LABELS[worldId] ?? "未知世界";
}

export function lifeStageLabel(lifeStage) {
  return LIFE_STAGE_LABELS[lifeStage] ?? "未知阶段";
}

export function developmentStageLabel(stage) {
  return DEVELOPMENT_STAGE_LABELS[stage] ?? "成长阶段";
}

export function attributeKeys() {
  return SETUP_ATTRIBUTE_KEYS;
}

export function attributeLabel(key) {
  return SETUP_ATTRIBUTE_LABELS[key] ?? friendlyId(key);
}

export function progressLabel(key) {
  return PROGRESS_LABELS[key] ?? friendlyId(key);
}

export function storyAxisLabel(axisId) {
  return STORY_AXIS_LABELS[axisId] ?? friendlyId(axisId);
}

export function visibleTalents(run) {
  return (run.player?.talents ?? [])
    .map((talent) => visibleTalentName(talent))
    .filter(Boolean);
}

export function publicEventEntry(event, fallbackKind = "event") {
  const title = cleanText(event?.playerText?.title);
  const body = cleanText(event?.playerText?.body);
  return {
    kind: fallbackKind,
    age: numericOrUndefined(event?.timeSpan?.ageEnd ?? event?.timeSpan?.ageStart),
    title,
    body,
  };
}

export function pressureLabel(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.includes("_")) return pressureFromTokens(text);
  return text;
}

export function threadLabel(thread = {}) {
  const pressure = pressureLabel(thread.nextPressure);
  if (pressure) return pressure;
  return stageLabel(thread.stage);
}

export function stageLabel(value) {
  return {
    new: "刚出现的线索",
    active: "仍在推进",
    identified: "已经确认",
    restricted: "受到限制",
    closed: "已经收束",
  }[value] ?? pressureLabel(value) ?? "持续线索";
}

export function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function friendlyId(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function numericOrUndefined(value) {
  return Number.isFinite(value) ? value : undefined;
}

export function topPressureFromStoryState(storyState) {
  const pressure = storyState?.activePressures?.at?.(-1);
  if (pressure?.pressureId) return pressureLabel(pressure.pressureId);
  const threadPressure = (storyState?.threads ?? []).map(threadLabel).filter(Boolean).at(-1);
  if (threadPressure) return threadPressure;
  const axis = Object.entries(storyState?.axes ?? {})
    .sort((left, right) => (right[1]?.level ?? 0) - (left[1]?.level ?? 0))[0];
  return axis ? `${storyAxisLabel(axis[0])}正在升高` : "人生正在继续推进";
}

function pressureFromTokens(value) {
  const tokens = new Set(String(value).split(/[_-]+/).filter(Boolean));
  if (tokens.has("family") && tokens.has("limit")) return "家人正在收紧限制";
  if (tokens.has("family") && tokens.has("limits")) return "家人正在收紧限制";
  if (tokens.has("access")) return "接近关键地点受限";
  if (tokens.has("school")) return "学业压力上升";
  if (tokens.has("money") || tokens.has("resource")) return "资源压力上升";
  if (tokens.has("trust")) return "信任关系受到考验";
  if (tokens.has("exposure")) return "异常关注正在升高";
  if (tokens.has("choice") || tokens.has("consequence")) return "旧选择开始产生后果";
  return friendlyId(value);
}
