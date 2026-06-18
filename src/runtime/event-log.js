export const EVENT_LOG_SCHEMA_VERSION = "mvp.event_log.v1";

export function createEventLog({ runId, worldId, events = [] } = {}) {
  return {
    schemaVersion: EVENT_LOG_SCHEMA_VERSION,
    runId,
    worldId,
    events: normalizeEvents(events),
  };
}

export function ensureEventLog(run) {
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    throw new Error("ensureEventLog requires a run object");
  }
  if (!run.eventLog || typeof run.eventLog !== "object" || Array.isArray(run.eventLog)) {
    run.eventLog = createEventLog({
      runId: run.runId,
      worldId: run.worldId,
      events: [createRunCreatedEvent(run)],
    });
  } else {
    run.eventLog.schemaVersion = EVENT_LOG_SCHEMA_VERSION;
    run.eventLog.runId = run.eventLog.runId ?? run.runId;
    run.eventLog.worldId = run.eventLog.worldId ?? run.worldId;
    run.eventLog.events = normalizeEvents(run.eventLog.events);
  }
  return run.eventLog;
}

export function appendEvents(eventLog, events = []) {
  const nextLog = createEventLog({
    runId: eventLog.runId,
    worldId: eventLog.worldId,
    events: eventLog.events,
  });
  nextLog.events.push(...normalizeEvents(events, nextLog.events.length));
  return nextLog;
}

export function createRunCreatedEvent(run) {
  return {
    eventId: "evt_000001",
    type: "run.created",
    runId: run.runId,
    worldId: run.worldId,
    turnId: "run_created",
    age: run.player?.age ?? 0,
    source: "engine",
    payload: {
      run: snapshotWithoutEventLog(run),
    },
    metadata: {
      createdAt: deterministicCreatedAt(0),
      reason: "initial run snapshot for event-sourced replay",
    },
  };
}

export function nextEventId(index) {
  return `evt_${String(index + 1).padStart(6, "0")}`;
}

export function normalizeEvent(event, index = 0) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("DomainEvent must be an object");
  }
  if (typeof event.type !== "string" || event.type.length === 0) {
    throw new Error("DomainEvent.type must be a non-empty string");
  }
  return {
    eventId: event.eventId ?? nextEventId(index),
    type: event.type,
    runId: event.runId,
    worldId: event.worldId,
    turnId: event.turnId ?? "",
    age: Number.isFinite(event.age) ? event.age : 0,
    source: event.source ?? "engine",
    payload: stripUndefined(structuredClone(event.payload ?? {})),
    metadata: {
      createdAt: event.metadata?.createdAt ?? deterministicCreatedAt(index),
      ...stripUndefined(structuredClone(event.metadata ?? {})),
    },
  };
}

export function snapshotWithoutEventLog(run) {
  const snapshot = structuredClone(run);
  delete snapshot.eventLog;
  return snapshot;
}

function normalizeEvents(events = [], startIndex = 0) {
  return (Array.isArray(events) ? events : []).map((event, index) => normalizeEvent(event, startIndex + index));
}

function deterministicCreatedAt(index) {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)]),
  );
}
