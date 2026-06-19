export const ASSET_LEDGER_SCHEMA_VERSION = "mvp.story_asset_lifecycle.v1";

const ASSET_HISTORY_LIMIT = 24;
const DEFAULT_ASSETS = {
  jade_token: {
    assetType: "object",
    textSignals: ["玉佩", "玉片", "玉简", "jade_token"],
  },
  back_mountain: {
    assetType: "arena",
    textSignals: ["后山", "竹林", "山洞", "back_mountain"],
  },
  scripture_pavilion: {
    assetType: "arena",
    textSignals: ["藏书阁", "书阁", "scripture_pavilion"],
  },
  sect_mine: {
    assetType: "arena",
    textSignals: ["矿场", "矿洞", "sect_mine"],
  },
  biyun_sect: {
    assetType: "institution",
    textSignals: ["碧云宗", "宗门", "biyun_sect"],
  },
  spirit_beast: {
    assetType: "npc_or_creature",
    textSignals: ["灵兽", "异兽", "spirit_beast"],
  },
};

export function createDefaultAssetLedger() {
  return {
    schemaVersion: ASSET_LEDGER_SCHEMA_VERSION,
    assets: {},
    recentSpotlights: [],
  };
}

export function normalizeAssetLedger(value) {
  const ledger = createDefaultAssetLedger();
  if (!value || typeof value !== "object" || Array.isArray(value)) return ledger;
  ledger.schemaVersion = value.schemaVersion ?? ASSET_LEDGER_SCHEMA_VERSION;
  ledger.recentSpotlights = Array.isArray(value.recentSpotlights)
    ? value.recentSpotlights.map(normalizeSpotlight).filter(Boolean).slice(-ASSET_HISTORY_LIMIT)
    : [];
  const assets = value.assets && typeof value.assets === "object" && !Array.isArray(value.assets) ? value.assets : {};
  for (const [assetId, entry] of Object.entries(assets)) {
    const normalized = normalizeAssetEntry(assetId, entry);
    if (normalized) ledger.assets[assetId] = normalized;
  }
  for (const spotlight of ledger.recentSpotlights) {
    ledger.assets[spotlight.assetId] = normalizeAssetEntry(spotlight.assetId, ledger.assets[spotlight.assetId] ?? {});
  }
  return ledger;
}

export function recordAssetSpotlight(assetLedger, spotlight = {}) {
  const ledger = normalizeAssetLedger(assetLedger);
  const normalized = normalizeSpotlight(spotlight);
  if (!normalized) return ledger;
  const existing = ledger.recentSpotlights.find((item) => (
    item.age === normalized.age && item.assetId === normalized.assetId && item.role === normalized.role
  ));
  if (existing) Object.assign(existing, normalized);
  else ledger.recentSpotlights.push(normalized);
  ledger.recentSpotlights = ledger.recentSpotlights.slice(-ASSET_HISTORY_LIMIT);

  const entry = normalizeAssetEntry(normalized.assetId, ledger.assets[normalized.assetId] ?? {});
  entry.lastFeaturedAge = normalized.age;
  entry.spotlightCount = Math.max(entry.spotlightCount, spotlightCountFor(ledger, normalized.assetId));
  if (normalized.role === "primary_driver") {
    entry.lifecycle = "dormant";
    entry.cooldownUntilAge = Math.max(entry.cooldownUntilAge ?? 0, normalized.age + 3);
    entry.allowedRoles = ["background_echo", "minor_clue"];
    entry.forbiddenRoles = ["primary_driver"];
  }
  ledger.assets[normalized.assetId] = entry;
  return ledger;
}

