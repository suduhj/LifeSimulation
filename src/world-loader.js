import fs from "node:fs";
import path from "node:path";

const MVP_WORLD_IDS = ["cultivation", "cthulhu", "wasteland"];

export function loadMvpWorlds({ worldsDir = "worlds" } = {}) {
  const worlds = {};

  for (const worldId of MVP_WORLD_IDS) {
    const worldDir = path.resolve(worldsDir, worldId);
    worlds[worldId] = {
      id: worldId,
      dir: worldDir,
      config: readJson(path.join(worldDir, "world.config.json")),
      identitySeeds: readJson(path.join(worldDir, "identity-seeds.json")),
      talentPool: readJson(path.join(worldDir, "talents.json")),
      eventSeeds: readJson(path.join(worldDir, "event-seeds.json")),
      npcTemplates: readJson(path.join(worldDir, "npc-templates.json")),
      factionSeeds: readJson(path.join(worldDir, "faction-seeds.json")),
      locationSeeds: readJson(path.join(worldDir, "location-seeds.json")),
      endings: readJson(path.join(worldDir, "endings.json")),
    };
  }

  return worlds;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
