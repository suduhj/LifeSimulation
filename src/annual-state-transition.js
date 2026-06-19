import {
  axisUpdatesForFeaturedAxes,
  buildStoryStatePatch,
  ensureStoryState,
  selectStoryAxes,
} from "./story-state.js";
import { curriculumSignalsForSlot, selectCurriculumSlot } from "./life-curriculum.js";
import { buildTopicProfile, forbiddenTopicProfiles } from "./topic-ledger.js";
import { applyYearlyOutcomeToResponse, buildYearlyOutcome } from "./yearly-outcome.js";

export const ANNUAL_FACT_PACKAGE_SCHEMA_VERSION = "mvp.annual_fact_package.v1";

const FORBIDDEN_PLACE_SHAPE = "secret_return_to_forbidden_place";
const FAMILY_LOCKDOWN_SHAPE = "family_lockdown_reasserted";
const EDUCATION_ROUTINE_SHAPE = "education_routine_without_delta";
const RESOURCE_SHORTAGE_SHAPE = "resource_shortage_without_delta";
const HEALTH_STAGNATION_SHAPE = "health_condition_repeated_without_change";
const RELATIONSHIP_STALEMATE_SHAPE = "relationship_stalemate_repeated";
const SOCIAL_RUMOR_SHAPE = "social_rumor_without_delta";
const ROUTE_INDECISION_SHAPE = "route_indecision_repeated";
const WORLD_PRESSURE_STALL_SHAPE = "world_pressure_without_resolution";
const INSTITUTION_ARRIVAL_SHAPE = "institution_arrival_changes_life";

const SHAPE_DOMAINS = {
  [FORBIDDEN_PLACE_SHAPE]: "route",
  [FAMILY_LOCKDOWN_SHAPE]: "family",
  [EDUCATION_ROUTINE_SHAPE]: "education",
  [RESOURCE_SHORTAGE_SHAPE]: "resource",
  [HEALTH_STAGNATION_SHAPE]: "health",
  [RELATIONSHIP_STALEMATE_SHAPE]: "relationship",
  [SOCIAL_RUMOR_SHAPE]: "social",
  [ROUTE_INDECISION_SHAPE]: "route",
  [WORLD_PRESSURE_STALL_SHAPE]: "world_pressure",
};

const STALE_SHAPE_DETECTORS = [
  [FORBIDDEN_PLACE_SHAPE, looksLikeSecretReturnToForbiddenPlace],
  [FAMILY_LOCKDOWN_SHAPE, looksLikeFamilyLockdownReasserted],
  [EDUCATION_ROUTINE_SHAPE, looksLikeEducationRoutineWithoutDelta],
  [RESOURCE_SHORTAGE_SHAPE, looksLikeResourceShortageWithoutDelta],
  [HEALTH_STAGNATION_SHAPE, looksLikeHealthStagnationWithoutChange],
  [RELATIONSHIP_STALEMATE_SHAPE, looksLikeRelationshipStalemate],
  [SOCIAL_RUMOR_SHAPE, looksLikeSocialRumorWithoutDelta],
  [ROUTE_INDECISION_SHAPE, looksLikeRouteIndecisionRepeated],
  [WORLD_PRESSURE_STALL_SHAPE, looksLikeWorldPressureWithoutResolution],
];

