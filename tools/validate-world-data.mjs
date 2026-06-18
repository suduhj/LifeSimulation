#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STABLE_ID = /^[a-z][a-z0-9_]*$/;
const LOCALIZATION_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const CORE_ATTRIBUTES = new Set([
  "appearance",
  "intelligence",
  "constitution",
  "familyBackground",
  "luck",
]);
const RARITIES = new Set(["common", "fine", "rare", "epic", "legendary", "mythic"]);
const MANIFESTATION_TYPES = new Set(["immediate", "stage", "conditional", "hidden_destiny"]);
const RISK_LEVELS = new Set(["low", "medium", "high", "extreme"]);
const LIFE_STAGES = new Set([
  "birth",
  "childhood",
  "adolescence",
  "youth",
  "adulthood",
  "middleAge",
  "oldAge",
]);
const WORLD_IDS = new Set(["cultivation", "cthulhu", "wasteland"]);
const EVENT_SOURCE_TYPES = new Set([
  "seed_pool",
  "ai_free",
  "player_consequence",
  "npc_driven",
  "world_progress",
  "natural_life",
  "random_disturbance",
]);

const POOL_MINIMUMS = {
  identity_seed_pool: 8,
  talent_seed_pool: 20,
  event_seed_pool: 20,
  npc_template_seed_pool: 12,
  faction_seed_pool: 8,
  location_seed_pool: 10,
};

export function findRuntimeJsonFiles(rootDir = "worlds") {
  const absoluteRoot = path.resolve(rootDir);

  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }

  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(normalizePath(fullPath));
      }
    }
  };

  visit(absoluteRoot);
  return files.sort();
}

export function validateRuntimeData({ rootDir = "worlds" } = {}) {
  const files = findRuntimeJsonFiles(rootDir);
  const errors = [];
  const warnings = [];
  const counts = {};

  for (const file of files) {
    let document;
    try {
      document = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      errors.push(`${file}: invalid JSON: ${error.message}`);
      continue;
    }

    const result = validateRuntimeDocument(document, file);
    errors.push(...result.errors);
    warnings.push(...result.warnings);

    if (document?.type) {
      counts[document.type] = (counts[document.type] ?? 0) + 1;
    }
  }

  return {
    valid: errors.length === 0,
    filesChecked: files.length,
    poolFileCounts: counts,
    errors,
    warnings,
  };
}

export function validateRuntimeDocument(document, filePath = "<memory>") {
  const context = createContext(filePath);

  if (!isPlainObject(document)) {
    context.error("document must be a JSON object");
    return context.result();
  }

  validateGenericRuntimeDocument(document, context);

  switch (document.type) {
    case "identity_seed_pool":
      validateIdentitySeedPool(document, context);
      break;
    case "talent_seed_pool":
      validateTalentSeedPool(document, context);
      break;
    case "event_seed_pool":
      validateEventSeedPool(document, context);
      break;
    case "npc_template_seed_pool":
      validateNpcTemplateSeedPool(document, context);
      break;
    case "faction_seed_pool":
      validateFactionSeedPool(document, context);
      break;
    case "location_seed_pool":
      validateLocationSeedPool(document, context);
      break;
    case undefined:
      validateKnownNonPoolDocument(document, context);
      break;
    default:
      context.error(`unknown pool type "${document.type}"`);
  }

  return context.result();
}

function validateGenericRuntimeDocument(document, context) {
  if (document.worldId !== undefined) {
    validateStableId(document.worldId, "worldId", context);
    validateWorldFolderMatch(document.worldId, context);
  }

  if (document.id !== undefined) {
    validateStableId(document.id, "id", context);
  }

  if (context.worldFromPath && document.worldId === undefined && isWorldConfigPath(context.filePath)) {
    if (document.id !== context.worldFromPath) {
      context.error(`world.config.json id must match folder "${context.worldFromPath}"`);
    }
  }

  warnOnCjk(document, "$", context);
}

