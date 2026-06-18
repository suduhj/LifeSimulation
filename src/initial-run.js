import { createRng } from "./random.js";
import { generateInitialImportantNPCs } from "./npc-generator.js";
import { getPersonalityOption } from "./personality-options.js";
import { createEmptyStoryState } from "./story-state.js";
import { createGrowthLedgerFromAttributes, syncAttributesFromGrowthLedger } from "./growth-ledger.js";
import { ensureEventLog } from "./runtime/event-log.js";

const ATTRIBUTE_KEYS = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];
const DEFAULT_ALLOCATION = {
  appearance: 4,
  intelligence: 4,
  constitution: 4,
  familyBackground: 4,
  luck: 4,
};
export const TALENT_RARITY_PROBABILITIES = {
  common: 45,
  fine: 28,
  rare: 16,
  epic: 7,
  legendary: 3,
  mythic: 1,
};

export function createInitialRun({
  worlds,
  worldId,
  seed = 1,
  playerProfile = {},
  allocation = DEFAULT_ALLOCATION,
  keptTalentIds,
} = {}) {
  const world = worlds?.[worldId];
  if (!world) {
    throw new Error(`Unknown worldId: ${worldId}`);
  }

  validateAllocation(allocation);

  const rng = createRng(seed);
  const identity = rng.pick(world.identitySeeds.identitySeeds);
  const talentDrawResult = drawStartingTalents(world.talentPool.talents, rng);
  const talentDraw = talentDrawResult.talents;
  const selectedTalents = chooseStartingTalents(talentDraw, keptTalentIds);
  const attributes = buildAttributes(allocation, selectedTalents);
  const growthLedger = createGrowthLedgerFromAttributes(attributes, 0);
  const personality = getPersonalityOption(playerProfile.personality);
  const runId = `run_${worldId}_${seed}`;

  const run = {
    schemaVersion: "mvp.run.v1",
    runId,
    worldId,
    seed,
    player: {
      name: playerProfile.name ?? "未命名",
      gender: playerProfile.gender ?? "unspecified",
      personality: {
        id: personality.id,
        label: personality.label,
        aiHint: personality.aiHint,
      },
      age: 0,
      lifeStage: "birth",
      identitySeedId: identity.id,
      talents: selectedTalents.map((talent) => ({
        id: talent.id,
        rarity: talent.rarity,
        manifestationType: talent.manifestationType,
        tags: talent.tags,
        effects: talent.effects ?? {},
        exposure: talent.exposure ?? talent.effects?.exposureBonus ?? 0,
      })),
      attributes,
      growthLedger,
    },
    setup: {
      identitySeed: identity,
      talentDraw: talentDraw.map((talent) => talent.id),
      talentDrawRarities: talentDraw.map((talent) => talent.rarity),
      talentDrawRarityRolls: talentDrawResult.rarityRolls,
      talentRarityProbabilities: { ...TALENT_RARITY_PROBABILITIES },
      keptTalentIds: selectedTalents.map((talent) => talent.id),
      allocation: { ...allocation },
      personality: {
        id: personality.id,
        label: personality.label,
      },
    },
    worldState: {
      progress: createInitialWorldProgress(world),
      flags: [],
      storyState: createEmptyStoryState(),
    },
    statuses: [],
    importantNPCs: [],
    factions: [],
    eventHistory: [],
    memory: [
      {
        type: "run_started",
        text: "新的人生开始了，命运尚未展开。",
      },
    ],
  };
  syncAttributesFromGrowthLedger(run);
  run.importantNPCs = generateInitialImportantNPCs({ world, runId, seed });
  ensureEventLog(run);
  return run;
}

export function drawStartingTalents(talents, rng = createRng(1), drawCount = 5) {
  if (!Array.isArray(talents) || talents.length < drawCount) {
    throw new Error(`talent pool must contain at least ${drawCount} talents`);
  }

  const byRarity = groupTalentsByRarity(talents);
  const drawn = [];
  const drawnIds = new Set();
  const rarityRolls = [];

  for (let index = 0; index < drawCount; index += 1) {
    const targetRarity = rollTalentRarity(rng);
    const rarityCandidates = (byRarity[targetRarity] ?? []).filter((talent) => !drawnIds.has(talent.id));
    const fallbackCandidates = talents.filter((talent) => !drawnIds.has(talent.id));
    const candidates = rarityCandidates.length > 0 ? rarityCandidates : fallbackCandidates;
    const talent = rng.pick(candidates);

    drawn.push(talent);
    drawnIds.add(talent.id);
    rarityRolls.push({
      targetRarity,
      resolvedRarity: talent.rarity,
      fallbackUsed: talent.rarity !== targetRarity,
    });
  }

  return {
    talents: drawn,
    rarityRolls,
  };
}

