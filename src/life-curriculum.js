export const CURRICULUM_SCHEMA_VERSION = "mvp.life_curriculum.v1";

export const CHILDHOOD_CURRICULUM_SLOTS = [
  "family_boundary",
  "household_responsibility",
  "learning_path",
  "peer_relationship",
  "mentor_attention",
  "body_growth",
  "health_or_care",
  "village_social_life",
  "talent_subtle_manifestation",
  "external_attention",
];

const SLOT_DEFINITIONS = {
  family_boundary: {
    requiredHumanDelta: "家庭规则或亲子边界发生具体变化",
    signals: ["父亲", "母亲", "家里", "边界", "规矩", "限制", "安排"],
  },
  household_responsibility: {
    requiredHumanDelta: "主角开始承担一项会改变日常节奏的新责任",
    signals: ["家务", "责任", "帮忙", "取水", "劈柴", "照看", "差事"],
  },
  learning_path: {
    requiredHumanDelta: "学习安排、师长要求或技能方向发生变化",
    signals: ["先生", "村塾", "学习", "功课", "练字", "书", "师长"],
  },
  peer_relationship: {
    requiredHumanDelta: "至少一个同龄人对主角态度发生变化",
    signals: ["同龄", "伙伴", "孩子", "朋友", "态度", "疏远", "亲近"],
  },
  mentor_attention: {
    requiredHumanDelta: "一位长辈、先生或修行相关人物改变对主角的看法",
    signals: ["长辈", "先生", "师长", "执事", "看法", "注意", "评价"],
  },
  body_growth: {
    requiredHumanDelta: "身体承载能力或日常行动范围发生变化",
    signals: ["身体", "力气", "个子", "体力", "行动范围", "承载", "疲惫"],
  },
  health_or_care: {
    requiredHumanDelta: "照护、休养或身体风险安排发生变化",
    signals: ["照护", "休养", "身体", "睡眠", "发热", "担心", "照看"],
  },
  village_social_life: {
    requiredHumanDelta: "村里或社区日常关系、名声、生活位置发生变化",
    signals: ["村里", "邻居", "名声", "议论", "村口", "社区", "相处"],
  },
  talent_subtle_manifestation: {
    requiredHumanDelta: "天赋只以轻微日常异常影响生活",
    signals: ["天赋", "轻微", "异常", "微热", "梦", "感知", "不寻常"],
  },
  external_attention: {
    requiredHumanDelta: "外部势力或陌生目光改变了日常安排",
    signals: ["外人", "宗门", "官方", "营地", "陌生", "注意", "来人"],
  },
};

const DOMAIN_SLOT_PREFERENCES = {
  family: ["family_boundary", "household_responsibility"],
  education: ["learning_path", "mentor_attention"],
  social: ["peer_relationship", "village_social_life"],
  relationship: ["mentor_attention", "peer_relationship"],
  institution: ["external_attention", "mentor_attention"],
  resource: ["household_responsibility", "family_boundary"],
  health: ["health_or_care", "body_growth"],
  route: ["learning_path", "family_boundary"],
  world_pressure: ["external_attention", "village_social_life"],
};

export function createDefaultCurriculumState() {
  return {
    schemaVersion: CURRICULUM_SCHEMA_VERSION,
    lifeStage: "childhood",
    coveredSlots: [],
    recentSlots: [],
  };
}

export function normalizeCurriculumState(value) {
  const normalized = createDefaultCurriculumState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;
  normalized.schemaVersion = value.schemaVersion ?? CURRICULUM_SCHEMA_VERSION;
  normalized.lifeStage = typeof value.lifeStage === "string" && value.lifeStage ? value.lifeStage : normalized.lifeStage;
  normalized.coveredSlots = uniqueSlots(Array.isArray(value.coveredSlots) ? value.coveredSlots : []);
  normalized.recentSlots = normalizeRecentSlots(value.recentSlots).slice(-12);
  for (const item of normalized.recentSlots) {
    if (!normalized.coveredSlots.includes(item.slot)) normalized.coveredSlots.push(item.slot);
  }
  return normalized;
}

