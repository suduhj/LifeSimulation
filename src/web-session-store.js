import crypto from "node:crypto";
import path from "node:path";

import {
  applyAiResponseToRun,
  createAiProvider,
  createPlaySessionAsync,
  createRunFromSetup,
  createSetupPreview,
  formatRunSummary,
  handlePlayerInputAsync,
  listWorldChoices,
  loadProjectEnv,
  loadRunFromFile,
  loadMvpWorlds,
  normalizeGender,
  normalizePlayerName,
  normalizePersonality,
  parseAllocationInput,
  parseTalentSelectionInput,
  saveRunToFile,
  buildGmView,
  buildPlayerView,
} from "./index.js";
import {
  applyDevPresetToRun,
  applyDevTalentToRun,
  buildDevReport,
  buildDevScenarioResponse,
  getDevToolsCatalog,
} from "./dev-tools.js";
import { isNpcHiddenFromOpening, sanitizePlayerText, visibleNpcLabel } from "./localization.js";
import { buildFatePreviewDossier } from "./opening-sequence.js";

const DEFAULT_ESTIMATED_LIFESPAN = 80;

export function createWebSessionStore({
  worlds = loadMvpWorlds(),
  env = loadProjectEnv(),
  seedFactory = () => Date.now(),
  sessionIdFactory = () => crypto.randomUUID(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const sessions = new Map();

  return {
    getWorlds() {
      return listWorldChoices(worlds);
    },

    createSetupPreview(input = {}) {
      const seed = normalizeSeed(input.seed, seedFactory());
      const worldId = input.worldId && worlds[input.worldId] ? input.worldId : "cthulhu";
      const allocation = normalizeAllocation(input.allocation);
      const preview = createSetupPreview({
        worlds,
        worldId,
        seed,
        playerProfile: {
          name: normalizePlayerName(input.name, "未命名"),
          gender: normalizeGender(input.gender),
          personality: normalizePersonality(input.personality),
        },
        allocation,
      });
      return serializeSetupPreview(preview, { seed });
    },

    async startRun(input = {}) {
      const seed = normalizeSeed(input.seed, seedFactory());
      const aiMode = normalizeAiMode(input.aiMode);
      const preview = createSetupPreview({
        worlds,
        worldId: input.worldId && worlds[input.worldId] ? input.worldId : "cthulhu",
        seed,
        playerProfile: {
          name: normalizePlayerName(input.name, "未命名"),
          gender: normalizeGender(input.gender),
          personality: normalizePersonality(input.personality),
        },
        allocation: normalizeAllocation(input.allocation),
      });
      const keptTalentIds = parseTalentSelectionInput(formatTalentSelection(input.keptTalentIds), preview.talentDraw);
      const run = createRunFromSetup({ worlds, preview, keptTalentIds });
      const endingAge = normalizeEndingAge(input.endingAge, run);
      attachHiddenLifespan(run, endingAge);
      const aiProvider = createAiProvider({ mode: aiMode, env, fetchImpl });
      const session = await createPlaySessionAsync({
        run,
        worlds,
        seed: seed + 1,
        endingAge,
        aiProvider,
      });
      const sessionId = sessionIdFactory();
      sessions.set(sessionId, { session, aiMode, seed });
      return serializeSession(sessionId, sessions.get(sessionId), worlds);
    },

    async startDevRun(input = {}) {
      const seed = normalizeSeed(input.seed, seedFactory());
      const aiMode = normalizeAiMode(input.aiMode);
      const preview = createSetupPreview({
        worlds,
        worldId: input.worldId && worlds[input.worldId] ? input.worldId : "cthulhu",
        seed,
        playerProfile: {
          name: normalizePlayerName(input.name, "Unnamed"),
          gender: normalizeGender(input.gender),
          personality: normalizePersonality(input.personality),
        },
        allocation: normalizeAllocation(input.allocation),
      });
      const keptTalentIds = parseTalentSelectionInput(formatTalentSelection(input.keptTalentIds), preview.talentDraw);
      let run = createRunFromSetup({ worlds, preview, keptTalentIds });
      if (input.devPresetId) {
        run = applyDevPresetToRun(run, input.devPresetId);
      }
      const endingAge = normalizeEndingAge(input.endingAge, run);
      attachHiddenLifespan(run, endingAge);
      const aiProvider = createAiProvider({ mode: aiMode, env, fetchImpl });
      const session = await createPlaySessionAsync({
        run,
        worlds,
        seed: seed + 1,
        endingAge,
        aiProvider,
      });
      const sessionId = sessionIdFactory();
      sessions.set(sessionId, { session, aiMode, seed, devMode: true });
      return serializeSession(sessionId, sessions.get(sessionId), worlds);
    },

    async submitAction(sessionId, input = {}) {
      const entry = getSessionEntry(sessions, sessionId);
      const actionInput = normalizeActionInput(input);
      const session = await handlePlayerInputAsync({ session: entry.session, input: actionInput });
      const nextEntry = { ...entry, session };
      sessions.set(sessionId, nextEntry);
      return serializeSession(sessionId, nextEntry, worlds);
    },

    getDevToolsCatalog() {
      return getDevToolsCatalog();
    },

    applyDevPreset(sessionId, input = {}) {
      const entry = getSessionEntry(sessions, sessionId);
      const run = applyDevPresetToRun(entry.session.currentRun, input.presetId);
      const session = {
        ...entry.session,
        currentRun: run,
      };
      const nextEntry = { ...entry, session };
      sessions.set(sessionId, nextEntry);
      return serializeSession(sessionId, nextEntry, worlds);
    },

    applyDevTalent(sessionId, input = {}) {
      const entry = getSessionEntry(sessions, sessionId);
      const run = applyDevTalentToRun(entry.session.currentRun, input.talentId);
      const session = {
        ...entry.session,
        currentRun: run,
      };
      const nextEntry = { ...entry, session };
      sessions.set(sessionId, nextEntry);
      return serializeSession(sessionId, nextEntry, worlds);
    },

    triggerDevScenario(sessionId, input = {}) {
      const entry = getSessionEntry(sessions, sessionId);
      const { response, validation } = buildDevScenarioResponse({
        run: entry.session.currentRun,
        scenarioId: input.scenarioId,
      });
      const run = applyAiResponseToRun(entry.session.currentRun, response);
      const session = {
        ...entry.session,
        currentRun: run,
        currentEvent: response,
        resolution: undefined,
        openingPhase: undefined,
        inputRequired: undefined,
        pendingFreeformConfirmation: undefined,
        ended: false,
      };
      const nextEntry = { ...entry, session, lastDevValidation: validation };
      sessions.set(sessionId, nextEntry);
      return {
        ...serializeSession(sessionId, nextEntry, worlds),
        devValidation: validation,
      };
    },

    getDevReport(sessionId) {
      const entry = getSessionEntry(sessions, sessionId);
      return buildDevReport({ sessionId, entry });
    },

    saveSession(sessionId, input = {}) {
      const entry = getSessionEntry(sessions, sessionId);
      const safeRunId = entry.session.currentRun.runId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = input.path ?? path.join("saves", `${safeRunId}.json`);
      const absolutePath = saveRunToFile(entry.session.currentRun, filePath);
      return {
        sessionId,
        path: absolutePath,
        run: serializeRun(entry.session.currentRun, worlds),
      };
    },

    async loadSession(input = {}) {
      if (!input.path) {
        throw new Error("path is required");
      }
      const seed = normalizeSeed(input.seed, seedFactory());
      const aiMode = normalizeAiMode(input.aiMode);
      const run = loadRunFromFile(input.path);
      const endingAge = normalizeEndingAge(input.endingAge, run);
      attachHiddenLifespan(run, endingAge);
      const aiProvider = createAiProvider({ mode: aiMode, env, fetchImpl });
      const session = await createPlaySessionAsync({
        run,
        worlds,
        seed: seed + 1,
        endingAge,
        aiProvider,
      });
      const sessionId = sessionIdFactory();
      sessions.set(sessionId, { session, aiMode, seed });
      return serializeSession(sessionId, sessions.get(sessionId), worlds);
    },
  };
}

function getSessionEntry(sessions, sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) {
    throw new Error("session not found");
  }
  return entry;
}

function normalizeSeed(value, fallback) {
  const seed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(seed) ? seed : fallback;
}

function normalizeEndingAge(value, run) {
  const endingAge = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(endingAge) && endingAge > 0 ? endingAge : estimateLifespan(run);
}

function estimateLifespan(run) {
  if (!run?.player?.attributes) return DEFAULT_ESTIMATED_LIFESPAN;

  const baseByWorld = {
    cultivation: 80,
    cthulhu: 78,
    wasteland: 56,
  };
  const constitution = run.player.attributes.constitution?.manifested ?? run.player.attributes.constitution?.potential ?? 4;
  const luck = run.player.attributes.luck?.manifested ?? run.player.attributes.luck?.potential ?? 4;
  const base = baseByWorld[run.worldId] ?? DEFAULT_ESTIMATED_LIFESPAN;
  const attributeBonus = Math.round((constitution - 4) * 1.8 + (luck - 4) * 0.6);
  const talentBonus = (run.player.talents ?? []).reduce((sum, talent) => {
    const tags = new Set(talent.tags ?? []);
    if (tags.has("survival") || tags.has("health") || tags.has("resilience")) return sum + 5;
    if (tags.has("pollution") || tags.has("mutation") || tags.has("danger")) return sum - 3;
    return sum;
  }, 0);
  return Math.max(18, Math.round(base + attributeBonus + talentBonus));
}

function attachHiddenLifespan(run, endingAge) {
  run.worldState ??= {};
  run.worldState.hidden ??= {};
  run.worldState.hidden.estimated_lifespan = endingAge;
  run.worldState.hidden.supported_ending_types = [
    "natural_death",
    "accidental_or_failure_death",
    "goal_completion",
    "world_ending",
    "special_state_ending",
  ];
}

function normalizeAiMode(value) {
  const text = String(value ?? "mock").trim().toLowerCase();
  return text || "mock";
}

function normalizeAllocation(allocation) {
  if (typeof allocation === "string") {
    return parseAllocationInput(allocation);
  }
  if (allocation && typeof allocation === "object") {
    return parseAllocationInput([
      allocation.appearance,
      allocation.intelligence,
      allocation.constitution,
      allocation.familyBackground,
      allocation.luck,
    ].join(","));
  }
  return parseAllocationInput("");
}

function formatTalentSelection(keptTalentIds) {
  if (Array.isArray(keptTalentIds)) return keptTalentIds.join(",");
  return String(keptTalentIds ?? "");
}

function normalizeActionInput(input) {
  if (input.kind === "advance_opening") return "start";
  if (input.kind === "choice") {
    const choiceId = String(input.choiceId ?? "");
    if (/^choice_[123]$/.test(choiceId)) return choiceId;
    if (/^[123]$/.test(choiceId)) return choiceId;
  }
  if (input.kind === "freeform") {
    return `4:${String(input.text ?? "").trim()}`;
  }
  if (input.kind === "confirm") return "y";
  if (input.kind === "cancel") return "n";
  return String(input.input ?? "");
}

function serializeSetupPreview(preview, { seed }) {
  return {
    seed,
    worldId: preview.run.worldId,
    identitySeed: {
      id: preview.run.setup.identitySeed.id,
      playerVisible: preview.run.setup.identitySeed.playerVisible,
    },
    allocation: preview.run.setup.allocation,
    talentDraw: preview.talentDraw.map(serializeTalent),
    defaultKeptTalentIds: preview.defaultKeptTalentIds,
  };
}

function serializeSession(sessionId, entry, worlds) {
  const { session, aiMode, seed } = entry;
  // The opening fate preview is identified authoritatively by the session phase, not by
  // heuristics on the AI response. AI output can disobey (wrong interactionMode/title) or be
  // rewritten by the repair step, so we must not let that decide whether to sanitize.
  const openingFatePreview = session.openingPhase === "background";
  return {
    sessionId,
    aiMode,
    seed,
    ended: Boolean(session.ended),
    openingPhase: session.openingPhase,
    inputRequired: session.inputRequired,
    pendingFreeformConfirmation: Boolean(session.pendingFreeformConfirmation),
    run: serializeRun(session.currentRun, worlds),
    playerView: buildPlayerView(session.currentRun),
    gmView: entry.devMode ? buildGmView(session.currentRun) : undefined,
    currentEvent: serializeAiResponse(session.currentEvent, session.currentRun, worlds, { forceFatePreview: openingFatePreview }),
    resolution: session.resolution ? serializeAiResponse(session.resolution, session.currentRun, worlds) : undefined,
    endingSummary: session.endingSummary ? serializeAiResponse(session.endingSummary, session.currentRun, worlds) : undefined,
  };
}

function serializeRun(run, worlds) {
  const playerView = buildPlayerView(run);
  return {
    runId: run.runId,
    worldId: run.worldId,
    player: {
      ...run.player,
      talents: (run.player.talents ?? []).map((talent) => serializeRunTalent(talent, run, worlds)),
    },
    setup: {
      allocation: run.setup.allocation,
      keptTalentIds: run.setup.keptTalentIds,
      talentDraw: run.setup.talentDraw,
      talentDrawRarities: run.setup.talentDrawRarities,
      identitySeed: {
        id: run.setup.identitySeed?.id,
        playerVisible: run.setup.identitySeed?.playerVisible,
      },
    },
    worldState: run.worldState,
    statuses: run.statuses,
    importantNPCs: (run.importantNPCs ?? []).map(serializeVisibleNpc).filter(Boolean),
    factions: run.factions,
    memory: run.memory.slice(-8),
    eventHistoryCount: run.eventHistory.length,
    score: run.score ?? 0,
    ending: run.ending,
    playerView,
    summaryLines: formatRunSummary(run),
  };
}

function serializeAiResponse(response, run, worlds, { forceFatePreview = false } = {}) {
  if (!response) return undefined;
  const npcs = run?.importantNPCs ?? [];
  const title = sanitizePlayerText(response.playerText?.title, npcs);
  const rawBody = sanitizePlayerText(response.playerText?.body, npcs);
  const treatAsFatePreview = forceFatePreview || isOpeningPreviewResponse(response);
  const body = treatAsFatePreview
    ? buildOpeningDossierBody({ run, worlds, rawBody })
    : rawBody;
  return {
    schemaVersion: response.schemaVersion,
    responseType: response.responseType,
    worldId: response.worldId,
    runId: response.runId,
    turnId: response.turnId,
    timeSpan: response.timeSpan,
    selectedSeeds: response.selectedSeeds,
    interactionMode: response.interactionMode,
    playerText: response.playerText ? {
      ...response.playerText,
      title,
      body,
      visibleChanges: response.playerText.visibleChanges,
      relationshipSummary: Array.isArray(response.playerText.relationshipSummary)
        ? response.playerText.relationshipSummary.map((item) => sanitizePlayerText(item, npcs))
        : response.playerText.relationshipSummary,
      worldProgressSummary: response.playerText.worldProgressSummary,
    } : response.playerText,
    event: response.event,
    choices: Array.isArray(response.choices)
      ? response.choices.map((choice) => ({
        ...choice,
        text: sanitizePlayerText(choice.text, npcs),
      }))
      : response.choices,
    freeform: response.freeform,
    visibleChanges: Array.isArray(response.visibleChanges)
      ? response.visibleChanges.map((change) => ({
        ...change,
        text: sanitizePlayerText(change.text, npcs),
      }))
      : response.visibleChanges,
    engineCheck: response.engineCheck,
    statePatch: response.statePatch,
    internal: {
      validationFlags: response.internal?.validationFlags ?? [],
      hiddenStateNotes: response.internal?.hiddenStateNotes,
      judgmentSummary: response.internal?.judgmentSummary,
    },
  };
}

// Ordinary fate preview body must be a backend-built static dossier from structured run
// data, not filtered AI provider prose. Building it deterministically guarantees no birth
// events, birth time, family/NPC detail, talent-manifestation blocks, or hidden clues leak.
// The AI-prose sanitizer is only a fallback when the world is somehow unavailable.
function buildOpeningDossierBody({ run, worlds, rawBody }) {
  const world = worlds?.[run?.worldId];
  if (world) {
    const dossier = buildFatePreviewDossier({ run, world });
    if (dossier) return dossier;
  }
  return sanitizeFatePreviewBodyForPlayer(rawBody);
}

export function sanitizeFatePreviewBodyForPlayer(text) {
  const dossier = buildSafeFateDossier(text);
  if (dossier) return dossier;

  const output = [];
  let skippingHiddenSection = false;
  let pendingBlank = false;

  for (const line of String(text ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    const sectionName = openingSectionName(trimmed) ?? bareOpeningSectionName(trimmed);

    if (sectionName) {
      const normalizedSection = normalizeOpeningSectionName(sectionName);
      if (isHiddenOpeningSection(normalizedSection)) {
        skippingHiddenSection = true;
        pendingBlank = false;
        continue;
      }
      skippingHiddenSection = false;
      if (isRelationshipOpeningSection(normalizedSection)) {
        skippingHiddenSection = true;
        pendingBlank = false;
        continue;
      }
      if (normalizedSection === "身世卡") {
        pushSanitizedLine(output, "【身世卡】");
        pendingBlank = false;
        continue;
      }
      if (isAllowedOpeningSection(normalizedSection)) {
        pushSanitizedLine(output, trimmed);
      }
      pendingBlank = false;
      continue;
    }

    if (skippingHiddenSection) continue;
    const inline = sanitizeOpeningInlineLine(line);
    if (inline === null) continue;
    if (!inline.trim()) {
      pendingBlank = output.length > 0;
      continue;
    }
    if (pendingBlank && output.length > 0) {
      output.push("");
    }
    pushSanitizedLine(output, inline);
    pendingBlank = false;
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildSafeFateDossier(text) {
  const fields = parseOpeningDossierFields(text);
  const lines = [];
  const orderedFields = [
    ["出生地点", "出生地点"],
    ["出生家庭", "出生家庭"],
    ["父母/监护人", "父母/监护人"],
    ["家境表现", "家境表现"],
    ["命运预览", "命运预览"],
    ["周围目光", "周围目光"],
    ["世界底色", "世界底色"],
    ["世界背景", "世界底色"],
    ["当前处境", "当前处境"],
    ["初始处境", "当前处境"],
  ];

  for (const [sourceKey, outputKey] of orderedFields) {
    if (lines.some((line) => line.startsWith(`${outputKey}：`))) continue;
    const value = sanitizeFateDossierValue(fields.get(sourceKey));
    if (value) lines.push(`${outputKey}：${value}`);
  }

  return lines.length ? lines.join("\n") : "";
}

function parseOpeningDossierFields(text) {
  const fields = new Map();
  let currentKey = "";
  let skipping = false;

  for (const line of String(text ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bracketSection = openingSectionName(trimmed) ?? bareOpeningSectionName(trimmed);
    if (bracketSection) {
      const normalized = normalizeOpeningSectionName(bracketSection);
      skipping = isHiddenOpeningSection(normalized) || isRelationshipOpeningSection(normalized);
      currentKey = skipping || !isAllowedDossierField(bracketSection) ? "" : bracketSection;
      if (currentKey && !fields.has(currentKey)) fields.set(currentKey, []);
      continue;
    }
    if (skipping) continue;

    const fieldMatch = /^([^：:]{2,12})[：:]\s*(.+)$/.exec(trimmed);
    if (fieldMatch) {
      const key = fieldMatch[1].trim();
      if (isAllowedDossierField(key)) {
        currentKey = key;
        fields.set(currentKey, [fieldMatch[2].trim()]);
      } else {
        currentKey = "";
      }
      continue;
    }

    if (currentKey) {
      const existing = fields.get(currentKey) ?? [];
      existing.push(trimmed);
      fields.set(currentKey, existing);
    }
  }

  return fields;
}

function isAllowedDossierField(key) {
  return [
    "出生地点",
    "出生家庭",
    "父母/监护人",
    "家境表现",
    "命运预览",
    "周围目光",
    "世界底色",
    "世界背景",
    "当前处境",
    "初始处境",
  ].includes(String(key ?? "").trim());
}

function sanitizeFateDossierValue(value) {
  const raw = Array.isArray(value) ? value.join(" ") : String(value ?? "");
  const compact = raw.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const safeSentences = compact
    .split(/(?<=[。！？!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !isSpoilerLikeFateSentence(sentence));
  const selected = safeSentences.length ? safeSentences : [compact].filter((sentence) => !isSpoilerLikeFateSentence(sentence));
  return selected.join("").slice(0, 140).trim();
}

function isSpoilerLikeFateSentence(sentence) {
  const text = String(sentence ?? "").trim();
  if (!text) return true;
  if (/(?:\d+|[零一二三四五六七八九十两]+)\s*岁|出生那日|出生时|幼年|早年|五岁前|三岁时|六岁那年|0\s*[-到至]\s*\d+\s*岁/.test(text)) return true;
  if (/测灵石|令牌|玉佩|玉片|符文|短刀|药酒|药方|旧物|藏有|藏着|祖传|失踪|秘密|真相|未解释|伏笔|线索|可疑|古怪|多看你一眼/.test(text)) return true;
  if (/外门弟子|内门弟子|长老|散修|黑衣人|神秘|官方|邪教|研究员|实验|夺舍|残魂/.test(text)) return true;
  if (/引动|聚成漩涡|悬浮|发光|异象|盘旋三日|灵鹤|梦中|预言|触发|将来|以后|未来/.test(text)) return true;
  return false;
}

function isOpeningPreviewResponse(response) {
  return response?.event?.sourceType === "opening_sequence"
    || response?.timeSpan?.pace === "early_life_auto"
    || response?.interactionMode === "non_interactive" && /命运|身世/.test(String(response?.playerText?.title ?? ""));
}

function openingSectionName(trimmed) {
  const match = /^【([^】]+)】$/.exec(trimmed);
  return match?.[1];
}

function bareOpeningSectionName(trimmed) {
  const normalized = normalizeOpeningSectionName(trimmed);
  const allSections = new Set([
    "身世卡",
    ...allowedOpeningSections(),
    ...hiddenOpeningSections(),
    "初始重要npc",
    "初始npc",
    "初始重要人物",
    "初始关系",
    "人际关系",
  ]);
  return allSections.has(normalized) ? trimmed : undefined;
}

function normalizeOpeningSectionName(name) {
  return String(name ?? "").replace(/\s+/g, "").toLowerCase();
}

function isRelationshipOpeningSection(name) {
  return ["初始重要npc", "初始npc", "初始重要人物", "初始关系", "人际关系"].includes(name);
}

function isHiddenOpeningSection(name) {
  return hiddenOpeningSections().includes(name);
}

function isAllowedOpeningSection(name) {
  return allowedOpeningSections().includes(name);
}

function allowedOpeningSections() {
  return [
    "世界背景",
    "世界底色",
    "命运预览",
    "当前处境",
    "出生地点",
    "出生家庭",
    "父母/监护人",
    "家境表现",
    "周围目光",
  ];
}

function hiddenOpeningSections() {
  return [
    "未解释细节",
    "未解释物品",
    "未来伏笔",
    "隐藏线索",
    "隐藏伏笔",
    "出生与早年",
    "早年自动推进",
    "天赋显化",
    "天赋初显",
    "初始npc",
    "初始重要npc",
    "初始重要人物",
    "初始关系",
    "人际关系",
    "earlylife",
    "hiddenhooks",
    "unresolvedthreads",
  ];
}

function sanitizeOpeningInlineLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (/^(未解释细节|未解释物品|未来伏笔|隐藏线索|隐藏伏笔|出生与早年|早年自动推进|天赋显化|天赋初显|hiddenHooks|unresolvedThreads)[:：]/i.test(trimmed)) {
    return null;
  }
  if (/^(?:\d+|[零一二三四五六七八九十两]+)\s*岁/.test(trimmed) || /^0\s*[-到至]\s*\d+\s*岁/.test(trimmed)) {
    return null;
  }
  if (/^(初始重要\s*NPC|初始重要人物|初始关系|人际关系)\s*[:：]/i.test(trimmed)) {
    return null;
  }
  return line;
}

function pushSanitizedLine(output, line) {
  const value = String(line ?? "").trimEnd();
  if (!value.trim() && output.at(-1) === "") return;
  output.push(value);
}

function serializeTalent(talent) {
  return {
    id: talent.id,
    rarity: talent.rarity,
    manifestationType: talent.manifestationType,
    tags: talent.tags,
    effects: talent.effects,
  };
}

function serializeVisibleNpc(npc) {
  const hiddenFromPlayer = isNpcHiddenFromOpening(npc) && npc?.playerVisible?.discovered !== true;
  if (hiddenFromPlayer) return null;
  const visibleLabel = visibleNpcLabel(npc);
  if (!visibleLabel) return null;
  const visiblePublicRole = npc.playerVisible?.publicRole && !looksLikeInternalId(npc.playerVisible.publicRole)
    ? npc.playerVisible.publicRole
    : visibleLabel;
  return {
    importance: npc.importance,
    knownIdentity: {
      role: visibleLabel,
      certainty: npc.knownIdentity?.certainty ?? "surface_only",
    },
    playerVisible: {
      label: visibleLabel,
      publicRole: visiblePublicRole,
      roleHint: npc.playerVisible?.roleHint && !looksLikeInternalId(npc.playerVisible.roleHint)
        ? npc.playerVisible.roleHint
        : visiblePublicRole,
      discovered: npc.playerVisible?.discovered === true,
    },
    relationship: npc.relationship,
  };
}

function looksLikeInternalId(value) {
  return /^[a-z][a-z0-9_-]*$/i.test(String(value ?? "").trim());
}

function serializeRunTalent(talent, run, worlds) {
  const sourceTalent = worlds?.[run.worldId]?.talentPool?.talents?.find((item) => item.id === talent.id);
  const effects = talent.effects ?? sourceTalent?.effects ?? {};
  return {
    ...talent,
    rarity: talent.rarity ?? sourceTalent?.rarity,
    manifestationType: talent.manifestationType ?? sourceTalent?.manifestationType,
    tags: talent.tags ?? sourceTalent?.tags ?? [],
    effects,
    exposure: talent.exposure ?? sourceTalent?.exposure ?? effects.exposureBonus ?? 0,
  };
}
