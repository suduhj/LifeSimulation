const state = {
  worlds: [],
  preview: null,
  session: null,
  devCatalog: null,
  devPanelOpen: false,
  pendingDevPresetId: null,
  devLastValidation: null,
  loading: false,
  activeStep: "identity",
  lifeTimeline: [],
};

const attrKeys = ["appearance", "intelligence", "constitution", "familyBackground", "luck"];
const attrLabels = {
  appearance: "颜值",
  intelligence: "智力",
  constitution: "体质",
  familyBackground: "家境",
  luck: "运气",
};

const cultivationAttrLabels = {
  appearance: "仙姿",
  intelligence: "悟性",
  constitution: "根骨",
  familyBackground: "出身/底蕴",
  luck: "气运",
};

const worldLabels = {
  cultivation: "修仙世界",
  cthulhu: "克苏鲁世界",
  wasteland: "末日废土世界",
};

const aiModeLabels = {
  mock: "离线调试",
  deepseek: "DeepSeek",
  "openai-compatible": "OpenAI 兼容接口",
};

const genderLabels = {
  female: "女",
  male: "男",
  nonbinary: "非二元",
  unspecified: "不指定",
};

const personalityLabels = {
  curious: "好奇探索",
  cautious: "谨慎稳健",
  ambitious: "野心进取",
  empathetic: "重情共感",
  rebellious: "叛逆自由",
  pragmatic: "现实务实",
  random: "由 AI 生成",
};

const rarityLabels = {
  common: "普通",
  fine: "精良",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
  mythic: "神话",
};

const manifestationLabels = {
  immediate: "立即显化",
  stage: "阶段显化",
  conditional: "条件觉醒",
  hidden_destiny: "隐藏命格",
};

const attributeLayerLabels = {
  potential: "天赋潜能",
  manifested: "当前表现",
  realized: "已兑现",
  lockedPotential: "年龄封存",
  exposure: "异常关注",
};

const talentNameLabels = {
  weak_spirit_sense: "微弱灵感",
  strong_blood: "血气旺盛",
  herb_affinity: "草木亲和",
  smooth_meridians: "经脉顺畅",
  minor_sword_sense: "浅层剑感",
  low_grade_spirit_root: "下品灵根",
  alchemy_nose: "丹香辨识",
  beast_taming_instinct: "驭兽直觉",
  hidden_luck_opportunity: "暗藏机缘",
  single_spirit_root: "单系灵根",
  born_sword_bone: "天生剑骨",
  spirit_eye: "灵眼",
  noble_cultivation_blood: "修真贵胄血脉",
  heavenly_spirit_root: "天灵根",
  innate_sword_heart: "先天剑心",
  ancient_immortal_blood: "古仙血脉",
  broken_then_reborn: "破而后立",
  myriad_dao_body: "万道之体",
  reincarnation_memory: "轮回记忆",
  heaven_favored_one: "天命眷顾者",
  chaos_spirit_embryo: "混沌灵胎",
  clear_child_face: "清秀稚颜",
  steady_hands: "手稳心细",
  minor_family_savings: "薄有家资",
  gentle_presence: "温和气质",
  formation_memory: "阵纹记忆",
  spirit_stone_nose: "灵石嗅觉",
  jade_bone_beauty: "玉骨仙姿",
  late_blooming_root: "迟绽灵根",
  sect_fortune_star: "宗门福星",

  uneasy_dreams: "不安之梦",
  sensitive_child: "敏感孩童",
  strange_birthmark: "异样胎记",
  rumor_listener: "谣言倾听者",
  calm_under_pressure: "临危冷静",
  lucky_miss: "幸运擦肩",
  dream_sensitivity: "梦境敏感",
  forbidden_intuition: "禁忌直觉",
  pollution_resistance: "污染抗性",
  old_blood_trace: "旧血痕迹",
  abnormal_blind_spot: "异常盲点",
  dream_walker: "梦行者",
  sanity_anchor: "理智锚点",
  occult_family_heir: "秘学家族继承人",
  truth_seeker: "追真者",
  child_of_the_dreamland: "梦境之子",
  blessed_by_the_unknown: "未知眷顾",
  human_shell: "人类外壳",
  fate_rewriter: "命运重写者",
  eldritch_beloved: "不可名状的宠儿",
  forbidden_genius: "禁忌天才",
  vessel_of_the_depth: "深渊容器",
  pleasant_smile: "亲和笑容",
  quiet_observer: "安静观察者",
  stable_home: "稳定家庭",
  sleepwalker_warning: "梦游预警",
  archive_memory: "档案记忆",
  softly_unnerving_beauty: "微妙异美",
  official_file_shadow: "官方档案阴影",
  ritual_language_echo: "仪式语回响",

  hard_stomach: "铁胃",
  sharp_eyes: "锐利眼神",
  heat_tolerance: "耐热体质",
  scrap_sense: "废料直觉",
  tough_skin: "坚韧皮肤",
  quick_learner_survival: "生存速学",
  water_finder: "寻水者",
  radiation_tolerance: "辐射耐受",
  machine_touch: "机械触感",
  beast_instinct: "野兽直觉",
  shelter_heir: "避难所继承人",
  old_world_knowledge: "旧世知识",
  mutation_adaptation: "变异适应",
  wasteland_charm_of_fate: "废土命运护符",
  warlord_seed: "军阀种子",
  prewar_bloodline: "战前血脉",
  mutant_king_seed: "变异王种",
  chosen_survivor: "被选中的幸存者",
  apocalypse_saint: "末日圣徒",
  perfect_adapted_body: "完美适应体",
  old_world_key: "旧世界钥匙",
  wasteland_overlord_fate: "废土霸主命格",
  bright_camp_smile: "营地明亮笑容",
  ration_counter: "口粮计算者",
  small_tool_cache: "小型工具藏匿",
  wound_stitch_memory: "缝伤记忆",
  radio_pattern_ear: "电台纹路听觉",
  clean_water_luck: "净水好运",
  beautiful_scavenger: "美丽拾荒者",
  camp_unifier: "营地整合者",
};

const talentAttributePotentialBonuses = {
  weak_spirit_sense: { intelligence: 2 },
  strong_blood: { constitution: 2 },
  herb_affinity: { intelligence: 3, luck: 2 },
  smooth_meridians: { constitution: 5 },
  minor_sword_sense: { constitution: 3, intelligence: 2 },
  low_grade_spirit_root: { intelligence: 8, constitution: 5 },
  alchemy_nose: { intelligence: 10 },
  beast_taming_instinct: { constitution: 6, luck: 6 },
  hidden_luck_opportunity: { luck: 12 },
  single_spirit_root: { intelligence: 20, constitution: 10 },
  born_sword_bone: { constitution: 25, intelligence: 10 },
  spirit_eye: { intelligence: 20, luck: 10 },
  noble_cultivation_blood: { familyBackground: 25, intelligence: 10 },
  heavenly_spirit_root: { intelligence: 50, constitution: 30 },
  innate_sword_heart: { intelligence: 35, constitution: 35 },
  ancient_immortal_blood: { appearance: 20, constitution: 40, luck: 20 },
  myriad_dao_body: { intelligence: 80, constitution: 80 },
  reincarnation_memory: { intelligence: 60, luck: 80 },
  heaven_favored_one: { luck: 120 },
  chaos_spirit_embryo: { appearance: 40, intelligence: 70, constitution: 100 },
  clear_child_face: { appearance: 2 },
  steady_hands: { constitution: 1, intelligence: 1 },
  minor_family_savings: { familyBackground: 5 },
  gentle_presence: { appearance: 3, luck: 2 },
  formation_memory: { intelligence: 12 },
  spirit_stone_nose: { luck: 8, intelligence: 4 },
  jade_bone_beauty: { appearance: 25, constitution: 10 },
  late_blooming_root: { intelligence: 10, constitution: 25 },
  sect_fortune_star: { luck: 50, familyBackground: 20 },
  uneasy_dreams: { luck: 2 },
  sensitive_child: { intelligence: 2 },
  strange_birthmark: { appearance: 1, luck: 2 },
  rumor_listener: { intelligence: 4 },
  calm_under_pressure: { intelligence: 3, constitution: 3 },
  lucky_miss: { luck: 5 },
  dream_sensitivity: { intelligence: 8, luck: 8 },
  forbidden_intuition: { intelligence: 12 },
  pollution_resistance: { constitution: 10 },
  old_blood_trace: { appearance: 6, luck: 10 },
  abnormal_blind_spot: { luck: 20 },
  dream_walker: { intelligence: 15, luck: 15 },
  sanity_anchor: { intelligence: 15, constitution: 15 },
  occult_family_heir: { familyBackground: 25, intelligence: 10 },
  truth_seeker: { intelligence: 40 },
  child_of_the_dreamland: { appearance: 20, intelligence: 30, luck: 30 },
  blessed_by_the_unknown: { luck: 60 },
  human_shell: { appearance: 30, constitution: 30 },
  fate_rewriter: { luck: 120 },
  eldritch_beloved: { appearance: 50, luck: 100 },
  forbidden_genius: { intelligence: 120 },
  vessel_of_the_depth: { constitution: 100, luck: 80 },
  pleasant_smile: { appearance: 2 },
  quiet_observer: { intelligence: 1, luck: 1 },
  stable_home: { familyBackground: 5 },
  sleepwalker_warning: { luck: 4, intelligence: 2 },
  archive_memory: { intelligence: 10, luck: 3 },
  softly_unnerving_beauty: { appearance: 12 },
  official_file_shadow: { familyBackground: 15, luck: 10 },
  ritual_language_echo: { intelligence: 25 },
  hard_stomach: { constitution: 2 },
  sharp_eyes: { luck: 2 },
  heat_tolerance: { constitution: 2 },
  scrap_sense: { luck: 5 },
  tough_skin: { constitution: 5 },
  quick_learner_survival: { intelligence: 4 },
  water_finder: { luck: 10 },
  radiation_tolerance: { constitution: 12 },
  machine_touch: { intelligence: 12 },
  beast_instinct: { constitution: 8, luck: 6 },
  shelter_heir: { familyBackground: 25 },
  old_world_knowledge: { intelligence: 25 },
  mutation_adaptation: { constitution: 30 },
  wasteland_charm_of_fate: { luck: 30 },
  warlord_seed: { constitution: 30, intelligence: 25, familyBackground: 20 },
  prewar_bloodline: { intelligence: 35, familyBackground: 30 },
  mutant_king_seed: { constitution: 60 },
  chosen_survivor: { luck: 60 },
  apocalypse_saint: { luck: 100, constitution: 60 },
  perfect_adapted_body: { constitution: 150 },
  old_world_key: { intelligence: 80, familyBackground: 80 },
  wasteland_overlord_fate: { intelligence: 60, constitution: 60, luck: 80 },
  bright_camp_smile: { appearance: 2 },
  ration_counter: { intelligence: 2 },
  small_tool_cache: { familyBackground: 5 },
  wound_stitch_memory: { constitution: 3, intelligence: 2 },
  radio_pattern_ear: { intelligence: 10, luck: 4 },
  clean_water_luck: { luck: 14 },
  beautiful_scavenger: { appearance: 25, luck: 8 },
  camp_unifier: { intelligence: 15, familyBackground: 15 },
};

