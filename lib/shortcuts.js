// Persisted shortcut-trick answers, keyed by question. Once generated, a
// shortcut stays saved and comes back whenever the button is pressed again —
// it only changes when the user hits "New shortcut".
import { keyFor } from "./qstats";

const KEY = "cgl.shortcuts";

function read() {
  if (typeof window === "undefined") return {};
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }

export function getSavedShortcut(q) {
  const k = keyFor(q);
  if (!k || k === "::") return "";
  return read()[k] || "";
}
export function saveShortcutFor(q, text) {
  const k = keyFor(q);
  if (!k || k === "::" || !text) return;
  const all = read();
  all[k] = text;
  write(all);
}
export function clearSavedShortcut(q) {
  const k = keyFor(q);
  if (!k) return;
  const all = read();
  delete all[k];
  write(all);
}
