#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SECRET_PATTERN = /DEEPSEEK_API_KEY|OPENAI_COMPATIBLE_API_KEY|OPENAI_COMPATIBLE_BASE_URL|OPENAI_COMPATIBLE_MODEL|Authorization\s*:|Bearer\s+[A-Za-z0-9._-]+|api\.deepseek\.com|\/chat\/completions|sk-[A-Za-z0-9_-]{10,}/;

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  try {
    const result = await smokeWebPlaytest(options);
    console.log("Web playtest smoke passed");
    console.log(`URL: ${result.baseUrl}`);
    console.log(`AI mode: ${result.aiMode}`);
    console.log(`Worlds: ${result.worldCount}`);
    console.log(`Final response: ${result.finalResponseType}`);
    console.log(`Saved run: ${result.savedPath}`);
  } catch (error) {
    console.error(`Web playtest smoke failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export async function smokeWebPlaytest({
  ai = "mock",
  port = "0",
  endingAge = "12",
  host = "127.0.0.1",
  timeoutMs = "20000",
} = {}) {
  const child = spawn(process.execPath, ["src/web-server.js", "--host", host, "--port", String(port)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    const baseUrl = await waitForServerUrl(child, () => stdout, Number.parseInt(String(timeoutMs), 10));
    const result = await exerciseWebFlow({ baseUrl, aiMode: ai, endingAge: Number.parseInt(String(endingAge), 10) });
    return {
      ...result,
      baseUrl,
      aiMode: ai,
      serverOutput: sanitizeOutput(stdout),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}${stderr ? `; server stderr: ${sanitizeOutput(stderr).slice(0, 500)}` : ""}`);
  } finally {
    child.kill();
  }
}

