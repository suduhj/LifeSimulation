export function renderPlayerContractSummary(contract = {}) {
  const header = contract.header ?? {};
  const scene = contract.currentScene ?? {};
  return {
    title: header.title ?? "",
    sceneAge: scene.age,
    sceneBody: scene.body ?? "",
    choiceCount: Array.isArray(contract.choices) ? contract.choices.length : 0,
  };
}

export function contractTimelineEntries(contract = {}) {
  return Array.isArray(contract.timeline) ? contract.timeline : [];
}
