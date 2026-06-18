#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditPlaytestContent } from "./audit-playtest-content.mjs";
import { smokeAiProvider } from "./smoke-ai-provider.mjs";
import { validateRuntimeData } from "./validate-world-data.mjs";
import {
  createInitialRun,
  createPlaySession,
  formatRunSummary,
  getProviderConfigStatus,
  handlePlayerInput,
  loadMvpWorlds,
  loadProjectEnv,
  loadRunFromFile,
  saveRunToFile,
  validateAiResponse,
  validateRunState,
} from "../src/index.js";

const REQUIRED_WORLD_IDS = ["cultivation", "cthulhu", "wasteland"];
const REQUIRED_SCRIPTS = ["play", "web", "test", "validate:data", "audit:content", "smoke:ai", "smoke:web"];

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const result = await checkPlaytestReadinessAsync({
    env: loadProjectEnv(),
    requireAi: Boolean(options.requireAi),
    liveAiSmoke: Boolean(options.liveAiSmoke),
  });
  console.log("Playtest readiness check");

  for (const item of result.items) {
    const mark = item.ok ? "OK" : item.required ? "FAIL" : "WARN";
    console.log(`${mark} ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
  }

  if (result.ok) {
    console.log("\nResult: core playtest readiness checks passed.");
    return;
  }

  console.error("\nResult: required playtest readiness checks failed.");
  process.exitCode = 1;
}

export function checkPlaytestReadiness({ env = process.env, requireAi = false } = {}) {
  const items = [];

  addCoreReadinessItems(items, { env, requireAi });

  return {
    ok: items.every((item) => item.ok || !item.required),
    items,
  };
}

export async function checkPlaytestReadinessAsync({ env = process.env, requireAi = false, liveAiSmoke = false, fetchImpl = globalThis.fetch } = {}) {
  const items = [];
  addCoreReadinessItems(items, { env, requireAi: requireAi || liveAiSmoke });
  if (liveAiSmoke) {
    add(items, await checkLiveAiSmoke({ env, fetchImpl }), "real AI live smoke", true);
  }
  return {
    ok: items.every((item) => item.ok || !item.required),
    items,
  };
}

function addCoreReadinessItems(items, { env, requireAi }) {
  add(items, checkPackageScripts(), "package scripts", true);
  add(items, checkWorldFolders(), "three MVP worlds", true);
  add(items, checkRuntimeData(), "runtime world data validation", true);
  add(items, checkContentMinimums(), "minimum playtest content scale", true);
  add(items, checkCoreSimulationSystems(), "core life-simulator systems", true);
  add(items, checkOpenEventGenerationRules(), "open event generation rules", true);
  add(items, checkWebPlaytestSurface(), "web playtest surface", true);
  add(items, checkFrontendSecretBoundary(), "frontend AI key safety", true);
  add(items, checkReadme(), "root README quick start", true);
  add(items, checkAiProviderEnv(env), "real AI provider environment", requireAi);
}

function add(items, check, label, required) {
  items.push({
    label,
    required,
    ...check,
  });
}

function checkPackageScripts() {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const missing = REQUIRED_SCRIPTS.filter((script) => !pkg.scripts?.[script]);
  return {
    ok: missing.length === 0,
    detail: missing.length === 0 ? REQUIRED_SCRIPTS.join(", ") : `missing ${missing.join(", ")}`,
  };
}

function checkWorldFolders() {
  const missing = REQUIRED_WORLD_IDS.filter((worldId) => !fs.existsSync(`worlds/${worldId}/world.config.json`));
  return {
    ok: missing.length === 0,
    detail: missing.length === 0 ? REQUIRED_WORLD_IDS.join(", ") : `missing ${missing.join(", ")}`,
  };
}

function checkRuntimeData() {
  const validation = validateRuntimeData({ rootDir: "worlds" });
  return {
    ok: validation.valid,
    detail: validation.valid ? `${validation.filesChecked} JSON files` : validation.errors.slice(0, 2).join("; "),
  };
}

function checkContentMinimums() {
  const audit = auditPlaytestContent({ worldsDir: "worlds" });
  const gaps = [];

  for (const world of audit) {
    for (const [key, gap] of Object.entries(world.gaps)) {
      if (gap.status === "gap") {
        gaps.push(`${world.worldId}.${key} missing ${gap.missingToMin}`);
      }
    }
  }

  return {
    ok: gaps.length === 0,
    detail: gaps.length === 0 ? "all worlds meet minimum targets" : gaps.slice(0, 4).join("; "),
  };
}

function checkReadme() {
  if (!fs.existsSync("README.md")) {
    return { ok: false, detail: "README.md is missing" };
  }
  const text = fs.readFileSync("README.md", "utf8");
  const hasStart = text.includes("npm run web") && text.includes("npm run play");
  const hasAi = text.includes("--ai deepseek") && text.includes("--ai openai-compatible");
  const hasSmoke = text.includes("npm run smoke:ai");
  return {
    ok: hasStart && hasAi && hasSmoke,
    detail: hasStart && hasAi && hasSmoke ? "web start, CLI debug, AI setup, and smoke test documented" : "missing web/play, AI setup, or smoke instructions",
  };
}

function checkWebPlaytestSurface() {
  const requiredFiles = ["web/index.html", "web/app.js", "web/styles.css", "src/web-server.js", "src/web-session-store.js"];
  const missing = requiredFiles.filter((file) => !fs.existsSync(file));
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  if (!pkg.scripts?.web) missing.push("package script web");
  if (missing.length > 0) {
    return {
      ok: false,
      detail: `missing ${missing.join(", ")}`,
    };
  }

  const html = fs.readFileSync("web/index.html", "utf8");
  const app = fs.readFileSync("web/app.js", "utf8");
  const server = fs.readFileSync("src/web-server.js", "utf8");
  const readme = fs.existsSync("README.md") ? fs.readFileSync("README.md", "utf8") : "";
  const mvpDoc = fs.existsSync("docs/mvp-program-skeleton.md") ? fs.readFileSync("docs/mvp-program-skeleton.md", "utf8") : "";
  const gaps = [];
  if (!html.includes('id="timeline"') || !html.includes('id="currentNode"')) gaps.push("missing life timeline/current node surface");
  if (!app.includes("mergeResolutionIntoLatestTimelineEntry(state.session.resolution)")) gaps.push("missing action-result merge into lived timeline node");
  if (!app.includes("function isRenderableTimelineEntry") || !app.includes("function hasVisibleChanges")) gaps.push("missing blank-card suppression");
  if (!app.includes("function renderRun") || app.includes("run.summaryLines")) gaps.push("missing localized player summary display");
  if (!server.includes('process.env.PORT ?? "5181"')) gaps.push("default web port is not 5181");
  if (/127\.0\.0\.1:0001|localhost:0001|127\.0\.0\.1:1\/|localhost:1\/|127\.0\.0\.1:5173|localhost:5173|["']5173["']/.test(`${server}\n${readme}\n${mvpDoc}`)) {
    gaps.push("unsafe port 0001 or music_agent port 5173 is still referenced");
  }
  return {
    ok: gaps.length === 0,
    detail: gaps.length === 0 ? "browser UI, life timeline/current node, localized summary display, and backend proxy present" : gaps.slice(0, 4).join("; "),
  };
}

function checkFrontendSecretBoundary() {
  const gaps = [];
  const gitignore = fs.existsSync(".gitignore") ? fs.readFileSync(".gitignore", "utf8") : "";
  if (!/^\.env$/m.test(gitignore)) gaps.push(".env not ignored");
  if (!/^\.env\.\*$/m.test(gitignore)) gaps.push(".env.* not ignored");
  if (!/^!\.env\.example$/m.test(gitignore)) gaps.push(".env.example not allowed");

  for (const filePath of listFiles("web").filter((file) => /\.(html|css|js|json)$/i.test(file))) {
    const text = fs.readFileSync(filePath, "utf8");
    if (/DEEPSEEK_API_KEY|OPENAI_COMPATIBLE_API_KEY|OPENAI_COMPATIBLE_BASE_URL|OPENAI_COMPATIBLE_MODEL/.test(text)) {
      gaps.push(`${filePath} contains provider secret variable name`);
    }
    if (/\.env\b/.test(text)) gaps.push(`${filePath} mentions .env`);
    if (/Authorization\s*:|Bearer\s+[A-Za-z0-9._-]+|api\.deepseek\.com|\/chat\/completions/.test(text)) {
      gaps.push(`${filePath} appears to call provider directly`);
    }
  }

  return {
    ok: gaps.length === 0,
    detail: gaps.length === 0 ? "dotenv ignored and frontend does not contain provider key/auth patterns" : gaps.slice(0, 4).join("; "),
  };
}

function checkCoreSimulationSystems() {
  const gaps = [];
  const worlds = loadMvpWorlds();
  const run = createInitialRun({
    worlds,
    worldId: "cthulhu",
    seed: 20260612,
    playerProfile: { name: "Readiness", gender: "unspecified", personality: "curious" },
    allocation: {
      appearance: 4,
      intelligence: 6,
      constitution: 4,
      familyBackground: 3,
      luck: 3,
    },
  });

  if (!validateRunState(run).valid) gaps.push("initial run shape invalid");
  if (run.setup.allocation.appearance + run.setup.allocation.intelligence + run.setup.allocation.constitution + run.setup.allocation.familyBackground + run.setup.allocation.luck !== 20) {
    gaps.push("20-point allocation missing");
  }
  if (run.setup.talentDraw.length !== 5 || run.player.talents.length !== 3) gaps.push("draw-5-keep-3 talents missing");
  if (!run.setup.talentDrawRarityRolls?.length) gaps.push("rarity-weighted talent roll metadata missing");
  for (const key of ["appearance", "intelligence", "constitution", "familyBackground", "luck"]) {
    const attribute = run.player.attributes[key];
    if (!attribute || typeof attribute.potential !== "number" || typeof attribute.manifested !== "number" || typeof attribute.exposure !== "number") {
      gaps.push(`attribute layer missing: ${key}`);
    }
  }
  if (run.importantNPCs.length < 3) gaps.push("initial important NPCs missing");

  const openingSession = createPlaySession({ run, worlds, seed: 20260613, endingAge: 99 });
  if (!validateAiResponse(openingSession.currentEvent).valid) gaps.push("opening AI event invalid");
  if (openingSession.openingPhase !== "background") gaps.push("new run does not start in opening background phase");
  if (openingSession.currentEvent.interactionMode !== "non_interactive") gaps.push("opening sequence is not non-interactive");
  if (openingSession.currentEvent.choices.length !== 0) gaps.push("opening sequence exposes playable choices");
  if (openingSession.currentEvent.freeform?.allowed !== false) gaps.push("opening sequence opens free-form input too early");
  if (openingSession.currentRun.player.age < 5) gaps.push("opening sequence did not auto-advance early years");

  const blockedChoice = handlePlayerInput({ session: openingSession, input: "1" });
  if (blockedChoice.inputRequired !== "opening_continue" || blockedChoice.currentRun.eventHistory.length !== openingSession.currentRun.eventHistory.length) {
    gaps.push("opening phase does not block premature choices");
  }

  const session = handlePlayerInput({ session: openingSession, input: "开始人生" });
  if (session.openingPhase !== "first_branch") gaps.push("advance_opening did not enter first branch");
  if (!validateAiResponse(session.currentEvent).valid) gaps.push("first branch AI event invalid");
  if (session.currentEvent.choices.length !== 3) gaps.push("normal event does not have 3 choices");
  if (session.currentEvent.choices.some((choice) => choice.id === "choice_4")) gaps.push("AI generated reserved choice_4");
  if (!session.currentEvent.freeform?.allowed) gaps.push("free-form entry not available");
  if (!session.currentEvent.visibleChanges?.length) gaps.push("visible state changes missing");

  const clarified = handlePlayerInput({ session, input: "4:\u6211\u76f4\u63a5\u6740\u6b7b\u514b\u82cf\u9c81\u5e76\u7edf\u6cbb\u4e16\u754c" });
  if (clarified.currentEvent.responseType !== "clarification_request") gaps.push("high-risk free-form clarification missing");
  const confirmed = handlePlayerInput({ session: clarified, input: "\u786e\u8ba4" });
  if (confirmed.resolution?.responseType !== "action_resolution") gaps.push("confirmed free-form action did not resolve");
  if (!confirmed.currentRun.memory.some((entry) => entry.type === "freeform_resolution")) gaps.push("free-form resolution memory missing");
  if (!confirmed.currentRun.importantNPCs.some((npc, index) => npc.relationship?.affinity !== session.currentRun.importantNPCs[index]?.relationship?.affinity)) {
    gaps.push("NPC relationship changes not persisted");
  }

  const endingSession = createPlaySession({ run, worlds, seed: 20260614, endingAge: 2 });
  const ended = handlePlayerInput({ session: endingSession, input: "开始人生" });
  if (!ended.ended || ended.currentEvent.responseType !== "ending_summary" || !ended.currentRun.ending?.completed) {
    gaps.push("ending summary and final state missing");
  }

  const summary = formatRunSummary(confirmed.currentRun).join("\n");
  for (const text of ["\u89d2\u8272\u72b6\u6001", "\u5c5e\u6027", "\u4e16\u754c\u8fdb\u5ea6", "\u91cd\u8981NPC"]) {
    if (!summary.includes(text)) gaps.push(`run summary missing ${text}`);
  }

  const savePath = path.join("tmp", "playtest-readiness-check.json");
  saveRunToFile(confirmed.currentRun, savePath);
  const loaded = loadRunFromFile(savePath);
  if (loaded.runId !== confirmed.currentRun.runId || loaded.eventHistory.length !== confirmed.currentRun.eventHistory.length) {
    gaps.push("save/load does not preserve run");
  }

  return {
    ok: gaps.length === 0,
    detail: gaps.length === 0 ? "setup, attributes, talents, events, free-form, NPCs, save/load, endings" : gaps.slice(0, 4).join("; "),
  };
}

function checkOpenEventGenerationRules() {
  const worlds = loadMvpWorlds();
  const requiredSources = ["seed_pool", "ai_free", "player_consequence", "npc_driven", "world_progress", "natural_life", "random_disturbance"];
  const gaps = [];

  for (const [worldId, world] of Object.entries(worlds)) {
    const eventGeneration = world.config.eventGeneration;
    if (!eventGeneration) {
      gaps.push(`${worldId} missing eventGeneration`);
      continue;
    }
    for (const source of requiredSources) {
      if (typeof eventGeneration.sourceWeights?.[source] !== "number") gaps.push(`${worldId} missing source ${source}`);
    }
    const total = Object.values(eventGeneration.sourceWeights ?? {}).reduce((sum, value) => sum + value, 0);
    if (total !== 100) gaps.push(`${worldId} source weights total ${total}`);
    if (eventGeneration.poolMode !== "open_soft_seed_pool") gaps.push(`${worldId} pool mode not open soft`);
    if (eventGeneration.seedStrictnessDefault !== "soft") gaps.push(`${worldId} seed strictness not soft`);
    if (eventGeneration.aiAdaptationDefault !== "must_adapt") gaps.push(`${worldId} adaptation not required`);
    if (eventGeneration.allowAiFreeGenerationWhenNoSeedFits !== true) gaps.push(`${worldId} no AI-free fallback`);
  }

  return {
    ok: gaps.length === 0,
    detail: gaps.length === 0 ? "7 event sources, soft pools, AI-free fallback" : gaps.slice(0, 4).join("; "),
  };
}

function checkAiProviderEnv(env) {
  const { deepseekReady, compatibleReady } = getProviderConfigStatus(env);
  return {
    ok: deepseekReady || compatibleReady,
    detail: deepseekReady
      ? "DEEPSEEK_API_KEY is set"
      : compatibleReady
        ? "OpenAI-compatible provider env is set"
        : "mock mode works; set DeepSeek or OpenAI-compatible env for real AI",
  };
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

async function checkLiveAiSmoke({ env, fetchImpl }) {
  try {
    const result = await smokeAiProvider({
      env,
      args: ["--required", "--full", "--world", "cthulhu", "--seed", "20260612"],
      fetchImpl,
    });
    if (result.status !== "passed") {
      return {
        ok: false,
        detail: result.reason ?? result.hint ?? result.status,
      };
    }
    return {
      ok: true,
      detail: `${result.mode} returned valid life_event, action_resolution, and ending_summary JSON`,
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}


function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const normalizedKey = key.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
    parsed[normalizedKey] = true;
    parsed[key] = true;
  }
  return parsed;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === currentFile.toLowerCase()) {
  runCli();
}
