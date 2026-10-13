"use client";

// 🔤 Vocab (OWS + Vocab) ka Hindi matlab — DeepSeek se, PEECHHE, 50-50 karke.
// Jahan tak padh rahe ho uske 50 aur AGLE 50 ban jaate hain (components/
// VocabLayouts Cover). Jo ban gaya wo dobara nahi maangte.
//
//   cgl.vocab.hindi2  { "<word lowercase>": "हिंदी मतलब" }   — sync hota hai

import { storeGet, storeSet } from "./bigstore";
import { vocabHindi } from "./client-ai";

// v2 — pehle wale bahut shuddh Hindi mein the (owner), naya prompt bolchaal ki
// Hindi deta hai; nayi key taaki saare dobara isi tarah banein.
const KEY = "cgl.vocab.hindi2";
const BATCH = 25;   // ek call mein — 50 ka jattha do call mein
const key = (w) => String(w || "").trim().toLowerCase();
const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:vocab-hindi")); } catch { /* ignore */ } };

export function getHindiMap() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
export const hindiOf = (map, word) => map[key(word)] || "";

const queue = [];
const asked = new Set();
const tries = new Map();   // shabd -> kitni baar maanga (2 baar tak)
let running = 0;
let lastErr = "";
export const hindiError = () => lastErr;
export const hindiBusy = () => running > 0 || queue.length > 0;
const PARALLEL = 2;        // do jatthe saath — jaldi aaye

async function worker() {
  running++;
  ping();
  while (queue.length) {
    const batch = queue.splice(0, BATCH);
    try {
      const { items } = await vocabHindi(batch);
      const map = getHindiMap();
      for (const it of items || []) if (it && it.w && it.hi) map[key(it.w)] = it.hi;
      try { storeSet(KEY, JSON.stringify(map)); } catch { /* quota */ }
      // Jinka jawab nahi aaya — ek baar aur line mein, phir chhod do.
      let miss = 0;
      for (const b of batch) {
        const k = key(b.word);
        if (map[k]) continue;
        miss++;
        const t = (tries.get(k) || 1) + 1;
        tries.set(k, t);
        if (t <= 2) queue.push(b); else asked.delete(k);
      }
      lastErr = miss === batch.length ? "DeepSeek ne Hindi nahi diya" : "";
    } catch (e) {
      lastErr = e.message || "Hindi nahi bana";
      for (const b of [...batch, ...queue]) asked.delete(key(b.word));
      queue.length = 0;
    }
    ping();
  }
  running--;
  ping();
}
function run() {
  while (running < PARALLEL && queue.length) worker();
}

// items: [{ word, def }] — jinka Hindi nahi hai, line mein.
export function ensureHindi(items) {
  const map = getHindiMap();
  let added = 0;
  for (const it of items || []) {
    const k = key(it.word);
    if (!k || map[k] || asked.has(k)) continue;
    asked.add(k);
    queue.push({ word: it.word, def: it.def || "" });
    added++;
  }
  if (added) run();
}