function rollTalentRarity(rng) {
  const total = Object.values(TALENT_RARITY_PROBABILITIES).reduce((sum, value) => sum + value, 0);
  let roll = rng.next() * total;

  for (const [rarity, weight] of Object.entries(TALENT_RARITY_PROBABILITIES)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return "mythic";
}

function groupTalentsByRarity(talents) {
  const grouped = {};
  for (const talent of talents) {
    grouped[talent.rarity] ??= [];
    grouped[talent.rarity].push(talent);
  }
  return grouped;
}

function chooseStartingTalents(talentDraw, keptTalentIds) {
  if (keptTalentIds) {
    return chooseSpecifiedTalents(talentDraw, keptTalentIds);
  }

  return [...talentDraw]
    .sort((left, right) => rarityWeight(right.rarity) - rarityWeight(left.rarity))
    .slice(0, 3);
}

function chooseSpecifiedTalents(talentDraw, keptTalentIds) {
  if (!Array.isArray(keptTalentIds) || keptTalentIds.length !== 3) {
    throw new Error("keptTalentIds must contain exactly 3 talent IDs");
  }

  const uniqueIds = new Set(keptTalentIds);
  if (uniqueIds.size !== 3) {
    throw new Error("keptTalentIds must not contain duplicates");
  }

  const talentById = new Map(talentDraw.map((talent) => [talent.id, talent]));
  return keptTalentIds.map((talentId) => {
    const talent = talentById.get(talentId);
    if (!talent) {
      throw new Error(`keptTalentIds contains talent not in current draw: ${talentId}`);
    }
    return talent;
  });
}

function buildAttributes(allocation, selectedTalents) {
  const attributes = {};

  for (const key of ATTRIBUTE_KEYS) {
    const base = allocation[key] ?? 0;
    const talentBonus = selectedTalents.reduce((sum, talent) => {
      return sum + (talent.effects?.attributePotential?.[key] ?? 0);
    }, 0);
    const potential = base + talentBonus;
    const manifested = key === "familyBackground" ? potential : Math.max(0, Math.floor(potential * 0.1));
    const exposure = estimateExposure({ key, potential, manifested, selectedTalents });

    attributes[key] = {
      base,
      identityBonus: 0,
      talentBonus,
      growthBonus: 0,
      temporaryModifier: 0,
      permanentModifier: 0,
      potential,
      manifested,
      exposure,
    };
  }

  return attributes;
}

function createInitialWorldProgress(world) {
  const progress = {};
  const progressBars = world.config.progressBars ?? [];
  const secondaryProgression = world.config.secondaryProgression ?? [];

  for (const id of secondaryProgression) {
    progress[id] = 0;
  }
  for (const bar of progressBars) {
    progress[bar.id] ??= 0;
  }

  if (world.id === "cultivation") {
    progress.realm = "mortal";
  }

  return progress;
}

function validateAllocation(allocation) {
  let total = 0;
  for (const key of ATTRIBUTE_KEYS) {
    const value = allocation[key];
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`allocation.${key} must be a non-negative integer`);
    }
    total += value;
  }
  if (total !== 20) {
    throw new Error(`starting allocation must total 20, got ${total}`);
  }
}

function rarityWeight(rarity) {
  return {
    common: 1,
    fine: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythic: 6,
  }[rarity] ?? 0;
}

function estimateExposure({ key, potential, manifested, selectedTalents }) {
  const exposureBonus = selectedTalents.reduce((sum, talent) => sum + (talent.effects?.exposureBonus ?? 0), 0);
  const immediateTalentBonus = selectedTalents.some((talent) => talent.manifestationType === "immediate") ? 5 : 0;
  const raw = Math.floor(manifested * 0.5 + Math.max(0, potential - 20) * 0.1 + exposureBonus + immediateTalentBonus);

  if (key === "familyBackground") {
    return Math.min(100, Math.max(0, Math.floor(potential)));
  }

  return Math.min(100, Math.max(0, raw));
}
