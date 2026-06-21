import { attributeRealityContractFor } from "./attribute-reality-contract.js";
import { LIFE_NODE_FORBIDDEN_TEMPLATE_PHRASES, validateLifeNode } from "./life-node-validator.js";
import { resolveWorldOrigin } from "./world-origin-resolver.js";

export const LIFE_NODE_SCHEMA_VERSION = "mvp.life_node.v1";

export function buildOpeningLifeNodesFromOriginLedger({ run, response, ledger, sourceEventIds = [] } = {}) {
  const nodes = Array.isArray(ledger?.nodes) ? ledger.nodes : [];
  return nodes
    .map((node) => buildOpeningLifeNodeFromOriginNode({ run, response, ledger, node, sourceEventIds }))
    .filter(Boolean);
}

export function buildLifeNodeFromResponse({ run, response, sourceEventIds = [] } = {}) {
  const nodeType = nodeTypeForResponse(response);
  const annualOutcome = response?.statePatch?.yearlyOutcomes?.[0];
  const observableScene = response?.observableScene;
  const age = Math.max(0, Math.floor(Number(
    nodeType === "annual_event"
      ? annualOutcome?.age ?? observableScene?.age ?? response?.timeSpan?.ageEnd ?? response?.timeSpan?.ageStart ?? run?.player?.age
      : response?.timeSpan?.ageEnd ?? response?.timeSpan?.ageStart ?? run?.player?.age,
  ) || 0));
  const visibleContract = visibleContractFor({ response, annualOutcome, observableScene, nodeType });
  const candidate = {
    schemaVersion: LIFE_NODE_SCHEMA_VERSION,
    nodeId: nodeIdFor({ response, age, nodeType, annualOutcome, visibleContract }),
    age,
    nodeType,
    sourceEventIds,
    visibleContract,
    attributeReality: attributeRealityForRun(run),
    originReality: originRealityForRun(run),
    storyAssetBudgets: storyAssetBudgetsFor({ observableScene, response }),
    paragraphs: paragraphsForResponse({ response, visibleContract, nodeType, age, observableScene }),
    choices: choicesForResponse(response),
    visibleChanges: Array.isArray(response?.visibleChanges) ? structuredClone(response.visibleChanges) : [],
  };

  const validation = validateLifeNode(candidate);
  if (validation.ok) return candidate;
  return fallbackLifeNode({ candidate, validation });
}

export function lifeNodeEventPayload(lifeNode) {
  return structuredClone(lifeNode);
}

function nodeTypeForResponse(response = {}) {
  if (response.responseType === "ending_summary" || response.interactionMode === "ending") return "ending";
  if (response.responseType === "action_resolution") return "action_resolution";
  if (response.interactionMode === "non_interactive" || /opening/i.test(String(response.event?.eventId ?? response.turnId ?? ""))) {
    return "opening_year";
  }
  return "annual_event";
}

function nodeIdFor({ response, age, nodeType, annualOutcome, visibleContract }) {
  if (nodeType === "annual_event") {
    const slot = visibleContract?.mainHumanDomain || visibleContract?.curriculumSlot || "annual";
    return annualOutcome?.outcomeId
      ? `life_node_${annualOutcome.outcomeId}`
      : `year_${age}_annual_${safeId(slot)}`;
  }
  const base = response?.turnId || response?.event?.eventId || `${nodeType}_${age}`;
  return `life_node_${safeId(base)}_${nodeType}`;
}

