export const GROWTH_LEDGER_SCHEMA_VERSION = "mvp.growth_ledger.v1";
export const ATTRIBUTE_KEYS = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];

export const MATURITY_CAPPED_ATTRIBUTES = new Set(["constitution", "intelligence"]);
const IMMEDIATE_REALITY_ATTRIBUTE_KEYS = new Set(["familyBackground", "luck"]);
const MILESTONE_THRESHOLDS = [5, 10, 20, 50, 100, 200];

export function createGrowthLedgerFromAttributes(attributes = {}, age = 0) {
  const ledger = {
    schemaVersion: GROWTH_LEDGER_SCHEMA_VERSION,
    authority: "engine",
    attributes: {},
  };

  for (const key of ATTRIBUTE_KEYS) {
    ledger.attributes[key] = normalizeLedgerEntry(key, attributes[key] ?? {}, age);
  }

  return recalculateGrowthLedger(ledger, age);
}

export function ensureGrowthLedger(run) {
  if (!run?.player || typeof run.player !== "object") {
    throw new Error("ensureGrowthLedger requires a run with player state");
  }
  run.player.attributes ??= {};
  if (!run.player.growthLedger || typeof run.player.growthLedger !== "object" || Array.isArray(run.player.growthLedger)) {
    run.player.growthLedger = createGrowthLedgerFromAttributes(run.player.attributes, run.player.age ?? 0);
  } else {
    run.player.growthLedger.schemaVersion = GROWTH_LEDGER_SCHEMA_VERSION;
    run.player.growthLedger.authority = "engine";
    run.player.growthLedger.attributes ??= {};
    for (const key of ATTRIBUTE_KEYS) {
      run.player.growthLedger.attributes[key] = normalizeLedgerEntry(
        key,
        run.player.growthLedger.attributes[key] ?? run.player.attributes[key] ?? {},
        run.player.age ?? 0,
      );
    }
    recalculateGrowthLedger(run.player.growthLedger, run.player.age ?? 0);
  }
  syncAttributesFromGrowthLedger(run);
  return run.player.growthLedger;
}

export function rebuildGrowthLedgerFromAttributes(run) {
  if (!run?.player || typeof run.player !== "object") {
    throw new Error("rebuildGrowthLedgerFromAttributes requires a run with player state");
  }
  run.player.growthLedger = createGrowthLedgerFromAttributes(run.player.attributes ?? {}, run.player.age ?? 0);
  syncAttributesFromGrowthLedger(run);
  return run.player.growthLedger;
}

export function recalculateGrowthLedgerForRun(run) {
  ensureGrowthLedger(run);
  recalculateGrowthLedger(run.player.growthLedger, run.player.age ?? 0);
  syncAttributesFromGrowthLedger(run);
  return run.player.growthLedger;
}

export function recalculateGrowthLedger(ledger, age = 0) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) {
    throw new Error("recalculateGrowthLedger requires a growth ledger object");
  }
  ledger.schemaVersion = GROWTH_LEDGER_SCHEMA_VERSION;
  ledger.authority = "engine";
  ledger.attributes ??= {};

  for (const key of ATTRIBUTE_KEYS) {
    const entry = normalizeLedgerEntry(key, ledger.attributes[key] ?? {}, age);
    const potential = Math.max(0, floorNumber(
      entry.base
      + entry.identityBonus
      + entry.talentPotential
      + entry.growthBonus
      + entry.permanentModifier,
    ));
    const maturityCap = maturityCapForAge(age, key, potential);
    const realized = IMMEDIATE_REALITY_ATTRIBUTE_KEYS.has(key)
      ? potential
      : clamp(floorNumber(entry.realized), 0, potential);
    const rawEffective = realized + entry.temporaryModifier;

    entry.potential = potential;
    entry.maturityCap = maturityCap;
    entry.realized = realized;
    entry.effective = clamp(floorNumber(Math.min(potential, maturityCap, rawEffective)), 0, potential);
    entry.lockedPotential = Math.max(0, potential - realized);
    entry.developmentStage = developmentStageForAge(age);
    entry.talentBonus = entry.talentPotential;
    entry.milestones = normalizeMilestones(entry.milestones, key, realized);
    ledger.attributes[key] = entry;
  }

  return ledger;
}

