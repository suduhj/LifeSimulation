import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadMvpWorlds, maturityCapForAge, recalculateGrowthLedgerForRun } from "../src/index.js";
import { createInitialRun } from "../src/initial-run.js";
import { manifestationRatioForAge, runMockTurns } from "../src/run-loop.js";

const AGE_KEYS = ["appearance", "intelligence", "constitution", "luck"];

describe("age-based attribute manifestation", () => {
  it("maturity cap rises by life stage and stops being a hard cap in adulthood", () => {
    assert.ok(maturityCapForAge(0, "constitution", 100) < maturityCapForAge(7, "constitution", 100));
    assert.ok(maturityCapForAge(7, "constitution", 100) < maturityCapForAge(13, "constitution", 100));
    assert.equal(maturityCapForAge(18, "constitution", 100), Number.MAX_SAFE_INTEGER);
    assert.equal(manifestationRatioForAge(18), 1, "legacy ratio remains exported for compatibility only");
  });

  it("manifested stays within potential but no longer reaches full potential just from becoming adult", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 42,
      playerProfile: { name: "Lin Lan", gender: "male", personality: "curious" },
      allocation: {
        appearance: 4,
        intelligence: 6,
        constitution: 6,
        familyBackground: 2,
        luck: 2,
      },
      keptTalentIds: ["chaos_spirit_embryo", "strong_blood", "steady_hands"],
    });

    for (const key of AGE_KEYS) {
      const attr = run.player.attributes[key];
      assert.ok(attr.manifested <= attr.potential, `${key} manifested must not exceed potential at birth`);
    }

    run.player.age = 18;
    recalculateGrowthLedgerForRun(run);
    for (const key of AGE_KEYS) {
      const attr = run.player.attributes[key];
      assert.ok(attr.manifested <= attr.potential, `${key} manifested must not exceed potential`);
    }
    assert.ok(
      run.player.attributes.constitution.manifested < run.player.attributes.constitution.potential,
      "adulthood removes the hard cap but does not automatically realize all mythic potential",
    );
  });

  it("manifested grows monotonically within the ledger as age advances", () => {
    const worlds = loadMvpWorlds();
    let run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 77,
      playerProfile: { name: "Ash", gender: "female", personality: "pragmatic" },
    });
    const key = AGE_KEYS.find((k) => run.player.attributes[k].potential >= 6) ?? "intelligence";
    let prev = run.player.attributes[key].manifested;
    let sawGrowth = false;
    for (let i = 0; i < 12; i += 1) {
      run = runMockTurns({ run, worlds, turns: 1, seed: 200 + i });
      const now = run.player.attributes[key].manifested;
      assert.ok(now >= prev, `${key} manifested should not regress (${prev} -> ${now})`);
      if (now > prev) sawGrowth = true;
      prev = now;
    }
    assert.ok(sawGrowth, "manifested should visibly grow as the character ages");
  });
});
