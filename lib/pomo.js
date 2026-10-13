"use client";

// 🍅 Pomodoro — PYQ / padhai wale page par (components/PomoGate). Chalte waqt jis page par
// ho, us SUBJECT ke minute judte hain (owner: "maths mein chalaya to maths ka
// track") — Maths / Reasoning / English / GS / Baaki.
//
//   cgl.pomo.run   { mode: "focus", endAt, startAt, sub, tick, paused?, left? } — is device
//                  ka chalta timer (sync nahi — lib/syncitems LOCAL_ONLY)
//   cgl.pomo.log   { "YYYY-MM-DD": { maths: sec, gs: sec, …, _n: poore pomodoro } }
//                  — sync hota hai

import { storeGet, storeSet } from "./bigstore";
import { dayKey } from "./daytime";

export const FOCUS_MIN = 25;
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
export function stopRun() { setRun(null); }

// ⏸ Roko — bacha hua waqt yaad (left), ginti ruk jati hai.
export function pauseRun(sub) {
  const r = getRun();
  if (!r || r.paused) return;
  tick(sub);
  const cur = getRun();
  if (!cur) return;
  const now = Date.now();
  setRun({ ...cur, paused: true, left: Math.max(0, cur.endAt - now), tick: now });
}
// ▶ Chalu — jahan ruka tha wahin se.
export function resumeRun() {
  const r = getRun();
  if (!r || !r.paused) return;
  const now = Date.now();
  setRun({ ...r, paused: false, endAt: now + (r.left || 0), tick: now, left: undefined });
}
// Site band thi (phone ne browser hi band kar diya, pagehide bhi nahi chala):
// aakhri ginti ke baad bahut der ho gayi to wahin ROKA hua maano — band rehne
// ka waqt nahi ginta.
export function recoverStale() {
  const r = getRun();
  if (!r || r.paused) return;
  if (r.mode !== "focus") { stopRun(); return; }   // purana "aaram" — ab nahi
  const last = r.tick || r.startAt;
  if (Date.now() - last > 150e3 && last < r.endAt) setRun({ ...r, paused: true, left: Math.max(0, r.endAt - last), tick: last });
}

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
// Waqt poora → pomodoro gina aur timer BAND (aaram ka koi screen nahi — owner).
// Ruka hua (paused) ho to kuch nahi ginta.
export function tick(sub) {
  const r = getRun();
  if (!r) return null;
  if (r.paused) return r;
  if (r.mode !== "focus") { stopRun(); return null; }
  const now = Date.now();
  const last = r.tick || r.startAt;
  // Bahut der se ginti nahi hui (site band thi / phone so gaya) — wo waqt
  // nahi ginta; wahin ROKA hua maano.
  if (now - last > 150e3 && last < r.endAt) {
    setRun({ ...r, paused: true, left: Math.max(0, r.endAt - last), tick: last });
    return getRun();
  }
  const upto = Math.min(now, r.endAt);
  const sec = (upto - last) / 1000;
  const done = now >= r.endAt;
  addSec(sub || r.sub || "other", sec, done);
  if (done) {
    try { sessionStorage.setItem("cgl.pomo.after", "1"); } catch { /* ignore */ }
    stopRun();
    return null;
  }
  setRun({ ...r, tick: upto });
  return { ...r, tick: upto };
}

export function fmtMin(sec) {
  const m = Math.round((sec || 0) / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}
