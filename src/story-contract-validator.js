import { detectStaleAnnualEventShape } from "./annual-state-transition.js";

export function validateStoryContract(response, contract) {
  if (!contract) return { valid: true, errors: [] };
  const errors = [];
  const text = collectPlayerText(response);

  if ((contract.closedFacts ?? []).includes("jade_talisman_first_discovery") && looksLikeJadeRediscovery(text)) {
    errors.push("response reopens closed fact jade_talisman_first_discovery");
  }
  if ((contract.forbiddenSceneSkeletons ?? []).includes("forest_jade_object_footsteps_choice_skeleton") && looksLikeForestJadeFootstepsSkeleton(text)) {
    errors.push("response repeats forbidden scene skeleton forest_jade_object_footsteps_choice_skeleton");
  }

  const repeatedShape = matchingForbiddenShape(text, contract.forbiddenEventShapes ?? []);
  if (repeatedShape) {
    errors.push(`response reuses forbidden event shape ${repeatedShape}`);
  }

  if (contract.annualFactPackage?.primaryDelta?.eventShape === "institution_arrival_changes_life" && !looksLikeInstitutionArrival(text)) {
    errors.push("response does not render annual fact package: institution arrival");
  }
  for (const requiredStateChange of contract.requiredStateChanges ?? []) {
    if (!looksLikeRequiredStateChange(requiredStateChange, text, contract)) {
      errors.push(`response misses required annual state change: ${requiredStateChange}`);
    }
  }

  for (const phrase of contract.mustNotInclude ?? []) {
    if (phrase && text.includes(phrase)) errors.push(`response includes forbidden phrase: ${phrase}`);
  }

  return { valid: errors.length === 0, errors };
}

export function assertStoryContract(response, contract) {
  const validation = validateStoryContract(response, contract);
  if (!validation.valid) {
    throw new Error(`AI response failed story contract: ${validation.errors.join("; ")}`);
  }
  return response;
}

function collectPlayerText(response) {
  return [
    response?.playerText?.title,
    response?.playerText?.body,
    ...(response?.choices ?? []).map((choice) => choice.text),
  ].filter(Boolean).join("\n");
}

function looksLikeJadeRediscovery(text) {
  return /(草丛|竹林|山林|林边).{0,30}(露出|发现|看见|捡到).{0,20}(暗红|小珠|玉片|玉佩|玉简)/s.test(text)
    || /(首次|第一次|从未注意).{0,20}(玉片|小珠|灵引符|玉简)/s.test(text);
}

function looksLikeForestJadeFootstepsSkeleton(text) {
  return /(草丛|竹林|山林|林边).{0,40}(小珠|玉片|玉佩|玉简)/s.test(text)
    && /(林外|远处|脚步声|脚步)/s.test(text)
    && /(小珠|玉片|脚步声)/s.test(text);
}

function matchingForbiddenShape(text, forbiddenEventShapes) {
  const shape = detectStaleAnnualEventShape(text);
  return forbiddenEventShapes.includes(shape) ? shape : "";
}

function looksLikeSecretReturnToForbiddenPlace(text) {
  return /(再次|又一次|再度|继续|趁).{0,40}(偷跑|偷偷|溜去|潜入|回到).{0,60}(后山|竹林|禁地|洞府|医院|仓库|藏经阁)/s.test(text)
    || /(父亲外出|母亲午睡|看管松动|无人看管).{0,80}(偷跑|偷偷|溜去|潜入).{0,80}(后山|竹林|禁地|洞府|医院|仓库|藏经阁)/s.test(text);
}

function looksLikeInstitutionArrival(text) {
  return /(碧云宗|宗门来人|宗门的人|外门弟子)/s.test(text)
    && /(选拔|处理|搜山|灵兽|玉简|村民|青石村)/s.test(text)
    && /(村子|家里|父母|林岚|青石村|主角)/s.test(text);
}

function looksLikeRequiredStateChange(requiredStateChange, text, contract = {}) {
  const primaryDelta = contract.annualFactPackage?.primaryDelta;
  if (String(requiredStateChange).startsWith("annual_") && primaryDelta) {
    return text.includes(primaryDelta.title)
      || text.includes(primaryDelta.description)
      || (contract.annualFactPackage?.requiredTextSignals ?? []).some((signal) => signal && text.includes(signal));
  }
  return {
    biyun_disciple_arrived: /(碧云宗|外门弟子|宗门来人|宗门的人)/s.test(text),
    selection_delay_explained: /(选拔|延期|搁置|推迟|补招|错过)/s.test(text),
    parents_must_decide_how_much_to_disclose: /(父母|家里|隐瞒|坦白|说出|不愿暴露|决定透露)/s.test(text),
  }[requiredStateChange] ?? text.includes(requiredStateChange);
}
