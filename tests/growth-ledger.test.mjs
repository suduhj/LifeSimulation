import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  applyAiResponseToRun,
  applyGrowthEvidence,
  createDomainEvent,
  createInitialRun,
  ensureGrowthLedger,
  loadMvpWorlds,
  loadRunFromFile,
  maturityCapForAge,
  recalculateGrowthLedgerForRun,
  saveRunToFile,
  transitionRun,
} from "../src/index.js";
import { generateMockLifeEvent } from "../src/mock-ai.js";

describe("growth ledger", () => {
  it("puts mythic talent points into potential without granting infant adult-level effective power", () => {
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

    const constitution = run.player.growthLedger.attributes.constitution;

    assert.ok(constitution.talentPotential >= 100);
    assert.ok(constitution.potential >= 100);
    assert.ok(constitution.effective <= maturityCapForAge(0, "constitution", constitution.potential));
    assert.ok(constitution.effective < 10, "infant effective power must stay far below adult competence");
    assert.equal(run.player.attributes.constitution.manifested, constitution.effective);
    assert.equal(run.player.attributes.constitution.potential, constitution.potential);
  });

  it("removes the hard maturity cap at adulthood without auto-realizing all potential", () => {
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
    run.player.age = 18;

    recalculateGrowthLedgerForRun(run);
    const constitution = run.player.growthLedger.attributes.constitution;

    assert.equal(constitution.maturityCap, Number.MAX_SAFE_INTEGER);
    assert.ok(constitution.effective >= constitution.realized);
    assert.ok(constitution.effective < constitution.potential, "adulthood must not cash out all locked potential");
    assert.ok(constitution.lockedPotential > 0);
  });

  it("accepts growth evidence as the only route to realizing more potential", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "wasteland",
      seed: 44,
      playerProfile: { name: "Ash", gender: "female", personality: "pragmatic" },
      allocation: {
        appearance: 4,
        intelligence: 4,
        constitution: 8,
        familyBackground: 2,
        luck: 2,
      },
    });
    run.player.age = 12;
    recalculateGrowthLedgerForRun(run);
    const before = structuredClone(run.player.growthLedger.attributes.constitution);

    applyGrowthEvidence(run, [
      {
        attribute: "constitution",
        amount: 2,
        source: "daily_chores",
        reason: "long-term chores hardened endurance",
      },
    ]);
    const after = run.player.growthLedger.attributes.constitution;

    assert.equal(after.realized, before.realized + 2);
    assert.equal(after.evidence.at(-1).source, "daily_chores");
    assert.equal(after.evidence.at(-1).reason, "long-term chores hardened endurance");
    assert.ok(after.lockedPotential <= before.lockedPotential);
    assert.equal(run.player.attributes.constitution.manifested, after.effective);
  });

  it("applies AI growthEvidenceChanges through the engine instead of trusting direct effective values", () => {
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
    const response = generateMockLifeEvent({ run, worlds, seed: 46 });
    response.statePatch.growthEvidenceChanges = [
      {
        attribute: "constitution",
        amount: 1,
        source: "fetching_water",
        reason: "carrying water for a season improved endurance",
        effective: 999,
      },
    ];
    const before = structuredClone(run.player.growthLedger.attributes.constitution);

    const applied = applyAiResponseToRun(run, response);
    const after = applied.player.growthLedger.attributes.constitution;

    assert.equal(after.realized, before.realized + 1);
    assert.notEqual(after.effective, 999);
    assert.equal(after.evidence.at(-1).source, "fetching_water");
  });

  it("validates and preserves the growth ledger through save/load", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cthulhu",
      seed: 46,
      playerProfile: { name: "Mira", gender: "female", personality: "curious" },
    });
    ensureGrowthLedger(run);
    const eventSourcedRun = transitionRun({
      run,
      events: [
        createDomainEvent({
          type: "growth.evidence_added",
          run,
          source: "test",
          payload: { attribute: "intelligence", amount: 1, source: "careful_notes", reason: "kept a diary" },
        }),
      ],
    }).nextRun;

    const saveDir = path.join("tmp", "tests", `growth-ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(saveDir, { recursive: true });
    const savePath = path.join(saveDir, "run.json");

    saveRunToFile(eventSourcedRun, savePath);
    const loaded = loadRunFromFile(savePath);

    assert.deepEqual(loaded.player.growthLedger, eventSourcedRun.player.growthLedger);
    assert.equal(loaded.player.growthLedger.attributes.intelligence.evidence.at(-1).source, "careful_notes");
  });

  it("migrates legacy save files that predate the growth ledger", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 48,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
    });
    const legacyRun = structuredClone(run);
    delete legacyRun.player.growthLedger;
    for (const attribute of Object.values(legacyRun.player.attributes)) {
      delete attribute.talentPotential;
      delete attribute.effective;
      delete attribute.realized;
      delete attribute.maturityCap;
      delete attribute.lockedPotential;
    }

    const saveDir = path.join("tmp", "tests", `legacy-growth-ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(saveDir, { recursive: true });
    const savePath = path.join(saveDir, "legacy-run.json");
    fs.writeFileSync(savePath, `${JSON.stringify(legacyRun, null, 2)}\n`, "utf8");

    const loaded = loadRunFromFile(savePath);

    assert.equal(loaded.player.growthLedger.schemaVersion, "mvp.growth_ledger.v1");
    assert.equal(loaded.player.growthLedger.authority, "engine");
    assert.equal(
      loaded.player.attributes.constitution.manifested,
      loaded.player.growthLedger.attributes.constitution.effective,
    );
    assert.ok(loaded.player.growthLedger.attributes.constitution.lockedPotential >= 0);
  });
});
