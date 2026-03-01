// src/data/nodes.js
// “Nodes” = gatherable actions (mining/woodcutting/etc).
// You can balance everything here.

export const NODES = {
  // MINING
  mineCopper: {
    id: "mineCopper",
    name: "Mine copper",
    skill: "mining",
    requiresLevel: 1,
    time: 1.0,
    xp: 5,
    outputs: { copperOre: 1 },
  },
  mineTin: {
    id: "mineTin",
    name: "Mine tin",
    skill: "mining",
    requiresLevel: 1,
    time: 1.2,
    xp: 6,
    outputs: { tinOre: 1 },
  },
  mineIron: {
    id: "mineIron",
    name: "Mine iron",
    skill: "mining",
    requiresLevel: 5,
    time: 1.8,
    xp: 8,
    outputs: { ironOre: 1 },
  },

  // WOODCUTTING
  chopLogs: {
    id: "chopLogs",
    name: "Chop logs",
    skill: "woodcutting",
    requiresLevel: 1,
    time: 1.2,
    xp: 5,
    outputs: { logs: 1 },
  },
  chopOak: {
    id: "chopOak",
    name: "Chop oak",
    skill: "woodcutting",
    requiresLevel: 10,
    time: 1.8,
    xp: 9,
    outputs: { oakLogs: 1 },
  },
};