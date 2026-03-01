// src/data/xp.js

export const MAX_LEVEL = 1000;

// Per-level XP requirement (XP needed to go from `level` -> `level+1`)
export function xpToNext(level) {
  const tier = Math.floor((level - 1) / 10); // 1-10 => 0, 11-20 => 1, ...
  const mult = Math.pow(3, tier);
  return Math.floor((100 + level) * mult);
}

// Builds a table for levels 1..MAX_LEVEL
// Returns [{ level, toNext, totalToLevel }]
export function buildXpTable(maxLevel = MAX_LEVEL) {
  const table = [];
  let total = 0;

  for (let level = 1; level <= maxLevel; level++) {
    const toNext = level === maxLevel ? 0 : xpToNext(level);
    table.push({ level, toNext, totalToLevel: total });
    total += toNext;
  }

  return table;
}