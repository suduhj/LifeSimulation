import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  createInitialRun,
  generateOpeningSequence,
  loadMvpWorlds,
  patchToDomainEvents,
  replayRun,
} from "../src/index.js";

describe("Opening Origin Ledger", () => {
  it("generates stable opening origin nodes for the same seed", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);

    const first = generateOpeningSequence({ run, worlds, seed: 101 });
    const second = generateOpeningSequence({ run, worlds, seed: 101 });

    assert.deepEqual(first.statePatch.openingOriginLedgers, second.statePatch.openingOriginLedgers);
    assert.deepEqual(first.statePatch.openingOriginLedgers[0].nodes, second.statePatch.openingOriginLedgers[0].nodes);
  });

  it("varies opening origin bodies for different seeds without changing age bounds", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);

    const first = generateOpeningSequence({ run, worlds, seed: 101 }).statePatch.openingOriginLedgers[0];
    const second = generateOpeningSequence({ run, worlds, seed: 202 }).statePatch.openingOriginLedgers[0];

    assert.equal(first.nodes.length, second.nodes.length);
    assert.ok(first.nodes.every((node) => node.age >= 0 && node.age < first.firstActionAge));
    assert.notDeepEqual(
      first.nodes.map((node) => node.body),
      second.nodes.map((node) => node.body),
      "different seeds should not produce identical 0-6 opening bodies",
    );
  });

  it("records opening origins through domain events and replay", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    const response = generateOpeningSequence({ run, worlds, seed: 303 });

    const events = patchToDomainEvents({ run, response, source: "opening_sequence" });
    const nextRun = applyAiResponseToRun(run, response);
    const replayed = replayRun(nextRun.eventLog);

    assert.ok(events.some((event) => event.type === "opening.origin_recorded"));
    assert.ok(nextRun.worldState.storyState.originLedger);
    assert.equal(nextRun.worldState.storyState.originLedger.schemaVersion, "mvp.opening_origin_ledger.v1");
    assert.equal(nextRun.worldState.storyState.originLedger.nodes.length, response.statePatch.openingOriginLedgers[0].nodes.length);
    assert.deepEqual(replayed.worldState.storyState.originLedger, nextRun.worldState.storyState.originLedger);
  });
});

function createCultivationRun(worlds) {
  return createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
}
