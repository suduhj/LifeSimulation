#!/usr/bin/env node

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  SETUP_ATTRIBUTE_LABELS,
  SETUP_PERSONALITY_OPTIONS,
  createAiProvider,
  createInitialRun,
  createPlaySessionAsync,
  createRunFromSetup,
  createSetupPreview,
  describeAllocation,
  handlePlayerInputAsync,
  listWorldChoices,
  loadProjectEnv,
  loadMvpWorlds,
  loadRunFromFile,
  normalizeGender,
  normalizePlayerName,
  normalizePersonality,
  parseAllocationInput,
  parseTalentSelectionInput,
  resolveWorldId,
  buildProviderDiagnosticLines,
  formatRunSummary,
  saveRunToFile,
} from "./index.js";

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printHelp();
  process.exit(0);
}
const worlds = loadMvpWorlds();
const seed = Number.parseInt(args.seed ?? "20260612", 10);
const maxTurns = Number.parseInt(args.maxTurns ?? "5", 10);
const endingAge = Number.parseInt(args.endingAge ?? "12", 10);
const aiMode = args.ai ?? "mock";
const projectEnv = loadProjectEnv();
let aiProvider;
try {
  aiProvider = createAiProvider({ mode: aiMode, env: projectEnv });
} catch (error) {
  console.error(`AI provider startup failed: ${error.message}`);
  console.error(
    "Use default mock mode with `npm run play`, set provider variables in your shell, or copy `.env.example` to `.env` and fill in your API key.",
  );
  process.exit(1);
}

if (args.script) {
  const run = args.setupScript ? createRunFromSetupScript(args.setupScript) : createRunFromArgs();
  await runScriptedSession({
    session: await createPlaySessionAsync({ run, worlds, seed: seed + 1, endingAge, aiProvider }),
    inputs: splitScript(args.script),
    savePath: args.save ?? `saves/${run.worldId}-${seed}.json`,
  });
} else {
  await runInteractiveSession();
}

function createRunFromSetupScript(scriptText) {
  const setupAnswers = splitScript(scriptText);
  let index = 0;
  const next = (label) => {
    if (index >= setupAnswers.length) {
      throw new Error(`setup script ended before ${label}`);
    }
    const answer = setupAnswers[index];
    index += 1;
    return answer;
  };

  const worldId = resolveWorldId(next("world"), worlds, "cthulhu");
  const name = normalizePlayerName(next("name"));
  const gender = normalizeGender(next("gender"));
  const personality = setupAnswers.length - index >= 3 ? normalizePersonality(next("personality")) : normalizePersonality("");
  const allocation = parseAllocationInput(next("allocation"));
  const preview = createSetupPreview({
    worlds,
    worldId,
    seed,
    playerProfile: { name, gender, personality },
    allocation,
  });
  const keptTalentIds = parseTalentSelectionInput(next("talents"), preview.talentDraw);
  return createRunFromSetup({ worlds, preview, keptTalentIds });
}

async function runInteractiveSession() {
  const rl = readline.createInterface({ input, output });
  let session;
  let savePath;
  try {
    const run = args.load ? loadRunFromFile(args.load) : await createRunInteractively(rl);
    session = await createPlaySessionAsync({ run, worlds, seed: seed + 1, endingAge, aiProvider });
    savePath = args.save ?? `saves/${run.worldId}-${seed}.json`;
    printSessionIntro(session.currentRun);
    for (let turn = 0; turn < maxTurns + 1; turn += 1) {
      if (session.ended) {
        printEnding(session.endingSummary ?? session.currentEvent);
        break;
      }
      printCurrentEvent(session.currentEvent);
      const prompt = session.openingPhase === "background"
        ? "\n输入 开始/start 进入第一个人生分岔，q 保存退出："
        : "\n输入 1/2/3，输入 4 自由行动，q 保存退出：";
      const answer = await rl.question(prompt);
      if (answer.trim() === "4") {
        const freeform = await rl.question("请输入自由行动，可以留空取消：");
        session = freeform.trim()
          ? await handlePlayerInputAsync({ session, input: `4:${freeform}` })
          : { ...session, inputRequired: undefined };
      } else {
        session = await handlePlayerInputAsync({ session, input: answer });
      }
      if (session.quit) break;
      if (session.inputRequired) {
        printInputRequiredHint(session.inputRequired);
        continue;
      }
      if (!session.resolution) {
        continue;
      }
      printResolution(session.resolution);
      printRunSummary(session.currentRun);
      if (session.ended) {
        printEnding(session.endingSummary);
        break;
      }
    }
  } finally {
    rl.close();
    if (session) {
      saveAndPrint(session.currentRun, savePath);
    }
  }
}

