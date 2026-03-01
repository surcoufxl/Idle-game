// src/data/recipes.js
// “Recipes” = crafted actions (smithing/fletching/etc)

export const RECIPES = {
  // SMITHING
  smeltCopperBar: {
    id: "smeltCopperBar",
    name: "Smelt copper bar",
    skill: "smithing",
    requiresLevel: 1,
    time: 2.0,
    xp: 12,
    inputs: { copperOre: 2 },
    outputs: { copperBar: 1 },
  },
  smeltBronzeBar: {
    id: "smeltBronzeBar",
    name: "Smelt bronze bar",
    skill: "smithing",
    requiresLevel: 1,
    time: 2.2,
    xp: 14,
    inputs: { copperOre: 1, tinOre: 1 },
    outputs: { bronzeBar: 1 },
  },
  smeltIronBar: {
    id: "smeltIronBar",
    name: "Smelt iron bar",
    skill: "smithing",
    requiresLevel: 5,
    time: 2.8,
    xp: 18,
    inputs: { ironOre: 2 },
    outputs: { ironBar: 1 },
  },

  // WOODCUTTING / CARPENTRY (still using woodcutting for now)
  sawPlanks: {
    id: "sawPlanks",
    name: "Saw planks",
    skill: "woodcutting",
    requiresLevel: 1,
    time: 2.0,
    xp: 10,
    inputs: { logs: 2 },
    outputs: { planks: 1 },
  },

  // FLETCHING
  makeBow: {
    id: "makeBow",
    name: "Craft bow",
    skill: "fletching",
    requiresLevel: 1,
    time: 4.0,
    xp: 25,
    inputs: { planks: 3 },
    outputs: { bow: 1 },
  },
  makeArrows: {
    id: "makeArrows",
    name: "Craft arrows",
    skill: "fletching",
    requiresLevel: 3,
    time: 2.2,
    xp: 20,
    inputs: { planks: 1, ironBar: 1 },
    outputs: { arrows: 10 },
  },
};