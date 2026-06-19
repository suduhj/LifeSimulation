import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ATTRIBUTE_REALITY_KEYS,
  attributeDisplayPolicy,
  attributeLabelForPlayer,
  attributeRealityContractFor,
  attributeTierForValue,
} from "../src/attribute-reality-contract.js";

describe("attribute reality contract", () => {
  it("defines the five player-facing base attributes without world-specific aliases", () => {
    assert.deepEqual(ATTRIBUTE_REALITY_KEYS, [
      "appearance",
      "intelligence",
      "constitution",
      "familyBackground",
      "luck",
    ]);

    assert.deepEqual(
      ATTRIBUTE_REALITY_KEYS.map((key) => attributeLabelForPlayer(key)),
      ["颜值", "智力", "体质", "家境", "运气"],
    );
  });

  it("uses different observable policies for growth attributes, family background, and luck", () => {
    assert.deepEqual(
      {
        constitution: attributeDisplayPolicy("constitution").sealTitle,
        intelligence: attributeDisplayPolicy("intelligence").sealTitle,
        appearance: attributeDisplayPolicy("appearance").sealTitle,
        familyBackground: attributeDisplayPolicy("familyBackground").sealTitle,
        luck: attributeDisplayPolicy("luck").sealTitle,
      },
      {
        constitution: "年龄封存",
        intelligence: "经验封存",
        appearance: "尚未定型",
        familyBackground: "家庭底色",
        luck: "机缘倾向",
      },
    );

    assert.equal(attributeDisplayPolicy("constitution").showSealedValue, true);
    assert.equal(attributeDisplayPolicy("intelligence").showSealedValue, true);
    assert.equal(attributeDisplayPolicy("familyBackground").showSealedValue, false);
    assert.equal(attributeDisplayPolicy("luck").showSealedValue, false);
  });

  it("turns family background numbers into origin constraints instead of age-sealed growth", () => {
    const high = attributeRealityContractFor({
      attribute: "familyBackground",
      value: 21,
      worldId: "cultivation",
    });
    const low = attributeRealityContractFor({
      attribute: "familyBackground",
      value: 2,
      worldId: "cthulhu",
    });

    assert.equal(high.label, "家境");
    assert.equal(high.tier.id, "beyond_conventional");
    assert.match(high.originConstraints.mustInclude.join(" "), /体面|资源|传承|家族|商号/);
    assert.match(high.originConstraints.mustNotInclude.join(" "), /贫苦|普通猎户|底层|破产/);
    assert.equal(high.displayPolicy.showSealedValue, false);

    assert.equal(low.tier.id, "poor");
    assert.match(low.originConstraints.mustInclude.join(" "), /贫困|底层|寄养|流民|边缘/);
    assert.match(low.originConstraints.mustNotInclude.join(" "), /旧钱|管理层|家族旁支|资源配给/);
  });

  it("classifies ordinary and exceptional values into stable observable tiers", () => {
    assert.equal(attributeTierForValue(0).id, "extreme_defect");
    assert.equal(attributeTierForValue(1).id, "very_poor");
    assert.equal(attributeTierForValue(2).id, "poor");
    assert.equal(attributeTierForValue(3).id, "slightly_below_ordinary");
    assert.equal(attributeTierForValue(4).id, "ordinary");
    assert.equal(attributeTierForValue(6).id, "above_ordinary");
    assert.equal(attributeTierForValue(9).id, "excellent");
    assert.equal(attributeTierForValue(12).id, "elite");
    assert.equal(attributeTierForValue(16).id, "top_mortal");
    assert.equal(attributeTierForValue(20).id, "mortal_limit");
    assert.equal(attributeTierForValue(21).id, "beyond_conventional");
  });
});
