"use client";

// 🔁 Answers ke question ka REVISION hisaab — D0 → D+1 → D+3 → D+7 → D+14.
//
// D0 = jis din owner ne us question ko PEHLI BAAR "ho gaya" (✅) mark kiya —
// question kab aaya tha, usse koi matlab nahi. Jab tak ✅ nahi hua, question
// "abhi shuru nahi" hai aur uska koi padaav nahi. D0 ke baad har ✅ (ya 🔁)
// ek revise hai; ek din mein ek hi ginta hai.
//
// Padaav: ho gaya / aaj / chhoota (din nikal gaya) / aane wala. Har padaav ko
// uske din ya baad ka pehla bacha hua revise bharta hai; din se pehle ka
// revise nahi ginta.
//
// Store: { id: { s: iso (D0), r: [iso, …] } } — "cgl.ansrev2". Pehla wala
// "cgl.ansrev" (D0 = question aane ka din) owner ke kehne par RESET — wo key
// pehli baar khulte hi mita di jaati hai.

import { storeGet, storeSet, storeRemove } from "./bigstore";
import { dayKey } from "./wrongbook";

const KEY = "cgl.ansrev2";
const OLD = "cgl.ansrev";
export const GAPS = [1, 3, 7, 14];

let cleaned = false;
function read() {
  if (typeof window === "undefined") return {};
  if (!cleaned) { cleaned = true; try { if (storeGet(OLD) != null) storeRemove(OLD); } catch { /* ignore */ } }
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:ansrev")); } catch { /* SSR */ }
}
const todayKey = () => dayKey(new Date().toISOString());

export function getRevMap() { return read(); }

// ✅ Ho gaya — pehli baar = D0 (aaj), uske baad = aaj ka revise.
export function markDoneRev(id) {
  const all = read();
  const now = new Date().toISOString();
  const e = all[id];
  if (!e || !e.s) all[id] = { s: now, r: [] };
  else if (dayKey(e.s) !== todayKey() && !(e.r || []).some((x) => dayKey(x) === todayKey())) {
    all[id] = { ...e, r: [...(e.r || []), now].sort() };
  }
  write(all);
  return all;
}

// Aaj ka nishaan wapas — aaj hi shuru hua tha to poora hat jata hai.
export function unmarkToday(id) {
  const all = read();
  const e = all[id];
  if (!e) return all;
  const r = (e.r || []).filter((x) => dayKey(x) !== todayKey());
  if (r.length !== (e.r || []).length) all[id] = { ...e, r };
  else if (dayKey(e.s) === todayKey()) delete all[id];
  write(all);
  return all;
}

const DAY = 864e5;
const t0 = (dk) => new Date(dk + "T00:00:00").getTime();
export const addDaysKey = (dk, n) => dayKey(new Date(t0(dk) + n * DAY + 12 * 3600e3).toISOString());

// Ek question ka schedule. Shuru nahi hua to { started: false }.
export function revPlan(rec, revMap, today = todayKey()) {
  const e = revMap[rec.id];
  if (!e || !e.s) return { started: false, stages: [], level: 0, due: false, overdue: 0, done: false, revisedToday: false };
  const base = dayKey(e.s);
  const revs = (e.r || []).map(dayKey).sort();
  const age = Math.round((t0(today) - t0(base)) / DAY);
  const used = new Set();
  const stages = GAPS.map((g) => {
    const date = addDaysKey(base, g);
    const i = revs.findIndex((r, k) => r >= date && !used.has(k));
    if (i >= 0) { used.add(i); return { gap: g, date, state: "ok", on: revs[i] }; }
    return { gap: g, date, state: date < today ? "miss" : date === today ? "today" : "soon" };
  });
  const level = stages.filter((s) => s.state === "ok").length;
  return {
    started: true, base, age, stages, revs, level,
    next: stages.find((s) => s.state === "today" || s.state === "soon") || null,
    due: stages.some((s) => s.state === "today"),
    overdue: stages.filter((s) => s.state === "miss").length,
    revisedToday: base === today || revs.includes(today),
    doneToday: base === today,
    done: level === GAPS.length,
  };
}
