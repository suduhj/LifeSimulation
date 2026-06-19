import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateSceneCompliance } from "../src/scene-compliance-validator.js";

describe("scene compliance validator", () => {
  const scene = {
    schemaVersion: "mvp.observable_scene.v1",
    age: 8,
    title: "先生的留意",
    mainScene: {
      requiredVisibleDelta: "村塾先生对你的态度和指导方式发生变化",
    },
    backgroundEchoes: [
      {
        label: "后山那件旧事",
        textSignals: ["后山", "玉片"],
        maxMentions: 1,
        titleAllowed: false,
        choiceDriverAllowed: false,
      },
    ],
    forbiddenText: ["人生课程", "年度变化", "旧线索", "背景回响", "主轴", "副轴", "mentor_attention", "jade_token"],
  };

  it("accepts text that keeps the visible delta primary and the old clue in the background", () => {
    const result = validateSceneCompliance(cleanResponse(), scene);

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("rejects backend terms in player-facing text", () => {
    const response = cleanResponse();
    response.playerText.body += " 今年的人生课程 mentor_attention 已经进入年度变化。";

    const result = validateSceneCompliance(response, scene);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /backend|后台|禁止文本|mentor_attention|人生课程/);
  });

  it("rejects background echoes when they take title or choice-driver roles", () => {
    const titleBad = cleanResponse();
    titleBad.playerText.title = "8 岁：后山旧事又起";
    assert.equal(validateSceneCompliance(titleBad, scene).valid, false);

    const choicesBad = cleanResponse();
    choicesBad.choices = choicesBad.choices.map((choice, index) => ({
      ...choice,
      text: `第 ${index + 1} 种办法：现在就去后山追查玉片。`,
    }));
    const result = validateSceneCompliance(choicesBad, scene);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /background|背景|choice|选项/);
  });

  it("rejects old assets when they exceed the sentence budget", () => {
    const budgetScene = {
      ...scene,
      backgroundEchoes: [
        {
          label: "白鹿旧闻",
          textSignals: ["白鹿"],
          maxMentions: 10,
          maxSentences: 1,
          titleAllowed: false,
          firstParagraphAllowed: false,
          choiceDriverAllowed: false,
        },
      ],
    };
    const response = cleanResponse();
    response.playerText.body = [
      "这一年，先生开始更认真地看待你的学习安排，让你放学后多留一会儿。",
      "村里关于白鹿的闲话还没有散尽。",
      "有人又把白鹿说成最近一切变化的缘由。",
      "但真正改变你生活的，仍然是先生和家人重新安排你的学习节奏。",
    ].join("");

    const result = validateSceneCompliance(response, budgetScene);

    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /sentence|句|白鹿/);
  });
});

function cleanResponse() {
  return {
    playerText: {
      title: "8 岁：先生的留意",
      body: "这一年，村塾先生注意到你写字时比同龄人更稳，开始让你多留一会儿，把几页旧书上的字句慢慢讲给你听。家里也因此改变了安排，不再只让你做杂活，而是让你按时去学堂。后山那件旧事偶尔仍会被风声勾起，但它只是压在心底的暗影，没有抢走今年真正的变化。",
    },
    choices: [
      { id: "choice_1", text: "先照先生安排认真学下去，把听到的新字句记牢。", intentTags: [], fuzzySuccessLabel: "难度较低", riskLabel: "low" },
      { id: "choice_2", text: "放学后找先生单独请教，问他为何突然愿意多教你。", intentTags: [], fuzzySuccessLabel: "风险不明", riskLabel: "medium" },
      { id: "choice_3", text: "回家和父母商量，争取把这份学习安排稳定下来。", intentTags: [], fuzzySuccessLabel: "结果难以预料", riskLabel: "medium" },
    ],
  };
}
