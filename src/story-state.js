export const STORY_STATE_SCHEMA_VERSION = "mvp.story_state.v1";

export function createEmptyStoryState() {
  return {
    schemaVersion: STORY_STATE_SCHEMA_VERSION,
    threads: [],
    facts: [],
    closedFacts: [],
    forbiddenRepeats: [],
    activePressures: [],
  };
}

export function ensureStoryState(run) {
  run.worldState ??= {};
  const current = run.worldState.storyState;
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    run.worldState.storyState = createEmptyStoryState();
    return run.worldState.storyState;
  }
  current.schemaVersion = current.schemaVersion ?? STORY_STATE_SCHEMA_VERSION;
  current.threads = Array.isArray(current.threads) ? current.threads : [];
  current.facts = Array.isArray(current.facts) ? current.facts : [];
  current.closedFacts = Array.isArray(current.closedFacts) ? current.closedFacts : [];
  current.forbiddenRepeats = Array.isArray(current.forbiddenRepeats) ? current.forbiddenRepeats : [];
  current.activePressures = Array.isArray(current.activePressures) ? current.activePressures : [];
  return current;
}

export function recordSimulationOutcome(run, outcome = {}) {
  const nextRun = structuredClone(run);
  const storyState = ensureStoryState(nextRun);
  addUnique(storyState.facts, outcome.factsAdded ?? []);
  addUnique(storyState.closedFacts, outcome.factsClosed ?? []);
  addUnique(storyState.forbiddenRepeats, outcome.forbiddenRepeats ?? []);

  for (const update of outcome.threadUpdates ?? []) {
    if (!update?.threadId) continue;
    const existing = storyState.threads.find((thread) => thread.threadId === update.threadId);
    const nextThread = {
      threadId: update.threadId,
      stage: update.stage ?? existing?.stage ?? "active",
      nextPressure: update.nextPressure ?? existing?.nextPressure ?? "",
      updatedAge: Number.isFinite(update.updatedAge) ? update.updatedAge : nextRun.player?.age ?? existing?.updatedAge ?? 0,
    };
    if (existing) Object.assign(existing, nextThread);
    else storyState.threads.push(nextThread);
    if (nextThread.nextPressure) {
      upsertPressure(storyState.activePressures, {
        threadId: nextThread.threadId,
        pressureId: nextThread.nextPressure,
        age: nextThread.updatedAge,
      });
    }
  }

  return nextRun;
}

export function buildStoryStatePatch(outcome = {}, age = 0) {
  const storyState = createEmptyStoryState();
  addUnique(storyState.facts, outcome.factsAdded ?? []);
  addUnique(storyState.closedFacts, outcome.factsClosed ?? []);
  addUnique(storyState.forbiddenRepeats, outcome.forbiddenRepeats ?? []);
  for (const update of outcome.threadUpdates ?? []) {
    if (!update?.threadId) continue;
    const thread = {
      threadId: update.threadId,
      stage: update.stage ?? "active",
      nextPressure: update.nextPressure ?? "",
      updatedAge: Number.isFinite(update.updatedAge) ? update.updatedAge : age,
    };
    storyState.threads.push(thread);
    if (thread.nextPressure) {
      storyState.activePressures.push({
        threadId: thread.threadId,
        pressureId: thread.nextPressure,
        age: thread.updatedAge,
      });
    }
  }
  return {
    target: "storyState",
    value: storyState,
    mergeStrategy: "merge_story_state",
    source: "simulation_kernel",
  };
}

function addUnique(target, values) {
  for (const value of values ?? []) {
    if (value && !target.includes(value)) target.push(value);
  }
}

function upsertPressure(pressures, pressure) {
  const existing = pressures.find((item) => item.threadId === pressure.threadId && item.pressureId === pressure.pressureId);
  if (existing) Object.assign(existing, pressure);
  else pressures.push(pressure);
}
