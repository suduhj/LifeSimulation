import fs from "node:fs";
import path from "node:path";

// Failure log for real-AI generation. When a provider call cannot produce a valid response (after
// retries + repair), we do NOT fabricate a mock substitute — that silently resets the story and
// hides the real problem. Instead the failure is surfaced to the player as a retry and recorded
// here so the exact reason (validation errors, leaks, HTTP/timeout) can be reviewed later.
//
// Logging is opt-in: app entry points (web server, play CLI) call enableAiFailureLog() at startup;
// unit tests leave it disabled so simulated failures do not write to disk. Writing is best-effort
// and never throws — a logging problem must never break a turn.

let logFilePath = null;

export function enableAiFailureLog(filePath = path.join("logs", "ai-failures.jsonl")) {
  logFilePath = filePath;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  } catch {
    // best-effort: if the directory cannot be created, recordAiFailure will no-op on append
  }
  return logFilePath;
}

export function disableAiFailureLog() {
  logFilePath = null;
}

export function getAiFailureLogPath() {
  return logFilePath;
}

export function recordAiFailure(entry = {}) {
  if (!logFilePath) return;
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
    fs.appendFileSync(logFilePath, line);
  } catch {
    // best-effort: never let logging break a turn
  }
}