export function buildAnnualFactPackage({ run, worlds, seed = 1 } = {}) {
  const storyState = ensureStoryState(structuredClone(run ?? {}));
  const age = Number(run?.player?.age ?? 0) + 1;
  const recentEventShapes = recentShapes(run);
  const forbiddenEventShapes = buildForbiddenEventShapes({ storyState, recentEventShapes });
  const facts = new Set(storyState.facts ?? []);
  const threads = storyState.threads ?? [];
  const forcedDomain = forcedAnnualDomain({ run, facts, threads });
  const curriculumPlan = selectCurriculumSlot({
    curriculum: storyState.curriculum,
    age,
    seed,
    preferredDomain: forcedDomain,
    consequencePressure: storyState.axes?.choiceConsequence?.level ?? 0,
  });

  const primaryDelta = choosePrimaryDelta({
    run,
    age,
    facts,
    threads,
    forbiddenEventShapes,
    seed,
    curriculumSlot: curriculumPlan.curriculumSlot,
  });

  const backgroundThreads = chooseBackgroundThreads({ threads, facts, primaryDelta });
  const requiredStateChanges = requiredStateChangesFor(primaryDelta, age, curriculumPlan.curriculumSlot);
  const requiredTextSignals = [
    ...requiredTextSignalsFor(primaryDelta),
    curriculumPlan.requiredHumanDelta,
    ...curriculumSignalsForSlot(curriculumPlan.curriculumSlot).slice(0, 3),
  ].filter(Boolean);
  const hasRepeatedShape = forbiddenEventShapes.length > 0;
  const hasInstitutionObligation = primaryDelta.domain === "institution";
  const selectedAxes = selectStoryAxes(storyState, {
    preferredAxis: axisPreferenceFor(primaryDelta.domain),
    age,
    seed,
  });
  const topicProfile = buildTopicProfile({
    age,
    worldId: run?.worldId,
    curriculumSlot: curriculumPlan.curriculumSlot,
    primaryDelta,
  });
  const forbiddenTopics = forbiddenTopicProfiles({
    topicLedger: storyState.topicLedger,
    age,
    candidate: topicProfile,
  });
  const threeLayerFocus = buildThreeLayerFocus({
    run,
    primaryDelta,
    backgroundThreads,
    curriculumPlan,
    secondaryAxis: selectedAxes.secondaryAxis,
  });
  const annualAgenda = buildAnnualAgenda({
    age,
    curriculumPlan,
    primaryDelta,
    selectedAxes,
    topicProfile,
    forbiddenTopics,
    threeLayerFocus,
  });

  return {
    schemaVersion: ANNUAL_FACT_PACKAGE_SCHEMA_VERSION,
    age,
    lifeStage: curriculumPlan.lifeStage,
    curriculumSlot: curriculumPlan.curriculumSlot,
    requiredHumanDelta: curriculumPlan.requiredHumanDelta,
    threeLayerFocus,
    topicProfile,
    forbiddenTopicProfiles: forbiddenTopics,
    annualAgenda,
    yearPurpose: purposeFor(primaryDelta),
    primaryDelta,
    primaryAxis: selectedAxes.primaryAxis,
    secondaryAxis: selectedAxes.secondaryAxis,
    rankedAxes: selectedAxes.rankedAxes,
    axisSnapshot: selectedAxes.axisSnapshot,
    requiredStateChanges,
    requiredTextSignals,
    backgroundThreads,
    forbiddenEventShapes,
    eventShapeHistory: recentEventShapes,
    freshnessRules: {
      mustHaveNewYearlyDelta: true,
      lifeBaseMustBePrimary: true,
      continuingThreadsMayOnlySupportPrimaryDelta: true,
      repeatedEventShapesCannotBePrimary: true,
      forbiddenTopicProfilesCannotBePrimary: true,
    },
    enforcementRequired: hasRepeatedShape || hasInstitutionObligation || forbiddenTopics.length > 0,
  };
}

export function buildAnnualSimulationOutcome(annualFactPackage) {
  if (!annualFactPackage?.primaryDelta) {
    return {
      factsAdded: [],
      factsClosed: [],
      forbiddenRepeats: [],
      threadUpdates: [],
      memoryText: "",
    };
  }
  const age = Number(annualFactPackage.age ?? 0);
  const delta = annualFactPackage.primaryDelta;
  const annualFactId = `annual_age_${age}_${delta.eventShape}`;
  return {
    factsAdded: [
      annualFactId,
      ...annualFactPackage.requiredStateChanges,
    ],
    factsClosed: [],
    forbiddenRepeats: annualFactPackage.forbiddenEventShapes,
    axisUpdates: axisUpdatesForFeaturedAxes({
      primaryAxis: annualFactPackage.primaryAxis,
      secondaryAxis: annualFactPackage.secondaryAxis,
      age,
      eventShape: delta.eventShape,
    }),
    recentEventShapes: [delta.eventShape],
    curriculumUpdates: annualFactPackage.curriculumSlot
      ? [{
          age,
          slot: annualFactPackage.curriculumSlot,
          lifeStage: annualFactPackage.lifeStage,
          requiredHumanDelta: annualFactPackage.requiredHumanDelta,
        }]
      : [],
    topicUpdates: annualFactPackage.topicProfile ? [annualFactPackage.topicProfile] : [],
    annualAgendas: annualFactPackage.annualAgenda ? [annualFactPackage.annualAgenda] : [],
    threadUpdates: [
      {
        threadId: `annual_${delta.domain}`,
        stage: delta.type,
        nextPressure: delta.nextPressure ?? annualFactPackage.yearPurpose,
        updatedAge: age,
      },
    ],
    memoryText: `${age} 岁年度变化：${delta.title}`,
  };
}

