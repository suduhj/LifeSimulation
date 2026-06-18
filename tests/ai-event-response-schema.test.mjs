import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const schema = JSON.parse(fs.readFileSync("schemas/ai-event-response.schema.json", "utf8"));

describe("AI event response schema reference", () => {
  it("supports all MVP response types", () => {
    assert.deepEqual(schema.properties.responseType.enum, [
      "life_event",
      "action_resolution",
      "clarification_request",
      "forced_consequence",
      "ending_summary",
      "memory_update",
      "json_repair",
    ]);
  });

  it("allows non-interactive responses without forcing three choices", () => {
    assert.equal(schema.properties.choices.minItems, 0);
    assert.equal(schema.properties.choices.maxItems, 3);
  });

  it("requires structured player-visible changes outside the state patch", () => {
    assert.ok(schema.required.includes("visibleChanges"));
    assert.equal(schema.properties.visibleChanges.type, "array");
    assert.equal(schema.properties.visibleChanges.items.required.includes("text"), true);
  });
});