async function runScriptedSession({ session, inputs, savePath }) {
  printSessionIntro(session.currentRun);
  if (session.ended) {
    printEnding(session.endingSummary ?? session.currentEvent);
    saveAndPrint(session.currentRun, savePath);
    return;
  }
  if (session.openingPhase === "background") {
    printCurrentEvent(session.currentEvent);
    console.log("\n> 开始人生");
    session = await handlePlayerInputAsync({ session, input: "start" });
    if (session.ended) {
      printEnding(session.endingSummary ?? session.currentEvent);
      saveAndPrint(session.currentRun, savePath);
      return;
    }
  }
  for (const answer of inputs.slice(0, maxTurns)) {
    printCurrentEvent(session.currentEvent);
    console.log(`\n> ${answer}`);
    session = await handlePlayerInputAsync({ session, input: answer });
    if (session.quit) break;
    if (session.inputRequired) {
      printInputRequiredHint(session.inputRequired);
      continue;
    }
    if (!session.resolution) {
      continue;
    }
    printResolution(session.resolution);
    printRunSummary(session.currentRun);
    if (session.ended) {
      printEnding(session.endingSummary);
      break;
    }
  }
  saveAndPrint(session.currentRun, savePath);
}

function createRunFromArgs() {
  if (args.load) {
    return loadRunFromFile(args.load);
  }

  const worldId = resolveWorldId(args.world ?? "cthulhu", worlds, "cthulhu");
  const allocation = args.allocation ? parseAllocationInput(args.allocation) : undefined;
  return createInitialRun({
    worlds,
    worldId,
    seed,
    playerProfile: {
      name: args.name ?? "未命名",
      gender: args.gender ?? "unspecified",
      personality: args.personality ?? "random",
    },
    allocation,
  });
}

async function createRunInteractively(rl) {
  if (args.world) {
    return createRunFromArgs();
  }

  const setupAnswers = splitScript(args.setupScript);
  const askSetup = createSetupAsker(rl, setupAnswers);
  printSetupHeader();
  printWorldChoices(worlds);

  const worldInput = await askSetup("选择世界编号或 ID，默认 2：");
  const worldId = resolveWorldId(worldInput || "2", worlds, "cthulhu");
  const name = normalizePlayerName(await askSetup("输入玩家角色姓名，默认 未命名："));
  const gender = normalizeGender(await askSetup("选择性别 1 女 / 2 男 / 3 非二元 / 4 不指定，默认 4："));
  printPersonalityChoices();
  const personality = normalizePersonality(await askSetup("选择性格倾向 1 谨慎 / 2 野心 / 3 好奇 / 4 重情 / 5 叛逆 / 6 现实 / 7 AI生成，默认 7："));
  const allocation = await askAllocation(askSetup);
  const preview = createSetupPreview({
    worlds,
    worldId,
    seed,
    playerProfile: { name, gender, personality },
    allocation,
  });

  printSetupPreview(preview);
  const keptTalentIds = await askTalentSelection(askSetup, preview.talentDraw);
  const run = createRunFromSetup({ worlds, preview, keptTalentIds });

  console.log("");
  console.log("开局完成，人生模拟开始。");
  console.log(`世界：${worlds[run.worldId].config.name ?? run.worldId}`);
  console.log(`玩家角色：${run.player.name} (${run.player.gender})`);
  console.log(`性格倾向：${run.player.personality.label} (${run.player.personality.id})`);
  console.log(`属性：${describeAllocation(run.setup.allocation)}`);
  console.log(`保留天赋：${run.setup.keptTalentIds.join(", ")}`);

  return run;
}

function createSetupAsker(rl, scriptedAnswers) {
  let index = 0;
  return async (question) => {
    if (index < scriptedAnswers.length) {
      const answer = scriptedAnswers[index];
      index += 1;
      console.log(`${question}${answer}`);
      return answer;
    }
    return rl.question(question);
  };
}

