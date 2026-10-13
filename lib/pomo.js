"use client";

// 🍅 Pomodoro — PYQ / padhai wale page par (components/PomoGate). Chalte waqt jis page par
// ho, us SUBJECT ke minute judte hain (owner: "maths mein chalaya to maths ka
// track") — Maths / Reasoning / English / GS / Baaki.
//
//   cgl.pomo.run   { mode: "focus"|"break", endAt, startAt, sub }  — is device
//                  ka chalta timer (sync nahi — lib/syncitems LOCAL_ONLY)
//   cgl.pomo.log   { "YYYY-MM-DD": { maths: sec, gs: sec, …, _n: poore pomodoro } }
//                  — sync hota hai

import { storeGet, storeSet } from "./bigstore";
import { dayKey } from "./daytime";

export const FOCUS_MIN = 25;
export const BREAK_MIN = 5;
const RUN = "cgl.pomo.run";
const LOG = "cgl.pomo.log";

export const SUBJ = {
  maths: { icon: "🧮", label: "Maths" },
  reasoning: { icon: "🧠", label: "Reasoning" },
  english: { icon: "📘", label: "English" },
  gs: { icon: "🌍", label: "GS" },
  other: { icon: "📎", label: "Baaki" },
};

// Page ke pate se subject. Answers par ?subject= dekha jata hai.
export function subjectOfPath(path, search = "") {
  const p = String(path || "");
  if (/^\/answers|^\/mistakes/.test(p)) {
    const s = new URLSearchParams(search || "").get("subject") || "";
    if (/math/.test(s)) return "maths";
    if (/reason/.test(s)) return "reasoning";
    if (/english/.test(s)) return "english";
    if (/gs/.test(s)) return "gs";
    return "maths";   // Answers ka apna default Maths hai
  }
  if (/\/(mathbank|maths2025|all\/maths|calc|calculation|formulas)/.test(p)) return "maths";
  if (/\/(reasonbank|all\/reasoning)/.test(p)) return "reasoning";
  if (/\/(pinnacle|errorpro|mirror|all\/english|vocab|english)/.test(p)) return "english";
  if (/\/(war|gktricks|pyq\/gk|all\/gs|notes|current-affairs|static|statics|culture|mission|one-liners)/.test(p)) return "gs";
  return "other";
}
// Padhai wale page — wahan pehle Answers ke roop 9 jaisa "🍅 Shuru" card (components/PomoGate).
export const isStudyPath = (p) => /^\/(pyq|answers|mistakes|vocab|notes|calculation|formulas|current-affairs|statics)/.test(String(p || ""));

const read = (k, d) => { try { const v = JSON.parse(storeGet(k) || "null"); return v ?? d; } catch { return d; } };
const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:pomo")); } catch { /* ignore */ } };

export function getRun() { return read(RUN, null); }
function setRun(v) { try { if (v) storeSet(RUN, JSON.stringify(v)); else storeSet(RUN, "null"); } catch { /* quota */ } ping(); }

export function startFocus(sub) {
  const now = Date.now();
  setRun({ mode: "focus", startAt: now, endAt: now + FOCUS_MIN * 60e3, sub, tick: now });
}
export function startBreak() {
  const now = Date.now();
  setRun({ mode: "break", startAt: now, endAt: now + BREAK_MIN * 60e3, tick: now });
}
export function stopRun() { setRun(null); }

export function getLog() { return read(LOG, {}); }
function addSec(sub, sec, done) {
  if (sec <= 0 && !done) return;
  const all = getLog();
  const k = dayKey();
  const d = all[k] || {};
  if (sec > 0) d[sub] = (d[sub] || 0) + Math.round(sec);
  if (done) d._n = (d._n || 0) + 1;
  all[k] = d;
  try { storeSet(LOG, JSON.stringify(all)); } catch { /* quota */ }
}

// Har kuch second: pichhli tick se ab tak ka focus time is page ke subject mein.
// Waqt poora → pomodoro gina, phir aaram. Tab band ho to bhi endAt tak hi ginta hai.
export function tick(sub) {
  const r = getRun();
  if (!r) return null;
  const now = Date.now();
  if (r.mode === "focus") {
    const upto = Math.min(now, r.endAt);
    const sec = (upto - (r.tick || r.startAt)) / 1000;
    const done = now >= r.endAt;
    addSec(sub || r.sub || "other", sec, done);
    if (done) { startBreak(); return getRun(); }
    setRun({ ...r, tick: upto });
    return { ...r, tick: upto };
  }
  if (now >= r.endAt) { stopRun(); return null; }
  return r;
}

export function fmtMin(sec) {
  const m = Math.round((sec || 0) / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}
