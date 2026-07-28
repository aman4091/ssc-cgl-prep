// Weak-pool spaced repetition — English & GS memory items (Feature A, Engine 2).
//
// "Jo galat karo / 🔁 mark karo / vocab / current-affairs / Wrong-Book (GS+Eng)"
// yahaan enroll hote hain. Har item ko pehle 7 din mein ~20 baar (front-loaded
// burst) dikhaya jaata, phir badhte-interval maintenance pe — taaki exam tak yaad
// rahe. Bahut load ho to burst 40 din tak khinch jaata par 20/40-din guaranteed.
//
// Exposure = flashcard (dekho -> recall -> reveal -> aage). markSeen har dikhne pe
// count badhata. Store cgl.srs -> lib/sync.js apne-aap cross-device sync karta.

import { doneKeyFor } from "./qdone";
import { dayKey } from "./daytime";
import { getWrongBook } from "./wrongbook";

const KEY = "cgl.srs";
const TARGET = 20;            // har item kitni baar dikhna chahiye (burst)
const DEFAULT_WINDOW = 7;     // burst din
const HARD_CAP = 40;          // 40-din floor
const DEFAULT_BUDGET = 2700;  // ek din ki max exposures (weak + coverage)
const DEFAULT_BATCH = 100;    // ek "Start" par kitne cards (self-paced) — user control
const MAINT_GAPS = [5, 8, 13, 21, 34]; // done20 ke baad badhte intervals
const HISTORY_MAX = 200;

function blank() {
  return { items: {}, history: [], window: DEFAULT_WINDOW, cap: HARD_CAP, budget: DEFAULT_BUDGET, batch: DEFAULT_BATCH };
}
function read() {
  if (typeof window === "undefined") return blank();
  try {
    const r = localStorage.getItem(KEY);
    const v = r ? JSON.parse(r) : null;
    if (!v || typeof v !== "object") return blank();
    return { ...blank(), ...v, items: v.items || {}, history: v.history || [] };
  } catch { return blank(); }
}
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:srs-changed")); } catch { /* SSR */ }
}

