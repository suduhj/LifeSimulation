#!/usr/bin/env node

import {
  createInitialRun,
  applyAiResponseToRun,
  generateChoiceResolution,
  generateMockLifeEvent,
  loadMvpWorlds,
  runMockTurns,
  saveRunToFile,
  validateAiResponse,
} from "./index.js";

const args = parseArgs(process.argv.slice(2));
const worldId = args.world ?? "cthulhu";
const seed = Number.parseInt(args.seed ?? "20260612", 10);
const name = args.name ?? "未命名";
const gender = args.gender ?? "unspecified";
const turns = Number.parseInt(args.turns ?? "1", 10);

const worlds = loadMvpWorlds();
const run = createInitialRun({
  worlds,
  worldId,
  seed,
  playerProfile: { name, gender },
});
const response = generateMockLifeEvent({ run, worlds, seed: seed + 1 });
const validation = validateAiResponse(response);
let finalRun = validation.valid ? runMockTurns({ run, worlds, turns, seed: seed + 1 }) : run;
let choiceResolution;

if (validation.valid && args.choice) {
  const afterFirstEvent = runMockTurns({ run, worlds, turns: 1, seed: seed + 1 });
  choiceResolution = generateChoiceResolution({
    run: afterFirstEvent,
    sourceEvent: response,
    choiceId: args.choice,
    worlds,
    seed: seed + 1000,
  });
  finalRun = applyAiResponseToRun(afterFirstEvent, choiceResolution);
}

if (!validation.valid) {
  console.error("Mock AI response failed validation:");
  validation.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  if (args.save) {
    saveRunToFile(finalRun, args.save);
  }
  printDemo({ run, response, choiceResolution, finalRun, savePath: args.save });
}

function printDemo({ run, response, choiceResolution, finalRun, savePath }) {
  console.log("AI Life Simulator MVP Skeleton");
  console.log("");
  console.log(`World: ${run.worldId}`);
  console.log(`Player: ${run.player.name} (${run.player.gender})`);
  console.log(`Identity Seed: ${run.player.identitySeedId}`);
  console.log(`Talent Draw: ${run.setup.talentDraw.join(", ")}`);
  console.log(`Kept Talents: ${run.setup.keptTalentIds.join(", ")}`);
  console.log(`Turns Simulated: ${finalRun.eventHistory.length}`);
  console.log(`Current Age: ${finalRun.player.age}`);
  console.log("");
  console.log("Important NPCs:");
  for (const npc of run.importantNPCs) {
    console.log(`- ${npc.id}: ${npc.role} (${npc.knownIdentity.certainty})`);
  }
  console.log("");
  console.log(`[${response.playerText.title}]`);
  console.log(response.playerText.body);
  console.log("");
  console.log("Visible Changes:");
  for (const change of response.visibleChanges) {
    console.log(`- ${change.text}`);
  }
  console.log("");
  console.log("Choices:");
  for (const choice of response.choices) {
    console.log(`- ${choice.id}: ${choice.text} (${choice.fuzzySuccessLabel}, ${choice.riskLabel})`);
  }
  console.log("");
  console.log("Freeform: enabled");
  if (choiceResolution) {
    console.log("");
    console.log(`[${choiceResolution.playerText.title}]`);
    console.log(choiceResolution.playerText.body);
    console.log("");
    console.log("Resolution Changes:");
    for (const change of choiceResolution.visibleChanges) {
      console.log(`- ${change.text}`);
    }
  }
  if (savePath) {
    console.log("");
    console.log(`Saved Run: ${savePath}`);
  }
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = rawArgs[index + 1];
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
