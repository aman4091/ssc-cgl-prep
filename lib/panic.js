// 🚨 Panic button — motivation khatam, mann bhatak raha hai: button dabao aur
// Instagram ki "Instant" wali reels ek-ek karke saamne.
//
// Videos R2 ke panic/ folder mein hain (scripts/panic-upload.mjs), list
// /api/panic se aati hai. Yahan teen cheezein hain:
//
//   • list    — pichhli baar wali copy turant (network ka intezaar nahi, panic
//               mein 2 second bhi bahut hain), peeche se taaza.
//   • bag     — shuffle ki thaili. Jab tak saari post ek baar na dikh jayein,
//               koi dobara nahi aati. Us device ki apni cheez hai.
//   • log     — kab dabaya, aur baad mein kya chuna. cgl.* hai, isliye sync
//               hota hai — laptop aur phone ki ginti ek.

import { storeGet, storeSet } from "./bigstore";

const LIST_KEY = "cgl.panic.list"; // LOCAL_ONLY (lib/syncitems.js)
const BAG_KEY = "cgl.panic.bag";   // LOCAL_ONLY
const LOG_KEY = "cgl.panic.log";   // sync hota hai — [{ id, at, choice }]

export const SESSION_SIZE = 5;
export const PHOTO_MS = 8000;          // akeli photo kitni der
export const CAROUSEL_PHOTO_MS = 6000; // carousel ki har photo — 13 wali post 13×8s na khinche

// "Ab kya karoge?" ke jawab. Label yahin, taaki log mein sirf chhota key jaye.
export const CHOICES = [
  { key: "task", label: "📋 Aaj ka kaam kholo", href: "/today" },
  { key: "pushups", label: "💪 10 pushups — abhi" },
  { key: "walk", label: "🚶 Kamra chhodo · paani piyo" },
  { key: "more", label: "🔁 Aur 5 dikhao" },
];

function readJson(key, fallback) {
  try {
    const v = JSON.parse(storeGet(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { storeSet(key, JSON.stringify(value)); } catch { /* storage full — panic phir bhi chale */ }
}

export function cachedList() {
  const v = readJson(LIST_KEY, []);
  return Array.isArray(v) ? v : [];
}

export async function fetchList() {
  const res = await fetch("/api/panic", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  const items = Array.isArray(data.items) ? data.items.filter((it) => it?.id && it.media?.length) : [];
  if (!res.ok && !items.length) throw new Error(data.error || `List nahi aayi (${res.status})`);
  if (items.length) writeJson(LIST_KEY, items);
  return items;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Thaili se agli n post. Thaili khatam ho to nayi shuffle — par abhi-abhi
// nikli hui usi session mein dobara na aayein.
export function takeFromBag(items, n = SESSION_SIZE) {
  const byId = new Map(items.map((it) => [it.id, it]));
  let bag = readJson(BAG_KEY, []).filter((id) => byId.has(id));
  const out = [];
  while (out.length < Math.min(n, items.length)) {
    if (!bag.length) {
      const taken = new Set(out);
      bag = shuffle(items.map((it) => it.id).filter((id) => !taken.has(id)));
      if (!bag.length) break;
    }
    out.push(bag.shift());
  }
  writeJson(BAG_KEY, bag);
  return out.map((id) => byId.get(id));
}

function readLog() {
  const v = readJson(LOG_KEY, []);
  return Array.isArray(v) ? v : [];
}

// Dabate hi ek record; choice baad mein usi id par bhara jata hai.
export function logPress() {
  const id = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  writeJson(LOG_KEY, [...readLog(), { id, at: new Date().toISOString(), choice: "" }]);
  return id;
}

export function logChoice(id, choice) {
  if (!id) return;
  writeJson(LOG_KEY, readLog().map((r) => (r.id === id ? { ...r, choice } : r)));
}

// Pichhle 7 din mein kitni baar dabaya (sab devices ka jod, sync ki wajah se).
export function pressesThisWeek() {
  const since = Date.now() - 7 * 24 * 3600 * 1000;
  return readLog().filter((r) => Date.parse(r.at) >= since).length;
}
