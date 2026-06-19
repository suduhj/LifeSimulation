export const YEARLY_OUTCOME_SCHEMA_VERSION = "mvp.yearly_outcome.v1";

const ATTRIBUTE_KEYS = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];

export function buildAnnualOutcomeContract({ run, annualFactPackage } = {}) {
  return {
    schemaVersion: "mvp.annual_outcome_contract.v1",
    age: Number(annualFactPackage?.age ?? run?.player?.age ?? 0),
    curriculumSlot: annualFactPackage?.curriculumSlot ?? "",
    requiredHumanDelta: annualFactPackage?.requiredHumanDelta ?? "",
    topicProfile: structuredClone(annualFactPackage?.topicProfile ?? null),
  };
}

export function buildYearlyOutcome({ run, annualFactPackage, response } = {}) {
  const contract = buildAnnualOutcomeContract({ run, annualFactPackage });
  const growthImpact = growthImpactForCurriculumSlot({
    run,
    curriculumSlot: contract.curriculumSlot,
    age: contract.age,
  });
  const outcomeId = `year_${contract.age}_${contract.curriculumSlot || "annual"}`;

  return {
    schemaVersion: YEARLY_OUTCOME_SCHEMA_VERSION,
    outcomeId,
    age: contract.age,
    experienceIntent: annualFactPackage?.experienceIntent ?? annualFactPackage?.experiencePlan?.intent ?? "",
    curriculum: {
      slot: contract.curriculumSlot,
      requiredHumanDelta: contract.requiredHumanDelta,
    },
    humanOutcome: {
      type: humanOutcomeTypeForSlot(contract.curriculumSlot),
      summary: contract.requiredHumanDelta || response?.event?.eventShape || annualFactPackage?.primaryDelta?.eventShape || "",
    },
    growthImpact,
    topicImpact: {
      topicProfile: structuredClone(annualFactPackage?.topicProfile ?? null),
    },
    panelImpact: {
      playerSummaryMode: "minimal_growth",
      hiddenFields: ["currentPressure", "eventCount", "score", "storyPressure"],
    },
  };
}

export function applyYearlyOutcomeToResponse(response, yearlyOutcome) {
  if (!response || !yearlyOutcome) return response;
  const next = response;
  next.statePatch ??= {};
  next.statePatch.growthEvidenceChanges = [
    ...(Array.isArray(next.statePatch.growthEvidenceChanges) ? next.statePatch.growthEvidenceChanges : []),
    ...yearlyOutcome.growthImpact.realizedGrowth,
  ];
  next.statePatch.exposureChanges = [
    ...(Array.isArray(next.statePatch.exposureChanges) ? next.statePatch.exposureChanges : []),
    ...yearlyOutcome.growthImpact.exposureGrowth,
  ];
  next.statePatch.yearlyOutcomes = [
    ...(Array.isArray(next.statePatch.yearlyOutcomes) ? next.statePatch.yearlyOutcomes : []),
    yearlyOutcome,
  ];
  return next;
}