export function applyAnnualFactPackageToResponse(response, annualFactPackage, { run } = {}) {
  if (!response || !annualFactPackage?.primaryDelta) return response;
  const next = structuredClone(response);
  const delta = annualFactPackage.primaryDelta;
  const outcome = buildAnnualSimulationOutcome(annualFactPackage);
  const yearlyOutcome = buildYearlyOutcome({ run, annualFactPackage, response: next });

  next.event ??= {};
  next.event.eventShape = delta.eventShape;
  next.event.summaryTags = [
    ...new Set([
      ...(Array.isArray(next.event.summaryTags) ? next.event.summaryTags : []),
      "annual_state_transition",
      delta.domain,
      delta.type,
    ]),
  ];

  next.statePatch ??= {};
  next.statePatch.growthEvidenceChanges = Array.isArray(next.statePatch.growthEvidenceChanges)
    ? next.statePatch.growthEvidenceChanges
    : [];
  next.statePatch.worldStateChanges = [
    ...(Array.isArray(next.statePatch.worldStateChanges) ? next.statePatch.worldStateChanges : []),
    buildStoryStatePatch(outcome, annualFactPackage.age),
  ];
  next.statePatch.memoryUpdates = [
    ...(Array.isArray(next.statePatch.memoryUpdates) ? next.statePatch.memoryUpdates : []),
    { type: "annual_state_transition", text: outcome.memoryText },
  ];

  next.internal ??= {};
  next.internal.validationFlags = [
    ...new Set([
      ...(Array.isArray(next.internal.validationFlags) ? next.internal.validationFlags : []),
      "annual_state_transition",
      "engine_owned_year_delta",
    ]),
  ];
  return applyYearlyOutcomeToResponse(next, yearlyOutcome);
}

function choosePrimaryDelta({ run, age, facts, threads, forbiddenEventShapes, seed, curriculumSlot }) {
  const hasBiyunSelection = facts.has("biyun_selection_invited")
    || threadAtStage(threads, "biyun_selection", "pending");
  const hasSpiritBeastPressure = facts.has("spirit_beast_non_hostile_confirmed")
    || threadAtStage(threads, "bamboo_forest_spirit_beast", "non_hostile_confirmed");

  if (run?.worldId === "cultivation" && hasBiyunSelection && hasSpiritBeastPressure) {
    return {
      domain: "institution",
      type: "institution_arrival",
      eventShape: INSTITUTION_ARRIVAL_SHAPE,
      title: "碧云宗来人",
      description: "碧云宗外门弟子抵达青石村，处理后山灵兽传闻，也逼近此前被搁置的外门选拔。",
      nextPressure: "parents_decide_disclosure_to_sect",
    };
  }

  if (run?.worldId === "cultivation" && hasBiyunSelection) {
    return {
      domain: "institution",
      type: "institution_arrival",
      eventShape: "selection_pressure_changes_life",
      title: "仙门选拔的回音",
      description: "碧云宗选拔邀请不能继续悬置，家庭必须面对是否赴选或延期的后果。",
      nextPressure: "selection_route_must_be_decided",
    };
  }

  return fallbackFreshDelta(run?.worldId, age, seed, forbiddenEventShapes, curriculumSlot);
}

function fallbackFreshDelta(worldId, age, seed, forbiddenEventShapes = [], curriculumSlot = "") {
  const options = curriculumWorldOptions(worldId);
  const staleDomains = new Set(forbiddenEventShapes.map((shape) => SHAPE_DOMAINS[shape]).filter(Boolean));
  const filtered = options.filter((option) => !forbiddenEventShapes.includes(option.eventShape));
  const curriculumAligned = filtered.filter((option) => option.curriculumSlot === curriculumSlot);
  const preferred = curriculumAligned.filter((option) => !staleDomains.has(option.domain));
  const domainFresh = filtered.filter((option) => !staleDomains.has(option.domain));
  const candidates = preferred.length > 0
    ? preferred
    : curriculumAligned.length > 0
      ? curriculumAligned
      : domainFresh.length > 0
        ? domainFresh
        : filtered.length > 0
          ? filtered
          : options;
  const index = Math.abs(Number(seed) || age) % candidates.length;
  return candidates[index];
}

