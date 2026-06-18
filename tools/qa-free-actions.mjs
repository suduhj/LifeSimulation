#!/usr/bin/env node

// Free-action QA harness. The product wedge is "type a free-form action, get a fair,
// consequential, sometimes-surprising ruling from real AI". This drives a fixed set of
// diverse free-form actions through the action-resolution path and scores each ruling.
//
// Two modes:
//   --ai mock      (default) deterministic structural gate, CI-friendly. Asserts every
//                  ruling is schema-valid, leak-free, consequential, and a terminal outcome
//                  (no follow-up choices; the next branch is generated separately).
//   --ai deepseek  real-AI report: same hard checks PLUS the full ruling text and an
//                  advisory "granted-impossible?" signal, so a human can rate fairness
//                  and surprise (the parts only a human/real-AI can judge).

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAiProvider,
  createInitialRun,
  detectPlayerTextLeaks,
  generateMockLifeEvent,
  getProviderConfigStatus,
  loadProjectEnv,
  loadMvpWorlds,
  validateAiResponse,
} from "../src/index.js";
import { lifeStageForAge } from "../src/run-loop.js";

// Each scenario is a free-form action a player might actually type. `kind` records what a
// FAIR ruling should do, so a human (or future auto-judge) can score the real-AI output.
const SHOULD_NOT_FULLY_SUCCEED = new Set(["over_ambitious", "age_inappropriate", "extreme_or_exploit", "world_breaking"]);

const SCENARIOS = [
  { world: "cultivation", age: 7, kind: "reasonable", text: "我每天清晨偷偷跟着父亲学的吐纳吐气，试着感受周围有没有灵气。" },
  { world: "cultivation", age: 7, kind: "age_inappropriate", text: "我直接御剑飞到山顶，找传说中的仙人拜师入门。" },
  { world: "cultivation", age: 16, kind: "over_ambitious", text: "我向全镇宣布我要做这一带最强的修士，让所有人都听我的。" },
  { world: "cultivation", age: 12, kind: "world_breaking", text: "我用现代手机拍下灵气的样子发到网上。" },
  { world: "cthulhu", age: 14, kind: "reasonable", text: "我去市图书馆翻旧报纸，查那些被悄悄删掉的失踪新闻。" },
  { world: "cthulhu", age: 10, kind: "extreme_or_exploit", text: "我把班上所有同学都杀掉，这样就没人知道我的秘密了。" },
  { world: "cthulhu", age: 9, kind: "reasonable", text: "我假装睡着，偷听父母深夜压低声音在说什么。" },
  { world: "wasteland", age: 12, kind: "over_ambitious", text: "我说服整个营地拥立我当首领，把水源都交给我管。" },
  { world: "wasteland", age: 9, kind: "reasonable", text: "我主动帮忙看守水源，留意有没有陌生队伍靠近。" },
  { world: "wasteland", age: 15, kind: "reasonable", text: "我把捡到的旧世界零件偷偷攒起来，想换一把能防身的武器。" },
];

const ALLOCATION = { appearance: 4, intelligence: 6, constitution: 4, familyBackground: 3, luck: 3 };

export async function runFreeActionQa({ env = process.env, args = [], fetchImpl = globalThis.fetch } = {}) {
  const options = parseArgs(args);
  const mode = resolveMode({ requestedMode: options.ai, env });
  if (!mode) {
    return { status: "skipped", reason: "No real AI provider configured; pass --ai mock for the deterministic gate." };
  }

  const worlds = loadMvpWorlds();
  const baseSeed = Number.parseInt(options.seed ?? "20260616", 10);
  const limit = options.limit ? Number.parseInt(options.limit, 10) : SCENARIOS.length;
  const selected = SCENARIOS.filter((s) => !options.world || s.world === options.world).slice(0, limit);

  const provider = createAiProvider({ mode, env, fetchImpl });
  const results = [];

  for (let index = 0; index < selected.length; index += 1) {
    const scenario = selected[index];
    const seed = baseSeed + index * 7;
    try {
      const run = buildScenarioRun({ worlds, scenario, seed });
      const sourceEvent = generateMockLifeEvent({ run, worlds, seed });
      const resolution = await provider.generateActionResolution({
        run,
        sourceEvent,
        action: { kind: "freeform", text: scenario.text },
        worlds,
        seed: seed + 100,
      });
      results.push(scoreResolution({ scenario, resolution }));
    } catch (error) {
      results.push({ scenario, hardPass: false, error: error instanceof Error ? error.message : String(error), checks: {} });
    }
  }

  const failures = results.filter((r) => !r.hardPass);
  return {
    status: failures.length === 0 ? "passed" : "failed",
    mode,
    total: results.length,
    failed: failures.length,
    results,
  };
}

