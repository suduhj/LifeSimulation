import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAnnualFactPackageToResponse,
  buildAnnualFactPackage,
  buildNextEventContract,
  createInitialRun,
  createPlaySession,
  handlePlayerInput,
  loadMvpWorlds,
  recordSimulationOutcome,
  validateStoryContract,
} from "../src/index.js";

describe("annual state transition engine", () => {
  it("selects a new yearly life delta instead of repeating the same forbidden-place scene shape", () => {
    const worlds = loadMvpWorlds();
    const run = withRepeatedForbiddenPlaceShape(createCultivationRun(worlds));

    const annualFacts = buildAnnualFactPackage({ run, worlds, seed: 20260618 });

    assert.equal(annualFacts.age, 8);
    assert.notEqual(annualFacts.primaryDelta.eventShape, "secret_return_to_forbidden_place");
    assert.ok(annualFacts.forbiddenEventShapes.includes("secret_return_to_forbidden_place"));
    assert.ok(annualFacts.requiredStateChanges.length > 0);
    assert.ok(
      ["institution_arrival", "education_shift", "social_reputation_shift", "family_route_decision"].includes(
        annualFacts.primaryDelta.type,
      ),
    );
    assert.ok(annualFacts.backgroundThreads.includes("bamboo_forest_spirit_beast"));
  });

  it("classifies repeated yearly shapes across life domains, not only forbidden places", () => {
    const worlds = loadMvpWorlds();
    const familyRun = withRepeatedPlainEvents(createCultivationRun(worlds), [
      "父母又一次加重禁令，不让你离开家门，也不让你靠近后山。",
      "母亲仍然看得很紧，父亲继续把外出的路都堵住，家里只是重复禁令。",
    ]);
    const educationRun = withRepeatedPlainEvents(createCultivationRun(worlds), [
      "这一年你仍然在村塾抄书背书，每天继续练字，先生只是让你重复功课。",
      "下一年你又在村塾抄写药书和旧课，学堂生活没有新的变化。",
    ]);
    const resourceRun = withRepeatedPlainEvents(createWastelandRun(worlds), [
      "营地口粮和水源再次短缺，大人们继续围着物资分配争吵。",
      "又一年，水和口粮依旧不够，资源分配的争执没有带来新的生活变化。",
    ]);

    const familyFacts = buildAnnualFactPackage({ run: familyRun, worlds, seed: 11 });
    const educationFacts = buildAnnualFactPackage({ run: educationRun, worlds, seed: 12 });
    const resourceFacts = buildAnnualFactPackage({ run: resourceRun, worlds, seed: 13 });

    assert.ok(familyFacts.forbiddenEventShapes.includes("family_lockdown_reasserted"));
    assert.notEqual(familyFacts.primaryDelta.eventShape, "family_lockdown_reasserted");
    assert.ok(educationFacts.forbiddenEventShapes.includes("education_routine_without_delta"));
    assert.notEqual(educationFacts.primaryDelta.eventShape, "education_routine_without_delta");
    assert.ok(resourceFacts.forbiddenEventShapes.includes("resource_shortage_without_delta"));
    assert.notEqual(resourceFacts.primaryDelta.eventShape, "resource_shortage_without_delta");
  });

  it("annual fact packages become authoritative story-state patches on the generated event", () => {
    const worlds = loadMvpWorlds();
    const run = withRepeatedForbiddenPlaceShape(createCultivationRun(worlds));
    const contract = buildNextEventContract({ run, worlds, seed: 20260618 });
    const renderedEvent = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_annual_patch",
      timeSpan: { ageStart: 7, ageEnd: 8, yearsElapsed: 1, pace: "scene_or_short_stage" },
      playerText: {
        title: "8 岁：碧云宗来人",
        body: "碧云宗外门弟子抵达青石村，开始处理后山灵兽传闻，也解释此前外门选拔为何被搁置。父母必须决定要隐瞒多少玉简和灵兽的事，又该让你怎样面对宗门。",
      },
      event: { eventId: "annual_patch", riskLabel: "medium", summaryTags: [] },
      choices: [
        { id: "choice_1", text: "先观察宗门弟子如何询问村民。", fuzzySuccessLabel: "难度较低", riskLabel: "low" },
        { id: "choice_2", text: "试探他是否知道符文铁环。", fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
        { id: "choice_3", text: "请求父亲陪你说出一部分真相。", fuzzySuccessLabel: "结果难以预料", riskLabel: "medium" },
      ],
      freeform: { allowed: true, clarificationNeeded: false, riskBand: "low" },
      visibleChanges: [],
      statePatch: {
        attributeChanges: [],
        manifestationChanges: [],
        exposureChanges: [],
        relationshipChanges: [],
        importantNPCUpdates: [],
        factionChanges: [],
        progressionChanges: [],
        worldStateChanges: [],
        memoryUpdates: [],
        scoreDelta: 0,
      },
      internal: { judgmentSummary: "test", validationFlags: [], hiddenStateNotes: "" },
    };

    const patched = applyAnnualFactPackageToResponse(renderedEvent, contract.annualFactPackage);

    assert.equal(patched.event.eventShape, "institution_arrival_changes_life");
    assert.ok(patched.event.summaryTags.includes("annual_state_transition"));
    const storyPatch = patched.statePatch.worldStateChanges.find((change) => change.target === "storyState");
    assert.ok(storyPatch);
    assert.ok(storyPatch.value.facts.includes("annual_age_8_institution_arrival_changes_life"));
    assert.ok(storyPatch.value.threads.some((thread) => thread.threadId === "annual_institution"));
  });

  it("director contract makes the annual fact package authoritative for the next event", () => {
    const worlds = loadMvpWorlds();
    const run = withRepeatedForbiddenPlaceShape(createCultivationRun(worlds));

    const contract = buildNextEventContract({ run, worlds, seed: 20260618 });

    assert.equal(contract.contractVersion, "mvp.event_contract.v1");
    assert.equal(contract.annualFactPackage.age, 8);
    assert.equal(contract.annualFactPackage.primaryDelta.eventShape, "institution_arrival_changes_life");
    assert.ok(contract.mustInclude.some((item) => /碧云宗|宗门/.test(item)));
    assert.ok(contract.mustNotInclude.some((item) => /再次偷跑|又一次偷跑/.test(item)));
    assert.ok(contract.forbiddenEventShapes.includes("secret_return_to_forbidden_place"));
  });

  it("rejects annual events that reuse a forbidden event shape without a new yearly delta", () => {
    const run = withRepeatedForbiddenPlaceShape(createCultivationRun(loadMvpWorlds()));
    const contract = buildNextEventContract({ run, worlds: loadMvpWorlds(), seed: 20260618 });
    const repeatedEvent = {
      schemaVersion: "mvp.ai_event_response.v1",
      responseType: "life_event",
      worldId: run.worldId,
      runId: run.runId,
      turnId: "turn_repeated_shape",
      timeSpan: { ageStart: 7, ageEnd: 8, yearsElapsed: 1, pace: "scene_or_short_stage" },
      playerText: {
        title: "8 岁：又一次后山偷跑",
        body: "父亲外出后，母亲午睡，你再次偷偷溜去后山竹林，想确认那只灵兽和玉简的牵引。父母发现后更加生气。",
      },
      choices: [
        { id: "choice_1", text: "继续隐瞒这次偷跑，等下次机会再去后山。", fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
        { id: "choice_2", text: "向父母承认自己又去了后山。", fuzzySuccessLabel: "难度较低", riskLabel: "low" },
        { id: "choice_3", text: "夜里继续感受后山牵引。", fuzzySuccessLabel: "结果难料", riskLabel: "medium" },
      ],
    };

    const validation = validateStoryContract(repeatedEvent, contract);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("forbidden event shape secret_return_to_forbidden_place")));
    assert.ok(validation.errors.some((error) => error.includes("annual fact package")));
  });

  it("rejects generic repeated yearly shapes, not just the cultivation back-mountain loop", () => {
    const contract = {
      annualFactPackage: { requiredTextSignals: ["新的生活安排"] },
      forbiddenEventShapes: ["family_lockdown_reasserted"],
    };
    const repeatedFamilyEvent = {
      playerText: {
        title: "8 岁：禁令更重",
        body: "父母又一次加重禁令，不让你离开家门，也不让你靠近后山。母亲仍然看得很紧，父亲继续把外出的路都堵住。",
      },
      choices: [
        { text: "继续忍耐父母的禁令。" },
        { text: "等待下次没人看管。" },
        { text: "夜里继续感受后山牵引。" },
      ],
    };

    const validation = validateStoryContract(repeatedFamilyEvent, contract);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("family_lockdown_reasserted")));
  });

  it("play session renders the annual state transition instead of another forbidden-place branch", () => {
    const worlds = loadMvpWorlds();
    const run = withRepeatedForbiddenPlaceShape(createCultivationRun(worlds));
    const session = {
      ...createPlaySession({ run, worlds, seed: 20260618, endingAge: 99 }),
      currentRun: run,
      currentEvent: annualChoiceEvent(run),
      openingPhase: "first_branch",
      turnCounter: 1,
    };

    const next = handlePlayerInput({ session, input: "1" });

    assert.match(next.currentEvent.playerText.body, /碧云宗|外门弟子|宗门/);
    assert.match(next.currentEvent.playerText.body, /选拔|灵兽/);
    assert.doesNotMatch(next.currentEvent.playerText.body, /再次偷偷溜去后山|又一次后山偷跑|父亲外出.*母亲午睡.*后山/s);
    assert.ok(next.currentEvent.choices.every((choice) => !/再次.*后山|继续.*偷跑/.test(choice.text)));
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

function createWastelandRun(worlds) {
  return createInitialRun({
    worlds,
    worldId: "wasteland",
    seed: 20260618,
    playerProfile: { name: "林岚", gender: "female", personality: "curious" },
  });
}

function withRepeatedPlainEvents(run, bodies) {
  const next = structuredClone(run);
  next.player.age = 7;
  next.eventHistory.push(...bodies.map((body, index) => ({
    turnId: `turn_plain_${index}`,
    responseType: "life_event",
    timeSpan: { ageStart: 5 + index, ageEnd: 6 + index, yearsElapsed: 1 },
    event: {
      eventId: `plain_${index}`,
      summaryTags: ["test_plain_repeat"],
    },
    playerText: {
      title: `${6 + index} 岁：重复的日子`,
      body,
    },
    choices: [],
  })));
  return next;
}

function withRepeatedForbiddenPlaceShape(run) {
  let next = structuredClone(run);
  next.player.age = 7;
  next.eventHistory.push(
    {
      turnId: "turn_age_6",
      responseType: "life_event",
      timeSpan: { ageStart: 5, ageEnd: 6, yearsElapsed: 1 },
      event: {
        eventId: "age_6_forbidden_place",
        eventShape: "secret_return_to_forbidden_place",
        summaryTags: ["forbidden_place", "family_ban"],
      },
      playerText: {
        title: "6 岁：后山禁令",
        body: "你趁父亲外出和母亲午睡时偷跑去后山。",
      },
    },
    {
      turnId: "turn_age_7",
      responseType: "life_event",
      timeSpan: { ageStart: 6, ageEnd: 7, yearsElapsed: 1 },
      event: {
        eventId: "age_7_forbidden_place",
        eventShape: "secret_return_to_forbidden_place",
        summaryTags: ["forbidden_place", "family_ban"],
      },
      playerText: {
        title: "7 岁：再次偷跑",
        body: "你再次等到父母看管松动时回到后山。",
      },
    },
  );
  next = recordSimulationOutcome(next, {
    factsAdded: [
      "cave_jade_slip_found",
      "spirit_beast_seen",
      "spirit_beast_non_hostile_confirmed",
      "parents_ban_mountain_access",
      "biyun_selection_invited",
    ],
    factsClosed: ["spirit_beast_first_contact"],
    forbiddenRepeats: ["secret_return_to_forbidden_place"],
    threadUpdates: [
      {
        threadId: "bamboo_forest_spirit_beast",
        stage: "non_hostile_confirmed",
        nextPressure: "sect_arrives_to_handle_beast",
        updatedAge: 7,
      },
      {
        threadId: "biyun_selection",
        stage: "pending",
        nextPressure: "selection_delay_must_be_explained",
        updatedAge: 7,
      },
    ],
  });
  return next;
}

function annualChoiceEvent(run) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: "turn_current_social_pressure",
    timeSpan: { ageStart: 7, ageEnd: 7, yearsElapsed: 0, pace: "scene_or_short_stage" },
    selectedSeeds: [],
    interactionMode: "playable_choices",
    engineCheck: {
      providedByEngine: true,
      checkResult: "not_applicable",
      riskLevel: "low",
      difficultyLabel: "test",
    },
    playerText: {
      title: "7 岁：村塾里的议论",
      body: "后山传闻传开后，村塾里的孩子开始议论林岚。父母没有再让她靠近竹林，只让她在家和村塾之间来回。",
    },
    event: {
      eventId: "current_social_pressure",
      riskLabel: "low",
      summaryTags: ["social_pressure", "family"],
      sourceType: "player_consequence",
    },
    choices: [
      {
        id: "choice_1",
        text: "暂时按父母安排去村塾，留意村里人怎么谈论后山和碧云宗。",
        intentTags: ["social", "observe"],
        fuzzySuccessLabel: "难度较低",
        riskLabel: "low",
      },
      {
        id: "choice_2",
        text: "试着向村塾先生打听碧云宗外门选拔为什么迟迟没有后续。",
        intentTags: ["institution", "ask"],
        fuzzySuccessLabel: "风险不明",
        riskLabel: "medium",
      },
      {
        id: "choice_3",
        text: "回家后请父亲解释，若宗门来人，家里准备说到什么程度。",
        intentTags: ["family", "negotiate"],
        fuzzySuccessLabel: "结果难以预料",
        riskLabel: "medium",
      },
    ],
    freeform: { allowed: true, clarificationNeeded: false, riskBand: "low" },
    visibleChanges: [],
    statePatch: {
      attributeChanges: [],
      manifestationChanges: [],
      exposureChanges: [],
      relationshipChanges: [],
      importantNPCUpdates: [],
      factionChanges: [],
      progressionChanges: [],
      worldStateChanges: [],
      memoryUpdates: [],
      scoreDelta: 0,
    },
    internal: { judgmentSummary: "test event", validationFlags: ["test"], hiddenStateNotes: "" },
  };
}
