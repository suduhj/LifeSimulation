import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnnualFactPackage,
  createInitialRun,
  generateMockLifeEvent,
  getAttributePanelView,
  loadMvpWorlds,
} from "../src/index.js";
import { detectForbiddenPlayerText } from "../src/player-text-guard.js";

describe("cross-world observable scene runtime", () => {
  it("uses the same five observable attribute names in all worlds", () => {
    const worlds = loadMvpWorlds();

    for (const worldId of ["cultivation", "cthulhu", "wasteland"]) {
      const run = createInitialRun({
        worlds,
        worldId,
        seed: 20260619,
        playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
      });
      const view = getAttributePanelView(run);
      const names = view.attributes.map((attribute) => attribute.name);

      assert.deepEqual(names, ["颜值", "智力", "体质", "家境", "运气"]);
      assert.doesNotMatch(names.join("\n"), /仙姿|悟性|根骨|出身\/底蕴|气运/);
    }
  });

  it("does not render family background or luck as age-sealed growth", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 20260620,
      playerProfile: { name: "Lin Lan", gender: "female", personality: "curious" },
      allocation: {
        appearance: 4,
        intelligence: 6,
        constitution: 6,
        familyBackground: 2,
        luck: 2,
      },
    });
    const view = getAttributePanelView(run);
    const byName = Object.fromEntries(view.attributes.map((attribute) => [attribute.name, attribute]));

    assert.equal(byName["体质"].ageSealTitle, "年龄封存");
    assert.equal(byName["智力"].ageSealTitle, "经验封存");
    assert.equal(byName["颜值"].ageSealTitle, "尚未定型");
    assert.equal(byName["家境"].ageSealTitle, "家庭底色");
    assert.equal(byName["运气"].ageSealTitle, "机缘倾向");
    assert.equal(byName["家境"].showAgeSeal, false);
    assert.equal(byName["运气"].showAgeSeal, false);
  });

  it("mock annual scenes do not leak backend curriculum or background-only asset terms", () => {
    const worlds = loadMvpWorlds();
    const run = createInitialRun({
      worlds,
      worldId: "cultivation",
      seed: 20260621,
      playerProfile: { name: "林岚", gender: "female", personality: "curious" },
    });
    run.player.age = 7;
    run.worldState.storyState.threads.push({
      threadId: "jade_token",
      stage: "dormant",
      nextPressure: "background_echo",
      updatedAge: 6,
    });
    const annualFactPackage = buildAnnualFactPackage({ run, worlds, seed: 4 });
    const response = generateMockLifeEvent({
      run,
      worlds,
      seed: 4,
      eventContract: { annualFactPackage },
    });
    const leaks = detectForbiddenPlayerText(response);

    assert.deepEqual(leaks, []);
    assert.doesNotMatch(response.playerText.title, /后山|玉片|jade|人生课程|年度变化/);
    assert.ok(response.choices.every((choice) => !/旧线索|背景回响|主轴|副轴|curriculumSlot|threeLayerFocus/.test(choice.text)));
  });
});
