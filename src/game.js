import { NODES } from "./data/nodes.js";
import { RECIPES as RECIPE_DATA } from "./data/recipes.js";
import { xpToNext, MAX_LEVEL } from "./data/xp.js";

// Re-export queue constant for UI/main
export const QUEUE_INF = -1;

// Your items list still lives here (inventory keys).
// Make sure these include everything referenced in NODES/RECIPES.
export const ITEMS = {
  copperOre: { name: "Copper ore" },
  tinOre: { name: "Tin ore" },
  ironOre: { name: "Iron ore" },

  logs: { name: "Logs" },
  oakLogs: { name: "Oak logs" },

  copperBar: { name: "Copper bar" },
  bronzeBar: { name: "Bronze bar" },
  ironBar: { name: "Iron bar" },

  planks: { name: "Planks" },

  arrows: { name: "Arrows" },
  bow: { name: "Bow" },
};

export const SKILLS = {
  mining: { name: "Mining" },
  woodcutting: { name: "Woodcutting" },
  smithing: { name: "Smithing" },
  fletching: { name: "Fletching" },
};

// Treat nodes as "actions"
export const ACTIONS = NODES;
// Rename recipes import to the name game code expects
export const RECIPES = RECIPE_DATA;

function emptyInventory() {
  const inv = {};
  for (const key of Object.keys(ITEMS)) inv[key] = 0;
  return inv;
}

function initialSkills() {
  const s = {};
  for (const k of Object.keys(SKILLS)) s[k] = { level: 1, xp: 0 };
  return s;
}

// Helpers to pick a default task for each skill
function firstNodeForSkill(skill) {
  return Object.values(ACTIONS).find(t => t.skill === skill) ?? null;
}
function firstRecipeForSkill(skill) {
  return Object.values(RECIPES).find(t => t.skill === skill) ?? null;
}
function defaultTaskForSkill(skill) {
  // Prefer node (gather) if available, otherwise recipe
  const n = firstNodeForSkill(skill);
  if (n) return { kind: "action", id: n.id };
  const r = firstRecipeForSkill(skill);
  if (r) return { kind: "recipe", id: r.id };
  return null;
}

export function createInitialState() {
  // Default selections per skill from data
  const selected = {};
  for (const sk of Object.keys(SKILLS)) {
    const def = defaultTaskForSkill(sk);
    // fallback to a safe default if nothing exists (shouldn't happen)
    selected[sk] = def ?? { kind: "action", id: Object.keys(ACTIONS)[0] };
  }

  // Queue builder defaults: pick smithing if possible, else first skill
  const builderSkill = SKILLS.smithing ? "smithing" : Object.keys(SKILLS)[0];
  const builderDefault = selected[builderSkill];

  return {
    inventory: emptyInventory(),
    skills: initialSkills(),

    // Main/idle action (runs continuously when mode === "main")
    main: { ...selected.mining },       // will be corrected below by runningSkill+selected
    runningSkill: "mining",
    mainProgress: 0,

    // Planner queue (runs when mode === "queue")
    jobQueue: [],                       // items: { skill, kind, id, remaining }
    queueProgress: 0,
    mode: "main",                       // "main" | "queue"

    // UI selections
    selected,

    // Queue builder selection (can queue without switching main)
    queueBuilder: {
      skill: builderSkill,
      kind: builderDefault.kind,
      id: builderDefault.id,
    },

    lastTick: Date.now(),
    clickPower: 1,
  };
}

export function getSkillLevel(state, skill) {
  return state.skills[skill]?.level ?? 1;
}

export function addXp(state, skill, amount) {
  const sk = state.skills[skill];
  if (!sk) return;

  if (sk.level >= MAX_LEVEL) {
    sk.level = MAX_LEVEL;
    sk.xp = 0;
    return;
  }

  sk.xp += amount;

  while (sk.level < MAX_LEVEL && sk.xp >= xpToNext(sk.level)) {
    sk.xp -= xpToNext(sk.level);
    sk.level += 1;
  }

  if (sk.level >= MAX_LEVEL) {
    sk.level = MAX_LEVEL;
    sk.xp = 0;
  }
}

