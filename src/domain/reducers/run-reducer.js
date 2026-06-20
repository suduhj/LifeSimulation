import {
  applyAttributeLayerDelta,
  applyExposureDelta,
  applyGrowthEvidence,
  applyRealizedDelta,
  ensureGrowthLedger,
  recalculateGrowthLedgerForRun,
  setExposureValue,
  setRealizedValue,
} from "../../growth-ledger.js";
import { ensureStoryState, recordSimulationOutcome } from "../../story-state.js";
import { buildPlayerVisibleNpcIdentity } from "../../localization.js";
import { applyPlayerSurfaceRecorded, applyPlayerSurfaceRejected } from "../../player-surface-store.js";

export function reduceRunEvent(run, event) {
  if (event.type === "run.created") {
    const snapshot = structuredClone(event.payload?.run);
    if (!snapshot) throw new Error("run.created requires payload.run");
    return snapshot;
  }

  const nextRun = structuredClone(run);
  switch (event.type) {
    case "age.advanced":
      nextRun.player.age = event.payload.ageEnd;
      nextRun.player.lifeStage = event.payload.lifeStage;
      break;
    case "growth.evidence_added":
      applyGrowthEvidence(nextRun, [event.payload]);
      break;
    case "growth.attribute_layer_changed":
      applyAttributeChange(nextRun, event.payload);
      break;
    case "growth.exposure_changed":
      applyExposureChange(nextRun, event.payload);
      break;
    case "opening.origin_recorded":
      applyStoryOutcome(nextRun, { originLedger: event.payload });
      break;
    case "player.talent_added":
      applyPlayerTalentAdded(nextRun, event.payload);
      break;
    case "world.progress_changed":
      applyProgressionChange(nextRun, event.payload);
      break;
    case "world.flag_added":
      addWorldFlag(nextRun, event.payload.flag);
      break;
    case "world.state_changed":
      applyWorldStateChange(nextRun, event.payload);
      break;
    case "ending.reached":
      nextRun.ending = structuredClone(event.payload.value);
      nextRun.worldState.ending = structuredClone(event.payload.value);
      break;
    case "story.fact_added":
      applyStoryOutcome(nextRun, { factsAdded: [event.payload.fact] });
      break;
    case "story.fact_closed":
      applyStoryOutcome(nextRun, { factsClosed: [event.payload.fact], forbiddenRepeats: [event.payload.fact] });
      break;
    case "story.thread_updated":
      applyStoryOutcome(nextRun, { threadUpdates: [event.payload] });
      break;
    case "story.axis_updated":
      applyStoryOutcome(nextRun, { axisUpdates: [event.payload] });
      break;
    case "story.event_shape_recorded":
      applyStoryOutcome(nextRun, {
        forbiddenRepeats: event.payload.forbiddenRepeat ? [event.payload.forbiddenRepeat] : [],
        recentEventShapes: event.payload.shape ? [event.payload.shape] : [],
      });
      break;
    case "story.asset_spotlight_recorded":
      applyStoryOutcome(nextRun, { assetSpotlights: [event.payload] });
      break;
    case "story.experience_recorded":
      applyStoryOutcome(nextRun, { experienceUpdates: [event.payload] });
      break;
    case "story.curriculum_recorded":
      applyStoryOutcome(nextRun, { curriculumUpdates: [event.payload] });
      break;
    case "story.topic_recorded":
      applyStoryOutcome(nextRun, { topicUpdates: [event.payload] });
      break;
    case "story.annual_agenda_recorded":
      applyStoryOutcome(nextRun, { annualAgendas: [event.payload] });
      break;
    case "annual.outcome_recorded":
      applyStoryOutcome(nextRun, { yearlyOutcomes: [event.payload] });
      break;
    case "life.node_recorded":
      applyStoryOutcome(nextRun, { lifeNodes: [event.payload] });
      break;
    case "player_surface.view_recorded":
      applyPlayerSurfaceRecorded(nextRun, event.payload);
      break;
    case "player_surface.rejected":
      applyPlayerSurfaceRejected(nextRun, event.payload);
      break;
    case "npc.relationship_changed":
      applyRelationshipChange(nextRun, event.payload);
      break;
    case "npc.visibility_changed":
      applyImportantNPCUpdate(nextRun, event.payload);
      break;
    case "faction.changed":
      applyFactionChange(nextRun, event.payload);
      break;
    case "status.changed":
      applyStatusChange(nextRun, event.payload);
      break;
    case "memory.added":
      nextRun.memory.push({
        type: event.payload.type ?? "event",
        text: event.payload.text ?? "",
      });
      break;
    case "score.changed":
      nextRun.score = (nextRun.score ?? 0) + (event.payload.amount ?? 0);
      break;
    case "run.event_recorded":
      nextRun.eventHistory.push(structuredClone(event.payload.response));
      break;
    default:
      break;
  }
  recalculateGrowthLedgerForRun(nextRun);
  return nextRun;
}