export function selectCurriculumSlot({
  curriculum,
  age = 0,
  seed = 1,
  preferredDomain = "",
  consequencePressure = 0,
} = {}) {
  const state = normalizeCurriculumState(curriculum);
  const slots = slotsForAge(age);
  const recentSlots = state.recentSlots ?? [];
  const lastSlot = recentSlots.at(-1)?.slot ?? "";
  const recentFive = recentSlots.filter((item) => Number.isFinite(item.age) && age - item.age <= 5);
  const recentFiveDistinct = new Set(recentFive.map((item) => item.slot));
  const preferredSlots = DOMAIN_SLOT_PREFERENCES[preferredDomain] ?? [];
  const uncoveredSlots = slots.filter((slot) => !state.coveredSlots.includes(slot));
  const pressureCap = Math.min(2, Math.max(0, Math.floor(Number(consequencePressure) || 0) > 0 ? 1 : 0));

  const ranked = slots
    .map((slot, index) => {
      const uncoveredBonus = uncoveredSlots.includes(slot) ? 8 : 0;
      const preferredBonus = preferredSlots.includes(slot) ? 3 + pressureCap : 0;
      const adjacentPenalty = slot === lastSlot ? 100 : 0;
      const diversityBonus = recentFiveDistinct.size < 3 && !recentFiveDistinct.has(slot) ? 6 : 0;
      const recencyPenalty = recentSlots.slice(-3).some((item) => item.slot === slot) ? 4 : 0;
      const noise = deterministicNoise(seed, age, index);
      return {
        slot,
        score: uncoveredBonus + preferredBonus + diversityBonus + noise - recencyPenalty - adjacentPenalty,
      };
    })
    .sort((a, b) => b.score - a.score || slots.indexOf(a.slot) - slots.indexOf(b.slot));

  const curriculumSlot = ranked[0]?.slot ?? "family_boundary";
  const lifeStage = curriculumLifeStageForAge(age);
  return {
    age,
    lifeStage,
    curriculumSlot,
    requiredHumanDelta: requiredHumanDeltaForSlot(curriculumSlot),
    coverageStatus: state.coveredSlots.includes(curriculumSlot) ? "revisited" : "new_slot",
  };
}

export function recordCurriculumSlot(curriculum, plan = {}) {
  const state = normalizeCurriculumState(curriculum);
  const slot = plan.curriculumSlot ?? plan.slot;
  if (!CHILDHOOD_CURRICULUM_SLOTS.includes(slot)) return state;
  const record = normalizeSlotRecord({
    age: plan.age,
    slot,
    lifeStage: plan.lifeStage ?? curriculumLifeStageForAge(plan.age),
    requiredHumanDelta: plan.requiredHumanDelta ?? requiredHumanDeltaForSlot(slot),
  });
  if (!state.coveredSlots.includes(slot)) state.coveredSlots.push(slot);
  state.lifeStage = record.lifeStage;
  upsertByAgeSlot(state.recentSlots, record);
  state.recentSlots = state.recentSlots.slice(-12);
  return state;
}

export function requiredHumanDeltaForSlot(slot) {
  return SLOT_DEFINITIONS[slot]?.requiredHumanDelta ?? "今年必须出现一个具体的人生生活变化";
}

export function curriculumSignalsForSlot(slot) {
  return [...(SLOT_DEFINITIONS[slot]?.signals ?? []), requiredHumanDeltaForSlot(slot)].filter(Boolean);
}

export function curriculumLifeStageForAge(age = 0) {
  const numericAge = Math.max(0, Math.floor(Number(age) || 0));
  if (numericAge <= 12) return "childhood";
  if (numericAge <= 17) return "adolescence";
  if (numericAge <= 25) return "youth";
  if (numericAge <= 59) return "adulthood";
  return "late_life";
}

function slotsForAge(age) {
  void age;
  return CHILDHOOD_CURRICULUM_SLOTS;
}

function normalizeRecentSlots(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeSlotRecord)
    .filter((item) => item.slot)
    .sort((a, b) => a.age - b.age);
}

function normalizeSlotRecord(value = {}) {
  const slot = value.curriculumSlot ?? value.slot;
  if (!CHILDHOOD_CURRICULUM_SLOTS.includes(slot)) return { age: 0, slot: "", lifeStage: "childhood", requiredHumanDelta: "" };
  const age = Number.isFinite(value.age) ? Math.floor(value.age) : 0;
  return {
    age,
    slot,
    lifeStage: typeof value.lifeStage === "string" && value.lifeStage ? value.lifeStage : curriculumLifeStageForAge(age),
    requiredHumanDelta: value.requiredHumanDelta ?? requiredHumanDeltaForSlot(slot),
  };
}

function uniqueSlots(values) {
  const result = [];
  for (const value of values) {
    if (CHILDHOOD_CURRICULUM_SLOTS.includes(value) && !result.includes(value)) result.push(value);
  }
  return result;
}

function upsertByAgeSlot(target, record) {
  const existing = target.find((item) => item.age === record.age && item.slot === record.slot);
  if (existing) Object.assign(existing, record);
  else target.push(record);
}

function deterministicNoise(seed, age, index) {
  const base = Math.abs(Number(seed) || 0) + Math.max(0, Number(age) || 0) * 17 + index * 7;
  return base % 5;
}