function worldOptions(worldId) {
  if (worldId === "cthulhu") {
    return [
      freshDelta("social", "social_reputation_shift", "ordinary_social_life_reacts_to_abnormality", "日常里的异样目光", "学校、街坊或家人对异常传闻产生新的反应，主角的日常关系发生变化。", "social_attention_requires_response"),
      freshDelta("education", "education_shift", "learning_environment_changes_life", "课堂之外的低语", "学习环境出现新的压力或机会，旧异常只作为背景影响判断。", "learning_path_adjusted"),
      freshDelta("world_pressure", "world_pressure_enters_daily_life", "public_explanation_changes_daily_life", "官方解释之后", "公开说法、封锁或辟谣改变了普通人的生活安排，异常线索退到背景里。", "public_story_affects_family"),
      freshDelta("health", "health_shift", "health_or_sanity_care_changes_life", "身体反应被认真对待", "身体、睡眠或精神状态出现可观察变化，家人或学校必须安排新的照护方式。", "care_plan_changes"),
    ];
  }
  if (worldId === "wasteland") {
    return [
      freshDelta("resource", "resource_shift", "resource_reallocation_changes_life", "物资分配的新规矩", "营地资源、照护关系或安全范围发生新变化，迫使主角适应新的生活安排。", "resource_rules_change"),
      freshDelta("relationship", "family_route_decision", "guardian_changes_child_route", "照护者的安排", "照护者为主角安排新的生存任务或学习方向。", "guardian_route_pressure"),
      freshDelta("health", "health_shift", "injury_or_exposure_changes_life", "伤病后的安排", "伤病、污染或体力变化迫使营地重新安排主角能做和不能做的事。", "health_limits_daily_range"),
      freshDelta("world_pressure", "world_pressure_enters_daily_life", "camp_security_changes_daily_life", "警戒线内外", "营地外部威胁改变巡逻、取水、拾荒或孩子活动范围。", "security_rules_change"),
    ];
  }
  return [
    freshDelta("education", "education_shift", "learning_path_changes_life", "新的学习安排", "家人或村中长辈给主角安排新的学习路径，旧线索只作为心里的暗流。", "learning_path_adjusted"),
    freshDelta("social", "social_reputation_shift", "village_reputation_changes_life", "村中的目光", "村中传闻改变了主角与同龄人、邻里或长辈的相处方式。", "social_attention_requires_response"),
    freshDelta("family", "family_route_decision", "family_decides_new_life_route", "家里的新安排", "父母不再只是重复禁令，而是为主角决定新的生活路线。", "family_route_pressure"),
    freshDelta("relationship", "relationship_shift", "trusted_relationship_changes_life", "可信之人的介入", "一个已经认识的人改变立场、提出帮助或提出条件，让旧压力进入新的关系阶段。", "relationship_boundary_changes"),
    freshDelta("route", "route_commitment", "route_commitment_changes_life", "必须选一条路", "此前悬而未决的方向被生活推到眼前，主角必须在学习、家庭、门派或自保之间作出取舍。", "route_choice_pressure"),
  ];
}

function freshDelta(domain, type, eventShape, title, description, nextPressure, curriculumSlot = "") {
  return { domain, type, eventShape, title, description, nextPressure, curriculumSlot };
}

