import { buildAnnualFactPackage } from "./annual-state-transition.js";
import { ensureStoryState, selectStoryAxes } from "./story-state.js";

export function buildNextEventContract({ run, worlds, seed = 1 } = {}) {
  const storyState = ensureStoryState(structuredClone(run));
  const annualFactPackage = buildAnnualFactPackage({ run, worlds, seed });
  if (annualFactPackage) {
    return buildAnnualContract({ run, storyState, annualFactPackage, seed });
  }

  const jadeThread = storyState.threads.find((thread) => thread.threadId === "jade_talisman");
  if (run?.worldId === "cultivation" && jadeThread?.stage === "identified") {
    return {
      contractVersion: "mvp.event_contract.v1",
      age: (run.player?.age ?? 0) + 1,
      sceneType: "family_conflict",
      threadId: "jade_talisman",
      purpose: "advance_family_pressure_from_jade_talisman",
      mustInclude: ["玉片已被收起", "父母限制你靠近后山", "后山感应仍存在"],
      mustNotInclude: ["再次首次发现玉片", "再次询问玉片是什么"],
      closedFacts: storyState.closedFacts,
      forbiddenSceneSkeletons: storyState.forbiddenRepeats,
      choiceIntents: ["obey_family_restriction", "secretly_observe_mountain_pull", "negotiate_with_father"],
    };
  }
  return undefined;
}

function buildAnnualContract({ run, storyState, annualFactPackage, seed }) {
  const selectedPackage = annualFactPackage.primaryAxis
    ? annualFactPackage
    : {
        ...annualFactPackage,
        ...selectStoryAxes(storyState, {
          preferredAxis: axisPreferenceFor(annualFactPackage.primaryDelta?.domain),
          age: annualFactPackage.age,
          seed,
        }),
      };
  const delta = selectedPackage.primaryDelta;
  return {
    contractVersion: "mvp.event_contract.v1",
    age: selectedPackage.age,
    sceneType: "annual_state_transition",
    threadId: delta.eventShape,
    primaryAxis: selectedPackage.primaryAxis,
    secondaryAxis: selectedPackage.secondaryAxis,
    rankedAxes: selectedPackage.rankedAxes,
    axisSnapshot: selectedPackage.axisSnapshot,
    curriculumSlot: selectedPackage.curriculumSlot,
    requiredHumanDelta: selectedPackage.requiredHumanDelta,
    threeLayerFocus: selectedPackage.threeLayerFocus,
    topicProfile: selectedPackage.topicProfile,
    forbiddenTopicProfiles: selectedPackage.forbiddenTopicProfiles,
    annualAgenda: selectedPackage.annualAgenda,
    purpose: selectedPackage.yearPurpose,
    annualFactPackage: selectedPackage,
    mustInclude: [
      delta.title,
      delta.description,
      selectedPackage.requiredHumanDelta,
      ...selectedPackage.requiredTextSignals,
    ].filter(Boolean),
    mustNotInclude: [
      ...mustNotIncludeForClosedFacts(storyState.closedFacts),
      "再次偷跑后山",
      "又一次偷跑后山",
      "趁父亲外出母亲午睡再次去后山",
      "只是后山牵引变得更强",
      "只是父母禁令再次加重",
    ],
    closedFacts: storyState.closedFacts,
    forbiddenSceneSkeletons: storyState.forbiddenRepeats,
    forbiddenEventShapes: selectedPackage.forbiddenEventShapes,
    forbiddenTopicProfiles: selectedPackage.forbiddenTopicProfiles,
    requiredStateChanges: selectedPackage.requiredStateChanges,
    backgroundThreads: selectedPackage.backgroundThreads,
    choiceIntents: choiceIntentsFor(run?.worldId, selectedPackage),
  };
}

function mustNotIncludeForClosedFacts(closedFacts = []) {
  const phrases = [];
  if (closedFacts.includes("jade_talisman_first_discovery")) {
    phrases.push("再次首次发现玉片", "再次询问玉片是什么");
  }
  return phrases;
}

function choiceIntentsFor(worldId, annualFactPackage) {
  if (annualFactPackage.primaryDelta.eventShape === "institution_arrival_changes_life") {
    return ["observe_sect_arrival", "carefully_disclose_partial_truth", "ask_parent_to_mediate"];
  }
  if (annualFactPackage.primaryAxis === "choiceConsequence") {
    return ["reflect_on_previous_choice", "negotiate_with_family", "observe_consequence"];
  }
  if (annualFactPackage.primaryAxis === "npcRelationship") {
    return ["negotiate_with_parent", "test_trust_boundary", "seek_alliance"];
  }
  if (annualFactPackage.primaryAxis === "lifePressure") {
    return ["accept_life_pressure", "seek_better_arrangement", "protect_daily_routine"];
  }
  if (annualFactPackage.primaryAxis === "talentManifestation") {
    return ["observe_manifestation", "control_exposure", "hide_or_show_talent"];
  }
  if (annualFactPackage.primaryAxis === "worldOpportunity") {
    return ["explore_opportunity", "measure_risk", "call_on_relationships"];
  }
  if (worldId === "cthulhu") {
    return ["maintain_normal_life", "quietly_observe_social_pressure", "ask_trusted_adult"];
  }
  if (worldId === "wasteland") {
    return ["protect_basic_safety", "observe_resource_shift", "help_with_guardian_task"];
  }
  return ["accept_new_life_arrangement", "observe_background_thread", "negotiate_with_family"];
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
