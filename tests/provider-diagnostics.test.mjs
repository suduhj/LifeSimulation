import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildProviderDiagnosticLines } from "../src/index.js";

describe("provider diagnostics", () => {
  it("does not report diagnostics when a response did not use provider fallback", () => {
    assert.deepEqual(
      buildProviderDiagnosticLines({
        internal: { validationFlags: ["mock_ai"] },
      }),
      [],
    );
  });

  it("reports provider fallback with the source-specific flag", () => {
    const lines = buildProviderDiagnosticLines({
      internal: {
        validationFlags: ["mock_ai", "provider_fallback", "provider_fallback_action_resolution"],
      },
    });

    assert.equal(lines.length, 1);
    assert.match(lines[0], /AI provider fallback: action_resolution/);
    assert.match(lines[0], /本地安全生成/);
  });
});
