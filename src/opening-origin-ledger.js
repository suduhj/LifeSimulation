import { createRng } from "./random.js";

export const OPENING_ORIGIN_LEDGER_SCHEMA_VERSION = "mvp.opening_origin_ledger.v1";

const STAGE_BY_AGE = [
  "birth",
  "attachment",
  "speech",
  "curiosity",
  "boundary",
  "temperament",
  "crossroads",
];

const FACTOR_POOLS = {
  cultivation: [
    {
      id: "early_learning_interest",
      category: "learning",
      affects: {
        curriculumSlots: ["learning_path", "mentor_attention"],
        attributes: ["intelligence"],
        topicFamilies: ["early_learning"],
      },
      bodies: [
        "你会在大人说到书册、符纸或仙门规矩时安静下来，像是在努力记住声音里的次序。",
        "你常把木枝和石子排成自己看得懂的形状，旁人只当你是在玩，却看见你能反复修正细节。",
      ],
    },
    {
      id: "early_household_helper",
      category: "household",
      affects: {
        curriculumSlots: ["household_responsibility", "family_boundary"],
        attributes: ["constitution", "familyBackground"],
        topicFamilies: ["early_household"],
      },
      bodies: [
        "你开始帮家里递柴、收碗和看火，事情很小，却让长辈第一次把你当作能分担一点生活的人。",
        "你比同龄孩子更愿意留在院中看大人忙碌，偶尔伸手帮忙时，动作还稚嫩但很认真。",
      ],
    },
    {
      id: "early_peer_friction",
      category: "social",
      affects: {
        curriculumSlots: ["peer_relationship", "village_social_life"],
        attributes: ["appearance", "luck"],
        topicFamilies: ["early_peer"],
      },
      bodies: [
        "你和同龄孩子玩耍时很少完全服从他们的规矩，有人被你吸引，也有人觉得你太执拗。",
        "村里孩子开始记住你的名字，不只是因为你跑得快，也因为你总会问出让他们停下来的问题。",
      ],
    },
    {
      id: "early_health_fragility",
      category: "care",
      affects: {
        curriculumSlots: ["health_or_care", "body_growth"],
        attributes: ["constitution"],
        topicFamilies: ["early_health"],
      },
      bodies: [
        "你有几次夜里发热，醒来后又恢复得很快，家人因此更仔细地记录你的饮食和睡眠。",
        "你的身体一边显得稚弱，一边又在小病后恢复得出奇稳定，让长辈既放心又不敢大意。",
      ],
    },
    {
      id: "early_talent_echo",
      category: "talent",
      affects: {
        curriculumSlots: ["talent_subtle_manifestation", "external_attention"],
        attributes: ["intelligence", "luck", "constitution"],
        topicFamilies: ["early_talent"],
      },
      bodies: [
        "偶尔有细小异样贴着日常出现，像纸边微热、山风忽静，家人没有给它下定论。",
        "你的某些反应比年龄更早一步，却只停留在日常边缘，还不足以让任何人公开声张。",
      ],
    },
  ],
  cthulhu: [],
  wasteland: [],
};

FACTOR_POOLS.cthulhu = FACTOR_POOLS.cultivation;
FACTOR_POOLS.wasteland = FACTOR_POOLS.cultivation;

export function buildOpeningOriginLedger({ run, worlds, seed = 1, actionAge } = {}) {
  const firstActionAge = Number.isFinite(actionAge) ? Math.max(0, Math.floor(actionAge)) : 7;
  const worldId = run?.worldId ?? "unknown";
  const rng = createRng(`${seed}:${run?.runId ?? ""}:${worldId}:opening_origin`);
  const pool = FACTOR_POOLS[worldId] ?? FACTOR_POOLS.cultivation;
  const nodes = [];

  for (let age = 0; age < firstActionAge; age += 1) {
    const primary = pool[(age + rng.int(pool.length)) % pool.length];
    const secondary = pool[(age + rng.int(pool.length)) % pool.length];
    const factors = [factorForAge(primary, age, rng)];
    if (secondary.id !== primary.id && age > 0 && rng.next() > 0.45) {
      factors.push(factorForAge(secondary, age, rng, 1));
    }
    nodes.push({
      age,
      stage: stageForAge(age, firstActionAge),
      title: `${age}岁：${stageTitleForAge(age, firstActionAge)}`,
      body: bodyForAge({ age, firstActionAge, primary, secondary, rng }),
      originFactors: factors,
    });
  }

  return normalizeOpeningOriginLedger({
    schemaVersion: OPENING_ORIGIN_LEDGER_SCHEMA_VERSION,
    runId: run?.runId ?? "",
    worldId,
    seed: Number.isFinite(Number(seed)) ? Number(seed) : String(seed),
    firstActionAge,
    nodes,
  });
}

