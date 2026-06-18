import { ATTRIBUTE_LABELS } from "../../run-summary.js";

export function buildPlayerView(run) {
  return {
    schemaVersion: "mvp.player_view.v1",
    runId: run.runId,
    worldId: run.worldId,
    player: {
      name: run.player.name,
      gender: run.player.gender,
      age: run.player.age,
      lifeStage: run.player.lifeStage,
      personality: run.player.personality?.label ?? run.player.personality?.id,
      attributes: buildPlayerAttributes(run),
      talents: (run.player.talents ?? []).map((talent) => ({
        rarity: talent.rarity,
        manifestationType: talent.manifestationType,
      })),
    },
    world: {
      progress: Object.entries(run.worldState?.progress ?? {}).map(([key, value]) => ({
        label: progressLabel(key),
        value,
      })),
      flags: (run.worldState?.flags ?? []).map((flag) => progressLabel(flag)),
    },
    statuses: (run.statuses ?? []).map((status) => ({
      label: status.label ?? status.id,
      duration: status.duration,
      stacks: status.stacks,
    })),
    importantNPCs: (run.importantNPCs ?? []).map((npc) => ({
      role: npc.playerVisible?.label ?? npc.knownIdentity?.role ?? npc.role,
      relationship: buildPlayerRelationship(npc.relationship),
      flags: npc.flags ?? [],
    })),
    recentMemory: (run.memory ?? []).slice(-6).map((entry) => ({
      text: entry.text,
    })),
  };
}

function buildPlayerAttributes(run) {
  return Object.entries(run.player?.attributes ?? {}).map(([key, attribute]) => {
    const ledger = run.player?.growthLedger?.attributes?.[key];
    return {
      label: ATTRIBUTE_LABELS[key] ?? key,
      current: ledger?.effective ?? attribute.manifested ?? 0,
      realized: ledger?.realized ?? attribute.realized ?? attribute.manifested ?? 0,
      potential: ledger?.potential ?? attribute.potential ?? 0,
      locked: ledger?.lockedPotential ?? Math.max(0, (attribute.potential ?? 0) - (attribute.realized ?? attribute.manifested ?? 0)),
      attention: ledger?.exposure ?? attribute.exposure ?? 0,
    };
  });
}

function buildPlayerRelationship(relationship = {}) {
  return Object.entries(relationship).map(([key, value]) => ({
    label: RELATIONSHIP_LABELS[key] ?? key,
    value,
  }));
}

const RELATIONSHIP_LABELS = {
  affinity: "亲近",
  trust: "信任",
  fear: "忌惮",
  interestBinding: "利益牵连",
  secretLeverage: "秘密牵制",
};

function progressLabel(id) {
  return {
    realm: "境界",
    cultivation_foundation: "修炼根基",
    sect_status: "宗门状态",
    techniques: "功法",
    tribulations: "劫数",
    resources: "资源",
    karma_and_reputation: "因果名声",
    lifespan_pressure: "寿元压力",
    sect_or_clan_status: "宗族状态",
    truth_exposure: "真相暴露",
    sanity_pressure: "理智压力",
    corruption_assimilation: "污染同化",
    occult_contact: "神秘接触",
    social_normalcy: "社会正常度",
    survival_days: "生存天数",
    camp_stage: "营地阶段",
    resource_security: "资源安全",
    radiation_burden: "辐射负担",
    faction_trust: "势力信任",
  }[id] ?? String(id).replaceAll("_", " ");
}