function curriculumWorldOptions(worldId) {
  if (worldId === "cthulhu") {
    return [
      freshDelta("family", "family_route_decision", "cthulhu_family_boundary_changes_life", "家中的正常边界", "家人为了维持普通生活，重新划定你能问、能去和能接触的范围。", "family_normalcy_boundary", "family_boundary"),
      freshDelta("education", "education_shift", "cthulhu_learning_path_changes_life", "课堂里的低声提醒", "学校或家庭学习安排发生变化，异常只能作为背景压力影响判断。", "learning_path_adjusted", "learning_path"),
      freshDelta("social", "social_reputation_shift", "cthulhu_peer_relationship_changes_life", "同龄人的异样态度", "同龄人对传闻和细小异常产生新反应，你的日常关系因此变化。", "peer_attention_requires_response", "peer_relationship"),
      freshDelta("relationship", "relationship_shift", "cthulhu_mentor_attention_changes_life", "可信大人的新看法", "一位可信大人注意到你的反应，开始改变指导或照看的方式。", "mentor_attention_changes", "mentor_attention"),
      freshDelta("health", "health_shift", "cthulhu_body_or_care_changes_life", "睡眠之后的照护", "睡眠、体温或精神状态被认真对待，家人或学校改变照护安排。", "care_plan_changes", "health_or_care"),
      freshDelta("world_pressure", "world_pressure_enters_daily_life", "cthulhu_external_attention_changes_life", "封锁线外的目光", "官方解释、封锁或流言改变普通人的生活安排，异常退到背景里。", "public_story_affects_family", "external_attention"),
      freshDelta("world_pressure", "talent_subtle_manifestation", "cthulhu_subtle_talent_changes_daily_life", "轻微梦感落入日常", "梦境敏感只能轻微影响日常，让身边人产生小范围反应。", "subtle_talent_attention", "talent_subtle_manifestation"),
      freshDelta("social", "village_social_shift", "cthulhu_neighborhood_life_changes_position", "街区里的新位置", "邻里、学校和家人之间的日常关系改变了你在社区里的位置。", "neighborhood_position_changes", "village_social_life"),
      freshDelta("resource", "resource_shift", "cthulhu_household_responsibility_changes_life", "家中交给你的事", "家人交给你一件新的日常责任，用普通生活压住异常带来的不安。", "household_duty_changes", "household_responsibility"),
      freshDelta("health", "health_shift", "cthulhu_body_growth_changes_daily_range", "身体反应的新边界", "身体承载和行动范围被重新观察，日常活动因此调整。", "body_capacity_changes", "body_growth"),
    ];
  }
  if (worldId === "wasteland") {
    return [
      freshDelta("family", "family_route_decision", "wasteland_family_boundary_changes_life", "照护者的新规矩", "照护者为了安全重新划定你的活动范围和家庭边界。", "guardian_boundary_changes", "family_boundary"),
      freshDelta("resource", "resource_shift", "wasteland_household_responsibility_changes_life", "取水名单上的名字", "营地资源变化让你承担新的日常责任或辅助任务。", "resource_duty_changes", "household_responsibility"),
      freshDelta("education", "education_shift", "wasteland_learning_path_changes_life", "旧世界课程的碎片", "学习安排转向识字、修理或求生知识，改变你能接触的人和工具。", "learning_path_adjusted", "learning_path"),
      freshDelta("social", "social_reputation_shift", "wasteland_peer_relationship_changes_life", "孩子们的队伍", "同龄孩子因为资源、危险或传闻改变对你的态度。", "peer_status_changes", "peer_relationship"),
      freshDelta("relationship", "relationship_shift", "wasteland_mentor_attention_changes_life", "营地长辈的注意", "一位营地长辈改变对你的看法，提出新的帮助、条件或限制。", "mentor_attention_changes", "mentor_attention"),
      freshDelta("health", "health_shift", "wasteland_body_growth_changes_daily_range", "身体能承受的距离", "身体成长或疲惫改变你能参与的任务和行动范围。", "body_capacity_changes", "body_growth"),
      freshDelta("health", "health_shift", "wasteland_care_plan_changes_life", "伤病后的照护安排", "伤病、污染或体力变化迫使营地重新安排照护。", "care_plan_changes", "health_or_care"),
      freshDelta("social", "village_social_shift", "wasteland_camp_social_life_changes_position", "营地里的新位置", "营地日常关系和名声改变了你在群体里的位置。", "camp_position_changes", "village_social_life"),
      freshDelta("world_pressure", "talent_subtle_manifestation", "wasteland_subtle_talent_changes_daily_life", "异常适应的小迹象", "适应体质只能以轻微日常迹象出现，引来有限关注。", "subtle_talent_attention", "talent_subtle_manifestation"),
      freshDelta("world_pressure", "world_pressure_enters_daily_life", "wasteland_external_attention_changes_life", "警戒线内外", "外部威胁改变巡逻、取水或孩子活动范围。", "security_rules_change", "external_attention"),
    ];
  }
  return [
    freshDelta("family", "family_route_decision", "family_decides_new_life_route", "家里的新安排", "父母不再只是重复禁令，而是为主角决定新的生活路线。", "family_route_pressure", "family_boundary"),
    freshDelta("resource", "resource_shift", "household_responsibility_changes_life", "家务里的新责任", "家中给主角安排新的日常责任，让普通生活先发生具体变化。", "household_duty_changes", "household_responsibility"),
    freshDelta("education", "education_shift", "learning_path_changes_life", "新的学习安排", "家人或村中长辈给主角安排新的学习路径，旧线索只作为心里的暗流。", "learning_path_adjusted", "learning_path"),
    freshDelta("social", "social_reputation_shift", "peer_relationship_changes_life", "同龄人的新眼光", "同龄人因为传闻、表现或家中安排改变了与主角的相处方式。", "peer_status_changes", "peer_relationship"),
    freshDelta("relationship", "relationship_shift", "trusted_relationship_changes_life", "可信之人的介入", "一个已经认识的人改变立场、提出帮助或提出条件，让旧压力进入新的关系阶段。", "relationship_boundary_changes", "mentor_attention"),
    freshDelta("health", "health_shift", "body_growth_changes_daily_range", "身体成长留下痕迹", "身体、精力或行动范围的变化让家人重新安排主角能做和不能做的事。", "body_capacity_changes", "body_growth"),
    freshDelta("health", "health_shift", "care_plan_changes_life", "照护方式改变", "睡眠、体温或精神状态被家人认真看见，照护和休养安排因此发生变化。", "care_plan_changes", "health_or_care"),
    freshDelta("social", "village_social_shift", "village_daily_life_changes_position", "村里日常的新位置", "村中日常、邻里关系和名声改变了主角在普通生活里的位置。", "village_position_changes", "village_social_life"),
    freshDelta("world_pressure", "talent_subtle_manifestation", "minor_talent_changes_daily_life", "轻微异样落到日常", "天赋只能以轻微方式影响日常，它不能成为大开大合的奇遇，却会改变身边人的小反应。", "subtle_talent_attention", "talent_subtle_manifestation"),
    freshDelta("institution", "external_attention", "outside_attention_changes_daily_life", "外来目光改变日常", "外部力量或陌生目光的到来让家庭、村里或学习安排都不能再照旧运转。", "outside_attention_changes", "external_attention"),
  ];
}

