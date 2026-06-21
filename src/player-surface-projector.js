import crypto from "node:crypto";

import { buildPanelViews } from "./selectors/index.js";
import {
  PLAYER_VIEW_SCHEMA_VERSION,
  validatePlayerSurface,
} from "./player-surface-validator.js";

export function projectPlayerSurface({ run } = {}) {
  const previous = run?.worldState?.playerSurface?.currentView;
  const view = buildPlayerViewSnapshot(run);
  const validation = validatePlayerSurface(view);
  if (!validation.ok) {
    return {
      accepted: false,
      view: previous,
      rejection: {
        schemaVersion: "mvp.player_surface_rejection.v1",
        reason: "player_surface_validation_failed",
        errors: validation.errors,
        attemptedViewId: view?.viewId,
      },
    };
  }
  return { accepted: true, view, rejection: undefined };
}

export function buildPlayerViewSnapshot(run) {
  const panelViews = buildPanelViews(run);
  const projectedTimeline = buildTimeline(panelViews);
  const projectedCurrentScene = currentSceneFromOpeningPreview(run) ?? projectedTimeline.at(-1) ?? emptyScene(run);
  const currentNodeId = projectedCurrentScene.rawNodeId ?? "";
  const timeline = projectedTimeline.map(publicTimelineEntry);
  const currentScene = publicTimelineEntry(projectedCurrentScene);
  const choices = choicesForCurrentNode(run, currentNodeId);
  const visibleChanges = visibleChangesForCurrentNode(run, currentNodeId);
  const header = buildHeader({ run, panelViews });
  const sourceLifeNodeIds = timeline.map((entry) => entry.nodeId).filter(Boolean);
  const sourceEventIds = sourceEventIdsForLifeNodes(run);
  const base = {
    schemaVersion: PLAYER_VIEW_SCHEMA_VERSION,
    viewId: viewIdFor({ run, currentScene }),
    sourceLifeNodeIds,
    sourceEventIds,
    header,
    currentScene,
    timeline,
    choices,
    panels: {
      main: panelViews.main ?? {},
      attributes: panelViews.attributes ?? {},
      story: {
        timeline,
        visibleFacts: Array.isArray(panelViews.story?.visibleFacts)
          ? structuredClone(panelViews.story.visibleFacts)
          : [],
      },
    },
    visibleChanges,
    generatedAtTurn: run?.eventLog?.events?.length ?? run?.eventHistory?.length ?? 0,
  };
  return {
    ...base,
    safetyHash: safetyHash(base),
  };
}

function currentSceneFromOpeningPreview(run) {
  const openingNode = (run?.worldState?.storyState?.lifeNodes ?? []).findLast((node) => node?.nodeType === "opening_year");
  const latestNode = (run?.worldState?.storyState?.lifeNodes ?? []).at(-1);
  if (!openingNode || latestNode?.nodeType !== "opening_year") return undefined;
  const body = String(run?.eventHistory?.findLast((event) => event?.event?.sourceType === "opening_sequence")?.playerText?.body ?? "").trim();
  if (!body) return undefined;
  return {
    age: safeAge(run),
    nodeType: "opening_year",
    rawNodeId: openingNode.nodeId,
    nodeId: publicNodeId(openingNode.nodeId, openingNode),
    body,
    changes: [],
  };
}

function buildHeader({ run, panelViews }) {
  const main = panelViews?.main ?? {};
  const name = main.character?.name ?? run?.player?.name ?? "";
  const age = Number.isFinite(main.character?.age) ? main.character.age : safeAge(run);
  const world = main.world?.label ?? run?.worldId ?? "";
  const growthStage = main.growthStage?.label ?? run?.player?.lifeStage ?? "";
  const coreTalent = main.coreTalents?.[0] ?? "";
  return {
    title: [name, `${age}岁`, world].filter(Boolean).join(" · "),
    characterName: name,
    age,
    world,
    growthStage,
    coreTalent,
  };
}

function buildTimeline(panelViews) {
  return (Array.isArray(panelViews?.story?.timeline) ? panelViews.story.timeline : [])
    .map((entry) => ({
      age: entry.age,
      nodeType: entry.nodeType ?? entry.kind ?? "event",
      rawNodeId: entry.nodeId,
      nodeId: publicNodeId(entry.nodeId, entry),
      body: String(entry.body ?? "").trim(),
      changes: visibleChangeTexts(entry.changes),
    }))
    .filter((entry) => entry.body);
}

function publicTimelineEntry(entry = {}) {
  const { rawNodeId, ...publicEntry } = entry;
  return publicEntry;
}

function choicesForCurrentNode(run, nodeId) {
  const node = latestLifeNode(run, nodeId);
  return (Array.isArray(node?.choices) ? node.choices : []).slice(0, 3).map((choice, index) => ({
    id: choice?.id ?? `choice_${index + 1}`,
    text: String(choice?.text ?? "").trim(),
    riskLabel: choice?.riskLabel ?? "",
    fuzzySuccessLabel: choice?.fuzzySuccessLabel ?? "",
  })).filter((choice) => choice.text);
}

function visibleChangesForCurrentNode(run, nodeId) {
  const node = latestLifeNode(run, nodeId);
  return visibleChangeTexts(node?.visibleChanges);
}

function latestLifeNode(run, nodeId) {
  const nodes = run?.worldState?.storyState?.lifeNodes ?? [];
  if (nodeId) return nodes.findLast((node) => node?.nodeId === nodeId);
  return nodes.at(-1);
}

function sourceEventIdsForLifeNodes(run) {
  return (run?.worldState?.storyState?.lifeNodes ?? [])
    .flatMap((node) => Array.isArray(node?.sourceEventIds) ? node.sourceEventIds : [])
    .filter(Boolean)
    .slice(-24)
    .map(publicSourceId);
}

function emptyScene(run) {
  return {
    age: safeAge(run),
    nodeType: "none",
    nodeId: "",
    body: "",
    changes: [],
  };
}

function visibleChangeTexts(changes = []) {
  return (Array.isArray(changes) ? changes : [])
    .map((change) => {
      if (typeof change === "string") return { text: change };
      return {
        type: change?.type ?? "note",
        text: String(change?.text ?? "").trim(),
      };
    })
    .filter((change) => change.text);
}

function safeAge(run) {
  return Math.max(0, Math.floor(Number(run?.player?.age) || 0));
}

function viewIdFor({ run, currentScene }) {
  const runId = String(run?.runId ?? "run").replace(/[^a-zA-Z0-9_-]/g, "_");
  const age = Number.isFinite(currentScene?.age) ? currentScene.age : safeAge(run);
  const turn = run?.eventLog?.events?.length ?? run?.eventHistory?.length ?? 0;
  return `view_${runId}_age_${age}_turn_${turn}`;
}

function publicNodeId(rawNodeId, entry = {}) {
  const age = Number.isFinite(entry?.age) ? entry.age : 0;
  const nodeType = String(entry?.nodeType ?? entry?.kind ?? "node").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `node_${nodeType}_${age}_${hashPublicId(rawNodeId || JSON.stringify(entry))}`;
}

function publicSourceId(rawSourceId) {
  return `source_${hashPublicId(rawSourceId)}`;
}

function hashPublicId(value) {
  return crypto
    .createHash("sha256")
    .update(String(value ?? ""))
    .digest("hex")
    .slice(0, 12);
}

function safetyHash(view) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(view))
    .digest("hex")
    .slice(0, 16);
}
