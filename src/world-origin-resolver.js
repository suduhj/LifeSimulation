import {
  attributeRealityContractFor,
  attributeTierForValue,
} from "./attribute-reality-contract.js";

export const WORLD_ORIGIN_SCHEMA_VERSION = "mvp.world_origin.v1";

const ORIGINS = {
  cultivation: {
    strained: [
      origin("cultivation_poor_farmer", "贫苦农户", "家中靠薄田和零工过活，能给你的保护有限。"),
      origin("cultivation_tenant_family", "佃户之家", "家里依附他人田地，日子紧巴，许多选择要先顾生计。"),
      origin("cultivation_edge_village", "山村边缘家庭", "家在村子边缘，消息和资源都来得慢。"),
      origin("cultivation_declined_wanderer", "破落散户", "家中有过旧日体面，如今只剩零碎人情。"),
    ],
    ordinary: [
      origin("cultivation_village_household", "普通村户", "家里能维持温饱，照看和资源都平实。"),
      origin("cultivation_craft_family", "手艺人家", "家中靠一门普通手艺立身，能给你稳定照看。"),
      origin("cultivation_small_hunter", "寻常山户", "家人熟悉山林和村路，但称不上富足。"),
    ],
    notable: [
      origin("cultivation_herb_shop", "药铺之家", "家中接触药材和乡里人情，能给你较稳定的照看。"),
      origin("cultivation_small_merchant", "小商号之家", "家中有些往来和积蓄，消息比普通人家灵通。"),
      origin("cultivation_village_elder_line", "村中体面人家", "家中在村里说话有些分量，也更在意名声。"),
    ],
    advantaged: [
      origin("cultivation_herb_shop", "药铺之家", "家中有药材、人情和几分积蓄，能为你挡下一些风雨。"),
      origin("cultivation_gentry_house", "乡绅之家", "家中有田产和体面，周围人会更多留意你的举动。"),
      origin("cultivation_merchant_house", "商号之家", "家中掌着货路和银钱，能接触更远处的消息。"),
      origin("cultivation_sect_edge", "宗门外缘家庭", "家中与修行势力有若有若无的旧关系。"),
    ],
    extraordinary: [
      origin("cultivation_branch_clan", "修仙家族旁支", "家中有旧传承和修行人情，你的出生从一开始就被更多目光照看。"),
      origin("cultivation_old_inheritance", "旧传承家庭", "家里保存着不愿轻易示人的旧物和旧关系。"),
    ],
  },
  cthulhu: {
    strained: [
      origin("cthulhu_slum_family", "贫民区家庭", "家里在城市边缘勉强维持，许多异常只能被当作生活压力。"),
      origin("cthulhu_worker_family", "底层工人家庭", "家人忙于生计，对你的照看朴素但吃力。"),
      origin("cthulhu_bankrupt_family", "破产家庭", "旧日体面已经散去，家人更怕再被卷入麻烦。"),
      origin("cthulhu_fostered_child", "寄养家庭", "照看来自他人善意，也带着不稳定的边界。"),
    ],
    ordinary: [
      origin("cthulhu_plain_family", "普通市民家庭", "家中努力维持正常生活，不愿异常打破日常。"),
      origin("cthulhu_shop_family", "小店之家", "家中有稳定门面和街坊关系，能听见不少城市传闻。"),
    ],
    notable: [
      origin("cthulhu_clerk_family", "体面职员家庭", "家中重视名声和秩序，异常会被小心压住。"),
      origin("cthulhu_doctor_family", "医生家庭", "家中能把身体和精神反应看得更认真。"),
    ],
    advantaged: [
      origin("cthulhu_professor_family", "教授家庭", "家中有书籍、关系和体面，会让你的异常更容易被理解也更容易被记录。"),
      origin("cthulhu_lawyer_family", "律师家庭", "家中熟悉规则和人脉，能替你遮掩或解释不少麻烦。"),
      origin("cthulhu_merchant_family", "商人家庭", "家中有钱和消息，能接触更复杂的人群。"),
    ],
    extraordinary: [
      origin("cthulhu_old_money", "旧钱家庭", "家族体面深厚，旧宅、旧友和旧秘密都离你很近。"),
      origin("cthulhu_official_family", "体面公务人员家庭", "家中接近公文和封锁线，许多事不会只停留在传闻。"),
    ],
  },
  wasteland: {
    strained: [
      origin("wasteland_starving_refugee", "缺粮难民", "家中缺少稳定配给，活下去就是最先压来的事。"),
      origin("wasteland_scavenger_family", "拾荒家庭", "家人靠废墟和边缘活路维持，你从小就看见生存的粗粝。"),
      origin("wasteland_edge_migrant", "边缘流民", "你们在营地边缘落脚，安全和资源都不牢靠。"),
      origin("wasteland_low_labor", "营地底层劳工", "家人替营地做最辛苦的活，换取有限庇护。"),
    ],
    ordinary: [
      origin("wasteland_plain_camp_family", "普通营地家庭", "家中有基本配给，安全依赖营地规则。"),
      origin("wasteland_small_tool_family", "修补匠家庭", "家里有些工具和手艺，能换来小范围照看。"),
    ],
    notable: [
      origin("wasteland_guard_relative", "武装队亲属", "家中靠近巡逻和安全线，也更容易被卷入风险。"),
      origin("wasteland_ration_helper", "配给员亲属", "家中接触配给和名单，能知道谁被照顾、谁被放弃。"),
    ],
    advantaged: [
      origin("wasteland_camp_manager", "营地管理层家庭", "家中接近营地决策，资源和规矩都离你更近。"),
      origin("wasteland_technician_family", "技术员家庭", "家中掌握旧设备和维修能力，能换来稳定位置。"),
      origin("wasteland_med_station", "医疗站家庭", "家中接近药品和照护，也更容易被人求助。"),
    ],
    extraordinary: [
      origin("wasteland_old_facility_heir", "旧设施继承者", "家中握着旧世界设施的钥匙或权限，危险和机会一起靠近。"),
      origin("wasteland_resource_holder", "资源配给者家庭", "家中能影响资源流向，周围人会同时依赖和防备你们。"),
    ],
  },
};

