import { createInitialRun } from "./initial-run.js";
import { SETUP_PERSONALITY_OPTIONS, getPersonalityOption, normalizePersonality } from "./personality-options.js";

export const SETUP_ATTRIBUTE_KEYS = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];

export const SETUP_ATTRIBUTE_LABELS = {
  appearance: "颜值",
  intelligence: "智力",
  constitution: "体质",
  familyBackground: "家境",
  luck: "运气",
};

export const SETUP_GENDER_OPTIONS = ["female", "male", "nonbinary", "unspecified"];

export { SETUP_PERSONALITY_OPTIONS, getPersonalityOption, normalizePersonality };

export function listWorldChoices(worlds) {
  return Object.values(worlds).map((world, index) => ({
    number: index + 1,
    id: world.id,
    name: world.config.name ?? world.id,
    routeFamilies: world.config.routeFamilies ?? [],
  }));
}

export function resolveWorldId(input, worlds, fallback = "cthulhu") {
  const text = String(input ?? "").trim();
  if (!text) return fallback;

  const choices = listWorldChoices(worlds);
  const numeric = Number.parseInt(text, 10);
  if (Number.isInteger(numeric) && String(numeric) === text) {
    return choices[numeric - 1]?.id ?? fallback;
  }

  return worlds[text] ? text : fallback;
}

export function normalizePlayerName(input, fallback = "未命名") {
  const text = String(input ?? "").trim();
  return text || fallback;
}

export function normalizeGender(input, fallback = "unspecified") {
  const text = String(input ?? "").trim().toLowerCase();
  if (!text) return fallback;
  const alias = {
    "1": "female",
    f: "female",
    female: "female",
    woman: "female",
    girl: "female",
    "女": "female",
    "女性": "female",
    "2": "male",
    m: "male",
    male: "male",
    man: "male",
    boy: "male",
    "男": "male",
    "男性": "male",
    "3": "nonbinary",
    nb: "nonbinary",
    nonbinary: "nonbinary",
    "非二元": "nonbinary",
    "4": "unspecified",
    unspecified: "unspecified",
    "不指定": "unspecified",
  };
  return alias[text] ?? fallback;
}

export function parseAllocationInput(input) {
  const text = String(input ?? "").trim();
  if (!text) {
    return createDefaultAllocation();
  }

  const values = text
    .split(/[,，、\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10));

  if (values.length !== SETUP_ATTRIBUTE_KEYS.length || values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error("属性必须按顺序输入 5 个非负整数，例如 4,4,4,4,4");
  }

  const allocation = Object.fromEntries(SETUP_ATTRIBUTE_KEYS.map((key, index) => [key, values[index]]));
  const total = sumAllocation(allocation);
  if (total !== 20) {
    throw new Error(`开局基础属性总点数必须等于 20，当前为 ${total}`);
  }

  return allocation;
}

export function createDefaultAllocation() {
  return {
    appearance: 4,
    intelligence: 4,
    constitution: 4,
    familyBackground: 4,
    luck: 4,
  };
}

export function describeAllocation(allocation) {
  return SETUP_ATTRIBUTE_KEYS.map((key) => `${SETUP_ATTRIBUTE_LABELS[key]} ${allocation[key]}`).join(" / ");
}

export function parseTalentSelectionInput(input, talentDraw) {
  const text = String(input ?? "").trim();
  if (!text) {
    return autoKeepTalentIds(talentDraw);
  }

  const selectedIds = text
    .split(/[,，、\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const numeric = Number.parseInt(part, 10);
      if (Number.isInteger(numeric) && String(numeric) === part) {
        return talentDraw[numeric - 1]?.id;
      }
      return part;
    });

  if (selectedIds.length !== 3 || selectedIds.some((id) => !id)) {
    throw new Error("天赋必须从抽到的 5 个里选择 3 个，例如 1,3,5");
  }

  const uniqueIds = new Set(selectedIds);
  if (uniqueIds.size !== 3) {
    throw new Error("天赋选择不能重复");
  }

  const drawnIds = new Set(talentDraw.map((talent) => talent.id));
  const invalidId = selectedIds.find((id) => !drawnIds.has(id));
  if (invalidId) {
    throw new Error(`只能选择本次抽到的天赋：${invalidId}`);
  }

  return selectedIds;
}

export function autoKeepTalentIds(talentDraw) {
  return [...talentDraw]
    .sort((left, right) => rarityWeight(right.rarity) - rarityWeight(left.rarity))
    .slice(0, 3)
    .map((talent) => talent.id);
}

export function createSetupPreview({ worlds, worldId, seed = 1, playerProfile = {}, allocation } = {}) {
  const run = createInitialRun({
    worlds,
    worldId,
    seed,
    playerProfile,
    allocation,
  });

  return {
    world: worlds[worldId],
    run,
    talentDraw: run.setup.talentDraw.map((talentId) => {
      return worlds[worldId].talentPool.talents.find((talent) => talent.id === talentId);
    }),
    defaultKeptTalentIds: run.setup.keptTalentIds,
  };
}

export function createRunFromSetup({ worlds, preview, keptTalentIds } = {}) {
  return createInitialRun({
    worlds,
    worldId: preview.run.worldId,
    seed: preview.run.seed,
    playerProfile: {
      name: preview.run.player.name,
      gender: preview.run.player.gender,
      personality: preview.run.player.personality?.id ?? preview.run.player.personality,
    },
    allocation: preview.run.setup.allocation,
    keptTalentIds,
  });
}

function sumAllocation(allocation) {
  return SETUP_ATTRIBUTE_KEYS.reduce((sum, key) => sum + allocation[key], 0);
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
