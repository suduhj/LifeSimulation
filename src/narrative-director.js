import { ensureStoryState } from "./story-state.js";

export function buildNextEventContract({ run, worlds } = {}) {
  const storyState = ensureStoryState(structuredClone(run));
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
