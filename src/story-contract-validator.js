import { detectStaleAnnualEventShape } from "./annual-state-transition.js";
import { curriculumSignalsForSlot } from "./life-curriculum.js";
import { topicProfileMatchesText } from "./topic-ledger.js";

export function validateStoryContract(response, contract) {
  if (!contract) return { valid: true, errors: [] };
  const errors = [];
  const text = collectPlayerText(response);

  if ((contract.closedFacts ?? []).includes("jade_talisman_first_discovery") && looksLikeJadeRediscovery(text)) {
    errors.push("response reopens closed fact jade_talisman_first_discovery");
  }
  if ((contract.forbiddenSceneSkeletons ?? []).includes("forest_jade_object_footsteps_choice_skeleton") && looksLikeForestJadeFootstepsSkeleton(text)) {
    errors.push("response repeats forbidden scene skeleton forest_jade_object_footsteps_choice_skeleton");
  }

  const repeatedShape = matchingForbiddenShape(text, contract.forbiddenEventShapes ?? []);
  if (repeatedShape) {
    errors.push(`response reuses forbidden event shape ${repeatedShape}`);
  }

  if (contract.annualFactPackage?.primaryDelta?.eventShape === "institution_arrival_changes_life" && !looksLikeInstitutionArrival(text)) {
    errors.push("response does not render annual fact package: institution arrival");
  }
  for (const requiredStateChange of contract.requiredStateChanges ?? []) {
    if (!looksLikeRequiredStateChange(requiredStateChange, text, contract)) {
      errors.push(`response misses required annual state change: ${requiredStateChange}`);
    }
  }

  if (contract.curriculumSlot && !looksLikeCurriculumSlot(text, contract.curriculumSlot, contract.requiredHumanDelta)) {
    errors.push(`response does not satisfy curriculum slot ${contract.curriculumSlot}`);
  }
  if (contract.curriculumSlot && !choicesSupportCurriculum(response?.choices, contract.curriculumSlot, contract.requiredHumanDelta)) {
    errors.push(`response choices do not support curriculum slot ${contract.curriculumSlot}`);
  }

  for (const profile of contract.forbiddenTopicProfiles ?? []) {
    if (topicProfileMatchesText(text, profile)) {
      errors.push(`response promotes forbidden topic ${profile.topicFamily}`);
    }
  }

  for (const phrase of contract.mustNotInclude ?? []) {
    if (phrase && text.includes(phrase)) errors.push(`response includes forbidden phrase: ${phrase}`);
  }

  return { valid: errors.length === 0, errors };
}

function looksLikeCurriculumSlot(text, slot, requiredHumanDelta = "") {
  if (requiredHumanDelta && text.includes(requiredHumanDelta)) return true;
  const signals = curriculumSignalsForSlot(slot);
  const signalHits = signals.filter((signal) => signal && text.includes(signal)).length;
  if (signalHits >= 2) return true;
  return {
    peer_relationship: /(同龄|伙伴|孩子|朋友).{0,40}(态度|疏远|亲近|议论|看法|改变)/s.test(text),
    family_boundary: /(父亲|母亲|家人|家里).{0,40}(规矩|边界|限制|安排|允许|不许)/s.test(text),
    household_responsibility: /(家务|责任|取水|劈柴|照看|帮忙|差事)/s.test(text),
    learning_path: /(先生|村塾|学习|功课|练字|书|课堂|师长)/s.test(text),
    mentor_attention: /(长辈|先生|师长|执事|大人).{0,40}(注意|看法|评价|指导|改变)/s.test(text),
    body_growth: /(身体|力气|体力|个子|行动范围|承载).{0,40}(变化|改变|重新安排|能做|不能做)/s.test(text),
    health_or_care: /(照护|休养|身体|睡眠|发热|照看).{0,40}(安排|变化|担心|认真)/s.test(text),
    village_social_life: /(村里|邻居|名声|议论|社区|相处).{0,40}(变化|改变|位置|态度)/s.test(text),
    talent_subtle_manifestation: /(天赋|异常|梦|感知|微热|不寻常).{0,40}(轻微|日常|小|细微)/s.test(text),
    external_attention: /(外人|宗门|官方|营地|陌生|来人|目光).{0,40}(改变|注意|安排|日常)/s.test(text),
  }[slot] ?? false;
}

function choicesSupportCurriculum(choices = [], slot, requiredHumanDelta = "") {
  if (!Array.isArray(choices) || choices.length === 0) return true;
  const choiceText = choices.map((choice) => choice?.text ?? "").filter(Boolean);
  if (choiceText.length === 0) return true;
  if (requiredHumanDelta && choiceText.some((text) => text.includes(requiredHumanDelta))) return true;
  const signals = [...curriculumChoiceSignals(slot), ...commonAnnualChoiceSignals()];
  return choiceText.some((text) => signals.some((signal) => signal && text.includes(signal)));
}

function commonAnnualChoiceSignals() {
  return [
    "新的生活安排",
    "这项安排",
    "生活安排",
    "可信的大人",
    "父母",
    "父亲",
    "母亲",
    "师长",
    "长辈",
    "安排",
    "观察",
    "沟通",
    "谈一谈",
    "鏂扮殑鐢熸椿",
    "瀹夋帓",
    "鐢熸椿",
    "鍙俊",
    "澶т汉",
    "鐖舵瘝",
    "鐖朵翰",
    "姣嶄翰",
    "瑙傚療",
    "璋堜竴璋",
  ];
}