export function resolveTask(kind, id) {
  if (kind === "action") return ACTIONS[id] ?? null;
  if (kind === "recipe") return RECIPES[id] ?? null;
  return null;
}

export function isLocked(state, task) {
  const req = task.requiresLevel ?? 1;
  return getSkillLevel(state, task.skill) < req;
}

export function canAffordInputs(state, inputs) {
  for (const [item, qty] of Object.entries(inputs)) {
    if ((state.inventory[item] ?? 0) < qty) return false;
  }
  return true;
}

export function consumeInputs(state, inputs) {
  for (const [item, qty] of Object.entries(inputs)) {
    state.inventory[item] = (state.inventory[item] ?? 0) - qty;
  }
}

export function addOutputs(state, outputs, times = 1) {
  for (const [item, qty] of Object.entries(outputs)) {
    state.inventory[item] = (state.inventory[item] ?? 0) + qty * times;
  }
}

function canComplete(state, kind, task) {
  return kind === "recipe" ? canAffordInputs(state, task.inputs) : true;
}

function completeOnce(state, kind, task) {
  if (kind === "recipe") {
    consumeInputs(state, task.inputs);
    addOutputs(state, task.outputs);
  } else {
    addOutputs(state, task.outputs);
  }
  addXp(state, task.skill, task.xp);
}

export function setRunningSkill(state, skill) {
  if (!SKILLS[skill]) return;
  state.runningSkill = skill;

  // If we are in main mode, switch main task to this skill's selected task
  if (state.mode === "main") {
    const sel = state.selected?.[skill];
    if (sel) {
      state.main = { kind: sel.kind, id: sel.id };
      state.mainProgress = 0;
    }
  }
}

export function setSelectedTask(state, skill, kind, id) {
  if (!SKILLS[skill]) return;
  const task = resolveTask(kind, id);
  if (!task || task.skill !== skill) return;

  state.selected[skill] = { kind, id };

  // If this is the running skill AND we're in main mode, update main action immediately.
  if (state.mode === "main" && state.runningSkill === skill) {
    state.main = { kind, id };
    state.mainProgress = 0;
  }

  // If queue builder is on same skill, keep it in sync (nice UX)
  if (state.queueBuilder?.skill === skill) {
    state.queueBuilder.kind = kind;
    state.queueBuilder.id = id;
  }
}

export function setQueueBuilderSkill(state, skill) {
  if (!SKILLS[skill]) return;
  state.queueBuilder.skill = skill;

  // Default builder selection to that skill's selected
  const sel = state.selected?.[skill];
  if (sel) {
    state.queueBuilder.kind = sel.kind;
    state.queueBuilder.id = sel.id;
    return;
  }

  // Fallback to first available task for that skill
  const def = defaultTaskForSkill(skill);
  if (def) {
    state.queueBuilder.kind = def.kind;
    state.queueBuilder.id = def.id;
  }
}

export function setQueueBuilderTask(state, kind, id) {
  const skill = state.queueBuilder.skill;
  const task = resolveTask(kind, id);
  if (!task || task.skill !== skill) return;
  state.queueBuilder.kind = kind;
  state.queueBuilder.id = id;
}

export function enqueueBuilder(state, remaining) {
  const skill = state.queueBuilder.skill;
  const kind = state.queueBuilder.kind;
  const id = state.queueBuilder.id;

  const task = resolveTask(kind, id);
  if (!task || task.skill !== skill) return;

  let rem = remaining;
  if (rem !== QUEUE_INF) rem = Math.max(0, Math.floor(rem));

  state.jobQueue.push({ skill, kind, id, remaining: rem });
}

export function removeJob(state, index) {
  if (!Array.isArray(state.jobQueue)) state.jobQueue = [];
  if (index < 0 || index >= state.jobQueue.length) return;
  state.jobQueue.splice(index, 1);
  state.queueProgress = 0;
}

export function clearJobs(state) {
  state.jobQueue = [];
  state.queueProgress = 0;

  // If you were in queue mode, go back to main
  if (state.mode === "queue") {
    state.mode = "main";
    state.mainProgress = 0;
  }
}

