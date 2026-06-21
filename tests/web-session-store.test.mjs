import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { loadMvpWorlds } from "../src/index.js";
import { createWebSessionStore, sanitizeFatePreviewBodyForPlayer } from "../src/web-session-store.js";

describe("web session store", () => {
  it("sanitizes provider fate-preview sections before ordinary browser display", () => {
    const rawBody = [
      "【身世卡】",
      "出生地点：青竹镇外。",
      "【初始重要NPC】",
      "- 父亲林大山：沉默寡言，但对你极好。",
      "- 散修黑衣人：每年路过村子。",
      "",
      "【未解释细节】",
      "- 梧桐开花与乌鸦：是吉是凶？",
      "- 石髓芝：为何恰好出现在你脚下？",
      "",
      "【出生与早年】",
      "三岁前你体弱多病，但五岁时一场高烧后，皮肤渐透玉光。",
      "六岁那年，你随父亲进山，误入一片竹林。",
    ].join("\n");

    const sanitized = sanitizeFatePreviewBodyForPlayer(rawBody);

    assert.doesNotMatch(sanitized, /【人际关系】|父亲林大山|散修黑衣人/);
    assert.doesNotMatch(sanitized, /初始重要NPC|初始关系|未解释细节|出生与早年/);
    assert.doesNotMatch(sanitized, /梧桐开花|石髓芝|三岁前|六岁那年|竹林/);
  });

  it("removes bare opening-section headings and their bodies from fate preview text", () => {
    const rawBody = [
      "身世卡",
      "出生地点：枫溪镇外。",
      "天赋显化",
      "0-2岁：你极少哭闹，眼睛总是追着光影移动。",
      "",
      "世界背景",
      "这是一个以修行者为尊的世界。",
      "",
      "初始重要NPC",
      "- 父亲林远山（42岁）：猎户，沉默寡言。",
      "- 采药人“药篓”（失踪）：身份不明。",
      "",
      "早年自动推进",
      "0-5岁：你在平凡与不凡的交织中长大。",
      "你已初步显化了剑心通明。",
      "",
      "未解释细节",
      "- 左掌金色剑形胎记的来历。",
      "- 青石剑痕是谁留下的？",
    ].join("\n");

    const sanitized = sanitizeFatePreviewBodyForPlayer(rawBody);

    assert.match(sanitized, /出生地点：枫溪镇外/);
    assert.match(sanitized, /这是一个以修行者为尊的世界/);
    assert.doesNotMatch(sanitized, /天赋显化|0-2岁|极少哭闹|初始重要NPC|林远山|药篓/);
    assert.doesNotMatch(sanitized, /早年自动推进|0-5岁|剑心通明|未解释细节|胎记|剑痕/);
  });

  it("rebuilds fate preview as a static dossier instead of leaking inline early-life clues", () => {
    const rawBody = [
      "【身世卡】",
      "出生地点：青云山脚下的凡人村落。",
      "出生家庭：普通农户。你出生那日，村外灵鹤盘旋三日。",
      "父母/监护人：父亲曾是外门弟子，母亲藏着宗门令牌。",
      "家境表现：家中不富裕，但藏有测灵石和褪色令牌。",
      "天赋初显：三岁时你在院中玩耍，无意间引动地上落叶聚成漩涡。",
      "命运预览：你天生拥有天灵根，这份资质既可能带来仙缘，也可能引来争夺。",
      "周围目光：隔壁猎户背着刻有古怪符文的短刀，总会多看你一眼。",
      "世界底色：仙凡有别，宗门和家族出身会决定孩子能否踏上修行路。",
      "初始处境：五岁前你已能无意识让茶杯悬浮片刻。",
    ].join("\n");

    const sanitized = sanitizeFatePreviewBodyForPlayer(rawBody);

    assert.match(sanitized, /出生地点：青云山脚下的凡人村落/);
    assert.match(sanitized, /出生家庭：普通农户/);
    assert.match(sanitized, /命运预览：你天生拥有天灵根/);
    assert.doesNotMatch(sanitized, /出生那日|三岁|五岁|灵鹤|外门弟子|宗门令牌|测灵石|褪色令牌|落叶聚成漩涡|古怪符文|短刀|茶杯悬浮/);
    assert.doesNotMatch(sanitized, /天赋初显|早年|未解释|初始重要NPC|人际关系/);
  });

  it("starts a browser playtest session through the shared engine without exposing provider keys", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      env: { DEEPSEEK_API_KEY: "unit_secret_key_that_must_not_leak" },
      seedFactory: () => 20260612,
      sessionIdFactory: () => "session_test",
    });

    const preview = store.createSetupPreview({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
    });

    assert.equal(preview.talentDraw.length, 5);
    assert.equal(preview.defaultKeptTalentIds.length, 3);

    const session = await store.startDevRun({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 6,
    });

    const serialized = JSON.stringify(session);
    assert.equal(session.sessionId, "session_test");
    assert.equal(session.openingPhase, "background");
    assert.equal(session.currentEvent.interactionMode, "non_interactive");
    assert.equal(session.currentEvent.choices.length, 0);
    assert.equal(session.currentEvent.freeform.allowed, false);
    assert.equal(session.run.player.name, "林岚");
    assert.doesNotMatch(serialized, /unit_secret_key_that_must_not_leak/);
    assert.doesNotMatch(serialized, /DEEPSEEK_API_KEY|Authorization|Bearer/);
  });

  it("starts from the same talent draw that the browser preview showed", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260617,
      sessionIdFactory: () => "session_preview_seed",
    });

    const preview = store.createSetupPreview({
      worldId: "cultivation",
      name: "沈青",
      gender: "male",
      personality: "ambitious",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
      seed: 13579,
    });
    const manuallySelected = preview.talentDraw.slice(0, 3).map((talent) => talent.id);

    const session = await store.startDevRun({
      worldId: "cultivation",
      name: "沈青",
      gender: "male",
      personality: "ambitious",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
      keptTalentIds: manuallySelected,
      aiMode: "mock",
      seed: preview.seed,
    });

    assert.equal(session.run.setup.talentDraw.join(","), preview.talentDraw.map((talent) => talent.id).join(","));
    assert.deepEqual(session.run.setup.keptTalentIds, manuallySelected);
    assert.equal(session.currentEvent.responseType, "life_event");
    assert.equal(session.openingPhase, "background");
  });

  it("keeps ordinary opening text and NPC labels free of raw ids and hidden roles", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 12345,
      sessionIdFactory: () => "session_safe_text",
    });
    const preview = store.createSetupPreview({
      worldId: "cultivation",
      name: "林岚",
      gender: "male",
      personality: "curious",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
    });

    const session = await store.startRun({
      worldId: "cultivation",
      name: "林岚",
      gender: "male",
      personality: "curious",
      allocation: preview.allocation,
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
    });

    const playerFacing = JSON.stringify(session.playerView);

    assert.doesNotMatch(playerFacing, /\b(?:npc_\d+|NPC_\d+|nemesis|experimenter|sacrifice|exploiter|lover|poor_scholar_child|hiddenHooks|cultivation_[a-z_]+)\b/);
    assert.doesNotMatch(playerFacing, /初始重要NPC|未解释细节|早年自动推进|出生与早年|未解释物品/);
    assert.doesNotMatch(playerFacing, /未命名天赋|未知天赋|重要人物|身份尚不明确/);
    assert.match(playerFacing, /下品灵根|温和气质|浅层剑感/);
    assert.equal(session.playerView.schemaVersion, "mvp.player_view.v1");
    assert.deepEqual(Object.keys(session).sort(), ["playerView", "sessionId"].sort());
  });

  it("localizes single-word NPC roles and backfills talent effects for old-style run talents", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260622,
      sessionIdFactory: () => "session_backfill",
    });
    const preview = store.createSetupPreview({
      worldId: "cultivation",
      name: "林岚",
      gender: "male",
      personality: "curious",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
    });
    const session = await store.startDevRun({
      worldId: "cultivation",
      name: "林岚",
      gender: "male",
      personality: "curious",
      allocation: preview.allocation,
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
    });

    const serialized = JSON.stringify(session.run.importantNPCs.map((npc) => ({
      label: npc.playerVisible?.label,
      publicRole: npc.playerVisible?.publicRole,
      knownIdentity: npc.knownIdentity,
    })));
    assert.doesNotMatch(serialized, /\b(?:sacrifice|mentor|companion|experimenter|nemesis)\b/);
    assert.ok(session.run.player.talents.every((talent) => talent.effects && Object.keys(talent.effects).length > 0));
    assert.ok(session.run.player.talents.some((talent) => talent.effects.attributePotential));
  });

  it("walks the opening fate preview into the first playable branch", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260621,
      sessionIdFactory: () => "session_opening_flow",
    });
    const preview = store.createSetupPreview({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
    });
    const session = await store.startRun({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });

    assert.equal(session.playerView.currentScene.nodeType, "opening_year");
    assert.equal(session.playerView.choices.length, 0);
    assert.match(session.playerView.currentScene.body, /出生地点：/);
    assert.doesNotMatch(session.playerView.currentScene.body, /初始重要NPC|未解释细节|早年自动推进/);

    const blocked = await store.submitAction(session.sessionId, { kind: "choice", choiceId: "choice_1" });
    assert.equal(blocked.playerView.currentScene.nodeType, "opening_year");

    const advanced = await store.submitAction(session.sessionId, { kind: "advance_opening" });
    assert.equal(advanced.playerView.currentScene.nodeType, "annual_event");
    assert.ok(advanced.playerView.currentScene.age >= 5);
    assert.doesNotMatch(advanced.playerView.currentScene.body, /人生事件|当前事件|新的事件|选择时刻|生活事件/);
    assert.ok(advanced.playerView.choices.every((choice) => !/^成功/.test(choice.fuzzySuccessLabel ?? "")));
    assert.equal(advanced.playerView.choices.length, 3);
  });

  it("handles choices and free-form actions from the web API shape", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260613,
      sessionIdFactory: () => "session_action",
    });
    const preview = store.createSetupPreview({
      worldId: "wasteland",
      name: "Ash",
      gender: "female",
      personality: "pragmatic",
      allocation: { appearance: 2, intelligence: 6, constitution: 6, familyBackground: 2, luck: 4 },
    });
    const session = await store.startRun({
      worldId: "wasteland",
      name: "Ash",
      gender: "female",
      personality: "pragmatic",
      allocation: { appearance: 2, intelligence: 6, constitution: 6, familyBackground: 2, luck: 4 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });
    await store.submitAction(session.sessionId, { kind: "advance_opening" });

    const afterChoice = await store.submitAction(session.sessionId, {
      kind: "choice",
      choiceId: "choice_1",
    });
    assert.ok(afterChoice.playerView.timeline.some((entry) => entry.nodeType === "action_resolution"));
    assert.ok(afterChoice.playerView.timeline.some((entry) => entry.body));
    assert.ok(afterChoice.playerView.panels.attributes.attributes.length > 0);

    const afterFreeform = await store.submitAction(session.sessionId, {
      kind: "freeform",
      text: "我先观察营地里谁掌握水源，再决定是否接近他们。",
    });
    assert.ok(["action_resolution", "clarification_request", "annual_event"].includes(afterFreeform.playerView.currentScene.nodeType));
  });

  it("saves and reloads a browser run so the web playtest can continue locally", async () => {
    const worlds = loadMvpWorlds();
    const savePath = path.join("tmp", "tests", `web-save-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const sessionIds = ["session_save", "session_loaded"];
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260614,
      sessionIdFactory: () => sessionIds.shift(),
    });
    const preview = store.createSetupPreview({
      worldId: "cultivation",
      name: "沈青",
      gender: "male",
      personality: "ambitious",
      allocation: { appearance: 4, intelligence: 6, constitution: 6, familyBackground: 2, luck: 2 },
    });
    const session = await store.startRun({
      worldId: "cultivation",
      name: "沈青",
      gender: "male",
      personality: "ambitious",
      allocation: { appearance: 4, intelligence: 6, constitution: 6, familyBackground: 2, luck: 2 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });
    await store.submitAction(session.sessionId, { kind: "advance_opening" });
    const afterChoice = await store.submitAction(session.sessionId, {
      kind: "choice",
      choiceId: "choice_2",
    });

    const saved = store.saveSession(afterChoice.sessionId, { path: savePath });
    const loaded = await store.loadSession({ path: saved.path, aiMode: "mock", endingAge: 90, seed: 20260615 });

    assert.equal(fs.existsSync(saved.path), true);
    assert.equal(loaded.sessionId, "session_loaded");
    assert.equal(loaded.playerView.header.world, "修仙世界");
    assert.ok(loaded.playerView.timeline.length >= afterChoice.playerView.timeline.length);
    assert.ok(Array.isArray(loaded.playerView.choices));
  });

  it("keeps a completed ending completed when the save is reloaded", async () => {
    const worlds = loadMvpWorlds();
    const savePath = path.join("tmp", "tests", `web-ended-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const sessionIds = ["session_end_save", "session_end_loaded"];
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260618,
      sessionIdFactory: () => sessionIds.shift(),
    });
    const preview = store.createSetupPreview({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
    });
    let session = await store.startRun({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 5,
    });

    session = await store.submitAction(session.sessionId, { kind: "advance_opening" });
    assert.equal(session.playerView.currentScene.nodeType, "ending");

    const saved = store.saveSession(session.sessionId, { path: savePath });
    const loaded = await store.loadSession({ path: saved.path, aiMode: "mock", endingAge: 5, seed: 20260619 });

    assert.equal(loaded.sessionId, "session_end_loaded");
    assert.equal(loaded.playerView.currentScene.nodeType, "ending");
    assert.equal(loaded.playerView.choices.length, 0);
  });

  it("uses a hidden estimated lifespan when ordinary web setup omits ending age", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260616,
      sessionIdFactory: () => "session_lifespan",
    });
    const preview = store.createSetupPreview({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
    });

    const session = await store.startRun({
      worldId: "cthulhu",
      name: "林岚",
      gender: "female",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 4, familyBackground: 2, luck: 2 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
    });

    assert.equal(session.playerView.schemaVersion, "mvp.player_view.v1");
    assert.ok(session.playerView.header.age >= 0);
    assert.doesNotMatch(JSON.stringify(session), /estimated_lifespan|supported_ending_types|worldState|hidden/);
  });

  it("provides dev-only GM tools without putting test content into formal pools", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260618,
      sessionIdFactory: () => "session_dev_tools",
    });

    const catalog = store.getDevToolsCatalog();
    assert.equal(catalog.visibility, "dev_only");
    assert.equal(catalog.presets.length, 8);
    assert.equal(catalog.talents.length, 5);
    assert.equal(catalog.scenarios.cultivation.length, 10);
    assert.equal(catalog.scenarios.cthulhu.length, 11);
    assert.equal(catalog.scenarios.wasteland.length, 10);
    for (const preset of catalog.presets) {
      assert.equal(preset.testOnly, true);
      assert.equal(preset.visibility, "dev_only");
    }
    for (const talent of catalog.talents) {
      assert.equal(talent.testOnly, true);
      assert.equal(talent.visibility, "dev_only");
      assert.match(talent.id, /^dev_/);
    }
    for (const scenarios of Object.values(catalog.scenarios)) {
      for (const scenario of scenarios) {
        assert.equal(scenario.testOnly, true);
        assert.equal(scenario.visibility, "dev_only");
      }
    }
    for (const world of Object.values(worlds)) {
      assert.equal((world.talents ?? []).some((talent) => talent.id.startsWith("dev_") || talent.testOnly), false);
    }
  });

  it("applies GM presets, talents, scenario injections, and copyable reports", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260619,
      sessionIdFactory: () => "session_dev_flow",
    });
    const preview = store.createSetupPreview({
      worldId: "cthulhu",
      name: "Tester",
      gender: "unspecified",
      personality: "curious",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
    });
    const started = await store.startDevRun({
      worldId: "cthulhu",
      name: "Tester",
      gender: "unspecified",
      personality: "curious",
      allocation: { appearance: 4, intelligence: 4, constitution: 4, familyBackground: 4, luck: 4 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
    });

    const preset = store.applyDevPreset(started.sessionId, { presetId: "high_exposure_anomaly" });
    assert.ok(preset.run.player.talents.some((talent) => talent.id === "dev_immediate_anomaly"));
    assert.ok(Object.values(preset.run.player.attributes).every((attribute) => attribute.exposure >= 85));

    const talented = store.applyDevTalent(started.sessionId, { talentId: "dev_numeric_stress" });
    assert.ok(talented.run.player.talents.some((talent) => talent.id === "dev_numeric_stress"));
    assert.ok(talented.run.player.attributes.intelligence.potential >= preset.run.player.attributes.intelligence.potential + 250);

    const scenario = store.triggerDevScenario(started.sessionId, { scenarioId: "missing_classmate" });
    assert.equal(scenario.devValidation.valid, true);
    assert.equal(scenario.currentEvent.event.sourceType, "dev_scenario");
    assert.equal(scenario.currentEvent.selectedSeeds[0].testOnly, true);
    assert.equal(scenario.currentEvent.selectedSeeds[0].visibility, "dev_only");
    assert.ok(scenario.currentEvent.statePatch.progressionChanges.some((change) => change.target === "truth_exposure"));

    const report = store.getDevReport(started.sessionId);
    assert.equal(report.visibility, "dev_only");
    assert.equal(report.eventSource, "dev_scenario");
    assert.equal(report.statePatchValidation.valid, true);
    assert.ok(report.aiRawJson);
    assert.ok(report.statePatch);
    assert.ok(Array.isArray(report.run.importantNPCsHidden));
  });

  it("can apply a GM opening preset before the first life event is generated", async () => {
    const worlds = loadMvpWorlds();
    const store = createWebSessionStore({
      worlds,
      seedFactory: () => 20260620,
      sessionIdFactory: () => "session_dev_opening",
    });
    const preview = store.createSetupPreview({
      worldId: "cthulhu",
      name: "Tester",
      gender: "unspecified",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 6, familyBackground: 1, luck: 1 },
    });

    const session = await store.startDevRun({
      worldId: "cthulhu",
      name: "Tester",
      gender: "unspecified",
      personality: "curious",
      allocation: { appearance: 6, intelligence: 6, constitution: 6, familyBackground: 1, luck: 1 },
      keptTalentIds: preview.defaultKeptTalentIds,
      aiMode: "mock",
      endingAge: 90,
      devPresetId: "high_exposure_anomaly",
    });

    assert.ok(session.run.player.talents.some((talent) => talent.id === "dev_immediate_anomaly"));
    assert.ok(Object.values(session.run.player.attributes).every((attribute) => attribute.exposure >= 85));
    assert.equal(session.run.worldState.flags.includes("dev_mode_used"), true);
  });
});
