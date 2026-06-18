#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLAYTEST_CONTENT_TARGETS = {
  identitySeeds: { min: 15, ideal: 20 },
  talentSeeds: { min: 30, ideal: 50 },
  eventSeeds: { min: 50, ideal: 80 },
  npcTemplates: { min: 20, ideal: 30 },
  endingSeeds: { min: 20, ideal: 30 },
  worldProgress: { min: 5, ideal: 8 },
  factionSeeds: { min: 8, ideal: 15 },
  locationSeeds: { min: 10, ideal: 20 },
};

const WORLD_IDS = ["cultivation", "cthulhu", "wasteland"];

export function auditPlaytestContent({ worldsDir = "worlds" } = {}) {
  const worldsRoot = path.resolve(worldsDir);

  return WORLD_IDS.map((worldId) => {
    const worldDir = path.join(worldsRoot, worldId);
    const config = readJson(path.join(worldDir, "world.config.json"));
    const counts = {
      identitySeeds: countItems(worldDir, "identity-seeds.json", "identitySeeds"),
      talentSeeds: countItems(worldDir, "talents.json", "talents"),
      eventSeeds: countItems(worldDir, "event-seeds.json", "eventSeeds"),
      npcTemplates: countItems(worldDir, "npc-templates.json", "templates"),
      endingSeeds: countItems(worldDir, "endings.json", "endings"),
      worldProgress: Math.max(config.progressBars?.length ?? 0, config.secondaryProgression?.length ?? 0),
      factionSeeds: countItems(worldDir, "faction-seeds.json", "factions"),
      locationSeeds: countItems(worldDir, "location-seeds.json", "locations"),
    };

    return {
      worldId,
      counts,
      gaps: Object.fromEntries(
        Object.entries(PLAYTEST_CONTENT_TARGETS).map(([key, target]) => [
          key,
          {
            current: counts[key],
            min: target.min,
            ideal: target.ideal,
            status: counts[key] >= target.ideal ? "ideal" : counts[key] >= target.min ? "minimum" : "gap",
            missingToMin: Math.max(0, target.min - counts[key]),
            missingToIdeal: Math.max(0, target.ideal - counts[key]),
          },
        ]),
      ),
    };
  });
}

function countItems(worldDir, fileName, key) {
  const filePath = path.join(worldDir, fileName);
  if (!fs.existsSync(filePath)) return 0;
  const value = readJson(filePath)[key];
  return Array.isArray(value) ? value.length : 0;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runCli() {
  const strict = process.argv.includes("--strict");
  const worldsDir = process.argv.find((arg) => arg.startsWith("--worlds-dir="))?.split("=")[1] ?? "worlds";
  const audit = auditPlaytestContent({ worldsDir });
  let hasGaps = false;

  console.log("Playtest content audit");
  console.log("Target: system-complete playtest with reduced content scale");

  for (const world of audit) {
    console.log(`\n${world.worldId}`);
    for (const [key, gap] of Object.entries(world.gaps)) {
      if (gap.status === "gap") hasGaps = true;
      const mark = gap.status === "ideal" ? "OK" : gap.status === "minimum" ? "MIN" : "GAP";
      console.log(
        `  ${mark} ${key}: ${gap.current}/${gap.min} min, ${gap.ideal} ideal` +
          (gap.status === "gap" ? ` (missing ${gap.missingToMin} to min)` : ""),
      );
    }
  }

  if (hasGaps) {
    console.log("\nResult: content gaps remain for the playtest target.");
    if (strict) {
      process.exitCode = 1;
    }
    return;
  }

  console.log("\nResult: all worlds meet the minimum playtest content target.");
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runCli();
}
