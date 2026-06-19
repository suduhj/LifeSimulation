import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
});
