// Daily targets — actionable items shown on the Today page.
// Priority-ordered: not-done targets are kept in a manual order (top = #1); the
// Focus Enforcer nags about whichever is #1.
import { makeId } from "./storage";

const KEY = "cgl.targets";

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

// Backfill `order` for legacy targets (added before priority existed), using the
// old sort (not-done first, newest first) so nothing jumps around on first load.
function withOrder(list) {
  if (list.every((t) => Number.isFinite(t.order))) return list;
  const sorted = [...list].sort((a, b) =>
    a.done === b.done ? (b.createdAt || "").localeCompare(a.createdAt || "") : a.done ? 1 : -1);
  const orderById = new Map(sorted.map((t, i) => [t.id, i]));
  const fixed = list.map((t) => (Number.isFinite(t.order) ? t : { ...t, order: orderById.get(t.id) }));
  write(fixed);
  return fixed;
}

// Sorted for display: not-done first BY manual order, then done (newest first).
export function getTargets() {
  return withOrder(read()).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.done) return (a.order ?? 0) - (b.order ?? 0);
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

// The #1 pending target (top of the manual order) — what the enforcer chases.
export function getTopPending() {
  return getTargets().find((t) => !t.done) || null;
}

export function addTarget({ type, title, ref }) {
  const all = withOrder(read());
  const maxOrder = all.reduce((m, t) => Math.max(m, t.order ?? 0), -1);
  const t = {
    id: "tg_" + makeId(), type, title: title || "", ref: ref || {},
    done: false, startedAt: "", order: maxOrder + 1, createdAt: new Date().toISOString(),
  };
  all.push(t); // new target goes to the BOTTOM of pending (existing #1 stays #1)
  write(all);
  return t;
}

// Move a pending target up (-1) or down (+1) by swapping order with its neighbour.
export function moveTarget(id, dir) {
  const pending = getTargets().filter((t) => !t.done);
  const idx = pending.findIndex((t) => t.id === id);
  const swapIdx = idx + (dir < 0 ? -1 : 1);
  if (idx < 0 || swapIdx < 0 || swapIdx >= pending.length) return;
  const a = pending[idx], b = pending[swapIdx];
  const all = read().map((t) => {
    if (t.id === a.id) return { ...t, order: b.order };
    if (t.id === b.id) return { ...t, order: a.order };
    return t;
  });
  write(all);
}

export function startTarget(id) {
  write(read().map((t) => (t.id === id ? { ...t, startedAt: t.startedAt || new Date().toISOString() } : t)));
}

export function toggleDone(id) {
  write(read().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
}
export function setTargetDone(id, done = true) {
  write(read().map((t) => (t.id === id ? { ...t, done } : t)));
}
export function deleteTarget(id) { write(read().filter((t) => t.id !== id)); }