export function maturityCapForAge(age, attribute = "", _potential = 0) {
  if (!MATURITY_CAPPED_ATTRIBUTES.has(attribute)) return Number.MAX_SAFE_INTEGER;
  const a = Math.max(0, Math.floor(Number(age) || 0));
  if (a >= 18) return Number.MAX_SAFE_INTEGER;
  if (a <= 0) return 3;
  if (a <= 3) return 3 + a;
  if (a <= 6) return 6 + (a - 3);
  if (a <= 12) return 9 + Math.floor((a - 6) * 1.25);
  return 17 + Math.floor((a - 13) * 2);
}

export function developmentStageForAge(age) {
  const a = Math.max(0, Math.floor(Number(age) || 0));
  if (a <= 0) return "infant";
  if (a <= 3) return "toddler";
  if (a <= 6) return "early_child";
  if (a <= 12) return "child";
  if (a <= 17) return "adolescent";
  return "adult";
}

export function syncAttributesFromGrowthLedger(run) {
  const ledger = run?.player?.growthLedger;
  if (!ledger?.attributes) return run;
  run.player.attributes ??= {};

  for (const key of ATTRIBUTE_KEYS) {
    const entry = ledger.attributes[key];
    if (!entry) continue;
    const previous = run.player.attributes[key] ?? {};
    run.player.attributes[key] = {
      ...previous,
      base: entry.base,
      identityBonus: entry.identityBonus,
      talentBonus: entry.talentPotential,
      talentPotential: entry.talentPotential,
      growthBonus: entry.growthBonus,
      temporaryModifier: entry.temporaryModifier,
      permanentModifier: entry.permanentModifier,
      potential: entry.potential,
      manifested: entry.effective,
      effective: entry.effective,
      realized: entry.realized,
      maturityCap: entry.maturityCap,
      lockedPotential: entry.lockedPotential,
      exposure: Math.max(0, floorNumber(entry.exposure)),
    };
  }
  return run;
}

export function applyGrowthEvidence(run, changes = []) {
  ensureGrowthLedger(run);
  for (const change of changes ?? []) {
    applyGrowthEvidenceChange(run, change);
  }
  recalculateGrowthLedgerForRun(run);
  return run.player.growthLedger;
}

export function applyGrowthEvidenceChange(run, change) {
  if (!change || typeof change !== "object") return;
  const attribute = change.attribute ?? change.target;
  if (!ATTRIBUTE_KEYS.includes(attribute)) return;
  const amount = floorNumber(change.amount);
  if (amount === 0) return;

  const ledger = ensureGrowthLedger(run);
  const entry = ledger.attributes[attribute];
  const before = entry.realized;
  entry.realized = clamp(entry.realized + amount, 0, entry.potential);
  const appliedAmount = entry.realized - before;

  entry.evidence ??= [];
  entry.evidence.push({
    attribute,
    amount: appliedAmount,
    requestedAmount: amount,
    source: textOrFallback(change.source, "growth_evidence"),
    reason: textOrFallback(change.reason, ""),
    age: Number.isFinite(run.player?.age) ? run.player.age : 0,
  });
  entry.milestones = normalizeMilestones(entry.milestones, attribute, entry.realized);
}

export function applyAttributeLayerDelta(run, attribute, layer, amount) {
  if (!ATTRIBUTE_KEYS.includes(attribute)) return;
  const ledger = ensureGrowthLedger(run);
  const entry = ledger.attributes[attribute];
  const delta = floorNumber(amount);
  if (delta === 0) return;

  if (layer === "talentBonus" || layer === "talentPotential") {
    entry.talentPotential += delta;
    entry.talentBonus = entry.talentPotential;
    return;
  }
  if (typeof entry[layer] === "number") {
    entry[layer] += delta;
  }
}