function buildForbiddenEventShapes({ storyState, recentEventShapes }) {
  const shapes = new Set();
  for (const item of storyState.forbiddenRepeats ?? []) {
    if (typeof item === "string" && isKnownEventShape(item)) shapes.add(item);
    if (item?.shapeId && isKnownEventShape(item.shapeId)) shapes.add(item.shapeId);
  }
  for (const repeated of repeatedShapes(recentEventShapes)) {
    if (isKnownEventShape(repeated)) shapes.add(repeated);
  }
  return [...shapes];
}

function isKnownEventShape(value) {
  return value === FORBIDDEN_PLACE_SHAPE || Object.hasOwn(SHAPE_DOMAINS, value);
}

function recentShapes(run, limit = 4) {
  return (run?.eventHistory ?? [])
    .slice(-limit)
    .map((event) => event?.event?.eventShape ?? inferEventShape(event))
    .filter(Boolean);
}

function inferEventShape(event) {
  const text = [
    event?.playerText?.title,
    event?.playerText?.body,
    ...(event?.choices ?? []).map((choice) => choice.text),
  ].filter(Boolean).join("\n");
  for (const [shape, detector] of STALE_SHAPE_DETECTORS) {
    if (detector(text)) return shape;
  }
  return "";
}

function repeatedShapes(shapes) {
  const repeated = new Set();
  for (let index = 1; index < shapes.length; index += 1) {
    if (shapes[index] && shapes[index] === shapes[index - 1]) repeated.add(shapes[index]);
  }
  const counts = new Map();
  for (const shape of shapes) counts.set(shape, (counts.get(shape) ?? 0) + 1);
  for (const [shape, count] of counts) {
    if (count >= 3) repeated.add(shape);
  }
  return [...repeated];
}

function threadAtStage(threads, threadId, stage) {
  return threads.some((thread) => thread.threadId === threadId && thread.stage === stage);
}