// Integer day index that rolls over at the app's configured day-end (not midnight).
export function todayIndex() {
  const [y, m, d] = dayKey().split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// Stable identity per kind. Questions/CA use the id-preferred done-key; vocab a
// word key; wrong-book its record id.
export function srsKey(kind, ref) {
  if (kind === "vocab") return "v:" + String(ref?.word || "").trim().toLowerCase();
  if (kind === "wb") return "wb:" + (ref?.id ?? "");
  return doneKeyFor(ref);
}
const badKey = (k) => !k || k === "::" || k === "v:" || k === "wb:";

export function isEnrolled(kind, ref) {
  const k = srsKey(kind, ref);
  return !badKey(k) && !!read().items[k];
}

// Enroll (or leave as-is if already there — never resets seen/day0). Returns key.
export function enroll({ kind = "q", ref, src = "mark", category = "", subject = "" }) {
  const k = srsKey(kind, ref);
  if (badKey(k)) return null;
  const st = read();
  if (!st.items[k]) {
    st.items[k] = {
      key: k, kind, ref, src, category,
      subject: subject || (kind === "vocab" ? "english" : ""),
      day0: todayIndex(), seen: 0, lastDay: -1, done20: false, bk: false,
    };
    write(st);
  }
  return k;
}

export function unenroll(kind, ref) {
  const k = srsKey(kind, ref);
  const st = read();
  if (st.items[k]) { delete st.items[k]; write(st); }
}

// 🔁 toggle for a question/word/CA — returns true if now enrolled.
export function toggleEnroll({ kind = "q", ref, src = "mark", category = "", subject = "" }) {
  if (isEnrolled(kind, ref)) { unenroll(kind, ref); return false; }
  enroll({ kind, ref, src, category, subject });
  return true;
}

// Enroll on a wrong answer (called from lib/qreview). Only English/GS subjects.
export function enrollWrong(q, { subject = "", category = "" } = {}) {
  const s = String(subject || "").toLowerCase();
  if (s === "math" || s === "reasoning") return; // solve-subjects — Feature B ka kaam
  enroll({ kind: "q", ref: q, src: "wrong", category: category || subject, subject: s });
}

// Hand-kept Wrong Book (cgl.wrongbook) ke GS + English records ko weak-pool mein
// le aata hai (Maths/Reasoning wahaan nahi — wo Speed tracker ke over2 mein). Deck
// khulte hi call hota hai taaki jo bhi tumne wrong-book mein daala wo revision mein aaye.
export function syncWrongBook() {
  const st = read();
  let changed = false;
  const today = todayIndex();
  for (const sub of ["gs", "english"]) {
    let recs = [];
    try { recs = getWrongBook(sub) || []; } catch { recs = []; }
    for (const r of recs) {
      if (!r || r.id == null) continue;
      const k = "wb:" + r.id;
      if (!st.items[k]) {
        st.items[k] = {
          key: k, kind: "wb", ref: r, src: "wrongbook", category: sub, subject: sub,
          day0: today, seen: 0, lastDay: -1, done20: false, bk: false,
        };
        changed = true;
      } else {
        st.items[k].ref = r; // keep the record (image/answer) fresh
      }
    }
  }
  if (changed) write(st);
  return changed;
}

function maintGap(seen) {
  const i = Math.min(MAINT_GAPS.length - 1, Math.max(0, seen - TARGET));
  return MAINT_GAPS[i];
}
function targetBy(item, today, W) {
  const elapsed = Math.max(0, today - item.day0);
  return Math.min(TARGET, Math.ceil((TARGET * (elapsed + 1)) / W)); // +1 => din 0 pe hi ~3
}

// Items due today, richest-priority first. Each carries how many times it should
// appear (deficit). Caller interleaves & caps at budget.
export function weakDue(today = todayIndex()) {
  const st = read();
  const W = st.window || DEFAULT_WINDOW, cap = st.cap || HARD_CAP;
  const out = [];
  for (const it of Object.values(st.items)) {
    if (it.done20) {
      const gap = maintGap(it.seen);
      if (it.lastDay < 0 || today - it.lastDay >= gap) {
        out.push({ key: it.key, item: it, deficit: 1, maint: true, forced: false, fresh: false });
      }
      continue;
    }
    const elapsed = Math.max(0, today - it.day0);
    const forced = elapsed >= cap && it.seen < TARGET;   // 40-din floor breach
    const deficit = Math.max(0, targetBy(it, today, W) - it.seen);
    if (deficit > 0 || forced) {
      out.push({ key: it.key, item: it, deficit: Math.max(deficit, forced ? 1 : 0), maint: false, forced, fresh: it.seen === 0 });
    }
  }
  // forced (floor) -> fresh (pehli baar) -> bigger deficit -> older day0 -> maintenance last
  out.sort((a, z) =>
    (z.forced - a.forced) ||
    (z.fresh - a.fresh) ||
    (a.maint - z.maint) ||
    (z.deficit - a.deficit) ||
    (a.item.day0 - z.item.day0)
  );
  return out;
}

// One exposure banked. seen++, lastDay=today, done20 flips at TARGET, history logged.
export function markSeen(key, today = todayIndex()) {
  const st = read();
  const it = st.items[key];
  if (!it) return;
  it.seen = (it.seen || 0) + 1;
  it.lastDay = today;
  if (it.seen >= TARGET) it.done20 = true;
  st.history = [{ key, at: new Date().toISOString() }, ...(st.history || []).filter((h) => h.key !== key)].slice(0, HISTORY_MAX);
  write(st);
}

export function toggleBookmark(key) {
  const st = read();
  const it = st.items[key];
  if (!it) return false;
  it.bk = !it.bk;
  write(st);
  return it.bk;
}

export function isBookmarked(key) { return !!read().items[key]?.bk; }
export function getItems() { return Object.values(read().items); }
export function getBookmarked() { return getItems().filter((it) => it.bk); }
export function getHistory() {
  const st = read();
  const byKey = st.items;
  return (st.history || []).map((h) => ({ ...h, item: byKey[h.key] })).filter((h) => h.item);
}
export function getDone20() { return getItems().filter((it) => it.done20); }

export function stats(today = todayIndex()) {
  const items = getItems();
  const due = weakDue(today);
  const dueExposures = due.reduce((n, d) => n + d.deficit, 0);
  return {
    enrolled: items.length,
    due: due.length,
    dueExposures,
    done20: items.filter((it) => it.done20).length,
    bookmarked: items.filter((it) => it.bk).length,
  };
}

export function getConfig() { const st = read(); return { window: st.window, cap: st.cap, budget: st.budget, batch: st.batch || DEFAULT_BATCH }; }
export function setBudget(n) { const st = read(); st.budget = Math.max(1, Math.round(n)); write(st); }
export function setBatch(n) { const st = read(); st.batch = Math.max(10, Math.min(2000, Math.round(n))); write(st); }
