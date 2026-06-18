#!/usr/bin/env node

import fs from "node:fs";

const checks = [
  {
    file: "src/run-loop.js",
    mustContain: ["patchToDomainEvents", "transitionRun"],
    mustNotContain: ["applyStatePatch("],
  },
  {
    file: "src/save-store.js",
    mustContain: ["replayRun", "ensureEventLog"],
  },
  {
    file: "src/ai-provider.js",
    mustContain: ["buildPromptView"],
  },
  {
    file: "src/web-session-store.js",
    mustContain: ["buildPlayerView", "buildGmView"],
  },
  {
    file: "src/dev-tools.js",
    mustContain: ["createDomainEvent", "transitionRun"],
    mustNotContain: ["rebuildGrowthLedgerFromAttributes"],
  },
];

let failures = 0;
for (const check of checks) {
  const content = fs.readFileSync(check.file, "utf8");
  for (const pattern of check.mustContain ?? []) {
    if (!content.includes(pattern)) {
      console.error(`${check.file} must contain ${pattern}`);
      failures += 1;
    }
  }
  for (const pattern of check.mustNotContain ?? []) {
    if (content.includes(pattern)) {
      console.error(`${check.file} must not contain ${pattern}`);
      failures += 1;
    }
  }
}

if (failures === 0) {
  console.log("Architecture checks passed.");
} else {
  process.exitCode = 1;
}
