import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectForbiddenPlayerText,
  hasForbiddenPlayerText,
} from "../src/player-text-guard.js";

describe("player text guard", () => {
  it("detects backend planning terms and raw ids on player-facing surfaces", () => {
    const matches = detectForbiddenPlayerText({
      playerText: {
        title: "7 岁：年度变化",
        body: "今年的人生课程是 mentor_attention，旧线索只能作为背景回响。",
      },
      choices: [
        { text: "围绕主轴行动。" },
        { text: "观察副轴变化。" },
      ],
    });

    assert.ok(matches.some((match) => match.term === "年度变化"));
    assert.ok(matches.some((match) => match.term === "人生课程"));
    assert.ok(matches.some((match) => match.term === "旧线索"));
    assert.ok(matches.some((match) => match.term === "背景回响"));
    assert.ok(matches.some((match) => match.term === "主轴"));
    assert.ok(matches.some((match) => match.term === "副轴"));
    assert.ok(matches.some((match) => match.term === "mentor_attention"));
    assert.equal(hasForbiddenPlayerText({ playerText: { body: "普通的一天里，先生多看了你几眼。" }, choices: [] }), false);
  });
});