async function exerciseWebFlow({ baseUrl, aiMode, endingAge }) {
  const html = await getText(baseUrl);
  assert(html.includes("timeline") && html.includes("currentNode"), "home page does not include the life timeline/current node surface");
  assertNoSecrets("home page", html);

  const worldsPayload = await getJson(`${baseUrl}/api/worlds`);
  assert(Array.isArray(worldsPayload.worlds), "world list response is malformed");
  assert(worldsPayload.worlds.length === 3, `expected 3 MVP worlds, got ${worldsPayload.worlds.length}`);
  assert(["cultivation", "cthulhu", "wasteland"].every((id) => worldsPayload.worlds.some((world) => world.id === id)), "world list is missing one of the three MVP worlds");
  assertNoSecrets("world list", worldsPayload);

  const setupInput = {
    worldId: "cthulhu",
    name: "LinLan",
    gender: "female",
    personality: "curious",
    allocation: {
      appearance: 6,
      intelligence: 6,
      constitution: 4,
      familyBackground: 2,
      luck: 2,
    },
    seed: 20260612,
  };
  const preview = await postJson(`${baseUrl}/api/setup/preview`, setupInput);
  assert(preview.talentDraw?.length === 5, "setup preview did not draw 5 talents");
  assert(preview.defaultKeptTalentIds?.length === 3, "setup preview did not propose 3 kept talents");
  assertNoSecrets("setup preview", preview);

  let session = await postJson(`${baseUrl}/api/run/start`, {
    ...setupInput,
    aiMode,
    endingAge,
    keptTalentIds: preview.defaultKeptTalentIds,
  });
  assertOpeningSession(session, "started session");
  assertNoSecrets("started session", session);

  session = await postJson(`${baseUrl}/api/run/action`, {
    sessionId: session.sessionId,
    action: { kind: "advance_opening" },
  });
  assertPlayableOrEndingSession(session, "after opening advance");
  assertNoSecrets("after opening advance", session);

  session = await postJson(`${baseUrl}/api/run/action`, {
    sessionId: session.sessionId,
    action: { kind: "choice", choiceId: "choice_1" },
  });
  assert(session.resolution?.responseType === "action_resolution", "choice did not produce an action resolution");
  assert(session.resolution.visibleChanges?.length > 0, "choice resolution did not expose visible changes");
  assertPlayableOrEndingSession(session, "after choice");
  assertNoSecrets("after choice", session);

  if (!session.ended) {
    session = await postJson(`${baseUrl}/api/run/action`, {
      sessionId: session.sessionId,
      action: {
        kind: "freeform",
        text: "I quietly observe the people around me, avoid obvious danger, and record what feels unusual.",
      },
    });
    if (session.pendingFreeformConfirmation) {
      session = await postJson(`${baseUrl}/api/run/action`, {
        sessionId: session.sessionId,
        action: { kind: "confirm" },
      });
    }
    assert(session.resolution?.responseType === "action_resolution" || session.currentEvent?.responseType === "ending_summary", "free-form action did not resolve or end the run");
    assertNoSecrets("after free-form", session);
  }

  const savePath = path.join("tmp", `web-smoke-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const saved = await postJson(`${baseUrl}/api/run/save`, {
    sessionId: session.sessionId,
    path: savePath,
  });
  assert(saved.path && fs.existsSync(saved.path), "save endpoint did not create a local save file");
  assertNoSecrets("saved run", saved);

  session = await postJson(`${baseUrl}/api/run/load`, {
    path: saved.path,
    aiMode,
    endingAge,
    seed: 20260613,
  });
  assertPlayableOrEndingSession(session, "loaded session");
  assertNoSecrets("loaded session", session);

  let turns = 0;
  while (!session.ended && turns < 12) {
    session = await postJson(`${baseUrl}/api/run/action`, {
      sessionId: session.sessionId,
      action: { kind: "choice", choiceId: "choice_1" },
    });
    assertNoSecrets(`ending loop turn ${turns + 1}`, session);
    turns += 1;
  }

  assert(session.ended, "run did not reach an ending within the smoke-test turn limit");
  assert(session.currentEvent?.responseType === "ending_summary", "final currentEvent is not an ending summary");
  assert(session.currentEvent?.choices?.length === 0, "ending summary should not expose playable choices");
  assert(session.run?.ending?.completed === true, "ending state was not saved into the run");

  return {
    worldCount: worldsPayload.worlds.length,
    savedPath: saved.path,
    finalResponseType: session.currentEvent.responseType,
  };
}

function assertOpeningSession(session, label) {
  assert(session?.sessionId, `${label} is missing sessionId`);
  assert(session.run?.player?.attributes, `${label} is missing player attributes`);
  assert(session.openingPhase === "background", `${label} is not in the opening background phase`);
  assert(session.currentEvent?.responseType === "life_event", `${label} opening is not a life_event`);
  assert(session.currentEvent?.interactionMode === "non_interactive", `${label} opening is not non_interactive`);
  assert(session.currentEvent?.choices?.length === 0, `${label} opening must not expose playable choices`);
  assert(session.currentEvent?.freeform?.allowed === false, `${label} opening must not allow free-form input`);
  assert(session.run.player.age >= 5, `${label} opening did not auto-advance early years (age ${session.run.player.age})`);
}

function assertPlayableOrEndingSession(session, label) {
  assert(session?.sessionId, `${label} is missing sessionId`);
  assert(session.run?.player?.attributes, `${label} is missing player attributes`);
  assert(Array.isArray(session.run?.summaryLines) && session.run.summaryLines.length > 0, `${label} is missing run summary lines`);
  if (session.ended) {
    assert(session.currentEvent?.responseType === "ending_summary", `${label} ended without ending_summary`);
    return;
  }
  assert(session.currentEvent?.responseType === "life_event", `${label} current event is not a life_event`);
  assert(session.currentEvent?.choices?.length === 3, `${label} does not have exactly 3 choices`);
  assert(session.currentEvent?.freeform?.allowed === true, `${label} does not allow free-form input`);
}

async function waitForServerUrl(child, getOutput, timeoutMs) {
  const timeoutAt = Date.now() + Math.max(timeoutMs || 20000, 1000);
  while (Date.now() < timeoutAt) {
    const output = getOutput();
    const match = output.match(/AI Life Simulator web playtest:\s+(http:\/\/127\.0\.0\.1:\d+)/);
    if (match) return match[1];
    if (child.exitCode !== null) {
      throw new Error(`web server exited before printing its URL (exit ${child.exitCode})`);
    }
    await sleep(50);
  }
  throw new Error("timed out waiting for the web server URL");
}

async function getText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.text();
}

async function getJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`POST ${url} failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

function assertNoSecrets(label, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert(!SECRET_PATTERN.test(text), `${label} appears to expose provider secret or direct provider transport details`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeOutput(text) {
  return String(text ?? "").replace(SECRET_PATTERN, "[REDACTED]");
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = rawArgs[index + 1];
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === currentFile.toLowerCase()) {
  runCli();
}
