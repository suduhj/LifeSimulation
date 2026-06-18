#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { buildPlayerView, replayRun } from "../src/index.js";

const fixtureDir = path.resolve("tests", "replay-fixtures");
const files = fs.existsSync(fixtureDir)
  ? fs.readdirSync(fixtureDir).filter((file) => file.endsWith(".json"))
  : [];

let failures = 0;
for (const file of files) {
  const fixturePath = path.join(fixtureDir, file);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  try {
    const run = replayRun(fixture.eventLog);
    assertExpected(run, fixture.expected ?? {});
    console.log(`PASS ${file}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (files.length === 0) {
  console.log("No replay fixtures found.");
}
if (failures > 0) {
  process.exitCode = 1;
}

function assertExpected(run, expected) {
  for (const fact of expected.closedFacts ?? []) {
    if (!run.worldState?.storyState?.closedFacts?.includes(fact)) {
      throw new Error(`expected closed fact ${fact}`);
    }
  }
  for (const [threadId, stage] of Object.entries(expected.threadStages ?? {})) {
    const thread = run.worldState?.storyState?.threads?.find((item) => item.threadId === threadId);
    if (thread?.stage !== stage) throw new Error(`expected thread ${threadId} stage ${stage}`);
  }
  const playerViewJson = JSON.stringify(buildPlayerView(run));
  for (const forbidden of expected.playerViewMustNotContain ?? []) {
    if (playerViewJson.includes(forbidden)) {
      throw new Error(`PlayerView leaked ${forbidden}`);
    }
  }
}
