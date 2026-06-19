import { detectForbiddenPlayerText } from "./player-text-guard.js";

export const LIFE_NODE_FORBIDDEN_ATTRIBUTE_ALIASES = [
  "仙姿",
  "悟性",
  "根骨",
  "出身/底蕴",
  "气运",
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
