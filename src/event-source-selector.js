import { createRng } from "./random.js";

export const EVENT_SOURCE_TYPES = [
  "seed_pool",
  "ai_free",
  "player_consequence",
  "npc_driven",
  "world_progress",
  "natural_life",
  "random_disturbance",
];

export function selectEventGenerationContext({ world, run, seed = 1 } = {}) {
  if (!world) {
    throw new Error("world is required for event source selection");
  }
  const rng = createRng(`${run?.runId ?? "run"}:${seed}:event_source`);
  const sourceType = pickWeightedSource(world.config.eventGeneration?.sourceWeights, rng);
  const selectedSeeds = sourceType === "seed_pool" ? selectEventSeeds({ world, run, rng, limit: 3 }) : [];

  return {
    sourceType,
    selectedSeeds,
    poolMode: world.config.eventGeneration?.poolMode ?? "open_soft_seed_pool",
    seedStrictness: world.config.eventGeneration?.seedStrictnessDefault ?? "soft",
    aiAdaptation: world.config.eventGeneration?.aiAdaptationDefault ?? "must_adapt",
    allowAiFreeGenerationWhenNoSeedFits: world.config.eventGeneration?.allowAiFreeGenerationWhenNoSeedFits !== false,
    sourceInstruction: buildSourceInstruction(sourceType),
  };
}

export function selectEventSeeds({ world, run, rng = createRng(1), limit = 1 } = {}) {
  const recentSeedIds = new Set(
    run.eventHistory
      .filter((event) => event.responseType === "life_event")
      .flatMap((event) => event.selectedSeeds ?? [])
      .filter((seed) => seed.poolType === "event_seed")
      .map((seed) => seed.seedId)
      .slice(-5),
  );
  const stageCandidates = world.eventSeeds.eventSeeds.filter((eventSeed) => {
    return eventSeed.lifeStages.includes(run.player.lifeStage) || eventSeed.lifeStages.includes("childhood");
  });
  const freshCandidates = stageCandidates.filter((eventSeed) => !recentSeedIds.has(eventSeed.id));
  const candidates = freshCandidates.length > 0 ? freshCandidates : stageCandidates;
  const shuffled = rng.shuffle(candidates.length > 0 ? candidates : world.eventSeeds.eventSeeds);
  return shuffled.slice(0, limit).map((eventSeed) => ({
    ...eventSeed,
    strictness: eventSeed.strictness ?? world.config.eventGeneration?.seedStrictnessDefault ?? "soft",
    aiAdaptation: eventSeed.aiAdaptation ?? world.config.eventGeneration?.aiAdaptationDefault ?? "must_adapt",
  }));
}

function pickWeightedSource(sourceWeights = {}, rng) {
  const entries = EVENT_SOURCE_TYPES.map((sourceType) => [sourceType, sourceWeights[sourceType] ?? 0]);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return "ai_free";

  let roll = rng.next() * total;
  for (const [sourceType, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return sourceType;
  }
  return entries.at(-1)[0];
}

function buildSourceInstruction(sourceType) {
  return {
    seed_pool: "Use selected seeds as soft inspiration and constraints. Must adapt them to current save; do not copy them as fixed plot.",
    ai_free: "Generate a new event from world rules, current age, history, attributes, NPCs, and world progress. Do not require an event seed.",
    player_consequence: "Generate consequences from prior player choices or free-form actions. Do not force unrelated seed-pool events.",
    npc_driven: "Let an important NPC push the situation based on relationship, stance, goals, secrets, or faction ties.",
    world_progress: "Trigger an event from world-specific progress values, exposure, scarcity, realm pressure, corruption, or similar systems.",
    natural_life: "Generate ordinary life simulation: family, school, work, illness, romance, friendship, aging, money, or daily pressure.",
    random_disturbance: "Generate a random disruption influenced by attributes, talents, luck, world rules, and current life context.",
  }[sourceType];
}
