import { FORBIDDEN_PLAYER_TEXT_TERMS } from "./player-text-guard.js";

export const OBSERVABLE_YEAR_DELTA_SCHEMA_VERSION = "mvp.observable_year_delta.v1";

const SLOT_TEXT = {
  family_boundary: {
    title: "家里的新边界",
    text: "家人重新划定你能做什么、能问什么、能接触谁。",
    requiredDelta: "家庭边界和照看方式发生变化",
    choices: ["先照家里的新规矩做", "找机会把自己的感受说清楚", "留意家人为何突然改变边界"],
  },
  household_responsibility: {
    title: "家务里的新责任",
    text: "家里交给你一件新的日常责任，让普通生活先发生具体变化。",
    requiredDelta: "家庭责任或日常分工发生变化",
    choices: ["先把新责任做好", "主动问清这件事背后的原因", "观察谁因此轻松或更紧张"],
  },
  learning_path: {
    title: "新的学习安排",
    text: "学习安排发生变化，你接触到的人、书本或日常节奏也随之改变。",
    requiredDelta: "学习路径发生变化",
    choices: ["按新的学习安排做下去", "向教你的人多问几句", "和家人商量这条学习路是否合适"],
  },
  peer_relationship: {
    title: "同龄人的新眼光",
    text: "同龄人对你的态度发生变化，日常相处不再和从前一样。",
    requiredDelta: "至少一个同龄人对主角态度发生变化",
    choices: ["维持普通相处", "单独找一个同龄人说话", "顺着这些目光找出传闻源头"],
  },
  mentor_attention: {
    title: "先生的留意",
    text: "一位先生、长辈或可信的大人开始更认真地看待你。",
    requiredDelta: "一位可信大人对你的态度、照看或指导方式发生变化",
    choices: ["先照对方安排认真做", "找机会问清对方为什么留意你", "回家和父母商量这份关注"],
  },
  body_growth: {
    title: "身体成长留下痕迹",
    text: "身体、精力或行动范围出现可观察变化，家人不得不重新安排你的日常。",
    requiredDelta: "身体承载或行动范围发生变化",
    choices: ["稳妥适应新的身体变化", "主动承担一点力所能及的事", "把异常反应告诉可信的大人"],
  },
  health_or_care: {
    title: "照护方式改变",
    text: "睡眠、体温、伤病或精神状态被认真看见，照护方式随之调整。",
    requiredDelta: "照护或休养安排发生变化",
    choices: ["按新的照护方式休养", "告诉家人你真实的感受", "留意身体反应何时加重"],
  },
  village_social_life: {
    title: "日常里的新位置",
    text: "邻里、街坊、营地或村中日常关系改变了你在群体里的位置。",
    requiredDelta: "普通社交生活中的位置发生变化",
    choices: ["继续维持日常礼数", "主动帮一个熟人做小事", "观察谁最在意你的变化"],
  },
  talent_subtle_manifestation: {
    title: "轻微异样落到日常",
    text: "天赋只能以轻微方式影响日常，让身边人产生小范围反应。",
    requiredDelta: "天赋以轻微、可观察、非无敌的方式进入日常",
    choices: ["把异样压在普通日常里", "记录异样出现的时机", "告诉可信的大人一点真实感受"],
  },
  external_attention: {
    title: "外来目光改变日常",
    text: "外部力量或陌生目光靠近，让家庭、学校、村里或营地不能再照旧运转。",
    requiredDelta: "外界关注改变日常安排",
    choices: ["先观察外来者的目的", "听从家人或照护者安排", "谨慎试探对方知道多少"],
  },
};

const ASSET_TEXT = {
  jade_token: { label: "那件旧物", textSignals: ["玉片", "旧物"] },
  jade_talisman: { label: "那件旧物", textSignals: ["玉片", "旧物"] },
  jade_slip: { label: "那枚玉简", textSignals: ["玉简", "旧物"] },
  back_mountain: { label: "后山那件旧事", textSignals: ["后山"] },
  bamboo_forest: { label: "竹林那件旧事", textSignals: ["竹林"] },
  scripture_pavilion: { label: "藏书阁那条旧闻", textSignals: ["藏书阁"] },
  sect_mine: { label: "矿场那段旧闻", textSignals: ["矿场"] },
  white_deer: { label: "白鹿那段旧闻", textSignals: ["白鹿"] },
  old_booklet: { label: "那本旧册子", textSignals: ["册子", "书册", "薄册"] },
};

