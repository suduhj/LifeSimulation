import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  createInitialRun,
  createPlaySession,
  generateChoiceResolution,
  generateMockLifeEvent,
  handlePlayerInput,
  loadMvpWorlds,
  recordSimulationOutcome,
  buildActionIntent,
  simulateActionOutcome,
  buildNextEventContract,
  validateStoryContract,
} from "../src/index.js";

describe("state-first story continuity", () => {
  it("records closed facts and next pressure after a jade talisman action", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    const sourceEvent = jadeTalismanEvent(run);
    const afterEvent = applyAiResponseToRun(run, sourceEvent);
    const intent = buildActionIntent({
      run: afterEvent,
      sourceEvent,
      action: { kind: "choice", choiceId: "choice_1" },
    });

    const outcome = simulateActionOutcome({
      run: afterEvent,
      sourceEvent,
      action: { kind: "choice", choiceId: "choice_1" },
      intent,
    });
    const withStoryState = recordSimulationOutcome(afterEvent, outcome);

    assert.equal(intent.intentId, "ask_guardian_about_jade_talisman");
    assert.ok(withStoryState.worldState.storyState.closedFacts.includes("jade_talisman_first_discovery"));
    assert.ok(withStoryState.worldState.storyState.facts.includes("father_identified_jade_as_spirit_marker"));
    assert.ok(withStoryState.worldState.storyState.facts.includes("mother_fears_cultivation_path"));
    assert.deepEqual(
      withStoryState.worldState.storyState.threads.find((thread) => thread.threadId === "jade_talisman"),
      {
        threadId: "jade_talisman",
        stage: "identified",
        nextPressure: "family_blocks_mountain_access",
        updatedAge: afterEvent.player.age,
      },
    );
  });

  it("builds a director contract that carries the jade thread as background without rediscovering it", () => {
    const worlds = loadMvpWorlds();
    let run = createCultivationRun(worlds);
    run.player.age = 7;
    run = recordSimulationOutcome(run, {
      factsAdded: ["father_identified_jade_as_spirit_marker", "mother_fears_cultivation_path"],
      factsClosed: ["jade_talisman_first_discovery"],
      forbiddenRepeats: ["forest_jade_object_footsteps_choice_skeleton"],
      threadUpdates: [{
        threadId: "jade_talisman",
        stage: "identified",
        nextPressure: "family_blocks_mountain_access",
      }],
    });

    const contract = buildNextEventContract({ run, worlds });

    assert.equal(contract.sceneType, "annual_state_transition");
    assert.ok(contract.annualFactPackage);
    assert.ok(contract.backgroundThreads.includes("jade_talisman"));
    assert.ok(contract.annualFactPackage.freshnessRules.mustHaveNewYearlyDelta);
    assert.ok(contract.mustNotInclude.includes("再次首次发现玉片"));
    assert.ok(contract.mustNotInclude.includes("再次询问玉片是什么"));
    assert.ok(contract.forbiddenSceneSkeletons.includes("forest_jade_object_footsteps_choice_skeleton"));
    assert.ok(contract.choiceIntents.length > 0);
  });

  it("rejects a next event that reopens a closed jade-talisman discovery", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    const contract = {
      threadId: "jade_talisman",
      closedFacts: ["jade_talisman_first_discovery"],
      mustNotInclude: ["再次首次发现玉片", "再次询问玉片是什么"],
      forbiddenSceneSkeletons: ["forest_jade_object_footsteps_choice_skeleton"],
    };
    const repeatedEvent = jadeTalismanEvent(run);

    const validation = validateStoryContract(repeatedEvent, contract);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("closed fact jade_talisman_first_discovery")));
    assert.ok(validation.errors.some((error) => error.includes("forest_jade_object_footsteps_choice_skeleton")));
  });

  it("mock fallback consumes the story contract instead of repeating the forest jade object scene", () => {
    const worlds = loadMvpWorlds();
    let run = createCultivationRun(worlds);
    run.player.age = 7;
    run = recordSimulationOutcome(run, {
      factsAdded: ["father_identified_jade_as_spirit_marker", "mother_fears_cultivation_path"],
      factsClosed: ["jade_talisman_first_discovery"],
      forbiddenRepeats: ["forest_jade_object_footsteps_choice_skeleton"],
      threadUpdates: [{
        threadId: "jade_talisman",
        stage: "identified",
        nextPressure: "family_blocks_mountain_access",
      }],
    });
    const eventContract = buildNextEventContract({ run, worlds });

    const nextEvent = generateMockLifeEvent({ run, worlds, seed: 42, eventContract });

    assert.match(nextEvent.playerText.body, /这一年真正改变生活|新的年度岔口|旧线索/);
    assert.doesNotMatch(nextEvent.playerText.body, /草丛里露出一枚暗红色的小珠/);
    assert.doesNotMatch(nextEvent.playerText.body, /林外传来脚步声/);
    assert.ok(nextEvent.choices.every((choice) => !/小珠|脚步声/.test(choice.text)));
  });

  it("play session advances from a resolved jade scene into a new family pressure", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    let session = createPlaySession({ run, worlds, seed: 100, endingAge: 99 });
    session = handlePlayerInput({ session, input: "start" });
    const forcedEvent = jadeTalismanEvent(session.currentRun);
    const forcedRun = applyAiResponseToRun(session.currentRun, forcedEvent);
    session = {
      ...session,
      currentRun: forcedRun,
      currentEvent: forcedEvent,
      openingPhase: "first_branch",
    };

    const next = handlePlayerInput({ session, input: "1" });

    assert.ok(next.currentRun.worldState.storyState.closedFacts.includes("jade_talisman_first_discovery"));
    assert.match(next.currentEvent.playerText.body, /玉片已被收起|父母限制|后山/);
    assert.doesNotMatch(next.currentEvent.playerText.body, /草丛里露出一枚暗红色的小珠/);
    assert.ok(next.currentEvent.choices.every((choice) => !/小珠|脚步声/.test(choice.text)));
  });
});

function createCultivationRun(worlds) {
  return createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260618,
    playerProfile: { name: "林岚", gender: "female", personality: "curious" },
  });
}

function jadeTalismanEvent(run) {
  const event = generateMockLifeEvent({ run, worlds: worldsStub(), seed: 1 });
  return {
    ...event,
    runId: run.runId,
    worldId: run.worldId,
    turnId: `turn_jade_${run.eventHistory.length + 1}`,
    timeSpan: { ageStart: run.player.age, ageEnd: run.player.age, yearsElapsed: 0, pace: "scene_or_short_stage" },
    playerText: {
      ...event.playerText,
      title: `${run.player.age} 岁：山林中的异样`,
      body: "你随家人到村边山林取柴，草丛里露出一枚暗红色的小珠。母亲先看见它，脸色变了一下，低声让你不要乱碰；父亲却听见林外传来脚步声，担心有人也冲着这东西而来。你心里隐约明白，这枚小珠和林外的动静都不寻常。",
    },
    choices: [
      {
        id: "choice_1",
        text: "先靠近照看你的大人，把看到的异物和林外脚步告诉对方，让家人判断该不该声张。",
        intentTags: ["family", "jade_talisman"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "小心把注意力放在那枚暗红小珠上，不急着触碰，先观察它有没有光泽、温度或奇怪动静。",
        intentTags: ["observe", "jade_talisman"],
        fuzzySuccessLabel: "结果难以判断",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "转头看向林外的脚步声，试着分辨来的是熟人、路人还是可能与这枚珠子有关的人。",
        intentTags: ["listen", "jade_talisman"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
    ],
  };
}

function worldsStub() {
  return loadMvpWorlds();
}
