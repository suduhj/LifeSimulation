const JADE_PATTERNS = /(玉片|玉佩|小珠|灵引符|符文|后山|修仙)/;
const GUARDIAN_PATTERNS = /(父亲|母亲|家人|大人|告诉|询问|问|照看)/;
const OBSERVE_PATTERNS = /(观察|看看|留意|盯|辨认|分辨|听|脚步)/;
const OBEY_PATTERNS = /(听话|服从|收好|不碰|远离|不去|答应)/;

export function buildActionIntent({ run, sourceEvent, action } = {}) {
  const choice = action?.kind === "choice"
    ? sourceEvent?.choices?.find((item) => item.id === action.choiceId)
    : undefined;
  const text = action?.kind === "freeform" ? action.text : choice?.text ?? "";
  const sourceText = `${sourceEvent?.playerText?.title ?? ""}\n${sourceEvent?.playerText?.body ?? ""}\n${text}`;
  const threadId = JADE_PATTERNS.test(sourceText) && run?.worldId === "cultivation" ? "jade_talisman" : inferThreadId(sourceEvent);
  const intentId = inferIntentId({ text, sourceText, threadId });

  return {
    intentId,
    threadId,
    method: inferMethod(text),
    risk: choice?.riskLabel ?? sourceEvent?.event?.riskLabel ?? "medium",
    uses: ["age", "attributes", "npc_relationship", "world_rules"],
    actionText: text,
  };
}

function inferThreadId(sourceEvent) {
  const eventId = sourceEvent?.event?.eventId;
  if (eventId) return eventId;
  return "current_life_thread";
}

function inferIntentId({ text, sourceText, threadId }) {
  if (threadId === "jade_talisman") {
    if (GUARDIAN_PATTERNS.test(text)) return "ask_guardian_about_jade_talisman";
    if (OBEY_PATTERNS.test(text)) return "obey_family_restriction";
    if (OBSERVE_PATTERNS.test(text)) return "observe_jade_talisman_or_mountain_pull";
    if (GUARDIAN_PATTERNS.test(sourceText)) return "ask_guardian_about_jade_talisman";
    return "engage_jade_talisman_thread";
  }
  if (OBEY_PATTERNS.test(text)) return "obey_current_pressure";
  if (OBSERVE_PATTERNS.test(text)) return "observe_current_pressure";
  return "respond_to_current_pressure";
}

function inferMethod(text) {
  if (GUARDIAN_PATTERNS.test(text)) return "ask_or_report_to_guardian";
  if (OBEY_PATTERNS.test(text)) return "comply";
  if (OBSERVE_PATTERNS.test(text)) return "observe";
  return "attempt";
}