function buildOpeningLifeNodeFromOriginNode({ run, response, ledger, node, sourceEventIds = [] }) {
  if (!Number.isFinite(Number(node?.age))) return undefined;
  const age = Math.max(0, Math.floor(Number(node.age)));
  const visibleContract = {
    requiredLifeDelta: openingRequiredLifeDeltaFor(node),
    mainHumanDomain: "opening_year",
    forbiddenText: [
      "出生底色",
      "依附与感知",
      "牙牙学语",
      "好奇初醒",
      "家庭边界",
      "性格成形",
      "岔路前夜",
      "mentor_attention",
      "curriculumSlot",
    ],
  };
  const candidate = {
    schemaVersion: LIFE_NODE_SCHEMA_VERSION,
    nodeId: `opening_year_${age}_${safeId(run?.runId ?? response?.runId ?? "run")}`,
    age,
    nodeType: "opening_year",
    sourceEventIds,
    visibleContract,
    attributeReality: attributeRealityForRun(run),
    originReality: originRealityForRun(run),
    storyAssetBudgets: {},
    paragraphs: [openingBodyFromOriginNode({ run, node, age })].filter(Boolean),
    choices: [],
    visibleChanges: [],
  };
  const validation = validateLifeNode(candidate);
  if (validation.ok) return candidate;
  return fallbackLifeNode({ candidate, validation });
}

function openingRequiredLifeDeltaFor(node = {}) {
  const factor = Array.isArray(node.originFactors) ? node.originFactors[0] : undefined;
  return {
    learning: "早年学习兴趣开始留下痕迹",
    household: "家庭日常责任开始塑造你",
    social: "同龄关系开始影响你的成长",
    care: "照护与身体状态改变了家人的安排",
    talent: "天赋迹象只在日常边缘轻微显露",
  }[factor?.category] ?? "出生与早年环境塑造了你的生活底色";
}

function openingBodyFromOriginNode({ run, node, age }) {
  const body = String(node?.body ?? "").trim();
  if (age === 0) {
    return [birthRealityPrefix(run), body].filter(Boolean).join("");
  }
  return body;
}

function birthRealityPrefix(run) {
  const family = run?.player?.growthLedger?.attributes?.familyBackground?.potential
    ?? run?.player?.attributes?.familyBackground?.potential
    ?? 4;
  const worldId = run?.worldId;
  const tier = family >= 12 ? "high" : family <= 3 ? "low" : "ordinary";
  const byWorld = {
    cultivation: {
      high: "你出生在能接触宗门、商号或修真旧账的人家，最先包围你的不是贫寒，而是资源、规矩和旁人的期待。",
      ordinary: "你出生在能维持安稳日子的普通人家，家里给得起照看，却仍要小心衡量仙门传闻带来的风险。",
      low: "你出生在资源紧巴的凡人家庭，柴米、活计和长辈的谨慎比仙门传说更早压到生活里。",
    },
    cthulhu: {
      high: "你出生在体面街区或专业家庭里，医院、档案、社交关系和沉默的规矩从一开始就围住了你。",
      ordinary: "你出生在表面正常的城市家庭，日常秩序仍能运转，只是某些新闻和传闻被大人轻轻避开。",
      low: "你出生在城市边缘或拮据家庭里，照看你的人更关心房租、工作和安全，异常只能被压成沉默。",
    },
    wasteland: {
      high: "你出生在掌握物资、医疗、技术或营地关系的家庭里，生存压力没有消失，却从一开始就带着责任和目光。",
      ordinary: "你出生在勉强有秩序的营地家庭，水、药、食物和监护人的判断共同决定你能怎样长大。",
      low: "你出生在缺粮、临时棚屋或边缘队伍附近，活下去本身就是第一件被全家盯紧的事。",
    },
  };
  return byWorld[worldId]?.[tier] ?? byWorld.cthulhu[tier];
}

function visibleContractFor({ response, annualOutcome, observableScene, nodeType }) {
  const requiredLifeDelta = annualOutcome?.curriculum?.requiredHumanDelta
    || observableScene?.mainScene?.requiredVisibleDelta
    || response?.event?.purpose
    || response?.playerText?.body?.slice(0, 80)
    || "";
  const mainHumanDomain = annualOutcome?.curriculum?.slot
    || observableScene?.mainScene?.domain
    || response?.event?.sceneType
    || nodeType;
  return {
    requiredLifeDelta,
    mainHumanDomain,
    forbiddenText: [
      ...(observableScene?.forbiddenText ?? []),
      "mentor_attention",
      "curriculumSlot",
      "年度变化",
      "人生课程",
      "旧线索",
      "背景回响",
      "主轴",
      "副轴",
    ],
  };
}

