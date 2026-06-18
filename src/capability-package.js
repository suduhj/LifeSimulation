import { ATTRIBUTE_KEYS, developmentStageForAge, ensureGrowthLedger } from "./growth-ledger.js";

export function buildCapabilityPackages(run) {
  const ledger = ensureGrowthLedger(run);
  const age = Math.max(0, Math.floor(Number(run?.player?.age) || 0));
  const stage = developmentStageForAge(age);
  const attributes = {};

  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] = buildAttributeCapabilityPackage({
      attribute: key,
      entry: ledger.attributes[key],
      age,
      stage,
      worldId: run.worldId,
    });
  }

  return {
    schemaVersion: "mvp.capability_package.v1",
    authority: "engine_growth_ledger",
    age,
    lifeStage: run.player.lifeStage,
    developmentStage: stage,
    worldId: run.worldId,
    attributes,
    forbiddenActions: unique(Object.values(attributes).flatMap((item) => item.forbiddenActions)),
    checkTags: unique(Object.values(attributes).flatMap((item) => item.checkTags)),
  };
}

export function buildDevelopmentalExpression(run) {
  const packages = buildCapabilityPackages(run);
  return {
    schemaVersion: "mvp.developmental_expression.v1",
    authority: "engine_growth_ledger",
    age: packages.age,
    developmentStage: packages.developmentStage,
    allowedExpressions: unique(Object.values(packages.attributes).flatMap((item) => item.unlockedCapabilities)).slice(0, 24),
    forbiddenExpressions: unique(Object.values(packages.attributes).flatMap((item) => item.lockedCapabilities)).slice(0, 24),
    forbiddenActions: packages.forbiddenActions,
    checkTags: packages.checkTags,
    rule: "AI 只能把 allowedExpressions 写成叙事表现；不能把潜能、lockedCapabilities 或 forbiddenActions 写成已经发生的事实。",
  };
}

function buildAttributeCapabilityPackage({ attribute, entry, age, stage, worldId }) {
  const effective = entry?.effective ?? 0;
  const potential = entry?.potential ?? 0;
  const lockedPotential = entry?.lockedPotential ?? 0;
  const unlockedCapabilities = [];
  const lockedCapabilities = [];
  const checkTags = [stageCheckTag(stage)];
  const forbiddenActions = [];

  addAgeBaseline({ attribute, stage, effective, unlockedCapabilities, checkTags });
  addAttributeSpecificCapabilities({ attribute, effective, worldId, unlockedCapabilities, checkTags });

  if (age < 18) {
    lockedCapabilities.push("正面对抗成年人");
    lockedCapabilities.push("承担成人级长期行动");
    forbiddenActions.push("adult_combat_power");
    forbiddenActions.push("adult_social_authority");
  }

  if (stage === "infant") {
    lockedCapabilities.push("自主远行");
    lockedCapabilities.push("清晰表达复杂计划");
    forbiddenActions.push("independent_travel");
    forbiddenActions.push("complex_verbal_plan");
  }

  if (lockedPotential > 0 || potential >= 50) {
    lockedCapabilities.push(highPotentialLockLabel(attribute));
    forbiddenActions.push("full_potential_awakening");
  }

  if (effective < 8 && attribute !== "familyBackground") {
    lockedCapabilities.push("未训练却稳定使用高阶能力");
    forbiddenActions.push("untrained_advanced_mastery");
  }

  return {
    attribute,
    effective,
    realized: entry?.realized ?? 0,
    potential,
    maturityCap: entry?.maturityCap,
    lockedPotential,
    developmentStage: stage,
    unlockedCapabilities: unique(unlockedCapabilities),
    lockedCapabilities: unique(lockedCapabilities),
    checkTags: unique(checkTags),
    forbiddenActions: unique(forbiddenActions),
  };
}

function addAgeBaseline({ attribute, stage, effective, unlockedCapabilities, checkTags }) {
  if (attribute === "familyBackground") {
    unlockedCapabilities.push("出身条件已经以家庭处境表现");
    checkTags.push("family_background_known");
    return;
  }

  if (stage === "infant") {
    unlockedCapabilities.push("婴儿级气息与本能反应");
    checkTags.push("infant_body_limit");
    return;
  }
  if (stage === "toddler") {
    unlockedCapabilities.push("幼儿级感知与依附反应");
    checkTags.push("toddler_response");
    return;
  }
  if (stage === "early_child") {
    unlockedCapabilities.push("同龄人中的早熟迹象");
    checkTags.push("peer_advantage");
    return;
  }
  if (stage === "child") {
    unlockedCapabilities.push("儿童阶段可持续的小幅优势");
    checkTags.push("child_stage_expression");
    if (effective >= 6) checkTags.push("child_competence");
    return;
  }
  if (stage === "adolescent") {
    unlockedCapabilities.push("少年阶段稳定显化的能力");
    checkTags.push("adolescent_competence");
    return;
  }
  unlockedCapabilities.push("成人阶段可通过训练继续兑现潜能");
  checkTags.push("adult_capability");
}

function addAttributeSpecificCapabilities({ attribute, effective, worldId, unlockedCapabilities, checkTags }) {
  if (attribute === "constitution") {
    if (effective >= 5) {
      unlockedCapabilities.push("体力超过同龄人");
      checkTags.push("child_endurance");
    }
    if (effective >= 8) {
      unlockedCapabilities.push("恢复较快");
      checkTags.push("minor_recovery");
    }
    if (worldId === "wasteland") checkTags.push("wasteland_body_stress");
    return;
  }
  if (attribute === "intelligence") {
    if (effective >= 5) {
      unlockedCapabilities.push("记忆力强");
      checkTags.push("child_learning");
    }
    if (effective >= 8) {
      unlockedCapabilities.push("能发现大人忽略的细节");
      checkTags.push("pattern_noticing");
    }
    return;
  }
  if (attribute === "appearance") {
    if (effective >= 5) {
      unlockedCapabilities.push("更容易被人记住");
      checkTags.push("social_presence");
    }
    return;
  }
  if (attribute === "luck") {
    if (effective >= 5) {
      unlockedCapabilities.push("偶尔遇到有利巧合");
      checkTags.push("minor_fortune");
    }
  }
}

function highPotentialLockLabel(attribute) {
  if (attribute === "constitution") return "完整发挥神话体质";
  if (attribute === "intelligence") return "完整发挥神话悟性";
  if (attribute === "appearance") return "完整显露超凡气质";
  if (attribute === "luck") return "完全兑现命运眷顾";
  return "完整发挥高阶潜能";
}

function stageCheckTag(stage) {
  return {
    infant: "infant_body_limit",
    toddler: "toddler_body_limit",
    early_child: "early_child_limit",
    child: "child_stage_limit",
    adolescent: "adolescent_stage_limit",
    adult: "adult_stage",
  }[stage] ?? "age_limited";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}