function validateIdentitySeedPool(document, context) {
  validateWorldId(document, context);
  requireString(document.localization, "localization", context);
  requireString(document.visibilityRule, "visibilityRule", context);
  requireArray(document.identitySeeds, "identitySeeds", context, { min: POOL_MINIMUMS.identity_seed_pool });

  document.identitySeeds?.forEach((seed, index) => {
    const prefix = `identitySeeds[${index}]`;
    if (!requireObject(seed, prefix, context)) return;

    validateStableId(seed.id, `${prefix}.id`, context);
    requireObject(seed.playerVisible, `${prefix}.playerVisible`, context);
    requireObject(seed.hiddenGeneration, `${prefix}.hiddenGeneration`, context);
    requireString(seed.playerVisible?.nameKey, `${prefix}.playerVisible.nameKey`, context, {
      pattern: LOCALIZATION_KEY,
      patternName: "localization key",
    });
    requireString(seed.playerVisible?.descriptionKey, `${prefix}.playerVisible.descriptionKey`, context, {
      pattern: LOCALIZATION_KEY,
      patternName: "localization key",
    });
    validateStringArray(seed.playerVisible?.possibleRouteTags, `${prefix}.playerVisible.possibleRouteTags`, context, {
      min: 1,
      stableIds: true,
    });
    validateEnum(seed.playerVisible?.approxRisk, RISK_LEVELS, `${prefix}.playerVisible.approxRisk`, context);
    validateStringArray(seed.sceneTags, `${prefix}.sceneTags`, context, { min: 1, stableIds: true });
    validateAttributeHintObject(seed.anchorAttributeHints, `${prefix}.anchorAttributeHints`, context);
  });
}

function validateTalentSeedPool(document, context) {
  validateWorldId(document, context);
  requireString(document.localization, "localization", context);
  requireArray(document.talents, "talents", context, { min: POOL_MINIMUMS.talent_seed_pool });

  document.talents?.forEach((talent, index) => {
    const prefix = `talents[${index}]`;
    if (!requireObject(talent, prefix, context)) return;

    validateStableId(talent.id, `${prefix}.id`, context);
    validateEnum(talent.rarity, RARITIES, `${prefix}.rarity`, context);
    validateEnum(talent.manifestationType, MANIFESTATION_TYPES, `${prefix}.manifestationType`, context);
    validateStringArray(talent.tags, `${prefix}.tags`, context, { min: 1, stableIds: true });
    requireObject(talent.effects, `${prefix}.effects`, context, { minKeys: 1 });
    validateAttributePotential(talent.effects?.attributePotential, `${prefix}.effects.attributePotential`, context);
  });
}

function validateEventSeedPool(document, context) {
  validateWorldId(document, context);
  requireString(document.localization, "localization", context);
  requireArray(document.eventSeeds, "eventSeeds", context, { min: POOL_MINIMUMS.event_seed_pool });

  document.eventSeeds?.forEach((seed, index) => {
    const prefix = `eventSeeds[${index}]`;
    if (!requireObject(seed, prefix, context)) return;

    validateStableId(seed.id, `${prefix}.id`, context);
    validateStringArray(seed.lifeStages, `${prefix}.lifeStages`, context, {
      min: 1,
      allowedValues: LIFE_STAGES,
    });
    validateStringArray(seed.sceneTags, `${prefix}.sceneTags`, context, { min: 1, stableIds: true });
    validateEnum(seed.riskLevel, RISK_LEVELS, `${prefix}.riskLevel`, context);
    validateStringArray(seed.possibleEffects, `${prefix}.possibleEffects`, context, { min: 1, stableIds: true });
    requireString(seed.aiUseRuleKey, `${prefix}.aiUseRuleKey`, context, {
      pattern: LOCALIZATION_KEY,
      patternName: "AI rule key",
    });
    if (seed.requires !== undefined) {
      requireObject(seed.requires, `${prefix}.requires`, context);
    }
    if (seed.excludes !== undefined) {
      requireObject(seed.excludes, `${prefix}.excludes`, context);
    }
    validateStringArray(seed.normalExplanations, `${prefix}.normalExplanations`, context, {
      optional: true,
      min: 1,
      stableIds: true,
    });
    validateStringArray(seed.hiddenPossibilities, `${prefix}.hiddenPossibilities`, context, {
      optional: true,
      min: 1,
      stableIds: true,
    });
  });
}