function attributeRealityForRun(run) {
  const attributes = run?.player?.growthLedger?.attributes ?? run?.player?.attributes ?? {};
  return Object.fromEntries(["appearance", "intelligence", "constitution", "familyBackground", "luck"].map((attribute) => {
    const value = attributes[attribute]?.effective ?? attributes[attribute]?.potential ?? attributes[attribute]?.manifested ?? 0;
    return [attribute, attributeRealityContractFor({ attribute, value, worldId: run?.worldId })];
  }));
}

function originRealityForRun(run) {
  const resolved = run?.worldState?.opening?.resolvedOrigin
    ?? run?.worldState?.storyState?.originLedger?.resolvedOrigin;
  if (resolved) return structuredClone(resolved);
  return resolveWorldOrigin({ run, seed: run?.seed ?? run?.setup?.seed ?? 1 });
}

function storyAssetBudgetsFor({ observableScene, response }) {
  const budgets = {};
  for (const echo of observableScene?.backgroundEchoes ?? []) {
    const key = safeId(echo.assetId || echo.label || "background_echo");
    budgets[key] = {
      roleThisYear: echo.role ?? "background_echo",
      maxSentences: Number.isFinite(echo.maxSentences) ? echo.maxSentences : 1,
      cannotOpenScene: echo.firstParagraphAllowed === false,
      cannotDriveChoices: echo.choiceDriverAllowed === false,
      textSignals: Array.isArray(echo.textSignals) ? [...echo.textSignals] : [],
      mainPressureAllowed: echo.mainPressureAllowed !== false,
    };
  }
  for (const [key, role] of Object.entries(response?.event?.assetRoles ?? {})) {
    budgets[safeId(key)] = {
      ...(budgets[safeId(key)] ?? {}),
      roleThisYear: typeof role === "string" ? role : role?.role ?? "background_echo",
      maxSentences: Number.isFinite(role?.maxSentences) ? role.maxSentences : budgets[safeId(key)]?.maxSentences ?? 1,
      cannotOpenScene: role?.cannotOpenScene ?? true,
      cannotDriveChoices: role?.cannotDriveChoices ?? true,
      textSignals: Array.isArray(role?.textSignals) ? [...role.textSignals] : budgets[safeId(key)]?.textSignals ?? [],
      mainPressureAllowed: role?.mainPressureAllowed !== false && budgets[safeId(key)]?.mainPressureAllowed !== false,
    };
  }
  return budgets;
}

function paragraphsForResponse({ response, visibleContract, nodeType, age, observableScene }) {
  const body = stripTitleFromBody(response?.playerText?.body ?? "", age);
  const paragraphs = paragraphsFromBody(body);
  if (nodeType === "annual_event") {
    if (
      paragraphs.length
      && !containsTemplatePhrase(paragraphs.join("\n"))
      && annualBodyMatchesScene({ body: paragraphs.join("\n"), observableScene, visibleContract })
    ) {
      return paragraphs;
    }
    return annualParagraphs({ visibleContract, observableScene, age });
  }
  if (paragraphs.length) return paragraphs;
  if (nodeType === "action_resolution") return ["你的选择已经落下，身边的人和接下来的日子因此出现了新的变化。"];
  if (nodeType === "ending") return ["这一段人生走到尾声，留下的结果被系统记录下来。"];
  return [fallbackAnnualParagraph({ visibleContract, observableScene, age })];
}

