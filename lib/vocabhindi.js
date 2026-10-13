"use client";

// 🔤 Vocab (OWS + Vocab) ka Hindi matlab — DeepSeek se, PEECHHE, 50-50 karke.
// Jahan tak padh rahe ho uske 50 aur AGLE 50 ban jaate hain (components/
// VocabLayouts Cover). Jo ban gaya wo dobara nahi maangte.
//
//   cgl.vocab.hindi   { "<word lowercase>": "हिंदी मतलब" }   — sync hota hai

import { storeGet, storeSet } from "./bigstore";
import { vocabHindi } from "./client-ai";

const KEY = "cgl.vocab.hindi";
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
let running = false;
let lastErr = "";
export const hindiError = () => lastErr;
export const hindiBusy = () => running || queue.length > 0;

async function run() {
  if (running) return;
  running = true;
  ping();
  while (queue.length) {
    const batch = queue.splice(0, BATCH);
    try {
      const { items } = await vocabHindi(batch);
      const map = getHindiMap();
      for (const it of items || []) map[key(it.w)] = it.hi;
      // Jinka jawab nahi aaya — agli baar phir maang sakein.
      for (const b of batch) if (!map[key(b.word)]) asked.delete(key(b.word));
      try { storeSet(KEY, JSON.stringify(map)); } catch { /* quota */ }
      lastErr = "";
    } catch (e) {
      lastErr = e.message || "Hindi nahi bana";
      for (const b of [...batch, ...queue]) asked.delete(key(b.word));
      queue.length = 0;
    }
    ping();
  }
  running = false;
  ping();
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