async function askAllocation(askSetup) {
  while (true) {
    const text = await askSetup("输入五项属性（颜值,智力,体质,家境,运气），总计 20，默认 4,4,4,4,4：");
    try {
      return parseAllocationInput(text);
    } catch (error) {
      console.log(error.message);
    }
  }
}

async function askTalentSelection(askSetup, talentDraw) {
  while (true) {
    const text = await askSetup("从 5 个天赋中选择 3 个，例如 1,3,5；留空自动选择：");
    try {
      return parseTalentSelectionInput(text, talentDraw);
    } catch (error) {
      console.log(error.message);
    }
  }
}

function printSessionIntro(runState) {
  console.log("AI Life Simulator MVP Playtest");
  console.log(`AI: ${aiMode}`);
  console.log(`World: ${runState.worldId}`);
  console.log(`Player: ${runState.player.name} (${runState.player.gender})`);
  console.log(`Identity Seed: ${runState.player.identitySeedId}`);
  console.log(`Age: ${runState.player.age}`);
  console.log("");
  console.log("Important NPCs:");
  for (const npc of runState.importantNPCs) {
    console.log(`- ${npc.id}: ${npc.role} (${npc.knownIdentity.certainty})`);
  }
  console.log("");
  printRunSummary(runState);
}

function printSetupHeader() {
  console.log("AI Life Simulator MVP");
  console.log("开局流程：选择世界 -> 姓名/性别/性格 -> 属性加点 -> 抽 5 选 3 天赋 -> 出生模拟");
  console.log("");
}

function printWorldChoices(availableWorlds) {
  console.log("可选世界：");
  for (const world of listWorldChoices(availableWorlds)) {
    const routeHint = world.routeFamilies.slice(0, 4).join(", ");
    console.log(`${world.number}. ${world.name} (${world.id}) - ${routeHint}`);
  }
  console.log("");
}

function printPersonalityChoices() {
  console.log("性格倾向：");
  for (const [index, option] of SETUP_PERSONALITY_OPTIONS.entries()) {
    console.log(`${index + 1}. ${option.label} (${option.id})`);
  }
  console.log("");
}

function printSetupPreview(preview) {
  const identity = preview.run.setup.identitySeed;
  console.log("");
  console.log("开局预览：");
  console.log(`身份种子：${identity.id} / 风险：${identity.playerVisible?.approxRisk ?? "unknown"}`);
  console.log(`性格倾向：${preview.run.player.personality.label} (${preview.run.player.personality.id})`);
  console.log(`属性：${describeAllocation(preview.run.setup.allocation)}`);
  console.log("抽到的 5 个天赋：");
  preview.talentDraw.forEach((talent, index) => {
    const effectText = formatTalentEffects(talent);
    console.log(`${index + 1}. ${talent.id} [${talent.rarity}] ${effectText}`);
  });
  console.log(`默认保留：${preview.defaultKeptTalentIds.join(", ")}`);
}

function formatTalentEffects(talent) {
  const bonuses = talent.effects?.attributePotential ?? {};
  const parts = Object.entries(bonuses).map(([key, value]) => `${SETUP_ATTRIBUTE_LABELS[key] ?? key} +${value}`);
  return parts.length > 0 ? parts.join(" / ") : "特殊机制";
}

function printCurrentEvent(eventResponse) {
  console.log("");
  console.log(`[${eventResponse.playerText.title}]`);
  printProviderDiagnostics(eventResponse);
  console.log(eventResponse.playerText.body);
  console.log("");
  console.log("可见变化：");
  for (const change of eventResponse.visibleChanges) {
    console.log(`- ${change.text}`);
  }
  if (eventResponse.interactionMode === "freeform_confirmation") {
    console.log("");
    console.log("确认：");
    console.log(eventResponse.freeform.confirmationPrompt ?? "输入 y 确认执行，输入 n 取消。");
    return;
  }
  if (eventResponse.interactionMode !== "playable_choices") {
    return;
  }
  console.log("");
  console.log("选项：");
  for (const choice of eventResponse.choices) {
    console.log(`${choice.id.replace("choice_", "")}. ${choice.text} (${choice.fuzzySuccessLabel}, ${choice.riskLabel})`);
  }
  console.log("4. 自由输入行动（可选）");
}

