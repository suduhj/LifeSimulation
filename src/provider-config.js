const PLACEHOLDER_VALUE_PATTERNS = [
  /^$/,
  /^your[_-]/i,
  /your-provider\.example/i,
  /[_-]here$/i,
  /^test[-_]?key$/i,
  /^example/i,
];

export function isUsableProviderValue(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 && !PLACEHOLDER_VALUE_PATTERNS.some((pattern) => pattern.test(text));
}

export function getProviderConfigStatus(env = process.env) {
  const deepseekReady = isUsableProviderValue(env.DEEPSEEK_API_KEY);
  const compatibleReady =
    isUsableProviderValue(env.OPENAI_COMPATIBLE_API_KEY) &&
    isUsableProviderValue(env.OPENAI_COMPATIBLE_BASE_URL) &&
    isUsableProviderValue(env.OPENAI_COMPATIBLE_MODEL);

  return {
    deepseekReady,
    compatibleReady,
    anyReady: deepseekReady || compatibleReady,
    mode: deepseekReady ? "deepseek" : compatibleReady ? "openai-compatible" : undefined,
  };
}
