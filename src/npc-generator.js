import { createRng } from "./random.js";
import { buildPlayerVisibleNpcIdentity } from "./localization.js";

export function generateInitialImportantNPCs({ world, runId, seed = 1 } = {}) {
  const rng = createRng(`${runId}:${seed}:npcs`);
  const templates = rng.shuffle(world.npcTemplates.templates);
  const count = 3 + rng.int(3);

  return templates.slice(0, count).map((template, index) => {
    const role = rng.pick(template.possibleRoles);
    const stance = pickStance({ role, rng });

    return {
      id: `npc_${index + 1}_${template.id}`,
      templateId: template.id,
      role,
      roleTags: template.roleTags,
      possibleRoles: template.possibleRoles,
      importance: "important",
      visibleNameKey: template.notesKey ?? `${world.id}.npc.${template.id}`,
      knownIdentity: {
        templateId: template.id,
        role: buildPlayerVisibleNpcIdentity({
          templateId: template.id,
          role,
          roleTags: template.roleTags,
        }).label,
        certainty: "surface_only",
      },
      playerVisible: buildPlayerVisibleNpcIdentity({
        templateId: template.id,
        role,
        roleTags: template.roleTags,
      }),
      hiddenInfo: {
        stance,
        trueTemplateId: template.id,
        trueRole: role,
        secretWeight: template.misjudgmentRisk ?? "low",
        source: "initial_generation",
      },
      relationship: {
        affinity: startingRelationshipValue({ role, stance, rng }),
        trust: startingRelationshipValue({ role, stance, rng }),
        fear: stance === "threatening" ? 20 + rng.int(21) : rng.int(15),
        interestBinding: rng.int(21),
        secretLeverage: 0,
      },
      memory: [
        {
          type: "initial_npc_generated",
          text: `Initial important NPC generated from template ${template.id}.`,
        },
      ],
      flags: [],
    };
  });
}

function pickStance({ role, rng }) {
  if (role.includes("enemy") || role.includes("threat") || role.includes("oppressor")) return "threatening";
  if (role.includes("mentor") || role.includes("protector") || role.includes("supporter")) return "supportive";
  if (role.includes("rival") || role.includes("scammer") || role.includes("manipulator")) return "uncertain";
  return rng.pick(["supportive", "neutral", "uncertain"]);
}

function startingRelationshipValue({ role, stance, rng }) {
  if (stance === "supportive") return 35 + rng.int(26);
  if (stance === "threatening") return -30 + rng.int(16);
  if (role.includes("family")) return 25 + rng.int(26);
  return rng.int(31);
}
