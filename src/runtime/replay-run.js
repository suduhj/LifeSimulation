import { createEventLog, normalizeEvent } from "./event-log.js";
import { assertRunInvariants } from "./invariants.js";
import { reduceRunEvent } from "../domain/reducers/run-reducer.js";

export function replayRun(eventLog) {
  if (!eventLog || typeof eventLog !== "object" || Array.isArray(eventLog)) {
    throw new Error("replayRun requires an event log");
  }
  const normalizedLog = createEventLog({
    runId: eventLog.runId,
    worldId: eventLog.worldId,
    events: eventLog.events ?? [],
  });
  let run;
  for (const [index, rawEvent] of normalizedLog.events.entries()) {
    const event = normalizeEvent(rawEvent, index);
    const previousRun = run ? structuredClone(run) : undefined;
    run = reduceRunEvent(run, event);
    if (previousRun) assertRunInvariants({ previousRun, run });
  }
  if (!run) throw new Error("event log does not contain run.created");
  run.eventLog = normalizedLog;
  assertRunInvariants({ run });
  return run;
}
