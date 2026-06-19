export const EXPERIENCE_DIRECTOR_SCHEMA_VERSION = "mvp.player_experience_director.v1";

const EXPERIENCE_HISTORY_LIMIT = 16;
const PRESSURE_INTENTS = new Set(["social_pressure", "resource_struggle", "choice_consequence"]);

const SLOT_INTENT_PREFERENCES = {
  family_boundary: ["choice_consequence", "relationship_warmth", "quiet_recovery"],
  household_responsibility: ["resource_struggle", "small_victory", "growth_payoff"],
  learning_path: ["growth_payoff", "mentor_attention", "small_victory"],
  peer_relationship: ["social_pressure", "relationship_warmth", "small_victory"],
  mentor_attention: ["relationship_warmth", "growth_payoff", "choice_consequence"],
  body_growth: ["growth_payoff", "small_victory", "quiet_recovery"],
  health_or_care: ["quiet_recovery", "relationship_warmth", "growth_payoff"],
  village_social_life: ["social_pressure", "relationship_warmth", "small_victory"],
  talent_subtle_manifestation: ["mystery_hint", "growth_payoff", "world_wonder"],
  external_attention: ["world_wonder", "social_pressure", "choice_consequence"],
};

export function createDefaultExperienceState() {
  return {
    schemaVersion: EXPERIENCE_DIRECTOR_SCHEMA_VERSION,
    recentIntents: [],
    counters: {
      pressureStreak: 0,
      pressureStreakMax: 0,
      quietYears: 0,
      yearsSinceGrowthPayoff: 0,
      yearsSinceWonder: 0,
      yearsSinceRelationshipOrSocial: 0,
    },
  };
}

export function normalizeExperienceState(value) {
  const state = createDefaultExperienceState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return state;
  state.schemaVersion = value.schemaVersion ?? EXPERIENCE_DIRECTOR_SCHEMA_VERSION;
  state.recentIntents = Array.isArray(value.recentIntents)
    ? value.recentIntents.map(normalizeIntentRecord).filter(Boolean).slice(-EXPERIENCE_HISTORY_LIMIT)
    : [];
  state.counters = {
    ...state.counters,
    ...(value.counters && typeof value.counters === "object" && !Array.isArray(value.counters) ? value.counters : {}),
  };
  recomputeCounters(state);
  return state;
}

export function selectExperienceIntent({ experience, age = 0, seed = 1, curriculumSlot = "" } = {}) {
  const state = normalizeExperienceState(experience);
  const counters = state.counters;
  const preferences = SLOT_INTENT_PREFERENCES[curriculumSlot] ?? ["small_victory", "growth_payoff", "relationship_warmth"];
  let intent = preferences[Math.abs(Number(seed) || age) % preferences.length];

  if (counters.pressureStreak >= 2 && PRESSURE_INTENTS.has(intent)) {
    intent = counters.yearsSinceGrowthPayoff >= 2 ? "growth_payoff" : "quiet_recovery";
  }
  if (counters.yearsSinceGrowthPayoff >= 3) {
    intent = "growth_payoff";
  }
  if (counters.yearsSinceRelationshipOrSocial >= 4) {
    intent = curriculumSlot === "peer_relationship" || curriculumSlot === "village_social_life"
      ? "social_pressure"
      : "relationship_warmth";
  }
  if (counters.yearsSinceWonder >= 4 && curriculumSlot === "talent_subtle_manifestation") {
    intent = "world_wonder";
  }

  return {
    age,
    curriculumSlot,
    intent,
    pressure: PRESSURE_INTENTS.has(intent),
    reason: reasonForIntent(intent),
  };
}

export function recordExperienceIntent(experience, plan = {}) {
  const state = normalizeExperienceState(experience);
  const record = normalizeIntentRecord({
    age: plan.age,
    curriculumSlot: plan.curriculumSlot,
    intent: plan.intent ?? plan.experienceIntent,
    pressure: plan.pressure,
    reason: plan.reason,
  });
  if (!record) return state;
  const existing = state.recentIntents.find((item) => item.age === record.age && item.intent === record.intent);
  if (existing) Object.assign(existing, record);
  else state.recentIntents.push(record);
  state.recentIntents = state.recentIntents.slice(-EXPERIENCE_HISTORY_LIMIT);
  recomputeCounters(state);
  return state;
}

export function summarizeExperienceRhythm(experience) {
  const state = normalizeExperienceState(experience);
  return {
    pressureStreakMax: state.counters.pressureStreakMax,
    recentIntents: state.recentIntents.map((item) => item.intent),
    yearsSinceGrowthPayoff: state.counters.yearsSinceGrowthPayoff,
    yearsSinceWonder: state.counters.yearsSinceWonder,
    yearsSinceRelationshipOrSocial: state.counters.yearsSinceRelationshipOrSocial,
  };
}

function normalizeIntentRecord(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const intent = typeof value.intent === "string" && value.intent ? value.intent : "";
  if (!intent) return undefined;
  return {
    age: Number.isFinite(value.age) ? Math.floor(value.age) : 0,
    curriculumSlot: typeof value.curriculumSlot === "string" ? value.curriculumSlot : "",
    intent,
    pressure: typeof value.pressure === "boolean" ? value.pressure : PRESSURE_INTENTS.has(intent),
    reason: typeof value.reason === "string" ? value.reason : reasonForIntent(intent),
  };
}

function recomputeCounters(state) {
  let pressureStreak = 0;
  let pressureStreakMax = 0;
  let yearsSinceGrowthPayoff = 0;
  let yearsSinceWonder = 0;
  let yearsSinceRelationshipOrSocial = 0;
  let quietYears = 0;

  for (const item of state.recentIntents) {
    if (item.pressure) pressureStreak += 1;
    else pressureStreak = 0;
    pressureStreakMax = Math.max(pressureStreakMax, pressureStreak);
    yearsSinceGrowthPayoff = item.intent === "growth_payoff" || item.intent === "small_victory" ? 0 : yearsSinceGrowthPayoff + 1;
    yearsSinceWonder = item.intent === "world_wonder" || item.intent === "mystery_hint" ? 0 : yearsSinceWonder + 1;
    yearsSinceRelationshipOrSocial = item.intent === "relationship_warmth" || item.intent === "social_pressure"
      ? 0
      : yearsSinceRelationshipOrSocial + 1;
    quietYears = item.intent === "quiet_recovery" ? quietYears + 1 : 0;
  }

  state.counters = {
    pressureStreak,
    pressureStreakMax,
    quietYears,
    yearsSinceGrowthPayoff,
    yearsSinceWonder,
    yearsSinceRelationshipOrSocial,
  };
}

function reasonForIntent(intent) {
  return {
    growth_payoff: "deliver_visible_growth",
    mystery_hint: "keep_world_mystery_present",
    relationship_warmth: "restore_emotional_texture",
    social_pressure: "create_social_change",
    resource_struggle: "ground_life_pressure",
    small_victory: "give_player_a_win",
    world_wonder: "show_world_flavor",
    quiet_recovery: "break_pressure_streak",
    choice_consequence: "echo_past_choice",
  }[intent] ?? "annual_experience_balance";
}
