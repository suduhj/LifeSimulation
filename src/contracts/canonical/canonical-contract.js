import { buildPanelViews } from "../../selectors/index.js";

export const CANONICAL_CONTRACT_SCHEMA_VERSION = "mvp.canonical_contract.v1";

export function buildCanonicalContract({ run, panelViews } = {}) {
  const storyState = run?.worldState?.storyState ?? {};
  return {
    schemaVersion: CANONICAL_CONTRACT_SCHEMA_VERSION,
    runId: run?.runId,
    worldId: run?.worldId,
    eventLog: structuredClone(run?.eventLog ?? []),
    lifeNodes: structuredClone(storyState.lifeNodes ?? []),
    growthLedger: structuredClone(run?.player?.growthLedger ?? null),
    yearlyOutcomes: structuredClone(storyState.yearlyOutcomes ?? []),
    panelViews: structuredClone(panelViews ?? buildPanelViews(run)),
  };
}
