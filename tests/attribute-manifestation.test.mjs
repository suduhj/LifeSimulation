import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadMvpWorlds } from "../src/index.js";
import { createInitialRun } from "../src/initial-run.js";
import { manifestationRatioForAge, runMockTurns } from "../src/run-loop.js";

const AGE_KEYS = ["appearance", "intelligence", "constitution", "luck"];

describe("age-based attribute manifestation", () => {
  it("ratio rises from 0.1 at birth to 1.0 by adulthood", () => {
    assert.ok(Math.abs(manifestationRatioForAge(0) - 0.1) < 1e-9);
    assert.equal(manifestationRatioForAge(18), 1);
    assert.equal(manifestationRatioForAge(40), 1);
    const mid = manifestationRatioForAge(9);
    assert.ok(mid > 0.5 && mid < 0.6, `mid-life ratio should be ~0.55, got ${mid}`);
  });

  it("manifested stays within potential and reaches it by adulthood", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 42,
      playerProfile: { name: "林岚", gender: "male", personality: "curious" },
    });

    for (const key of AGE_KEYS) {
      const attr = run.player.attributes[key];
      assert.ok(attr.manifested <= attr.potential, `${key} manifested must not exceed potential at birth`);
    }

    const aged = runMockTurns({ run, worlds, turns: 25, seed: 100 });
    assert.ok(aged.player.age >= 18, `expected adulthood, got age ${aged.player.age}`);
    for (const key of AGE_KEYS) {
      const attr = aged.player.attributes[key];
      assert.ok(attr.manifested <= attr.potential, `${key} manifested must not exceed potential`);
      assert.equal(attr.manifested, attr.potential, `${key} should be fully manifested by adulthood`);
    }
  });

  it("manifested grows monotonically toward potential as age advances", () => {
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
