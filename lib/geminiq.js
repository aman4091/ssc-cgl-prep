// ✨ Jin question ka answer maine KHUD Gemini se laa kar paste kiya.
//
// Quiz/PYQ ke har question card par ek paste-box hai (components/PasteAnswer).
// Wahan paste karte hi do cheezein hoti hain:
//   1. Wo text us question ka shortcut/solution ban jata hai (lib/shortcuts) —
//      "Show answer" par wahi khulta hai. Ye pehle se tha.
//   2. Wahi question, apne Gemini wale answer ke saath, YAHAN bhi jama ho jata
//      hai — taaki /gemini par sab ek jagah mil jayein.
//
// Sirf HAATH SE paste kiya hua yahan aata hai. ⚡ Shortcut trick jo app khud
// AI se maang leta hai wo nahi — wo apne aap ban jata hai, usme "maine ye
// dhoondha tha" wali baat hai hi nahi. Isliye hook PasteAnswer ke Save par
// hai, lib/shortcuts ke saveShortcutFor par nahi.
//
// Har subject ke liye — Maths, Reasoning, English, GS, Current Affairs. Question
// ka poora roop (`q`) sambhal kar rakhte hain, sirf text nahi, taaki tasveer
// wale Maths/Reasoning question page par apne asli card mein khul sakein.

import { keyFor } from "./qstats";
import { storeGet, storeSet, storeRemove } from "./bigstore";

const KEY = "cgl.geminiq";

function read() {
  if (typeof window === "undefined") return [];
  try { const r = storeGet(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:geminiq-changed")); } catch { /* SSR */ }
}

export function getGeminiQs() { return read(); }

// kind: "math" | "reason" | "text" — page ko batata hai ki kaunsa card kholna
// hai. Tasveer wale bank ka question PyqQuestionCard mein khule to sirf
// "[id] qText" dikhta hai, asli sawaal (jo image mein hai) nahi.
export function saveGeminiQ({ q, subject = "", category = "", kind = "text", answer = "" }) {
  const text = String(answer || "").trim();
  if (!q || !text) return null;
  const k = keyFor(q);
  if (!k || k === "::") return null;

  const all = read();
  const i = all.findIndex((r) => r.key === k);
  const prev = i >= 0 ? all[i] : null;
  const rec = {
    key: k,
    q,
    subject: subject || prev?.subject || "",
    category: category || prev?.category || "",
    kind: kind || prev?.kind || "text",
    answer: text,
    firstAt: prev?.firstAt || new Date().toISOString(),
    at: new Date().toISOString(),
  };
  // Ek question ek hi baar. Answer dobara paste karo to wahi record sudharta
  // hai aur naya hone ke naate sabse upar aa jata hai.
  if (i >= 0) all.splice(i, 1);
  all.unshift(rec);
  write(all);
  return rec;
}

export function removeGeminiQ(key) {
  const all = read();
  const next = all.filter((r) => r.key !== key);
  if (next.length !== all.length) write(next);
}

// Card par se saved answer hataya to yahan se bhi jaana chahiye — warna page
// par ek aisa answer pada rehta jo question par hai hi nahi.
export function removeGeminiQFor(q) {
  const k = keyFor(q);
  if (k && k !== "::") removeGeminiQ(k);
}

export function clearGeminiQs() {
  try { storeRemove(KEY); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:geminiq-changed")); } catch { /* SSR */ }
}
