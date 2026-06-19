import fs from "node:fs";
import path from "node:path";

import {
  applyAiResponseToRun,
  applyAnnualFactPackageToResponse,
  buildAnnualFactPackage,
  buildPanelViews,
  createInitialRun,
  generateMockLifeEvent,
  generateOpeningSequence,
  loadMvpWorlds,
} from "../src/index.js";

const args = parseArgs(process.argv.slice(2));
const runCount = numberArg(args.runs, 10);
const ageEnd = numberArg(args["age-end"], 12);
const aiMode = String(args.ai ?? "mock");

if (aiMode !== "mock") {
  throw new Error("experience QA currently supports --ai mock only");
}

const worlds = loadMvpWorlds();
const reports = [];

for (let index = 0; index < runCount; index += 1) {
  reports.push(runScenario({ worlds, seed: 20260619 + index * 101, ageEnd }));
}

const report = summarizeReports(reports);
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(path.join("tmp", "experience-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

function runScenario({ worlds, seed, ageEnd }) {
  let run = createInitialRun({
    worlds,
    worldId: "cultivation",
    seed,
    playerProfile: { name: `QA-${seed}`, gender: "female", personality: "curious" },
  });

  const opening = generateOpeningSequence({ run, worlds, seed });
  run = applyAiResponseToRun(run, opening);

  while (run.player.age < ageEnd) {
    const annualFacts = buildAnnualFactPackage({ run, worlds, seed: seed + run.player.age });
    const mock = generateMockLifeEvent({ run, worlds, seed: seed + run.player.age, eventContract: { annualFactPackage: annualFacts } });
    mock.timeSpan.ageStart = run.player.age;
    mock.timeSpan.ageEnd = annualFacts.age;
    mock.timeSpan.yearsElapsed = annualFacts.age - run.player.age;
    mock.playerText.title = `${annualFacts.age} 岁：${annualFacts.curriculumSlot}`;
    const response = applyAnnualFactPackageToResponse(mock, annualFacts, { run });
    run = applyAiResponseToRun(run, response);
  }

  const storyState = run.worldState.storyState;
  const panelViews = buildPanelViews(run);
  const openingBodies = storyState.originLedger.nodes.map((node) => node.body);
  const annualTopics = storyState.topicLedger.recentTopics;
  const yearlyOutcomes = storyState.yearlyOutcomes;
  const eventTypes = run.eventLog.events.map((event) => event.type);

  return {
    seed,
    run,
    openingBodies,
    slots: storyState.curriculum.recentSlots.map((slot) => slot.slot),
    annualTopics,
    yearlyOutcomes,
    eventTypes,
    panelViews,
  };
}

function summarizeReports(items) {
  const distinctSlots = items.map((item) => new Set(item.slots).size);
  const openingSignatures = new Set(items.map((item) => item.openingBodies.join("|")));
  const repeatedAssets = repeatedTopicField(items, "objectFocus", 3);
  const repeatedArenas = repeatedTopicField(items, "arena", 3);
  const repeatedTopicFamilies = repeatedTopicField(items, "topicFamily", 4);
  const yearsWithVisibleGrowth = items.reduce((sum, item) => (
    sum + item.yearlyOutcomes.filter((outcome) => (
      (outcome.growthImpact?.realizedGrowth ?? []).length > 0
      || (outcome.growthImpact?.exposureGrowth ?? []).length > 0
    )).length
  ), 0);
  const stagnantYears = items.flatMap((item) => item.yearlyOutcomes
    .filter((outcome) => (
      (outcome.growthImpact?.realizedGrowth ?? []).length === 0
      && (outcome.growthImpact?.exposureGrowth ?? []).length === 0
      && !outcome.growthImpact?.noGrowthReason
    ))
    .map((outcome) => ({ seed: item.seed, age: outcome.age, outcomeId: outcome.outcomeId })));
  const forbiddenPlayerFields = items.some((item) => (
    /当前压力|经历事件|当前评分|剧情压力/.test(JSON.stringify(item.panelViews.main))
  ));
  const attributePanelUpdated = items.some((item) => item.panelViews.attributes.attributes.some((card) => (
    Number(card.current) > 0 && (Number(card.manifested) > 0 || Number(card.exposure) > 0)
  )));

  return {
    runCount: items.length,
    curriculumCoverage: {
      averageDistinctSlots: average(distinctSlots),
      perRunDistinctSlots: distinctSlots,
    },
    repetition: {
      repeatedAssets,
      repeatedArenas,
      repeatedTopicFamilies,
    },
    growthVisibility: {
      yearsWithVisibleGrowth,
      stagnantYears,
    },
    openingVariation: {
      distinctOpeningBodies: openingSignatures.size > 1,
    },
    uiAcceptance: {
      forbiddenPlayerFields,
      attributePanelUpdated,
    },
    eventSourcing: {
      hasOpeningOriginRecorded: items.every((item) => item.eventTypes.includes("opening.origin_recorded")),
      hasAnnualOutcomeRecorded: items.every((item) => item.eventTypes.includes("annual.outcome_recorded")),
      hasGrowthEvidence: items.every((item) => item.eventTypes.includes("growth.evidence_added") || item.eventTypes.includes("growth.exposure_changed")),
    },
  };
}

function repeatedTopicField(items, field, cooldown) {
  const ignoredValues = new Set(["body", "talent", "reputation", "resources", "book_or_lesson"]);
  const repeats = [];
  for (const item of items) {
    const topics = item.annualTopics.filter((topic) => topic[field] && topic[field] !== "none" && !ignoredValues.has(topic[field]));
    for (let left = 0; left < topics.length; left += 1) {
      for (let right = left + 1; right < topics.length; right += 1) {
        if (topics[left][field] === topics[right][field] && topics[right].age - topics[left].age <= cooldown) {
          repeats.push({ seed: item.seed, field, value: topics[left][field], ages: [topics[left].age, topics[right].age] });
        }
      }
    }
  }
  return repeats;
}

function average(values) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith("--")) continue;
    result[key.slice(2)] = values[index + 1] && !values[index + 1].startsWith("--") ? values[index + 1] : true;
  }
  return result;
}

function numberArg(value, fallback) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) ? number : fallback;
}
