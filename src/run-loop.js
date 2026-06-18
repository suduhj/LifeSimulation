import { validateAiResponse } from "./ai-response-validator.js";
import { generateMockLifeEvent } from "./mock-ai.js";
import { buildPlayerVisibleNpcIdentity } from "./localization.js";
import { assertValidRunState } from "./run-validator.js";
import { ensureStoryState, recordSimulationOutcome } from "./story-state.js";

export function applyAiResponseToRun(run, response) {
  const validation = validateAiResponse(response);
  if (!validation.valid) {
    throw new Error(`AI response failed validation: ${validation.errors.join("; ")}`);
  }
  if (response.runId !== run.runId) {
    throw new Error(`AI response runId ${response.runId} does not match run ${run.runId}`);
  }
  if (response.worldId !== run.worldId) {
    throw new Error(`AI response worldId ${response.worldId} does not match run ${run.worldId}`);
  }

  const nextRun = structuredClone(run);

  nextRun.player.age = response.timeSpan.ageEnd;
  nextRun.player.lifeStage = lifeStageForAge(response.timeSpan.ageEnd);
  applyStatePatch(nextRun, response.statePatch);
  applyAgeManifestationFloor(nextRun);

  nextRun.eventHistory.push({
    turnId: response.turnId,
    responseType: response.responseType,
    interactionMode: response.interactionMode,
    timeSpan: response.timeSpan,
    event: response.event,
    selectedSeeds: response.selectedSeeds,
    choices: response.choices,
    visibleChanges: response.visibleChanges,
    playerText: response.playerText,
  });

  assertValidRunState(nextRun, "applyAiResponseToRun output");
  return nextRun;
}

export function runMockTurns({ run, worlds, turns = 1, seed = 1 } = {}) {
  if (!Number.isInteger(turns) || turns < 0) {
    throw new Error("turns must be a non-negative integer");
  }

  let currentRun = structuredClone(run);
  for (let index = 0; index < turns; index += 1) {
    const response = generateMockLifeEvent({
      run: currentRun,
      worlds,
      seed: seed + index,
    });
    currentRun = applyAiResponseToRun(currentRun, response);
  }
  return currentRun;
}

export function lifeStageForAge(age) {
  if (age <= 0) return "birth";
  if (age <= 6) return "childhood";
  if (age <= 12) return "adolescence";
  if (age <= 18) return "youth";
  if (age <= 59) return "adulthood";
  if (age <= 79) return "middleAge";
  return "oldAge";
}

// Attribute layers gradually "manifest" with age: 当前表现 (manifested) starts as a small fraction
// of 潜能 (potential = base allocation + talent bonus) and rises smoothly to full by adulthood.
// familyBackground (出身/底蕴) is known from birth, so it is not gated by age.
const AGE_MANIFESTATION_KEYS = ["appearance", "intelligence", "constitution", "luck"];
const FULL_MANIFESTATION_AGE = 18;

export function manifestationRatioForAge(age) {
  const a = Math.max(0, Number(age) || 0);
  if (a >= FULL_MANIFESTATION_AGE) return 1;
  return 0.1 + (a / FULL_MANIFESTATION_AGE) * 0.9;
}

// Raise each age-gated attribute's manifested value to its age-appropriate floor (capped at
// potential). Events/AI may push manifested higher than the floor; this only enforces the
// deterministic age baseline so growth is visible over the life regardless of AI output.
function applyAgeManifestationFloor(run) {
  const age = run?.player?.age ?? 0;
  const ratio = manifestationRatioForAge(age);
  for (const key of AGE_MANIFESTATION_KEYS) {
    const attribute = run?.player?.attributes?.[key];
    if (!attribute) continue;
    const floor = Math.min(attribute.potential, Math.floor(attribute.potential * ratio));
    if (attribute.manifested < floor) {
      attribute.manifested = floor;
    }
  }
}

