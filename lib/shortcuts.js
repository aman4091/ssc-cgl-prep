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

// Gemini writes bold as **text**, but it often leaves a space inside the
// markers — "**Answer: (b) **". Markdown only closes bold on a ** that directly
// follows a non-space, so that renders as four literal asterisks instead of
// bold. Pull the spaces outside the markers so it bolds the way it was meant to.
//
// Only touches paired **…**. A lone * is left alone on purpose: it is
// multiplication ("20000 * 72/100"), which must survive verbatim.
export function tidyAnswer(text) {
  return String(text || "").replace(
    /\*\*(\s*)([\s\S]*?)(\s*)\*\*/g,
    (m, pre, body, post) => (body.trim() ? `${pre}**${body.trim()}**${post}` : m),
  );
}

export function getSavedShortcut(q) {
  const k = keyFor(q);
  if (!k || k === "::") return "";
  return read()[k] || "";
}
export function saveShortcutFor(q, text) {
  const k = keyFor(q);
  if (!k || k === "::" || !text) return;
  const all = read();
  all[k] = tidyAnswer(text);
  write(all);
}
export function clearSavedShortcut(q) {
  const k = keyFor(q);
  if (!k) return;
  const all = read();
  delete all[k];
  write(all);
}
