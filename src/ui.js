import {
  ITEMS, SKILLS, ACTIONS, RECIPES,
  getSkillLevel, xpToNext, resolveTask, isLocked,
  QUEUE_INF
} from "./game.js";

export function format(num) {
  if (!Number.isFinite(num)) return "0";
  if (num < 1000) return String(Math.floor(num));
  const units = ["K","M","B","T","Qa","Qi"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return `${n.toFixed(2)}${units[u]}`;
}

function fmtRem(x) {
  return x === QUEUE_INF ? "∞" : String(x);
}

export function renderAll(state, handlers) {
  document.getElementById("coins").textContent = format(state.inventory.copperOre ?? 0);
  document.getElementById("clickPower").textContent = format(state.clickPower);

  const running = state.runningSkill;
  const mode = state.mode;
  document.getElementById("cps").textContent =
    running ? `${SKILLS[running].name}${mode === "queue" ? " (QUEUE)" : ""}` : "—";

  renderSkills(state, handlers);
  renderInventory(state);
  renderAction(state, handlers);
}

function renderSkills(state, handlers) {
  const root = document.getElementById("skills");
  root.innerHTML = "";

  for (const skill of Object.keys(SKILLS)) {
    const box = document.createElement("div");
    box.className = "item";

    const left = document.createElement("div");
    const lvl = getSkillLevel(state, skill);
    const xp = state.skills[skill].xp;
    const need = xpToNext(lvl);

    const title = document.createElement("div");
    title.innerHTML =
      `<strong>${SKILLS[skill].name}</strong> (Lv ${lvl}${lvl >= 1000 ? " MAX" : ""})
       <span class="hint">${format(xp)} / ${format(need)} XP</span>`;

    const running = state.runningSkill === skill;
    const line = document.createElement("div");
    line.className = "hint";
    line.textContent = running ? "Main skill ✅" : " ";

    left.appendChild(title);
    left.appendChild(line);

    const right = document.createElement("div");
    right.style.display = "grid";
    right.style.gap = "8px";
    right.style.justifyItems = "end";

    const runBtn = document.createElement("button");
    runBtn.textContent = running ? "Selected ✅" : "Select";
    runBtn.onclick = () => handlers.onRunSkill(skill);
    right.appendChild(runBtn);

    box.append(left, right);
    root.appendChild(box);
  }
}

function renderAction(state, handlers) {
  const root = document.getElementById("action");
  root.innerHTML = "";

  const running = state.runningSkill;
  if (!running) {
    const msg = document.createElement("div");
    msg.className = "hint";
    msg.textContent = "Select a main skill first.";
    root.appendChild(msg);
    return;
  }

  // --- MAIN ACTION ---
  const mainTitle = document.createElement("div");
  mainTitle.innerHTML = `<strong>Main action</strong>`;
  root.appendChild(mainTitle);

  const mainSelect = document.createElement("select");
  mainSelect.id = "mainTaskSelect";
  styleSelect(mainSelect);

  const sel = state.selected?.[running];
  const opts = [];
  for (const a of Object.values(ACTIONS)) if (a.skill === running) opts.push({ kind: "action", id: a.id, name: a.name, req: a.requiresLevel ?? 1 });
  for (const r of Object.values(RECIPES)) if (r.skill === running) opts.push({ kind: "recipe", id: r.id, name: r.name, req: r.requiresLevel ?? 1 });

  for (const opt of opts) {
    const o = document.createElement("option");
    o.value = `${opt.kind}:${opt.id}`;
    o.textContent = `${opt.kind === "action" ? "Gather" : "Recipe"}: ${opt.name}${opt.req > 1 ? ` (Lv ${opt.req})` : ""}`;
    if (sel && sel.kind === opt.kind && sel.id === opt.id) o.selected = true;
    mainSelect.appendChild(o);
  }

  mainSelect.onchange = (e) => {
    const [kind, id] = e.target.value.split(":");
    handlers.onSelectMainTask(running, kind, id);
  };

  root.appendChild(mainSelect);

  const mainTask = resolveTask(state.main.kind, state.main.id);
  const mainInfo = document.createElement("div");
  mainInfo.className = "hint";
  if (!mainTask) {
    mainInfo.textContent = "Main: —";
  } else if (isLocked(state, mainTask)) {
    mainInfo.textContent = `Locked: requires level ${mainTask.requiresLevel}.`;
  } else if (state.main.kind === "recipe") {
    const reqs = Object.entries(mainTask.inputs).map(([k, v]) => `${ITEMS[k]?.name ?? k} x${v}`).join(", ");
    mainInfo.textContent = `Inputs: ${reqs}`;
  } else {
    mainInfo.textContent = "Runs automatically in MAIN mode.";
  }
  root.appendChild(mainInfo);

  // --- MODE CONTROLS ---
  const modeRow = document.createElement("div");
  modeRow.style.display = "flex";
  modeRow.style.gap = "8px";
  modeRow.style.flexWrap = "wrap";
  modeRow.style.marginTop = "10px";

  const runQueueBtn = document.createElement("button");
  runQueueBtn.textContent = state.mode === "queue" ? "Running queue ✅" : "Run queued now";
  runQueueBtn.onclick = () => handlers.onRunQueue();
  modeRow.appendChild(runQueueBtn);

  const resumeBtn = document.createElement("button");
  resumeBtn.textContent = "Resume main";
  resumeBtn.onclick = () => handlers.onResumeMain();
  modeRow.appendChild(resumeBtn);

  root.appendChild(modeRow);

  // --- QUEUE BUILDER ---
  const spacer = document.createElement("div");
  spacer.style.height = "10px";
  root.appendChild(spacer);

  const qTitle = document.createElement("div");
  qTitle.innerHTML = `<strong>Queue planner</strong>`;
  root.appendChild(qTitle);

  const builderRow = document.createElement("div");
  builderRow.style.display = "grid";
  builderRow.style.gap = "8px";
  builderRow.style.marginTop = "8px";

  // skill select
  const skillSelect = document.createElement("select");
  skillSelect.id = "queueSkillSelect";
  styleSelect(skillSelect);

  for (const sk of Object.keys(SKILLS)) {
    const o = document.createElement("option");
    o.value = sk;
    o.textContent = SKILLS[sk].name;
    if (state.queueBuilder?.skill === sk) o.selected = true;
    skillSelect.appendChild(o);
  }
  skillSelect.onchange = (e) => handlers.onQueueSkill(e.target.value);

  // task select filtered by builder skill
  const taskSelect = document.createElement("select");
  taskSelect.id = "queueTaskSelect";
  styleSelect(taskSelect);

  const bSkill = state.queueBuilder?.skill ?? "smithing";
  const b = state.queueBuilder;

  const builderOpts = [];
  for (const a of Object.values(ACTIONS)) if (a.skill === bSkill) builderOpts.push({ kind: "action", id: a.id, name: a.name, req: a.requiresLevel ?? 1 });
  for (const r of Object.values(RECIPES)) if (r.skill === bSkill) builderOpts.push({ kind: "recipe", id: r.id, name: r.name, req: r.requiresLevel ?? 1 });

  for (const opt of builderOpts) {
    const o = document.createElement("option");
    o.value = `${opt.kind}:${opt.id}`;
    o.textContent = `${opt.kind === "action" ? "Gather" : "Recipe"}: ${opt.name}${opt.req > 1 ? ` (Lv ${opt.req})` : ""}`;
    if (b && b.kind === opt.kind && b.id === opt.id) o.selected = true;
    taskSelect.appendChild(o);
  }

  taskSelect.onchange = (e) => {
    const [kind, id] = e.target.value.split(":");
    handlers.onQueueTask(kind, id);
  };

  builderRow.appendChild(skillSelect);
  builderRow.appendChild(taskSelect);

  // enqueue buttons
  const addRow = document.createElement("div");
  addRow.style.display = "flex";
  addRow.style.gap = "6px";
  addRow.style.flexWrap = "wrap";

  const mkAdd = (label, value) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = () => handlers.onEnqueue(value);
    return btn;
  };
  addRow.appendChild(mkAdd("Add x1", 1));
  addRow.appendChild(mkAdd("Add x10", 10));
  addRow.appendChild(mkAdd("Add x100", 100));
  addRow.appendChild(mkAdd("Add x∞", QUEUE_INF));

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear queue";
  clearBtn.onclick = () => handlers.onClearQueue();
  addRow.appendChild(clearBtn);

  builderRow.appendChild(addRow);
  root.appendChild(builderRow);

  // --- QUEUE LIST ---
  const listTitle = document.createElement("div");
  listTitle.style.marginTop = "12px";
  listTitle.innerHTML = `<strong>Queued jobs</strong>`;
  root.appendChild(listTitle);

  const q = Array.isArray(state.jobQueue) ? state.jobQueue : [];
  if (q.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Queue is empty.";
    root.appendChild(empty);
    return;
  }

  for (let i = 0; i < q.length; i++) {
    const item = q[i];
    const task = resolveTask(item.kind, item.id);

    const row = document.createElement("div");
    row.className = "item";
    row.style.margin = "10px 0";

    const left = document.createElement("div");
    const skillName = SKILLS[item.skill]?.name ?? item.skill;
    left.innerHTML =
      `<div><strong>${task ? task.name : `${item.kind}:${item.id}`}</strong></div>
       <div class="hint">${skillName} • x${fmtRem(item.remaining)}</div>`;

    const right = document.createElement("div");
    right.style.display = "grid";
    right.style.gap = "6px";
    right.style.justifyItems = "end";

    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.onclick = () => handlers.onRemoveQueue(i);

    right.appendChild(rm);
    row.append(left, right);
    root.appendChild(row);
  }
}

function styleSelect(sel) {
  sel.style.padding = "8px";
  sel.style.borderRadius = "10px";
  sel.style.background = "transparent";
  sel.style.color = "inherit";
  sel.style.border = "1px solid rgba(255,255,255,0.12)";
  sel.style.width = "100%";
}

function renderInventory(state) {
  const root = document.getElementById("inventory");
  root.innerHTML = "";

  const always = new Set([
    "copperOre","tinOre","ironOre","logs",
    "copperBar","bronzeBar","ironBar",
    "planks","bow","arrows"
  ]);

  const keys = Object.keys(ITEMS)
    .filter(k => always.has(k) || (state.inventory[k] ?? 0) > 0)
    .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));

  for (const k of keys) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.innerHTML = `<strong>${ITEMS[k].name}</strong>`;

    const right = document.createElement("div");
    right.style.alignSelf = "center";
    right.textContent = format(state.inventory[k] ?? 0);

    row.append(left, right);
    root.appendChild(row);
  }
}