function applyStatePatch(run, statePatch) {
  for (const change of statePatch.progressionChanges ?? []) {
    applyProgressionChange(run, change);
  }

  for (const change of statePatch.worldStateChanges ?? []) {
    applyWorldStateChange(run, change);
  }

  for (const change of statePatch.attributeChanges ?? []) {
    applyAttributeChange(run, change);
  }

  for (const change of statePatch.manifestationChanges ?? []) {
    applyManifestationChange(run, change);
  }

  for (const change of statePatch.exposureChanges ?? []) {
    applyExposureChange(run, change);
  }

  for (const change of statePatch.relationshipChanges ?? []) {
    applyRelationshipChange(run, change);
  }

  for (const update of statePatch.importantNPCUpdates ?? []) {
    applyImportantNPCUpdate(run, update);
  }

  for (const change of statePatch.factionChanges ?? []) {
    applyFactionChange(run, change);
  }

  for (const change of statePatch.statusChanges ?? []) {
    applyStatusChange(run, change);
  }

  for (const update of statePatch.memoryUpdates ?? []) {
    run.memory.push({
      type: update.type ?? "event",
      text: update.text ?? "",
    });
  }

  if (typeof statePatch.scoreDelta === "number") {
    run.score = (run.score ?? 0) + statePatch.scoreDelta;
  }
}

function applyWorldStateChange(run, change) {
  if (!change?.target) return;
  const value = change.value ?? change.amount ?? true;

  if (change.target === "storyState") {
    if (change.mergeStrategy === "merge_story_state") {
      const outcome = storyStatePatchToOutcome(value);
      const merged = recordSimulationOutcome(run, outcome);
      run.worldState.storyState = merged.worldState.storyState;
      return;
    }
    run.worldState.storyState = structuredClone(value);
    ensureStoryState(run);
    return;
  }

  if (change.target === "ending") {
    run.ending = structuredClone(value);
    run.worldState.ending = structuredClone(value);
    return;
  }

  if (change.target === "flag" || change.target === "flags") {
    const flags = Array.isArray(value) ? value : [value];
    run.worldState.flags ??= [];
    for (const flag of flags.filter(Boolean)) {
      if (!run.worldState.flags.includes(flag)) {
        run.worldState.flags.push(flag);
      }
    }
    return;
  }

  if (change.target.includes(".")) {
    applyNestedWorldStateChange(run.worldState, change);
    return;
  }

  if (typeof run.worldState[change.target] === "number" && typeof change.amount === "number") {
    run.worldState[change.target] += change.amount;
    return;
  }

  run.worldState[change.target] = structuredClone(value);
}

function storyStatePatchToOutcome(storyState) {
  return {
    factsAdded: storyState?.facts ?? [],
    factsClosed: storyState?.closedFacts ?? [],
    forbiddenRepeats: storyState?.forbiddenRepeats ?? [],
    threadUpdates: storyState?.threads ?? [],
  };
}

function applyRelationshipChange(run, change) {
  const npc = run.importantNPCs.find((item) => item.id === change.npcId);
  if (!npc || !change.dimension) return;

  const current = npc.relationship[change.dimension] ?? 0;
  npc.relationship[change.dimension] = current + (change.amount ?? 0);
}

function applyImportantNPCUpdate(run, update) {
  const npc = findOrCreateImportantNPC(run, update);
  if (!npc) return;

  if (update.memory) {
    npc.memory.push(update.memory);
  }
  if (Array.isArray(update.flags)) {
    npc.flags ??= [];
    for (const flag of update.flags) {
      if (!npc.flags.includes(flag)) npc.flags.push(flag);
    }
  }
  if (update.relationship && typeof update.relationship === "object") {
    npc.relationship ??= {};
    for (const [dimension, value] of Object.entries(update.relationship)) {
      if (typeof value === "number") {
        npc.relationship[dimension] = value;
      }
    }
  }
  if (update.relationshipChanges && typeof update.relationshipChanges === "object") {
    npc.relationship ??= {};
    for (const [dimension, amount] of Object.entries(update.relationshipChanges)) {
      if (typeof amount === "number") {
        npc.relationship[dimension] = (npc.relationship[dimension] ?? 0) + amount;
      }
    }
  }
  if (update.knownIdentity && typeof update.knownIdentity === "object") {
    npc.knownIdentity = { ...(npc.knownIdentity ?? {}), ...structuredClone(update.knownIdentity) };
  }
  if (update.hiddenInfo && typeof update.hiddenInfo === "object") {
    npc.hiddenInfo = { ...(npc.hiddenInfo ?? {}), ...structuredClone(update.hiddenInfo) };
  }
  for (const key of ["role", "importance", "visibleNameKey", "stance"]) {
    if (typeof update[key] === "string") {
      npc[key] = update[key];
    }
  }
}

