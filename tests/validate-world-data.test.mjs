import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findRuntimeJsonFiles,
  validateRuntimeData,
  validateRuntimeDocument,
} from "../tools/validate-world-data.mjs";
import { auditPlaytestContent } from "../tools/audit-playtest-content.mjs";

describe("world runtime data validator", () => {
  it("finds MVP runtime JSON files", () => {
    const files = findRuntimeJsonFiles("worlds");

    assert.ok(files.length >= 18);
    assert.ok(files.some((file) => file.endsWith("worlds/cultivation/talents.json")));
    assert.ok(files.some((file) => file.endsWith("worlds/cthulhu/event-seeds.json")));
    assert.ok(files.some((file) => file.endsWith("worlds/wasteland/npc-templates.json")));
  });

  it("accepts the current MVP world runtime data", () => {
    const result = validateRuntimeData({ rootDir: "worlds" });

    assert.equal(result.valid, true, result.errors.join("\n"));
    assert.equal(result.errors.length, 0);
    assert.equal(result.filesChecked, 30);
    assert.deepEqual(result.poolFileCounts, {
      event_seed_pool: 3,
      faction_seed_pool: 3,
      identity_seed_pool: 3,
      location_seed_pool: 3,
      npc_template_seed_pool: 3,
      talent_seed_pool: 3,
    });
  });

  it("reports playtest content thickness against target counts", () => {
    const audit = auditPlaytestContent({ worldsDir: "worlds" });
    const cultivation = audit.find((world) => world.worldId === "cultivation");

    assert.equal(audit.length, 3);
    assert.ok(cultivation.gaps.factionSeeds.current >= 8);
    assert.ok(cultivation.gaps.locationSeeds.current >= 10);
    assert.equal(cultivation.gaps.eventSeeds.status, "minimum");
  });

  it("rejects invalid stable IDs in seed pools", () => {
    const result = validateRuntimeDocument(
      {
        worldId: "cultivation",
        type: "talent_seed_pool",
        talents: [
          {
            id: "Bad Id",
            rarity: "common",
            effects: { attributePotential: { intelligence: 2 } },
            manifestationType: "stage",
            tags: ["learning"],
          },
        ],
      },
      "worlds/cultivation/talents.json",
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("stable id")));
  });

  it("rejects event seeds without rich generation anchors", () => {
    const result = validateRuntimeDocument(
      {
        worldId: "cthulhu",
        type: "event_seed_pool",
        eventSeeds: [
          {
            id: "empty_event",
            lifeStages: ["adulthood"],
            sceneTags: [],
            riskLevel: "medium",
            possibleEffects: [],
            aiUseRuleKey: "cthulhu.event.empty_event",
          },
        ],
      },
      "worlds/cthulhu/event-seeds.json",
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("sceneTags")));
    assert.ok(result.errors.some((error) => error.includes("possibleEffects")));
  });
});
