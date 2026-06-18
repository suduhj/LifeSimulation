#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyAiResponseToRun,
  createAiProvider,
  createInitialRun,
  getProviderConfigStatus,
  loadProjectEnv,
  loadMvpWorlds,
  validateAiResponse,
} from "../src/index.js";

function runCli() {
  smokeAiProvider({ env: loadProjectEnv(), args: process.argv.slice(2) })
    .then((result) => {
      printResult(result);
      if (result.status === "failed") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(`AI provider smoke failed: ${error.message}`);
      process.exitCode = 1;
    });
}

export async function smokeAiProvider({ env = process.env, args = [], fetchImpl = globalThis.fetch } = {}) {
  const options = parseArgs(args);
  const mode = resolveSmokeMode({ requestedMode: options.ai, env });
  if (!mode) {
    return {
      status: options.required ? "failed" : "skipped",
      reason: "No real AI provider environment is configured.",
      hint: "Set provider variables in your shell, or copy .env.example to .env and fill in DeepSeek or OpenAI-compatible settings.",
    };
  }

  const worlds = loadMvpWorlds();
  const worldId = options.world ?? "cthulhu";
  const run = createInitialRun({
    worlds,
    worldId,
    seed: Number.parseInt(options.seed ?? "20260612", 10),
    playerProfile: {
      name: options.name ?? "SmokeTester",
      gender: options.gender ?? "unspecified",
      personality: options.personality ?? "curious",
    },
    allocation: {
      appearance: 4,
      intelligence: 6,
      constitution: 4,
      familyBackground: 3,
      luck: 3,
    },
  });
  const provider = createAiProvider({ mode, env, fetchImpl });
  const lifeEvent = await provider.generateLifeEvent({ run, worlds, seed: Number.parseInt(options.seed ?? "20260612", 10) + 1 });
  const lifeValidation = validateAiResponse(lifeEvent);
  if (!lifeValidation.valid) {
    return {
      status: "failed",
      mode,
      reason: `life_event validation failed: ${lifeValidation.errors.join("; ")}`,
    };
  }

  const appliedRun = applyAiResponseToRun(run, lifeEvent);
  const summary = {
    lifeEventTitle: lifeEvent.playerText?.title,
    lifeEventChoices: lifeEvent.choices?.length ?? 0,
    runAgeAfterEvent: appliedRun.player.age,
  };

  if (options.full) {
    const resolution = await provider.generateActionResolution({
      run: appliedRun,
      sourceEvent: lifeEvent,
      action: { kind: "freeform", text: "我先观察周围环境，并试着和身边的人建立关系。" },
      worlds,
      seed: Number.parseInt(options.seed ?? "20260612", 10) + 2,
    });
    const resolutionValidation = validateAiResponse(resolution);
    if (!resolutionValidation.valid) {
      return {
        status: "failed",
        mode,
        reason: `action_resolution validation failed: ${resolutionValidation.errors.join("; ")}`,
      };
    }
    const resolvedRun = applyAiResponseToRun(appliedRun, resolution);
    const ending = await provider.generateEndingSummary({
      run: resolvedRun,
      worlds,
      seed: Number.parseInt(options.seed ?? "20260612", 10) + 3,
      endingAge: resolvedRun.player.age,
      endingReason: "ai_smoke_test",
    });
    const endingValidation = validateAiResponse(ending);
    if (!endingValidation.valid) {
      return {
        status: "failed",
        mode,
        reason: `ending_summary validation failed: ${endingValidation.errors.join("; ")}`,
      };
    }
    summary.actionResolutionTitle = resolution.playerText?.title;
    summary.endingTitle = ending.playerText?.title;
  }

  return {
    status: "passed",
    mode,
    worldId,
    summary,
  };
}

export function resolveSmokeMode({ requestedMode, env = process.env } = {}) {
  if (requestedMode) return requestedMode;
  return getProviderConfigStatus(env).mode;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[index + 1];
    const normalizedKey = key.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      parsed[normalizedKey] = value;
      index += 1;
    } else {
      parsed[key] = true;
      parsed[normalizedKey] = true;
    }
  }
  return parsed;
}

function printResult(result) {
  if (result.status === "skipped") {
    console.log("AI provider smoke skipped");
    console.log(result.reason);
    console.log(result.hint);
    return;
  }

  if (result.status === "failed") {
    console.error("AI provider smoke failed");
    console.error(result.reason);
    if (result.hint) console.error(result.hint);
    return;
  }

  console.log("AI provider smoke passed");
  console.log(`mode: ${result.mode}`);
  console.log(`world: ${result.worldId}`);
  console.log(`life event: ${result.summary.lifeEventTitle}`);
  console.log(`choices: ${result.summary.lifeEventChoices}`);
  if (result.summary.actionResolutionTitle) {
    console.log(`action resolution: ${result.summary.actionResolutionTitle}`);
  }
  if (result.summary.endingTitle) {
    console.log(`ending: ${result.summary.endingTitle}`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === currentFile.toLowerCase()) {
  runCli();
}
