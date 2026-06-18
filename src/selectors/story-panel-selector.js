import {
  cleanText,
  pressureLabel,
  publicEventEntry,
  storyAxisLabel,
  threadLabel,
  topPressureFromStoryState,
} from "./selector-utils.js";

export function getStoryPanelView(run) {
  const storyState = run?.worldState?.storyState ?? {};
  const timeline = (run?.eventHistory ?? [])
    .slice(-8)
    .map((event) => publicEventEntry(event))
    .filter((entry) => entry.title || entry.body);
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

function buildVisibleFacts(storyState) {
  return [
    ...(storyState.facts ?? []).slice(-4),
    ...(storyState.closedFacts ?? []).slice(-4),
  ]
    .map((fact) => pressureLabel(cleanText(fact)))
    .filter(Boolean)
    .slice(-6);
}
