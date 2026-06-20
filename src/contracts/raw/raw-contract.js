export const RAW_CONTRACT_SCHEMA_VERSION = "mvp.raw_contract.v1";

export function buildRawContract({ currentEvent, rawResponse, validatorReports = [] } = {}) {
  return {
    schemaVersion: RAW_CONTRACT_SCHEMA_VERSION,
    currentEvent: currentEvent ? structuredClone(currentEvent) : undefined,
    rawResponse: rawResponse ? structuredClone(rawResponse) : undefined,
    validatorReports: structuredClone(validatorReports),
  };
}
