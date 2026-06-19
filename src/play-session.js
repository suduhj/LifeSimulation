import { applyAiResponseToRun } from "./run-loop.js";
import { recordAiFailure } from "./ai-failure-log.js";
import { buildActionIntent } from "./action-intent.js";
import { generateChoiceResolution } from "./choice-resolution.js";
import { generateMvpEndingSummary, shouldTriggerMvpEnding } from "./ending-generator.js";
import { assessFreeformClarification, generateFreeformClarificationRequest } from "./freeform-clarification.js";
import { generateFreeformResolution } from "./freeform-resolution.js";
import { generateMockLifeEvent } from "./mock-ai.js";
import { buildNextEventContract } from "./narrative-director.js";
import { firstActionAge, generateOpeningSequence } from "./opening-sequence.js";
import { applySimulationOutcomeToResponse, simulateActionOutcome } from "./simulation-kernel.js";
import { assertStoryContract } from "./story-contract-validator.js";
import { applyAnnualFactPackageToResponse } from "./annual-state-transition.js";

export function normalizePlayerInput(input) {
  const text = String(input ?? "").trim();
  const normalizedText = text.toLowerCase();
  if (["q", "quit", "exit", "退出"].includes(normalizedText)) {
    return { kind: "quit" };
  }
  if (/^[123]$/.test(text)) {
    return { kind: "choice", choiceId: `choice_${text}` };
  }
  if (["start", "begin", "continue", "开始", "开始人生", "继续人生"].includes(normalizedText)) {
    return { kind: "advance_opening" };
  }
  if (text === "4") {
    return { kind: "freeform_prompt" };
  }
  if (["y", "yes", "确认", "继续", "执行"].includes(normalizedText)) {
    return { kind: "confirm_freeform" };
  }
  if (["n", "no", "cancel", "取消"].includes(normalizedText)) {
    return { kind: "cancel_freeform" };
  }
  if (text.startsWith("4:")) {
    const freeformText = text.slice(2).trim();
    return freeformText ? { kind: "freeform", text: freeformText } : { kind: "freeform_prompt" };
  }
  if (/^choice_[123]$/.test(text)) {
    return { kind: "choice", choiceId: text };
  }
  return { kind: "invalid" };
}

export function createPlaySession({ run, worlds, seed = 1, endingAge = 12 } = {}) {
  if (hasCompletedEnding(run)) {
    return createEndedSession({ run, worlds, seed, endingAge });
  }
  if (!hasStartedLife(run)) {
    return createOpeningSession({ run, worlds, seed, endingAge });
  }
  return createPlayableSession({ run, worlds, seed, endingAge });
}

export async function createPlaySessionAsync({ run, worlds, seed = 1, endingAge = 12, aiProvider } = {}) {
  if (!aiProvider) {
    return createPlaySession({ run, worlds, seed, endingAge });
  }

  if (hasCompletedEnding(run)) {
    return createEndedSession({ run, worlds, seed, endingAge, aiProvider });
  }
  if (!hasStartedLife(run)) {
    return createOpeningSessionAsync({ run, worlds, seed, endingAge, aiProvider });
  }

  return createPlayableSessionAsync({ run, worlds, seed, endingAge, aiProvider });
}

function hasStartedLife(run) {
  return (run?.eventHistory?.length ?? 0) > 0;
}

function hasCompletedEnding(run) {
  return Boolean(run?.ending?.completed);
}

// Real-AI generation can fail after retries. We never fabricate a mock substitute (that silently
// resets the story and hides the problem); instead the turn is not committed and the player is
// offered a retry, with the reason recorded in the failure log. Preserves the pre-attempt session
// so a retry redoes the turn from the same state.
function aiFailedSession(session, phase, error) {
  return {
    ...session,
    error: { phase, reason: error instanceof Error ? error.message : String(error) },
    inputRequired: "ai_failed",
    resolution: undefined,
    quit: false,
  };
}

