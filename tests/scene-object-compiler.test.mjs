import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compileSceneObject } from "../src/scene-object-compiler.js";

describe("scene object compiler", () => {
  it("builds a safe player-observable scene object from an annual fact package", () => {
    const scene = compileSceneObject({
      annualFactPackage: {
        age: 8,
        curriculumSlot: "mentor_attention",
        requiredHumanDelta: "一位可信大人对你的态度、照看或指导方式发生变化",
        primaryDelta: {
          domain: "relationship",
          title: "可信之人的介入",
          description: "一个已经认识的人改变立场、提出帮助或新的界限。",
        },
        backgroundThreads: ["jade_token"],
        assetRoles: {
          jade_token: { role: "background_only" },
        },
        threeLayerFocus: {
          lifeBase: { domain: "mentor_attention", role: "primary" },
          consequenceEcho: { source: "jade_token", role: "background_only" },
        },
      },
    });

    assert.equal(scene.schemaVersion, "mvp.observable_scene.v1");
    assert.equal(scene.age, 8);
    assert.match(scene.title, /留意|介入|看法|照看/);
    assert.doesNotMatch(scene.title, /玉|后山|jade|mentor_attention/);
    assert.match(scene.mainScene.openingBeat, /先生|长辈|可信的大人|留意/);
    assert.equal(scene.choices.length, 3);
    assert.ok(scene.choices.every((choice) => choice.textSeed && !/mentor_attention|jade_token/.test(choice.textSeed)));
    assert.equal(scene.backgroundEchoes[0].maxMentions, 1);
    assert.equal(scene.backgroundEchoes[0].titleAllowed, false);
    assert.match(scene.forbiddenText.join("\n"), /人生课程|年度变化|旧线索|背景回响|主轴|副轴|mentor_attention|jade_token/);
  });
});