function validateNpcTemplateSeedPool(document, context) {
  validateWorldId(document, context);
  requireString(document.localization, "localization", context);
  requireArray(document.templates, "templates", context, { min: POOL_MINIMUMS.npc_template_seed_pool });

  document.templates?.forEach((template, index) => {
    const prefix = `templates[${index}]`;
    if (!requireObject(template, prefix, context)) return;

    validateStableId(template.id, `${prefix}.id`, context);
    requireObject(template.anchorAttributes, `${prefix}.anchorAttributes`, context, { minKeys: 1 });
    validateAnchorAttributes(template.anchorAttributes, `${prefix}.anchorAttributes`, context);
    validateStringArray(template.roleTags, `${prefix}.roleTags`, context, { min: 1, stableIds: true });
    validateStringArray(template.possibleRoles, `${prefix}.possibleRoles`, context, { min: 1, stableIds: true });
    if (typeof template.canPromoteToImportantNPC !== "boolean") {
      context.error(`${prefix}.canPromoteToImportantNPC must be a boolean`);
    }
    if (template.misjudgmentRisk !== undefined) {
      validateEnum(template.misjudgmentRisk, RISK_LEVELS, `${prefix}.misjudgmentRisk`, context);
    }
    if (template.notesKey !== undefined) {
      requireString(template.notesKey, `${prefix}.notesKey`, context, {
        pattern: LOCALIZATION_KEY,
        patternName: "localization key",
      });
    }
  });
}

function validateFactionSeedPool(document, context) {
  validateWorldId(document, context);
  requireString(document.localization, "localization", context);
  requireArray(document.factions, "factions", context, { min: POOL_MINIMUMS.faction_seed_pool });

  document.factions?.forEach((faction, index) => {
    const prefix = `factions[${index}]`;
    if (!requireObject(faction, prefix, context)) return;

    validateStableId(faction.id, `${prefix}.id`, context);
    requireString(faction.nameKey, `${prefix}.nameKey`, context, {
      pattern: LOCALIZATION_KEY,
      patternName: "localization key",
    });
    validateStringArray(faction.typeTags, `${prefix}.typeTags`, context, { min: 1, stableIds: true });
    validateStringArray(faction.routeTags, `${prefix}.routeTags`, context, { min: 1, stableIds: true });
    validateEnum(faction.riskLevel, RISK_LEVELS, `${prefix}.riskLevel`, context);
    validateStringArray(faction.joinRequirementTags, `${prefix}.joinRequirementTags`, context, { min: 1, stableIds: true });
    validateStringArray(faction.creationRequirementTags, `${prefix}.creationRequirementTags`, context, { min: 1, stableIds: true });
    validateStringArray(faction.resourceTags, `${prefix}.resourceTags`, context, { min: 1, stableIds: true });
    validateStringArray(faction.conflictTags, `${prefix}.conflictTags`, context, { min: 1, stableIds: true });
    requireString(faction.aiUseRuleKey, `${prefix}.aiUseRuleKey`, context, {
      pattern: LOCALIZATION_KEY,
      patternName: "AI rule key",
    });
    if (faction.startingRelationship !== undefined) {
      requireObject(faction.startingRelationship, `${prefix}.startingRelationship`, context);
    }
  });
}