function applyPlayerTalentAdded(run, payload) {
  if (!payload?.id) return;
  if (!run.player.talents.some((talent) => talent.id === payload.id)) {
    run.player.talents.push({
      id: payload.id,
      rarity: payload.rarity,
      manifestationType: payload.manifestationType,
      tags: payload.tags ?? [],
      testOnly: payload.testOnly,
      visibility: payload.visibility,
      effects: payload.effects,
      exposure: payload.exposure,
    });
  }
}

export function reduceRunEvents(events = []) {
  let run;
  for (const event of events) {
    run = reduceRunEvent(run, event);
  }
  return run;
}

function applyStoryOutcome(run, outcome) {
  const merged = recordSimulationOutcome(run, outcome);
  run.worldState = merged.worldState;
}

function applyProgressionChange(run, change) {
  if (!change?.target) return;
  run.worldState.progress ??= {};
  const current = run.worldState.progress[change.target] ?? 0;
  if (typeof current === "number") {
    run.worldState.progress[change.target] = current + (change.amount ?? 0);
  } else {
    run.worldState.progress[change.target] = change.value ?? current;
  }
}

function applyAttributeChange(run, change) {
  if (!change?.target || !run.player.attributes[change.target]) return;
  const amount = change.amount ?? 0;
  const sourceLayer = change.sourceLayer ?? "growthBonus";
  if (change.applyToPotential !== false) {
    applyAttributeLayerDelta(run, change.target, sourceLayer, amount);
  }
  if (change.applyToManifested !== false) {
    applyRealizedDelta(run, change.target, amount);
  }
}

function applyExposureChange(run, change) {
  if (!change?.target) return;
  if (run.player.attributes[change.target]) {
    if (typeof change.value === "number") {
      setExposureValue(run, change.target, change.value);
    } else {
      applyExposureDelta(run, change.target, change.amount ?? 0);
    }
    return;
  }
  run.exposure ??= {};
  const current = run.exposure[change.target] ?? 0;
  const nextValue = typeof change.value === "number" ? change.value : current + (change.amount ?? 0);
  run.exposure[change.target] = Math.max(0, Math.floor(nextValue));
}

function applyManifestationChange(run, change) {
  if (!change?.target || !run.player.attributes[change.target]) return;
  const attribute = run.player.attributes[change.target];
  const nextValue = typeof change.value === "number" ? change.value : attribute.manifested + (change.amount ?? 0);
  if (typeof change.value === "number") {
    setRealizedValue(run, change.target, nextValue);
  } else {
    applyRealizedDelta(run, change.target, change.amount ?? 0);
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
    recentEventShapes: storyState?.recentEventShapes ?? [],
    originLedger: storyState?.originLedger,
    assetSpotlights: storyState?.assetLedger?.recentSpotlights ?? [],
    experienceUpdates: storyState?.experience?.recentIntents ?? [],
    threadUpdates: storyState?.threads ?? [],
    curriculumUpdates: storyState?.curriculum?.recentSlots ?? [],
    topicUpdates: storyState?.topicLedger?.recentTopics ?? [],
    annualAgendas: storyState?.annualAgendas ?? [],
    yearlyOutcomes: storyState?.yearlyOutcomes ?? [],
    lifeNodes: storyState?.lifeNodes ?? [],
  };
}