function applyProgressionChange(run, change) {
  if (!change?.target) return;
  const current = run.worldState.progress[change.target] ?? 0;
  if (typeof current === "number") {
    run.worldState.progress[change.target] = current + (change.amount ?? 0);
  } else {
    run.worldState.progress[change.target] = change.value ?? current;
  }
}

function applyAttributeChange(run, change) {
  if (!change?.target || !run.player.attributes[change.target]) return;

  const attribute = run.player.attributes[change.target];
  const amount = change.amount ?? 0;
  const sourceLayer = change.sourceLayer ?? "growthBonus";

  if (typeof attribute[sourceLayer] === "number") {
    attribute[sourceLayer] += amount;
  }

  if (change.applyToPotential !== false) {
    attribute.potential = Math.max(0, attribute.potential + amount);
  }
  if (change.applyToManifested !== false) {
    attribute.manifested = clampManifested(attribute, attribute.manifested + amount);
  }
}

function applyManifestationChange(run, change) {
  if (!change?.target || !run.player.attributes[change.target]) return;

  const attribute = run.player.attributes[change.target];
  const nextValue = typeof change.value === "number" ? change.value : attribute.manifested + (change.amount ?? 0);
  attribute.manifested = clampManifested(attribute, nextValue, change.clampToPotential !== false);
}

function applyExposureChange(run, change) {
  if (!change?.target) return;

  if (run.player.attributes[change.target]) {
    const attribute = run.player.attributes[change.target];
    const nextValue = typeof change.value === "number" ? change.value : attribute.exposure + (change.amount ?? 0);
    attribute.exposure = Math.max(0, Math.floor(nextValue));
    return;
  }

  run.exposure ??= {};
  const current = run.exposure[change.target] ?? 0;
  const nextValue = typeof change.value === "number" ? change.value : current + (change.amount ?? 0);
  run.exposure[change.target] = Math.max(0, Math.floor(nextValue));
}

function applyFactionChange(run, change) {
  const factionId = change?.factionId ?? change?.id ?? change?.target;
  if (!factionId) return;

  if (change.action === "remove" || change.action === "leave") {
    run.factions = run.factions.filter((faction) => faction.id !== factionId);
    return;
  }

  let faction = run.factions.find((item) => item.id === factionId);
  if (!faction) {
    faction = {
      id: factionId,
      name: change.name ?? factionId,
      type: change.type ?? "unknown",
      relationship: {},
      progress: {},
      flags: [],
      memory: [],
    };
    run.factions.push(faction);
  }

  for (const key of ["name", "type", "playerRole", "membership", "stance"]) {
    if (change[key] !== undefined) {
      faction[key] = structuredClone(change[key]);
    }
  }
  if (change.fields && typeof change.fields === "object") {
    Object.assign(faction, structuredClone(change.fields));
  }
  if (change.relationship && typeof change.relationship === "object") {
    faction.relationship = { ...(faction.relationship ?? {}), ...structuredClone(change.relationship) };
  }
  if (change.relationshipChanges && typeof change.relationshipChanges === "object") {
    faction.relationship ??= {};
    for (const [dimension, amount] of Object.entries(change.relationshipChanges)) {
      if (typeof amount === "number") {
        faction.relationship[dimension] = (faction.relationship[dimension] ?? 0) + amount;
      }
    }
  }
  if (change.progress && typeof change.progress === "object") {
    faction.progress = { ...(faction.progress ?? {}), ...structuredClone(change.progress) };
  }
  if (change.progressChanges && typeof change.progressChanges === "object") {
    faction.progress ??= {};
    for (const [dimension, amount] of Object.entries(change.progressChanges)) {
      if (typeof amount === "number") {
        faction.progress[dimension] = (faction.progress[dimension] ?? 0) + amount;
      }
    }
  }
  if (Array.isArray(change.flags)) {
    faction.flags ??= [];
    for (const flag of change.flags) {
      if (!faction.flags.includes(flag)) faction.flags.push(flag);
    }
  }
  if (change.memory) {
    faction.memory ??= [];
    faction.memory.push(structuredClone(change.memory));
  }
}

