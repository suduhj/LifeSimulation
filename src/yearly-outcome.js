export const YEARLY_OUTCOME_SCHEMA_VERSION = "mvp.yearly_outcome.v1";
export const ANNUAL_OUTCOME_CONTRACT_SCHEMA_VERSION = "mvp.annual_outcome_contract.v1";

const PANEL_HIDDEN_FIELDS = [
  "currentPressure",
  "eventCount",
  "score",
  "storyPressure",
];

const SLOT_IMPACTS = {
  learning_path: {
    realizedGrowth: [
      growthEvidence("intelligence", 1, "annual_learning_path", "新的学习路径让理解和记忆能力得到稳定锻炼"),
    ],
    exposureGrowth: [
      exposureEvidence("intelligence", 1, "annual_learning_path", "学习表现更容易被师长注意"),
    ],
  },
  household_responsibility: {
    realizedGrowth: [
      growthEvidence("constitution", 1, "annual_household_responsibility", "长期承担家务让根骨与体力得到稳定锻炼"),
    ],
    potentialGrowth: [
      potentialEvidence("familyBackground", 1, "annual_household_responsibility", "新的家庭责任让出身底蕴更具体地转化为可用资源"),
    ],
  },
  peer_relationship: {
    realizedGrowth: [
      growthEvidence("appearance", 1, "annual_peer_relationship", "同龄关系变化让仙姿与外在气度更容易被看见"),
    ],
    exposureGrowth: [
      exposureEvidence("appearance", 1, "annual_peer_relationship", "同龄人的态度变化提高了外界关注"),
    ],
  },
  body_growth: {
    realizedGrowth: [
      growthEvidence("constitution", 2, "annual_body_growth", "身体成长让根骨与承载力自然增强"),
    ],
  },
  health_or_care: {
    realizedGrowth: [
      growthEvidence("constitution", 1, "annual_health_or_care", "照护和休养让身体承载更稳定"),
    ],
  },
  family_boundary: {
    realizedGrowth: [
      growthEvidence("intelligence", 1, "annual_family_boundary", "家庭边界变化让你更早学会观察与判断"),
    ],
  },
  village_social_life: {
    realizedGrowth: [
      growthEvidence("luck", 1, "annual_village_social_life", "村中日常位置变化带来更好的机缘流动"),
    ],
    exposureGrowth: [
      exposureEvidence("luck", 1, "annual_village_social_life", "日常社交变化让更多人注意到你"),
    ],
  },
  mentor_attention: {
    realizedGrowth: [
      growthEvidence("intelligence", 1, "annual_mentor_attention", "师长关注让理解和学习方法得到稳定锻炼"),
    ],
    exposureGrowth: [
      exposureEvidence("intelligence", 1, "annual_mentor_attention", "师长关注提高了外界对你悟性的注意"),
    ],
  },
};

export function buildAnnualOutcomeContract({ run, annualFactPackage } = {}) {
  const slot = annualFactPackage?.curriculumSlot ?? "";
  return {
    schemaVersion: ANNUAL_OUTCOME_CONTRACT_SCHEMA_VERSION,
    age: Number(annualFactPackage?.age ?? run?.player?.age ?? 0),
    curriculum: {
      slot,
      requiredHumanDelta: annualFactPackage?.requiredHumanDelta ?? "",
    },
    expectedHumanOutcome: {
      type: `${slot || "annual"}_changed`,
      summary: annualFactPackage?.requiredHumanDelta ?? annualFactPackage?.primaryDelta?.description ?? "",
    },
    expectedGrowthImpact: growthImpactForCurriculumSlot({ slot, run }),
    topicImpact: {
      topicProfile: normalizeTopicProfile(annualFactPackage?.topicProfile),
    },
    panelImpact: defaultPanelImpact(),
  };
}

