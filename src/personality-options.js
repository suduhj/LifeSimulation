export const SETUP_PERSONALITY_OPTIONS = [
  {
    id: "cautious",
    label: "谨慎稳健",
    aiHint: "prefers safety, observation, and long-term stability before taking risks",
  },
  {
    id: "ambitious",
    label: "野心进取",
    aiHint: "pursues status, power, resources, and visible achievement more actively",
  },
  {
    id: "curious",
    label: "好奇探索",
    aiHint: "is drawn toward hidden information, strange events, travel, learning, and discovery",
  },
  {
    id: "empathetic",
    label: "重情共感",
    aiHint: "values relationships, protection, family bonds, loyalty, and emotional consequences",
  },
  {
    id: "rebellious",
    label: "叛逆自由",
    aiHint: "resists control, institutions, family expectations, and imposed destiny",
  },
  {
    id: "pragmatic",
    label: "现实功利",
    aiHint: "prioritizes survival, tradeoffs, useful alliances, and concrete gains",
  },
  {
    id: "random",
    label: "AI生成",
    aiHint: "AI may infer a fitting personality direction from the world, identity, attributes, and talents",
  },
];

export function normalizePersonality(input, fallback = "random") {
  const text = String(input ?? "").trim().toLowerCase();
  if (!text) return fallback;
  const alias = {
    "1": "cautious",
    cautious: "cautious",
    careful: "cautious",
    safe: "cautious",
    "谨慎": "cautious",
    "稳健": "cautious",
    "2": "ambitious",
    ambitious: "ambitious",
    power: "ambitious",
    "野心": "ambitious",
    "进取": "ambitious",
    "3": "curious",
    curious: "curious",
    explorer: "curious",
    "好奇": "curious",
    "探索": "curious",
    "4": "empathetic",
    empathetic: "empathetic",
    kind: "empathetic",
    social: "empathetic",
    "重情": "empathetic",
    "共感": "empathetic",
    "5": "rebellious",
    rebellious: "rebellious",
    free: "rebellious",
    "叛逆": "rebellious",
    "自由": "rebellious",
    "6": "pragmatic",
    pragmatic: "pragmatic",
    practical: "pragmatic",
    "现实": "pragmatic",
    "功利": "pragmatic",
    "7": "random",
    random: "random",
    ai: "random",
    "随机": "random",
    "ai生成": "random",
  };
  return alias[text] ?? fallback;
}

export function getPersonalityOption(personalityId) {
  return SETUP_PERSONALITY_OPTIONS.find((option) => option.id === personalityId) ?? SETUP_PERSONALITY_OPTIONS.find((option) => option.id === "random");
}