function forcedAnnualDomain({ run, facts, threads } = {}) {
  const hasBiyunSelection = facts?.has?.("biyun_selection_invited")
    || threadAtStage(threads ?? [], "biyun_selection", "pending");
  const hasSpiritBeastPressure = facts?.has?.("spirit_beast_non_hostile_confirmed")
    || threadAtStage(threads ?? [], "bamboo_forest_spirit_beast", "non_hostile_confirmed");
  if (run?.worldId === "cultivation" && (hasBiyunSelection || hasSpiritBeastPressure)) return "institution";
  return "";
}

function buildThreeLayerFocus({ run, primaryDelta, backgroundThreads, curriculumPlan, secondaryAxis } = {}) {
  return {
    lifeBase: {
      domain: curriculumPlan.curriculumSlot,
      role: "primary",
      requiredHumanDelta: curriculumPlan.requiredHumanDelta,
    },
    worldFlavor: {
      element: worldFlavorFor(run?.worldId, primaryDelta, secondaryAxis),
      intensity: primaryDelta.domain === "institution" ? "medium" : "low",
      role: "secondary",
    },
    consequenceEcho: {
      source: backgroundThreads?.[0] ?? "",
      role: "background_only",
    },
  };
}

function buildAnnualAgenda({ age, curriculumPlan, primaryDelta, selectedAxes, topicProfile, forbiddenTopics, threeLayerFocus } = {}) {
  return {
    age,
    lifeStage: curriculumPlan.lifeStage,
    curriculumSlot: curriculumPlan.curriculumSlot,
    requiredHumanDelta: curriculumPlan.requiredHumanDelta,
    primaryDeltaShape: primaryDelta.eventShape,
    primaryAxis: selectedAxes.primaryAxis,
    secondaryAxis: selectedAxes.secondaryAxis,
    topicFamily: topicProfile.topicFamily,
    arena: topicProfile.arena,
    forbiddenTopicFamilies: [...new Set(forbiddenTopics.map((topic) => topic.topicFamily).filter(Boolean))],
    threeLayerFocus,
  };
}

function worldFlavorFor(worldId, primaryDelta, secondaryAxis) {
  if (primaryDelta?.domain === "institution") return "institution_attention";
  if (secondaryAxis === "talentManifestation") return "subtle_talent_manifestation";
  if (worldId === "cthulhu") return "ordinary_abnormality";
  if (worldId === "wasteland") return "survival_pressure";
  return "cultivation_background_echo";
}

function chooseBackgroundThreads({ threads, facts, primaryDelta }) {
  const ids = new Set();
  for (const thread of threads ?? []) {
    if (thread?.threadId) ids.add(thread.threadId);
  }
  if (facts.has("cave_jade_slip_found")) ids.add("jade_slip");
  if (facts.has("parents_ban_mountain_access")) ids.add("parents_ban");
  if (primaryDelta.eventShape === INSTITUTION_ARRIVAL_SHAPE) {
    ids.add("bamboo_forest_spirit_beast");
    ids.add("jade_slip");
  }
  return [...ids];
}

function requiredStateChangesFor(primaryDelta, age, curriculumSlot = "") {
  if (primaryDelta.eventShape === INSTITUTION_ARRIVAL_SHAPE) {
    return [
      "biyun_disciple_arrived",
      "selection_delay_explained",
      "parents_must_decide_how_much_to_disclose",
      `annual_curriculum_${curriculumSlot}`,
    ];
  }
  return [
    `annual_delta_${primaryDelta.type}`,
    `annual_domain_${primaryDelta.domain}`,
    `annual_curriculum_${curriculumSlot}`,
    `annual_age_${age}_${primaryDelta.eventShape}`,
  ];
}

function requiredTextSignalsFor(primaryDelta) {
  if (primaryDelta.eventShape === INSTITUTION_ARRIVAL_SHAPE) {
    return ["碧云宗", "外门弟子", "选拔", "灵兽"];
  }
  return [primaryDelta.title, primaryDelta.description];
}

function purposeFor(primaryDelta) {
  if (primaryDelta.eventShape === INSTITUTION_ARRIVAL_SHAPE) {
    return "resolve_pending_institution_pressure";
  }
  return `advance_${primaryDelta.type}`;
}

