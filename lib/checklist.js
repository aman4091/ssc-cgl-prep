// Checklist store for the navbar quick-panel. Each task is either:
//   - "daily": a repeating task whose tick auto-clears every new day
//   - "once":  a one-time task that stays ticked until you clear it
// All local (localStorage). Day rolls over at the configured day-end (late sleeper).
import { dayKey } from "./daytime";

const KEY = "cgl.checklist";
const todayKey = () => dayKey();

function read() {
  if (typeof window === "undefined") return [];
  try { const o = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(o) ? o : []; } catch { return []; }
}
function write(list) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
}

function id() { return "ck_" + Math.random().toString(36).slice(2, 9); }

// Is this task checked *right now* (daily tasks only count for today).
export function isChecked(t) {
  return t.mode === "once" ? !!t.done : t.lastDone === todayKey();
}

// Returns tasks with a computed `checked` flag for today.
export function getTasks() {
  return read().map((t) => ({ ...t, checked: isChecked(t) }));
}

export function addTask(text, mode = "daily") {
  const clean = String(text || "").trim();
  if (!clean) return getTasks();
  const list = read();
  list.push({ id: id(), text: clean, mode: mode === "once" ? "once" : "daily", done: false, lastDone: "", createdAt: new Date().toISOString() });
  write(list);
  return getTasks();
}

export function toggleTask(taskId) {
  const list = read();
  const t = list.find((x) => x.id === taskId);
  if (t) {
    if (t.mode === "once") t.done = !t.done;
    else t.lastDone = t.lastDone === todayKey() ? "" : todayKey();
    write(list);
  }
  return getTasks();
}

// Flip a task between daily <-> once (keeps its checked state sensibly).
export function toggleMode(taskId) {
  const list = read();
  const t = list.find((x) => x.id === taskId);
  if (t) {
    const wasChecked = isChecked(t);
    t.mode = t.mode === "once" ? "daily" : "once";
    if (t.mode === "once") { t.done = wasChecked; t.lastDone = ""; }
    else { t.lastDone = wasChecked ? todayKey() : ""; t.done = false; }
    write(list);
  }
  return getTasks();
}

export function removeTask(taskId) {
  write(read().filter((x) => x.id !== taskId));
  return getTasks();
}

// Remove all currently-checked tasks.
export function clearChecked() {
  write(read().filter((t) => !isChecked(t)));
  return getTasks();
}

// { done, total } for today's view.
export function getProgress() {
  const list = getTasks();
  return { done: list.filter((t) => t.checked).length, total: list.length };
}