function annualParagraphs({ visibleContract, observableScene, age }) {
  const openingBeat = sanitizeNarrativeSentence(observableScene?.mainScene?.openingBeat);
  const first = openingBeat
    ? `${age}岁这一年，${openingBeat}`
    : fallbackAnnualParagraph({ visibleContract, observableScene, age });
  const second = annualFollowupParagraph(visibleContract?.mainHumanDomain ?? observableScene?.mainScene?.domain);
  return [first, second].filter(Boolean);
}

function choicesForResponse(response = {}) {
  return (Array.isArray(response.choices) ? response.choices : []).slice(0, 3).map((choice, index) => ({
    id: choice?.id ?? `choice_${index + 1}`,
    text: String(choice?.text ?? "").trim(),
    riskLabel: choice?.riskLabel ?? "unknown",
    fuzzySuccessLabel: choice?.fuzzySuccessLabel ?? "",
  })).filter((choice) => choice.text);
}

function fallbackLifeNode({ candidate, validation }) {
  const paragraphs = candidate.nodeType === "action_resolution"
    ? ["你的选择被记录下来，眼下的生活因此出现了新的后续。"]
    : [fallbackAnnualParagraph({
      visibleContract: candidate.visibleContract,
      observableScene: undefined,
      age: candidate.age,
    })];
  return {
    ...candidate,
    paragraphs,
    choices: sanitizeChoices(candidate.choices, candidate.storyAssetBudgets),
    visibleChanges: sanitizeVisibleChanges(candidate.visibleChanges, candidate.storyAssetBudgets),
    internalValidationErrors: validation.errors,
  };
}

function sanitizeChoices(choices = [], storyAssetBudgets = {}) {
  const signals = budgetSignals(storyAssetBudgets);
  return (choices ?? []).map((choice, index) => ({
    id: choice.id ?? `choice_${index + 1}`,
    text: isUnsafePlayerLine(choice.text, signals)
      ? fallbackChoiceText(index)
      : choice.text || fallbackChoiceText(index),
    riskLabel: choice.riskLabel ?? "unknown",
    fuzzySuccessLabel: choice.fuzzySuccessLabel ?? "",
  }));
}

function sanitizeVisibleChanges(changes = [], storyAssetBudgets = {}) {
  const signals = budgetSignals(storyAssetBudgets);
  return (Array.isArray(changes) ? changes : []).filter((change) => {
    const text = typeof change === "string" ? change : change?.text;
    return !isUnsafePlayerLine(text, signals);
  });
}

function stripTitleFromBody(body, age) {
  const text = String(body ?? "").trim();
  if (!text) return "";
  return text.replace(new RegExp(`^\\s*${age}\\s*岁\\s*[:：][^\\n]+\\n?`), "").trim();
}