function axisPreferenceFor(domain) {
  return {
    family: "lifePressure",
    education: "lifePressure",
    social: "npcRelationship",
    institution: "worldOpportunity",
    resource: "lifePressure",
    health: "lifePressure",
    relationship: "npcRelationship",
    route: "choiceConsequence",
    world_pressure: "worldOpportunity",
  }[domain] ?? "choiceConsequence";
}

export function detectStaleAnnualEventShape(text) {
  for (const [shape, detector] of STALE_SHAPE_DETECTORS) {
    if (detector(text)) return shape;
  }
  return "";
}

export function looksLikeSecretReturnToForbiddenPlace(text) {
  const value = String(text ?? "");
  return /(再次|又一次|再度|继续|趁).{0,40}(偷跑|偷偷|溜去|潜入|回到).{0,60}(后山|竹林|禁地|洞府|医院|仓库|藏经阁)/s.test(value)
    || /(父亲外出|母亲午睡|看管松动|无人看管).{0,80}(偷跑|偷偷|溜去|潜入).{0,80}(后山|竹林|禁地|洞府|医院|仓库|藏经阁)/s.test(value);
}

function looksLikeFamilyLockdownReasserted(text) {
  const value = String(text ?? "");
  return /(父母|父亲|母亲|家里|监护人).{0,50}(又一次|再次|再度|仍然|继续|依旧).{0,70}(禁令|限制|不让|看得很紧|锁|门闩|堵住|不许离开)/s.test(value)
    || /(禁令|限制|看管).{0,40}(又一次|再次|仍然|继续|加重|更紧)/s.test(value);
}

function looksLikeEducationRoutineWithoutDelta(text) {
  const value = String(text ?? "");
  return /(村塾|学堂|学校|先生|功课|抄书|练字|背书|药书).{0,50}(又|仍然|继续|依旧|每天).{0,80}(抄|背|练字|旧课|功课|没有新的变化)/s.test(value)
    || /(村塾|学堂|学校|先生|功课|抄书|练字|背书|药书).{0,120}(没有新的变化|只是重复|旧课)/s.test(value);
}

function looksLikeResourceShortageWithoutDelta(text) {
  const value = String(text ?? "");
  return /(口粮|水源|物资|补给|燃料|药品).{0,50}(又|再次|仍然|继续|依旧|不够|短缺).{0,80}(分配|争吵|争执|短缺|不够|没有新的变化)/s.test(value)
    || /(营地).{0,40}(资源|物资|水).{0,40}(又|再次|仍然|继续|短缺|不够)/s.test(value)
    || /(口粮|水源|物资|补给|燃料|药品|营地).{0,120}(没有新的变化|只是重复|依旧不够)/s.test(value);
}

function looksLikeHealthStagnationWithoutChange(text) {
  const value = String(text ?? "");
  return /(病|伤|发热|咳嗽|虚弱|污染|辐射|噩梦|头痛).{0,50}(又|再次|仍然|继续|依旧).{0,80}(休养|拖着|没有好转|反复|照旧)/s.test(value);
}

function looksLikeRelationshipStalemate(text) {
  const value = String(text ?? "");
  return /(关系|朋友|同伴|父母|父亲|母亲|邻居|同龄人).{0,50}(又|再次|仍然|继续|依旧).{0,80}(冷战|僵持|误会|疏远|不说话|不理解)/s.test(value);
}

function looksLikeSocialRumorWithoutDelta(text) {
  const value = String(text ?? "");
  return /(村民|邻居|同学|街坊|众人|传闻|流言|目光|议论).{0,50}(又|再次|仍然|继续|依旧).{0,80}(议论|传开|盯着|疏远|窃窃私语|没有新的变化)/s.test(value);
}

function looksLikeRouteIndecisionRepeated(text) {
  const value = String(text ?? "");
  return /(要不要|是否|去留|路线|道路|方向|选择).{0,50}(又|再次|仍然|继续|依旧|迟迟).{0,80}(犹豫|没有决定|悬着|拿不定|纠结)/s.test(value);
}

function looksLikeWorldPressureWithoutResolution(text) {
  const value = String(text ?? "");
  return /(宗门|官方|营地|巡逻|封锁|搜查|异象|怪事|兽患|污染区).{0,50}(又|再次|仍然|继续|依旧|迟迟).{0,80}(没有来|没有结果|只是等待|没有处理|未解决|拖着)/s.test(value);
}
