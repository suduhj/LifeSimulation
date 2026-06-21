import { detectForbiddenPlayerText } from "./player-text-guard.js";

export const LIFE_NODE_FORBIDDEN_ATTRIBUTE_ALIASES = [
  "仙姿",
  "悟性",
  "根骨",
  "出身/底蕴",
  "气运",
];

export const LIFE_NODE_FORBIDDEN_TEMPLATE_PHRASES = [
  "学习安排、师长要求或技能方向发生变化",
  "这件事首先改变的是你的日常节奏",
  "世界味道只作为背景质感",
  "主事件仍然是今年的人生变化",
  "没有盖过今年真正的人生变化",
  "对主角",
  "真正遇到的变化，落在普通生活能看见的地方",
  "眼下的选择不是重走旧场景",
];

export function validateLifeNode(lifeNode = {}) {
  const errors = [];
  if (lifeNode.schemaVersion !== "mvp.life_node.v1") errors.push("LifeNode schemaVersion must be mvp.life_node.v1");
  if (typeof lifeNode.nodeId !== "string" || !lifeNode.nodeId.trim()) errors.push("LifeNode requires nodeId");
  if (!Number.isFinite(lifeNode.age)) errors.push("LifeNode requires numeric age");
  if (!["opening_year", "annual_event", "action_resolution", "ending"].includes(lifeNode.nodeType)) {
    errors.push("LifeNode nodeType is invalid");
  }
  if (lifeNode.title !== undefined) errors.push("LifeNode must not carry a title");
  const paragraphs = Array.isArray(lifeNode.paragraphs) ? lifeNode.paragraphs : [];
  if (paragraphs.length === 0 || !paragraphs.some((paragraph) => String(paragraph ?? "").trim())) {
    errors.push("LifeNode requires visible paragraphs");
  }
  if (lifeNode.nodeType === "annual_event" && !String(lifeNode.visibleContract?.requiredLifeDelta ?? "").trim()) {
    errors.push("annual_event LifeNode requires a human-life delta");
  }

  const surface = {
    playerText: {
      body: paragraphs.join("\n"),
      visibleChanges: visibleChangeTexts(lifeNode.visibleChanges),
    },
    choices: Array.isArray(lifeNode.choices) ? lifeNode.choices : [],
  };
  for (const match of detectForbiddenPlayerText(surface)) {
    errors.push(`LifeNode contains forbidden player text: ${match.term}`);
  }

  const allText = [
    paragraphs.join("\n"),
    ...(lifeNode.choices ?? []).map((choice) => choice?.text ?? ""),
    ...visibleChangeTexts(lifeNode.visibleChanges),
  ].join("\n");
  errors.push(...validateStoryAssetBudgets({
    paragraphs,
    choices: lifeNode.choices ?? [],
    visibleChanges: lifeNode.visibleChanges ?? [],
    storyAssetBudgets: lifeNode.storyAssetBudgets ?? {},
  }));
  for (const phrase of LIFE_NODE_FORBIDDEN_TEMPLATE_PHRASES) {
    if (allText.includes(phrase)) {
      errors.push(`LifeNode contains contract-template prose: ${phrase}`);
    }
  }
  for (const alias of LIFE_NODE_FORBIDDEN_ATTRIBUTE_ALIASES) {
    if (allText.includes(alias)) errors.push(`LifeNode uses world-specific attribute alias: ${alias}`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function assertLifeNode(lifeNode) {
  const result = validateLifeNode(lifeNode);
  if (!result.ok) {
    throw new Error(`Invalid LifeNode: ${result.errors.join("; ")}`);
  }
  return lifeNode;
}

function visibleChangeTexts(changes = []) {
  return (Array.isArray(changes) ? changes : [])
    .map((change) => typeof change === "string" ? change : change?.text)
    .filter((text) => typeof text === "string");
}

function validateStoryAssetBudgets({ paragraphs = [], choices = [], visibleChanges = [], storyAssetBudgets = {} } = {}) {
  const errors = [];
  const firstParagraph = String(paragraphs[0] ?? "");
  const body = paragraphs.join("\n");
  const choicesText = (choices ?? []).map((choice) => choice?.text ?? "").join("\n");
  const visibleChangeText = visibleChangeTexts(visibleChanges).join("\n");
  for (const [assetId, budget] of Object.entries(storyAssetBudgets ?? {})) {
    const signals = Array.isArray(budget?.textSignals) ? budget.textSignals.filter(Boolean) : [];
    if (!signals.length) continue;
    if (budget.cannotOpenScene === true && containsAny(firstParagraph, signals)) {
      errors.push(`LifeNode asset budget violation: ${assetId} appears in first paragraph`);
    }
    if (budget.cannotDriveChoices === true && containsAny(choicesText, signals)) {
      errors.push(`LifeNode asset budget violation: ${assetId} drives choices`);
    }
    if (containsAny(visibleChangeText, signals)) {
      errors.push(`LifeNode asset budget violation: ${assetId} appears in visible changes`);
    }
    const maxSentences = Number.isFinite(budget.maxSentences) ? budget.maxSentences : undefined;
    if (Number.isFinite(maxSentences) && countSentencesContainingSignals(body, signals) > maxSentences) {
      errors.push(`LifeNode asset budget violation: ${assetId} exceeds sentence budget`);
    }
    if (budget.mainPressureAllowed === false && oldAssetTakesMainPressure(body, signals)) {
      errors.push(`LifeNode asset budget violation: ${assetId} becomes main pressure`);
    }
  }
  return errors;
}

function containsAny(text, signals = []) {
  return signals.some((signal) => signal && String(text ?? "").includes(signal));
}

function countSentencesContainingSignals(text, signals = []) {
  const sentences = String(text ?? "")
    .split(/[銆傦紒锛??锛?\n.?!]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.filter((sentence) => containsAny(sentence, signals)).length;
}

function oldAssetTakesMainPressure(text, signals = []) {
  const sentences = String(text ?? "")
    .split(/[銆傦紒锛??锛?\n.?!]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.some((sentence) => (
    containsAny(sentence, signals)
    && /(main pressure|main event|whole year|real reason|core|primary|driv|今年.*(主|核心|压力|真正)|主线|主事|核心|推动|抢走)/i.test(sentence)
  ));
}