export function growthImpactForCurriculumSlot({ run, curriculumSlot, age = 0 } = {}) {
  const highestPotential = highestPotentialAttribute(run);
  const one = (attribute, source, reason) => evidence(attribute, 1, source, reason, age);
  const expose = (attribute, amount, source, reason) => exposure(attribute, amount, source, reason);

  switch (curriculumSlot) {
    case "learning_path":
      return impact({
        realizedGrowth: [one("intelligence", "annual_learning_path", "new learning path steadily trains understanding")],
        exposureGrowth: [expose("intelligence", 1, "annual_learning_path", "learning performance becomes easier for mentors to notice")],
      });
    case "household_responsibility":
      return impact({
        realizedGrowth: [
          one("constitution", "annual_household_responsibility", "daily chores steadily train endurance"),
          one("familyBackground", "annual_household_responsibility", "household responsibility strengthens family footing"),
        ],
      });
    case "peer_relationship": {
      const attribute = peerGrowthAttribute(run);
      return impact({
        realizedGrowth: [one(attribute, "annual_peer_relationship", "peer relationship changes shape social presence")],
        exposureGrowth: [expose(attribute, 1, "annual_peer_relationship", "peer attention makes the trait more visible")],
      });
    }
    case "body_growth":
      return impact({
        realizedGrowth: [evidence("constitution", 2, "annual_body_growth", "body growth expands daily capacity", age)],
      });
    case "health_or_care":
      return impact({
        realizedGrowth: [one("constitution", "annual_health_or_care", "care and recovery stabilize the body")],
      });
    case "talent_subtle_manifestation":
      return impact({
        realizedGrowth: [one(highestPotential, "annual_talent_subtle_manifestation", "subtle manifestation converts potential into stable expression")],
        exposureGrowth: [expose(highestPotential, 2, "annual_talent_subtle_manifestation", "subtle manifestation draws focused attention")],
      });
    case "external_attention":
      return impact({
        realizedGrowth: [],
        exposureGrowth: [expose(highestPotential, 2, "annual_external_attention", "external attention raises visible scrutiny")],
      });
    case "family_boundary": {
      const attribute = comparePotential(run, "intelligence", "luck") >= 0 ? "intelligence" : "luck";
      return impact({
        realizedGrowth: [one(attribute, "annual_family_boundary", "family boundaries train judgment and restraint")],
      });
    }
    case "village_social_life":
      return impact({
        realizedGrowth: [one("luck", "annual_village_social_life", "daily social life opens small opportunities")],
        exposureGrowth: [expose("luck", 1, "annual_village_social_life", "village attention notices the change")],
      });
    case "mentor_attention":
      return impact({
        realizedGrowth: [one("intelligence", "annual_mentor_attention", "mentor attention improves learning direction")],
        exposureGrowth: [expose("intelligence", 1, "annual_mentor_attention", "mentor attention increases visible scrutiny")],
      });
    default:
      return impact({
        realizedGrowth: [one("intelligence", "annual_general_growth", "ordinary yearly change becomes stable experience")],
        exposureGrowth: [],
      });
  }
}

function impact({ realizedGrowth = [], exposureGrowth = [], potentialGrowth = [], noGrowthReason = "" } = {}) {
  const hasImpact = realizedGrowth.length > 0 || exposureGrowth.length > 0 || potentialGrowth.length > 0;
  return {
    realizedGrowth,
    exposureGrowth,
    potentialGrowth,
    noGrowthReason: hasImpact ? noGrowthReason : noGrowthReason || "annual outcome recorded narrative or relationship change without numeric growth",
  };
}

function evidence(attribute, amount, source, reason, age) {
  return {
    attribute,
    amount,
    source,
    reason,
    age,
  };
}

function exposure(attribute, amount, source, reason) {
  return {
    target: attribute,
    amount,
    source,
    reason,
  };
}

function highestPotentialAttribute(run) {
  const entries = Object.entries(run?.player?.growthLedger?.attributes ?? {})
    .filter(([key]) => ATTRIBUTE_KEYS.includes(key) && key !== "familyBackground")
    .sort((a, b) => (b[1]?.potential ?? 0) - (a[1]?.potential ?? 0));
  return entries[0]?.[0] ?? "intelligence";
}

function peerGrowthAttribute(run) {
  return comparePotential(run, "appearance", "luck") >= 0 ? "appearance" : "luck";
}

function comparePotential(run, left, right) {
  const attributes = run?.player?.growthLedger?.attributes ?? {};
  return (attributes[left]?.potential ?? 0) - (attributes[right]?.potential ?? 0);
}

function humanOutcomeTypeForSlot(slot) {
  return {
    learning_path: "learning_path_changed",
    household_responsibility: "household_responsibility_changed",
    peer_relationship: "peer_relationship_changed",
    body_growth: "body_growth_changed",
    health_or_care: "care_plan_changed",
    talent_subtle_manifestation: "talent_subtly_manifested",
    external_attention: "external_attention_changed",
    family_boundary: "family_boundary_changed",
    village_social_life: "village_social_life_changed",
    mentor_attention: "mentor_attention_changed",
  }[slot] ?? "annual_life_changed";
}