function createEndedSession({ run, worlds, seed, endingAge, aiProvider } = {}) {
  const endingSummary = run?.ending?.completed
    ? buildStoredEndingSummary({ run, worlds, seed, endingAge })
    : generateMvpEndingSummary({
        run,
        worlds,
        seed: seed + 999,
        endingAge,
      });
  const endedRun = run?.ending?.completed ? run : applyAiResponseToRun(run, endingSummary);
  return {
    worlds,
    seed,
    endingAge,
    aiProvider,
    currentRun: endedRun,
    currentEvent: endingSummary,
    endingSummary,
    ended: true,
    turnCounter: 1,
  };
}

function buildStoredEndingSummary({ run, worlds, seed, endingAge }) {
  const response = generateMvpEndingSummary({
    run,
    worlds,
    seed: seed + 999,
    endingAge,
  });
  const ending = run.ending ?? {};
  return {
    ...response,
    playerText: {
      ...response.playerText,
      title: ending.name ? `结局：${ending.name}` : response.playerText.title,
    },
    statePatch: {
      ...response.statePatch,
      worldStateChanges: [
        {
          target: "ending",
          value: structuredClone(ending),
          source: "loaded_save",
        },
      ],
      growthEvidenceChanges: Array.isArray(response.statePatch?.growthEvidenceChanges)
        ? response.statePatch.growthEvidenceChanges
        : [],
      scoreDelta: 0,
    },
  };
}

function createOpeningSession({ run, worlds, seed, endingAge, aiProvider } = {}) {
  const currentEvent = generateOpeningSequence({ run, worlds, seed });
  const currentRun = applyAiResponseToRun(run, currentEvent);
  return {
    worlds,
    seed,
    endingAge,
    aiProvider,
    currentRun,
    currentEvent,
    openingPhase: "background",
    inputRequired: "opening_continue",
    turnCounter: 1,
  };
}

async function createOpeningSessionAsync({ run, worlds, seed, endingAge, aiProvider } = {}) {
  const base = { worlds, seed, endingAge, aiProvider, currentRun: run, currentEvent: undefined, turnCounter: 1 };
  try {
    const currentEvent = await safeGenerateOpeningSequence({ aiProvider, run, worlds, seed });
    const currentRun = applyAiResponseToRun(run, currentEvent);
    return {
      ...base,
      currentRun,
      currentEvent,
      openingPhase: "background",
      inputRequired: "opening_continue",
    };
  } catch (error) {
    return aiFailedSession(base, "opening_sequence", error);
  }
}

function createPlayableSession({ run, worlds, seed, endingAge } = {}) {
  const currentEvent = generateMockLifeEvent({ run, worlds, seed });
  const currentRun = applyAiResponseToRun(run, currentEvent);
  if (shouldTriggerMvpEnding(currentRun, { endingAge })) {
    const endingSummary = generateMvpEndingSummary({ run: currentRun, worlds, seed: seed + 999, endingAge });
    return {
      worlds,
      seed,
      endingAge,
      currentRun: applyAiResponseToRun(currentRun, endingSummary),
      currentEvent: endingSummary,
      endingSummary,
      ended: true,
      turnCounter: 1,
    };
  }

  return {
    worlds,
    seed,
    endingAge,
    currentRun,
    currentEvent,
    turnCounter: 1,
  };
}

async function createPlayableSessionAsync({ run, worlds, seed, endingAge, aiProvider } = {}) {
  const base = { worlds, seed, endingAge, aiProvider, currentRun: run, currentEvent: undefined, turnCounter: 1 };
  try {
    const currentEvent = await safeGenerateLifeEvent({
      aiProvider,
      run,
      worlds,
      seed,
    });
    const currentRun = applyAiResponseToRun(run, currentEvent);
    if (shouldTriggerMvpEnding(currentRun, { endingAge })) {
      const endingSummary = await safeGenerateEndingSummary({
        aiProvider,
        run: currentRun,
        worlds,
        seed: seed + 999,
        endingAge,
        endingReason: "mvp_short_run_start",
      });
      return {
        ...base,
        currentRun: applyAiResponseToRun(currentRun, endingSummary),
        currentEvent: endingSummary,
        endingSummary,
        ended: true,
      };
    }

    return {
      ...base,
      currentRun,
      currentEvent,
    };
  } catch (error) {
    return aiFailedSession(base, "life_event", error);
  }
}