const progressLabels = {
  realm: "境界",
  cultivation_foundation: "修炼根基",
  realm_stage: "境界阶段",
  sect_attention: "宗门关注",
  sect_status: "宗门地位",
  sect_or_clan_status: "宗门/家族关系",
  techniques: "功法掌握",
  tribulations: "劫数压力",
  resources: "修炼资源",
  karma_and_reputation: "因果与名声",
  lifespan_pressure: "寿元压力",
  karmic_pressure: "因果压力",
  truth_exposure: "真相揭露",
  sanity_pressure: "理智压力",
  corruption_assimilation: "污染/同化",
  occult_contact: "神秘接触",
  social_normalcy: "社会正常度",
  personal_goal: "个人目标",
  survival_days: "生存天数",
  camp_stage: "营地阶段",
  resource_security: "资源安全",
  radiation_burden: "辐射负担",
  faction_trust: "势力信任",
};

const progressValueLabels = {
  mortal: "凡人",
  qi_refining: "炼气",
  foundation_establishment: "筑基",
  golden_core: "金丹",
  nascent_soul: "元婴",
  spirit_transformation: "化神",
  none: "暂无",
  child: "孩童",
  rumor: "传闻",
  low: "较低",
  medium: "中等",
  high: "较高",
};

const responseTypeLabels = {
  action_resolution: "行动后果",
  clarification_request: "需要确认",
  forced_consequence: "强制后果",
  ending_summary: "人生总结",
  life_event: "命运片段",
  memory_update: "记忆更新",
  json_repair: "数据修复",
};

const riskLabels = {
  safe: "安全",
  low: "低风险",
  medium: "中等风险",
  high: "高风险",
  extreme: "风险极大",
  unknown: "结果难以判断",
};

const npcRoleLabels = {
  parents: "父母",
  parent: "父母",
  mortal_parents: "父母",
  guardian: "监护人",
  teacher: "老师",
  neighbor: "邻居",
  classmate: "同学",
  sibling: "兄弟姐妹",
  mentor: "引路人",
  elder: "长辈",
};

const npcTemplateLabels = {
  mortal_parents: "父母",
  village_elder: "村中长辈",
  old_hunter: "老猎户",
  wandering_cultivator: "路过修士",
  sect_deacon: "宗门执事",
  outer_disciple_friend: "外门同龄人",
  talented_peer: "同辈天才",
  jealous_clan_member: "同族亲眷",
  strict_master: "严厉师长",
  alchemist_elder: "老炼丹师",
  market_merchant: "坊市商人",
  demonic_cultivator: "危险修士",
  remnant_soul: "来历不明的残魂",
  sect_leader: "宗门高层",
  mysterious_senior: "神秘前辈",
  dao_companion_candidate: "同道之人",
  junior_disciple: "年幼弟子",
  oath_bound_guardian: "守誓护卫",
  righteous_inspector: "巡查修士",
  spirit_beast_companion: "灵兽伙伴",
  normal_parent: "父母",
  anxious_parent: "焦虑的家人",
  rational_teacher: "理性老师",
  suspicious_doctor: "负责医生",
  therapist: "心理咨询师",
  urban_legend_friend: "怪谈朋友",
  missing_case_survivor: "失踪案幸存者",
  official_agent: "官方人员",
  cult_edge_member: "可疑信徒",
  corporate_researcher: "企业研究员",
  old_family_heir: "旧家族成员",
  polluted_classmate: "异常同学",
  dream_person: "梦中人",
  watcher_mentor: "守望者",
  compromised_official: "官方人士",
  ordinary_romance_partner: "亲近之人",
  journalist_contact: "记者联系人",
  orphanage_caretaker: "照护者",
  deep_tide_heir: "深潮家族成员",
  ordinary_child_or_student: "普通孩子",
  tired_parent: "疲惫的家人",
  shelter_leader: "避难所管理者",
  old_medic: "老医师",
  mechanic_master: "机械师傅",
  caravan_merchant: "商队商人",
  wasteland_scout: "废土斥候",
  raider_boss: "掠夺者头目",
  mutant_child: "变异孩子",
  old_soldier: "老兵",
  black_market_broker: "黑市中间人",
  preacher: "传教者",
  ai_robot: "旧世机器",
  warlord: "军阀",
  water_baron: "水源掌控者",
  settlement_builder: "聚落建设者",
  camp_childhood_friend: "营地玩伴",
  greenhouse_keeper: "温室看守",
  radio_operator: "电台员",
  exiled_mutant: "流放变异者",
  water_heir: "水源继承人",
};

const attributeHelpText = {
  manifested: "当前表现：这个年龄真正表现出来、能影响事件判定的能力。",
  realized: "已兑现：已经通过年龄、训练、环境和剧情证据兑现出来的成长。",
  potential: "天赋潜能：这个属性未来可能达到的高度，不代表现在已经完全拥有。",
  lockedPotential: "年龄封存：仍然被年龄、身体承载、训练、环境或剧情条件锁住的潜力。",
  exposure: "异常关注：外界察觉你异常的可能性。越高越容易引来关注、保护、嫉妒、争夺、研究或危险。",
};

const els = {
  worldSelect: document.querySelector("#worldSelect"),
  aiMode: document.querySelector("#aiMode"),
  playerName: document.querySelector("#playerName"),
  gender: document.querySelector("#gender"),
  personality: document.querySelector("#personality"),
  identityType: document.querySelector("#identityType"),
  pointTotal: document.querySelector("#pointTotal"),
  identityNextButton: document.querySelector("#identityNextButton"),
  attributeBackButton: document.querySelector("#attributeBackButton"),
  attributeNextButton: document.querySelector("#attributeNextButton"),
  talentBackButton: document.querySelector("#talentBackButton"),
  previewButton: document.querySelector("#previewButton"),
  startButton: document.querySelector("#startButton"),
  timeline: document.querySelector("#timeline"),
  currentNode: document.querySelector("#currentNode"),
  currentNodeAge: document.querySelector("#currentNodeAge"),
  loadPath: document.querySelector("#loadPath"),
  loadButton: document.querySelector("#loadButton"),
  talentList: document.querySelector("#talentList"),
  talentCount: document.querySelector("#talentCount"),
  runMeta: document.querySelector("#runMeta"),
  saveButton: document.querySelector("#saveButton"),
  eventCard: document.querySelector("#eventCard"),
  loadingIndicator: document.querySelector("#loadingIndicator"),
  fatePreviewPanel: document.querySelector("#fatePreviewPanel"),
  fatePreviewMeta: document.querySelector("#fatePreviewMeta"),
  fateTalents: document.querySelector("#fateTalents"),
  fateAttributes: document.querySelector("#fateAttributes"),
  fateStory: document.querySelector("#fateStory"),
  beginLifeButton: document.querySelector("#beginLifeButton"),
  resolutionPanel: document.querySelector("#resolutionPanel"),
  resolutionMeta: document.querySelector("#resolutionMeta"),
  resolutionTitle: document.querySelector("#resolutionTitle"),
  resolutionBody: document.querySelector("#resolutionBody"),
  resolutionChanges: document.querySelector("#resolutionChanges"),
  eventTitle: document.querySelector("#eventTitle"),
  eventBody: document.querySelector("#eventBody"),
  visibleChanges: document.querySelector("#visibleChanges"),
  choices: document.querySelector("#choices"),
  freeformInput: document.querySelector("#freeformInput"),
  freeformButton: document.querySelector("#freeformButton"),
  runSummary: document.querySelector("#runSummary"),
  aiStatus: document.querySelector("#aiStatus"),
  toast: document.querySelector("#toast"),
  gmToggle: document.querySelector("#gmToggle"),
  gmPanel: document.querySelector("#gmPanel"),
  gmClose: document.querySelector("#gmClose"),
  devPresetButtons: document.querySelector("#devPresetButtons"),
  devTalentButtons: document.querySelector("#devTalentButtons"),
  devScenarioButtons: document.querySelector("#devScenarioButtons"),
  devDebugInfo: document.querySelector("#devDebugInfo"),
  copyDevReportButton: document.querySelector("#copyDevReportButton"),
};

for (const row of document.querySelectorAll(".attribute-row")) {
  const input = row.querySelector("input");
  input.addEventListener("input", () => {
    row.querySelector("strong").textContent = input.value;
    updatePointTotal();
    state.preview = null;
    renderTalents();
  });
}

els.previewButton.addEventListener("click", () => withBusy(els.previewButton, previewSetup));
els.startButton.addEventListener("click", () => withBusy(els.startButton, startRun));
els.loadButton.addEventListener("click", () => withBusy(els.loadButton, loadRun));
els.freeformButton.addEventListener("click", () => withBusy(els.freeformButton, submitFreeform));
els.saveButton.addEventListener("click", () => withBusy(els.saveButton, saveRun));
els.identityNextButton?.addEventListener("click", () => showStep("attributes"));
els.attributeBackButton?.addEventListener("click", () => showStep("identity"));
els.attributeNextButton?.addEventListener("click", () => {
  ensureValidPoints();
  showStep("talents");
});
els.talentBackButton?.addEventListener("click", () => showStep("attributes"));
els.beginLifeButton?.addEventListener("click", () => withBusy(els.beginLifeButton, advanceOpening));
els.gmToggle?.addEventListener("click", () => withBusy(els.gmToggle, toggleDevPanel));
els.gmClose?.addEventListener("click", closeDevPanel);
els.copyDevReportButton?.addEventListener("click", () => withBusy(els.copyDevReportButton, copyDevReport));

for (const input of [els.worldSelect, els.playerName, els.gender, els.personality]) {
  input.addEventListener("change", () => {
    state.preview = null;
    state.session = null;
    state.lifeTimeline = [];
    renderTalents();
    showStep("identity");
  });
}

await init();

