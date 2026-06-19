import { createDefaultCurriculumState, normalizeCurriculumState, recordCurriculumSlot } from "./life-curriculum.js";
import { normalizeOpeningOriginLedger } from "./opening-origin-ledger.js";
import { createDefaultExperienceState, normalizeExperienceState, recordExperienceIntent } from "./player-experience-director.js";
import { createDefaultAssetLedger, normalizeAssetLedger, recordAssetSpotlight } from "./story-asset-lifecycle.js";
import { createDefaultTopicLedger, normalizeTopicLedger, recordTopicProfile } from "./topic-ledger.js";

export const STORY_STATE_SCHEMA_VERSION = "mvp.story_state.v1";

export const STORY_AXIS_IDS = [
  "lifePressure",
  "talentManifestation",
  "npcRelationship",
  "worldOpportunity",
  "choiceConsequence",
];

const DEFAULT_AXIS_LEVELS = {
  lifePressure: 2,
  talentManifestation: 1,
  npcRelationship: 2,
  worldOpportunity: 2,
  choiceConsequence: 0,
};

export function createEmptyStoryState() {
  return {
    schemaVersion: STORY_STATE_SCHEMA_VERSION,
    axes: createDefaultAxes(),
    threads: [],
    facts: [],
    closedFacts: [],
    forbiddenRepeats: [],
    activePressures: [],
    recentEventShapes: [],
    originLedger: normalizeOpeningOriginLedger(),
    assetLedger: createDefaultAssetLedger(),
    experience: createDefaultExperienceState(),
    curriculum: createDefaultCurriculumState(),
    topicLedger: createDefaultTopicLedger(),
    annualAgendas: [],
    yearlyOutcomes: [],
    lifeNodes: [],
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
  current.axes = normalizeAxes(current.axes);
  current.recentEventShapes = Array.isArray(current.recentEventShapes) ? current.recentEventShapes : [];
  current.originLedger = normalizeOpeningOriginLedger(current.originLedger);
  current.assetLedger = normalizeAssetLedger(current.assetLedger);
  current.experience = normalizeExperienceState(current.experience);
  current.curriculum = normalizeCurriculumState(current.curriculum);
  current.topicLedger = normalizeTopicLedger(current.topicLedger);
  current.annualAgendas = normalizeAnnualAgendas(current.annualAgendas);
  current.yearlyOutcomes = normalizeYearlyOutcomes(current.yearlyOutcomes);
  current.lifeNodes = normalizeLifeNodes(current.lifeNodes);
  return current;
}

export function recordSimulationOutcome(run, outcome = {}) {
  const nextRun = structuredClone(run);
  const storyState = ensureStoryState(nextRun);
  addUnique(storyState.facts, outcome.factsAdded ?? []);
  addUnique(storyState.closedFacts, outcome.factsClosed ?? []);
  addUnique(storyState.forbiddenRepeats, outcome.forbiddenRepeats ?? []);
  applyAxisUpdates(storyState, outcome.axisUpdates ?? [], nextRun.player?.age ?? 0);
  addRecentEventShapes(storyState, outcome.recentEventShapes ?? []);
  applyOpeningOriginLedger(storyState, outcome.originLedger);
  applyAssetSpotlights(storyState, outcome.assetSpotlights ?? []);
  applyExperienceUpdates(storyState, outcome.experienceUpdates ?? []);
  applyCurriculumUpdates(storyState, outcome.curriculumUpdates ?? []);
  applyTopicUpdates(storyState, outcome.topicUpdates ?? []);
  addAnnualAgendas(storyState, outcome.annualAgendas ?? []);
  addYearlyOutcomes(storyState, outcome.yearlyOutcomes ?? []);
  addLifeNodes(storyState, outcome.lifeNodes ?? []);

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
  applyAxisUpdates(storyState, outcome.axisUpdates ?? [], age);
  addRecentEventShapes(storyState, outcome.recentEventShapes ?? []);
  applyOpeningOriginLedger(storyState, outcome.originLedger);
  applyAssetSpotlights(storyState, outcome.assetSpotlights ?? []);
  applyExperienceUpdates(storyState, outcome.experienceUpdates ?? []);
  applyCurriculumUpdates(storyState, outcome.curriculumUpdates ?? []);
  applyTopicUpdates(storyState, outcome.topicUpdates ?? []);
  addAnnualAgendas(storyState, outcome.annualAgendas ?? []);
  addYearlyOutcomes(storyState, outcome.yearlyOutcomes ?? []);
  addLifeNodes(storyState, outcome.lifeNodes ?? []);
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

export function applyCurriculumUpdates(storyState, updates = []) {
  storyState.curriculum = normalizeCurriculumState(storyState.curriculum);
  for (const update of updates ?? []) {
    storyState.curriculum = recordCurriculumSlot(storyState.curriculum, update);
  }
}

export function applyTopicUpdates(storyState, updates = []) {
  storyState.topicLedger = normalizeTopicLedger(storyState.topicLedger);
  for (const update of updates ?? []) {
    storyState.topicLedger = recordTopicProfile(storyState.topicLedger, update);
  }
}

export function addAnnualAgendas(storyState, agendas = []) {
  const current = normalizeAnnualAgendas(storyState.annualAgendas);
  for (const agenda of agendas ?? []) {
    const normalized = normalizeAnnualAgenda(agenda);
    if (!normalized) continue;
    const existing = current.find((item) => item.age === normalized.age && item.curriculumSlot === normalized.curriculumSlot);
    if (existing) Object.assign(existing, normalized);
    else current.push(normalized);
  }
  storyState.annualAgendas = current.slice(-12);
}

export function applyOpeningOriginLedger(storyState, ledger) {
  if (!ledger) return;
  storyState.originLedger = normalizeOpeningOriginLedger(ledger);
}

export function applyAssetSpotlights(storyState, spotlights = []) {
  storyState.assetLedger = normalizeAssetLedger(storyState.assetLedger);
  for (const spotlight of spotlights ?? []) {
    storyState.assetLedger = recordAssetSpotlight(storyState.assetLedger, spotlight);
  }
}

export function applyExperienceUpdates(storyState, updates = []) {
  storyState.experience = normalizeExperienceState(storyState.experience);
  for (const update of updates ?? []) {
    storyState.experience = recordExperienceIntent(storyState.experience, update);
  }
}

export function addYearlyOutcomes(storyState, outcomes = []) {
  const current = normalizeYearlyOutcomes(storyState.yearlyOutcomes);
  for (const outcome of outcomes ?? []) {
    const normalized = normalizeYearlyOutcome(outcome);
    if (!normalized) continue;
    const existing = current.find((item) => item.outcomeId === normalized.outcomeId);
    if (existing) Object.assign(existing, normalized);
    else current.push(normalized);
  }
  storyState.yearlyOutcomes = current.slice(-24);
}

export function addLifeNodes(storyState, lifeNodes = []) {
  const current = normalizeLifeNodes(storyState.lifeNodes);
  for (const node of lifeNodes ?? []) {
    const normalized = normalizeLifeNode(node);
    if (!normalized) continue;
    const existing = current.find((item) => item.nodeId === normalized.nodeId);
    if (existing) Object.assign(existing, normalized);
    else current.push(normalized);
  }
  storyState.lifeNodes = current.slice(-80);
}

export function createDefaultAxes() {
  return Object.fromEntries(STORY_AXIS_IDS.map((axisId) => [axisId, createAxisState(axisId)]));
}

export function normalizeAxes(axes) {
  const normalized = createDefaultAxes();
  if (!axes || typeof axes !== "object" || Array.isArray(axes)) return normalized;
  for (const axisId of STORY_AXIS_IDS) {
    const current = axes[axisId];
    if (!current || typeof current !== "object" || Array.isArray(current)) continue;
    normalized[axisId] = {
      ...normalized[axisId],
      level: clampAxisLevel(current.level ?? normalized[axisId].level),
      recentDeltas: Array.isArray(current.recentDeltas) ? current.recentDeltas.slice(-8) : [],
      cooldown: Math.max(0, Math.floor(Number(current.cooldown) || 0)),
      lastFeaturedAge: Number.isFinite(current.lastFeaturedAge) ? current.lastFeaturedAge : null,
    };
  }
  return normalized;
}

export function applyAxisUpdates(storyState, updates = [], age = 0) {
  storyState.axes = normalizeAxes(storyState.axes);
  for (const update of updates ?? []) {
    const axisId = update?.axisId;
    if (!STORY_AXIS_IDS.includes(axisId)) continue;
    const axis = storyState.axes[axisId];
    const amount = Number.isFinite(update.amount) ? update.amount : 0;
    axis.level = clampAxisLevel(axis.level + amount);
    if (Number.isFinite(update.cooldown)) axis.cooldown = Math.max(0, Math.floor(update.cooldown));
    if (update.markFeatured) axis.lastFeaturedAge = Number.isFinite(update.age) ? update.age : age;
    axis.recentDeltas.push({
      age: Number.isFinite(update.age) ? update.age : age,
      amount,
      reason: update.reason ?? "",
      source: update.source ?? "simulation_kernel",
      eventShape: update.eventShape ?? "",
    });
    axis.recentDeltas = axis.recentDeltas.slice(-8);
  }
}

export function selectStoryAxes(storyState, { preferredAxis, age = 0, seed = 1 } = {}) {
  const axes = normalizeAxes(storyState?.axes);
  const overridePrimaryAxis = highPressureChoiceConsequence(axes) ? "choiceConsequence" : "";
  const ranked = STORY_AXIS_IDS
    .map((axisId, index) => {
      const axis = axes[axisId];
      const cooldownPenalty = (axis.cooldown ?? 0) * 3;
      const recencyBonus = axis.lastFeaturedAge === null ? 2 : Math.min(4, Math.max(0, age - axis.lastFeaturedAge));
      const preferredBonus = axisId === preferredAxis ? 2 : 0;
      const deterministicNoise = ((Number(seed) || 0) + index) % 3;
      return {
        axisId,
        score: axis.level + recencyBonus + preferredBonus + deterministicNoise - cooldownPenalty,
      };
    })
    .sort((a, b) => b.score - a.score || STORY_AXIS_IDS.indexOf(a.axisId) - STORY_AXIS_IDS.indexOf(b.axisId));
  const primaryAxis = overridePrimaryAxis || ranked[0]?.axisId || "lifePressure";
  const secondaryAxis = ranked.find((item) => item.axisId !== primaryAxis)?.axisId ?? "worldOpportunity";
  return { primaryAxis, secondaryAxis, rankedAxes: ranked, axisSnapshot: axes };
}

export function axisUpdatesForFeaturedAxes({ primaryAxis, secondaryAxis, age, eventShape } = {}) {
  return [
    {
      axisId: primaryAxis,
      amount: -1,
      reason: "axis_featured_as_primary",
      source: "annual_primary_axis",
      cooldown: 1,
      markFeatured: true,
      age,
      eventShape,
    },
    {
      axisId: secondaryAxis,
      amount: 0,
      reason: "axis_featured_as_secondary",
      source: "annual_secondary_axis",
      markFeatured: true,
      age,
      eventShape,
    },
  ].filter((update) => update.axisId);
}

function addUnique(target, values) {
  for (const value of values ?? []) {
    if (value && !target.includes(value)) target.push(value);
  }
}

function createAxisState(axisId) {
  return {
    level: DEFAULT_AXIS_LEVELS[axisId] ?? 0,
    recentDeltas: [],
    cooldown: 0,
    lastFeaturedAge: null,
  };
}

function clampAxisLevel(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(10, Math.round(numeric)));
}

function highPressureChoiceConsequence(axes) {
  const choiceLevel = axes.choiceConsequence?.level ?? 0;
  return choiceLevel >= 4;
}

function addRecentEventShapes(storyState, shapes = []) {
  const next = [
    ...(Array.isArray(storyState.recentEventShapes) ? storyState.recentEventShapes : []),
    ...shapes.filter(Boolean),
  ];
  storyState.recentEventShapes = next.slice(-8);
}

function upsertPressure(pressures, pressure) {
  const existing = pressures.find((item) => item.threadId === pressure.threadId && item.pressureId === pressure.pressureId);
  if (existing) Object.assign(existing, pressure);
  else pressures.push(pressure);
}

function normalizeAnnualAgendas(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeAnnualAgenda).filter(Boolean).slice(-12);
}

