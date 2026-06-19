import { validateRunState } from "../run-validator.js";

const PLAYER_VIEW_FORBIDDEN_KEYS = [
  "hiddenInfo",
  "growthLedger",
  "maturityCap",
  "lockedPotential",
  "effective",
  "internal",
  "hiddenStateNotes",
];

export function checkRunInvariants({ previousRun, run, playerView } = {}) {
  const errors = [];
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return { valid: false, errors: ["run must be an object"] };
  }

  if (previousRun?.player && run.player?.age < previousRun.player.age) {
    errors.push("age cannot move backwards");
  }

  checkGrowthLedger(run, errors);
  checkStoryState(previousRun, run, errors);
  checkPlayerView(playerView, errors);

  const runValidation = validateRunState(run);
  if (!runValidation.valid) {
    errors.push(...runValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertRunInvariants(input) {
  const result = checkRunInvariants(input);
  if (!result.valid) {
    throw new Error(`Run invariant failed: ${result.errors.join("; ")}`);
  }
  return result;
}

function checkGrowthLedger(run, errors) {
  for (const [key, entry] of Object.entries(run.player?.growthLedger?.attributes ?? {})) {
    if (entry.effective > entry.potential) errors.push(`${key} effective must not exceed potential`);
    if (entry.realized > entry.potential) errors.push(`${key} realized must not exceed potential`);
    if (entry.maturityCap !== Number.MAX_SAFE_INTEGER && entry.effective > entry.maturityCap) {
      errors.push(`${key} effective must not exceed maturityCap`);
    }
    if (entry.lockedPotential < 0) errors.push(`${key} lockedPotential must be non-negative`);
  }
}

function checkStoryState(previousRun, run, errors) {
  const previousClosedFacts = new Set(previousRun?.worldState?.storyState?.closedFacts ?? []);
  const nextClosedFacts = new Set(run.worldState?.storyState?.closedFacts ?? []);
  for (const fact of previousClosedFacts) {
    if (!nextClosedFacts.has(fact)) errors.push(`closed fact cannot reopen: ${fact}`);
  }

  const previousThreads = new Map((previousRun?.worldState?.storyState?.threads ?? []).map((thread) => [thread.threadId, thread]));
  for (const thread of run.worldState?.storyState?.threads ?? []) {
    const previous = previousThreads.get(thread.threadId);
    if (!previous) continue;
    if (stageRank(thread.stage) < stageRank(previous.stage)) {
      errors.push(`thread stage cannot move backwards: ${thread.threadId}`);
    }
  }

  checkUniqueRecords(run.worldState?.storyState?.curriculum?.recentSlots ?? [], "curriculum recent slot", (item) => `${item.age}:${item.slot}`, errors);
  checkUniqueRecords(run.worldState?.storyState?.topicLedger?.recentTopics ?? [], "topic ledger record", (item) => (
    `${item.age}:${item.topicFamily}:${item.arena}:${item.objectFocus}:${item.pressureType}`
  ), errors);
  checkUniqueRecords(
    run.worldState?.storyState?.yearlyOutcomes ?? [],
    "yearly outcome",
    (item) => item.outcomeId ?? `${item.age}:${item.curriculum?.slot}`,
    errors,
  );
}

function checkUniqueRecords(records, label, keyFn, errors) {
  const seen = new Set();
  for (const record of records) {
    const key = keyFn(record);
    if (seen.has(key)) errors.push(`${label} duplicated: ${key}`);
    seen.add(key);
  }
}

function checkPlayerView(playerView, errors) {
  if (!playerView) return;
  const json = JSON.stringify(playerView);
  for (const key of PLAYER_VIEW_FORBIDDEN_KEYS) {
    if (json.includes(key)) errors.push(`PlayerView must not expose ${key}`);
  }
}

function stageRank(stage) {
  return {
    discovered: 1,
    active: 2,
    identified: 3,
    pressured: 4,
    resolved: 5,
    closed: 6,
  }[stage] ?? 2;
}
