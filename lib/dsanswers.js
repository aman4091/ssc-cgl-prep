// DeepSeek ke jawab, question ke hisaab se sambhale hue.
//
// Paste kiya hua Gemini jawab `cgl.shortcuts` mein rehta hai. Dono ek hi
// jagah rakhne par ek doosre ko mita dete the, isliye DeepSeek ka apna
// store: ab ek hi question par dono jawab bach sakte hain aur card
// tay karta hai kaunsa dikhana hai (Gemini > DeepSeek > book ka apna).
//
// `cgl.dsanswers` — baaki cgl. keys ki tarah sync hoti hai.

import { storeGet, storeSet } from "./bigstore";
import { keyFor } from "./qstats";
import { tidyAnswer } from "./shortcuts";

const KEY = "cgl.dsanswers";

function read() {
  if (typeof window === "undefined") return {};
  try { const r = storeGet(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) { try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ } }

function ping(k) {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent("cgl:ds-saved", { detail: { key: k } })); }
  catch { /* ignore */ }
}

export function getDsAnswer(q) {
  const k = keyFor(q);
  if (!k || k === "::") return "";
  return read()[k] || "";
}

export function saveDsAnswer(q, text) {
  const k = keyFor(q);
  if (!k || k === "::" || !text) return;
  const all = read();
  all[k] = tidyAnswer(text);
  write(all);
  ping(k);
}

export function clearDsAnswer(q) {
  const k = keyFor(q);
  if (!k) return;
  const all = read();
  delete all[k];
  write(all);
  ping(k);
}
