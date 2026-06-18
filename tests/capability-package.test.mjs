import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCapabilityPackages,
  buildDevelopmentalExpression,
  createInitialRun,
  loadMvpWorlds,
  recalculateGrowthLedgerForRun,
} from "../src/index.js";

describe("capability packages", () => {
  it("turns age and effective values into allowed and forbidden capability checks", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 42,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
      allocation: {
        appearance: 4,
        intelligence: 6,
        constitution: 6,
        familyBackground: 2,
        luck: 2,
      },
      keptTalentIds: ["chaos_spirit_embryo", "strong_blood", "steady_hands"],
    });

    const packages = buildCapabilityPackages(run);
    const constitution = packages.attributes.constitution;

    assert.equal(packages.age, 0);
    assert.equal(constitution.attribute, "constitution");
    assert.ok(constitution.lockedCapabilities.includes("正面对抗成年人"));
    assert.ok(constitution.lockedCapabilities.includes("完整发挥神话体质"));
    assert.ok(constitution.forbiddenActions.includes("adult_combat_power"));
    assert.ok(constitution.checkTags.includes("infant_body_limit"));
  });

  it("unlocks age-appropriate child capabilities without unlocking adult power", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 53,
      playerProfile: { name: "Ash", gender: "female", personality: "pragmatic" },
      allocation: {
        appearance: 4,
        intelligence: 4,
        constitution: 8,
        familyBackground: 2,
        luck: 2,
      },
    });
    run.player.age = 10;
    recalculateGrowthLedgerForRun(run);

    const packages = buildCapabilityPackages(run);
    const constitution = packages.attributes.constitution;

    assert.ok(constitution.unlockedCapabilities.some((item) => item.includes("体力") || item.includes("耐力")));
    assert.ok(constitution.checkTags.includes("child_endurance"));
    assert.ok(constitution.lockedCapabilities.includes("正面对抗成年人"));
    assert.ok(constitution.forbiddenActions.includes("adult_combat_power"));
  });

  it("builds a developmental expression contract for AI rendering", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 54,
      playerProfile: { name: "Mira", gender: "female", personality: "curious" },
    });

    const expression = buildDevelopmentalExpression(run);

    assert.equal(expression.authority, "engine_growth_ledger");
    assert.ok(expression.allowedExpressions.length > 0);
    assert.ok(expression.forbiddenExpressions.some((item) => item.includes("成人")));
    assert.ok(expression.forbiddenActions.includes("adult_combat_power"));
    assert.ok(expression.rule.includes("AI"));
  });
});
