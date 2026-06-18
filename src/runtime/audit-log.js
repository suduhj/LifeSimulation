export function createAuditEntry(event, details = {}) {
  return {
    eventId: event.eventId,
    type: event.type,
    source: event.source,
    turnId: event.turnId,
    ...details,
  };
}
