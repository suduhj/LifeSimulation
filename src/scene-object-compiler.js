import { compileObservableYearDelta } from "./observable-year-delta.js";
import { FORBIDDEN_PLAYER_TEXT_TERMS } from "./player-text-guard.js";

export const OBSERVABLE_SCENE_SCHEMA_VERSION = "mvp.observable_scene.v1";

export function compileSceneObject({ run, annualFactPackage = {} } = {}) {
  const delta = compileObservableYearDelta({ run, annualFactPackage });
  const rawForbidden = collectRawForbidden(annualFactPackage);
  return {
    schemaVersion: OBSERVABLE_SCENE_SCHEMA_VERSION,
    age: delta.age,
    title: delta.titleSeed,
    mainScene: {
      openingBeat: delta.primaryHumanChange.text,
      requiredVisibleDelta: delta.primaryHumanChange.requiredDelta,
      lifeBaseRole: "primary",
      worldFlavorRole: "secondary",
    },
    worldFlavor: delta.worldFlavor,
    backgroundEchoes: delta.backgroundEchoes,
    choices: delta.choiceDirections.map((choice) => ({
      id: choice.id,
      textSeed: choice.text,
      fuzzySuccessLabel: choice.fuzzySuccessLabel,
      riskLabel: choice.riskLabel,
    })),
    forbiddenText: [
      ...new Set([
        ...FORBIDDEN_PLAYER_TEXT_TERMS,
        ...rawForbidden,
      ]),
    ],
  };
}

export function sceneInputForAi(scene) {
  if (!scene) return null;
  return {
    schemaVersion: scene.schemaVersion,
    age: scene.age,
    title: scene.title,
    mainScene: scene.mainScene,
    worldFlavor: scene.worldFlavor,
    backgroundEchoes: scene.backgroundEchoes,
    choices: scene.choices,
    forbiddenText: scene.forbiddenText,
  };
}

export function renderSceneObjectToMockResponse({ scene, run } = {}) {
  const name = run?.player?.name ?? "你";
  const agePrefix = Number.isFinite(scene?.age) ? `${scene.age} 岁：` : "";
  const title = `${agePrefix}${scene?.title ?? "生活里的新变化"}`;
  const backgroundLine = backgroundEchoLine(scene);
  const requiredDelta = scene?.mainScene?.requiredVisibleDelta
    ? `${scene.mainScene.requiredVisibleDelta}。`
    : "";
  const body = `${name}这一年真正遇到的变化，落在普通生活能看见的地方。${scene?.mainScene?.openingBeat ?? "身边人改变了对你的安排。"}${requiredDelta}因为这件事，家人、先生或照看你的人开始调整每天的节奏，你能接触到的人和事也不再完全一样。${backgroundLine}眼下的选择不是重走旧场景，而是怎样面对今年已经摆到面前的新安排。`;
  return {
    title,
    body,
    choices: (scene?.choices ?? []).slice(0, 3).map((choice, index) => ({
      id: choice.id ?? `choice_${index + 1}`,
      text: expandChoiceText(choice.textSeed, index),
      intentTags: ["observable_scene", `choice_${index + 1}`],
      fuzzySuccessLabel: choice.fuzzySuccessLabel ?? "结果难以预料",
      riskLabel: choice.riskLabel ?? "medium",
    })),
  };
}

function expandChoiceText(text, index) {
  const value = String(text ?? "").trim();
  const fallback = [
    "先稳妥适应这项新安排，同时观察身边人的具体反应。",
    "找一个可信的大人多问几句，把自己的疑惑说得克制一些。",
    "暂时不急着表态，留意这件事会怎样改变接下来的生活。",
  ][index] ?? "先稳妥适应眼前的新变化，再决定下一步怎么做。";
  if (!value) return fallback;
  if (value.length >= 12) return value;
  return `${value}，同时观察这项安排带来的具体变化。`;
}

function backgroundEchoLine(scene) {
  const echo = scene?.backgroundEchoes?.[0];
  if (!echo?.label) return "";
  return `${echo.label}并没有消失，但这一年它只像压在心底的一点暗影，没有成为主事。`;
}

function collectRawForbidden(value) {
  const terms = [];
  walk(value, terms);
  return terms.filter((term) => /[a-z][a-z0-9]*_[a-z0-9_]+/i.test(term));
}

function walk(value, terms) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\b[a-z][a-z0-9]*_[a-z0-9_]+\b/gi)) terms.push(match[0]);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, terms));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    terms.push(key);
    walk(child, terms);
  }
}