export function handlePlayerInput({ session, input } = {}) {
  const normalized = normalizePlayerInput(input);
  if (session.ended) {
    return { ...session, quit: normalized.kind === "quit" };
  }
  if (session.pendingFreeformConfirmation) {
    return handlePendingFreeformConfirmation({ session, normalized });
  }
  if (normalized.kind === "quit") {
    return {
      ...session,
      quit: true,
    };
  }
  if (session.openingPhase === "background") {
    if (normalized.kind === "advance_opening") {
      return advanceOpeningSync(session);
    }
    return {
      ...session,
      quit: false,
      inputRequired: "opening_continue",
    };
  }
  if (normalized.kind === "advance_opening") {
    return {
      ...session,
      quit: false,
      inputRequired: "invalid",
    };
  }
  if (normalized.kind === "freeform_prompt" || normalized.kind === "invalid") {
    return {
      ...session,
      quit: false,
      inputRequired: normalized.kind,
    };
  }
  if (normalized.kind === "confirm_freeform" || normalized.kind === "cancel_freeform") {
    return {
      ...session,
      quit: false,
      inputRequired: "invalid",
    };
  }

  if (normalized.kind === "freeform") {
    const assessment = assessFreeformClarification({
      run: session.currentRun,
      sourceEvent: session.currentEvent,
      inputText: normalized.text,
    });
    if (assessment.clarificationNeeded) {
      const clarification = generateFreeformClarificationRequest({
        run: session.currentRun,
        sourceEvent: session.currentEvent,
        inputText: normalized.text,
        assessment,
        seed: session.seed + session.turnCounter * 100,
      });
      return {
        ...session,
        currentEvent: clarification,
        clarificationRequest: clarification,
        pendingFreeformConfirmation: {
          inputText: normalized.text,
          sourceEvent: session.currentEvent,
          assessment,
        },
        quit: false,
      };
    }
  }

  return resolvePlayerActionSync({ session, normalized });
}

export async function handlePlayerInputAsync({ session, input } = {}) {
  if (!session.aiProvider) {
    return handlePlayerInput({ session, input });
  }

  const normalized = normalizePlayerInput(input);
  if (session.ended) {
    return { ...session, quit: normalized.kind === "quit" };
  }
  if (session.pendingFreeformConfirmation) {
    return handlePendingFreeformConfirmationAsync({ session, normalized });
  }
  if (normalized.kind === "quit") {
    return {
      ...session,
      quit: true,
    };
  }
  if (session.openingPhase === "background") {
    if (normalized.kind === "advance_opening") {
      return advanceOpeningAsync(session);
    }
    return {
      ...session,
      quit: false,
      inputRequired: "opening_continue",
    };
  }
  if (normalized.kind === "advance_opening") {
    return {
      ...session,
      quit: false,
      inputRequired: "invalid",
    };
  }
  if (normalized.kind === "freeform_prompt" || normalized.kind === "invalid") {
    return {
      ...session,
      quit: false,
      inputRequired: normalized.kind,
    };
  }
  if (normalized.kind === "confirm_freeform" || normalized.kind === "cancel_freeform") {
    return {
      ...session,
      quit: false,
      inputRequired: "invalid",
    };
  }

  if (normalized.kind === "freeform") {
    const assessment = assessFreeformClarification({
      run: session.currentRun,
      sourceEvent: session.currentEvent,
      inputText: normalized.text,
    });
    if (assessment.clarificationNeeded) {
      const clarification = generateFreeformClarificationRequest({
        run: session.currentRun,
        sourceEvent: session.currentEvent,
        inputText: normalized.text,
        assessment,
        seed: session.seed + session.turnCounter * 100,
      });
      return {
        ...session,
        currentEvent: clarification,
        clarificationRequest: clarification,
        pendingFreeformConfirmation: {
          inputText: normalized.text,
          sourceEvent: session.currentEvent,
          assessment,
        },
        quit: false,
      };
    }
  }

  try {
    return await resolvePlayerActionAsync({ session, normalized });
  } catch (error) {
    return aiFailedSession(session, "action_resolution", error);
  }
}

