import fs from "node:fs";
import path from "node:path";

import { ensureGrowthLedger } from "./growth-ledger.js";
import { assertValidRunState } from "./run-validator.js";
import { ensureEventLog } from "./runtime/event-log.js";
import { replayRun } from "./runtime/replay-run.js";

export function saveRunToFile(run, filePath) {
  assertValidRunState(run, "saveRunToFile input");
  ensureEventLog(run);
  const absolutePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  return absolutePath;
}

export function loadRunFromFile(filePath) {
  const absolutePath = path.resolve(filePath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse save file ${absolutePath}: ${error.message}`);
  }
  migrateLoadedRun(parsed);
  let loaded;
  try {
    loaded = parsed.eventLog?.schemaVersion === "mvp.event_log.v1"
      ? replayRun(parsed.eventLog)
      : parsed;
  } catch (error) {
    throw new Error(`save file ${absolutePath} failed run validation: ${error.message}`);
  }
  return assertValidRunState(loaded, `save file ${absolutePath}`);
}

function migrateLoadedRun(run) {
  if (!run || typeof run !== "object" || Array.isArray(run)) return run;
  if (run.schemaVersion !== "mvp.run.v1") return run;
  if (!run.player || typeof run.player !== "object" || Array.isArray(run.player)) return run;
  ensureGrowthLedger(run);
  ensureEventLog(run);
  return run;
}