function validateLocationSeedPool(document, context) {
  validateWorldId(document, context);
  requireString(document.localization, "localization", context);
  requireArray(document.locations, "locations", context, { min: POOL_MINIMUMS.location_seed_pool });

  document.locations?.forEach((location, index) => {
    const prefix = `locations[${index}]`;
    if (!requireObject(location, prefix, context)) return;

    validateStableId(location.id, `${prefix}.id`, context);
    requireString(location.nameKey, `${prefix}.nameKey`, context, {
      pattern: LOCALIZATION_KEY,
      patternName: "localization key",
    });
    validateStringArray(location.lifeStages, `${prefix}.lifeStages`, context, {
      min: 1,
      allowedValues: LIFE_STAGES,
    });
    validateStringArray(location.sceneTags, `${prefix}.sceneTags`, context, { min: 1, stableIds: true });
    validateStringArray(location.accessTags, `${prefix}.accessTags`, context, { min: 1, stableIds: true });
    validateEnum(location.riskLevel, RISK_LEVELS, `${prefix}.riskLevel`, context);
    validateStringArray(location.eventHooks, `${prefix}.eventHooks`, context, { min: 1, stableIds: true });
    validateStringArray(location.factionHooks, `${prefix}.factionHooks`, context, { min: 1, stableIds: true });
    requireString(location.aiUseRuleKey, `${prefix}.aiUseRuleKey`, context, {
      pattern: LOCALIZATION_KEY,
      patternName: "AI rule key",
    });
  });
}

function validateKnownNonPoolDocument(document, context) {
  if (isWorldConfigPath(context.filePath)) {
    validateWorldConfig(document, context);
    return;
  }

  if (context.fileName === "endings.json") {
    validateEndings(document, context);
    return;
  }

  if (context.fileName === "realms.json") {
    validateRealms(document, context);
    return;
  }

  validateIdsRecursively(document, "$", context);
}

function validateWorldConfig(document, context) {
  validateStableId(document.id, "id", context);
  validateWorldFolderMatch(document.id, context);
  requireString(document.name, "name", context);
  if (document.primaryAxis !== "age") {
    context.error('primaryAxis must be "age" for the life simulator MVP');
  }
  requireObject(document.lifeSimulationGuardrail, "lifeSimulationGuardrail", context);
  validateStringArray(document.secondaryProgression, "secondaryProgression", context, { min: 1, stableIds: true });
  validateStringArray(document.routeFamilies, "routeFamilies", context, { min: 1, stableIds: true });
  validateStringArray(document.aiTone, "aiTone", context, { min: 1 });
  validateEventGenerationConfig(document.eventGeneration, "eventGeneration", context);
}

function validateEventGenerationConfig(value, label, context) {
  if (!requireObject(value, label, context)) return;
  if (value.poolMode !== "open_soft_seed_pool") {
    context.error(`${label}.poolMode must be open_soft_seed_pool`);
  }
  if (value.seedStrictnessDefault !== "soft") {
    context.error(`${label}.seedStrictnessDefault must be soft`);
  }
  if (value.aiAdaptationDefault !== "must_adapt") {
    context.error(`${label}.aiAdaptationDefault must be must_adapt`);
  }
  if (value.allowAiFreeGenerationWhenNoSeedFits !== true) {
    context.error(`${label}.allowAiFreeGenerationWhenNoSeedFits must be true`);
  }
  if (!requireObject(value.sourceWeights, `${label}.sourceWeights`, context)) return;

  let total = 0;
  for (const sourceType of EVENT_SOURCE_TYPES) {
    const weight = value.sourceWeights[sourceType];
    if (!Number.isFinite(weight) || weight < 0) {
      context.error(`${label}.sourceWeights.${sourceType} must be a non-negative number`);
    } else {
      total += weight;
    }
  }
  for (const sourceType of Object.keys(value.sourceWeights)) {
    if (!EVENT_SOURCE_TYPES.has(sourceType)) {
      context.error(`${label}.sourceWeights.${sourceType} is not a supported event source`);
    }
  }
  if (total !== 100) {
    context.error(`${label}.sourceWeights must total 100, got ${total}`);
  }
}

function validateEndings(document, context) {
  validateWorldId(document, context);
  requireArray(document.endings, "endings", context, { min: 1 });

  document.endings?.forEach((ending, index) => {
    const prefix = `endings[${index}]`;
    if (!requireObject(ending, prefix, context)) return;

    validateStableId(ending.id, `${prefix}.id`, context);
    requireString(ending.name, `${prefix}.name`, context);
    validateStringArray(ending.tags, `${prefix}.tags`, context, { min: 1, stableIds: true });
  });
}