function advanceOpeningSync(session) {
  const nextEvent = normalizeFirstBranchEvent(generateMockLifeEvent({
    run: session.currentRun,
    worlds: session.worlds,
    seed: session.seed + session.turnCounter + 1,
  }), session.currentRun);
  const nextRun = applyAiResponseToRun(session.currentRun, nextEvent);
  if (shouldTriggerMvpEnding(nextRun, { endingAge: session.endingAge })) {
    const endingSummary = generateMvpEndingSummary({
      run: nextRun,
      worlds: session.worlds,
      seed: session.seed + session.turnCounter * 1000 + 1,
      endingAge: session.endingAge,
    });
    const endedRun = applyAiResponseToRun(nextRun, endingSummary);
    return {
      ...session,
      currentRun: endedRun,
      currentEvent: endingSummary,
      endingSummary,
      ended: true,
      openingPhase: "first_branch",
      inputRequired: undefined,
      resolution: undefined,
      turnCounter: session.turnCounter + 1,
      quit: false,
    };
  }
  return {
    ...session,
    currentRun: nextRun,
    currentEvent: nextEvent,
    openingPhase: "first_branch",
    inputRequired: undefined,
    resolution: undefined,
    turnCounter: session.turnCounter + 1,
    quit: false,
  };
}

async function advanceOpeningAsync(session) {
  try {
    const nextEvent = normalizeFirstBranchEvent(await safeGenerateLifeEvent({
      aiProvider: session.aiProvider,
      run: session.currentRun,
      worlds: session.worlds,
      seed: session.seed + session.turnCounter + 1,
    }), session.currentRun);
    const nextRun = applyAiResponseToRun(session.currentRun, nextEvent);
    if (shouldTriggerMvpEnding(nextRun, { endingAge: session.endingAge })) {
      const ended = await finishWithEnding({
        session,
        run: nextRun,
        resolution: undefined,
        seedOffset: session.turnCounter * 1000 + 1,
      });
      return {
        ...ended,
        openingPhase: "first_branch",
        inputRequired: undefined,
      };
    }
    return {
      ...session,
      error: undefined,
      currentRun: nextRun,
      currentEvent: nextEvent,
      openingPhase: "first_branch",
      inputRequired: undefined,
      resolution: undefined,
      turnCounter: session.turnCounter + 1,
      quit: false,
    };
  } catch (error) {
    return aiFailedSession(session, "life_event", error);
  }
}

function normalizeFirstBranchEvent(event, run) {
  if (!event || event.responseType !== "life_event") return event;
  const age = Number(run?.player?.age ?? event.timeSpan?.ageStart ?? 0);
  const normalized = structuredClone(event);
  normalized.timeSpan = {
    ...(normalized.timeSpan ?? {}),
    ageStart: age,
    ageEnd: age,
    yearsElapsed: 0,
    pace: normalized.timeSpan?.pace ?? "scene_or_short_stage",
    paceReasonKey: "first_branch_current_age",
  };
  normalized.playerText = {
    ...(normalized.playerText ?? {}),
    title: withAgeTitle(normalized.playerText?.title, age, normalized.playerText?.body),
  };
  return normalized;
}

function withAgeTitle(title, age, body = "") {
  const cleanTitle = String(title ?? "").trim().replace(/^(?:\d+|[零一二三四五六七八九十两]+)\s*岁\s*[:：、-]?\s*/, "");
  return `${age} 岁：${derivePlayableTitle(cleanTitle, body)}`;
}

