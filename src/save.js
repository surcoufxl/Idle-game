const KEY = "incremental_game_save_v1";

export function saveState(state) {
  const payload = {
    ...state,
    lastTick: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function wipeSave() {
  localStorage.removeItem(KEY);
}