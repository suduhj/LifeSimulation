const ATTRIBUTE_KEYS = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];
const ATTRIBUTE_LAYERS = [
  "base",
  "identityBonus",
  "talentBonus",
  "talentPotential",
  "growthBonus",
  "temporaryModifier",
  "permanentModifier",
  "potential",
  "manifested",
  "effective",
  "realized",
  "maturityCap",
  "lockedPotential",
  "exposure",
];
const GROWTH_LEDGER_LAYERS = [
  "base",
  "identityBonus",
  "talentPotential",
  "growthBonus",
  "temporaryModifier",
  "permanentModifier",
  "potential",
  "maturityCap",
  "realized",
  "effective",
  "lockedPotential",
  "exposure",
];
const LIFE_STAGES = new Set(["birth", "childhood", "adolescence", "youth", "adulthood", "middleAge", "oldAge"]);

export function validateRunState(run) {
  const errors = [];

  requireObject(run, "run", errors);
  if (errors.length > 0) return { valid: false, errors };

  requireEqual(run.schemaVersion, "mvp.run.v1", "schemaVersion", errors);
  requireString(run.runId, "runId", errors);
  requireString(run.worldId, "worldId", errors);
  requireObject(run.player, "player", errors);
  requireObject(run.setup, "setup", errors);
  requireObject(run.worldState, "worldState", errors);
  requireArray(run.statuses, "statuses", errors);
  requireArray(run.importantNPCs, "importantNPCs", errors);
  requireArray(run.factions, "factions", errors);
  requireArray(run.eventHistory, "eventHistory", errors);
  requireArray(run.memory, "memory", errors);

  validatePlayer(run.player, errors);
  validateSetup(run.setup, errors);
  validateWorldState(run.worldState, errors);
  run.importantNPCs?.forEach((npc, index) => validateImportantNPC(npc, `importantNPCs[${index}]`, errors));
  run.memory?.forEach((entry, index) => validateMemoryEntry(entry, `memory[${index}]`, errors));

  if (run.setup?.keptTalentIds && run.player?.talents) {
    const playerTalentIds = run.player.talents.map((talent) => talent.id);
    for (const keptTalentId of run.setup.keptTalentIds) {
      if (!playerTalentIds.includes(keptTalentId)) {
        errors.push(`setup.keptTalentIds contains ${keptTalentId}, but player.talents does not`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidRunState(run, context = "run") {
  const validation = validateRunState(run);
  if (!validation.valid) {
    throw new Error(`${context} failed run validation: ${validation.errors.join("; ")}`);
  }
  return run;
}

function validatePlayer(player, errors) {
  if (!player || typeof player !== "object") return;

  requireString(player.name, "player.name", errors);
  requireString(player.gender, "player.gender", errors);
  requireObject(player.personality, "player.personality", errors);
  requireString(player.personality?.id, "player.personality.id", errors);
  requireString(player.personality?.label, "player.personality.label", errors);
  requireString(player.personality?.aiHint, "player.personality.aiHint", errors);
  requireNumber(player.age, "player.age", errors, { min: 0 });
  if (!LIFE_STAGES.has(player.lifeStage)) {
    errors.push(`player.lifeStage must be one of ${[...LIFE_STAGES].join(", ")}`);
  }
  requireString(player.identitySeedId, "player.identitySeedId", errors);
  requireArray(player.talents, "player.talents", errors);
  requireObject(player.attributes, "player.attributes", errors);
  requireObject(player.growthLedger, "player.growthLedger", errors);

  player.talents?.forEach((talent, index) => {
    requireObject(talent, `player.talents[${index}]`, errors);
    requireString(talent?.id, `player.talents[${index}].id`, errors);
    requireString(talent?.rarity, `player.talents[${index}].rarity`, errors);
  });

  for (const key of ATTRIBUTE_KEYS) {
    validateAttribute(player.attributes?.[key], `player.attributes.${key}`, errors);
  }
  validateGrowthLedger(player.growthLedger, "player.growthLedger", errors);
}

function validateAttribute(attribute, label, errors) {
  requireObject(attribute, label, errors);
  if (!attribute || typeof attribute !== "object") return;

  for (const layer of ATTRIBUTE_LAYERS) {
    requireNumber(attribute[layer], `${label}.${layer}`, errors);
  }
  if (typeof attribute.manifested === "number" && typeof attribute.potential === "number" && attribute.manifested > attribute.potential) {
    errors.push(`${label}.manifested must not exceed ${label}.potential`);
  }
  if (typeof attribute.exposure === "number" && attribute.exposure < 0) {
    errors.push(`${label}.exposure must be non-negative`);
  }
}

function validateGrowthLedger(ledger, label, errors) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) return;
  requireEqual(ledger.schemaVersion, "mvp.growth_ledger.v1", `${label}.schemaVersion`, errors);
  requireString(ledger.authority, `${label}.authority`, errors);
  requireObject(ledger.attributes, `${label}.attributes`, errors);

  for (const key of ATTRIBUTE_KEYS) {
    const entry = ledger.attributes?.[key];
    requireObject(entry, `${label}.attributes.${key}`, errors);
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    for (const layer of GROWTH_LEDGER_LAYERS) {
      requireNumber(entry[layer], `${label}.attributes.${key}.${layer}`, errors);
    }
    requireArray(entry.milestones, `${label}.attributes.${key}.milestones`, errors);
    requireArray(entry.evidence, `${label}.attributes.${key}.evidence`, errors);
    if (typeof entry.effective === "number" && typeof entry.potential === "number" && entry.effective > entry.potential) {
      errors.push(`${label}.attributes.${key}.effective must not exceed potential`);
    }
    if (typeof entry.realized === "number" && typeof entry.potential === "number" && entry.realized > entry.potential) {
      errors.push(`${label}.attributes.${key}.realized must not exceed potential`);
    }
    if (typeof entry.lockedPotential === "number" && entry.lockedPotential < 0) {
      errors.push(`${label}.attributes.${key}.lockedPotential must be non-negative`);
    }
  }
}

function validateSetup(setup, errors) {
  if (!setup || typeof setup !== "object") return;

  requireObject(setup.identitySeed, "setup.identitySeed", errors);
  requireArray(setup.talentDraw, "setup.talentDraw", errors);
  requireArray(setup.keptTalentIds, "setup.keptTalentIds", errors);
  requireObject(setup.allocation, "setup.allocation", errors);

  if (setup.talentDraw?.length !== 5) {
    errors.push("setup.talentDraw must contain exactly 5 talent IDs");
  }
  if (setup.keptTalentIds?.length !== 3) {
    errors.push("setup.keptTalentIds must contain exactly 3 talent IDs");
  }
  const drawnIds = new Set(setup.talentDraw ?? []);
  for (const keptTalentId of setup.keptTalentIds ?? []) {
    if (!drawnIds.has(keptTalentId)) {
      errors.push(`setup.keptTalentIds contains talent not in setup.talentDraw: ${keptTalentId}`);
    }
  }

  let allocationTotal = 0;
  for (const key of ATTRIBUTE_KEYS) {
    const value = setup.allocation?.[key];
    requireInteger(value, `setup.allocation.${key}`, errors, { min: 0 });
    if (Number.isInteger(value)) allocationTotal += value;
  }
  if (allocationTotal !== 20) {
    errors.push(`setup.allocation must total 20, got ${allocationTotal}`);
  }
}

function validateWorldState(worldState, errors) {
  if (!worldState || typeof worldState !== "object") return;

  requireObject(worldState.progress, "worldState.progress", errors);
  requireArray(worldState.flags, "worldState.flags", errors);
}

function validateImportantNPC(npc, label, errors) {
  requireObject(npc, label, errors);
  if (!npc || typeof npc !== "object") return;

  requireString(npc.id, `${label}.id`, errors);
  requireString(npc.role, `${label}.role`, errors);
  requireObject(npc.knownIdentity, `${label}.knownIdentity`, errors);
  requireObject(npc.relationship, `${label}.relationship`, errors);
  requireArray(npc.memory, `${label}.memory`, errors);
  requireArray(npc.flags, `${label}.flags`, errors);

  for (const [dimension, value] of Object.entries(npc.relationship ?? {})) {
    requireNumber(value, `${label}.relationship.${dimension}`, errors);
  }
}

function validateMemoryEntry(entry, label, errors) {
  requireObject(entry, label, errors);
  if (!entry || typeof entry !== "object") return;

  requireString(entry.type, `${label}.type`, errors);
  requireString(entry.text, `${label}.text`, errors);
}

function requireObject(value, label, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  return true;
}

function requireArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return false;
  }
  return true;
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} must be a non-empty string`);
    return false;
  }
  return true;
}

function requireNumber(value, label, errors, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${label} must be a finite number`);
    return false;
  }
  if (typeof options.min === "number" && value < options.min) {
    errors.push(`${label} must be at least ${options.min}`);
    return false;
  }
  return true;
}

function requireInteger(value, label, errors, options = {}) {
  if (!Number.isInteger(value)) {
    errors.push(`${label} must be an integer`);
    return false;
  }
  if (typeof options.min === "number" && value < options.min) {
    errors.push(`${label} must be at least ${options.min}`);
    return false;
  }
  return true;
}

function requireEqual(value, expected, label, errors) {
  if (value !== expected) {
    errors.push(`${label} must be ${expected}`);
  }
}
