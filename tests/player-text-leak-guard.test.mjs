import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectPlayerTextLeaks } from "../src/ai-response-validator.js";

function playable(playerText, choices = []) {
  return { playerText, choices };
}

describe("player-facing backend leak guard", () => {
  it("flags raw snake_case backend ids in player text", () => {
    const leaks = detectPlayerTextLeaks(playable({
      title: "6 岁：山林边的异样",
      body: "此前留下的经历仍在影响你：noble_dynasty_child。",
    }));
    assert.ok(leaks.some((message) => message.includes("playerText.body")));
  });

  it("flags leaked English memory sentences in player text", () => {
    const leaks = detectPlayerTextLeaks(playable({
      title: "6 岁：山林边的异样",
      body: "此前留下的经历仍在影响你：Run started in cultivation with identity seed.",
    }));
    assert.ok(leaks.length > 0);
  });

  it("flags backend concept tokens such as 素材种子 in player text", () => {
    const leaks = detectPlayerTextLeaks(playable({
      title: "命运预览",
      body: "与「素材种子事件」有关的迹象出现在你眼前。",
    }));
    assert.ok(leaks.length > 0);
  });

  it("flags backend tokens that leak into choice text", () => {
    const leaks = detectPlayerTextLeaks(playable(
      { title: "6 岁：抉择", body: "你站在山林边，必须做出选择。" },
      [{ id: "choice_1", text: "依据 sourceType 选择稳妥的方向。" }],
    ));
    assert.ok(leaks.some((message) => message.includes("choices[0].text")));
  });

  it("passes clean Chinese player text without false positives", () => {
    const leaks = detectPlayerTextLeaks(playable(
      {
        title: "6 岁：山林边的异样",
        body: "这天你随家人到村边山林取柴，草丛里露出一枚暗红色的小珠，母亲让你不要乱碰，父亲却听见林外有脚步声。",
      },
      [
        { id: "choice_1", text: "叫住身边的大人，把看到的异物和林外脚步告诉他们。" },
        { id: "choice_2", text: "自己先凑近观察那枚暗红色的小珠。" },
        { id: "choice_3", text: "先留意林外是谁在靠近。" },
      ],
    ));
    assert.deepEqual(leaks, []);
  });

  it("does not false-positive on a long single-token English player name", () => {
    const leaks = detectPlayerTextLeaks(playable({
      title: "6 岁：抉择",
      body: "EndingRepairTester 站在山林边，必须做出选择。",
    }));
    assert.deepEqual(leaks, []);
  });

  it("does not false-positive on hyphenated product names", () => {
    const leaks = detectPlayerTextLeaks(playable({
      title: "测试事件",
      body: "这是一个用于测试通用 OpenAI-compatible 适配器的事件。",
    }));
    assert.deepEqual(leaks, []);
  });

  it("ignores non-object player text", () => {
    assert.deepEqual(detectPlayerTextLeaks({ playerText: undefined }), []);
    assert.deepEqual(detectPlayerTextLeaks({}), []);
  });
});
