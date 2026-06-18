import { buildStoryStatePatch, ensureStoryState } from "./story-state.js";

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

  const primaryDelta = choosePrimaryDelta({
    run,
    age,
    facts,
    threads,
    forbiddenEventShapes,
    seed,
  });

  const backgroundThreads = chooseBackgroundThreads({ threads, facts, primaryDelta });
  const requiredStateChanges = requiredStateChangesFor(primaryDelta, age);
  const requiredTextSignals = requiredTextSignalsFor(primaryDelta);
  const hasRepeatedShape = forbiddenEventShapes.length > 0;
  const hasInstitutionObligation = primaryDelta.domain === "institution";

  return {
    schemaVersion: ANNUAL_FACT_PACKAGE_SCHEMA_VERSION,
    age,
    yearPurpose: purposeFor(primaryDelta),
    primaryDelta,
    requiredStateChanges,
    requiredTextSignals,
    backgroundThreads,
    forbiddenEventShapes,
    eventShapeHistory: recentEventShapes,
    freshnessRules: {
      mustHaveNewYearlyDelta: true,
      continuingThreadsMayOnlySupportPrimaryDelta: true,
      repeatedEventShapesCannotBePrimary: true,
    },
    enforcementRequired: hasRepeatedShape || hasInstitutionObligation,
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

export function applyAnnualFactPackageToResponse(response, annualFactPackage) {
  if (!response || !annualFactPackage?.primaryDelta) return response;
  const next = structuredClone(response);
  const delta = annualFactPackage.primaryDelta;
  const outcome = buildAnnualSimulationOutcome(annualFactPackage);

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
  return next;
}

function choosePrimaryDelta({ run, age, facts, threads, forbiddenEventShapes, seed }) {
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

  return fallbackFreshDelta(run?.worldId, age, seed, forbiddenEventShapes);
}

function fallbackFreshDelta(worldId, age, seed, forbiddenEventShapes = []) {
  const options = worldOptions(worldId);
  const staleDomains = new Set(forbiddenEventShapes.map((shape) => SHAPE_DOMAINS[shape]).filter(Boolean));
  const filtered = options.filter((option) => !forbiddenEventShapes.includes(option.eventShape));
  const preferred = filtered.filter((option) => !staleDomains.has(option.domain));
  const candidates = preferred.length > 0 ? preferred : filtered.length > 0 ? filtered : options;
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

function freshDelta(domain, type, eventShape, title, description, nextPressure) {
  return { domain, type, eventShape, title, description, nextPressure };
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

function requiredStateChangesFor(primaryDelta, age) {
  if (primaryDelta.eventShape === INSTITUTION_ARRIVAL_SHAPE) {
    return [
      "biyun_disciple_arrived",
      "selection_delay_explained",
      "parents_must_decide_how_much_to_disclose",
    ];
  }
  return [
    `annual_delta_${primaryDelta.type}`,
    `annual_domain_${primaryDelta.domain}`,
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