// Branch pacing: the player should reach ONE branching decision per year (or every few years),
// not several within the same age. The action resolution stays at the branch age; this advances
// the NEXT branch's timeline so the next decision is a later year. We honor a larger forward skip
// the generator proposed (so the story can jump a few years) but guarantee at least +1 year and cap
// runaway jumps. This mirrors the engine authority of enforceOpeningActionAge — the AI repeatedly
// anchored the next branch to the current age, which produced multiple decisions within one year.
const MIN_BRANCH_SKIP_YEARS = 1;
const MAX_BRANCH_SKIP_YEARS = 6;

function enforceBranchAdvance(event, fromAge) {
  if (!event || event.responseType !== "life_event") return event;
  const base = Number.isFinite(fromAge) ? fromAge : Number(event.timeSpan?.ageStart ?? 0);
  const proposedEnd = Number(event.timeSpan?.ageEnd);
  const proposedSkip = Number.isFinite(proposedEnd) ? proposedEnd - base : MIN_BRANCH_SKIP_YEARS;
  const skip = Math.min(MAX_BRANCH_SKIP_YEARS, Math.max(MIN_BRANCH_SKIP_YEARS, proposedSkip));
  const nextAge = base + skip;
  const normalized = structuredClone(event);
  normalized.timeSpan = {
    ...(normalized.timeSpan ?? {}),
    ageStart: base,
    ageEnd: nextAge,
    yearsElapsed: skip,
    pace: normalized.timeSpan?.pace ?? (skip > 1 ? "life_stage" : "scene_or_short_stage"),
    paceReasonKey: "branch_time_advance",
  };
  normalized.playerText = {
    ...(normalized.playerText ?? {}),
    title: withAgeTitle(normalized.playerText?.title, nextAge, normalized.playerText?.body),
  };
  return normalized;
}

function derivePlayableTitle(title, body = "") {
  if (title && !genericPlayableTitle(title)) return title;
  const text = String(body ?? "").replace(/\s+/g, "");
  if (/瘟疫|疫病|病/.test(text) && /玉片|玉/.test(text)) return "玉片与病势";
  if (/母亲|父亲|家人|监护/.test(text) && /交易|换|药|丹药/.test(text)) return "家中的抉择";
  if (/竹林|林中|树林/.test(text) && /珠|红光|暗红/.test(text)) return "竹林里的异物";
  if (/母亲|父亲|家人|监护/.test(text) && /争执|商量|犹豫|分歧/.test(text)) return "家中的分歧";
  if (/宗门|仙门|修士|灵根/.test(text)) return "仙缘初近";
  if (/梦|医院|失踪|怪谈|官方/.test(text)) return "平静下的异常";
  if (/水源|口粮|辐射|营地|拾荒/.test(text)) return "生存的压力";
  return "眼前的抉择";
}

function genericPlayableTitle(title) {
  return /^(人生事件|人生片段|命运片段|事件|当前事件|新的事件|命运的岔道|选择时刻|生活事件)$/.test(String(title ?? "").trim());
}

function handlePendingFreeformConfirmation({ session, normalized }) {
  if (normalized.kind === "cancel_freeform") {
    return {
      ...session,
      currentEvent: session.pendingFreeformConfirmation.sourceEvent,
      clarificationRequest: undefined,
      pendingFreeformConfirmation: undefined,
      inputRequired: undefined,
      quit: false,
    };
  }
  if (normalized.kind !== "confirm_freeform") {
    return {
      ...session,
      inputRequired: "freeform_confirmation",
      quit: false,
    };
  }

  const pending = session.pendingFreeformConfirmation;
  const restoredSession = {
    ...session,
    currentEvent: pending.sourceEvent,
    clarificationRequest: undefined,
    pendingFreeformConfirmation: undefined,
    inputRequired: undefined,
  };
  return resolvePlayerActionSync({
    session: restoredSession,
    normalized: { kind: "freeform", text: pending.inputText },
    skipClarification: true,
  });
}

