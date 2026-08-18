// Persisted shortcut-trick answers, keyed by question. Once generated, a
// shortcut stays saved and comes back whenever the button is pressed again —
// it only changes when the user hits "New shortcut".
import { keyFor } from "./qstats";

import { storeGet, storeSet, storeRemove } from "./bigstore";
const KEY = "cgl.shortcuts";

function read() {
  if (typeof window === "undefined") return {};
  try { const r = storeGet(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) { try { storeSet(KEY, JSON.stringify(v)); } catch { /* ignore */ } }

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
// Question card apni saved-answer ki copy mount pe padhta hai. Paste box card ke
// andar hi hota hai par apna alag component hai — bina is khabar ke card ko pata
// hi nahi chalta ki abhi-abhi answer save hua, aur paste kiya jawab reload tak
// dikhta hi nahi tha. Isliye har save/clear pe key ke saath ping.
function ping(k) {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent("cgl:shortcut-saved", { detail: { key: k } })); }
  catch { /* ignore */ }
}

export function saveShortcutFor(q, text) {
  const k = keyFor(q);
  if (!k || k === "::" || !text) return;
  const all = read();
  all[k] = tidyAnswer(text);
  write(all);
  ping(k);
}
export function clearSavedShortcut(q) {
  const k = keyFor(q);
  if (!k) return;
  const all = read();
  delete all[k];
  write(all);
  ping(k);
}
