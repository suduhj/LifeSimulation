export const TOPIC_LEDGER_SCHEMA_VERSION = "mvp.topic_ledger.v1";

const TOPIC_HISTORY_LIMIT = 12;

const SLOT_TOPIC_DEFAULTS = {
  family_boundary: {
    topicFamily: "family_boundary_shift",
    arena: "home",
    objectFocus: "none",
    institutionFocus: "family",
    pressureType: "boundary_change",
  },
  household_responsibility: {
    topicFamily: "household_responsibility_shift",
    arena: "home_or_daily_route",
    objectFocus: "none",
    institutionFocus: "family",
    pressureType: "new_daily_duty",
  },
  learning_path: {
    topicFamily: "learning_path_shift",
    arena: "school_or_home",
    objectFocus: "book_or_lesson",
    institutionFocus: "teacher",
    pressureType: "learning_arrangement",
  },
  peer_relationship: {
    topicFamily: "peer_relationship_shift",
    arena: "village_or_schoolyard",
    objectFocus: "none",
    institutionFocus: "peers",
    pressureType: "peer_status_change",
  },
  mentor_attention: {
    topicFamily: "mentor_attention_shift",
    arena: "mentor_space",
    objectFocus: "none",
    institutionFocus: "mentor",
    pressureType: "adult_attention",
  },
  body_growth: {
    topicFamily: "body_growth_shift",
    arena: "home_or_training_yard",
    objectFocus: "body",
    institutionFocus: "family",
    pressureType: "body_capacity_change",
  },
  health_or_care: {
    topicFamily: "health_or_care_shift",
    arena: "home_or_clinic",
    objectFocus: "body",
    institutionFocus: "caregiver",
    pressureType: "care_plan_change",
  },
  village_social_life: {
    topicFamily: "village_social_life_shift",
    arena: "village",
    objectFocus: "reputation",
    institutionFocus: "community",
    pressureType: "social_position_change",
  },
  talent_subtle_manifestation: {
    topicFamily: "subtle_talent_manifestation",
    arena: "daily_life",
    objectFocus: "talent",
    institutionFocus: "none",
    pressureType: "low_intensity_exposure",
  },
  external_attention: {
    topicFamily: "external_attention_shift",
    arena: "home_or_public_space",
    objectFocus: "none",
    institutionFocus: "external_force",
    pressureType: "outside_attention",
  },
};

const DOMAIN_TOPIC_OVERRIDES = {
  institution: {
    topicFamily: "institution_arrival_changes_life",
    arena: "village_public_space",
    objectFocus: "none",
    institutionFocus: "biyun_sect",
    pressureType: "institution_attention",
  },
  resource: {
    topicFamily: "resource_rules_change",
    arena: "camp_or_home",
    objectFocus: "resources",
    institutionFocus: "community",
    pressureType: "resource_reallocation",
  },
  world_pressure: {
    topicFamily: "world_pressure_enters_daily_life",
    arena: "public_space",
    objectFocus: "none",
    institutionFocus: "external_force",
    pressureType: "public_risk_response",
  },
};

const TEXT_SIGNALS = {
  scripture_pavilion_secret: ["藏书阁", "书阁", "旧卷", "典籍", "经阁"],
  sect_labor: ["矿场", "矿洞", "服役", "劳役", "宗门逼债"],
  jade_token_mystery_primary: ["玉佩", "玉片", "玉简", "玉符", "玉 token"],
  back_mountain: ["后山", "竹林", "山洞", "洞府"],
  scripture_pavilion: ["藏书阁", "书阁", "经阁", "典籍"],
  sect_mine: ["矿场", "矿洞", "矿脉"],
  jade_token: ["玉佩", "玉片", "玉简", "玉符"],
  biyun_sect: ["碧云宗", "宗门"],
  hidden_clue_search: ["追查", "寻找线索", "秘密", "潜入", "探查"],
  forced_service: ["逼债", "劳役", "服役", "强迫", "矿场"],
};

export function createDefaultTopicLedger() {
  return {
    schemaVersion: TOPIC_LEDGER_SCHEMA_VERSION,
    recentTopics: [],
  };
}

export function normalizeTopicLedger(value) {
  const normalized = createDefaultTopicLedger();
  if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;
  normalized.schemaVersion = value.schemaVersion ?? TOPIC_LEDGER_SCHEMA_VERSION;
  normalized.recentTopics = Array.isArray(value.recentTopics)
    ? value.recentTopics.map(normalizeTopicProfile).filter(Boolean).slice(-TOPIC_HISTORY_LIMIT)
    : [];
  return normalized;
}

