export function buildProviderDiagnosticLines(response) {
  const flags = response?.internal?.validationFlags ?? [];
  if (!Array.isArray(flags) || !flags.includes("provider_fallback")) {
    return [];
  }

  const sourceFlag = flags.find((flag) => typeof flag === "string" && flag.startsWith("provider_fallback_") && flag !== "provider_fallback");
  const source = sourceFlag ? sourceFlag.replace("provider_fallback_", "") : "unknown";
  return [`AI provider fallback: ${source}. 本回合使用本地安全生成，真实 AI 调用失败详情已记录在内部调试信息。`];
}