async function handlePendingFreeformConfirmationAsync({ session, normalized }) {
  if (normalized.kind === "cancel_freeform") {
    return {
      ...session,
      currentEvent: session.pendingFreeformConfirmation.sourceEvent,
      clarificationRequest: undefined,
      pendingFreeformConfirmation: undefined,
      inputRequired: undefined,
      quit: false,
    };
  }
  if (normalized.kind !== "confirm_freeform") {
    return {
      ...session,
      inputRequired: "freeform_confirmation",
      quit: false,
    };
  }

  const pending = session.pendingFreeformConfirmation;
  const restoredSession = {
    ...session,
    currentEvent: pending.sourceEvent,
    clarificationRequest: undefined,
    pendingFreeformConfirmation: undefined,
    inputRequired: undefined,
  };
  return resolvePlayerActionAsync({
    session: restoredSession,
    normalized: { kind: "freeform", text: pending.inputText },
    skipClarification: true,
  });
}

function resolvePlayerActionSync({ session, normalized }) {
  const { action, simulationOutcome } = buildStateFirstActionContext({ session, normalized });
  const resolution =
    normalized.kind === "choice"
      ? generateChoiceResolution({
          run: session.currentRun,
          sourceEvent: session.currentEvent,
          choiceId: normalized.choiceId,
          worlds: session.worlds,
          seed: session.seed + session.turnCounter * 100,
        })
      : generateFreeformResolution({
          run: session.currentRun,
          sourceEvent: session.currentEvent,
          inputText: normalized.text,
          worlds: session.worlds,
          seed: session.seed + session.turnCounter * 100,
        });
  const authoritativeResolution = attachSimulationOutcome(resolution, simulationOutcome, session.currentRun);

  const afterResolution = applyAiResponseToRun(session.currentRun, authoritativeResolution);
  if (shouldTriggerMvpEnding(afterResolution, { endingAge: session.endingAge })) {
    const endingSummary = generateMvpEndingSummary({
      run: afterResolution,
      worlds: session.worlds,
      seed: session.seed + session.turnCounter * 1000,
      endingAge: session.endingAge,
    });
    const endedRun = applyAiResponseToRun(afterResolution, endingSummary);
    return {
      ...session,
      currentRun: endedRun,
      currentEvent: endingSummary,
      resolution: authoritativeResolution,
      endingSummary,
      ended: true,
      turnCounter: session.turnCounter + 1,
      quit: false,
    };
  }

  const nextEvent = enforceBranchAdvance(buildContractedMockLifeEvent({
    run: afterResolution,
    worlds: session.worlds,
    seed: session.seed + session.turnCounter + 1,
  }), afterResolution.player.age);
  const nextRun = applyAiResponseToRun(afterResolution, nextEvent);
  if (shouldTriggerMvpEnding(nextRun, { endingAge: session.endingAge })) {
    const endingSummary = generateMvpEndingSummary({
      run: nextRun,
      worlds: session.worlds,
      seed: session.seed + session.turnCounter * 1000 + 1,
      endingAge: session.endingAge,
    });
    const endedRun = applyAiResponseToRun(nextRun, endingSummary);
    return {
      ...session,
      currentRun: endedRun,
      currentEvent: endingSummary,
      resolution: authoritativeResolution,
      endingSummary,
      ended: true,
      turnCounter: session.turnCounter + 1,
      quit: false,
    };
  }

  return {
    ...session,
    currentRun: nextRun,
    currentEvent: nextEvent,
    resolution: authoritativeResolution,
    turnCounter: session.turnCounter + 1,
    quit: false,
  };
}