function paragraphsFromBody(body) {
  return String(body ?? "")
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function containsTemplatePhrase(text) {
  return LIFE_NODE_FORBIDDEN_TEMPLATE_PHRASES.some((phrase) => String(text ?? "").includes(phrase));
}

function annualBodyMatchesScene({ body, observableScene, visibleContract }) {
  if (!observableScene) return true;
  const text = String(body ?? "");
  const anchors = [
    observableScene?.mainScene?.openingBeat,
    observableScene?.mainScene?.requiredVisibleDelta,
    visibleContract?.requiredLifeDelta,
  ].flatMap(textAnchors);
  return anchors.some((anchor) => anchor && text.includes(anchor));
}

function textAnchors(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  const cleaned = text.replace(/[，。；、,.!?！？;:：]/g, " ");
  const words = cleaned.split(/\s+/).map((word) => word.trim()).filter((word) => word.length >= 4);
  return [
    text.slice(0, Math.min(14, text.length)),
    ...words.slice(0, 4),
  ].filter((anchor) => anchor.length >= 4);
}

function sanitizeNarrativeSentence(value) {
  const text = String(value ?? "").trim();
  if (!text || containsTemplatePhrase(text)) return "";
  return text.replace(/[。.!?！？]*$/, "。");
}

function fallbackAnnualParagraph({ visibleContract, age }) {
  const domain = visibleContract?.mainHumanDomain;
  const detail = annualDomainOpening(domain);
  return `${age}岁这一年，${detail}`;
}

function annualFollowupParagraph(domain) {
  return {
    learning_path: "新的安排让你每天接触的人、书本和任务有了变化，家人也开始用更认真的眼光看待你的学习。",
    mentor_attention: "那位大人不再只把你当成跟着跑的孩子，开始给你更具体的提醒，也观察你是否能稳定地回应。",
    peer_relationship: "同龄人的态度不再和从前完全一样，你需要学着在玩伴、闲话和小小的试探之间拿捏分寸。",
    household_responsibility: "家里的活计被重新分给你一部分，长辈看重的不只是你做得快不快，也看你能不能坚持。",
    body_growth: "身体变化让家人重新衡量你的作息、饮食和能做的事，你也更清楚自己仍受年龄限制。",
    health_or_care: "照护方式发生了细微调整，家人更在意你的睡眠、饮食和日常反应，而不是急着给异常下结论。",
    external_attention: "旁人的目光比过去多了一些，你需要在被注意和保持平常之间找到新的距离。",
    talent_subtle_manifestation: "细小异常只在日常里闪过，真正改变你生活的仍是身边人因此调整了对你的安排。",
    family_boundary: "家里的规矩变得更清楚，你第一次意识到有些决定不是靠好奇就能越过去。",
    village_social_life: "村里的闲话和来往改变了你能接触到的人，也让你更早学会分辨谁只是好奇，谁是真的关心。",
  }[domain] ?? "身边的人开始调整对你的安排，你能接触到的日常范围也跟着改变。";
}

function annualDomainOpening(domain) {
  return {
    learning_path: "你的学习安排变得更具体，长辈把识字、记诵或手上练习排进了更稳定的日子里。",
    mentor_attention: "一位可信的大人开始更认真地看待你，不再把你的反应全都当作孩童偶然。",
    peer_relationship: "至少一个同龄人对你的态度发生了变化，平日相处不再完全像从前那样简单。",
    household_responsibility: "家里交给你的日常责任变重了一点，你开始被要求把小事做得更稳。",
    body_growth: "你的身体和精力出现了新的变化，家人也随之调整了对你的照看。",
    health_or_care: "家人对你的照护方式发生了变化，睡眠、饮食和外出的规矩都被重新看了一遍。",
    external_attention: "外人的目光开始更明显地落到你身上，家人因此变得比过去更谨慎。",
    talent_subtle_manifestation: "你在日常里露出一点不寻常的反应，却仍被压在孩童生活能解释的范围内。",
    family_boundary: "家里给你划出的边界变得更清楚，你第一次认真感到规矩会改变一个孩子每天能做什么。",
    village_social_life: "村里的来往和闲话把你推到更多人眼前，你开始学着在熟人社会里安放自己。",
  }[domain] ?? "身边的日常安排出现了新的变化，你需要在其中找到自己的位置。";
}

function fallbackChoiceText(index) {
  return [
    "先照新的安排做下去，留心身边人的具体反应。",
    "找一个可信的大人问清这次变化的缘由。",
    "暂时不急着表态，观察这件事会怎样改变接下来的日子。",
  ][index] ?? "先稳住眼下的新变化，再观察身边人的反应。";
}

function isUnsafePlayerLine(value, signals = []) {
  const text = String(value ?? "");
  if (/\b[a-z][a-z0-9]*_[a-z0-9_]+\b/i.test(text)) return true;
  if (containsTemplatePhrase(text)) return true;
  return signals.some((signal) => signal && text.includes(signal));
}

function budgetSignals(storyAssetBudgets = {}) {
  return Object.values(storyAssetBudgets ?? {})
    .flatMap((budget) => Array.isArray(budget?.textSignals) ? budget.textSignals : [])
    .filter(Boolean);
}

function safeId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-z0-9_\u4e00-\u9fa5-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    || "node";
}