export function runQueueMode(state) {
  state.mode = "queue";
  state.queueProgress = 0;
}

export function resumeMainMode(state) {
  state.mode = "main";
  state.mainProgress = 0;

  // Make sure main task matches running skill selection after resume
  const sel = state.selected?.[state.runningSkill];
  if (sel) state.main = { kind: sel.kind, id: sel.id };
}

export function tick(state, dtSeconds) {
  if (state.mode === "queue") tickQueue(state, dtSeconds);
  else tickMain(state, dtSeconds);

  state.lastTick = Date.now();
}

function tickMain(state, dtSeconds) {
  const skill = state.runningSkill;
  if (!skill || !SKILLS[skill]) return;

  const task = resolveTask(state.main.kind, state.main.id);
  if (!task || task.skill !== skill) return;
  if (isLocked(state, task)) return;

  state.mainProgress += dtSeconds;

  while (state.mainProgress >= task.time) {
    if (!canComplete(state, state.main.kind, task)) {
      state.mainProgress = Math.min(state.mainProgress, task.time - 0.0001);
      return;
    }
    completeOnce(state, state.main.kind, task);
    state.mainProgress -= task.time;
  }
}

function tickQueue(state, dtSeconds) {
  if (!Array.isArray(state.jobQueue) || state.jobQueue.length === 0) {
    // no jobs -> back to main automatically
    state.mode = "main";
    state.queueProgress = 0;
    state.mainProgress = 0;

    // ensure main matches running selection
    const sel = state.selected?.[state.runningSkill];
    if (sel) state.main = { kind: sel.kind, id: sel.id };
    return;
  }

  const head = state.jobQueue[0];
  const task = resolveTask(head.kind, head.id);

  if (!task || task.skill !== head.skill) {
    state.jobQueue.shift();
    state.queueProgress = 0;
    return;
  }

  if (isLocked(state, task)) {
    // Can't do it yet; just wait
    return;
  }

  state.queueProgress += dtSeconds;

  while (state.queueProgress >= task.time) {
    if (head.remaining === 0) {
      state.jobQueue.shift();
      state.queueProgress = 0;
      break;
    }

    if (!canComplete(state, head.kind, task)) {
      state.queueProgress = Math.min(state.queueProgress, task.time - 0.0001);
      return;
    }

    completeOnce(state, head.kind, task);
    state.queueProgress -= task.time;

    if (head.remaining !== QUEUE_INF) {
      head.remaining = Math.max(0, head.remaining - 1);
      if (head.remaining === 0) {
        state.jobQueue.shift();
        state.queueProgress = 0;
        break;
      }
    }

    if (state.jobQueue.length === 0) {
      state.mode = "main";
      state.queueProgress = 0;
      state.mainProgress = 0;

      const sel = state.selected?.[state.runningSkill];
      if (sel) state.main = { kind: sel.kind, id: sel.id };
      break;
    }
  }
}

export function doManual(state) {
  // Manual applies to whatever mode you're running:
  if (state.mode === "queue") manualQueue(state);
  else manualMain(state);
}

function manualMain(state) {
  const skill = state.runningSkill;
  if (!skill || !SKILLS[skill]) return;

  const task = resolveTask(state.main.kind, state.main.id);
  if (!task || task.skill !== skill) return;
  if (isLocked(state, task)) return;

  for (let i = 0; i < state.clickPower; i++) {
    if (!canComplete(state, state.main.kind, task)) return;
    completeOnce(state, state.main.kind, task);
  }
}

function manualQueue(state) {
  if (!state.jobQueue?.length) return;

  const head = state.jobQueue[0];
  const task = resolveTask(head.kind, head.id);
  if (!task || task.skill !== head.skill) return;
  if (isLocked(state, task)) return;

  for (let i = 0; i < state.clickPower; i++) {
    if (head.remaining === 0) return;
    if (!canComplete(state, head.kind, task)) return;

    completeOnce(state, head.kind, task);

    if (head.remaining !== QUEUE_INF) {
      head.remaining = Math.max(0, head.remaining - 1);
      if (head.remaining === 0) {
        state.jobQueue.shift();
        state.queueProgress = 0;
        return;
      }
    }
  }
}