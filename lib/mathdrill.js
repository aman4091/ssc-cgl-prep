// 🎯 Maths Skip drill — paper mein "kaun sa chhodna hai" ki aadat.
//
//   1. Chhanti: har question par kam waqt (jaise 5 sec) — sirf faisla:
//      ✅ Ho jayega ya ⏭ Skip. Waqt khatam = Skip.
//   2. Phir dono list alag-alag 40 sec har question par chalti hain. 40 ke
//      andar sahi hua → ⏱️ Under 40, warna → 🐢 40 se upar.
//   3. Hisaab: "Ho jayega" bole the unme se kitne sach mein under 40 hue,
//      aur Skip wale mein se kitne ho jaate (yaani chhodne nahi the).
//
// Sprint ke hisaab (cgl.sprint.*) ko ye chhoota nahi — apni keys:
//   cgl.drill.seen — chhanti mein aa chuke question (hash), taaki agli baar naye
//   cgl.drill.cur  — abhi wala drill (question ki copy ke saath)
//   cgl.drill.u40  — ⏱️ Under 40 page ke question
//   cgl.drill.o40  — 🐢 40 se upar page ke question
//   cgl.drill.hist — har drill ka chhota hisaab

import { storeGet, storeSet } from "./bigstore";
import { qText, qOpts, sHash } from "./sprint";

