import {
  cleanText,
  pressureLabel,
  storyAxisLabel,
  threadLabel,
  topPressureFromStoryState,
} from "./selector-utils.js";

export function getStoryPanelView(run) {
  const storyState = run?.worldState?.storyState ?? {};
  const lifeNodeTimeline = (storyState.lifeNodes ?? [])
    .slice(-24)
    .map((node) => publicLifeNodeEntry(node))
    .filter((entry) => entry.body);
  const timeline = lifeNodeTimeline.slice(-8);
  const recentEvents = timeline.slice(-4);
  const threads = (storyState.threads ?? [])
    .slice(-5)
    .map((thread) => ({
      label: threadLabel(thread),
      stage: pressureLabel(thread.stage) || "持续推进",
      updatedAge: Number.isFinite(thread.updatedAge) ? thread.updatedAge : undefined,
    }))
    .filter((thread) => thread.label);
  const axes = Object.entries(storyState.axes ?? {}).map(([axisId, axis]) => ({
    label: storyAxisLabel(axisId),
    level: Number.isFinite(axis?.level) ? axis.level : 0,
    cooldown: Number.isFinite(axis?.cooldown) ? axis.cooldown : 0,
  }));

  return {
    schemaVersion: "mvp.story_panel_view.v1",
    title: "剧情面板",
    currentAge: Number.isFinite(run?.player?.age) ? run.player.age : 0,
    currentPressure: topPressureFromStoryState(storyState),
    timeline,
    recentEvents,
    threads,
    axes,
    visibleFacts: buildVisibleFacts(storyState),
  };
}

function publicLifeNodeEntry(node = {}) {
  return {
    kind: node.nodeType ?? "event",
    nodeType: node.nodeType ?? "annual_event",
    nodeId: node.nodeId,
    age: Number.isFinite(node.age) ? node.age : undefined,
    body: (node.paragraphs ?? []).join("\n\n").trim(),
    changes: publicVisibleChanges(node.visibleChanges),
  };
}

function publicVisibleChanges(changes = []) {
  return (Array.isArray(changes) ? changes : [])
    .map((change) => {
      if (typeof change === "string") return { text: cleanText(change) };
      return { text: cleanText(change?.text) };
    })
    .filter((change) => change.text);
}

function buildVisibleFacts(storyState) {
  return [
    ...(storyState.facts ?? []).slice(-4),
    ...(storyState.closedFacts ?? []).slice(-4),
  ]
    .map((fact) => pressureLabel(cleanText(fact)))
    .filter(Boolean)
    .slice(-6);
}