function validateRealms(document, context) {
  requireObject(document.realmVersionScope, "realmVersionScope", context);
  validateStringArray(document.realmVersionScope?.mvp, "realmVersionScope.mvp", context, { min: 1, stableIds: true });
  validateStringArray(document.realmVersionScope?.formalRelease, "realmVersionScope.formalRelease", context, {
    min: 1,
    stableIds: true,
  });
  requireArray(document.realms, "realms", context, { min: 1 });

  let previousMin = -Infinity;
  document.realms?.forEach((realm, index) => {
    const prefix = `realms[${index}]`;
    if (!requireObject(realm, prefix, context)) return;

    validateStableId(realm.id, `${prefix}.id`, context);
    requireString(realm.name, `${prefix}.name`, context);
    if (!Array.isArray(realm.totalAttributeRange) || realm.totalAttributeRange.length !== 2) {
      context.error(`${prefix}.totalAttributeRange must be [min, max]`);
      return;
    }
    const [min, max] = realm.totalAttributeRange;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      context.error(`${prefix}.totalAttributeRange must contain ascending finite numbers`);
    }
    if (min < previousMin) {
      context.error(`${prefix}.totalAttributeRange must not go backward`);
    }
    previousMin = min;
  });
}

function validateWorldId(document, context) {
  requireString(document.worldId, "worldId", context);
  validateStableId(document.worldId, "worldId", context);
  if (document.worldId && !WORLD_IDS.has(document.worldId)) {
    context.error(`worldId "${document.worldId}" is not one of ${[...WORLD_IDS].join(", ")}`);
  }
  validateWorldFolderMatch(document.worldId, context);
}

function validateWorldFolderMatch(worldId, context) {
  if (!worldId || !context.worldFromPath) return;
  if (worldId !== context.worldFromPath) {
    context.error(`world id "${worldId}" must match folder "${context.worldFromPath}"`);
  }
}

function validateStableId(value, label, context) {
  if (typeof value !== "string" || !STABLE_ID.test(value)) {
    context.error(`${label} must be a stable id matching ${STABLE_ID}`);
  }
}

function validateStringArray(value, label, context, options = {}) {
  if (value === undefined && options.optional) {
    return;
  }

  if (!Array.isArray(value)) {
    context.error(`${label} must be an array`);
    return;
  }

  if (value.length < (options.min ?? 0)) {
    context.error(`${label} must contain at least ${options.min} item(s)`);
  }

  value.forEach((item, index) => {
    const itemLabel = `${label}[${index}]`;
    if (typeof item !== "string" || item.length === 0) {
      context.error(`${itemLabel} must be a non-empty string`);
      return;
    }
    if (options.stableIds && !STABLE_ID.test(item)) {
      context.error(`${itemLabel} must be a stable id matching ${STABLE_ID}`);
    }
    if (options.allowedValues && !options.allowedValues.has(item)) {
      context.error(`${itemLabel} must be one of ${[...options.allowedValues].join(", ")}`);
    }
  });
}

function validateEnum(value, allowedValues, label, context) {
  if (!allowedValues.has(value)) {
    context.error(`${label} must be one of ${[...allowedValues].join(", ")}`);
  }
}

function validateAttributeHintObject(value, label, context) {
  if (value === undefined) {
    return;
  }
  if (!requireObject(value, label, context)) return;

  for (const key of Object.keys(value)) {
    if (!CORE_ATTRIBUTES.has(key)) {
      context.error(`${label}.${key} is not a supported core attribute`);
    }
  }
}

function validateAttributePotential(value, label, context) {
  if (value === undefined) {
    return;
  }
  if (!requireObject(value, label, context, { minKeys: 1 })) return;

  for (const [key, amount] of Object.entries(value)) {
    if (!CORE_ATTRIBUTES.has(key)) {
      context.error(`${label}.${key} is not a supported core attribute`);
    }
    if (!Number.isFinite(amount)) {
      context.error(`${label}.${key} must be a finite number`);
    }
  }
}