function buildScenarioRun({ worlds, scenario, seed }) {
  const run = createInitialRun({
    worlds,
    worldId: scenario.world,
    seed,
    playerProfile: { name: "林岚", gender: "unspecified", personality: "curious" },
    allocation: ALLOCATION,
  });
  run.player.age = scenario.age;
  run.player.lifeStage = lifeStageForAge(scenario.age);
  // Non-opening history so the resolution path treats this as mid-life, not the birth preview.
  run.eventHistory = [{ responseType: "life_event", event: { sourceType: "natural_life" } }];
  return run;
}

function scoreResolution({ scenario, resolution }) {
  const validation = validateAiResponse(resolution);
  const leaks = detectPlayerTextLeaks(resolution);
  const body = String(resolution?.playerText?.body ?? "");
  const choices = Array.isArray(resolution?.choices) ? resolution.choices : [];

  const checks = {
    schemaValid: validation.valid,
    leakFree: leaks.length === 0,
    consequential: isConsequential(resolution),
    terminalOutcome: choices.length === 0,
  };
  const hardPass = checks.schemaValid && checks.leakFree && checks.consequential && checks.terminalOutcome;

  // Advisory: for actions that should NOT just succeed, did the ruling avoid asserting an
  // unconditional win? Only a signal for human review, never a hard gate.
  const shouldNotSucceed = SHOULD_NOT_FULLY_SUCCEED.has(scenario.kind);
  const hedged = /失败|没能|未能|只是|尝试|难以|无法|拦住|劝阻|阻止|不被允许|超出|力不从心|徒劳|没有成功|终究|并未|不肯|没有答应/.test(body);
  const grantedImpossible = shouldNotSucceed && body.length > 0 && !hedged;

  return {
    scenario,
    hardPass,
    checks,
    advisory: { grantedImpossible, hedged, bodyLength: body.length },
    title: resolution?.playerText?.title ?? "",
    body,
    validationErrors: validation.errors,
    leaks,
  };
}

function isConsequential(resolution) {
  if (Array.isArray(resolution?.visibleChanges) && resolution.visibleChanges.length > 0) return true;
  const patch = resolution?.statePatch ?? {};
  if (typeof patch.scoreDelta === "number" && patch.scoreDelta !== 0) return true;
  return [
    "attributeChanges",
    "manifestationChanges",
    "exposureChanges",
    "relationshipChanges",
    "importantNPCUpdates",
    "factionChanges",
    "progressionChanges",
    "worldStateChanges",
    "memoryUpdates",
  ].some((key) => Array.isArray(patch[key]) && patch[key].length > 0);
}

function resolveMode({ requestedMode, env = process.env } = {}) {
  if (requestedMode) return requestedMode === true ? "mock" : requestedMode;
  return getProviderConfigStatus(env).mode ?? "mock";
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[index + 1];
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function printResult(result) {
  if (result.status === "skipped") {
    console.log("Free-action QA skipped");
    console.log(result.reason);
    return;
  }

  console.log(`Free-action QA (${result.mode})`);
  console.log("=".repeat(60));
  for (const r of result.results) {
    const { scenario } = r;
    const head = `[${scenario.world} · ${scenario.age}岁 · ${scenario.kind}]`;
    if (r.error) {
      console.log(`✖ ${head} ERROR: ${r.error}`);
      console.log(`   行动：${scenario.text}`);
      continue;
    }
    const mark = r.hardPass ? "✔" : "✖";
    const failed = Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k);
    console.log(`${mark} ${head}${failed.length ? ` FAIL: ${failed.join(",")}` : ""}`);
    console.log(`   行动：${scenario.text}`);
    console.log(`   判定：${r.title}`);
    if (result.mode !== "mock") {
      console.log(`   正文：${r.body.slice(0, 220)}${r.body.length > 220 ? "…" : ""}`);
      if (r.advisory.grantedImpossible) {
        console.log("   ⚠ 公平存疑：本应受限的行动读起来像无条件成功（需人工确认）。");
      }
    }
    if (!r.checks.leakFree) console.log(`   泄露：${r.leaks.join("; ")}`);
    if (!r.checks.schemaValid) console.log(`   校验：${r.validationErrors.join("; ")}`);
  }
  console.log("=".repeat(60));
  console.log(`结构硬检查：${result.total - result.failed}/${result.total} 通过`);
  if (result.mode === "mock") {
    console.log("mock 模式只验证结构（schema/泄露/有后果/终局无新选项）。公平与意外需用 --ai deepseek 人工评分。");
  } else {
    const suspect = result.results.filter((r) => r.advisory?.grantedImpossible).length;
    console.log(`公平存疑（应受限却像成功）：${suspect} 条，请人工逐条核对上面的「正文」。`);
  }
}

function runCli() {
  runFreeActionQa({ env: loadProjectEnv(), args: process.argv.slice(2) })
    .then((result) => {
      printResult(result);
      if (result.status === "failed") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`Free-action QA failed: ${error.message}`);
      process.exitCode = 1;
    });
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === currentFile.toLowerCase()) {
  runCli();
}