function applyStatusChange(run, change) {
  const target = change?.target ?? "player";
  const list = statusListForTarget(run, target);
  if (!list) return;

  const statusId = change.statusId ?? change.id;
  if (change.action === "clear") {
    list.length = 0;
    return;
  }
  if (!statusId) return;
  if (change.action === "remove") {
    const index = list.findIndex((status) => status.id === statusId);
    if (index >= 0) list.splice(index, 1);
    return;
  }

  let status = list.find((item) => item.id === statusId);
  if (!status) {
    status = {
      id: statusId,
      label: change.label ?? statusId,
      source: change.source ?? "state_patch",
      duration: change.duration ?? "unknown",
      stacks: 0,
    };
    list.push(status);
  }

  for (const key of ["label", "source", "duration", "recoveryCondition", "severity"]) {
    if (change[key] !== undefined) {
      status[key] = structuredClone(change[key]);
    }
  }
  if (typeof change.stacks === "number") {
    status.stacks = change.stacks;
  }
  if (typeof change.stackDelta === "number") {
    status.stacks = (status.stacks ?? 0) + change.stackDelta;
  }
  if (change.effects && typeof change.effects === "object") {
    status.effects = { ...(status.effects ?? {}), ...structuredClone(change.effects) };
  }
  if (change.memory) {
    status.memory ??= [];
    status.memory.push(structuredClone(change.memory));
  }
}

function findOrCreateImportantNPC(run, update) {
  const npcId = update.npcId ?? update.id;
  if (!npcId) return undefined;

  let npc = run.importantNPCs.find((item) => item.id === npcId);
  if (npc || update.create !== true) return npc;

  npc = {
    id: npcId,
    templateId: update.templateId ?? "dynamic",
    role: update.role ?? "dynamic",
    roleTags: update.roleTags ?? [],
    possibleRoles: update.possibleRoles ?? [update.role ?? "dynamic"],
    importance: update.importance ?? "important",
    visibleNameKey: update.visibleNameKey ?? npcId,
    knownIdentity: update.knownIdentity ?? {
      role: buildPlayerVisibleNpcIdentity({
        templateId: update.templateId ?? "dynamic",
        role: update.role ?? "dynamic",
        roleTags: update.roleTags ?? [],
      }).label,
      certainty: "surface_only",
    },
    playerVisible: update.playerVisible ?? buildPlayerVisibleNpcIdentity({
      templateId: update.templateId ?? "dynamic",
      role: update.role ?? "dynamic",
      roleTags: update.roleTags ?? [],
    }),
    hiddenInfo: update.hiddenInfo ?? {
      trueTemplateId: update.templateId ?? "dynamic",
      trueRole: update.role ?? "dynamic",
      source: "dynamic_generation",
    },
    relationship: update.relationship ?? {
      affinity: 0,
      trust: 0,
      fear: 0,
      interestBinding: 0,
      secretLeverage: 0,
    },
    memory: [],
    flags: [],
    statuses: [],
  };
  run.importantNPCs.push(npc);
  return npc;
}

function statusListForTarget(run, target) {
  if (target === "player") {
    run.statuses ??= [];
    return run.statuses;
  }

  const npc = run.importantNPCs.find((item) => item.id === target);
  if (!npc) return undefined;
  npc.statuses ??= [];
  return npc.statuses;
}

function applyNestedWorldStateChange(worldState, change) {
  const keys = change.target.split(".").filter(Boolean);
  if (keys.length === 0) return;

  let cursor = worldState;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== "object" || Array.isArray(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  const finalKey = keys.at(-1);
  if (typeof cursor[finalKey] === "number" && typeof change.amount === "number") {
    cursor[finalKey] += change.amount;
    return;
  }
  cursor[finalKey] = structuredClone(change.value ?? change.amount ?? true);
}

function clampManifested(attribute, value, clampToPotential = true) {
  const floored = Math.max(0, Math.floor(value));
  if (!clampToPotential) return floored;
  return Math.min(attribute.potential, floored);
}
