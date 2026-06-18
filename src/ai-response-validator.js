const RESPONSE_TYPES = new Set([
  "life_event",
  "action_resolution",
  "clarification_request",
  "forced_consequence",
  "ending_summary",
  "memory_update",
  "json_repair",
]);
const INTERACTION_MODES = new Set([
  "playable_choices",
  "freeform_confirmation",
  "non_interactive",
  "ending",
  "system_only",
]);
const PLAYABLE_RESPONSE_TYPES = new Set(["life_event", "action_resolution"]);

export function validateAiResponse(response) {
  const errors = [];

  requireObject(response, "response", errors);
  if (errors.length > 0) return { valid: false, errors };

  requireEqual(response.schemaVersion, "mvp.ai_event_response.v1", "schemaVersion", errors);
  requireEnum(response.responseType, RESPONSE_TYPES, "responseType", errors);
  requireString(response.worldId, "worldId", errors);
  requireString(response.runId, "runId", errors);
  requireString(response.turnId, "turnId", errors);
  requireObject(response.timeSpan, "timeSpan", errors);
  validateTimeSpan(response.timeSpan, errors);
  requireArray(response.selectedSeeds, "selectedSeeds", errors);
  requireEnum(response.interactionMode, INTERACTION_MODES, "interactionMode", errors);
  requireObject(response.playerText, "playerText", errors);
  requireObject(response.event, "event", errors);
  requireArray(response.choices, "choices", errors);
  requireObject(response.freeform, "freeform", errors);
  requireArray(response.visibleChanges, "visibleChanges", errors);
  requireObject(response.statePatch, "statePatch", errors);
  requireObject(response.internal, "internal", errors);

  if (response.interactionMode === "playable_choices") {
    if (!PLAYABLE_RESPONSE_TYPES.has(response.responseType)) {
      errors.push("playable_choices interactionMode requires life_event or action_resolution responseType");
    }
    if (response.choices?.length !== 3) {
      errors.push("playable_choices responses must provide exactly 3 choices");
    }
    validatePlayableNarrative(response, errors);
  }
  if (response.interactionMode === "freeform_confirmation") {
    if (response.responseType !== "clarification_request") {
      errors.push("freeform_confirmation interactionMode requires clarification_request responseType");
    }
    if (response.choices?.length !== 0) {
      errors.push("freeform_confirmation responses must provide 0 choices");
    }
    if (response.freeform?.clarificationNeeded !== true) {
      errors.push("freeform_confirmation responses must set freeform.clarificationNeeded to true");
    }
  }
  if (response.interactionMode === "ending" && response.choices?.length !== 0) {
    errors.push("ending responses must provide 0 choices");
  }
  if (response.responseType === "ending_summary") {
    validateEndingStatePatch(response.statePatch, errors);
  }

  response.choices?.forEach((choice, index) => {
    requireString(choice.id, `choices[${index}].id`, errors);
    if (response.interactionMode === "playable_choices" && choice.id !== `choice_${index + 1}`) {
      errors.push(`choices[${index}].id must be choice_${index + 1}; choice_4 is reserved for optional free-form input`);
    }
    if (typeof choice.text !== "string" || choice.text.trim().length < 12) {
      errors.push(`choices[${index}].text must be rich text with at least 12 characters`);
    }
    requireArray(choice.intentTags, `choices[${index}].intentTags`, errors);
    requireString(choice.fuzzySuccessLabel, `choices[${index}].fuzzySuccessLabel`, errors);
    if (typeof choice.fuzzySuccessLabel === "string" && preAnnouncesChoiceSuccess(choice.fuzzySuccessLabel)) {
      errors.push(`choices[${index}].fuzzySuccessLabel must not pre-announce success or resolved outcomes`);
    }
    requireString(choice.riskLabel, `choices[${index}].riskLabel`, errors);
  });

  response.visibleChanges?.forEach((change, index) => {
    requireObject(change, `visibleChanges[${index}]`, errors);
    requireString(change?.type, `visibleChanges[${index}].type`, errors);
    requireString(change?.target, `visibleChanges[${index}].target`, errors);
    requireString(change?.text, `visibleChanges[${index}].text`, errors);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

const BACKEND_LEAK_SNAKE_ID = /[a-z][a-z0-9]*_[a-z0-9_]+/;
const BACKEND_LEAK_TOKENS = /素材种子|sourceType|seed_pool|seed pool|run started|eventgeneration|continuityrules|immediatepriorresolution|hiddenhooks|unresolvedthreads/i;
// A real English sentence/phrase (3+ space-separated latin words), e.g. "Run started in
// cultivation with identity seed". This intentionally ignores single long tokens (e.g. an
// English player name) and hyphenated product names (OpenAI-compatible) to avoid false positives.
const BACKEND_LEAK_ENGLISH_PHRASE = /[A-Za-z]+(?: [A-Za-z]+){2,}/;

// Ordinary player-facing text must be Chinese and must never leak backend context. Raw
// snake_case ids (noble_dynasty_child), long English runs ("Run started in cultivation..."),
// and backend concepts (素材种子/sourceType/run started) belong only in internal/GM surfaces.
// This is applied to real AI provider output (see requestValidatedAiResponse) so a leaking
// response is routed into repair instead of reaching the player. It is intentionally NOT part
// of the shared validateAiResponse: mock/dev/GM/engine responses are author-controlled and may
// carry backend ids in GM/debug surfaces.
export function detectPlayerTextLeaks(response) {
  const errors = [];
  const playerText = response?.playerText;
  if (!playerText || typeof playerText !== "object" || Array.isArray(playerText)) return errors;

  const fields = [
    ["playerText.title", playerText.title],
    ["playerText.body", playerText.body],
  ];
  if (Array.isArray(response.choices)) {
    response.choices.forEach((choice, index) => fields.push([`choices[${index}].text`, choice?.text]));
  }

  for (const [label, value] of fields) {
    const text = typeof value === "string" ? value : "";
    if (!text) continue;
    if (BACKEND_LEAK_SNAKE_ID.test(text)) {
      errors.push(`${label} must not expose raw backend ids (snake_case) in player-facing text`);
    } else if (BACKEND_LEAK_TOKENS.test(text)) {
      errors.push(`${label} must not expose backend concepts (e.g. 素材种子/sourceType/run started) in player-facing text`);
    } else if (BACKEND_LEAK_ENGLISH_PHRASE.test(text)) {
      errors.push(`${label} must not contain English sentences/phrases in Chinese player-facing text`);
    }
  }
  return errors;
}

function validatePlayableNarrative(response, errors) {
  const age = response.timeSpan?.ageEnd;
  const title = String(response.playerText?.title ?? "");
  const body = String(response.playerText?.body ?? "");
  if (typeof age === "number" && !title.includes(`${age} 岁`)) {
    errors.push("playable playerText.title must include the event age");
  }
  if (/^(?:\d+\s*岁[:：])?\s*(人生事件|人生片段|命运片段|事件|当前事件|新的事件|选择时刻|生活事件)\s*$/.test(title.trim())) {
    errors.push("playable playerText.title must be a concrete event title, not a generic card label");
  }
  if (body.trim().length < 70 || !/因为|由于|此前|这天|眼下|母亲|父亲|家人|监护人|镇上|村里|门外|林外|营地|学校|医院|争执|犹豫|逼近|压低声音|不得不|于是/.test(body)) {
    errors.push("playable playerText.body must provide enough prior situation and choice context before choices");
  }
  const mentionsNewPerson = /来人|陌生人|那人|某个NPC|NPC/.test(body + "\n" + response.choices?.map((choice) => choice.text).join("\n"));
  const introducedPerson = /脚步|声音|影子|身影|有人|来人|陌生人|走来|靠近|出现|门外|林外|屋外/.test(body);
  if (mentionsNewPerson && !introducedPerson) {
    errors.push("playable event mentions a new person in choices without first introducing them in playerText.body");
  }
  for (const token of choiceContextTokens(response.choices)) {
    if (!body.includes(token)) {
      errors.push(`playable event choices mention "${token}" without establishing it in playerText.body choice context`);
      break;
    }
  }
}

function preAnnouncesChoiceSuccess(label) {
  const text = String(label ?? "").trim();
  return /成功(?:获取|获得|隐藏|套取|击败|说服|逃脱|完成|进入|发现|掌控|解决)/.test(text)
    || /说服|交易|跟踪|获取|获得|找到|发现|隐藏|套取|击败|逃脱|完成|进入|掌控|解决/.test(text)
    || /必定|一定|保证|直接成功|必然/.test(text);
}

function choiceContextTokens(choices = []) {
  const joined = choices.map((choice) => choice?.text ?? "").join("\n");
  return ["道士", "玉片", "符文", "后山", "丹药", "药材", "陌生人", "来人"].filter((token) => joined.includes(token));
}

function validateTimeSpan(timeSpan, errors) {
  if (!timeSpan || typeof timeSpan !== "object" || Array.isArray(timeSpan)) return;

  requireNumber(timeSpan.ageStart, "timeSpan.ageStart", errors, { min: 0 });
  requireNumber(timeSpan.ageEnd, "timeSpan.ageEnd", errors, { min: 0 });
  requireNumber(timeSpan.yearsElapsed, "timeSpan.yearsElapsed", errors, { min: 0 });
  requireString(timeSpan.pace, "timeSpan.pace", errors);
  if (typeof timeSpan.ageStart === "number" && typeof timeSpan.ageEnd === "number" && timeSpan.ageEnd < timeSpan.ageStart) {
    errors.push("timeSpan.ageEnd must be greater than or equal to timeSpan.ageStart");
  }
}

function validateEndingStatePatch(statePatch, errors) {
  if (!statePatch || typeof statePatch !== "object" || Array.isArray(statePatch)) return;

  const endingChange = statePatch.worldStateChanges?.find((change) => change?.target === "ending");
  if (!endingChange) {
    errors.push("ending_summary responses must include statePatch.worldStateChanges target ending");
    return;
  }
  if (!endingChange.value || typeof endingChange.value !== "object" || Array.isArray(endingChange.value)) {
    errors.push("ending_summary ending worldStateChange.value must be an object");
    return;
  }
  if (endingChange.value.completed !== true) {
    errors.push("ending_summary ending value must set completed to true");
  }
  requireString(endingChange.value.id, "ending_summary ending value.id", errors);
  requireString(endingChange.value.name, "ending_summary ending value.name", errors);
}

function requireObject(value, label, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  return true;
}

function requireArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return false;
  }
  return true;
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} must be a non-empty string`);
    return false;
  }
  return true;
}

function requireNumber(value, label, errors, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${label} must be a finite number`);
    return false;
  }
  if (typeof options.min === "number" && value < options.min) {
    errors.push(`${label} must be at least ${options.min}`);
    return false;
  }
  return true;
}

function requireEqual(value, expected, label, errors) {
  if (value !== expected) {
    errors.push(`${label} must be ${expected}`);
  }
}

function requireEnum(value, allowed, label, errors) {
  if (!allowed.has(value)) {
    errors.push(`${label} must be one of ${[...allowed].join(", ")}`);
  }
}
