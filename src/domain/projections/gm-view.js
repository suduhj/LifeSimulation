export function buildGmView(run) {
  return {
    schemaVersion: "mvp.gm_view.v1",
    runId: run.runId,
    worldId: run.worldId,
    run,
    eventLog: run.eventLog ?? null,
    hiddenNPCs: (run.importantNPCs ?? []).map((npc) => ({
      id: npc.id,
      role: npc.role,
      knownIdentity: npc.knownIdentity,
      hiddenInfo: npc.hiddenInfo,
      relationship: npc.relationship,
      flags: npc.flags ?? [],
    })),
  };
}
