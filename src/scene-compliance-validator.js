import { collectPlayerTextFields, detectForbiddenPlayerText } from "./player-text-guard.js";

export function validateSceneCompliance(response, scene) {
  const errors = [];
  if (!scene) return { valid: true, errors };

  for (const leak of detectForbiddenPlayerText(response)) {
    errors.push(`禁止文本/后台词泄露: ${leak.path} contains ${leak.term}`);
  }

  for (const term of scene.forbiddenText ?? []) {
    if (!term) continue;
    for (const [path, text] of collectPlayerTextFields(response)) {
      if (text.includes(term)) errors.push(`scene forbidden text: ${path} contains ${term}`);
    }
  }

  const title = response?.playerText?.title ?? "";
  const body = response?.playerText?.body ?? "";
  const choicesText = (response?.choices ?? []).map((choice) => choice?.text ?? "").join("\n");

  for (const echo of scene.backgroundEchoes ?? []) {
    const signals = echo.textSignals ?? [];
    if (echo.titleAllowed === false && containsAny(title, signals)) {
      errors.push(`background echo cannot take title role: ${echo.label}`);
    }
    if (echo.firstParagraphAllowed === false && containsAny(firstParagraph(body), signals)) {
      errors.push(`background echo cannot open the first paragraph: ${echo.label}`);
    }
    if (echo.choiceDriverAllowed === false && containsAny(choicesText, signals)) {
      errors.push(`background echo cannot drive choices: ${echo.label}`);
    }
    if (echo.mainPressureAllowed === false && oldAssetTakesMainPressure(body, signals)) {
      errors.push(`background echo cannot become main pressure/main event: ${echo.label}`);
    }
    const mentionCount = countSignals([title, body, choicesText].join("\n"), signals);
    if (Number.isFinite(echo.maxMentions) && mentionCount > echo.maxMentions) {
      errors.push(`background echo mentioned too often: ${echo.label}`);
    }
    const sentenceCount = countSentencesContainingSignals(body, signals);
    if (Number.isFinite(echo.maxSentences) && sentenceCount > echo.maxSentences) {
      errors.push(`background echo sentence budget exceeded: ${echo.label}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertSceneCompliance(response, scene) {
  const result = validateSceneCompliance(response, scene);
  if (!result.valid) throw new Error(result.errors.join("; "));
  return response;
}

function containsAny(text, signals = []) {
  return signals.some((signal) => signal && String(text ?? "").includes(signal));
}

function countSignals(text, signals = []) {
  let count = 0;
  for (const signal of signals) {
    if (!signal) continue;
    count += String(text ?? "").split(signal).length - 1;
  }
  return count;
}

function firstParagraph(text) {
  return String(text ?? "").split(/\n\s*\n|。/)[0] ?? "";
}

function countSentencesContainingSignals(text, signals = []) {
  if (!signals.length) return 0;
  const sentences = String(text ?? "")
    .split(/[。！？!?；;\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.filter((sentence) => containsAny(sentence, signals)).length;
}

function oldAssetTakesMainPressure(text, signals = []) {
  if (!signals.length) return false;
  const sentences = String(text ?? "")
    .split(/[銆傦紒锛??锛?\n.?!]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.some((sentence) => (
    containsAny(sentence, signals)
    && /(main pressure|main event|whole year|real reason|core|primary|driv|今年.*(主|核心|压力|真正)|主线|主事|核心|推动|抢走)/i.test(sentence)
  ));
}