async function resolvePlayerActionAsync({ session, normalized }) {
  const { action, simulationOutcome } = buildStateFirstActionContext({ session, normalized });
  const resolution = attachSimulationOutcome(await safeGenerateActionResolution({
    aiProvider: session.aiProvider,
    run: session.currentRun,
    sourceEvent: session.currentEvent,
    action,
    worlds: session.worlds,
    seed: session.seed + session.turnCounter * 100,
  }), simulationOutcome, session.currentRun);

  const afterResolution = applyAiResponseToRun(session.currentRun, resolution);
  if (shouldTriggerMvpEnding(afterResolution, { endingAge: session.endingAge })) {
    return finishWithEnding({ session, run: afterResolution, resolution, seedOffset: session.turnCounter * 1000 });
  }

  const nextEvent = enforceBranchAdvance(await buildContractedProviderLifeEvent({
    aiProvider: session.aiProvider,
    run: afterResolution,
    worlds: session.worlds,
    seed: session.seed + session.turnCounter + 1,
    minNextAge: afterResolution.player.age + 1,
  }), afterResolution.player.age);
  const nextRun = applyAiResponseToRun(afterResolution, nextEvent);
  if (shouldTriggerMvpEnding(nextRun, { endingAge: session.endingAge })) {
    return finishWithEnding({ session, run: nextRun, resolution, seedOffset: session.turnCounter * 1000 + 1 });
  }

  return {
    ...session,
    currentRun: nextRun,
    currentEvent: nextEvent,
    resolution,
    turnCounter: session.turnCounter + 1,
    quit: false,
  };
}

async function finishWithEnding({ session, run, resolution, seedOffset }) {
  const endingSummary = await safeGenerateEndingSummary({
    aiProvider: session.aiProvider,
    run,
    worlds: session.worlds,
    seed: session.seed + seedOffset,
    endingAge: session.endingAge,
    endingReason: "mvp_short_run",
  });
  const endedRun = applyAiResponseToRun(run, endingSummary);
  return {
    ...session,
    currentRun: endedRun,
    currentEvent: endingSummary,
    resolution,
    endingSummary,
    ended: true,
    turnCounter: session.turnCounter + 1,
    quit: false,
  };
}

// Real AI providers are non-deterministic (temperature) and can fail a turn on a transient
// error, a validation miss, or a backend leak that repair could not fix. Retrying the provider
// a bounded number of times keeps the player on the AI path (the product's core value) instead
// of dropping to a generic mock event. Only after the retries are exhausted do we fall back.
const PROVIDER_RETRY_LIMIT = 2;