export function compileObservableYearDelta({ annualFactPackage = {} } = {}) {
  const slotText = annualFactPackage.primaryDelta?.eventShape === "institution_arrival_changes_life"
    ? institutionArrivalText()
    : slotTextFor(annualFactPackage.curriculumSlot);
  return {
    schemaVersion: OBSERVABLE_YEAR_DELTA_SCHEMA_VERSION,
    age: Number(annualFactPackage.age ?? 0),
    titleSeed: slotText.title,
    primaryHumanChange: {
      title: slotText.title,
      text: slotText.text,
      requiredDelta: annualFactPackage.requiredHumanDelta || slotText.requiredDelta,
    },
    worldFlavor: {
      role: "secondary",
      text: worldFlavorText(annualFactPackage),
    },
    backgroundEchoes: backgroundEchoesFor(annualFactPackage),
    choiceDirections: slotText.choices.map((text, index) => ({
      id: `choice_${index + 1}`,
      text,
      riskLabel: index === 0 ? "low" : "medium",
      fuzzySuccessLabel: index === 0 ? "难度较低" : index === 1 ? "风险不明" : "结果难以预料",
    })),
    forbiddenPlayerText: FORBIDDEN_PLAYER_TEXT_TERMS.filter((term) => !/[a-z]/i.test(term)),
  };
}

export function slotTextFor(slot) {
  return SLOT_TEXT[slot] ?? {
    title: "生活里的新变化",
    text: "这一年真正改变你的，是普通生活里出现了一项具体的新安排。",
    requiredDelta: "日常生活发生可观察变化",
    choices: ["先稳妥适应变化", "找可信的大人问清原因", "留意这件事背后的影响"],
  };
}

function institutionArrivalText() {
  return {
    title: "碧云宗来人",
    text: "碧云宗外门弟子来到青石村，既要处理后山灵兽传闻，也重新问起此前搁置的外门选拔。",
    requiredDelta: "宗门来人让父母和村子必须面对选拔、灵兽与隐瞒之间的取舍",
    choices: [
      "先听从父母安排，观察外门弟子如何询问村民和处理灵兽传闻",
      "谨慎试探外门弟子，确认他对选拔延期和灵兽来历知道多少",
      "请求父母陪你说出一部分真相，避免宗门单独决定后山灵兽的处置",
    ],
  };
}

function backgroundEchoesFor(annualFactPackage) {
  const ids = [
    ...Object.entries(annualFactPackage.assetRoles ?? {})
      .filter(([, role]) => role?.role === "background_only")
      .map(([assetId]) => assetId),
  ];
  const unique = [...new Set(ids.filter(Boolean))];
  return unique.slice(0, 3).map((id) => {
    const role = annualFactPackage.assetRoles?.[id] ?? {};
    const text = ASSET_TEXT[id] ?? { label: "此前那件事", textSignals: [] };
    const textSignals = uniqueStrings([
      ...(text.textSignals ?? []),
      ...(Array.isArray(role.textSignals) ? role.textSignals : []),
    ]).filter((signal) => !/[a-z_]/i.test(signal));
    const maxSentences = Number.isFinite(role.maxSentences) ? Math.max(0, Math.floor(role.maxSentences)) : 1;
    return {
      label: text.label,
      role: "background_echo",
      textSignals,
      maxMentions: Math.max(1, maxSentences),
      maxSentences,
      titleAllowed: false,
      firstParagraphAllowed: role.cannotOpenScene === false ? true : false,
      choiceDriverAllowed: role.cannotDriveChoices === false ? true : false,
      mainPressureAllowed: false,
    };
  });
}

function worldFlavorText(annualFactPackage) {
  const element = annualFactPackage.threeLayerFocus?.worldFlavor?.element ?? "";
  if (/talent|subtle/.test(element)) return "天赋或异常只能轻微改变日常反应。";
  if (/institution|sect|official/.test(element)) return "更大的势力只能作为压力来源，不能抢走生活主线。";
  return "世界味道只作为背景质感，主事件仍然是今年的人生变化。";
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}
