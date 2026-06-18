import fs from "node:fs";
import path from "node:path";

export function loadDotEnvFile(filePath = path.resolve(".env")) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const parsed = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    const rawValue = line.slice(separatorIndex + 1).trim();
    parsed[key] = unquoteEnvValue(rawValue);
  }
  return parsed;
}

export function loadProjectEnv({ baseEnv = process.env, envFilePath = path.resolve(".env") } = {}) {
  return {
    ...loadDotEnvFile(envFilePath),
    ...baseEnv,
  };
}

function unquoteEnvValue(value) {
  if (value.length >= 2) {
    const quote = value[0];
    if ((quote === "\"" || quote === "'") && value[value.length - 1] === quote) {
      const inner = value.slice(1, -1);
      return quote === "\"" ? inner.replace(/\\n/g, "\n").replace(/\\"/g, "\"") : inner;
    }
  }
  const commentIndex = value.search(/\s+#/);
  return commentIndex >= 0 ? value.slice(0, commentIndex).trimEnd() : value;
}