async function init() {
  const data = await api("/api/worlds");
  state.worlds = data.worlds;
  els.worldSelect.innerHTML = state.worlds
    .map((world) => `<option value="${escapeHtml(world.id)}">${escapeHtml(worldLabel(world.id))}</option>`)
    .join("");
  els.worldSelect.value = "cthulhu";
  updatePointTotal();
  renderTalents();
  showStep("identity");
}

function showStep(step) {
  state.activeStep = step;
  for (const page of document.querySelectorAll(".wizard-page")) {
    page.hidden = page.dataset.step !== step;
  }
  for (const button of document.querySelectorAll(".wizard-step")) {
    const target = button.dataset.stepTarget;
    button.classList.toggle("is-active", target === step);
    button.disabled = !isStepAvailable(target);
  }
  if (step === "life") {
    renderTimeline();
    window.requestAnimationFrame(() => scrollToCurrentNode());
  }
}

function isStepAvailable(step) {
  if (["identity", "attributes", "talents"].includes(step)) return true;
  if (step === "fate") return Boolean(state.session && isOpeningPreview(state.session));
  if (step === "early") return false;
  if (step === "life") return Boolean(state.session && !isOpeningPreview(state.session));
  return false;
}

async function previewSetup() {
  ensureValidPoints();
  state.preview = await api("/api/setup/preview", setupPayload());
  renderTalents();
  toast("已抽取 5 个天赋，请选择 3 个。");
}

async function startRun() {
  ensureValidPoints();
  const keptTalentIds = selectedTalentIds();
  if (keptTalentIds.length !== 3) {
    throw new Error("必须从 5 个天赋里选择 3 个。");
  }
  const startUrl = state.pendingDevPresetId ? "/api/dev/run/start" : "/api/run/start";
  state.session = await api(startUrl, {
    ...setupPayload(),
    seed: state.preview.seed,
    aiMode: els.aiMode.value,
    keptTalentIds,
    devPresetId: state.pendingDevPresetId,
  });
  state.pendingDevPresetId = null;
  state.lifeTimeline = [];
  renderSession();
  showStep("fate");
  toast("身世档案已生成。确认后将从 0 岁进入人生时间线。");
}

async function advanceOpening() {
  if (!state.session) return;
  state.session = await api("/api/run/action", {
    sessionId: state.session.sessionId,
    action: { kind: "advance_opening" },
  });
  state.devLastValidation = null;
  if (state.lifeTimeline.length === 0) {
    state.lifeTimeline = buildOpeningTimeline(state.session);
  }
  renderSession();
  showStep("life");
  toast("第一个人生分岔已经出现。");
}

async function submitChoice(choiceId) {
  if (!state.session) return;
  appendCurrentEventToTimeline();
  state.session = await api("/api/run/action", {
    sessionId: state.session.sessionId,
    action: { kind: "choice", choiceId },
  });
  state.devLastValidation = null;
  appendResolutionAndEvent();
  renderSession();
}

async function submitFreeform() {
  if (!state.session) return;
  const text = els.freeformInput.value.trim();
  if (!text) {
    toast("先写下你想尝试的行动。");
    return;
  }
  appendCurrentEventToTimeline();
  state.session = await api("/api/run/action", {
    sessionId: state.session.sessionId,
    action: { kind: "freeform", text },
  });
  els.freeformInput.value = "";
  state.devLastValidation = null;
  appendResolutionAndEvent();
  renderSession();
}

async function confirmFreeform(kind) {
  if (!state.session) return;
  state.session = await api("/api/run/action", {
    sessionId: state.session.sessionId,
    action: { kind },
  });
  state.devLastValidation = null;
  appendResolutionAndEvent();
  renderSession();
}

async function saveRun() {
  if (!state.session) return;
  const result = await api("/api/run/save", { sessionId: state.session.sessionId });
  if (els.loadPath) els.loadPath.value = result.path;
  toast("进度已保存。开发者模式可查看本地路径。");
}

async function loadRun() {
  const path = els.loadPath.value.trim();
  if (!path) {
    throw new Error("请输入要载入的本地存档路径。");
  }
  state.session = await api("/api/run/load", {
    path,
    aiMode: els.aiMode.value,
  });
  state.devLastValidation = null;
  state.lifeTimeline = buildTimelineFromLoadedSession(state.session);
  renderSession();
  showStep(isOpeningPreview(state.session) ? "fate" : "life");
  toast("存档已载入。");
}

async function toggleDevPanel() {
  state.devPanelOpen = !state.devPanelOpen;
  if (state.devPanelOpen) {
    await ensureDevCatalog();
  }
  renderDevPanel();
}

function closeDevPanel() {
  state.devPanelOpen = false;
  renderDevPanel();
}

async function ensureDevCatalog() {
  if (!state.devCatalog) {
    state.devCatalog = await api("/api/dev/catalog");
  }
}

async function applyDevPreset(presetId) {
  await ensureDevCatalog();
  const preset = state.devCatalog.presets.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown dev preset: ${presetId}`);
  setAllocation(preset.allocation);
  state.preview = null;
  state.pendingDevPresetId = presetId;
  renderTalents();
  if (state.session) {
    state.session = await api("/api/dev/preset", {
      sessionId: state.session.sessionId,
      presetId,
    });
    state.pendingDevPresetId = null;
    renderSession();
    toast(`已应用测试开局预设：${preset.name}`);
    return;
  }
  renderDevDebugInfo();
  toast(`已套用加点：${preset.name}。开始人生后会应用隐藏测试效果。`);
}

async function applyDevTalent(talentId) {
  if (!state.session) {
    toast("请先开始人生，再添加测试专属天赋。");
    return;
  }
  state.session = await api("/api/dev/talent", {
    sessionId: state.session.sessionId,
    talentId,
  });
  renderSession();
  toast("已添加测试专属天赋。");
}

async function triggerDevScenario(scenarioId) {
  if (!state.session) {
    toast("请先开始人生，再触发世界测试场景。");
    return;
  }
  const payload = await api("/api/dev/scenario", {
    sessionId: state.session.sessionId,
    scenarioId,
  });
  state.devLastValidation = payload.devValidation;
  state.session = payload;
  appendTimelineEvent(state.session.currentEvent, "event");
  renderSession();
  showStep("life");
  toast("已触发测试场景。");
}

async function copyDevReport() {
  if (!state.session) {
    toast("请先开始人生，再复制测试报告。");
    return;
  }
  const report = await api("/api/dev/report", { sessionId: state.session.sessionId });
  await copyText(JSON.stringify(report, null, 2));
  toast("测试报告已复制。");
}

function setupPayload() {
  return {
    worldId: els.worldSelect.value,
    name: els.playerName.value,
    gender: els.gender.value,
    personality: els.personality.value,
    allocation: readAllocation(),
  };
}

function readAllocation() {
  const allocation = {};
  for (const key of attrKeys) {
    allocation[key] = Number.parseInt(document.querySelector(`.attribute-row[data-attr="${key}"] input`).value, 10);
  }
  return allocation;
}

function updatePointTotal() {
  const total = Object.values(readAllocation()).reduce((sum, value) => sum + value, 0);
  els.pointTotal.textContent = `${total} / 20`;
  els.pointTotal.style.color = total === 20 ? "var(--accent)" : "var(--warn)";
  if (els.previewButton) els.previewButton.disabled = total !== 20;
}

function setAllocation(allocation = {}) {
  for (const key of attrKeys) {
    const input = document.querySelector(`.attribute-row[data-attr="${key}"] input`);
    const value = Number.parseInt(String(allocation[key] ?? 0), 10);
    input.value = Number.isFinite(value) ? value : 0;
    input.closest(".attribute-row").querySelector("strong").textContent = input.value;
  }
  updatePointTotal();
}

function ensureValidPoints() {
  const total = Object.values(readAllocation()).reduce((sum, value) => sum + value, 0);
  if (total !== 20) {
    throw new Error(`当前属性总点数是 ${total}，必须等于 20。`);
  }
}

function renderTalents() {
  if (!state.preview) {
    els.talentList.innerHTML = '<p class="subtitle">点击“抽取 5 个天赋”后选择 3 个。</p>';
    els.talentCount.textContent = "未抽取";
    els.startButton.disabled = true;
    return;
  }

  els.talentList.innerHTML = state.preview.talentDraw
    .map((talent, index) => {
      const checked = state.preview.defaultKeptTalentIds.includes(talent.id) ? "checked" : "";
      const name = talentDisplayName(talent);
      if (!name) return "";
      return `
        <article class="talent-item">
          <label class="talent-select-row">
            <input type="checkbox" value="${escapeHtml(talent.id)}" ${checked} />
            <span class="talent-card-copy">
              <strong>${index + 1}. ${escapeHtml(name)}</strong>
              <span class="talent-rarity">${escapeHtml(rarityLabel(talent.rarity))}｜${escapeHtml(manifestationLabel(talent.manifestationType))}</span>
            </span>
          </label>
          <details class="talent-detail">
            <summary>查看天赋详情</summary>
            <div class="talent-detail-body">
              <p><b>详细说明：</b>${escapeHtml(describeTalentDetail(talent))}</p>
              <p><b>点数加成：</b>${escapeHtml(describeTalentPointBonus(talent))}</p>
              <p><b>属性影响：</b>${escapeHtml(describeTalentAttributeImpact(talent))}</p>
              <p><b>剧情效果：</b>${escapeHtml(describeTalentStoryEffect(talent))}</p>
              <p><b>可能风险：</b>${escapeHtml(describeTalentRisk(talent))}</p>
              <p><b>显化说明：</b>${escapeHtml(describeTalentManifestationNote(talent))}</p>
            </div>
          </details>
        </article>
      `;
    })
    .filter(Boolean)
    .join("");

  for (const checkbox of els.talentList.querySelectorAll("input[type='checkbox']")) {
    checkbox.addEventListener("change", () => {
      const selected = selectedTalentIds();
      if (selected.length > 3) checkbox.checked = false;
      updateTalentCount();
    });
  }
  updateTalentCount();
}

function updateTalentCount() {
  const count = selectedTalentIds().length;
  if (els.talentCount) els.talentCount.textContent = state.preview ? `${count} / 3` : "未抽取";
  if (els.startButton) els.startButton.disabled = count !== 3;
}

function selectedTalentIds() {
  return [...els.talentList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
}

function renderSession() {
  const session = state.session;
  if (!session) return;
  const opening = isOpeningPreview(session);
  els.aiStatus.textContent = aiModeLabel(session.aiMode);
  els.saveButton.disabled = false;
  els.freeformButton.disabled = opening || session.ended || session.pendingFreeformConfirmation || state.loading;
  renderResolution();
  renderFatePreview(session);
  if (opening) {
    els.choices.innerHTML = "";
    els.visibleChanges.innerHTML = "";
    els.freeformInput.disabled = true;
  } else {
    if (els.eventCard) els.eventCard.hidden = false;
    renderEvent(session.currentEvent, session);
  }
  renderRun(session.run);
  renderTimeline();
  renderLoading();
  renderDevPanel();
}

function renderDevPanel() {
  if (!els.gmPanel || !els.gmToggle) return;
  els.gmPanel.hidden = !state.devPanelOpen;
  els.gmToggle.setAttribute("aria-expanded", state.devPanelOpen ? "true" : "false");
  if (!state.devPanelOpen) return;
  renderDevButtons();
  renderDevDebugInfo();
}

function renderDevButtons() {
  if (!state.devCatalog) return;
  els.devPresetButtons.innerHTML = state.devCatalog.presets
    .map((preset) => `<button class="dev-tool-button" type="button" data-dev-preset="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</button>`)
    .join("");
  els.devTalentButtons.innerHTML = state.devCatalog.talents
    .map((talent) => `<button class="dev-tool-button" type="button" data-dev-talent="${escapeHtml(talent.id)}">${escapeHtml(talent.name)}</button>`)
    .join("");
  const worldId = state.session?.run?.worldId ?? els.worldSelect.value;
  const scenarios = state.devCatalog.scenarios?.[worldId] ?? [];
  els.devScenarioButtons.innerHTML = scenarios
    .map((scenario) => `<button class="dev-tool-button" type="button" data-dev-scenario="${escapeHtml(scenario.id)}">${escapeHtml(scenario.name)}</button>`)
    .join("");

  for (const button of els.devPresetButtons.querySelectorAll("button")) {
    button.addEventListener("click", () => withBusy(button, () => applyDevPreset(button.dataset.devPreset)));
  }
  for (const button of els.devTalentButtons.querySelectorAll("button")) {
    button.addEventListener("click", () => withBusy(button, () => applyDevTalent(button.dataset.devTalent)));
  }
  for (const button of els.devScenarioButtons.querySelectorAll("button")) {
    button.addEventListener("click", () => withBusy(button, () => triggerDevScenario(button.dataset.devScenario)));
  }
}

