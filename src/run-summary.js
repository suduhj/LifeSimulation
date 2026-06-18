export const ATTRIBUTE_LABELS = {
  appearance: "颜值",
  intelligence: "智力",
  constitution: "体质",
  familyBackground: "家境",
  luck: "运气",
};

export function buildRunSummary(run) {
  return {
    playerLine: `${run.player.name} / ${genderLabel(run.player.gender)} / ${run.player.age}岁 / ${lifeStageLabel(run.player.lifeStage)}`,
    personalityLine: personalityLabel(run.player.personality),
    attributes: buildAttributeSummary(run),
    progress: buildProgressSummary(run),
    statuses: buildStatusSummary(run.statuses ?? []),
    npcRelationships: buildNpcRelationshipSummary(run),
    factions: buildFactionSummary(run),
  };
}

export function formatRunSummary(run) {
  const summary = buildRunSummary(run);
  const lines = ["角色状态：", `- ${summary.playerLine}`];

  lines.push(`- 性格倾向：${summary.personalityLine}`);
  lines.push("- 属性：" + (summary.attributes.length > 0 ? ` ${summary.attributes.join(" / ")}` : " 暂无"));
  lines.push("- 世界进度：" + (summary.progress.length > 0 ? ` ${summary.progress.join(" / ")}` : " 暂无"));
  lines.push("- 状态：" + (summary.statuses.length > 0 ? ` ${summary.statuses.join(" / ")}` : " 无"));
  lines.push("- 重要NPC：" + (summary.npcRelationships.length > 0 ? ` ${summary.npcRelationships.join(" / ")}` : " 暂无"));
  lines.push("- 势力：" + (summary.factions.length > 0 ? ` ${summary.factions.join(" / ")}` : " 暂无"));

  return lines;
}

function buildAttributeSummary(run) {
  return Object.entries(run.player.attributes ?? {}).map(([key, attribute]) => {
    const label = ATTRIBUTE_LABELS[key] ?? key;
    return `${label}潜力${attribute.potential}/显化${attribute.manifested}/暴露${attribute.exposure}`;
  });
}

function buildProgressSummary(run) {
  return Object.entries(run.worldState?.progress ?? {}).map(([key, value]) => `${progressLabel(key)}:${value}`);
}

function buildStatusSummary(statuses) {
  return statuses.map((status) => {
    const stackText = typeof status.stacks === "number" && status.stacks !== 0 ? ` x${status.stacks}` : "";
    const durationText = status.duration ? `(${status.duration})` : "";
    return `${status.label ?? status.id}${stackText}${durationText}`;
  });
}

function buildNpcRelationshipSummary(run) {
  return (run.importantNPCs ?? []).slice(0, 5).map((npc) => {
    const affinity = npc.relationship?.affinity ?? 0;
    const trust = npc.relationship?.trust ?? 0;
    return `${npc.roleLabel ?? "重要NPC"}:${relationshipLabel(affinity)} 亲近${roughRange(affinity)} 信任${roughRange(trust)}`;
  });
}

function buildFactionSummary(run) {
  return (run.factions ?? []).slice(0, 5).map((faction) => {
    const attention = faction.relationship?.attention;
    const attentionText = typeof attention === "number" ? ` 关注${roughRange(attention)}` : "";
    return `${faction.name ?? faction.id}${attentionText}`;
  });
}

function relationshipLabel(value) {
  if (value >= 70) return "亲密";
  if (value >= 40) return "友善";
  if (value >= 10) return "普通";
  if (value > -20) return "疏离";
  if (value > -50) return "敌意";
  return "危险";
}

function roughRange(value) {
  const clamped = Math.max(-100, Math.min(100, Math.round(value)));
  const lower = Math.floor(clamped / 10) * 10;
  const upper = lower + 10;
  return `${lower}~${upper}`;
}

function genderLabel(value) {
  return {
    female: "女",
    male: "男",
    nonbinary: "非二元",
    unspecified: "不指定",
  }[value] ?? value ?? "不指定";
}

function lifeStageLabel(value) {
  return {
    birth: "出生",
    childhood: "幼年",
    adolescence: "少年",
    youth: "青年",
    adulthood: "成年",
    middleAge: "中年",
    oldAge: "老年",
  }[value] ?? value ?? "未知阶段";
}

function personalityLabel(personality) {
  const id = typeof personality === "string" ? personality : personality?.id;
  return {
    cautious: "谨慎稳健",
    ambitious: "野心进取",
    curious: "好奇探索",
    empathetic: "重情共感",
    rebellious: "叛逆自由",
    pragmatic: "现实务实",
    random: "由 AI 生成",
  }[id] ?? personality?.label ?? "由 AI 生成";
}

function progressLabel(id) {
  return {
    cultivation_foundation: "修炼根基",
    realm_stage: "境界阶段",
    sect_attention: "宗门关注",
    karmic_pressure: "因果压力",
    truth_exposure: "真相揭露",
    sanity_pressure: "理智压力",
    corruption_assimilation: "污染/同化",
    occult_contact: "神秘接触",
    social_normalcy: "社会正常度",
    personal_goal: "个人目标",
    survival_days: "生存天数",
    camp_stage: "营地阶段",
    resource_security: "资源安全",
    radiation_burden: "辐射负担",
    faction_trust: "势力信任",
  }[id] ?? id;
}