export function buildYearlyOutcome({ run, annualFactPackage, response } = {}) {
  const contract = buildAnnualOutcomeContract({ run, annualFactPackage });
  const slot = contract.curriculum.slot || "annual";
  return {
    schemaVersion: YEARLY_OUTCOME_SCHEMA_VERSION,
    outcomeId: `year_${contract.age}_${slot}`,
    age: contract.age,
    curriculum: contract.curriculum,
    humanOutcome: {
      type: contract.expectedHumanOutcome.type,
      summary: summarizeHumanOutcome({ annualFactPackage, response }),
    },
    growthImpact: contract.expectedGrowthImpact,
    topicImpact: contract.topicImpact,
    panelImpact: contract.panelImpact,
  };
}

export function growthImpactForCurriculumSlot({ slot, run } = {}) {
  if (slot === "talent_subtle_manifestation") {
    const attribute = highestPotentialAttribute(run);
    return {
      realizedGrowth: [
        growthEvidence(attribute, 1, "annual_talent_subtle_manifestation", "天赋以轻微日常表现兑现了一点潜能"),
      ],
      exposureGrowth: [
        exposureEvidence(attribute, 2, "annual_talent_subtle_manifestation", "天赋的细微异常更容易被外界察觉"),
      ],
      potentialGrowth: [],
    };
  }

  if (slot === "external_attention") {
    return {
      realizedGrowth: [],
      exposureGrowth: [
        exposureEvidence(highestPotentialAttribute(run), 2, "annual_external_attention", "外界注意增强，但这一年主要改变的是暴露度而非能力"),
      ],
      potentialGrowth: [],
    };
  }

  return normalizeGrowthImpact(SLOT_IMPACTS[slot] ?? {
    realizedGrowth: [],
    exposureGrowth: [],
    potentialGrowth: [],
  });
}

export function applyYearlyOutcomeToResponse(response, yearlyOutcome) {
  if (!response || !yearlyOutcome) return response;
  const next = structuredClone(response);
  next.statePatch ??= {};
  next.statePatch.growthEvidenceChanges = [
    ...(Array.isArray(next.statePatch.growthEvidenceChanges) ? next.statePatch.growthEvidenceChanges : []),
    ...yearlyOutcome.growthImpact.realizedGrowth.map((item) => ({ ...item })),
  ];
  next.statePatch.exposureChanges = [
    ...(Array.isArray(next.statePatch.exposureChanges) ? next.statePatch.exposureChanges : []),
    ...yearlyOutcome.growthImpact.exposureGrowth.map((item) => ({
      target: item.attribute,
      amount: item.amount,
      source: item.source,
      reason: item.reason,
    })),
  ];
  next.statePatch.attributeChanges = [
    ...(Array.isArray(next.statePatch.attributeChanges) ? next.statePatch.attributeChanges : []),
    ...yearlyOutcome.growthImpact.potentialGrowth.map((item) => ({
      target: item.attribute,
      amount: item.amount,
      source: item.source,
      reason: item.reason,
      sourceLayer: "growthBonus",
      applyToPotential: true,
      applyToManifested: true,
    })),
  ];
  next.internal ??= {};
  next.internal.validationFlags = [
    ...new Set([
      ...(Array.isArray(next.internal.validationFlags) ? next.internal.validationFlags : []),
      "yearly_outcome_ledger",
      "engine_owned_growth_impact",
    ]),
  ];
  return next;
}

export function normalizeYearlyOutcomes(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeYearlyOutcome).filter(Boolean).slice(-24);
}

export function addYearlyOutcomes(storyState, outcomes = []) {
  const current = normalizeYearlyOutcomes(storyState.yearlyOutcomes);
  for (const outcome of outcomes ?? []) {
    const normalized = normalizeYearlyOutcome(outcome);
    if (!normalized) continue;
    const existing = current.find((item) => item.outcomeId === normalized.outcomeId);
    if (existing) Object.assign(existing, normalized);
    else current.push(normalized);
  }
  storyState.yearlyOutcomes = current.slice(-24);
}