function curriculumChoiceSignals(slot) {
  return {
    peer_relationship: ["同龄", "伙伴", "朋友", "态度", "相处", "关系", "peer", "鍚岄緞", "浼欎即", "鏈嬪弸"],
    family_boundary: ["父亲", "母亲", "家里", "边界", "规矩", "安排", "沟通", "鐖朵翰", "姣嶄翰", "瀹堕噷"],
    household_responsibility: ["家务", "责任", "帮忙", "帮助", "小事", "照护者", "取水", "烧火", "差事", "瀹跺姟", "璐ｄ换", "甯収", "灏忎簨", "鐓ф姢", "鍙栨按"],
    learning_path: ["学习", "功课", "先生", "师长", "读书", "练字", "课程", "安排", "瀛︿範", "鍔熻", "鍏堢敓"],
    mentor_attention: ["师长", "先生", "长辈", "请教", "指导", "评价", "弟子", "宗门", "询问", "甯堥暱", "鍏堢敓", "闀胯緢", "寮熷瓙", "瀹楅棬", "璇㈤棶"],
    body_growth: ["身体", "体力", "力气", "承载", "成长", "能做", "韬綋", "浣撳姏", "鍔涙皵"],
    health_or_care: ["照护", "休养", "身体", "睡眠", "发热", "照看", "鐓ф姢", "浼戝吇", "鐫＄湢"],
    village_social_life: ["村里", "邻居", "名声", "日常", "位置", "相处", "鏉戦噷", "閭诲眳", "鍚嶅０"],
    talent_subtle_manifestation: ["天赋", "异常", "感知", "微热", "细微", "日常", "澶╄祴", "寮傚父", "鎰熺煡"],
    external_attention: ["外界", "外人", "宗门", "官方", "营地", "目光", "注意", "澶栫晫", "瀹楅棬", "瀹樻柟"],
  }[slot] ?? [];
}

export function assertStoryContract(response, contract) {
  const validation = validateStoryContract(response, contract);
  if (!validation.valid) {
    throw new Error(`AI response failed story contract: ${validation.errors.join("; ")}`);
  }
  return response;
}

function collectPlayerText(response) {
  return [
    response?.playerText?.title,
    response?.playerText?.body,
    ...(response?.choices ?? []).map((choice) => choice.text),
  ].filter(Boolean).join("\n");
}

function looksLikeJadeRediscovery(text) {
  return /(草丛|竹林|山林|林边).{0,30}(露出|发现|看见|捡到).{0,20}(暗红|小珠|玉片|玉佩|玉简)/s.test(text)
    || /(首次|第一次|从未注意).{0,20}(玉片|小珠|灵引符|玉简)/s.test(text);
}

function looksLikeForestJadeFootstepsSkeleton(text) {
  return /(草丛|竹林|山林|林边).{0,40}(小珠|玉片|玉佩|玉简)/s.test(text)
    && /(林外|远处|脚步声|脚步)/s.test(text)
    && /(小珠|玉片|脚步声)/s.test(text);
}

function matchingForbiddenShape(text, forbiddenEventShapes) {
  const shape = detectStaleAnnualEventShape(text);
  return forbiddenEventShapes.includes(shape) ? shape : "";
}

function looksLikeSecretReturnToForbiddenPlace(text) {
  return /(再次|又一次|再度|继续|趁).{0,40}(偷跑|偷偷|溜去|潜入|回到).{0,60}(后山|竹林|禁地|洞府|医院|仓库|藏经阁)/s.test(text)
    || /(父亲外出|母亲午睡|看管松动|无人看管).{0,80}(偷跑|偷偷|溜去|潜入).{0,80}(后山|竹林|禁地|洞府|医院|仓库|藏经阁)/s.test(text);
}

function looksLikeInstitutionArrival(text) {
  return /(碧云宗|宗门来人|宗门的人|外门弟子)/s.test(text)
    && /(选拔|处理|搜山|灵兽|玉简|村民|青石村)/s.test(text)
    && /(村子|家里|父母|林岚|青石村|主角)/s.test(text);
}

function looksLikeRequiredStateChange(requiredStateChange, text, contract = {}) {
  const primaryDelta = contract.annualFactPackage?.primaryDelta;
  if (String(requiredStateChange).startsWith("annual_") && primaryDelta) {
    return text.includes(primaryDelta.title)
      || text.includes(primaryDelta.description)
      || (contract.annualFactPackage?.requiredTextSignals ?? []).some((signal) => signal && text.includes(signal));
  }
  return {
    biyun_disciple_arrived: /(碧云宗|外门弟子|宗门来人|宗门的人)/s.test(text),
    selection_delay_explained: /(选拔|延期|搁置|推迟|补招|错过)/s.test(text),
    parents_must_decide_how_much_to_disclose: /(父母|家里|隐瞒|坦白|说出|不愿暴露|决定透露)/s.test(text),
  }[requiredStateChange] ?? text.includes(requiredStateChange);
}
