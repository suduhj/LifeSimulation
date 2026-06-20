import { createDomainEvent } from "./event-factory.js";
import { buildLifeNodeFromResponse } from "../../life-node.js";
import { projectPlayerSurface } from "../../player-surface-projector.js";
import { reduceRunEvent } from "../reducers/run-reducer.js";

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
  for (const outcome of patch.yearlyOutcomes ?? []) {
    events.push(createAnnualOutcomeRecordedEvent({
      run,
      turnId,
      age: outcome?.age ?? ageEnd,
      source: outcome?.source ?? source,
      outcome,
      metadata,
    }));
  }

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

  for (const ledger of patch.openingOriginLedgers ?? []) {
    events.push(createDomainEvent({
      type: "opening.origin_recorded",
      run,
      turnId,
      age: ledger?.firstActionAge ?? ageEnd,
      source: ledger?.source ?? source,
      payload: structuredClone(ledger),
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

  const lifeNode = buildLifeNodeFromResponse({
    run,
    response,
    sourceEventIds: sourceEventIdsForLifeNode(patch),
  });
  const lifeNodeRecorded = createDomainEvent({
    type: "life.node_recorded",
    run,
    turnId,
    age: lifeNode.age,
    source,
    payload: lifeNode,
    metadata,
  });
  events.push(lifeNodeRecorded);

  const runWithLifeNode = reduceRunEvent(run, lifeNodeRecorded);
  const playerSurface = projectPlayerSurface({ run: runWithLifeNode });
  if (playerSurface.accepted) {
    events.push(createDomainEvent({
      type: "player_surface.view_recorded",
      run: runWithLifeNode,
      turnId,
      age: playerSurface.view?.currentScene?.age ?? lifeNode.age,
      source: "player_surface_projector",
      payload: playerSurface.view,
      metadata,
    }));
  } else if (playerSurface.rejection) {
    events.push(createDomainEvent({
      type: "player_surface.rejected",
      run: runWithLifeNode,
      turnId,
      age: lifeNode.age,
      source: "player_surface_projector",
      payload: playerSurface.rejection,
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

function sourceEventIdsForLifeNode(patch = {}) {
  return [
    ...(patch.yearlyOutcomes ?? []).map((outcome) => `annual.outcome_recorded:${outcome?.outcomeId ?? outcome?.age ?? "annual"}`),
  ];
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
  if (storyState?.originLedger?.nodes?.length) {
    events.push(createDomainEvent({
      type: "opening.origin_recorded",
      run,
      turnId,
      age: storyState.originLedger.firstActionAge ?? age,
      source,
      payload: storyState.originLedger,
      metadata,
    }));
  }
  for (const spotlight of storyState?.assetLedger?.recentSpotlights ?? []) {
    events.push(createDomainEvent({
      type: "story.asset_spotlight_recorded",
      run,
      turnId,
      age: spotlight.age ?? age,
      source,
      payload: spotlight,
      metadata,
    }));
  }
  for (const intent of storyState?.experience?.recentIntents ?? []) {
    events.push(createDomainEvent({
      type: "story.experience_recorded",
      run,
      turnId,
      age: intent.age ?? age,
      source,
      payload: intent,
      metadata,
    }));
  }
  for (const slot of storyState?.curriculum?.recentSlots ?? []) {
    events.push(createDomainEvent({ type: "story.curriculum_recorded", run, turnId, age, source, payload: slot, metadata }));
  }
  for (const topic of storyState?.topicLedger?.recentTopics ?? []) {
    events.push(createDomainEvent({ type: "story.topic_recorded", run, turnId, age, source, payload: topic, metadata }));
  }
  for (const agenda of storyState?.annualAgendas ?? []) {
    events.push(createDomainEvent({ type: "story.annual_agenda_recorded", run, turnId, age, source, payload: agenda, metadata }));
  }
  for (const outcome of storyState?.yearlyOutcomes ?? []) {
    events.push(createAnnualOutcomeRecordedEvent({
      run,
      turnId,
      age: outcome?.age ?? age,
      source,
      outcome,
      metadata,
    }));
  }
  for (const lifeNode of storyState?.lifeNodes ?? []) {
    events.push(createDomainEvent({
      type: "life.node_recorded",
      run,
      turnId,
      age: lifeNode?.age ?? age,
      source,
      payload: lifeNode,
      metadata,
    }));
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

function createAnnualOutcomeRecordedEvent({ run, turnId, age, source, outcome, metadata }) {
  return {
    type: "annual.outcome_recorded",
    runId: run?.runId,
    worldId: run?.worldId,
    turnId,
    age,
    source,
    payload: structuredClone(outcome),
    metadata: structuredClone(metadata ?? {}),
  };
}
