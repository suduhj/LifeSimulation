export const ATTRIBUTE_REALITY_KEYS = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];

export const ATTRIBUTE_REALITY_LABELS = {
  appearance: "颜值",
  intelligence: "智力",
  constitution: "体质",
  familyBackground: "家境",
  luck: "运气",
};

const DISPLAY_POLICIES = {
  appearance: {
    currentLabel: "当前表现",
    potentialTitle: "潜质上限",
    manifestedLabel: "成长变化",
    sealTitle: "尚未定型",
    sealLabel: "随年龄慢慢长开",
    showSealedValue: false,
    exposureTitle: "外界关注",
  },
  intelligence: {
    currentLabel: "当前表现",
    potentialTitle: "潜质上限",
    manifestedLabel: "显化进度",
    sealTitle: "经验封存",
    showSealedValue: true,
    exposureTitle: "外界关注",
  },
  constitution: {
    currentLabel: "当前表现",
    potentialTitle: "潜质上限",
    manifestedLabel: "显化进度",
    sealTitle: "年龄封存",
    showSealedValue: true,
    exposureTitle: "外界关注",
  },
  familyBackground: {
    currentLabel: "当前体现",
    potentialTitle: "家庭底色",
    manifestedLabel: "资源优势",
    sealTitle: "家庭底色",
    sealLabel: "由出身和家庭资源决定",
    showSealedValue: false,
    exposureTitle: "外界关注",
  },
  luck: {
    currentLabel: "当前倾向",
    potentialTitle: "机缘倾向",
    manifestedLabel: "走势变化",
    sealTitle: "机缘倾向",
    sealLabel: "随选择和遭遇起伏",
    showSealedValue: false,
    exposureTitle: "外界关注",
  },
};

export function attributeLabelForPlayer(attribute) {
  return ATTRIBUTE_REALITY_LABELS[attribute] ?? readableId(attribute);
}

export function attributeDisplayPolicy(attribute) {
  return {
    currentLabel: "当前表现",
    potentialTitle: "潜质上限",
    manifestedLabel: "显化进度",
    sealTitle: "年龄封存",
    sealLabel: "",
    showSealedValue: true,
    exposureTitle: "外界关注",
    ...(DISPLAY_POLICIES[attribute] ?? {}),
  };
}

export function attributeTierForValue(value) {
  const number = Math.max(0, Math.floor(Number(value) || 0));
  if (number <= 2) return { id: "strained", label: "拮据", rank: 0 };
  if (number <= 5) return { id: "ordinary", label: "普通", rank: 1 };
  if (number <= 11) return { id: "notable", label: "小有优势", rank: 2 };
  if (number <= 24) return { id: "advantaged", label: "优渥", rank: 3 };
  return { id: "extraordinary", label: "显赫", rank: 4 };
}

export function attributeRealityContractFor({ attribute, value = 0, worldId = "" } = {}) {
  const tier = attributeTierForValue(value);
  const displayPolicy = attributeDisplayPolicy(attribute);
  return {
    schemaVersion: "mvp.attribute_reality_contract.v1",
    attribute,
    label: attributeLabelForPlayer(attribute),
    value: Math.max(0, Math.floor(Number(value) || 0)),
    tier,
    displayPolicy,
    originConstraints: attribute === "familyBackground"
      ? originConstraintsForFamilyBackground({ tier, worldId })
      : { mustInclude: [], mustNotInclude: [] },
  };
}

export function originConstraintsForFamilyBackground({ tier = attributeTierForValue(4), worldId = "" } = {}) {
  const commonHighMustNot = ["贫苦", "普通猎户", "底层", "破产", "缺粮难民", "边缘流民"];
  const commonLowMustNot = ["旧钱", "管理层", "家族旁支", "资源配给", "商号", "宗门外缘"];

  if (tier.rank >= 3) {
    return {
      mustInclude: highOriginKeywords(worldId),
      mustNotInclude: commonHighMustNot,
    };
  }
  if (tier.rank <= 0) {
    return {
      mustInclude: lowOriginKeywords(worldId),
      mustNotInclude: commonLowMustNot,
    };
  }
  return {
    mustInclude: ["稳定", "普通", "可解释的家庭资源"],
    mustNotInclude: ["显赫旧钱", "极端贫困", "资源掌控者", "破产流离"],
  };
}

function highOriginKeywords(worldId) {
  if (worldId === "cthulhu") return ["体面", "旧钱", "医生家庭", "教授家庭", "商人家庭"];
  if (worldId === "wasteland") return ["资源", "管理层", "技术员", "医疗站", "配给"];
  return ["体面", "资源", "传承", "家族", "商号", "宗门外缘"];
}

function lowOriginKeywords(worldId) {
  if (worldId === "cthulhu") return ["贫困", "底层", "寄养", "破产", "边缘"];
  if (worldId === "wasteland") return ["缺粮", "底层", "流民", "边缘", "拾荒", "劳工"];
  return ["贫困", "佃户", "山村边缘", "破落", "底层"];
}

function readableId(value) {
  return String(value ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}
