export function validateStoryContract(response, contract) {
  if (!contract) return { valid: true, errors: [] };
  const errors = [];
  const text = [
    response?.playerText?.title,
    response?.playerText?.body,
    ...(response?.choices ?? []).map((choice) => choice.text),
  ].filter(Boolean).join("\n");

  if ((contract.closedFacts ?? []).includes("jade_talisman_first_discovery") && looksLikeJadeRediscovery(text)) {
    errors.push("response reopens closed fact jade_talisman_first_discovery");
  }
  if ((contract.forbiddenSceneSkeletons ?? []).includes("forest_jade_object_footsteps_choice_skeleton") && looksLikeForestJadeFootstepsSkeleton(text)) {
    errors.push("response repeats forbidden scene skeleton forest_jade_object_footsteps_choice_skeleton");
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

function looksLikeJadeRediscovery(text) {
  return /(草丛|竹林|山林|林边).{0,30}(露出|发现|看见|捡到).{0,20}(暗红|小珠|玉片|玉佩)/s.test(text)
    || /(首次|第一次|从未注意).{0,20}(玉片|小珠|灵引符)/s.test(text);
}

function looksLikeForestJadeFootstepsSkeleton(text) {
  return /(草丛|竹林|山林|林边).{0,40}(小珠|玉片|玉佩)/s.test(text)
    && /(林外|远处|脚步声|脚步)/s.test(text)
    && /(小珠|玉片|脚步声)/s.test(text);
}