function addWorldFlag(run, flag) {
  if (!flag) return;
  run.worldState.flags ??= [];
  if (!run.worldState.flags.includes(flag)) run.worldState.flags.push(flag);
}

function applyRelationshipChange(run, change) {
  const npc = run.importantNPCs.find((item) => item.id === change.npcId);
  if (!npc || !change.dimension) return;
  npc.relationship[change.dimension] = (npc.relationship[change.dimension] ?? 0) + (change.amount ?? 0);
}

function applyImportantNPCUpdate(run, update) {
  const npc = findOrCreateImportantNPC(run, update);
  if (!npc) return;
  if (update.memory) npc.memory.push(update.memory);
  if (Array.isArray(update.flags)) {
    npc.flags ??= [];
    for (const flag of update.flags) {
      if (!npc.flags.includes(flag)) npc.flags.push(flag);
    }
  }
  if (update.relationship && typeof update.relationship === "object") {
    npc.relationship = { ...(npc.relationship ?? {}), ...structuredClone(update.relationship) };
  }
  if (update.relationshipChanges && typeof update.relationshipChanges === "object") {
    npc.relationship ??= {};
    for (const [dimension, amount] of Object.entries(update.relationshipChanges)) {
      if (typeof amount === "number") npc.relationship[dimension] = (npc.relationship[dimension] ?? 0) + amount;
    }
  }
  if (update.knownIdentity && typeof update.knownIdentity === "object") {
    npc.knownIdentity = { ...(npc.knownIdentity ?? {}), ...structuredClone(update.knownIdentity) };
  }
  if (update.hiddenInfo && typeof update.hiddenInfo === "object") {
    npc.hiddenInfo = { ...(npc.hiddenInfo ?? {}), ...structuredClone(update.hiddenInfo) };
  }
  for (const key of ["role", "importance", "visibleNameKey", "stance"]) {
    if (typeof update[key] === "string") npc[key] = update[key];
  }
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
    faction = { id: factionId, name: change.name ?? factionId, type: change.type ?? "unknown", relationship: {}, progress: {}, flags: [], memory: [] };
    run.factions.push(faction);
  }
  Object.assign(faction, structuredClone(change.fields ?? {}));
  for (const key of ["name", "type", "playerRole", "membership", "stance"]) {
    if (change[key] !== undefined) faction[key] = structuredClone(change[key]);
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
  const npc = target === "player" ? undefined : run.importantNPCs.find((item) => item.id === target);
  if (npc) npc.statuses ??= [];
  const list = target === "player" ? run.statuses : npc?.statuses;
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
    status = { id: statusId, label: change.label ?? statusId, source: change.source ?? "state_patch", duration: change.duration ?? "unknown", stacks: 0 };
    list.push(status);
  }
  for (const key of ["label", "source", "duration", "recoveryCondition", "severity"]) {
    if (change[key] !== undefined) status[key] = structuredClone(change[key]);
  }
  if (typeof change.stacks === "number") status.stacks = change.stacks;
  if (typeof change.stackDelta === "number") status.stacks = (status.stacks ?? 0) + change.stackDelta;
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
    hiddenInfo: update.hiddenInfo ?? { trueTemplateId: update.templateId ?? "dynamic", trueRole: update.role ?? "dynamic", source: "dynamic_generation" },
    relationship: update.relationship ?? { affinity: 0, trust: 0, fear: 0, interestBinding: 0, secretLeverage: 0 },
    memory: [],
    flags: [],
    statuses: [],
  };
  run.importantNPCs.push(npc);
  return npc;
}

function applyNestedWorldStateChange(worldState, change) {
  const keys = change.target.split(".").filter(Boolean);
  if (keys.length === 0) return;
  let cursor = worldState;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== "object" || Array.isArray(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  }
  const finalKey = keys.at(-1);
  if (typeof cursor[finalKey] === "number" && typeof change.amount === "number") {
    cursor[finalKey] += change.amount;
    return;
  }
  cursor[finalKey] = structuredClone(change.value ?? change.amount ?? true);
}
