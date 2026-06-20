import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const FORBIDDEN_WEB_PLAYER_FIELDS = [
  "currentEvent",
  "eventHistory",
  "playerText",
  "statePatch",
  "rawResponse",
  "annualFactPackage",
];

describe("web/player static contract boundary", () => {
  it("exists as the ordinary-player rendering boundary and does not reference raw fields", () => {
    const playerDir = path.join("web", "player");
    assert.equal(fs.existsSync(playerDir), true, "web/player must exist");
    const files = listFiles(playerDir).filter((file) => /\.(?:js|mjs|ts|tsx|html)$/.test(file));
    assert.ok(files.length > 0, "web/player must contain player rendering code");

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      for (const field of FORBIDDEN_WEB_PLAYER_FIELDS) {
        assert.doesNotMatch(source, new RegExp(`\\b${field}\\b`), `${file} must not reference ${field}`);
      }
    }
  });

  it("routes ordinary browser rendering through the PlayerContract runtime gate", () => {
    const app = fs.readFileSync(path.join("web", "app.js"), "utf8");

    assert.match(app, /function safePlayerContract/);
    assert.match(app, /session\.playerContract/);
    assert.match(app, /function renderEventFromPlayerContract/);
    assert.match(app, /function timelineEntryFromPlayerContract/);
  });
});

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
