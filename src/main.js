import {
  createInitialState,
  tick,
  doManual,
  setRunningSkill,
  setSelectedTask,
  setQueueBuilderSkill,
  setQueueBuilderTask,
  enqueueBuilder,
  removeJob,
  clearJobs,
  runQueueMode,
  resumeMainMode,
  QUEUE_INF
} from "./game.js";

import { loadState, saveState, wipeSave } from "./save.js";
import { renderAll } from "./ui.js";

function mustGet(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element with id="${id}"`);
  return el;
}

function deepClone(obj) {
  return (typeof structuredClone === "function")
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}

function migrateState(loaded) {
  const fresh = createInitialState();
  if (!loaded || typeof loaded !== "object") return fresh;

  const state = deepClone(fresh);

  if (typeof loaded.lastTick === "number") state.lastTick = loaded.lastTick;
  if (typeof loaded.clickPower === "number") state.clickPower = loaded.clickPower;

  if (loaded.inventory && typeof loaded.inventory === "object") {
    for (const k of Object.keys(state.inventory)) {
      if (typeof loaded.inventory[k] === "number") state.inventory[k] = loaded.inventory[k];
    }
  }

  if (loaded.skills && typeof loaded.skills === "object") {
    for (const k of Object.keys(state.skills)) {
      const s = loaded.skills[k];
      if (s && typeof s === "object") {
        if (typeof s.level === "number") state.skills[k].level = Math.min(1000, s.level);
        if (typeof s.xp === "number") state.skills[k].xp = Math.max(0, s.xp);
      }
    }
  }

  // new fields
  if (loaded.selected && typeof loaded.selected === "object") state.selected = loaded.selected;
  if (loaded.queueBuilder && typeof loaded.queueBuilder === "object") state.queueBuilder = loaded.queueBuilder;

  if (typeof loaded.runningSkill === "string") state.runningSkill = loaded.runningSkill;
  if (typeof loaded.mode === "string") state.mode = loaded.mode;

  if (loaded.main && typeof loaded.main === "object") state.main = loaded.main;
  if (typeof loaded.mainProgress === "number") state.mainProgress = loaded.mainProgress;

  if (Array.isArray(loaded.jobQueue)) {
    state.jobQueue = loaded.jobQueue.map(x => ({
      skill: x.skill,
      kind: x.kind,
      id: x.id,
      remaining: (x.remaining === null || x.remaining === undefined) ? QUEUE_INF : x.remaining
    }));
  }
  if (typeof loaded.queueProgress === "number") state.queueProgress = loaded.queueProgress;

  return state;
}

function shouldSkipRender() {
  const el = document.activeElement;
  return el && el.tagName === "SELECT";
}

window.addEventListener("DOMContentLoaded", () => {
  let state = migrateState(loadState());

  // Offline progress (cap 8h)
  (function applyOfflineProgress() {
    const now = Date.now();
    const last = state.lastTick ?? now;
    const dt = Math.max(0, (now - last) / 1000);
    const capped = Math.min(dt, 60 * 60 * 8);
    tick(state, capped);
  })();

  const clickBtn = mustGet("clickBtn");
  const saveBtn = mustGet("saveBtn");
  const resetBtn = mustGet("resetBtn");
  const saveStatus = mustGet("saveStatus");

  function flashStatus(msg) {
    if (!saveStatus) return;
    saveStatus.textContent = msg;
    setTimeout(() => (saveStatus.textContent = ""), 1000);
  }

  const handlers = {
    onRunSkill(skill) {
      setRunningSkill(state, skill);
      renderAll(state, handlers);
    },

    // main action selector for running skill
    onSelectMainTask(skill, kind, id) {
      setSelectedTask(state, skill, kind, id);
      renderAll(state, handlers);
    },

    // queue builder controls
    onQueueSkill(skill) {
      setQueueBuilderSkill(state, skill);
      renderAll(state, handlers);
    },
    onQueueTask(kind, id) {
      setQueueBuilderTask(state, kind, id);
      renderAll(state, handlers);
    },

    onEnqueue(amount) {
      enqueueBuilder(state, amount);
      renderAll(state, handlers);
    },

    onRemoveQueue(index) {
      removeJob(state, index);
      renderAll(state, handlers);
    },

    onClearQueue() {
      clearJobs(state);
      renderAll(state, handlers);
    },

    onRunQueue() {
      runQueueMode(state);
      renderAll(state, handlers);
    },

    onResumeMain() {
      resumeMainMode(state);
      renderAll(state, handlers);
    }
  };

  clickBtn.addEventListener("click", () => {
    doManual(state);
    renderAll(state, handlers);
  });

  saveBtn.addEventListener("click", () => {
    saveState(state);
    flashStatus("Saved.");
  });

  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset all progress?")) return;
    wipeSave();
    state = createInitialState();
    renderAll(state, handlers);
    flashStatus("Reset.");
  });

  // Tick loop
  let lastFrame = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    tick(state, dt);
  }, 50);

  // Render loop (won’t close dropdown)
  setInterval(() => {
    if (shouldSkipRender()) return;
    renderAll(state, handlers);
  }, 200);

  setInterval(() => saveState(state), 10_000);

  renderAll(state, handlers);
});