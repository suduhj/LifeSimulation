import { developmentStageForAge } from "../growth-ledger.js";
import {
  developmentStageLabel,
  lifeStageLabel,
  progressLabel,
  visibleTalents,
  worldLabel,
} from "./selector-utils.js";

export function getMainPanelView(run) {
  const age = Math.max(0, Math.floor(Number(run?.player?.age) || 0));
  const developmentStage = developmentStageForAge(age);
  const talents = visibleTalents(run);
  const progress = Object.entries(run?.worldState?.progress ?? {}).map(([key, value]) => ({
    label: progressLabel(key),
    value,
  }));

  return {
    schemaVersion: "mvp.main_panel_view.v1",
    character: {
      name: run?.player?.name ?? "",
      age,
      gender: run?.player?.gender ?? "",
      lifeStage: lifeStageLabel(run?.player?.lifeStage),
    },
    world: {
      id: run?.worldId ?? "",
      label: worldLabel(run?.worldId),
    },
    growthStage: {
      label: developmentStageLabel(developmentStage),
    },
    coreTalents: talents.slice(0, 3),
    progress,
    summaryLines: [
      `${run?.player?.name ?? ""} · ${age}岁 · ${worldLabel(run?.worldId)}`,
      `成长阶段：${developmentStageLabel(developmentStage)}`,
      talents[0] ? `核心天赋：${talents[0]}` : "",
    ].filter(Boolean),
  };
}