const K_SEEN = "cgl.drill.seen";
const K_CUR = "cgl.drill.cur";
const K_U40 = "cgl.drill.u40";
const K_O40 = "cgl.drill.o40";
const K_HIST = "cgl.drill.hist";
export const LIMIT = 40; // itne second ke andar = "under 40"
// 🔁 40 se upar wale wapas aate hain: 1, 3, 5, 7 din baad. Har baar 40 ke
// andar sahi → agla padaav; nahi → kal se phir. Chaaron paar → Under 40.
export const GAPS = [1, 3, 5, 7];
const DAY = 86400000;
const dayStart = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dueIn = (days) => dayStart() + days * DAY;

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { const r = storeGet(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function write(key, val) { try { storeSet(key, JSON.stringify(val)); } catch { /* quota */ } }

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Question ki halki copy — bank dobara khole bina bhi list aur page chalein.
export function copyQ(q) {
  return {
    h: sHash(q),
    question: qText(q),
    options: qOpts(q),
    answer: q.answer,
    explanation: String(q.explanation || q.solution || ""),
    qImg: q.qImg || "",
    optImgs: Array.isArray(q.optImgs) ? q.optImgs : null,
    solImg: q.solImg || "",
    _srcLabel: q._srcLabel || "",
    _chapter: q._chapter || "",
    source: q.source || q.paper || "",
  };
}

// Random, par zyada se zyada chapter: har chapter ki apni random line, aur
// chapter baari-baari se ek-ek dete hain. 25 maange aur 40 chapter hain to 25
// alag chapter; 100 maange to har chapter se 2-3.
// `weak` = {chapter: ginti} — jin chapter ke question 40 se upar gaye, unki
// line do baar (har round mein do question), taaki wahi tarika baar-baar aaye.
export function pickSpread(list, n, skip = {}, weak = {}) {
  const groups = new Map();
  const seen = new Set();
  for (const q of list || []) {
    if (qText(q).length < 8 && !q.qImg) continue;
    const h = sHash(q);
    if (!h || skip[h] || seen.has(h)) continue;
    seen.add(h);
    const c = q._chapter || "—";
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(q);
  }
  const lines = [];
  for (const [c, g] of groups) {
    const line = { qs: shuffled(g), at: 0 };
    lines.push(line);
    if (weak[c]) lines.push(line);
  }
  const order = shuffled(lines);
  const out = [];
  while (out.length < n) {
    let moved = false;
    for (const l of order) {
      if (out.length >= n) break;
      if (l.at < l.qs.length) { out.push(l.qs[l.at++]); moved = true; }
    }
    if (!moved) break;
  }
  return shuffled(out);
}

// ── chhanti mein aa chuke ────────────────────────────────────────────────
export const getSeen = () => read(K_SEEN, {}) || {};
export function markSeen(hs) {
  const all = getSeen();
  for (const h of hs) all[h] = 1;
  write(K_SEEN, all);
}
export function clearSeen() { write(K_SEEN, {}); }

// ── abhi wala drill ──────────────────────────────────────────────────────
// { id, at, secs, qs:[copy], marks:{h:"go"|"skip"}, res:{h:{ok,t,right,timeout}} }
export const getCur = () => read(K_CUR, null);
export function saveCur(d) { write(K_CUR, d); }
export function newDrill(qs, secs) {
  const d = { id: `dr_${Date.now().toString(36)}`, at: Date.now(), secs, qs: qs.map(copyQ), marks: {}, res: {} };
  saveCur(d);
  return d;
}

// ── Under 40 / 40 se upar ────────────────────────────────────────────────
export const getU40 = () => read(K_U40, []) || [];
export const getO40 = () => read(K_O40, []) || [];

// Naya nateeja: question sahi dabbe mein, doosre se hat kar (pehle 40+ tha,
// ab under 40 hua to wahan se nikal jaata hai).
export function putResult(copy, r, from) {
  const old = getU40().find((x) => x.h === copy.h) || getO40().find((x) => x.h === copy.h);
  const rec = {
    ...copy, method: (old && old.method) || copy.method || "",
    t: r.t, right: !!r.right, timeout: !!r.timeout, gaveUp: !!r.gaveUp, from, at: Date.now(),
  };
  if (!r.ok) { rec.stage = 0; rec.due = dueIn(GAPS[0]); }
  const u = getU40().filter((x) => x.h !== copy.h);
  const o = getO40().filter((x) => x.h !== copy.h);
  if (r.ok) u.unshift(rec); else o.unshift(rec);
  write(K_U40, u);
  write(K_O40, o);
}

// ── 🔁 dohrana ───────────────────────────────────────────────────────────
// Aaj (ya pehle) ke due — sabse purane pehle.
export function getDue() {
  const now = Date.now();
  return getO40().filter((x) => (x.due || 0) <= now).sort((a, b) => (a.due || 0) - (b.due || 0));
}
export function nextDue() {
  const fut = getO40().map((x) => x.due || 0).filter((d) => d > Date.now());
  return fut.length ? Math.min(...fut) : 0;
}
// Dohrane ka nateeja. Laut-ta hai { stage, mastered }.
export function reviewResult(copy, r) {
  const o = getO40();
  const at = o.findIndex((x) => x.h === copy.h);
  const cur = at >= 0 ? o[at] : { ...copy, stage: 0, from: "review" };
  const rec = { ...cur, t: r.t, right: !!r.right, timeout: !!r.timeout, gaveUp: !!r.gaveUp, at: Date.now() };
  const rest = o.filter((x) => x.h !== copy.h);
  if (r.ok) {
    rec.stage = (cur.stage || 0) + 1;
    if (rec.stage >= GAPS.length) {
      write(K_O40, rest);
      write(K_U40, [{ ...rec, mastered: true, due: 0 }, ...getU40().filter((x) => x.h !== copy.h)]);
      return { stage: rec.stage, mastered: true };
    }
    rec.due = dueIn(GAPS[rec.stage]);
  } else {
    rec.stage = 0;
    rec.due = dueIn(GAPS[0]);
  }
  write(K_O40, [rec, ...rest]);
  return { stage: rec.stage, mastered: false };
}

// 🧠 Question ka method — ek line, apne shabdon mein.
export function setMethod(h, text) {
  const t = String(text || "").trim();
  write(K_U40, getU40().map((x) => (x.h === h ? { ...x, method: t } : x)));
  write(K_O40, getO40().map((x) => (x.h === h ? { ...x, method: t } : x)));
}
export function methodOf(h) {
  const x = getO40().find((y) => y.h === h) || getU40().find((y) => y.h === h);
  return (x && x.method) || "";
}
// Kamzor chapter (40+ wale) — agle drill mein inke zyada question.
export function weakChapters() {
  const m = {};
  for (const x of getO40()) if (x._chapter) m[x._chapter] = (m[x._chapter] || 0) + 1;
  return m;
}
export function removeResult(which, h) {
  if (which === "u40") write(K_U40, getU40().filter((x) => x.h !== h));
  else write(K_O40, getO40().filter((x) => x.h !== h));
}

// ── hisaab ───────────────────────────────────────────────────────────────
// Ek list ("go" ya "skip") ka: kitne the, kitne kiye, kitne under 40.
export function statsOf(d, kind) {
  const hs = d.qs.filter((q) => d.marks[q.h] === kind).map((q) => q.h);
  const tried = hs.filter((h) => d.res[h]);
  const u40 = tried.filter((h) => d.res[h].ok).length;
  return { n: hs.length, tried: tried.length, u40, o40: tried.length - u40 };
}
export const getHist = () => read(K_HIST, []) || [];
export function saveHist(d) {
  const row = { id: d.id, at: d.at, secs: d.secs, n: d.qs.length, go: statsOf(d, "go"), skip: statsOf(d, "skip") };
  write(K_HIST, [row, ...getHist().filter((x) => x.id !== d.id)].slice(0, 60));
}
