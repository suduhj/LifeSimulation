import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  applyAnnualFactPackageToResponse,
  buildAnnualFactPackage,
  buildNextEventContract,
  createInitialRun,
  loadMvpWorlds,
  replayRun,
  validateStoryContract,
} from "../src/index.js";

describe("Annual Year Tick v2", () => {
  it("builds an annual agenda with curriculum, three-layer focus, and topic profile", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds, 6);

    const annualFacts = buildAnnualFactPackage({ run, worlds, seed: 20260619 });

    assert.equal(annualFacts.age, 7);
    assert.equal(typeof annualFacts.curriculumSlot, "string");
    assert.ok(annualFacts.requiredHumanDelta.length > 12);
    assert.equal(annualFacts.threeLayerFocus.lifeBase.role, "primary");
    assert.equal(annualFacts.threeLayerFocus.lifeBase.domain, annualFacts.curriculumSlot);
    assert.equal(annualFacts.threeLayerFocus.worldFlavor.role, "secondary");
    assert.equal(annualFacts.threeLayerFocus.consequenceEcho.role, "background_only");
    assert.equal(annualFacts.topicProfile.age, 7);
    assert.ok(annualFacts.topicProfile.topicFamily);
    assert.ok(Array.isArray(annualFacts.forbiddenTopicProfiles));
    assert.equal(annualFacts.annualAgenda.curriculumSlot, annualFacts.curriculumSlot);
  });

  it("persists curriculum and topic ledger through statePatch -> domain events -> replay", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds, 6);
    const annualFacts = buildAnnualFactPackage({ run, worlds, seed: 20260619 });
    const response = buildRenderedAnnualEvent(run, annualFacts);
    const patched = applyAnnualFactPackageToResponse(response, annualFacts);

    const nextRun = applyAiResponseToRun(run, patched);
    const replayed = replayRun(nextRun.eventLog);
    const storyState = nextRun.worldState.storyState;

    assert.ok(storyState.curriculum.recentSlots.some((slot) => slot.age === 7 && slot.slot === annualFacts.curriculumSlot));
    assert.ok(storyState.curriculum.coveredSlots.includes(annualFacts.curriculumSlot));
    assert.ok(storyState.topicLedger.recentTopics.some((topic) => topic.age === 7 && topic.topicFamily === annualFacts.topicProfile.topicFamily));
    assert.ok(storyState.annualAgendas.some((agenda) => agenda.age === 7 && agenda.curriculumSlot === annualFacts.curriculumSlot));
    assert.deepEqual(replayed.worldState.storyState.curriculum, storyState.curriculum);
    assert.deepEqual(replayed.worldState.storyState.topicLedger, storyState.topicLedger);
    assert.deepEqual(replayed.worldState.storyState.annualAgendas, storyState.annualAgendas);
  });

  it("covers at least four different life curriculum slots from age 5 to 10", () => {
    const worlds = loadMvpWorlds();
    let run = createCultivationRun(worlds, 4);
    const slots = [];

    for (let seed = 5; seed <= 10; seed += 1) {
      const annualFacts = buildAnnualFactPackage({ run, worlds, seed: 20260619 + seed });
      slots.push(annualFacts.curriculumSlot);
      const patched = applyAnnualFactPackageToResponse(buildRenderedAnnualEvent(run, annualFacts), annualFacts);
      run = applyAiResponseToRun(run, patched);
    }

    assert.ok(new Set(slots).size >= 4, `expected at least four annual life slots, got ${slots.join(",")}`);
    for (let index = 1; index < slots.length; index += 1) {
      assert.notEqual(slots[index], slots[index - 1]);
    }
  });

  it("puts curriculum and topic constraints on the director contract", () => {
    const worlds = loadMvpWorlds();
    const run = withRecentForbiddenTopics(createCultivationRun(worlds, 7));

    const contract = buildNextEventContract({ run, worlds, seed: 20260619 });

    assert.equal(contract.sceneType, "annual_state_transition");
    assert.equal(contract.curriculumSlot, contract.annualFactPackage.curriculumSlot);
    assert.equal(contract.threeLayerFocus.lifeBase.domain, contract.curriculumSlot);
    assert.ok(contract.requiredHumanDelta);
    assert.ok(contract.topicProfile.topicFamily);
    assert.ok(Array.isArray(contract.forbiddenTopicProfiles));
    assert.ok(contract.mustInclude.includes(contract.requiredHumanDelta));
  });

  it("rejects rendered events that ignore the curriculum slot and promote a forbidden topic", () => {
    const contract = {
      curriculumSlot: "peer_relationship",
      requiredHumanDelta: "至少一个同龄人对主角态度发生变化",
      threeLayerFocus: {
        lifeBase: { domain: "peer_relationship", role: "primary" },
        worldFlavor: { element: "subtle_talent_manifestation", role: "secondary" },
        consequenceEcho: { source: "jade_token", role: "background_only" },
      },
      forbiddenTopicProfiles: [
        {
          topicFamily: "scripture_pavilion_secret",
          arena: "scripture_pavilion",
          objectFocus: "jade_token",
          institutionFocus: "biyun_sect",
          pressureType: "hidden_clue_search",
        },
      ],
    };
    const response = {
      playerText: {
        title: "7 岁：藏书阁旧谜",
        body: "这一年你又把藏书阁当成主舞台，继续追查玉佩和碧云宗秘密，所有选择都围绕潜入与寻找线索。",
      },
      choices: [
        { text: "继续潜入藏书阁寻找玉佩线索" },
        { text: "躲开看守翻阅旧卷" },
        { text: "询问碧云宗的人" },
      ],
    };

    const validation = validateStoryContract(response, contract);

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("curriculum slot peer_relationship")));
    assert.ok(validation.errors.some((error) => error.includes("forbidden topic scripture_pavilion_secret")));
  });
});

