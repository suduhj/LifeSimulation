import { developmentStageForAge } from "../growth-ledger.js";
import {
  attributeDisplayPolicy,
  attributeLabelForPlayer,
} from "../attribute-reality-contract.js";
import {
  attributeKeys,
  developmentStageLabel,
  visibleTalents,
  worldLabel,
} from "./selector-utils.js";

const TALENT_ATTRIBUTE_KEYS = ["appearance", "intelligence", "constitution"];
const FATE_ATTRIBUTE_KEYS = ["familyBackground", "luck"];

export function getAttributePanelView(run) {
  const age = Math.max(0, Math.floor(Number(run?.player?.age) || 0));
  const growthLedger = run?.player?.growthLedger?.attributes ?? {};
  const attributes = run?.player?.attributes ?? {};
  const worldId = run?.worldId;
  const growthStage = developmentStageLabel(developmentStageForAge(age));
  const cards = attributeKeys().map((key) => buildAttributeCard({ key, attributes, growthLedger }));
  const cardByKey = new Map(attributeKeys().map((key, index) => [key, cards[index]]));
  const progressItems = buildProgressItems(run);
  const coreTalent = visibleTalents(run)[0] ?? "";
  const realmItem = progressItems.find((item) => item.name === "境界");
  const realmText = realmItem?.value && realmItem.value !== "无" ? realmItem.value : "凡人";
  const lifeStageText = `${realmText}${ageStageLabel(age)}`;

  return {
    schemaVersion: "mvp.attribute_panel_view.v1",
    title: "成长显化面板",
    character: {
      name: run?.player?.name ?? "",
      age,
      world: worldLabel(worldId),
    },
    header: {
      characterLine: `${run?.player?.name ?? ""} · ${age}岁 · ${lifeStageText}`,
      growthStage,
      coreTalent,
    },
    growthStage,
    groups: [
      {
        title: "天赋主属性",
        cards: TALENT_ATTRIBUTE_KEYS.map((key) => cardByKey.get(key)).filter(Boolean),
      },
      {
        title: "基础命格",
        cards: FATE_ATTRIBUTE_KEYS.map((key) => cardByKey.get(key)).filter(Boolean),
      },
      {
        title: worldId === "cultivation" ? "修行进度" : "世界进度",
        items: progressItems,
      },
    ],
    attributes: cards,
  };
}

function buildAttributeCard({ key, attributes, growthLedger }) {
  const attr = attributes[key] ?? {};
  const ledger = growthLedger[key] ?? {};
  const policy = attributeDisplayPolicy(key);
  const current = numberValue(ledger.effective ?? attr.effective ?? attr.manifested);
  const manifested = numberValue(ledger.realized ?? attr.realized ?? attr.manifested ?? current);
  const potential = numberValue(ledger.potential ?? attr.potential);
  const rawSealed = Math.max(0, numberValue(ledger.lockedPotential ?? attr.lockedPotential ?? potential - manifested));
  const ageSealed = policy.showSealedValue ? rawSealed : 0;
  const exposure = numberValue(ledger.exposure ?? attr.exposure);
  const manifestedMax = Math.max(0, potential);

  return {
    name: attributeLabelForPlayer(key),
    currentLabel: policy.currentLabel,
    current,
    peerLabel: peerLabel(current),
    potential,
    potentialLabel: key === "familyBackground" || key === "luck" ? policy.potentialTitle : potentialLabel(potential),
    manifestedLabel: policy.manifestedLabel,
    manifested,
    manifestedMax,
    manifestedRatio: progressRatio(manifested, manifestedMax),
    ageSealTitle: policy.sealTitle,
    showAgeSeal: policy.showSealedValue,
    ageSealed,
    ageSealLabel: policy.showSealedValue ? ageSealLabel(rawSealed, potential) : policy.sealLabel,
    exposureTitle: policy.exposureTitle,
    exposure,
    exposureLabel: exposureLabel(exposure),
  };
}

function ageStageLabel(age) {
  const value = Math.max(0, Math.floor(Number(age) || 0));
  if (value <= 3) return "婴幼年";
  if (value <= 12) return "幼年";
  if (value <= 17) return "少年";
  if (value <= 40) return "成年";
  if (value <= 65) return "中年";
  return "老年";
}

function buildProgressItems(run) {
  const progress = run?.worldState?.progress ?? {};
  if (run?.worldId === "cultivation") {
    return [
      progressItem("境界", progressValueLabel(progress.realm ?? progress.realm_stage ?? "mortal")),
      progressItem("根基", foundationLabel(progress.cultivation_foundation)),
      progressItem("功法", progressValueLabel(progress.techniques ?? "none")),
      progressItem("资源", progressValueLabel(progress.resources ?? "none")),
    ];
  }

  const entries = Object.entries(progress).slice(0, 4);
  if (entries.length === 0) {
    return [progressItem("状态", "暂无明显变化")];
  }
  return entries.map(([key, value]) => progressItem(displayProgressName(key), progressValueLabel(value)));
}

function progressItem(name, value) {
  return { name, value };
}

function foundationLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "尚未建立";
  if (number < 5) return "初见根基";
  if (number < 12) return "根基渐稳";
  return "根基深厚";
}

function progressValueLabel(value) {
  if (typeof value === "number") return value > 0 ? String(value) : "无";
  if (typeof value === "boolean") return value ? "有" : "无";
  if (value && typeof value === "object") return "已记录";
  return {
    mortal: "凡人",
    qi_refining: "炼气",
    foundation_establishment: "筑基",
    golden_core: "金丹",
    nascent_soul: "元婴",
    spirit_transformation: "化神",
    none: "无",
    low: "较低",
    medium: "中等",
    high: "较高",
  }[value] ?? (String(value ?? "").trim() || "无");
}

function displayProgressName(key) {
  return String(key ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : 0;
}

function progressRatio(value, max) {
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((numberValue(value) / max) * 100)));
}

function peerLabel(value) {
  if (value >= 20) return "远超同龄";
  if (value >= 12) return "同龄罕见";
  if (value >= 8) return "同龄出众";
  if (value >= 5) return "略有优势";
  return "普通";
}

function potentialLabel(value) {
  if (value >= 100) return "神话潜质";
  if (value >= 60) return "传奇潜质";
  if (value >= 30) return "罕见潜质";
  if (value >= 12) return "优秀潜质";
  return "普通潜质";
}

function ageSealLabel(ageSealed, potential) {
  if (ageSealed <= 0 || potential <= 0) return "无";
  const ratio = ageSealed / potential;
  if (ratio >= 0.75) return "极强";
  if (ratio >= 0.45) return "明显";
  if (ratio >= 0.2) return "轻微";
  return "很低";
}

function exposureLabel(value) {
  if (value >= 20) return "高";
  if (value >= 10) return "偏高";
  if (value >= 5) return "有迹象";
  return "低";
}
