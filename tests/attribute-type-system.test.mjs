import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createInitialRun,
  attributeTierForValue,
  getAttributePanelView,
  loadMvpWorlds,
  maturityCapForAge,
} from "../src/index.js";

describe("attribute type system", () => {
  it("age-caps only constitution and intelligence", () => {
    assert.equal(maturityCapForAge(0, "appearance"), Number.MAX_SAFE_INTEGER);
    assert.equal(maturityCapForAge(0, "familyBackground"), Number.MAX_SAFE_INTEGER);
    assert.equal(maturityCapForAge(0, "luck"), Number.MAX_SAFE_INTEGER);
    assert.ok(maturityCapForAge(0, "constitution") < Number.MAX_SAFE_INTEGER);
    assert.ok(maturityCapForAge(0, "intelligence") < Number.MAX_SAFE_INTEGER);
  });

  it("keeps appearance, family background, and luck unsealed in the attribute panel", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2026061904,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
      allocation: {
        appearance: 4,
        intelligence: 2,
        constitution: 2,
        familyBackground: 10,
        luck: 2,
      },
    });
    run.player.age = 7;

    const view = getAttributePanelView(run);
    const appearance = findCard(view, "颜值");
    const family = findCard(view, "家境");
    const luck = findCard(view, "运气");

    assert.equal(appearance.showAgeSeal, false);
    assert.equal(family.showAgeSeal, false);
    assert.equal(luck.showAgeSeal, false);
    assert.equal(appearance.ageSealed, 0);
    assert.equal(family.ageSealed, 0);
    assert.equal(luck.ageSealed, 0);
    assert.equal(appearance.ageSealTitle, "尚未定型");
    assert.equal(family.ageSealTitle, "家庭底色");
    assert.equal(luck.ageSealTitle, "机缘倾向");
  });

  it("uses the shared attribute tier table for panel peer labels", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 2026062005,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
      allocation: {
        appearance: 9,
        intelligence: 4,
        constitution: 3,
        familyBackground: 2,
        luck: 2,
      },
    });

    const view = getAttributePanelView(run);
    for (const name of ["颜值", "智力", "体质"]) {
      const card = findCard(view, name);
      assert.equal(card.peerLabel, attributeTierForValue(card.current).label);
    }
  });
});

function findCard(view, name) {
  return (view.groups ?? [])
    .flatMap((group) => group.cards ?? [])
    .find((card) => card.name === name);
}
