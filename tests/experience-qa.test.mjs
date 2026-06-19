import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

describe("Experience QA Loop", () => {
  it("writes an acceptance report for multi-run mock playtests", () => {
    execFileSync("node", ["tools/experience-qa.mjs", "--runs", "3", "--age-end", "12", "--ai", "mock"], {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf8",
    });

    const report = JSON.parse(fs.readFileSync("tmp/experience-report.json", "utf8"));

    assert.equal(report.runCount, 3);
    assert.ok(report.curriculumCoverage.averageDistinctSlots >= 4);
    assert.equal(report.openingVariation.distinctOpeningBodies, true);
    assert.equal(report.uiAcceptance.forbiddenPlayerFields, false);
    assert.equal(report.uiAcceptance.attributePanelUpdated, true);
    assert.deepEqual(report.repetition.repeatedAssets, []);
    assert.deepEqual(report.repetition.repeatedArenas, []);
  });
});
