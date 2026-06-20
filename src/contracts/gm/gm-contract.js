export const GM_CONTRACT_SCHEMA_VERSION = "mvp.gm_contract.v1";

export function buildGmContract({ run, currentEvent, rawResponse, gmView, validatorReports = [] } = {}) {
  return {
    schemaVersion: GM_CONTRACT_SCHEMA_VERSION,
    runId: run?.runId,
    worldId: run?.worldId,
    gmView: gmView ?? { run },
    currentEvent: currentEvent ? structuredClone(currentEvent) : undefined,
    rawResponse: rawResponse ? structuredClone(rawResponse) : undefined,
    validatorReports: structuredClone(validatorReports),
  };
}

export function validateGmContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    errors.push("GMContract must be an object");
  }
  if (contract?.schemaVersion !== GM_CONTRACT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${GM_CONTRACT_SCHEMA_VERSION}`);
  }
  return { valid: errors.length === 0, errors };
}