function normalizeAnnualAgenda(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const curriculumSlot = typeof value.curriculumSlot === "string" ? value.curriculumSlot : "";
  if (!curriculumSlot) return undefined;
  return {
    age: Number.isFinite(value.age) ? Math.floor(value.age) : 0,
    lifeStage: typeof value.lifeStage === "string" ? value.lifeStage : "",
    curriculumSlot,
    requiredHumanDelta: typeof value.requiredHumanDelta === "string" ? value.requiredHumanDelta : "",
    primaryDeltaShape: typeof value.primaryDeltaShape === "string" ? value.primaryDeltaShape : "",
    primaryAxis: typeof value.primaryAxis === "string" ? value.primaryAxis : "",
    secondaryAxis: typeof value.secondaryAxis === "string" ? value.secondaryAxis : "",
    topicFamily: typeof value.topicFamily === "string" ? value.topicFamily : "",
    arena: typeof value.arena === "string" ? value.arena : "",
  };
}

function normalizeYearlyOutcomes(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeYearlyOutcome).filter(Boolean).slice(-24);
}

function normalizeLifeNodes(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeLifeNode).filter(Boolean).slice(-80);
}

function normalizeLifeNode(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const nodeId = typeof value.nodeId === "string" && value.nodeId.trim() ? value.nodeId : "";
  if (!nodeId) return undefined;
  const age = Number.isFinite(value.age) ? Math.floor(value.age) : 0;
  return {
    schemaVersion: typeof value.schemaVersion === "string" ? value.schemaVersion : "mvp.life_node.v1",
    nodeId,
    age,
    nodeType: typeof value.nodeType === "string" ? value.nodeType : "annual_event",
    sourceEventIds: Array.isArray(value.sourceEventIds) ? [...value.sourceEventIds] : [],
    visibleContract: structuredClone(value.visibleContract ?? {}),
    attributeReality: structuredClone(value.attributeReality ?? {}),
    originReality: structuredClone(value.originReality ?? {}),
    storyAssetBudgets: structuredClone(value.storyAssetBudgets ?? {}),
    paragraphs: Array.isArray(value.paragraphs)
      ? value.paragraphs.map((paragraph) => String(paragraph ?? "").trim()).filter(Boolean)
      : [],
    choices: Array.isArray(value.choices) ? structuredClone(value.choices) : [],
    visibleChanges: Array.isArray(value.visibleChanges) ? structuredClone(value.visibleChanges) : [],
  };
}

function normalizeYearlyOutcome(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const age = Number.isFinite(value.age) ? Math.floor(value.age) : 0;
  const slot = typeof value.curriculum?.slot === "string"
    ? value.curriculum.slot
    : typeof value.curriculumSlot === "string"
      ? value.curriculumSlot
      : "";
  const outcomeId = typeof value.outcomeId === "string" && value.outcomeId
    ? value.outcomeId
    : `year_${age}_${slot || "annual"}`;
  return {
    schemaVersion: typeof value.schemaVersion === "string" ? value.schemaVersion : "mvp.yearly_outcome.v1",
    outcomeId,
    age,
    curriculum: structuredClone(value.curriculum ?? { slot, requiredHumanDelta: "" }),
    humanOutcome: structuredClone(value.humanOutcome ?? {}),
    growthImpact: structuredClone(value.growthImpact ?? { realizedGrowth: [], exposureGrowth: [], potentialGrowth: [] }),
    topicImpact: structuredClone(value.topicImpact ?? {}),
    panelImpact: structuredClone(value.panelImpact ?? {}),
  };
}