export function evaluateAssetRoles({ assetLedger, age = 0, assets = [] } = {}) {
  const ledger = normalizeAssetLedger(assetLedger);
  const assetIds = assets.length > 0 ? assets : Object.keys({ ...DEFAULT_ASSETS, ...ledger.assets });
  const result = {};
  for (const assetId of assetIds) {
    const entry = normalizeAssetEntry(assetId, ledger.assets[assetId] ?? {});
    const recentPrimary = ledger.recentSpotlights.some((spotlight) => (
      spotlight.assetId === assetId
      && spotlight.role === "primary_driver"
      && age - spotlight.age <= 3
    ));
    const underCooldown = Number.isFinite(entry.cooldownUntilAge) && age < entry.cooldownUntilAge;
    const backgroundOnly = recentPrimary || underCooldown;
    result[assetId] = {
      ...entry,
      assetId,
      role: backgroundOnly ? "background_only" : "eligible_supporting",
      allowedRoles: backgroundOnly ? ["background_echo", "minor_clue"] : entry.allowedRoles,
      forbiddenRoles: backgroundOnly ? unique([...entry.forbiddenRoles, "primary_driver"]) : entry.forbiddenRoles,
      cooldownUntilAge: backgroundOnly ? Math.max(entry.cooldownUntilAge ?? 0, lastPrimaryAge(ledger, assetId) + 3) : entry.cooldownUntilAge,
      textSignals: unique([...(DEFAULT_ASSETS[assetId]?.textSignals ?? []), ...(entry.textSignals ?? [])]),
    };
  }
  return result;
}

export function assetRolesFromTopicProfile({ assetLedger, topicProfile, backgroundThreads = [], age = 0 } = {}) {
  const assetIds = unique([
    topicProfile?.objectFocus,
    topicProfile?.arena,
    topicProfile?.institutionFocus,
    ...backgroundThreads,
    "jade_token",
    "back_mountain",
    "scripture_pavilion",
    "sect_mine",
  ].filter((item) => item && item !== "none"));
  return evaluateAssetRoles({ assetLedger, age, assets: assetIds });
}

export function assetRoleMustNotInclude(assetRoles = {}) {
  const lines = [];
  for (const [assetId, role] of Object.entries(assetRoles)) {
    if (role.role === "background_only" && role.forbiddenRoles?.includes("primary_driver")) {
      lines.push(`${assetId} 只能作为背景回响，不能推动本年主线`);
      for (const signal of role.textSignals ?? []) {
        lines.push(`${signal} 不能成为本年主线`);
      }
    }
  }
  return unique(lines);
}

function normalizeAssetEntry(assetId, value = {}) {
  const defaults = DEFAULT_ASSETS[assetId] ?? {};
  return {
    assetId,
    assetType: typeof value.assetType === "string" ? value.assetType : defaults.assetType ?? "unknown",
    lifecycle: typeof value.lifecycle === "string" ? value.lifecycle : "seeded",
    lastFeaturedAge: Number.isFinite(value.lastFeaturedAge) ? Math.floor(value.lastFeaturedAge) : null,
    spotlightCount: Math.max(0, Math.floor(Number(value.spotlightCount) || 0)),
    cooldownUntilAge: Number.isFinite(value.cooldownUntilAge) ? Math.floor(value.cooldownUntilAge) : 0,
    allowedRoles: unique(Array.isArray(value.allowedRoles) ? value.allowedRoles : ["primary_driver", "background_echo", "minor_clue"]),
    forbiddenRoles: unique(Array.isArray(value.forbiddenRoles) ? value.forbiddenRoles : []),
    textSignals: unique([...(defaults.textSignals ?? []), ...(Array.isArray(value.textSignals) ? value.textSignals : [])]),
  };
}

function normalizeSpotlight(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const assetId = typeof value.assetId === "string" && value.assetId ? value.assetId : "";
  if (!assetId) return undefined;
  return {
    age: Number.isFinite(value.age) ? Math.floor(value.age) : 0,
    assetId,
    role: typeof value.role === "string" && value.role ? value.role : "background_echo",
    source: typeof value.source === "string" ? value.source : "story_asset_lifecycle",
  };
}

function spotlightCountFor(ledger, assetId) {
  return ledger.recentSpotlights.filter((item) => item.assetId === assetId).length;
}

function lastPrimaryAge(ledger, assetId) {
  const primary = ledger.recentSpotlights
    .filter((item) => item.assetId === assetId && item.role === "primary_driver")
    .sort((a, b) => b.age - a.age)[0];
  return primary?.age ?? 0;
}

function unique(values) {
  return [...new Set(values.filter((item) => typeof item === "string" && item.length > 0))];
}
