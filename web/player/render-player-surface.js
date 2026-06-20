export function renderPlayerSurfaceSummary(view = {}) {
  const header = view.header ?? {};
  const scene = view.currentScene ?? {};
  return {
    title: header.title ?? "",
    sceneAge: scene.age,
    sceneBody: scene.body ?? "",
    choiceCount: Array.isArray(view.choices) ? view.choices.length : 0,
  };
}

export function surfaceTimelineEntries(view = {}) {
  return Array.isArray(view.timeline) ? view.timeline : [];
}