async function withProviderRetries(fn) {
  let lastError;
  for (let attempt = 0; attempt <= PROVIDER_RETRY_LIMIT; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function safeGenerateLifeEvent({ aiProvider, run, worlds, seed, minNextAge, eventContract }) {
  try {
    return await withProviderRetries(() => aiProvider.generateLifeEvent({ run, worlds, seed, minNextAge, eventContract }));
  } catch (error) {
    recordAiFailure({ phase: "life_event", runId: run?.runId, worldId: run?.worldId, age: run?.player?.age, message: errorMessage(error) });
    return markProviderFallback(generateMockLifeEvent({ run, worlds, seed, eventContract }), "life_event", error);
  }
}

async function safeGenerateOpeningSequence({ aiProvider, run, worlds, seed }) {
  try {
    if (typeof aiProvider.generateOpeningSequence === "function") {
      return enforceOpeningActionAge(await withProviderRetries(() => aiProvider.generateOpeningSequence({ run, worlds, seed })), run);
    }
    return enforceOpeningActionAge(generateOpeningSequence({ run, worlds, seed }), run);
  } catch (error) {
    recordAiFailure({ phase: "opening_sequence", runId: run?.runId, worldId: run?.worldId, age: run?.player?.age, message: errorMessage(error) });
    return markProviderFallback(enforceOpeningActionAge(generateOpeningSequence({ run, worlds, seed }), run), "opening_sequence", error);
  }
}

// The engine owns the first-action age (5-7 by default). The opening prompt passes it to the
// provider, but the provider can disobey and return a low ageEnd, which would drop the first
// playable branch onto an infant. applyAiResponseToRun derives player.age from timeSpan.ageEnd,
// so we authoritatively clamp the opening to the engine's firstActionAge before it is applied.
function enforceOpeningActionAge(response, run) {
  if (!response || typeof response !== "object") return response;
  const engineAge = firstActionAge(run);
  const startAge = Number(run?.player?.age ?? 0);
  const next = structuredClone(response);
  next.timeSpan = {
    ...(next.timeSpan ?? {}),
    ageStart: startAge,
    ageEnd: engineAge,
    yearsElapsed: Math.max(0, engineAge - startAge),
    pace: next.timeSpan?.pace ?? "early_life_auto",
  };
  next.statePatch ??= {};
  const changes = Array.isArray(next.statePatch.worldStateChanges) ? [...next.statePatch.worldStateChanges] : [];
  const index = changes.findIndex((change) => change?.target === "opening.firstActionAge");
  const guard = { target: "opening.firstActionAge", value: engineAge, source: "engine_opening_age_guard" };
  if (index >= 0) changes[index] = { ...changes[index], value: engineAge };
  else changes.push(guard);
  next.statePatch.worldStateChanges = changes;
  return next;
}

async function safeGenerateActionResolution({ aiProvider, run, sourceEvent, action, worlds, seed }) {
  try {
    return await withProviderRetries(() => aiProvider.generateActionResolution({ run, sourceEvent, action, worlds, seed }));
  } catch (error) {
    recordAiFailure({ phase: "action_resolution", runId: run?.runId, worldId: run?.worldId, age: run?.player?.age, message: errorMessage(error) });
    const fallback = action?.kind === "choice"
      ? generateChoiceResolution({ run, sourceEvent, choiceId: action.choiceId, worlds, seed })
      : generateFreeformResolution({ run, sourceEvent, inputText: action?.text ?? "", worlds, seed });
    return markProviderFallback(fallback, "action_resolution", error);
  }
}

async function safeGenerateEndingSummary({ aiProvider, run, worlds, seed, endingAge, endingReason }) {
  try {
    return await withProviderRetries(() => aiProvider.generateEndingSummary({ run, worlds, seed, endingAge, endingReason }));
  } catch (error) {
    recordAiFailure({ phase: "ending_summary", runId: run?.runId, worldId: run?.worldId, age: run?.player?.age, message: errorMessage(error) });
    return markProviderFallback(generateMvpEndingSummary({ run, worlds, seed, endingAge, endingReason }), "ending_summary", error);
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function markProviderFallback(response, phase, error) {
  const next = structuredClone(response);
  next.internal ??= {};
  const flags = new Set(next.internal.validationFlags ?? []);
  flags.add("provider_fallback");
  flags.add(`provider_fallback_${phase}`);
  next.internal.validationFlags = [...flags];
  next.internal.hiddenStateNotes = [next.internal.hiddenStateNotes, errorMessage(error)].filter(Boolean).join("\n");
  return next;
}

function buildStateFirstActionContext({ session, normalized }) {
  const action =
    normalized.kind === "choice"
      ? { kind: "choice", choiceId: normalized.choiceId }
      : { kind: "freeform", text: normalized.text };
  const intent = buildActionIntent({
    run: session.currentRun,
    sourceEvent: session.currentEvent,
    action,
  });
  const simulationOutcome = simulateActionOutcome({
    run: session.currentRun,
    sourceEvent: session.currentEvent,
    action,
    intent,
  });
  return { action, intent, simulationOutcome };
}

function attachSimulationOutcome(response, simulationOutcome, run) {
  return applySimulationOutcomeToResponse(response, simulationOutcome, run?.player?.age ?? response?.timeSpan?.ageEnd ?? 0);
}

function buildContractedMockLifeEvent({ run, worlds, seed }) {
  const eventContract = buildNextEventContract({ run, worlds, seed });
  const event = generateMockLifeEvent({ run, worlds, seed, eventContract });
  return applyAnnualFactPackageToResponse(assertStoryContract(event, eventContract), eventContract?.annualFactPackage, run);
}

async function buildContractedProviderLifeEvent({ aiProvider, run, worlds, seed, minNextAge }) {
  const eventContract = buildNextEventContract({ run, worlds, seed });
  const event = await safeGenerateLifeEvent({ aiProvider, run, worlds, seed, minNextAge, eventContract });
  return applyAnnualFactPackageToResponse(assertStoryContract(event, eventContract), eventContract?.annualFactPackage, run);
}
