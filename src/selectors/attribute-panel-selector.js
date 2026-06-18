import { developmentStageForAge } from "../growth-ledger.js";
import {
  attributeKeys,
  attributeLabel,
  developmentStageLabel,
  worldLabel,
} from "./selector-utils.js";

export function getAttributePanelView(run) {
  const age = Math.max(0, Math.floor(Number(run?.player?.age) || 0));
  const growthLedger = run?.player?.growthLedger?.attributes ?? {};
  const attributes = run?.player?.attributes ?? {};

  return {
    schemaVersion: "mvp.attribute_panel_view.v1",
    title: "属性面板",
    character: {
      name: run?.player?.name ?? "",
      age,
      world: worldLabel(run?.worldId),
    },
    growthStage: developmentStageLabel(developmentStageForAge(age)),
    attributes: attributeKeys().map((key) => {
      const attr = attributes[key] ?? {};
      const ledger = growthLedger[key] ?? {};
      const current = numberValue(ledger.effective ?? attr.effective ?? attr.manifested);
      const realized = numberValue(ledger.realized ?? attr.realized ?? attr.manifested ?? current);
      const potential = numberValue(ledger.potential ?? attr.potential);
      const locked = Math.max(0, numberValue(ledger.lockedPotential ?? attr.lockedPotential ?? potential - realized));
      const exposure = numberValue(ledger.exposure ?? attr.exposure);
      return {
        name: attributeLabel(key),
        current,
        realized,
        potential,
        locked,
        exposure,
        peerLabel: peerLabel(current),
        potentialLabel: potentialLabel(potential),
        exposureLabel: exposureLabel(exposure),
      };
    }),
  };
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function peerLabel(value) {
  if (value >= 20) return "远超同龄";
  if (value >= 12) return "同龄罕见";
  if (value >= 8) return "同龄突出";
  if (value >= 5) return "略有优势";
  return "普通表现";
}

function potentialLabel(value) {
  if (value >= 100) return "神话潜质";
  if (value >= 60) return "传奇潜质";
  if (value >= 30) return "罕见潜质";
  if (value >= 12) return "优秀潜质";
  return "普通潜质";
}

function exposureLabel(value) {
  if (value >= 20) return "外界关注高";
  if (value >= 10) return "已被注意";
  if (value >= 5) return "轻微异常";
  return "未显眼";
}
