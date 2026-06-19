import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnnualFactPackage,
  createInitialRun,
  loadMvpWorlds,
  recordAssetSpotlight,
  validateStoryContract,
} from "../src/index.js";
import { createDefaultAssetLedger, evaluateAssetRoles } from "../src/story-asset-lifecycle.js";

describe("Story Asset Lifecycle", () => {
  it("keeps recently featured assets out of the primary driver role", () => {
    let ledger = createDefaultAssetLedger();
    ledger = recordAssetSpotlight(ledger, { age: 6, assetId: "jade_token", role: "primary_driver" });

    const roles = evaluateAssetRoles({ assetLedger: ledger, age: 7, assets: ["jade_token"] });

    assert.equal(roles.jade_token.role, "background_only");
    assert.ok(roles.jade_token.forbiddenRoles.includes("primary_driver"));
    assert.ok(roles.jade_token.cooldownUntilAge >= 9);
  });

  it("assigns hard budgets to recurring old assets across named asset families", () => {
    let ledger = createDefaultAssetLedger();
    ledger = recordAssetSpotlight(ledger, { age: 8, assetId: "white_deer", role: "primary_driver" });

    const roles = evaluateAssetRoles({ assetLedger: ledger, age: 9, assets: ["white_deer", "old_booklet"] });

    assert.equal(roles.white_deer.role, "background_only");
    assert.equal(roles.white_deer.maxSentences, 1);
    assert.equal(roles.white_deer.cannotOpenScene, true);
    assert.equal(roles.white_deer.cannotDriveChoices, true);
    assert.ok(roles.white_deer.textSignals.includes("白鹿"));
    assert.ok(roles.white_deer.forbiddenRoles.includes("primary_driver"));

    assert.equal(roles.old_booklet.maxSentences, 1);
    assert.equal(roles.old_booklet.cannotOpenScene, true);
    assert.equal(roles.old_booklet.cannotDriveChoices, true);
    assert.ok(roles.old_booklet.textSignals.includes("册子"));
  });

  it("puts asset roles into the annual fact package contract", () => {
    const worlds = loadMvpWorlds();
    const run = createCultivationRun(worlds);
    run.worldState.storyState.assetLedger = recordAssetSpotlight(createDefaultAssetLedger(), {
      age: 6,
      assetId: "jade_token",
      role: "primary_driver",
    });

    const facts = buildAnnualFactPackage({ run, worlds, seed: 20260619 });

    assert.equal(facts.assetRoles.jade_token.role, "background_only");
    assert.ok(facts.assetRoles.jade_token.forbiddenRoles.includes("primary_driver"));
    assert.ok(facts.mustNotInclude.some((line) => line.includes("jade_token") || line.includes("玉")));
  });

  it("rejects responses that promote background-only assets as the annual main event", () => {
    const validation = validateStoryContract({
      playerText: {
        title: "7岁：玉佩主线",
        body: "今年的核心主线又回到玉佩。你继续追查玉佩秘密，所有选择都围绕玉佩和后山展开。",
      },
      choices: [
        { text: "继续追查玉佩" },
        { text: "把玉佩当作主线线索" },
        { text: "再去后山找玉佩" },
      ],
    }, {
      assetRoles: {
        jade_token: {
          role: "background_only",
          forbiddenRoles: ["primary_driver"],
          textSignals: ["玉佩", "玉片", "玉简", "jade_token"],
        },
      },
    });

    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((error) => error.includes("background-only asset jade_token")));
  });
});

function createCultivationRun(worlds) {
  const run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed: 20260619,
    playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
  });
  run.player.age = 6;
  return run;
}
