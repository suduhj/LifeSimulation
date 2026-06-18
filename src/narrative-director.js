import { ensureStoryState } from "./story-state.js";
import { buildAnnualFactPackage } from "./annual-state-transition.js";

export function buildNextEventContract({ run, worlds, seed = 1 } = {}) {
  const storyState = ensureStoryState(structuredClone(run));
  const annualFactPackage = buildAnnualFactPackage({ run, worlds, seed });
  if (annualFactPackage) {
    return buildAnnualContract({ run, storyState, annualFactPackage });
  }

  const jadeThread = storyState.threads.find((thread) => thread.threadId === "jade_talisman");
  if (run?.worldId === "cultivation" && jadeThread?.stage === "identified") {
    return {
      contractVersion: "mvp.event_contract.v1",
      age: (run.player?.age ?? 0) + 1,
      sceneType: "family_conflict",
      threadId: "jade_talisman",
      purpose: "推进父母阻止主角接触修仙线索的压力",
      mustInclude: ["玉片已被收起", "父母限制你靠近后山", "后山感应仍存在"],
      mustNotInclude: ["再次首次发现玉片", "再次询问玉片是什么"],
      closedFacts: storyState.closedFacts,
      forbiddenSceneSkeletons: storyState.forbiddenRepeats,
      choiceIntents: ["obey_family_restriction", "secretly_observe_mountain_pull", "negotiate_with_father"],
    };
  }
  return undefined;
}

function buildAnnualContract({ run, storyState, annualFactPackage }) {
  const delta = annualFactPackage.primaryDelta;
  return {
    contractVersion: "mvp.event_contract.v1",
    age: annualFactPackage.age,
    sceneType: "annual_state_transition",
    threadId: delta.eventShape,
    purpose: annualFactPackage.yearPurpose,
    annualFactPackage,
    mustInclude: [
      delta.title,
      delta.description,
      ...annualFactPackage.requiredTextSignals,
    ],
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
    forbiddenEventShapes: annualFactPackage.forbiddenEventShapes,
    requiredStateChanges: annualFactPackage.requiredStateChanges,
    backgroundThreads: annualFactPackage.backgroundThreads,
    choiceIntents: choiceIntentsFor(run?.worldId, annualFactPackage),
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
  if (worldId === "cthulhu") {
    return ["maintain_normal_life", "quietly_observe_social_pressure", "ask_trusted_adult"];
  }
  if (worldId === "wasteland") {
    return ["protect_basic_safety", "observe_resource_shift", "help_with_guardian_task"];
  }
  return ["accept_new_life_arrangement", "observe_background_thread", "negotiate_with_family"];
}