export function buildTopicProfile({ age = 0, worldId = "", curriculumSlot = "", primaryDelta = {} } = {}) {
  const base = SLOT_TOPIC_DEFAULTS[curriculumSlot] ?? SLOT_TOPIC_DEFAULTS.family_boundary;
  const domainOverride = DOMAIN_TOPIC_OVERRIDES[primaryDelta?.domain] ?? {};
  const normalized = normalizeTopicProfile({
    age,
    ...base,
    ...domainOverride,
    topicFamily: domainOverride.topicFamily ?? base.topicFamily,
    sourceEventShape: primaryDelta?.eventShape ?? "",
    worldId,
    curriculumSlot,
  });
  return normalized;
}

export function forbiddenTopicProfiles({ topicLedger, age = 0, candidate } = {}) {
  const ledger = normalizeTopicLedger(topicLedger);
  const nextTopic = normalizeTopicProfile(candidate);
  if (!nextTopic) return [];
  const result = [];
  for (const topic of ledger.recentTopics) {
    const ageDistance = Math.max(0, Number(age) - Number(topic.age ?? 0));
    if (ageDistance <= 3 && topic.arena !== "none" && topic.arena === nextTopic.arena) {
      result.push({ ...topic, forbiddenReason: "arena_recently_primary" });
    }
    if (ageDistance <= 3 && topic.objectFocus !== "none" && topic.objectFocus === nextTopic.objectFocus) {
      result.push({ ...topic, forbiddenReason: "object_recently_primary" });
    }
    if (ageDistance <= 4 && topic.topicFamily === nextTopic.topicFamily) {
      result.push({ ...topic, forbiddenReason: "topic_family_recently_primary" });
    }
    if (ageDistance <= 1 && topic.pressureType !== "none" && topic.pressureType === nextTopic.pressureType) {
      result.push({ ...topic, forbiddenReason: "pressure_type_repeated" });
    }
  }
  return dedupeForbidden(result);
}

export function recordTopicProfile(topicLedger, profile = {}) {
  const ledger = normalizeTopicLedger(topicLedger);
  const topic = normalizeTopicProfile(profile);
  if (!topic) return ledger;
  const existing = ledger.recentTopics.find((item) => sameTopicIdentity(item, topic));
  if (existing) Object.assign(existing, topic);
  else ledger.recentTopics.push(topic);
  ledger.recentTopics = ledger.recentTopics.slice(-TOPIC_HISTORY_LIMIT);
  return ledger;
}

export function topicProfileMatchesText(text, profile = {}) {
  const value = String(text ?? "");
  const normalized = normalizeTopicProfile(profile);
  if (!normalized) return false;
  const keys = [
    normalized.topicFamily,
    normalized.arena,
    normalized.objectFocus,
    normalized.institutionFocus,
    normalized.pressureType,
  ].filter((item) => item && item !== "none");
  if (keys.some((key) => value.includes(key))) return true;
  let matches = 0;
  for (const key of keys) {
    const signals = TEXT_SIGNALS[key] ?? [];
    if (signals.some((signal) => value.includes(signal))) matches += 1;
  }
  return matches >= 2 || (normalized.objectFocus !== "none" && matches >= 1 && /主线|主舞台|核心|继续|又|再次|追查|寻找|潜入/.test(value));
}

export function topicSignalsForProfile(profile = {}) {
  const normalized = normalizeTopicProfile(profile);
  if (!normalized) return [];
  return [
    normalized.topicFamily,
    normalized.arena,
    normalized.objectFocus,
    normalized.institutionFocus,
    normalized.pressureType,
    ...Object.values(normalized).flatMap((value) => TEXT_SIGNALS[value] ?? []),
  ].filter((item, index, arr) => item && item !== "none" && arr.indexOf(item) === index);
}

function normalizeTopicProfile(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const topicFamily = normalizeField(value.topicFamily);
  if (!topicFamily) return undefined;
  return {
    age: Number.isFinite(value.age) ? Math.floor(value.age) : 0,
    topicFamily,
    arena: normalizeField(value.arena, "none"),
    objectFocus: normalizeField(value.objectFocus, "none"),
    institutionFocus: normalizeField(value.institutionFocus, "none"),
    pressureType: normalizeField(value.pressureType, "none"),
    sourceEventShape: normalizeField(value.sourceEventShape, ""),
    worldId: normalizeField(value.worldId, ""),
    curriculumSlot: normalizeField(value.curriculumSlot, ""),
  };
}

function normalizeField(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function dedupeForbidden(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = `${item.age}:${item.topicFamily}:${item.arena}:${item.objectFocus}:${item.pressureType}:${item.forbiddenReason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function sameTopicIdentity(a, b) {
  return a.age === b.age
    && a.topicFamily === b.topicFamily
    && a.arena === b.arena
    && a.objectFocus === b.objectFocus
    && a.pressureType === b.pressureType;
}
