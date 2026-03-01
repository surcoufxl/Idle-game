import { GENERATORS, UPGRADES, generatorCost, coinsPerSecond } from "./game.js";

export function format(num) {
  if (!Number.isFinite(num)) return "0";
  if (num < 1000) return num.toFixed(0);
  const units = ["K","M","B","T","Qa","Qi"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${n.toFixed(2)}${units[u]}`;
}

export function renderAll(state, handlers) {
  document.getElementById("coins").textContent = format(state.coins);
  document.getElementById("cps").textContent = format(coinsPerSecond(state));
  document.getElementById("clickPower").textContent = format(state.clickPower);

  renderShop(state, handlers);
  renderUpgrades(state, handlers);
}

function renderShop(state, handlers) {
  const shop = document.getElementById("shop");
  shop.innerHTML = "";

  for (const id of Object.keys(GENERATORS)) {
    const def = GENERATORS[id];
    const count = state.generators[id].count;
    const cost = generatorCost(id, count);

    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.innerHTML = `
      <div><strong>${def.name}</strong> (owned: ${count})</div>
      <div class="hint">+${def.cps} / sec each</div>
      <div class="hint">Cost: ${format(cost)}</div>
    `;

    const btn = document.createElement("button");
    btn.textContent = "Buy";
    btn.disabled = state.coins < cost;
    btn.onclick = () => handlers.onBuyGenerator(id);

    row.append(left, btn);
    shop.appendChild(row);
  }
}

function renderUpgrades(state, handlers) {
  const box = document.getElementById("upgrades");
  box.innerHTML = "";

  for (const id of Object.keys(UPGRADES)) {
    const up = UPGRADES[id];
    const owned = up.owned(state);

    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.innerHTML = `
      <div><strong>${up.name}</strong>${owned ? " ✅" : ""}</div>
      <div class="hint">${up.desc}</div>
      <div class="hint">Cost: ${format(up.cost)}</div>
    `;

    const btn = document.createElement("button");
    btn.textContent = owned ? "Owned" : "Buy";
    btn.disabled = owned || state.coins < up.cost;
    btn.onclick = () => handlers.onBuyUpgrade(id);

    row.append(left, btn);
    box.appendChild(row);
  }
}