function printInputRequiredHint(inputRequired) {
  if (inputRequired === "freeform_confirmation") {
    console.log("请先输入 y 确认执行高风险自由行动，或输入 n 取消。");
    return;
  }
  if (inputRequired === "opening_continue") {
    console.log("身世与早年推进已生成。输入 开始 或 start 进入第一个人生分岔。");
    return;
  }
  console.log("请输入 1/2/3，或输入 4 后再填写自由行动。");
}

function printResolution(resolution) {
  console.log("");
  console.log(`[${resolution.playerText.title}]`);
  printProviderDiagnostics(resolution);
  console.log(resolution.playerText.body);
  console.log("");
  console.log("结算变化：");
  for (const change of resolution.visibleChanges) {
    console.log(`- ${change.text}`);
  }
}

function printRunSummary(runState) {
  console.log("");
  for (const line of formatRunSummary(runState)) {
    console.log(line);
  }
}

function printEnding(endingSummary) {
  if (!endingSummary) return;
  console.log("");
  console.log(`[${endingSummary.playerText.title}]`);
  printProviderDiagnostics(endingSummary);
  console.log(endingSummary.playerText.body);
  console.log("");
  console.log("结局结算：");
  for (const change of endingSummary.visibleChanges) {
    console.log(`- ${change.text}`);
  }
  for (const summary of endingSummary.playerText.relationshipSummary ?? []) {
    console.log(`- ${summary}`);
  }
  for (const summary of endingSummary.playerText.worldProgressSummary ?? []) {
    console.log(`- ${summary}`);
  }
}

function printProviderDiagnostics(response) {
  for (const line of buildProviderDiagnosticLines(response)) {
    console.log(`! ${line}`);
  }
}

function saveAndPrint(runState, savePath) {
  saveRunToFile(runState, savePath);
  console.log("");
  console.log(`Saved Run: ${savePath}`);
  console.log(`Age: ${runState.player.age}`);
  console.log(`Events: ${runState.eventHistory.length}`);
  printRunSummary(runState);
}

function splitScript(scriptText) {
  return String(scriptText ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = rawArgs[index + 1];
    const normalizedKey = toCamelCase(key);
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      parsed[normalizedKey] = value;
      index += 1;
    } else {
      parsed[key] = true;
      parsed[normalizedKey] = true;
    }
  }
  return parsed;
}

function toCamelCase(key) {
  return key.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function printHelp() {
  console.log(`AI Life Simulator MVP Playtest

Usage:
  npm run play
  npm run play -- --ai mock
  npm run play -- --ai deepseek
  npm run play -- --ai openai-compatible
  npm run play -- --load saves/my-run.json

Setup:
  Without --world or --load, the CLI opens the character setup wizard.
  Player setup includes world, name, gender, personality, 20 attribute points,
  and draw 5 talents / keep 3.

Worlds:
  1 or cultivation
  2 or cthulhu
  3 or wasteland

AI modes:
  mock                Offline deterministic development mode.
  deepseek            Requires DEEPSEEK_API_KEY.
  openai-compatible   Requires OPENAI_COMPATIBLE_API_KEY,
                      OPENAI_COMPATIBLE_BASE_URL, and OPENAI_COMPATIBLE_MODEL.

Useful flags:
  --world <id|number>         Pick a world directly.
  --name <text>               Player character name.
  --gender <text|number>      female, male, nonbinary, unspecified.
  --personality <id|number>   cautious, ambitious, curious, empathetic,
                              rebellious, pragmatic, random.
  --allocation <a,b,c,d,e>    appearance,intelligence,constitution,
                              familyBackground,luck; total must be 20.
  --save <path>               Save file path.
  --load <path>               Continue an existing save.
  --ending-age <number>       Short-run ending age for testing.
  --setup-script <text>       world;name;gender;personality;allocation;talents
  --script <text>             Semicolon-separated play inputs.
  --seed <number>             Deterministic seed for tests.
  --help                      Show this help.

During play:
  1/2/3 chooses an AI-generated option.
  4 opens the optional free-form action input.
  In scripted mode, use 4:<action text> for free-form.
  q saves and quits.
`);
}
