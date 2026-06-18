import { buildCapabilityPackages, buildDevelopmentalExpression } from "../../capability-package.js";

export function buildPromptView(run) {
  return {
    schemaVersion: "mvp.prompt_view.v1",
    runId: run.runId,
    worldId: run.worldId,
    currentAge: run.player.age,
    lifeStage: run.player.lifeStage,
    player: {
      name: run.player.name,
      gender: run.player.gender,
      personality: run.player.personality,
      identitySeedId: run.player.identitySeedId,
      talents: run.player.talents ?? [],
      attributes: run.player.attributes,
      capabilityPackages: buildCapabilityPackages(run),
      developmentalExpression: buildDevelopmentalExpression(run),
    },
    worldState: run.worldState,
    importantNPCs: (run.importantNPCs ?? []).map((npc) => ({
      id: npc.id,
      role: npc.role,
      playerVisible: npc.playerVisible,
      relationship: npc.relationship,
      knownIdentity: npc.knownIdentity,
      hiddenInfo: npc.hiddenInfo,
      stance: npc.stance,
      flags: npc.flags,
    })),
    recentMemory: (run.memory ?? []).slice(-8),
    recentEvents: (run.eventHistory ?? []).slice(-5),
  };
}