function renderDevDebugInfo() {
  if (!els.devDebugInfo) return;
  if (!state.session) {
    els.devDebugInfo.textContent = JSON.stringify({
      mode: "dev_only",
      status: "not_started",
      pendingDevPresetId: state.pendingDevPresetId,
      allocation: readAllocation(),
    }, null, 2);
    return;
  }
  const run = state.session.run;
  const event = state.session.currentEvent;
  els.devDebugInfo.textContent = JSON.stringify({
    mode: "dev_only",
    potentialValues: mapAttributes(run.player.attributes, "potential"),
    manifestedValues: mapAttributes(run.player.attributes, "manifested"),
    realizedValues: mapAttributes(run.player.attributes, "realized"),
    lockedPotentialValues: mapAttributes(run.player.attributes, "lockedPotential"),
    exposureValues: mapAttributes(run.player.attributes, "exposure"),
    growthLedger: run.player.growthLedger,
    worldProgress: run.worldState?.progress ?? {},
    npcHiddenSummary: (run.importantNPCs ?? []).map((npc) => ({
      id: npc.id,
      role: npc.role,
      knownIdentity: npc.knownIdentity,
      hiddenInfo: npc.hiddenInfo,
      relationship: npc.relationship,
      flags: npc.flags,
    })),
    hiddenHooks: run.worldState?.opening?.hiddenHooks ?? [],
    unresolvedThreads: run.worldState?.opening?.unresolvedThreads ?? [],
    eventSource: event?.event?.sourceType,
    selectedSeeds: event?.selectedSeeds ?? [],
    aiRawJson: event,
    statePatchValidation: state.devLastValidation ?? "未运行 GM 场景校验；当前事件来自普通流程或 AI/provider。",
  }, null, 2);
}

function isOpeningPreview(session) {
  return session?.openingPhase === "background" || session?.inputRequired === "opening_continue" || session?.currentEvent?.event?.sourceType === "opening_sequence";
}

function renderFatePreview(session) {
  if (!els.fatePreviewPanel) return;
  const opening = isOpeningPreview(session);
  els.fatePreviewPanel.hidden = !opening;
  if (!opening) return;

  const run = session.run;
  const event = session.currentEvent;
  const openingSections = parseOpeningSections(event.playerText?.body ?? "");
  els.fatePreviewMeta.textContent = `${run.player.name}｜${worldLabel(run.worldId)}｜命运档案`;
  els.fateTalents.innerHTML = (run.player.talents ?? [])
    .map((talent) => renderTalentSummaryCard(talent))
    .filter(Boolean)
    .join("");
  els.fateAttributes.innerHTML = renderFateAttributeLines(run)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  els.fateStory.textContent = openingSections.background || "身世正在形成，开始人生后会进入完整人生时间线。";
  els.beginLifeButton.disabled = state.loading || session.ended;
}

function buildOpeningTimeline(session) {
  if (!session?.currentEvent) return [];
  const storedTimeline = session.run?.worldState?.opening?.earlyLifeTimeline;
  const actionAge = Math.max(0, Number(session.run?.worldState?.opening?.firstActionAge ?? session.run?.player?.age ?? session.currentEvent?.timeSpan?.ageEnd ?? 0));
  if (actionAge > 0) {
    return Array.from({ length: actionAge }, (_, age) => {
      const sourceEntry = Array.isArray(storedTimeline)
        ? storedTimeline.find((entry) => Number(entry?.age) === age)
        : undefined;
      const body = sanitizeOpeningTimelineBody(sourceEntry?.body);
      return {
        kind: "opening",
        age,
        title: `${age} 岁：${openingTimelineTitleForAge(age, actionAge)}`,
        body: body || openingTimelineBodyFallback(session, age, actionAge),
      };
    }).filter(isRenderableTimelineEntry);
  }
  const sections = parseOpeningSections(session.currentEvent.playerText?.body ?? "");
  const fallbackBody = sections.earlyLife || openingTimelineFallback(session);
  return splitOpeningBody(fallbackBody, session.currentEvent.timeSpan).map((item) => ({
    kind: "opening",
    age: item.age,
    title: item.title,
    body: item.body,
  }));
}

function buildTimelineFromLoadedSession(session) {
  const entries = [];
  if (!isOpeningPreview(session)) {
    entries.push(...buildOpeningTimeline(session));
  }
  const storyTimeline = currentPanelViews(session)?.story?.timeline ?? [];
  for (const item of storyTimeline) {
    const entry = {
      kind: item.kind ?? "event",
      age: item.age,
      title: item.title ?? "",
      body: item.body ?? "",
      changes: [],
    };
    if (isRenderableTimelineEntry(entry) && !entries.some((existing) => existing.age === entry.age && existing.title === entry.title)) {
      entries.push(entry);
    }
  }
  if (session?.currentEvent) {
    entries.push(timelineEntryFromEvent(session.currentEvent, "event"));
  }
  return entries;
}

function appendResolutionAndEvent() {
  if (!state.session) return;
  mergeResolutionIntoLatestTimelineEntry(state.session.resolution);
  if (state.session.ended && state.session.currentEvent) {
    appendTimelineEvent(state.session.currentEvent, state.session.ended ? "ending" : "event");
  }
}

function mergeResolutionIntoLatestTimelineEntry(resolution) {
  if (!resolution || !state.lifeTimeline.length) return;
  const targetIndex = findTimelineEntryIndexForResolution(resolution);
  if (targetIndex < 0) return;
  const entry = state.lifeTimeline[targetIndex];
  const body = resolution.playerText?.body ?? "";
  const changes = Array.isArray(resolution.visibleChanges) ? resolution.visibleChanges : [];
  state.lifeTimeline[targetIndex] = {
    ...entry,
    body: [entry.body, body].filter(hasText).join("\n\n"),
    changes: mergeVisibleChanges(entry.changes, changes),
  };
}

function findTimelineEntryIndexForResolution(resolution) {
  const age = resolution?.timeSpan?.ageEnd ?? resolution?.timeSpan?.ageStart;
  for (let index = state.lifeTimeline.length - 1; index >= 0; index -= 1) {
    const entry = state.lifeTimeline[index];
    if (entry.kind === "event" && entry.age === age) return index;
  }
  return -1;
}

