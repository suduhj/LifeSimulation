import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createInitialRun,
  loadMvpWorlds,
} from "../src/index.js";
import {
  originIsCompatibleWithFamilyBackground,
  resolveWorldOrigin,
} from "../src/world-origin-resolver.js";

describe("world origin resolver", () => {
  it("does not allow high family background to resolve into poor or ordinary-hunter origins", () => {
    const origin = resolveWorldOrigin({
      worldId: "cultivation",
      familyBackgroundValue: 18,
      seed: 1,
    });

    assert.equal(origin.attributeKey, "familyBackground");
    assert.equal(origin.familyBackgroundTier, "advantaged");
    assert.equal(originIsCompatibleWithFamilyBackground(origin, 18), true);
    assert.doesNotMatch(origin.label, /贫苦|佃户|普通猎户|山村边缘/);
    assert.doesNotMatch(origin.playerVisibleSummary, /familyBackground|originId|advantaged/);
    assert.match(origin.playerVisibleSummary, /家|资源|照看|关系|底色/);
  });

  it("does not allow low family background to resolve into elite or resource-holder origins", () => {
    const origin = resolveWorldOrigin({
      worldId: "wasteland",
      familyBackgroundValue: 1,
      seed: 2,
    });

    assert.equal(origin.familyBackgroundTier, "strained");
    assert.equal(originIsCompatibleWithFamilyBackground(origin, 1), true);
    assert.doesNotMatch(origin.label, /管理层|技术员|资源配给|医疗站/);
    assert.match(origin.playerVisibleSummary, /缺|底层|边缘|拾荒|流民|劳工/);
  });

  it("resolves all three worlds into world-flavored but contract-compatible origins", () => {
    for (const worldId of ["cultivation", "cthulhu", "wasteland"]) {
      const origin = resolveWorldOrigin({ worldId, familyBackgroundValue: 12, seed: 3 });

      assert.equal(origin.schemaVersion, "mvp.world_origin.v1");
      assert.equal(origin.worldId, worldId);
      assert.equal(origin.attributeKey, "familyBackground");
      assert.equal(originIsCompatibleWithFamilyBackground(origin, 12), true);
      assert.ok(origin.label);
      assert.ok(origin.playerVisibleSummary);
      assert.ok(Array.isArray(origin.mustInclude));
      assert.ok(Array.isArray(origin.mustNotInclude));
    }
  });

  it("selects initial identity seeds compatible with final family background in every world", () => {
    const worlds = loadMvpWorlds();
    const cases = [
      {
        name: "high family background",
        allocation: { appearance: 0, intelligence: 0, constitution: 0, familyBackground: 20, luck: 0 },
        forbiddenHints: /very_low|low|low_to_medium/,
      },
      {
        name: "low family background",
        allocation: { appearance: 6, intelligence: 6, constitution: 6, familyBackground: 0, luck: 2 },
        forbiddenHints: /medium_to_high|high|high_variance/,
      },
    ];

    for (const worldId of ["cultivation", "cthulhu", "wasteland"]) {
      for (const testCase of cases) {
        const run = createInitialRun({
          worlds,
          worldId,
          seed: 2026062001,
          playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
          allocation: testCase.allocation,
        });
        const familyValue = run.player.growthLedger.attributes.familyBackground.potential;
        const origin = resolveWorldOrigin({ run, worldId, seed: run.seed });
        const hint = JSON.stringify({ familyBackground: run.setup.identitySeed.anchorAttributeHints?.familyBackground });

        assert.equal(
          originIsCompatibleWithFamilyBackground(origin, familyValue),
          true,
          `${worldId} ${testCase.name} resolved origin must be compatible`,
        );
        assert.doesNotMatch(
          hint,
          testCase.forbiddenHints,
          `${worldId} ${testCase.name} identitySeed ${run.player.identitySeedId} has incompatible family hint ${hint}`,
        );
      }
    }
  });
});