export function resolveWorldOrigin({ run, worldId = run?.worldId ?? "cultivation", familyBackgroundValue, seed = 1 } = {}) {
  const value = Number.isFinite(familyBackgroundValue)
    ? familyBackgroundValue
    : familyBackgroundValueFromRun(run);
  const contract = attributeRealityContractFor({
    attribute: "familyBackground",
    value,
    worldId,
  });
  const originTierId = originTierForAttributeTier(contract.tier.id);
  const candidates = originsForTier(worldId, originTierId);
  const index = Math.abs(Number(seed) || 0) % candidates.length;
  const picked = candidates[index] ?? candidates[0];

  return {
    schemaVersion: WORLD_ORIGIN_SCHEMA_VERSION,
    originId: picked.id,
    worldId,
    attributeKey: "familyBackground",
    familyBackgroundValue: Math.max(0, Math.floor(Number(value) || 0)),
    familyBackgroundTier: originTierId,
    attributeTier: contract.tier.id,
    label: picked.label,
    playerVisibleSummary: picked.summary,
    mustInclude: contract.originConstraints.mustInclude,
    mustNotInclude: contract.originConstraints.mustNotInclude,
  };
}

export function originIsCompatibleWithFamilyBackground(origin, familyBackgroundValue) {
  if (!origin) return false;
  const tier = attributeTierForValue(familyBackgroundValue);
  return compatibleTierIds(originTierForAttributeTier(tier.id)).includes(origin.familyBackgroundTier);
}

export function originTierForAttributeTier(tierId) {
  if (["extreme_defect", "very_poor", "poor"].includes(tierId)) return "strained";
  if (["slightly_below_ordinary", "ordinary"].includes(tierId)) return "ordinary";
  if (["above_ordinary", "excellent"].includes(tierId)) return "notable";
  if (["elite", "top_mortal", "mortal_limit"].includes(tierId)) return "advantaged";
  if (tierId === "beyond_conventional") return "extraordinary";
  return tierId;
}

function originsForTier(worldId, tierId) {
  const worldOrigins = ORIGINS[worldId] ?? ORIGINS.cultivation;
  if (worldOrigins[tierId]?.length) return worldOrigins[tierId];
  if (tierId === "advantaged") return worldOrigins.notable;
  if (tierId === "extraordinary") return worldOrigins.advantaged;
  return worldOrigins.ordinary;
}

function compatibleTierIds(tierId) {
  if (tierId === "extraordinary") return ["extraordinary", "advantaged"];
  if (tierId === "advantaged") return ["advantaged", "extraordinary", "notable"];
  if (tierId === "strained") return ["strained"];
  if (tierId === "ordinary") return ["ordinary", "notable"];
  return [tierId, "ordinary", "advantaged"];
}

function familyBackgroundValueFromRun(run) {
  const ledger = run?.player?.growthLedger?.attributes?.familyBackground;
  const attr = run?.player?.attributes?.familyBackground;
  return Number(ledger?.potential ?? attr?.potential ?? ledger?.effective ?? attr?.manifested ?? 4);
}

function origin(id, label, summary) {
  return { id, label, summary };
}