function validateAnchorAttributes(value, label, context) {
  if (!isPlainObject(value)) return;

  for (const [key, range] of Object.entries(value)) {
    if (!CORE_ATTRIBUTES.has(key)) {
      context.error(`${label}.${key} is not a supported core attribute`);
    }
    if (!Array.isArray(range) || range.length !== 2) {
      context.error(`${label}.${key} must be [min, max]`);
      continue;
    }
    const [min, max] = range;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      context.error(`${label}.${key} must contain ascending finite numbers`);
    }
  }
}

function validateIdsRecursively(value, label, context) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateIdsRecursively(item, `${label}[${index}]`, context));
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  if (value.id !== undefined) {
    validateStableId(value.id, `${label}.id`, context);
  }
  if (value.worldId !== undefined) {
    validateStableId(value.worldId, `${label}.worldId`, context);
    validateWorldFolderMatch(value.worldId, context);
  }

  Object.entries(value).forEach(([key, nested]) => {
    if (key !== "id" && key !== "worldId") {
      validateIdsRecursively(nested, `${label}.${key}`, context);
    }
  });
}

function requireString(value, label, context, options = {}) {
  if (typeof value !== "string" || value.length === 0) {
    context.error(`${label} must be a non-empty string`);
    return false;
  }
  if (options.pattern && !options.pattern.test(value)) {
    context.error(`${label} must be a ${options.patternName ?? "matching string"}`);
  }
  return true;
}

function requireArray(value, label, context, options = {}) {
  if (!Array.isArray(value)) {
    context.error(`${label} must be an array`);
    return false;
  }
  if (value.length < (options.min ?? 0)) {
    context.error(`${label} must contain at least ${options.min} item(s)`);
  }
  return true;
}

function requireObject(value, label, context, options = {}) {
  if (!isPlainObject(value)) {
    context.error(`${label} must be an object`);
    return false;
  }
  if (Object.keys(value).length < (options.minKeys ?? 0)) {
    context.error(`${label} must contain at least ${options.minKeys} key(s)`);
  }
  return true;
}

function warnOnCjk(value, label, context) {
  if (typeof value === "string") {
    if (/[\u3400-\u9fff]/u.test(value)) {
      context.warning(`${label} contains CJK text; prefer localization keys or Markdown for runtime JSON`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => warnOnCjk(item, `${label}[${index}]`, context));
    return;
  }
  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nested]) => warnOnCjk(nested, `${label}.${key}`, context));
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePath(filePath) {
  return path.resolve(filePath).replaceAll(path.sep, "/");
}

function isWorldConfigPath(filePath) {
  return normalizePath(filePath).endsWith("/world.config.json");
}

function createContext(filePath) {
  const normalized = normalizePath(filePath);
  const parts = normalized.split("/");
  const worldsIndex = parts.lastIndexOf("worlds");
  const worldFromPath = worldsIndex >= 0 ? parts[worldsIndex + 1] : undefined;
  const fileName = parts.at(-1);
  const errors = [];
  const warnings = [];

  return {
    filePath: normalized,
    fileName,
    worldFromPath,
    error(message) {
      errors.push(`${normalized}: ${message}`);
    },
    warning(message) {
      warnings.push(`${normalized}: ${message}`);
    },
    result() {
      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    },
  };
}

function runCli() {
  const rootDir = process.argv[2] ?? "worlds";
  const result = validateRuntimeData({ rootDir });

  console.log(`World runtime data validation`);
  console.log(`Checked files: ${result.filesChecked}`);

  if (Object.keys(result.poolFileCounts).length > 0) {
    console.log(`Pool files: ${JSON.stringify(result.poolFileCounts)}`);
  }

  if (result.warnings.length > 0) {
    console.log(`Warnings: ${result.warnings.length}`);
    result.warnings.forEach((warning) => console.log(`  WARN ${warning}`));
  }

  if (result.errors.length > 0) {
    console.error(`Errors: ${result.errors.length}`);
    result.errors.forEach((error) => console.error(`  ERROR ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log("Validation passed.");
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runCli();
}
