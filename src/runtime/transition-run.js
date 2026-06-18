import { appendEvents, ensureEventLog, normalizeEvent } from "./event-log.js";
import { assertRunInvariants, checkRunInvariants } from "./invariants.js";
import { buildGmView } from "../domain/projections/gm-view.js";
import { buildPlayerView } from "../domain/projections/player-view.js";
import { buildPromptView } from "../domain/projections/prompt-view.js";
import { reduceRunEvent } from "../domain/reducers/run-reducer.js";

export function transitionRun({ run, events = [], response } = {}) {
  if (!run) throw new Error("transitionRun requires a run");
  const baseRun = structuredClone(run);
  const baseEventLog = ensureEventLog(baseRun);
  const normalizedEvents = events.map((event, index) => normalizeEvent(
    {
      ...event,
      runId: event.runId ?? baseRun.runId,
      worldId: event.worldId ?? baseRun.worldId,
    },
    baseEventLog.events.length + index,
  ));

  let nextRun = structuredClone(baseRun);
  for (const event of normalizedEvents) {
    nextRun = reduceRunEvent(nextRun, event);
  }

  const eventLog = appendEvents(baseEventLog, normalizedEvents);
  nextRun.eventLog = eventLog;
  const playerView = buildPlayerView(nextRun);
  const promptView = buildPromptView(nextRun);
  const gmView = buildGmView(nextRun);
  const invariantResult = checkRunInvariants({ previousRun: baseRun, run: nextRun, playerView });
  assertRunInvariants({ previousRun: baseRun, run: nextRun, playerView });

  return {
    nextRun,
    eventsAppended: normalizedEvents,
    eventLog,
    auditLog: buildAuditLog(normalizedEvents, response),
    playerView,
    promptView,
    gmView,
    invariantResult,
  };
}

function buildAuditLog(events, response) {
  return events.map((event) => ({
    eventId: event.eventId,
    type: event.type,
    source: event.source,
    turnId: event.turnId,
    responseType: response?.responseType,
  }));
}
