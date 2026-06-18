import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("web AI key safety", () => {
  it("keeps local dotenv secrets ignored while allowing the safe example file", () => {
    const gitignore = fs.readFileSync(".gitignore", "utf8");

    assert.match(gitignore, /^\.env$/m);
    assert.match(gitignore, /^\.env\.\*$/m);
    assert.match(gitignore, /^!\.env\.example$/m);
  });

  it("does not put provider secrets or direct provider auth into frontend files", () => {
    const webFiles = listFiles("web").filter((file) => /\.(html|css|js|json)$/i.test(file));
    assert.ok(webFiles.length > 0, "expected web frontend files");

    for (const filePath of webFiles) {
      const text = fs.readFileSync(filePath, "utf8");
      assert.doesNotMatch(text, /DEEPSEEK_API_KEY|OPENAI_COMPATIBLE_API_KEY|OPENAI_COMPATIBLE_BASE_URL|OPENAI_COMPATIBLE_MODEL/);
      assert.doesNotMatch(text, /\.env\b/);
      assert.doesNotMatch(text, /Authorization\s*:/);
      assert.doesNotMatch(text, /Bearer\s+[A-Za-z0-9._-]+/);
      assert.doesNotMatch(text, /api\.deepseek\.com/);
      assert.doesNotMatch(text, /\/chat\/completions/);
    }
  });
});

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