function createCultivationRun(worlds, age) {
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "林岚", gender: "female", personality: "curious" },
  });
  run.player.age = age;
  return run;
}

function withRecentForbiddenTopics(run) {
  const next = structuredClone(run);
  next.worldState.storyState.topicLedger = {
    recentTopics: [
      {
        age: 6,
        topicFamily: "scripture_pavilion_secret",
        arena: "scripture_pavilion",
        objectFocus: "jade_token",
        institutionFocus: "biyun_sect",
        pressureType: "hidden_clue_search",
      },
      {
        age: 7,
        topicFamily: "sect_labor",
        arena: "sect_mine",
        objectFocus: "none",
        institutionFocus: "biyun_sect",
        pressureType: "forced_service",
      },
    ],
  };
  return next;
}

function buildRenderedAnnualEvent(run, annualFacts) {
  return {
    schemaVersion: "mvp.ai_event_response.v1",
    responseType: "life_event",
    worldId: run.worldId,
    runId: run.runId,
    turnId: `turn_annual_v2_${annualFacts.age}`,
    timeSpan: { ageStart: run.player.age, ageEnd: annualFacts.age, yearsElapsed: 1, pace: "scene_or_short_stage" },
    selectedSeeds: [],
    interactionMode: "playable_choices",
    playerText: {
      title: `${annualFacts.age} 岁：${annualFacts.curriculumSlot}`,
      body: `这一年真正改变生活的是：${annualFacts.requiredHumanDelta}。因为此前家人、村里和旧线索已经让日常变得紧绷，这天父亲和母亲在家中重新安排你的活动范围，也有人在门外低声谈起今年的新变化。${annualFacts.primaryDelta.title}只作为年度变化的一部分出现，旧线索退到背景。眼下你要决定如何面对新的生活安排、相关的人际变化，以及那些还没有完全消失的世界味道。`,
    },
    event: { eventId: `annual_v2_${annualFacts.age}`, riskLabel: "medium", summaryTags: [] },
    choices: [
      { id: "choice_1", text: "先顺着新的生活安排观察变化，留意父亲和母亲为什么这样决定。", intentTags: ["life"], fuzzySuccessLabel: "难度较低", riskLabel: "low" },
      { id: "choice_2", text: "试着和今年相关的人谈一谈，弄清对方态度为什么发生变化。", intentTags: ["relationship"], fuzzySuccessLabel: "结果难料", riskLabel: "medium" },
      { id: "choice_3", text: "把旧线索记在心里，但不让它抢走今年的主事和日常选择。", intentTags: ["consequence"], fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
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
    internal: { judgmentSummary: "annual v2 test", validationFlags: [], hiddenStateNotes: "" },
  };
}
