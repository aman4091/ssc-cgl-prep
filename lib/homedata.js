"use client";

// 🏠 Home ke 20 roop (components/Home20) ka saara data ek jagah — sets ke
// natije (lib/settests), Wrong Sets, beech mein chhode test (lib/setprog),
// aaj / pichhle din ki ginti (lib/qcounter), exam ke din, aur ek chhoti
// TODO list. Har roop yahi padhta hai, bas alag dhang se dikhata hai.

import { useEffect, useState } from "react";
import { ALL_SUBJECTS, countsFor } from "./allbank";
import { getAllResults, marksOf } from "./settests";
import { allProgs } from "./setprog";
import { getWrongSets, WRONG_KEY } from "./wrongsets";
import { getChapterResults } from "./settests";
import { getCounts, counterHistory } from "./qcounter";
import { storeGet, storeSet } from "./bigstore";
import { todayProg } from "./dailyprog";
import { getFacts } from "./missionfacts";
import { factSecs } from "./factslides";
import { getExam, daysBetween } from "./mission";

export const SUBJ = ALL_SUBJECTS.map((s) => ({ ...s, href: `/pyq/all/${s.slug}`, k: s.subject }));
export const PER_DAY = 2;   // roz har subject ke kitne set — hisaab / salah ke liye

// Natije ki chapter-key → subject
export function subjOfKey(key) {
  const k = String(key || "");
  if (k.startsWith("wrongsets:")) return "wrong";
  if (k.startsWith("answers:")) return "answers";
  if (k.startsWith("ca:")) return "ca";
  if (/^all:maths|^mathbank:|^maths2025:/.test(k)) return "math";
  if (/^all:reasoning|^reasonbank:/.test(k)) return "reasoning";
  if (/^all:english|^pinnacle:|^errorpro:|^mirror:|^eng/.test(k)) return "english";
  if (/^all:gs|^war:|^gk:|^pyq:\/pyq\/gk/.test(k)) return "gs";
  return "other";
}

const dk = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
export const todayKey = () => dk(Date.now());
export function dayKeyBack(n) { const d = new Date(); d.setDate(d.getDate() - n); return dk(d); }