export function applyRealizedDelta(run, attribute, amount) {
  if (!ATTRIBUTE_KEYS.includes(attribute)) return;
  const ledger = ensureGrowthLedger(run);
  const entry = ledger.attributes[attribute];
  entry.realized = clamp(entry.realized + floorNumber(amount), 0, entry.potential);
}

export function setRealizedValue(run, attribute, value) {
  if (!ATTRIBUTE_KEYS.includes(attribute)) return;
  const ledger = ensureGrowthLedger(run);
  const entry = ledger.attributes[attribute];
  entry.realized = clamp(floorNumber(value), 0, entry.potential);
}

export function setExposureValue(run, attribute, value) {
  if (!ATTRIBUTE_KEYS.includes(attribute)) return;
  const ledger = ensureGrowthLedger(run);
  ledger.attributes[attribute].exposure = Math.max(0, floorNumber(value));
}

export function applyExposureDelta(run, attribute, amount) {
  if (!ATTRIBUTE_KEYS.includes(attribute)) return;
  const ledger = ensureGrowthLedger(run);
  const entry = ledger.attributes[attribute];
  entry.exposure = Math.max(0, floorNumber(entry.exposure + (Number(amount) || 0)));
}

function normalizeLedgerEntry(key, value, age) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const talentPotential = floorNumber(source.talentPotential ?? source.talentBonus);
  const base = floorNumber(source.base);
  const identityBonus = floorNumber(source.identityBonus);
  const growthBonus = floorNumber(source.growthBonus);
  const temporaryModifier = floorNumber(source.temporaryModifier);
  const permanentModifier = floorNumber(source.permanentModifier);
  const potential = Math.max(0, floorNumber(
    source.potential ?? (base + identityBonus + talentPotential + growthBonus + permanentModifier),
  ));
  const realized = Number.isFinite(source.realized)
    ? floorNumber(source.realized)
    : inferInitialRealized({ key, source, base, talentPotential, growthBonus, permanentModifier, potential, age });

  return {
    base,
    identityBonus,
    talentPotential,
    talentBonus: talentPotential,
    growthBonus,
    temporaryModifier,
    permanentModifier,
    potential,
    maturityCap: floorNumber(source.maturityCap ?? maturityCapForAge(age, key, potential)),
    realized,
    effective: floorNumber(source.effective ?? source.manifested ?? 0),
    lockedPotential: Math.max(0, floorNumber(source.lockedPotential ?? (potential - realized))),
    exposure: Math.max(0, floorNumber(source.exposure)),
    milestones: Array.isArray(source.milestones) ? structuredClone(source.milestones) : [],
    evidence: Array.isArray(source.evidence) ? structuredClone(source.evidence) : [],
    developmentStage: source.developmentStage ?? developmentStageForAge(age),
  };
}

function inferInitialRealized({ key, source, base, talentPotential, growthBonus, permanentModifier, potential }) {
  if (IMMEDIATE_REALITY_ATTRIBUTE_KEYS.has(key)) return potential;
  const manifested = Number.isFinite(source.manifested) ? floorNumber(source.manifested) : 0;
  const earlyTalentRealization = Math.floor(Math.max(0, talentPotential) * 0.1);
  const layerRealized = base + growthBonus + permanentModifier + earlyTalentRealization;
  return clamp(Math.max(manifested, layerRealized), 0, potential);
}

function normalizeMilestones(existing = [], attribute, realized) {
  const milestones = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(milestones.map((milestone) => milestone?.id).filter(Boolean));
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (realized < threshold) continue;
    const id = `${attribute}_realized_${threshold}`;
    if (seen.has(id)) continue;
    milestones.push({
      id,
      attribute,
      threshold,
      label: `${attribute} realized ${threshold}`,
    });
    seen.add(id);
  }
  return milestones;
}

function floorNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.floor(number);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function textOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