function mergeVisibleChanges(existing = [], next = []) {
  const seen = new Set();
  return [...(existing ?? []), ...(next ?? [])].filter((change) => {
    const text = localizeChangeText(change);
    if (!hasText(text) || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

function appendCurrentEventToTimeline() {
  if (!state.session?.currentEvent || isOpeningPreview(state.session)) return;
  appendTimelineEvent(state.session.currentEvent, "event");
}

function appendTimelineEvent(event, kind = "event") {
  if (!event) return;
  const entry = timelineEntryFromEvent(event, kind);
  if (!isRenderableTimelineEntry(entry) || hasTimelineEntry(entry)) return;
  state.lifeTimeline.push(entry);
}

function hasTimelineEntry(entry) {
  return state.lifeTimeline.some((item) => (
    item.kind === entry.kind
    && item.age === entry.age
    && item.turnId === entry.turnId
  ));
}

function timelineEntryFromEvent(event, kind) {
  return {
    kind,
    turnId: event.turnId ?? event.event?.eventId ?? `${kind}_${event.timeSpan?.ageEnd ?? "current"}_${event.playerText?.title ?? ""}`,
    age: event.timeSpan?.ageEnd ?? event.timeSpan?.ageStart,
    title: event.playerText?.title ?? responseTypeLabel(event.responseType),
    body: event.playerText?.body ?? "",
    changes: event.visibleChanges ?? [],
  };
}

function renderTalentSummaryCard(talent) {
  const name = talentDisplayName(talent);
  if (!name) return "";
  return `
    <details class="talent-summary-card">
      <summary>
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(rarityLabel(talent.rarity))}｜${escapeHtml(manifestationLabel(talent.manifestationType))}</span>
      </summary>
      <div class="talent-detail-body">
        <p><b>详细说明：</b>${escapeHtml(describeTalentDetail(talent))}</p>
        <p><b>点数加成：</b>${escapeHtml(describeTalentPointBonus(talent))}</p>
        <p><b>属性影响：</b>${escapeHtml(describeTalentAttributeImpact(talent))}</p>
        <p><b>剧情效果：</b>${escapeHtml(describeTalentStoryEffect(talent))}</p>
        <p><b>可能风险：</b>${escapeHtml(describeTalentRisk(talent))}</p>
        <p><b>显化说明：</b>${escapeHtml(describeTalentManifestationNote(talent))}</p>
      </div>
    </details>
  `;
}

function renderFateAttributeLines(run) {
  const allocation = run.setup?.allocation ?? {};
  return attrKeys.map((key) => {
    const baseLabel = attrLabels[key] ?? "未知属性";
    const worldSpecificLabel = attrLabel(key, run.worldId);
    const label = run.worldId === "cultivation" ? `${worldSpecificLabel}（${baseLabel}）` : baseLabel;
    const attr = run.player.attributes?.[key] ?? {};
    const base = allocation[key] ?? attr.base ?? 0;
    const ledger = run.player.growthLedger?.attributes?.[key] ?? {};
    const talentBonus = ledger.talentPotential ?? attr.talentPotential ?? attr.talentBonus ?? 0;
    const potential = ledger.potential ?? attr.potential ?? (base + talentBonus);
    const effective = ledger.effective ?? attr.effective ?? attr.manifested ?? 0;
    const realized = ledger.realized ?? attr.realized ?? attr.manifested ?? effective;
    const lockedPotential = ledger.lockedPotential ?? attr.lockedPotential ?? Math.max(0, potential - realized);
    // Show how talents lift each attribute (基础 + 天赋 = 潜能) and what is actually usable now.
    const potentialText = talentBonus > 0
      ? `潜能 ${potential}（基础 ${base} + 天赋 ${talentBonus}）`
      : `潜能 ${potential}（基础 ${base}）`;
    return `${label}：${potentialText}，当前 ${effective}，已兑现 ${realized}，年龄封存 ${lockedPotential}`;
  });
}

function parseOpeningSections(body) {
  const cleaned = String(body ?? "").trim();
  if (!cleaned) return { background: "", earlyLife: "" };
  const earlyMarker = "【早年自动推进】";
  const backgroundMarker = "【身世卡】";
  const earlyIndex = cleaned.indexOf(earlyMarker);
  const backgroundRaw = earlyIndex >= 0 ? cleaned.slice(0, earlyIndex) : cleaned;
  const earlyRaw = earlyIndex >= 0 ? cleaned.slice(earlyIndex + earlyMarker.length) : "";
  return {
    background: sanitizeFatePreviewText(backgroundRaw.replace(backgroundMarker, "")).trim(),
    earlyLife: sanitizeEarlyLifeText(earlyRaw).trim(),
  };
}

function sanitizeFatePreviewText(text) {
  const output = [];
  let skipping = false;
  let pendingBlank = false;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    const section = openingSectionName(trimmed);
    if (section) {
      const normalized = normalizeOpeningSectionName(section);
      if (isHiddenOpeningSection(normalized)) {
        skipping = true;
        pendingBlank = false;
        continue;
      }
      skipping = false;
      if (isRelationshipOpeningSection(normalized)) {
        skipping = true;
        pendingBlank = false;
        continue;
      }
      if (normalized === "身世卡") {
        pendingBlank = false;
        continue;
      }
      pushOpeningLine(output, line);
      pendingBlank = false;
      continue;
    }
    if (skipping) continue;
    const sanitized = sanitizeOpeningInlineLine(line);
    if (sanitized === null) continue;
    if (!sanitized.trim()) {
      pendingBlank = output.length > 0;
      continue;
    }
    if (pendingBlank && output.length > 0) output.push("");
    pushOpeningLine(output, sanitized);
    pendingBlank = false;
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n");
}

function sanitizeEarlyLifeText(text) {
  return String(text ?? "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^(未来伏笔|初始重要NPC|未解释细节|隐藏线索|hiddenHooks|unresolvedThreads)[:：]/i.test(trimmed);
    })
    .join("\n");
}

function sanitizeOpeningTimelineBody(body) {
  const text = sanitizeEarlyLifeText(body).trim();
  if (!text) return "";
  if (/[0-9零一二三四五六七八九十两]\s*岁/.test(text)) return "";
  if (/初始重要\s*NPC|未解释细节|出生与早年|早年自动推进|未来伏笔|hiddenHooks|unresolvedThreads/i.test(text)) return "";
  return text;
}

function openingTimelineTitleForAge(age, actionAge) {
  if (age === 0) return "出生底色";
  if (age === 1) return "依附与感知";
  if (age === 2) return "牙牙学语";
  if (age === 3) return "好奇初醒";
  if (age === 4) return "家庭边界";
  if (age === 5) return "性格成形";
  if (age === actionAge - 1) return "岔路前夜";
  return "缓慢成长";
}

function openingTimelineBodyFallback(session, age, actionAge) {
  const worldId = session?.run?.worldId;
  if (age === 0) {
    if (worldId === "cultivation") return "你出生时还只是襁褓中的孩子，家人能看见的不是完整天赋，而是气息、体温、哭声和周围灵气的细小异样。长辈没有把这些当成定论，只在照看你时更加谨慎。";
    if (worldId === "wasteland") return "你出生在资源紧张的环境里，最先决定命运的不是远大理想，而是水、药、暖处和监护人的判断。大人只把细微异样当成活下去的好兆头，暂时没人敢声张。";
    return "你出生在表面正常的城市生活里，医院、街区和家庭仍按普通逻辑运转。细微迹象没有立刻改变生活，只让家人多了几分无法说清的警惕。";
  }
  if (worldId === "cultivation") {
    if (age === 1) return "你开始认得家人的声音，也会被山风、符纸味和香火气吸引。大人只把这些当成孩子的敏感，没有让你接近真正的修行物。";
    if (age === 2) return "你能说出简单词句，常在大人提到仙门时安静下来。家里仍把你当作幼童照看，不会让你承担超出身体的事。";
    if (age === 3) return "你能稳稳走跑，也开始模仿长辈摆弄木枝、石子和草药。偶尔出现的专注只像小孩子的偏好，还不足以证明什么。";
    if (age === 4) return "你听得懂更多家中谈话，知道仙门既让人向往，也让人害怕。家人开始避开某些话题，免得你把不能说的事讲给外人。";
    if (age === 5) return "你能帮家里做一些轻巧杂事，也会在玩耍中显出更稳的手、更快的理解或更好的运气。天赋仍是苗头，不是可以随意使用的力量。";
    if (age >= actionAge - 1) return "你已经能理解家人的犹豫：平安留在凡尘，或冒险靠近仙门，都不再只是大人的闲谈。第一道真正需要表态的岔路正在靠近。";
    return "你的生活仍以家庭、村镇和简单学习为主。偶尔出现的异样会被家人压下，变成日常里不被外人知道的小心。";
  }
  if (worldId === "wasteland") {
    if (age === 1) return "你开始认得监护人的脚步和水袋碰撞声。废土没有给孩子太多浪漫，温暖、干净和安静已经是难得的保护。";
    if (age === 2) return "你会说一些简单词句，也学会在大人紧张时保持安静。食物、药和安全角落比玩具更常出现在你的生活里。";
    if (age === 3) return "你能在营地边缘走动，开始分辨熟人和陌生队伍。大人不会让你靠近危险，只让你记住几条最基本的规矩。";
    if (age === 4) return "你开始理解资源为什么会让人争吵，也知道某些门、箱子和武器不能随便碰。生存规则比道理更早进入你的生活。";
    if (age === 5) return "你能做一些轻巧活计，也会用自己的方式观察水、食物和人群的变化。能力仍很稚嫩，却已经影响大人如何安排你。";
    if (age >= actionAge - 1) return "你逐渐明白废土上的选择很少完全安全。留在保护里、学习求生，或接近某个机会，都将成为真正的分岔。";
    return "你的成长被营地秩序和资源压力塑造。多数日子没有大事，却都在教你分辨危险和依靠。";
  }
  if (age === 1) return "你开始认得熟悉的人声和房间气味。家人仍用普通生活照顾你，只在新闻或怪谈出现时悄悄换台。";
  if (age === 2) return "你会说简单的话，也会对某些声音、梦和陌生人的视线表现出异常安静。大人把这解释成敏感，没有让你接触更多信息。";
  if (age === 3) return "你开始在家中探索，记住一些大人以为你听不懂的停顿。世界仍像正常城市，只是偶尔有些话题会突然中断。";
  if (age === 4) return "你能分辨亲近的人何时紧张，也开始对反复出现的梦或新闻片段产生印象。家人仍希望你像普通孩子一样长大。";
  if (age === 5) return "你逐渐能把细节连起来，却还没有能力独自追查。普通生活仍能继续，异常只像影子一样贴在日常边缘。";
  if (age >= actionAge - 1) return "你已经能理解一些回避和谎言，也第一次意识到自己可以选择靠近、远离，或假装什么都没有发生。";
  return "你的生活大多仍是家庭、邻里和日常照看。某些不协调的细节被大人压低声音处理，没有成为公开秘密。";
}

function openingSectionName(trimmed) {
  const match = /^【([^】]+)】$/.exec(trimmed);
  return match?.[1];
}

function normalizeOpeningSectionName(name) {
  return String(name ?? "").replace(/\s+/g, "").toLowerCase();
}

function isRelationshipOpeningSection(name) {
  return ["初始重要npc", "初始npc", "初始重要人物", "初始关系", "人际关系"].includes(name);
}

function isHiddenOpeningSection(name) {
  return [
    "未解释细节",
    "未来伏笔",
    "隐藏线索",
    "隐藏伏笔",
    "出生与早年",
    "早年自动推进",
    "hiddenhooks",
    "unresolvedthreads",
  ].includes(name);
}

function sanitizeOpeningInlineLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (/^(未解释细节|未来伏笔|隐藏线索|隐藏伏笔|出生与早年|早年自动推进|hiddenHooks|unresolvedThreads)[:：]/i.test(trimmed)) return null;
  if (/^(?:\d+|[零一二三四五六七八九十两]+)\s*岁/.test(trimmed) || /^0\s*到\s*\d+\s*岁/.test(trimmed)) return null;
  if (/^(初始重要\s*NPC|初始重要人物|初始关系|人际关系)\s*[:：]/i.test(trimmed)) return null;
  return line;
}

function pushOpeningLine(output, line) {
  const value = String(line ?? "").trimEnd();
  if (!value.trim() && output.at(-1) === "") return;
  output.push(value);
}

function openingTimelineFallback(session) {
  const ageEnd = session?.currentEvent?.timeSpan?.ageEnd ?? session?.run?.player?.age ?? 7;
  const preview = parseOpeningSections(session?.currentEvent?.playerText?.body ?? "").background;
  return [
    "你出生后的生活没有立刻交到你手里。家庭、世界规则和天赋迹象先塑造了你最初的处境。",
    preview || "你的身世、家庭和天赋已经形成最初底色。",
    `到 ${ageEnd} 岁前后，你逐渐有了基本行动能力，第一个真正需要自己表态的人生分岔开始靠近。`,
  ].join("\n\n");
}

function splitOpeningBody(body, timeSpan = {}) {
  const ageStart = timeSpan.ageStart ?? 0;
  const ageEnd = timeSpan.ageEnd ?? 7;
  const cleaned = String(body ?? "").trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const buckets = parts.length >= 2 ? parts : splitLongText(cleaned, 3);
  const midAge = Math.max(ageStart + 1, Math.floor((ageStart + ageEnd) / 2));
  const stageTitles = [
    { age: ageStart, title: `${ageStart} 岁：出生底色` },
    { age: midAge, title: `${ageStart + 1}-${Math.max(ageStart + 1, ageEnd - 2)} 岁：家庭与天赋初显` },
    { age: ageEnd, title: `${ageEnd} 岁：第一道岔路前` },
  ];
  return buckets.slice(0, 3).map((bodyPart, index) => ({
    age: stageTitles[index]?.age ?? ageEnd,
    title: stageTitles[index]?.title ?? `${ageEnd} 岁前：早年推进`,
    body: bodyPart,
  })).filter((entry) => hasText(entry.body));
}

function splitLongText(text, maxParts) {
  const sentences = String(text ?? "").split(/(?<=[。！？!?])\s*/).map((item) => item.trim()).filter(Boolean);
  if (sentences.length <= maxParts) return sentences.length ? sentences : [text.trim()].filter(Boolean);
  const groups = Array.from({ length: maxParts }, () => []);
  sentences.forEach((sentence, index) => groups[Math.min(maxParts - 1, Math.floor(index * maxParts / sentences.length))].push(sentence));
  return groups.map((group) => group.join("")).filter(Boolean);
}

function renderTimeline() {
  if (!els.timeline) return;
  els.timeline.innerHTML = state.lifeTimeline.filter(isRenderableTimelineEntry).map(renderTimelineEntry).join("");
}

function renderTimelineEntry(entry) {
  if (!isRenderableTimelineEntry(entry)) return "";
  const bodyHtml = hasText(entry.body) ? `<p>${escapeHtml(entry.body)}</p>` : "";
  const changesHtml = hasVisibleChanges(entry.changes) ? `<div class="changes">${renderVisibleChanges(entry.changes)}</div>` : "";
  return `
    <article class="timeline-entry timeline-${escapeHtml(entry.kind)}">
      <div class="timeline-age">${escapeHtml(entry.age === undefined ? "当前" : `${entry.age} 岁`)}</div>
      <div class="timeline-content">
        <h3>${escapeHtml(entry.title)}</h3>
        ${bodyHtml}
        ${changesHtml}
      </div>
    </article>
  `;
}

function scrollToCurrentNode() {
  els.currentNode?.scrollIntoView({ behavior: "smooth", block: "end" });
}

function renderResolution() {
  els.resolutionPanel.hidden = true;
  els.resolutionMeta.textContent = "行动后果";
  els.resolutionTitle.textContent = "";
  els.resolutionBody.textContent = "";
  els.resolutionChanges.innerHTML = "";
}

function renderEvent(event, session) {
  els.runMeta.textContent = `${session.run.player.name}｜${worldLabel(session.run.worldId)}｜${session.run.player.age} 岁`;
  const hasEventContent = event && (hasText(event.playerText?.title) || hasText(event.playerText?.body) || hasVisibleChanges(event.visibleChanges) || (event.choices ?? []).length > 0);
  els.eventCard.hidden = !hasEventContent;
  if (els.currentNodeAge) els.currentNodeAge.textContent = hasEventContent ? `${eventAgeLabel(event, session)} 岁` : "当前";
  if (!hasEventContent) {
    els.eventTitle.textContent = "";
    els.eventBody.textContent = "";
    els.visibleChanges.innerHTML = "";
    els.choices.innerHTML = "";
    return;
  }
  const age = eventAgeLabel(event, session);
  els.eventTitle.textContent = formatEventTitle(event.playerText?.title, age, event.playerText?.body, { includeAge: false });
  els.eventBody.textContent = event.playerText?.body ?? "";
  els.eventBody.hidden = !hasText(event.playerText?.body);
  // The current node is the unresolved branch the player is deciding, not a settled outcome.
  // Do not show "+X" consequence chips on it; changes appear only after the action resolves
  // (merged into the corresponding lived timeline node). The event keeps its visibleChanges, so
  // once it scrolls into history as a past timeline node, the change is shown there.
  const isUnresolvedBranch = event.interactionMode === "playable_choices";
  els.visibleChanges.innerHTML = (!isUnresolvedBranch && hasVisibleChanges(event.visibleChanges)) ? renderVisibleChanges(event.visibleChanges) : "";
  els.freeformInput.disabled = state.loading || session.ended || event.freeform?.allowed === false;
  els.freeformButton.disabled = state.loading || session.ended || session.pendingFreeformConfirmation || event.freeform?.allowed === false;

  if (event.interactionMode === "freeform_confirmation") {
    els.choices.innerHTML = `
      <button class="choice-button" data-confirm="confirm">确认，把它作为尝试行动执行</button>
      <button class="choice-button" data-confirm="cancel">取消，回到上一个事件</button>
    `;
    for (const button of els.choices.querySelectorAll("button")) {
      button.addEventListener("click", () => withBusy(button, () => confirmFreeform(button.dataset.confirm)));
    }
    disableInteractiveWhileLoading();
    return;
  }

  if (event.interactionMode !== "playable_choices") {
    els.choices.innerHTML = "";
    disableInteractiveWhileLoading();
    return;
  }

  els.choices.innerHTML = (event.choices ?? [])
    .map((choice, index) => `
      <button class="choice-button" data-choice="${escapeHtml(choice.id)}">
        ${index + 1}. ${escapeHtml(choice.text)}
        <span class="choice-meta">${escapeHtml(formatChoiceMeta(choice))}</span>
      </button>
    `)
    .join("");
  for (const button of els.choices.querySelectorAll("button")) {
    button.addEventListener("click", () => withBusy(button, () => submitChoice(button.dataset.choice)));
  }
  disableInteractiveWhileLoading();
}

function renderRun(run) {
  const panelViews = currentPanelViews();
  const mainPanel = panelViews?.main;
  const storyPanel = panelViews?.story;
  const lines = mainPanel?.summaryLines?.length
    ? [...mainPanel.summaryLines]
    : [
      `${run.player.name} · ${run.player.age}岁 · ${worldLabel(run.worldId)}`,
    ];

  if (run.ending?.completed) {
    lines.push(`人生结局：${run.ending.name ?? "已结算"}｜总评 ${run.ending.score ?? run.score ?? 0}`);
  }
  void storyPanel;

  const talentPositionLine = renderTalentPositionLine(run.player.talents ?? [], run.worldId);
  els.runSummary.innerHTML = [
    ...lines.map((line) => `<div class="summary-line">${escapeHtml(line)}</div>`),
    talentPositionLine ? `<div class="summary-line">${escapeHtml(talentPositionLine)}</div>` : "",
    renderSummaryTalents(run.player.talents ?? []),
    renderSummaryAttributes(panelViews?.attributes, run.player.attributes, run.worldId, run.player.growthLedger),
    `<div class="summary-line">${escapeHtml(renderNpcLine(run.importantNPCs ?? []))}</div>`,
    `<div class="summary-line">${escapeHtml(renderFactionLine(run.factions ?? []))}</div>`,
  ].join("");
}

function currentPanelViews(session) {
  if (!session) return state.session?.panelViews ?? state.session?.run?.panelViews ?? {};
  return session?.panelViews ?? session?.run?.panelViews ?? {};
}

function renderVisibleChanges(changes = []) {
  return (changes ?? [])
    .filter((change) => hasText(localizeChangeText(change)))
    .map((change) => `<div class="change">${escapeHtml(localizeChangeText(change))}</div>`)
    .join("");
}

function isRenderableTimelineEntry(entry) {
  return Boolean(entry && (hasText(entry.title) || hasText(entry.body) || hasVisibleChanges(entry.changes)));
}

function hasVisibleChanges(changes) {
  return Array.isArray(changes) && changes.some((change) => hasText(localizeChangeText(change)));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function localizeChangeText(change) {
  const worldId = state.session?.run?.worldId;
  const text = change?.text;
  if (typeof text === "string" && text.trim()) return localizeAttributeTokens(text, worldId);
  if (change?.type === "attribute") {
    const amount = typeof change.amount === "number" ? signed(change.amount) : "";
    return `${attrLabel(change.target, worldId)} ${amount}`.trim();
  }
  if (change?.type === "progression" || change?.type === "world_state") {
    const amount = typeof change.amount === "number" ? signed(change.amount) : "";
    const value = change.currentValue ?? change.value;
    const valueText = value === undefined ? "" : progressValueLabel(value);
    return `${progressLabel(change.target)} ${amount || valueText}`.trim();
  }
  if (change?.type === "relationship") return "重要人物关系发生变化";
  if (change?.type === "score") return `评分 ${signed(change.amount ?? change.currentValue ?? 0)}`;
  return "状态发生变化";
}

// Backend visible-change text can leak raw English attribute keys (e.g. "intelligence +2") when
// the AI omits Chinese text and the engine falls back to the bare target. Replace any such token
// with its localized label so it never reaches the player. Word-boundary matched so it does not
// corrupt surrounding Chinese prose.
function localizeAttributeTokens(text, worldId) {
  return String(text).replace(/\b(appearance|intelligence|constitution|familyBackground|luck)\b/g, (key) => attrLabel(key, worldId));
}

function formatResolutionMeta(resolution) {
  const parts = [];
  if (resolution.responseType) parts.push(responseTypeLabel(resolution.responseType));
  if (resolution.freeform?.interpretedAction) parts.push(`自由行动：${resolution.freeform.interpretedAction}`);
  if (resolution.freeform?.riskLevel) parts.push(`风险：${riskLabel(resolution.freeform.riskLevel)}`);
  return parts.join(" / ") || "行动后果";
}

function renderSummaryAttributes(attributePanel, attributes, worldId, growthLedger) {
  if (attributePanel?.groups?.length) {
    return renderAttributeGrowthPanel(attributePanel);
  }

  if (attributePanel?.attributes?.length) {
    const items = attributePanel.attributes.map((attribute) => `
      <div class="attribute-summary-row">
        <strong>${escapeHtml(attribute.name)}</strong>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.manifested)}">当前</button> ${escapeHtml(attribute.current ?? 0)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.realized)}">显化</button> ${escapeHtml(attribute.manifested ?? attribute.realized ?? 0)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.potential)}">潜能</button> ${escapeHtml(attribute.potential ?? 0)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.lockedPotential)}">年龄封存</button> ${escapeHtml(attribute.ageSealed ?? attribute.locked ?? 0)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.exposure)}">关注</button> ${escapeHtml(attribute.exposure ?? 0)}</span>
        <span>${escapeHtml(attribute.peerLabel ?? "")}</span>
        <span>${escapeHtml(attribute.potentialLabel ?? "")}</span>
        <span>${escapeHtml(attribute.exposureLabel ?? "")}</span>
      </div>
    `).join("");
    return `<div class="summary-block"><h3>${escapeHtml(attributePanel.title ?? "当前属性")}</h3><div class="attribute-summary-list">${items}</div></div>`;
  }

  const items = attrKeys.map((key) => {
    const attr = attributes[key] ?? {};
    const ledger = growthLedger?.attributes?.[key] ?? {};
    const current = ledger.effective ?? attr.effective ?? attr.manifested ?? 0;
    const realized = ledger.realized ?? attr.realized ?? attr.manifested ?? current;
    const potential = ledger.potential ?? attr.potential ?? 0;
    const lockedPotential = ledger.lockedPotential ?? attr.lockedPotential ?? Math.max(0, potential - realized);
    const exposure = ledger.exposure ?? attr.exposure ?? 0;
    return `
      <div class="attribute-summary-row">
        <strong>${escapeHtml(attrLabel(key, worldId))}</strong>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.manifested)}">当前</button> ${escapeHtml(current)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.realized)}">已兑现</button> ${escapeHtml(realized)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.potential)}">潜能</button> ${escapeHtml(potential)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.lockedPotential)}">年龄封存</button> ${escapeHtml(lockedPotential)}</span>
        <span><button class="inline-help" type="button" title="${escapeHtml(attributeHelpText.exposure)}">关注</button> ${escapeHtml(exposure)}</span>
      </div>
    `;
  }).join("");
  return `<div class="summary-block"><h3>当前属性</h3><div class="attribute-summary-list">${items}</div></div>`;
}

function renderAttributeGrowthPanel(attributePanel) {
  const header = attributePanel.header ?? {};
  const groups = (attributePanel.groups ?? []).map((group) => renderAttributeGroup(group)).join("");
  return `
    <div class="summary-block attribute-growth-panel">
      <div class="attribute-growth-header">
        <h3>${escapeHtml(attributePanel.title ?? "成长显化面板")}</h3>
        <p>${escapeHtml(header.characterLine ?? "")}</p>
        <p>成长阶段：${escapeHtml(header.growthStage ?? attributePanel.growthStage ?? "")}${header.coreTalent ? ` · 核心天赋：${escapeHtml(header.coreTalent)}` : ""}</p>
      </div>
      ${groups}
    </div>
  `;
}

function renderAttributeGroup(group) {
  if (Array.isArray(group.cards) && group.cards.length > 0) {
    return `
      <section class="attribute-group">
        <h4>${escapeHtml(group.title ?? "")}</h4>
        <div class="attribute-growth-grid">
          ${group.cards.map((card) => renderAttributeGrowthCard(card)).join("")}
        </div>
      </section>
    `;
  }

  if (Array.isArray(group.items) && group.items.length > 0) {
    return `
      <section class="attribute-group">
        <h4>${escapeHtml(group.title ?? "")}</h4>
        <div class="cultivation-progress-list">
          ${group.items.map((item) => `
            <div class="cultivation-progress-item">
              <span>${escapeHtml(item.name)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  return "";
}

function renderAttributeGrowthCard(card) {
  const ratio = clampPercent(card.manifestedRatio);
  return `
    <article class="attribute-growth-card">
      <div class="attribute-card-head">
        <div>
          <strong>${escapeHtml(card.name)}</strong>
          <span>${escapeHtml(card.currentLabel ?? "当前表现")} ${escapeHtml(card.current ?? 0)}｜${escapeHtml(card.peerLabel ?? "")}</span>
        </div>
        <div class="potential-badge">
          <span>${escapeHtml(card.potentialLabel ?? "潜质")}</span>
          <strong>${escapeHtml(card.potential ?? 0)}</strong>
        </div>
      </div>
      <div class="manifestation-progress" aria-label="${escapeHtml(card.manifestedLabel ?? "显化进度")}">
        <div class="manifestation-progress-row">
          <span>${escapeHtml(card.manifestedLabel ?? "显化进度")}</span>
          <strong>${escapeHtml(card.manifested ?? 0)} / ${escapeHtml(card.manifestedMax ?? card.potential ?? 0)}</strong>
        </div>
        <div class="manifestation-progress-track">
          <span class="manifestation-progress-fill" style="width: ${ratio}%"></span>
        </div>
      </div>
      <div class="attribute-card-metrics">
        <span class="age-sealed">${escapeHtml(card.ageSealTitle ?? "年龄封存")} ${escapeHtml(card.ageSealed ?? 0)}｜${escapeHtml(card.ageSealLabel ?? "")}</span>
        <span>${escapeHtml(card.exposureTitle ?? "外界关注")} ${escapeHtml(card.exposureLabel ?? "")}</span>
      </div>
    </article>
  `;
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function renderSummaryTalents(talents) {
  if (!talents.length) return "";
  return `
    <div class="summary-block">
      <h3>天赋</h3>
      <div class="summary-talent-list">
        ${talents.map((talent) => renderTalentSummaryCard(talent)).filter(Boolean).join("")}
      </div>
    </div>
  `;
}

function renderProgressLines(progress) {
  const entries = Object.entries(progress);
  if (entries.length === 0) return ["世界进度：暂无明显变化"];
  return entries.map(([key, value]) => `${progressLabel(key)}：${progressValueLabel(value)}`);
}

function renderNpcLine(npcs) {
  if (npcs.length === 0) return "重要人物：暂无";
  return `重要人物：${npcs.length} 位已记录，关系会随人生推进变化`;
}

function renderFactionLine(factions) {
  if (factions.length === 0) return "势力关系：暂无";
  return `势力关系：${factions.length} 个势力已记录`;
}

function describeTalentAttributeImpact(talent) {
  const parts = [];
  if (talent.effects?.growthMultiplier) parts.push("成长收益提高");
  if (talent.effects?.breakthroughBonus) parts.push("突破收益提高");
  if (hasTalentPointBonus(talent)) parts.push("点数进入天赋潜能，并会按年龄、训练、环境和剧情逐步显化为当前表现");
  return parts.length ? parts.join("；") : "主要改变命运倾向、判定权重或隐藏路线。";
}

function describeTalentPointBonus(talent) {
  const bonuses = talentPointBonuses(talent);
  const parts = Object.entries(bonuses)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => `${attrLabel(key, currentWorldId())} ${signed(value)}`);
  return parts.length ? parts.join("；") : "无直接开局点数加成";
}

function hasTalentPointBonus(talent) {
  return Object.values(talentPointBonuses(talent)).some((value) => Number(value) !== 0);
}

function talentPointBonuses(talent) {
  return talent.effects?.attributePotential ?? talentAttributePotentialBonuses[talent.id] ?? {};
}

function currentWorldId() {
  return state.session?.run?.worldId ?? state.preview?.worldId ?? els.worldSelect?.value;
}

function describeTalentDetail(talent) {
  const name = talentDisplayName(talent) || "这个天赋";
  const tags = new Set(talent.tags ?? []);
  if (tags.has("spirit_root")) return `${name}代表你与天地灵气存在稳定亲和。早年可能只是体温、气息、符纸反应或梦境细节，真正价值要等检测、修炼或关键事件后才会被确认。`;
  if (tags.has("sword")) return `${name}会让你在锋芒、战斗直觉或剑道理解上更敏锐。它不是出生就会挥剑无敌，而是在练习、危机和师承中逐步显出差异。`;
  if (tags.has("alchemy") || tags.has("herb")) return `${name}让你更容易分辨药性、气味、草木变化或炼丹细节。它适合资源、医药、宗门后勤和特殊机缘路线。`;
  if (tags.has("dream") || tags.has("truth")) return `${name}会让你更容易注意梦、记忆、新闻和人群反应中的异常。它能提供线索，也可能让你更早接近危险真相。`;
  if (tags.has("survival") || tags.has("wasteland")) return `${name}会提高你在恶劣环境中抓住机会的能力。它通常表现为习惯、直觉、资源嗅觉或对危险的提前反应。`;
  if (tags.has("destiny") || tags.has("luck") || talent.manifestationType === "hidden_destiny") return `${name}更多影响命运倾向而不是眼前能力。它会让巧合、转机、贵人或大事件更容易围绕你发生，但不会保证永远安全。`;
  if (talent.rarity === "mythic" || talent.rarity === "legendary") return `${name}属于足以改变一生路线的高阶天赋。早年只会出现有限迹象，真正影响会随着年龄、行动、世界压力和关键选择逐步展开。`;
  return `${name}会改变你的成长倾向、事件判定和别人对你的反应。它的效果需要结合年龄、当前表现、世界规则和玩家选择来显化。`;
}

function describeTalentStoryEffect(talent) {
  const effects = talent.effects ?? {};
  const tags = new Set(talent.tags ?? []);
  const parts = [];
  if (effects.progressionModifiers) parts.push("更容易推动世界专属进度或进入对应路线");
  if (effects.growthAfterMajorFailure) parts.push("重大失败后可能触发成长、复起或转折");
  if (effects.rewriteMajorFailurePerRun) parts.push("每局可能改写一次重大失败");
  if (effects.systemAdaptability) parts.push("适应不同力量体系、学习与成长更顺");
  if (tags.has("cultivation") || tags.has("spirit_root")) parts.push("更容易感知灵气、理解功法或被修行势力注意");
  if (tags.has("cthulhu") || tags.has("dream") || tags.has("truth")) parts.push("更容易察觉异常线索，也更容易接近世界真相");
  if (tags.has("wasteland") || tags.has("survival")) parts.push("更容易在资源、环境和生存压力中找到机会");
  return parts.length ? unique(parts).join("；") : `${manifestationLabel(talent.manifestationType)}，会随年龄、环境和关键事件逐步影响剧情。`;
}

function describeTalentRisk(talent) {
  const effects = talent.effects ?? {};
  const exposure = Number(talent.exposure ?? effects.exposure ?? 0);
  const manifestation = talent.manifestationType;
  const risks = [];
  if (manifestation === "immediate" || exposure >= 50) risks.push("开局就可能被家人、势力、机构或危险存在注意");
  if (manifestation === "conditional") risks.push("触发条件往往伴随失败、濒死、污染、冲突或命运转折");
  if (manifestation === "hidden_destiny") risks.push("外表安全，但关键事件更容易把你卷入深层因果");
  if (effects.majorKarmaAttraction) risks.push("更容易吸引重大因果、争夺、嫉妒或不可控事件");
  if (talent.rarity === "legendary" || talent.rarity === "mythic") risks.push("高稀有度天赋一旦暴露，可能引来保护、利用、研究或夺取");
  return risks.length ? unique(risks).join("；") : "风险较低，但仍会受世界规则、暴露程度和人际关系影响。";
}

function describeTalentManifestationNote(talent) {
  const manifestation = talent.manifestationType;
  if (manifestation === "immediate") {
    return "从出生或幼年就会留下明显迹象，但仍受年龄、身体和当前处境限制，不代表潜能已经完全展开。";
  }
  if (manifestation === "stage") {
    return "会随年龄、训练、学习、环境和关键人生阶段逐步表现，早年通常只是细节和倾向。";
  }
  if (manifestation === "conditional") {
    return "平时不一定明显，往往在压力、危机、转折或特殊经历中显出效果；具体触发不会在普通界面剧透。";
  }
  if (manifestation === "hidden_destiny") {
    return "外界很难直接看出异常，但命运倾向会在长期选择、偶然转机和关键事件中慢慢显影。";
  }
  return "显化节奏由年龄、世界规则、天赋类型和剧情合理性共同决定。";
}

async function api(url, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }
  return payload;
}

async function withBusy(button, fn) {
  const previous = button.disabled;
  state.loading = true;
  button.disabled = true;
  renderLoading();
  disableInteractiveWhileLoading();
  try {
    await fn();
  } catch (error) {
    toast(`命运暂时迷失，请重试。${error instanceof Error ? ` ${error.message}` : ""}`);
  } finally {
    state.loading = false;
    button.disabled = previous;
    updatePointTotal();
    updateTalentCount();
    if (state.session) {
      const opening = isOpeningPreview(state.session);
      els.freeformButton.disabled = opening || state.session.ended || state.session.pendingFreeformConfirmation;
      els.saveButton.disabled = false;
      renderSession();
    }
    renderLoading();
    renderDevPanel();
  }
}

function renderLoading() {
  if (!els.loadingIndicator) return;
  els.loadingIndicator.hidden = !state.loading;
  disableInteractiveWhileLoading();
}

function disableInteractiveWhileLoading() {
  const session = state.session;
  const opening = isOpeningPreview(session);
  const disabled = Boolean(state.loading);
  for (const button of document.querySelectorAll(".choice-button")) {
    button.disabled = disabled;
  }
  if (els.beginLifeButton) els.beginLifeButton.disabled = disabled || !opening || session?.ended;
  if (els.freeformInput) els.freeformInput.disabled = disabled || opening || session?.ended || session?.currentEvent?.freeform?.allowed === false;
  if (els.freeformButton) els.freeformButton.disabled = disabled || opening || session?.ended || session?.pendingFreeformConfirmation || session?.currentEvent?.freeform?.allowed === false;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function worldLabel(id) {
  return worldLabels[id] ?? "未知世界";
}

function aiModeLabel(id) {
  return aiModeLabels[id] ?? "AI 接口";
}

function genderLabel(id) {
  return genderLabels[id] ?? "不指定";
}

function personalityLabel(id) {
  return personalityLabels[id] ?? "由 AI 生成";
}

function rarityLabel(id) {
  return rarityLabels[id] ?? "未知稀有度";
}

function manifestationLabel(id) {
  return manifestationLabels[id] ?? "未知显化方式";
}

function talentLabel(id) {
  return talentNameLabels[id] ?? "";
}

function talentDisplayName(talent) {
  const candidates = [
    talent?.name,
    talent?.playerVisibleName,
    talentLabel(talent?.id),
  ];
  return candidates.find((value) => hasSafePlayerLabel(value)) ?? "";
}

function attrLabel(id, worldId) {
  if (worldId === "cultivation" && cultivationAttrLabels[id]) return cultivationAttrLabels[id];
  return attrLabels[id] ?? "未知属性";
}

function progressLabel(id) {
  return progressLabels[id] ?? "世界进度";
}

function responseTypeLabel(id) {
  return responseTypeLabels[id] ?? "命运片段";
}

function riskLabel(id) {
  return riskLabels[id] ?? "结果难以判断";
}

function progressValueLabel(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "是" : "否";
  if (value && typeof value === "object") return "已记录";
  return progressValueLabels[value] ?? "已变化";
}

function npcLabel(npc) {
  const visibleRole = npc?.playerVisible?.label ?? npc?.playerVisible?.publicRole ?? npc?.knownIdentity?.role ?? npc?.roleLabel;
  if (hasText(visibleRole) && !looksLikeInternalId(visibleRole)) return visibleRole;
  const templateLabel = npcTemplateLabels[npc?.templateId];
  if (templateLabel) return templateLabel;
  const raw = `${npc?.knownIdentity?.role ?? ""} ${npc?.templateId ?? ""}`.toLowerCase();
  for (const [key, label] of Object.entries(npcRoleLabels)) {
    if (raw.includes(key)) return label;
  }
  return "";
}

function isHiddenNpcForPlayer(npc) {
  if (npc?.playerVisible?.discovered === true) return false;
  const text = `${npc?.role ?? ""} ${(npc?.roleTags ?? []).join(" ")} ${npc?.templateId ?? ""}`.toLowerCase();
  return /hidden|secret|spy|possessor|experimenter|cult|official|enemy|threat|deceiver|demonic|remnant|research|raider|warlord/.test(text);
}

function relationshipLabel(value) {
  if (typeof value === "number") {
    if (value >= 70) return "亲近";
    if (value >= 45) return "友善";
    if (value >= 20) return "普通";
    if (value <= -40) return "敌对";
    if (value <= -10) return "疏远";
    return "微妙";
  }
  const map = {
    protective: "保护",
    caring: "关心",
    wary: "戒备",
    distant: "疏远",
    hostile: "敌对",
    neutral: "普通",
    curious: "好奇",
  };
  return map[value] ?? "关系已建立";
}

function mapAttributes(attributes, field) {
  return Object.fromEntries(attrKeys.map((key) => [key, attributes?.[key]?.[field] ?? 0]));
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function signed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number >= 0 ? `+${number}` : String(number);
}

function looksLikeInternalId(value) {
  return /^[a-z][a-z0-9_-]*$/i.test(String(value ?? "").trim());
}

function hasSafePlayerLabel(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (looksLikeInternalId(text)) return false;
  if (/未命名天赋|未知天赋|重要人物|未知身份/i.test(text)) return false;
  return true;
}

function renderTalentPositionLine(talents, worldId) {
  const name = talents.map((talent) => talentDisplayName(talent)).filter(Boolean)[0];
  if (!name) return "";
  const firstTalent = talents.find((talent) => talentDisplayName(talent));
  const pointBonus = firstTalent ? describeTalentPointBonus(firstTalent) : "";
  const bonusText = pointBonus && pointBonus !== "无直接开局点数加成" ? `｜点数加成：${pointBonus}` : "｜点数加成：无直接开局点数加成";
  return `天赋：${name}${bonusText}`;
}

function eventAgeLabel(event, session) {
  const age = event?.timeSpan?.ageEnd ?? event?.timeSpan?.ageStart ?? session?.run?.player?.age;
  return Number.isFinite(age) ? age : session?.run?.player?.age ?? 0;
}

function formatEventTitle(title, age, body, options = {}) {
  const raw = String(title ?? "").trim().replace(/^(?:\d+|[零一二三四五六七八九十两]+)\s*岁\s*[:：、-]?\s*/, "");
  const clean = isGenericPlayableTitle(raw) ? "" : raw;
  const eventTitle = clean || deriveEventTitleFromBody(body);
  return options.includeAge === false ? eventTitle : `${age} 岁：${eventTitle}`;
}

function formatChoiceMeta(choice) {
  const intent = sanitizeChoiceOutcomeLabel(choice?.fuzzySuccessLabel);
  const risk = riskLabel(choice?.riskLabel);
  // Show a single natural risk/difficulty hint, not a judgment-table style "A / B" pair.
  // Prefer the AI's fuzzy label; fall back to the risk-band label only when the fuzzy label
  // is missing or reads like an action/intent summary.
  if (intent && !isChoiceIntentNarration(intent)) return intent;
  return risk;
}

function sanitizeChoiceOutcomeLabel(value) {
  const text = String(value ?? "").trim();
  if (!text) return "结果难以预料";
  if (/^成功率/.test(text)) return text.replace(/^成功率/, "可能性");
  if (/^成功/.test(text)) return text.replace(/^成功(?:地)?/, "尝试").trim() || "结果难以预料";
  if (/成功(?:获取|获得|隐藏|套取|击败|说服|逃脱|完成|进入|发现|掌控|解决)/.test(text)) return "结果难以预料";
  if (/必定|一定|保证|直接成功|必然/.test(text)) return "结果难以预料";
  return text;
}

function deriveEventTitleFromBody(body) {
  const text = String(body ?? "").replace(/\s+/g, "");
  if (/瘟疫|疫病|病/.test(text) && /玉片|玉/.test(text)) return "玉片与病势";
  if (/母亲|父亲|家人|监护/.test(text) && /交易|换|药|丹药/.test(text)) return "家中的抉择";
  if (/竹林|林中|树林/.test(text) && /珠|红光|暗红/.test(text)) return "竹林里的异物";
  if (/母亲|父亲|家人|监护/.test(text) && /争执|商量|犹豫|分歧/.test(text)) return "家中的分歧";
  if (/宗门|仙门|修士|灵根/.test(text)) return "仙缘初近";
  if (/梦|医院|失踪|怪谈|官方/.test(text)) return "平静下的异常";
  if (/水源|口粮|辐射|营地|拾荒/.test(text)) return "生存的压力";
  return "眼前的抉择";
}

function isChoiceIntentNarration(value) {
  return /说服|交易|跟踪|获取|获得|找到|发现|隐藏|套取|击败|逃脱|完成|进入|掌控|解决|保持警惕|替代药材|线索/.test(String(value ?? ""));
}

function isGenericPlayableTitle(value) {
  const text = String(value ?? "").trim();
  return !text || /^(人生事件|人生片段|命运片段|事件|命运的岔道|当前事件|新的事件|选择时刻|生活事件)$/.test(text);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
