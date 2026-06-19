import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createInitialRun,
  getAttributePanelView,
  loadMvpWorlds,
  maturityCapForAge,
} from "../src/index.js";

describe("attribute type system", () => {
  it("does not age-cap family background or luck as growth abilities", () => {
    assert.equal(maturityCapForAge(7, "familyBackground"), Number.MAX_SAFE_INTEGER);
    assert.equal(maturityCapForAge(7, "luck"), Number.MAX_SAFE_INTEGER);
  });

  it("keeps family background and luck unsealed in the attribute panel", () => {
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
    const family = findCard(view, "家境");
    const luck = findCard(view, "运气");

    assert.equal(family.showAgeSeal, false);
    assert.equal(luck.showAgeSeal, false);
    assert.equal(family.ageSealed, 0);
    assert.equal(luck.ageSealed, 0);
    assert.equal(family.ageSealTitle, "家庭底色");
    assert.equal(luck.ageSealTitle, "机缘倾向");
  });
});

function findCard(view, name) {
  return (view.groups ?? [])
    .flatMap((group) => group.cards ?? [])
    .find((card) => card.name === name);
}
