import {
  createInitialState,
  applyIdleIncome,
  buyGenerator,
  buyUpgrade
} from "./game.js";
import { loadState, saveState, wipeSave } from "./save.js";
import { renderAll } from "./ui.js";

let state = loadState() ?? createInitialState();

// Simple offline progress: apply earnings since lastTick (capped)
(function applyOfflineProgress() {
  const now = Date.now();
  const last = state.lastTick ?? now;
  const dt = Math.max(0, (now - last) / 1000);
  const capped = Math.min(dt, 60 * 60 * 8); // cap 8 hours
  applyIdleIncome(state, capped);
  state.lastTick = now;
})();

const saveStatus = document.getElementById("saveStatus");

function flashStatus(msg) {
  saveStatus.textContent = msg;
  setTimeout(() => (saveStatus.textContent = ""), 1000);
}

const handlers = {
  onBuyGenerator(id) {
    if (buyGenerator(state, id)) renderAll(state, handlers);
  },
  onBuyUpgrade(id) {
    if (buyUpgrade(state, id)) renderAll(state, handlers);
  }
};

document.getElementById("clickBtn").addEventListener("click", () => {
  state.coins += state.clickPower;
  renderAll(state, handlers);
});

document.getElementById("saveBtn").addEventListener("click", () => {
  saveState(state);
  flashStatus("Saved.");
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset all progress?")) return;
  wipeSave();
  state = createInitialState();
  renderAll(state, handlers);
  flashStatus("Reset.");
});

// Main loop (20 FPS)
let lastFrame = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  applyIdleIncome(state, dt);
  state.lastTick = Date.now();
  renderAll(state, handlers);
}, 50);

// Autosave every 10s
setInterval(() => saveState(state), 10_000);

renderAll(state, handlers);