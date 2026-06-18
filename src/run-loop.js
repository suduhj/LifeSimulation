import { validateAiResponse } from "./ai-response-validator.js";
import { generateMockLifeEvent } from "./mock-ai.js";
import { patchToDomainEvents } from "./domain/events/patch-to-events.js";
import { transitionRun } from "./runtime/transition-run.js";

export function applyAiResponseToRun(run, response) {
  const validation = validateAiResponse(response);
  if (!validation.valid) {
    throw new Error(`AI response failed validation: ${validation.errors.join("; ")}`);
  }
  if (response.runId !== run.runId) {
    throw new Error(`AI response runId ${response.runId} does not match run ${run.runId}`);
  }
  if (response.worldId !== run.worldId) {
    throw new Error(`AI response worldId ${response.worldId} does not match run ${run.worldId}`);
  }

  const events = patchToDomainEvents({ run, response, source: "ai_response" });
  return transitionRun({ run, events, response }).nextRun;
}

export function runMockTurns({ run, worlds, turns = 1, seed = 1 } = {}) {
  if (!Number.isInteger(turns) || turns < 0) {
    throw new Error("turns must be a non-negative integer");
  }

  let currentRun = structuredClone(run);
  for (let index = 0; index < turns; index += 1) {
    const response = generateMockLifeEvent({
      run: currentRun,
      worlds,
      seed: seed + index,
    });
    currentRun = applyAiResponseToRun(currentRun, response);
  }
  return currentRun;
}

export function lifeStageForAge(age) {
  if (age <= 0) return "birth";
  if (age <= 6) return "childhood";
  if (age <= 12) return "adolescence";
  if (age <= 18) return "youth";
  if (age <= 59) return "adulthood";
  if (age <= 79) return "middleAge";
  return "oldAge";
}

const FULL_MANIFESTATION_AGE = 18;

export function manifestationRatioForAge(age) {
  const a = Math.max(0, Number(age) || 0);
  if (a >= FULL_MANIFESTATION_AGE) return 1;
  return 0.1 + (a / FULL_MANIFESTATION_AGE) * 0.9;
}