export function normalizeOpeningOriginLedger(value = {}) {
  const firstActionAge = Math.max(0, Math.floor(Number(value.firstActionAge) || 0));
  const nodes = Array.isArray(value.nodes)
    ? value.nodes.map(normalizeOriginNode).filter(Boolean).filter((node) => node.age >= 0 && (firstActionAge === 0 || node.age < firstActionAge))
    : [];
  return {
    schemaVersion: OPENING_ORIGIN_LEDGER_SCHEMA_VERSION,
    runId: typeof value.runId === "string" ? value.runId : "",
    worldId: typeof value.worldId === "string" ? value.worldId : "",
    seed: value.seed ?? 0,
    firstActionAge,
    nodes,
  };
}

export function originFactorsForLedger(ledger = {}) {
  return normalizeOpeningOriginLedger(ledger).nodes.flatMap((node) => (
    node.originFactors.map((factor) => ({
      ...factor,
      age: node.age,
      stage: node.stage,
    }))
  ));
}

function normalizeOriginNode(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const age = Math.floor(Number(value.age));
  if (!Number.isFinite(age)) return undefined;
  const originFactors = Array.isArray(value.originFactors)
    ? value.originFactors.map(normalizeOriginFactor).filter(Boolean)
    : [];
  return {
    age,
    stage: typeof value.stage === "string" ? value.stage : stageForAge(age, 7),
    title: typeof value.title === "string" ? value.title : `${age}岁`,
    body: typeof value.body === "string" ? value.body : "",
    originFactors,
  };
}

function normalizeOriginFactor(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.id !== "string") return undefined;
  return {
    id: value.id,
    category: typeof value.category === "string" ? value.category : "general",
    strength: clampStrength(value.strength),
    affects: {
      curriculumSlots: normalizeStringArray(value.affects?.curriculumSlots),
      attributes: normalizeStringArray(value.affects?.attributes),
      topicFamilies: normalizeStringArray(value.affects?.topicFamilies),
    },
  };
}

function factorForAge(factor, age, rng, strengthOffset = 0) {
  return {
    id: factor.id,
    category: factor.category,
    strength: clampStrength(1 + strengthOffset + (age >= 3 ? 1 : 0) + (rng.next() > 0.72 ? 1 : 0)),
    affects: structuredClone(factor.affects),
  };
}

function bodyForAge({ age, firstActionAge, primary, secondary, rng }) {
  if (age === 0) {
    return "你出生时还没有能力理解命运，家人能看见的只是气息、哭声、体温和照护中的细小差异。";
  }
  const first = primary.bodies[rng.int(primary.bodies.length)];
  const second = secondary.id !== primary.id && rng.next() > 0.5
    ? secondary.bodies[rng.int(secondary.bodies.length)]
    : "";
  const ending = age >= firstActionAge - 1
    ? "第一道真正需要你表态的岔路正在靠近。"
    : "这些痕迹还只是童年生活的一部分，没有变成公开定论。";
  return [first, second, ending].filter(Boolean).join("");
}

function stageForAge(age, firstActionAge) {
  if (age >= firstActionAge - 1) return "crossroads";
  return STAGE_BY_AGE[age] ?? "slow_growth";
}

function stageTitleForAge(age, firstActionAge) {
  if (age >= firstActionAge - 1) return "岔路前夜";
  return {
    0: "出生底色",
    1: "依附与感知",
    2: "牙牙学语",
    3: "好奇初醒",
    4: "家庭边界",
    5: "性格成形",
  }[age] ?? "缓慢成长";
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}

function clampStrength(value) {
  return Math.max(1, Math.min(5, Math.round(Number(value) || 1)));
}