// ── TODO (chhoti list, sync hoti hai) ──
const TODO = "cgl.home.todo";
// storeSet — hataya hua todo doosre device par bhi hate (sync ko khabar).
export function getTodos() { try { const v = JSON.parse(storeGet(TODO) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
export function setTodos(v) { try { storeSet(TODO, JSON.stringify(v)); } catch { /* quota */ } try { window.dispatchEvent(new CustomEvent("cgl:home")); } catch { /* ignore */ } }

function collect() {
  const res = getAllResults().filter((r) => r && r.at);
  const today = todayKey();
  const bySub = {};
  for (const s of [...SUBJ.map((x) => x.k), "ca", "wrong", "answers", "other"]) bySub[s] = { sets: 0, today: 0, right: 0, wrong: 0, skipped: 0, marks: 0, last: null };
  const byDay = {};
  const daySub = {};   // { "YYYY-MM-DD": { math: n, … } }
  for (const r of res) {
    const s = bySub[subjOfKey(r.key)] || bySub.other;
    s.sets++; s.right += r.right || 0; s.wrong += r.wrong || 0; s.skipped += r.skipped || 0; s.marks += marksOf(r);
    const d = dk(r.at);
    if (d === today) s.today++;
    if (!s.last || r.at > s.last.at) s.last = r;
    byDay[d] = (byDay[d] || 0) + 1;
    const sk = subjOfKey(r.key);
    (daySub[d] = daySub[d] || {})[sk] = ((daySub[d] || {})[sk] || 0) + 1;
  }
  const recentAll = [...res].sort((a, b) => (a.at < b.at ? 1 : -1)).map((r) => ({ ...r, sub: subjOfKey(r.key) }));
  const recent = recentAll.slice(0, 12);
  // Wrong Sets
  const wsets = getWrongSets();
  const wres = getChapterResults(WRONG_KEY);
  const wPending = wsets.map((s, i) => ({ i, n: s.length })).filter((x) => !wres[x.i]);
  const wrong = { sets: wsets.length, pending: wPending.length, pendingQ: wPending.reduce((a, x) => a + x.n, 0), total: wsets.reduce((a, s) => a + s.length, 0) };
  // streak (din jinme kam se kam ek set)
  let streak = 0;
  for (let i = byDay[today] ? 0 : 1; byDay[dayKeyBack(i)]; i++) streak++;
  const now = new Date();
  const iso = dk(now);
  const exam = getExam();
  const left = daysBetween(iso, exam);
  return {
    bySub, byDay, daySub, recent, recentAll, wrong, streak,
    progs: allProgs(),
    counts: getCounts(), hist: counterHistory(14),
    daysLeft: Number.isFinite(left) ? left : null, exam,
    todayN: res.filter((r) => dk(r.at) === today).length,
    todos: getTodos(),
    prog: todayProg(),
    factSlides: (() => { try { return factSecs(getFacts()).length; } catch { return 0; } })(),
  };
}

export function useHomeData() {
  const [d, setD] = useState(null);
  const [totals, setTotals] = useState({});
  useEffect(() => {
    const on = () => setD(collect());
    on();
    const evs = ["cgl:settest-changed", "cgl:wrongsets", "cgl:sync-applied", "cgl:home", "cgl:counter-changed", "focus"];
    for (const e of evs) window.addEventListener(e, on);
    // Har subject mein kul kitne set (sirf index padhta hai — sawaal nahi).
    let alive = true;
    Promise.all(SUBJ.map(async (s) => [s.k, (await countsFor(s.slug)).total])).then((rows) => {
      if (alive) setTotals(Object.fromEntries(rows.map(([k, n]) => [k, Math.ceil(n / 25)])));
    }).catch(() => {});
    return () => { alive = false; for (const e of evs) window.removeEventListener(e, on); };
  }, []);
  return d ? { ...d, totals } : null;
}

// 🧭 Salah — data dekh kar, sabse zaroori pehle. [{ icon, text, href, label }]
export function adviceOf(d) {
  const out = [];
  if (d.progs.length) out.push({ icon: "⏸", text: `"${d.progs[0].title}" beech mein chhoda hai — pehle wahi poora karo.`, href: d.progs[0].path, label: "Resume" });
  if (d.wrong.pending) out.push({ icon: "🔁", text: `${d.wrong.pendingQ} galat / chhode sawaal ${d.wrong.pending} Wrong Set mein wait kar rahe hain — taaze galti sabse jaldi pakki hoti hai.`, href: "/wrong-sets", label: "Wrong Sets" });
  const subs = SUBJ.map((s) => ({ s, b: d.bySub[s.k] }));
  for (const { s, b } of subs) if (b.today < PER_DAY) out.push({ icon: s.icon, text: `${s.label}: aaj ${b.today}/${PER_DAY} set hue — ${PER_DAY - b.today} aur.`, href: s.href, label: "Sets" });
  const acc = subs.filter(({ b }) => b.right + b.wrong >= 10).map(({ s, b }) => ({ s, a: Math.round((b.right / (b.right + b.wrong)) * 100) })).sort((x, y) => x.a - y.a);
  if (acc[0] && acc[0].a < 70) out.push({ icon: "🎯", text: `${acc[0].s.label} ki accuracy ${acc[0].a}% hai — wahan dheere, pakka karo (galat −0.5 kaat-ta hai).`, href: acc[0].s.href, label: "Sudhaaro" });
  const skipped = subs.reduce((a, { b }) => a + b.skipped, 0);
  const tried = subs.reduce((a, { b }) => a + b.right + b.wrong, 0);
  if (tried && skipped > tried) out.push({ icon: "⏱", text: "Jitne kiye usse zyada chhode — 15 minute mein 25 ka matlab ~36 sec/sawaal; atko mat, aage badho aur aakhir mein lauto.", href: null });
  if (d.daysLeft != null && d.daysLeft <= 15) out.push({ icon: "📅", text: `Exam ${d.daysLeft} din mein — ab naya kam, Wrong Sets aur mixed sets zyada.`, href: "/wrong-sets", label: "Wrong" });
  if (!d.streak) out.push({ icon: "🔥", text: "Aaj ka pehla set abhi baaki — ek set se streak shuru.", href: SUBJ[0].href, label: "Shuru" });
  return out;
}

// Agla test — ek button wale roop ke liye.
export function nextUp(d) {
  if (d.progs.length) return { label: `⏸ Resume — ${d.progs[0].title}`, href: d.progs[0].path };
  if (d.wrong.pending) return { label: `🔁 Wrong Set (${d.wrong.pendingQ} sawaal)`, href: "/wrong-sets" };
  const s = [...SUBJ].sort((a, b) => d.bySub[a.k].today - d.bySub[b.k].today)[0];
  return { label: `${s.icon} ${s.label} ka agla set`, href: s.href };
}

// 📰 Current Affairs ke sets (saare mahine ek saath) — /current-affairs.
export const CA = { k: "ca", slug: "ca", label: "Current Affairs", icon: "📰", href: "/current-affairs" };

// Natije ka set seedha kholne ka link (Home ki report ka "▶"). Naye natije
// apna `path` saath rakhte hain; purane ka chapter-key se andaza.
export function openHref(r) {
  let base = r.path || "";
  if (!base) {
    const k = String(r.key || "");
    const m = /^([a-z0-9]+):(.*)$/i.exec(k);
    const tail = m ? m[2] : "";
    if (k.startsWith("wrongsets:")) base = "/wrong-sets";
    else if (k.startsWith("answers:")) base = `/answers?subject=${tail.split("+")[0] || "math"}`;
    else if (k.startsWith("ca:")) base = "/current-affairs";
    else if (k.startsWith("all:")) base = `/pyq/all/${tail.split("|")[0]}`;
    else if (k.startsWith("pyq:")) base = tail;
    else if (m && ["mathbank", "maths2025", "reasonbank", "pinnacle", "errorpro", "war", "gk"].includes(m[1])) base = `/pyq/${m[1]}/${tail}`;
    else return null;
  }
  return `${base}${base.includes("?") ? "&" : "?"}set=${encodeURIComponent(r.set)}`;
}
