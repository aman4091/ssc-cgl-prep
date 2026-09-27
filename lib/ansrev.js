"use client";

// 🔁 Answers ke question ka REVISION hisaab — D0 → D+1 → D+3 → D+7 → D+14.
//
// D0 = jis din question aaya (record ka `at`). Har padaav us din se ginte
// hain, aur ek padaav tabhi "ho gaya" jab us din ya uske baad revise kiya ho.
// Kisi padaav ka din nikal gaya aur revise nahi hua = "chhoota" (laal); aaj
// wala = "aaj" (peela); aage wale = "aane wala".
//
// Ye ✅ (lib/answersdone) se ALAG hai — ✅ ghoomti katar ke liye hai (dabate hi
// neeche chala jata hai). Yahan har revise ki tareekh yaad rehti hai, taaki
// "D+3 hua ya nahi" pakka pata chale. Store: { id: [iso, iso, …] }.

import { storeGet, storeSet } from "./bigstore";
import { dayKey } from "./wrongbook";

const KEY = "cgl.ansrev";
export const GAPS = [1, 3, 7, 14];

function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:ansrev")); } catch { /* SSR */ }
}

export function getRevMap() { return read(); }

// Aaj revise kiya — ek din mein ek hi baar ginta hai.
export function markRevised(id) {
  const all = read();
  const today = dayKey(new Date().toISOString());
  const list = (all[id] || []).filter((x) => dayKey(x) !== today);
  all[id] = [...list, new Date().toISOString()].sort();
  write(all);
  return all;
}
export function unmarkToday(id) {
  const all = read();
  const today = dayKey(new Date().toISOString());
  const list = (all[id] || []).filter((x) => dayKey(x) !== today);
  if (list.length) all[id] = list; else delete all[id];
  write(all);
  return all;
}

const DAY = 864e5;
const d0 = (iso) => new Date(dayKey(iso) + "T00:00:00").getTime();
export const addDaysKey = (dk, n) => dayKey(new Date(new Date(dk + "T00:00:00").getTime() + n * DAY + 12 * 3600e3).toISOString());

// Ek question ka poora schedule.
// -> { age, stages: [{gap, date, state: "ok"|"miss"|"today"|"soon"}], next, due, overdue, revised, level }
export function revPlan(rec, revMap, today = dayKey(new Date().toISOString())) {
  const base = dayKey(rec.at);
  const revs = (revMap[rec.id] || []).map(dayKey).sort();
  const age = Math.round((d0(today + "T00:00:00") - d0(base + "T00:00:00")) / DAY);
  // Har padaav ko uske din ya baad ka PEHLA bacha hua revise bharta hai — ek
  // revise ek hi padaav bharta hai, aur din se pehle ka revise nahi ginta.
  const used = new Set();
  const stages = GAPS.map((g) => {
    const date = addDaysKey(base, g);
    const i = revs.findIndex((r, k) => r >= date && !used.has(k));
    if (i >= 0) { used.add(i); return { gap: g, date, state: "ok", on: revs[i] }; }
    return { gap: g, date, state: date < today ? "miss" : date === today ? "today" : "soon" };
  });
  const next = stages.find((s) => s.state === "today" || s.state === "soon") || null;
  const due = stages.some((s) => s.state === "today");
  const overdue = stages.filter((s) => s.state === "miss").length;
  const level = stages.filter((s) => s.state === "ok").length;
  const revisedToday = revs.includes(today);
  return { base, age, stages, next, due, overdue, level, revs, revisedToday, done: level === GAPS.length };
}

export const stageLabel = (s) => `D+${s.gap}`;
