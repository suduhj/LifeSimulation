import { createDomainEvent } from "./event-factory.js";

export function patchToDomainEvents({ run, response, source = "ai_response" } = {}) {
  const events = [];
  if (!run || !response) return events;
  const turnId = response.turnId ?? "";
  const ageEnd = response.timeSpan?.ageEnd ?? run.player?.age ?? 0;
  const metadata = {
    responseType: response.responseType,
    interactionMode: response.interactionMode,
  };

  if ((response.timeSpan?.ageEnd ?? run.player?.age) !== run.player?.age) {
    events.push(createDomainEvent({
      type: "age.advanced",
      run,
      turnId,
      age: ageEnd,
      source,
      payload: {
        ageStart: run.player?.age ?? 0,
        ageEnd,
        yearsElapsed: response.timeSpan?.yearsElapsed ?? 0,
        lifeStage: lifeStageForAge(ageEnd),
      },
      metadata,
    }));
  }

  const patch = response.statePatch ?? {};
  for (const change of patch.progressionChanges ?? []) {
    events.push(createDomainEvent({
      type: "world.progress_changed",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: {
        target: change.target,
        amount: change.amount ?? 0,
        value: change.value,
      },
      metadata,
    }));
  }

  for (const change of patch.attributeChanges ?? []) {
    events.push(createDomainEvent({
      type: "growth.attribute_layer_changed",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: structuredClone(change),
      metadata,
    }));
  }

  for (const change of patch.manifestationChanges ?? []) {
    events.push(createDomainEvent({
      type: "growth.evidence_added",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: {
        attribute: change.target,
        amount: change.amount ?? 0,
        value: change.value,
        reason: change.reason ?? "manifestation_change_compatibility",
      },
      metadata,
    }));
  }

  for (const change of patch.exposureChanges ?? []) {
    events.push(createDomainEvent({
      type: "growth.exposure_changed",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: structuredClone(change),
      metadata,
    }));
  }

  for (const change of patch.growthEvidenceChanges ?? []) {
    events.push(createDomainEvent({
      type: "growth.evidence_added",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: structuredClone(change),
      metadata,
    }));
  }

  for (const change of patch.relationshipChanges ?? []) {
    events.push(createDomainEvent({
      type: "npc.relationship_changed",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: structuredClone(change),
      metadata,
    }));
  }

  for (const update of patch.importantNPCUpdates ?? []) {
    events.push(createDomainEvent({
      type: "npc.visibility_changed",
      run,
      turnId,
      age: ageEnd,
      source: update.source ?? source,
      payload: structuredClone(update),
      metadata,
    }));
  }

  for (const change of patch.factionChanges ?? []) {
    events.push(createDomainEvent({
      type: "faction.changed",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: structuredClone(change),
      metadata,
    }));
  }

  for (const change of patch.statusChanges ?? []) {
    events.push(createDomainEvent({
      type: "status.changed",
      run,
      turnId,
      age: ageEnd,
      source: change.source ?? source,
      payload: structuredClone(change),
      metadata,
    }));
  }

  for (const change of patch.worldStateChanges ?? []) {
    events.push(...worldStateChangeToEvents({ run, change, turnId, age: ageEnd, source, metadata }));
  }

  for (const update of patch.memoryUpdates ?? []) {
    events.push(createDomainEvent({
      type: "memory.added",
      run,
      turnId,
      age: ageEnd,
      source,
      payload: structuredClone(update),
      metadata,
    }));
  }

  if (typeof patch.scoreDelta === "number" && patch.scoreDelta !== 0) {
    events.push(createDomainEvent({
      type: "score.changed",
      run,
      turnId,
      age: ageEnd,
      source,
      payload: { amount: patch.scoreDelta },
      metadata,
    }));
  }

  events.push(createDomainEvent({
    type: "run.event_recorded",
    run,
    turnId,
    age: ageEnd,
    source,
    payload: {
      response: {
        turnId: response.turnId,
        responseType: response.responseType,
        interactionMode: response.interactionMode,
        timeSpan: response.timeSpan,
        event: response.event,
        selectedSeeds: response.selectedSeeds,
        choices: response.choices,
        visibleChanges: response.visibleChanges,
        playerText: response.playerText,
      },
    },
    metadata,
  }));

  return events;
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

function worldStateChangeToEvents({ run, change, turnId, age, source, metadata }) {
  if (!change?.target) return [];
  if (change.target === "storyState") {
    return storyStatePatchToEvents({ run, storyState: change.value, turnId, age, source: change.source ?? source, metadata });
  }
  if (change.target === "ending") {
    return [createDomainEvent({
      type: "ending.reached",
      run,
      turnId,
      age,
      source: change.source ?? source,
      payload: { value: change.value },
      metadata,
    })];
  }
  if (change.target === "flag" || change.target === "flags") {
    const flags = Array.isArray(change.value) ? change.value : [change.value ?? change.amount];
    return flags.filter(Boolean).map((flag) => createDomainEvent({
      type: "world.flag_added",
      run,
      turnId,
      age,
      source: change.source ?? source,
      payload: { flag },
      metadata,
    }));
  }
  return [createDomainEvent({
    type: "world.state_changed",
    run,
    turnId,
    age,
    source: change.source ?? source,
    payload: structuredClone(change),
    metadata,
  })];
}

function storyStatePatchToEvents({ run, storyState, turnId, age, source, metadata }) {
  const events = [];
  for (const fact of storyState?.facts ?? []) {
    events.push(createDomainEvent({ type: "story.fact_added", run, turnId, age, source, payload: { fact }, metadata }));
  }
  for (const fact of storyState?.closedFacts ?? []) {
    events.push(createDomainEvent({ type: "story.fact_closed", run, turnId, age, source, payload: { fact }, metadata }));
  }
  for (const forbiddenRepeat of storyState?.forbiddenRepeats ?? []) {
    events.push(createDomainEvent({ type: "story.event_shape_recorded", run, turnId, age, source, payload: { forbiddenRepeat }, metadata }));
  }
  for (const thread of storyState?.threads ?? []) {
    events.push(createDomainEvent({ type: "story.thread_updated", run, turnId, age, source, payload: thread, metadata }));
  }
  for (const shape of storyState?.recentEventShapes ?? []) {
    events.push(createDomainEvent({ type: "story.event_shape_recorded", run, turnId, age, source, payload: { shape }, metadata }));
  }
  for (const [axisId, axis] of Object.entries(storyState?.axes ?? {})) {
    for (const delta of axis?.recentDeltas ?? []) {
      events.push(createDomainEvent({
        type: "story.axis_updated",
        run,
        turnId,
        age,
        source,
        payload: {
          axisId,
          ...delta,
          cooldown: axis.cooldown,
          markFeatured: axis.lastFeaturedAge !== null && axis.lastFeaturedAge !== undefined,
        },
        metadata,
      }));
    }
  }
  return events;
}
