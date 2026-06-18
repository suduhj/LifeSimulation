import fs from "node:fs";
import path from "node:path";

import { assertValidRunState } from "./run-validator.js";

export function saveRunToFile(run, filePath) {
  assertValidRunState(run, "saveRunToFile input");
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
  return assertValidRunState(parsed, `save file ${absolutePath}`);
}
