import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compileObservableYearDelta } from "../src/observable-year-delta.js";

describe("observable year delta", () => {
  it("converts curriculum ids and background assets into player-observable scene intent", () => {
    const delta = compileObservableYearDelta({
      annualFactPackage: mentorAttentionPackage(),
    });

    assert.equal(delta.schemaVersion, "mvp.observable_year_delta.v1");
    assert.match(delta.primaryHumanChange.text, /先生|长辈|可信的大人|留意/);
    assert.match(delta.primaryHumanChange.requiredDelta, /态度|照看|指导|看法|留意/);
    assert.equal(delta.worldFlavor.role, "secondary");
    assert.equal(delta.backgroundEchoes[0].role, "background_echo");
    assert.equal(delta.backgroundEchoes[0].maxMentions, 1);
    assert.equal(delta.backgroundEchoes[0].titleAllowed, false);
    assert.equal(delta.backgroundEchoes[0].choiceDriverAllowed, false);
  });

  it("does not expose backend contract field names or raw ids in observable text", () => {
    const delta = compileObservableYearDelta({
      annualFactPackage: mentorAttentionPackage(),
    });
    const text = JSON.stringify({
      primaryHumanChange: delta.primaryHumanChange,
      worldFlavor: delta.worldFlavor,
      backgroundEchoes: delta.backgroundEchoes,
      choiceDirections: delta.choiceDirections,
      forbiddenPlayerText: delta.forbiddenPlayerText,
    });

    assert.doesNotMatch(text, /mentor_attention|curriculumSlot|threeLayerFocus|backgroundThreads|jade_token|assetRoles/);
    assert.match(delta.forbiddenPlayerText.join("\n"), /人生课程|年度变化|旧线索|背景回响|主轴|副轴/);
  });

  it("carries hard old-asset sentence budgets into observable background echoes", () => {
    const delta = compileObservableYearDelta({
      annualFactPackage: {
        ...mentorAttentionPackage(),
        backgroundThreads: ["white_deer", "old_booklet"],
        assetRoles: {
          white_deer: {
            role: "background_only",
            maxSentences: 1,
            cannotOpenScene: true,
            cannotDriveChoices: true,
            textSignals: ["白鹿"],
          },
          old_booklet: {
            role: "background_only",
            maxSentences: 1,
            cannotOpenScene: true,
            cannotDriveChoices: true,
            textSignals: ["册子"],
          },
        },
      },
    });
    const whiteDeer = delta.backgroundEchoes.find((echo) => echo.textSignals.includes("白鹿"));
    const booklet = delta.backgroundEchoes.find((echo) => echo.textSignals.includes("册子"));

    assert.equal(whiteDeer.maxSentences, 1);
    assert.equal(whiteDeer.maxMentions, 1);
    assert.equal(whiteDeer.firstParagraphAllowed, false);
    assert.equal(whiteDeer.choiceDriverAllowed, false);
    assert.equal(booklet.maxSentences, 1);
    assert.equal(booklet.maxMentions, 1);
  });

  it("does not treat eligible annual assets as background-only echoes", () => {
    const delta = compileObservableYearDelta({
      annualFactPackage: {
        age: 9,
        curriculumSlot: "external_attention",
        requiredHumanDelta: "外来目光改变日常安排",
        primaryDelta: {
          domain: "institution",
          eventShape: "institution_arrival_changes_life",
        },
        assetRoles: {
          biyun_sect: { role: "eligible_supporting", textSignals: ["碧云宗"], maxSentences: 1 },
          jade_token: { role: "background_only", textSignals: ["玉片"], maxSentences: 1 },
        },
      },
    });

    assert.equal(delta.backgroundEchoes.some((echo) => echo.textSignals.includes("碧云宗")), false);
    assert.equal(delta.backgroundEchoes.some((echo) => echo.textSignals.includes("玉片")), true);
  });
});

function mentorAttentionPackage() {
  return {
    age: 8,
    lifeStage: "childhood",
    curriculumSlot: "mentor_attention",
    requiredHumanDelta: "一位可信大人对你的态度、照看或指导方式发生变化",
    primaryDelta: {
      domain: "relationship",
      type: "relationship_shift",
      eventShape: "trusted_relationship_changes_life",
      title: "可信之人的介入",
      description: "一个已经认识的人改变立场、提出帮助或新的界限。",
    },
    threeLayerFocus: {
      lifeBase: { domain: "mentor_attention", role: "primary" },
      worldFlavor: { element: "subtle_talent_manifestation", role: "secondary", intensity: "low" },
      consequenceEcho: { source: "jade_token", role: "background_only" },
    },
    backgroundThreads: ["jade_token"],
    assetRoles: {
      jade_token: { role: "background_only", allowedRoles: ["background_echo"], forbiddenRoles: ["primary_driver"] },
    },
  };
}
