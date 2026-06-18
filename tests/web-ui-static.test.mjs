import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

describe("web UI contract", () => {
  it("uses the project web port convention instead of the music_agent port", () => {
    const server = fs.readFileSync("src/web-server.js", "utf8");
    const readme = fs.readFileSync("README.md", "utf8");
    const mvpDoc = fs.readFileSync("docs/mvp-program-skeleton.md", "utf8");

    assert.match(server, /process\.env\.PORT \?\? "5181"/);
    assert.doesNotMatch(`${server}\n${readme}\n${mvpDoc}`, /127\.0\.0\.1:0001|localhost:0001|127\.0\.0\.1:1\/|localhost:1\/|127\.0\.0\.1:5173|localhost:5173|["']5173["']/);
  });

  it("keeps playable branches in the life timeline without duplicating action result cards", () => {
    const html = fs.readFileSync("web/index.html", "utf8");
    const app = fs.readFileSync("web/app.js", "utf8");

    assert.match(html, /id="currentNodeAge"/);
    assert.match(html, /class="current-node timeline-entry"/);
    assert.match(html, /id="resolutionPanel"/);
    assert.match(app, /function renderResolution/);
    assert.match(app, /function appendCurrentEventToTimeline/);
    assert.match(app, /appendCurrentEventToTimeline\(\)/);
    assert.match(app, /function hasTimelineEntry/);
    assert.doesNotMatch(app, /timelineEntryFromResolution\(state\.session\.resolution\)/);
    assert.match(app, /els\.resolutionPanel\.hidden = true/);
    assert.match(app, /function isRenderableTimelineEntry/);
    assert.match(app, /function hasVisibleChanges/);
  });

  it("keeps ordinary player-facing setup localized and hides developer-only fields", () => {
    const html = fs.readFileSync("web/index.html", "utf8");
    const app = fs.readFileSync("web/app.js", "utf8");

    assert.match(html, /AI 人生模拟器试玩版/);
    assert.match(html, /修仙世界|人生模拟器试玩版/);
    assert.doesNotMatch(html, /AI Life Simulator|OpenAI-compatible/);
    assert.doesNotMatch(html, /结束年龄|id="endingAge"/);
    assert.match(html, /<details class="developer-panel">/);

    assert.match(app, /const worldLabels/);
    assert.match(app, /cthulhu: "克苏鲁世界"/);
    assert.match(app, /const rarityLabels/);
    assert.match(app, /mythic: "神话"/);
    assert.match(app, /const manifestationLabels/);
    assert.match(app, /hidden_destiny: "隐藏命格"/);
    assert.match(app, /const talentNameLabels/);
    assert.match(app, /pleasant_smile: "亲和笑容"/);
    assert.match(app, /天赋潜能/);
    assert.match(app, /当前表现/);
    assert.match(app, /异常关注/);
    assert.match(app, /renderSummaryTalents/);
    assert.match(app, /renderSummaryAttributes/);
    assert.match(app, /attributeHelpText/);
    assert.match(app, /describeTalentDetail/);
    assert.match(app, /function talentDisplayName/);
    assert.match(app, /function hasSafePlayerLabel/);
    assert.match(app, /playerVisible/);
    assert.match(app, /npcTemplateLabels/);
    assert.doesNotMatch(app, /world\.name\}\s*\(\$\{escapeHtml\(world\.id\)\}/);
    assert.doesNotMatch(app, /<strong>\$\{index \+ 1\}\. \$\{escapeHtml\(talent\.id\)\}/);
    assert.doesNotMatch(app, /run\.summaryLines/);
  });

  it("includes a hidden GM tester panel wired to dev-only APIs", () => {
    const html = fs.readFileSync("web/index.html", "utf8");
    const app = fs.readFileSync("web/app.js", "utf8");
    const server = fs.readFileSync("src/web-server.js", "utf8");

    assert.match(html, /id="gmToggle"/);
    assert.match(html, /id="gmPanel"/);
    assert.match(html, /id="devPresetButtons"/);
    assert.match(html, /id="devTalentButtons"/);
    assert.match(html, /id="devScenarioButtons"/);
    assert.match(html, /id="devDebugInfo"/);
    assert.match(html, /id="copyDevReportButton"/);
    assert.match(html, /hidden>/);

    assert.match(app, /\/api\/dev\/catalog/);
    assert.match(app, /\/api\/dev\/run\/start/);
    assert.match(app, /\/api\/dev\/preset/);
    assert.match(app, /\/api\/dev\/talent/);
    assert.match(app, /\/api\/dev\/scenario/);
    assert.match(app, /\/api\/dev\/report/);
    assert.match(app, /potentialValues/);
    assert.match(app, /manifestedValues/);
    assert.match(app, /exposureValues/);
    assert.match(app, /hiddenHooks/);
    assert.match(app, /unresolvedThreads/);
    assert.match(app, /npcHiddenSummary/);
    assert.match(app, /aiRawJson/);
    assert.match(app, /statePatchValidation/);

    assert.match(server, /\/api\/dev\/catalog/);
    assert.match(server, /\/api\/dev\/run\/start/);
    assert.match(server, /\/api\/dev\/scenario/);
    assert.match(server, /\/api\/dev\/report/);
  });

  it("separates setup into wizard pages and uses a life timeline after creation", () => {
    const html = fs.readFileSync("web/index.html", "utf8");
    const app = fs.readFileSync("web/app.js", "utf8");

    assert.match(html, /id="identityStep"/);
    assert.match(html, /id="attributeStep"/);
    assert.match(html, /id="talentStep"/);
    assert.match(html, /id="fateStep"/);
    assert.match(html, /id="lifeStep"/);
    assert.match(html, /id="timeline"/);
    assert.match(html, /id="currentNode"/);
    assert.match(html, /开始人生/);
    assert.doesNotMatch(html, /进入早年/);
    assert.doesNotMatch(html, /data-step-target="early"/);
    assert.match(app, /function showStep/);
    assert.match(app, /function renderTimeline/);
    assert.match(app, /state\.lifeTimeline = \[\]/);
    assert.match(app, /state\.lifeTimeline = buildOpeningTimeline\(state\.session\)/);
    assert.match(app, /appendResolutionAndEvent/);
  });

  it("keeps fate preview spoiler-safe while exposing Chinese talent details on demand", () => {
    const html = fs.readFileSync("web/index.html", "utf8");
    const app = fs.readFileSync("web/app.js", "utf8");
    const opening = fs.readFileSync("src/opening-sequence.js", "utf8");
    const provider = fs.readFileSync("src/ai-provider.js", "utf8");

    assert.match(html, /身份、命格、天赋与当前处境/);
    assert.doesNotMatch(html, /未来伏笔/);
    assert.doesNotMatch(html, /初始关系/);
    assert.doesNotMatch(html, /id="fateRelations"/);
    assert.match(app, /renderTalentSummaryCard/);
    assert.match(app, /describeTalentManifestationNote/);
    assert.match(app, /describeTalentPointBonus/);
    assert.match(app, /talentAttributePotentialBonuses/);
    assert.match(app, /点数加成/);
    assert.match(app, /无直接开局点数加成/);
    assert.match(app, /详细说明/);
    assert.match(app, /查看天赋详情/);
    assert.match(app, /renderFateAttributeLines/);
    assert.match(app, /const cultivationAttrLabels/);
    assert.match(app, /appearance: "仙姿"/);
    assert.match(app, /\$\{worldSpecificLabel\}（\$\{baseLabel\}）/);
    assert.match(app, /基础 \$\{base\} \+ 天赋 \$\{talentBonus\}/);
    assert.match(app, /潜能 \$\{potential\}/);
    assert.match(app, /当前 \$\{manifested\}/);
    assert.match(opening, /opening\.earlyLifeTimeline/);
    assert.match(opening, /describeDestinyPreview/);
    assert.match(opening, /buildEarlyLifeTimeline/);
    assert.doesNotMatch(opening, /`初始重要NPC：/);
    assert.doesNotMatch(opening, /`未解释细节：/);
    assert.doesNotMatch(opening, /"【早年自动推进】"/);
    assert.doesNotMatch(opening, /未来伏笔/);
    assert.match(provider, /hiddenHookRule/);
    assert.match(provider, /未来暗线/);
    assert.match(provider, /普通玩家可见文本必须全中文/);
    assert.match(provider, /X 岁：事件名/);
    assert.match(provider, /opening\.earlyLifeTimeline/);
    assert.doesNotMatch(provider, /playerText\.body 必须包含身世卡、命运预览、早年自动推进、初始重要NPC、未解释细节/);
  });

  it("keeps hidden NPC identities backend-only in ordinary web output", () => {
    const npcGenerator = fs.readFileSync("src/npc-generator.js", "utf8");
    const opening = fs.readFileSync("src/opening-sequence.js", "utf8");
    const webStore = fs.readFileSync("src/web-session-store.js", "utf8");
    const provider = fs.readFileSync("src/ai-provider.js", "utf8");

    assert.match(npcGenerator, /playerVisible/);
    assert.match(npcGenerator, /trueRole/);
    assert.match(opening, /openingVisibleNpcs/);
    assert.match(opening, /visibleNpcLabel/);
    assert.doesNotMatch(opening, /npc\.role \?\? npc\.id/);
    assert.match(webStore, /sanitizePlayerText/);
    assert.match(webStore, /map\(serializeVisibleNpc\)\.filter\(Boolean\)/);
    assert.match(provider, /playerVisible 与 hiddenInfo 两层/);
    assert.match(provider, /不能直接写给玩家/);
  });

  it("does not use ordinary-player placeholder labels for missing names", () => {
    const app = fs.readFileSync("web/app.js", "utf8");
    const localization = fs.readFileSync("src/localization.js", "utf8");
    const webStore = fs.readFileSync("src/web-session-store.js", "utf8");

    assert.doesNotMatch(app, /"未知天赋"|"未命名天赋"|"未知身份"/);
    assert.doesNotMatch(localization, /"未知天赋"|"未命名天赋"|"身份尚不明确"|"重要人物"/);
    assert.doesNotMatch(webStore, /"身份尚不明确"|"重要人物"/);
    assert.match(app, /return talentNameLabels\[id\] \?\? ""/);
    assert.match(localization, /const label = TALENT_LABELS\[id\] \?\? fallback \?\? ""/);
  });

  it("protects playable life nodes from card-like titles and result-spoiling choice meta", () => {
    const html = fs.readFileSync("web/index.html", "utf8");
    const app = fs.readFileSync("web/app.js", "utf8");
    const provider = fs.readFileSync("src/ai-provider.js", "utf8");
    const session = fs.readFileSync("src/play-session.js", "utf8");
    const validator = fs.readFileSync("src/ai-response-validator.js", "utf8");

    assert.match(html, /placeholder="或者写下你想尝试的行动。"/);
    assert.doesNotMatch(html, /由 AI 和引擎根据当前人生合理判定/);

    assert.match(app, /function formatChoiceMeta/);
    assert.match(app, /function sanitizeChoiceOutcomeLabel/);
    assert.match(app, /function deriveEventTitleFromBody/);
    assert.match(app, /function isChoiceIntentNarration/);
    assert.doesNotMatch(app, /return "人生片段"/);
    assert.doesNotMatch(app, /formatEventTitle\(event\.playerText\?\.title \?\? "人生事件"/);
    assert.doesNotMatch(app, /choice\.fuzzySuccessLabel \?\? "结果难以判断"/);
    assert.doesNotMatch(app, /life_event:\s*"人生事件"/);
    assert.doesNotMatch(app, /return responseTypeLabels\[id\] \?\? "人生事件"/);
    assert.match(app, /\^成功率/);

    assert.match(provider, /fuzzySuccessLabel 只能写模糊风险或难度/);
    assert.match(provider, /选项不能提前宣布成功/);
    assert.match(provider, /如果正文出现后来者、来人、陌生人或某个NPC/);
    assert.match(provider, /\^成功率/);
    assert.match(provider, /playerText\.title 不能写“人生事件”“人生片段”/);
    assert.match(provider, /正文至少/);
    assert.match(session, /derivePlayableTitle/);
    assert.match(session, /genericPlayableTitle/);
    assert.match(validator, /validatePlayableNarrative/);
    assert.match(validator, /fuzzySuccessLabel must not pre-announce success or resolved outcomes/);
  });
});