export function normalizeYearlyOutcome(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const age = Number.isFinite(value.age) ? Math.floor(value.age) : 0;
  const slot = typeof value.curriculum?.slot === "string" ? value.curriculum.slot : "";
  if (!slot) return undefined;
  return {
    schemaVersion: value.schemaVersion ?? YEARLY_OUTCOME_SCHEMA_VERSION,
    outcomeId: typeof value.outcomeId === "string" && value.outcomeId
      ? value.outcomeId
      : `year_${age}_${slot}`,
    age,
    curriculum: {
      slot,
      requiredHumanDelta: typeof value.curriculum?.requiredHumanDelta === "string"
        ? value.curriculum.requiredHumanDelta
        : "",
    },
    humanOutcome: {
      type: typeof value.humanOutcome?.type === "string" ? value.humanOutcome.type : `${slot}_changed`,
      summary: typeof value.humanOutcome?.summary === "string" ? value.humanOutcome.summary : "",
    },
    growthImpact: normalizeGrowthImpact(value.growthImpact),
    topicImpact: {
      topicProfile: normalizeTopicProfile(value.topicImpact?.topicProfile),
    },
    panelImpact: {
      playerSummaryMode: value.panelImpact?.playerSummaryMode ?? "minimal_growth",
      hiddenFields: Array.isArray(value.panelImpact?.hiddenFields)
        ? value.panelImpact.hiddenFields.filter(Boolean)
        : [...PANEL_HIDDEN_FIELDS],
    },
  };
}

function normalizeGrowthImpact(value = {}) {
  return {
    realizedGrowth: normalizeGrowthList(value.realizedGrowth),
    exposureGrowth: normalizeGrowthList(value.exposureGrowth),
    potentialGrowth: normalizeGrowthList(value.potentialGrowth),
  };
}

function normalizeGrowthList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item?.attribute) return undefined;
      return {
        attribute: item.attribute,
        amount: Number.isFinite(item.amount) ? item.amount : 0,
        source: item.source ?? "annual_outcome",
        reason: item.reason ?? "",
      };
    })
    .filter((item) => item && item.amount !== 0);
}

function summarizeHumanOutcome({ annualFactPackage, response } = {}) {
  const text = String(response?.playerText?.body ?? "").trim();
  if (text) return text.slice(0, 160);
  return annualFactPackage?.requiredHumanDelta
    ?? annualFactPackage?.primaryDelta?.description
    ?? "年度生活发生变化";
}

function normalizeTopicProfile(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return {
    age: Number.isFinite(value.age) ? Math.floor(value.age) : 0,
    topicFamily: value.topicFamily ?? "",
    arena: value.arena ?? "",
    objectFocus: value.objectFocus ?? "",
    institutionFocus: value.institutionFocus ?? "",
    pressureType: value.pressureType ?? "",
  };
}

function defaultPanelImpact() {
  return {
    playerSummaryMode: "minimal_growth",
    hiddenFields: [...PANEL_HIDDEN_FIELDS],
  };
}

function highestPotentialAttribute(run) {
  const attributes = run?.player?.growthLedger?.attributes ?? run?.player?.attributes ?? {};
  const candidates = Object.entries(attributes)
    .filter(([attribute]) => attribute !== "familyBackground")
    .map(([attribute, value]) => ({
      attribute,
      potential: Number(value?.potential ?? value?.manifested ?? 0),
    }))
    .sort((a, b) => b.potential - a.potential || a.attribute.localeCompare(b.attribute));
  return candidates[0]?.attribute ?? "intelligence";
}

function growthEvidence(attribute, amount, source, reason) {
  return { attribute, amount, source, reason };
}

function exposureEvidence(attribute, amount, source, reason) {
  return { attribute, amount, source, reason };
}

function potentialEvidence(attribute, amount, source, reason) {
  return { attribute, amount, source, reason };
}
