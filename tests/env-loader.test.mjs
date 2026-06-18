import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { getProviderConfigStatus, isUsableProviderValue, loadDotEnvFile, loadProjectEnv } from "../src/index.js";

describe("project env loader", () => {
  it("keeps a safe dotenv example for local provider setup", () => {
    const example = fs.readFileSync(".env.example", "utf8");

    assert.match(example, /DEEPSEEK_API_KEY=your_deepseek_api_key_here/);
    assert.match(example, /OPENAI_COMPATIBLE_BASE_URL=https:\/\/your-provider\.example\/v1/);
    assert.doesNotMatch(example, /sk-|Bearer\s+[A-Za-z0-9]/);
  });

  it("does not treat dotenv placeholders as usable provider configuration", () => {
    assert.equal(isUsableProviderValue(""), false);
    assert.equal(isUsableProviderValue("your_deepseek_api_key_here"), false);
    assert.equal(isUsableProviderValue("your_api_key_here"), false);
    assert.equal(isUsableProviderValue("https://your-provider.example/v1"), false);
    assert.equal(isUsableProviderValue("test-key"), false);
    assert.equal(isUsableProviderValue("unit_live_key_123"), true);

    const status = getProviderConfigStatus({
      DEEPSEEK_API_KEY: "your_deepseek_api_key_here",
      OPENAI_COMPATIBLE_API_KEY: "your_api_key_here",
      OPENAI_COMPATIBLE_BASE_URL: "https://your-provider.example/v1",
      OPENAI_COMPATIBLE_MODEL: "your-model-id",
    });

    assert.equal(status.anyReady, false);
    assert.equal(status.mode, undefined);
  });

  it("loads simple dotenv values without external dependencies", () => {
    const dir = makeTmpDir();
    const envPath = path.join(dir, ".env");
    fs.writeFileSync(
      envPath,
      [
        "# local AI provider config",
        "DEEPSEEK_API_KEY=from_file",
        "DEEPSEEK_MODEL=\"deepseek-test\"",
        "OPENAI_COMPATIBLE_BASE_URL='https://example.local/v1'",
        "INLINE_COMMENT=value # ignored comment",
        "BAD KEY=ignored",
      ].join("\n"),
      "utf8",
    );

    const env = loadDotEnvFile(envPath);

    assert.equal(env.DEEPSEEK_API_KEY, "from_file");
    assert.equal(env.DEEPSEEK_MODEL, "deepseek-test");
    assert.equal(env.OPENAI_COMPATIBLE_BASE_URL, "https://example.local/v1");
    assert.equal(env.INLINE_COMMENT, "value");
    assert.equal("BAD KEY" in env, false);
  });

  it("lets explicit environment variables override dotenv values", () => {
    const dir = makeTmpDir();
    const envPath = path.join(dir, ".env");
    fs.writeFileSync(envPath, "DEEPSEEK_API_KEY=from_file\nDEEPSEEK_MODEL=file_model\n", "utf8");

    const env = loadProjectEnv({
      envFilePath: envPath,
      baseEnv: {
        DEEPSEEK_API_KEY: "from_shell",
      },
    });

    assert.equal(env.DEEPSEEK_API_KEY, "from_shell");
    assert.equal(env.DEEPSEEK_MODEL, "file_model");
  });
});

function makeTmpDir() {
  const dir = path.join("tmp", "tests", `env-loader-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
