import { DOMAIN_EVENT_TYPE_SET } from "./event-types.js";

export function createDomainEvent({
  type,
  run,
  runId = run?.runId,
  worldId = run?.worldId,
  turnId = "",
  age = run?.player?.age ?? 0,
  source = "engine",
  payload = {},
  metadata = {},
} = {}) {
  if (!DOMAIN_EVENT_TYPE_SET.has(type)) {
    throw new Error(`Unknown domain event type: ${type}`);
  }
  return {
    type,
    runId,
    worldId,
    turnId,
    age,
    source,
    payload: structuredClone(payload),
    metadata: structuredClone(metadata),
  };
}
