import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runFreeActionQa } from "../tools/qa-free-actions.mjs";

describe("free-action QA harness", () => {
  it("passes the deterministic mock structural gate for every scenario", async () => {
    const result = await runFreeActionQa({ env: {}, args: ["--ai", "mock"] });

    assert.equal(result.status, "passed", `mock gate should pass; failed=${result.failed}`);
    assert.equal(result.mode, "mock");
    assert.ok(result.total >= 8, "should exercise a diverse scenario set");
    for (const r of result.results) {
      assert.ok(r.hardPass, `scenario should pass hard checks: ${JSON.stringify(r.scenario)} -> ${JSON.stringify(r.checks)}`);
      assert.equal(r.checks.leakFree, true);
      assert.equal(r.checks.consequential, true);
      assert.equal(r.checks.terminalOutcome, true);
    }
  });

  it("can filter scenarios by world and limit", async () => {
    const result = await runFreeActionQa({ env: {}, args: ["--ai", "mock", "--world", "wasteland", "--limit", "2"] });
    assert.equal(result.status, "passed");
    assert.ok(result.total <= 2);
    assert.ok(result.results.every((r) => r.scenario.world === "wasteland"));
  });
});
