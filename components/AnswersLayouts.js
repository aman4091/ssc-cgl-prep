"use client";

// 📖 Answers ke naye layout (1–5) — sab TAREEKH ke hisaab se.
//
// Card wahi purana (AnswersBoard ka renderCard: ✅ ✍️ Gemini 🎯20 🔴 🗑️) —
// yahan sirf ye tay hota hai ki card KAHAN aur kis JATTHE mein dikhe:
//   1 Din-wise      — har din ka ek khand, upar chipka sar, daayen dino ki soochi
//   2 Din + subject — upar dino ki patti, chune din ke 4 subject ke khane
//   3 Calendar      — mahine ka calendar (ginti ke rang), din dabao → wahi din
//   4 Mock sitting  — ek baithak (3 ghante ke andar) ke saare Q ek jatthe mein
//   5 Revision table — ghani table, har row kholo to poora card; D+1/3/7 ka hisaab
//
// Record ki tareekh `at` hai (overlay/paste ka waqt). Ghoomti katar (touchAt)
// yahan nahi chalti — yahan kram tareekh ka hai.

import { useMemo, useState } from "react";
import { dayKey } from "@/lib/wrongbook";

const SUB = {
  math: { icon: "🧮", label: "Maths", c: "#3b6cff" },
  gs: { icon: "🌍", label: "GS", c: "#2f9e6e" },
  english: { icon: "📘", label: "English", c: "#a855f7" },
  reasoning: { icon: "🧠", label: "Reasoning", c: "#f59e0b" },
  other: { icon: "📎", label: "Other", c: "#94a3b8" },
};
const subOf = (k) => SUB[k] || SUB.other;
const TODAY = () => dayKey(new Date().toISOString());
const ago = (dk) => Math.round((new Date(TODAY() + "T00:00:00") - new Date(dk + "T00:00:00")) / 864e5);
function dayName(dk) {
  const n = ago(dk);
  const d = new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return n === 0 ? `Aaj · ${d}` : n === 1 ? `Kal · ${d}` : `${d} · ${n} din pehle`;
}
const hm = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
const snip = (r) => String(r.q?.question || r.ocrText || r.note || "").replace(/\s+/g, " ").trim();
const ansSnip = (r) => String(r.aiNotes || r.detail2 || r.detail || r.q?.solution || "").replace(/[*#_`>]/g, "").replace(/\s+/g, " ").trim();

// Din ke hisaab se jatthe — naya din pehle (ya purana, `oldFirst`).
function byDay(list, oldFirst) {
  const m = new Map();
  for (const r of list) {
    const k = dayKey(r.at);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  const days = [...m.entries()].map(([k, items]) => ({ k, items: items.sort((a, b) => String(a.at).localeCompare(String(b.at))) }));
  days.sort((a, b) => (oldFirst ? a.k.localeCompare(b.k) : b.k.localeCompare(a.k)));
  return days;
}
function subjectCounts(items, bucketOf) {
  const c = {};
  for (const r of items) { const k = bucketOf(r); c[k] = (c[k] || 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}
function Counts({ items, bucketOf }) {
  return (
    <span className="al-counts">
      {subjectCounts(items, bucketOf).map(([k, n]) => (
        <span key={k} style={{ "--sc": subOf(k).c }}>{subOf(k).icon} {n}</span>
      ))}
    </span>
  );
}
const doneN = (items, doneMap) => items.filter((r) => doneMap[r.id]).length;

// ───────────────────────── 1 · Din-wise ─────────────────────────
function DayWise({ list, renderCard, doneMap, bucketOf }) {
  const [oldFirst, setOldFirst] = useState(false);
  const days = useMemo(() => byDay(list, oldFirst), [list, oldFirst]);
  const [open, setOpen] = useState(() => new Set(days.slice(0, 2).map((d) => d.k)));
  const toggle = (k) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  let idx = 0;
  return (
    <div className="al1">
      <div className="al-bar">
        <span>{days.length} din · {list.length} question</span>
        <button className="ansp__btn" onClick={() => setOldFirst((v) => !v)}>{oldFirst ? "⬆️ Purane pehle" : "⬇️ Naye pehle"}</button>
      </div>
      <div className="al1-wrap">
        <div className="al1-main">
          {days.map((d) => {
            const isOpen = open.has(d.k);
            const start = idx; idx += d.items.length;
            return (
              <section key={d.k} id={`al-day-${d.k}`} className={`al1-day${isOpen ? " is-open" : ""}`}>
                <button type="button" className="al1-hd" onClick={() => toggle(d.k)}>
                  <span className="al1-hd__d">{dayName(d.k)}</span>
                  <Counts items={d.items} bucketOf={bucketOf} />
                  <span className="al1-hd__n">{doneN(d.items, doneMap)}/{d.items.length} revise</span>
                  <span className="al1-hd__c">{isOpen ? "▴" : "▾"}</span>
                </button>
                {isOpen && <div className="al1-cards">{d.items.map((r, i) => renderCard(r, start + i, false))}</div>}
              </section>
            );
          })}
        </div>
        <nav className="al1-rail">
          {days.map((d) => (
            <a key={d.k} href={`#al-day-${d.k}`} onClick={() => setOpen((s) => new Set(s).add(d.k))}>
              <b>{new Date(d.k + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</b>
              <span>{d.items.length}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ───────────────────── 2 · Din + subject ke khane ─────────────────────
function DaySubjects({ list, renderCard, doneMap, bucketOf }) {
  const days = useMemo(() => byDay(list, false), [list]);
  const [sel, setSel] = useState(() => (days[0] ? days[0].k : ""));
  const day = days.find((d) => d.k === sel) || days[0];
  const groups = useMemo(() => {
    if (!day) return [];
    const g = {};
    for (const r of day.items) (g[bucketOf(r)] ||= []).push(r);
    return ["math", "gs", "english", "reasoning", "other"].filter((k) => g[k]).map((k) => ({ k, items: g[k] }));
  }, [day, bucketOf]);
  let idx = 0;
  return (
    <div className="al2">
      <div className="al2-strip">
        {days.map((d) => (
          <button key={d.k} type="button" className={`al2-day${d.k === (day && day.k) ? " is-on" : ""}`} onClick={() => setSel(d.k)}>
            <span className="al2-day__w">{ago(d.k) === 0 ? "AAJ" : new Date(d.k + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</span>
            <b>{new Date(d.k + "T00:00:00").getDate()}</b>
            <span className="al2-day__m">{new Date(d.k + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}</span>
            <span className="al2-day__n">{d.items.length} Q</span>
          </button>
        ))}
      </div>
      {day && (
        <>
          <h2 className="al2-h">{dayName(day.k)} <span>· {day.items.length} question · {doneN(day.items, doneMap)} revise ho gaye</span></h2>
          <div className="al2-grid">
            {groups.map((g) => (
              <section key={g.k} className="al2-col" style={{ "--sc": subOf(g.k).c }}>
                <h3>{subOf(g.k).icon} {subOf(g.k).label} <span>{g.items.length}</span></h3>
                {g.items.map((r) => renderCard(r, idx++, false))}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── 3 · Calendar ─────────────────────────
function CalendarView({ list, renderCard, doneMap, bucketOf }) {
  const days = useMemo(() => byDay(list, false), [list]);
  const map = useMemo(() => Object.fromEntries(days.map((d) => [d.k, d.items])), [days]);
  const latest = days[0] ? days[0].k : TODAY();
  const [month, setMonth] = useState(() => latest.slice(0, 7));
  const [sel, setSel] = useState(latest);
  const [y, mo] = month.split("-").map(Number);
  const first = new Date(y, mo - 1, 1);
  const nDays = new Date(y, mo, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Somvar se shuru
  const max = Math.max(1, ...days.map((d) => d.items.length));
  const shift = (n) => { const d = new Date(y, mo - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const items = map[sel] || [];
  return (
    <div className="al3">
      <div className="al3-top">
        <section className="al3-cal">
          <header>
            <button className="ansp__btn" onClick={() => shift(-1)}>‹</button>
            <b>{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b>
            <button className="ansp__btn" onClick={() => shift(1)}>›</button>
          </header>
          <div className="al3-grid">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((w) => <span key={w} className="al3-w">{w}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
            {Array.from({ length: nDays }, (_, i) => {
              const k = `${month}-${String(i + 1).padStart(2, "0")}`;
              const its = map[k] || [];
              const n = its.length;
              const allDone = n && doneN(its, doneMap) === n;
              return (
                <button
                  key={k}
                  type="button"
                  className={`al3-d${k === sel ? " is-sel" : ""}${k === TODAY() ? " is-today" : ""}${allDone ? " is-done" : ""}`}
                  style={{ "--a": n ? 0.18 + (n / max) * 0.7 : 0 }}
                  onClick={() => n && setSel(k)}
                  disabled={!n}
                >
                  <span>{i + 1}</span>
                  {n ? <b>{n}</b> : null}
                </button>
              );
            })}
          </div>
          <p className="al3-leg">Gehra rang = zyada galat · ✓ hara = us din ke sab revise</p>
        </section>
        <section className="al3-sum">
          <h2>{dayName(sel)}</h2>
          <p>{items.length} question · {doneN(items, doneMap)} revise ho gaye</p>
          <Counts items={items} bucketOf={bucketOf} />
          <div className="al3-bars">
            {subjectCounts(items, bucketOf).map(([k, n]) => (
              <div key={k} style={{ "--sc": subOf(k).c }}><span>{subOf(k).label}</span><i style={{ width: `${(n / Math.max(1, items.length)) * 100}%` }} /><b>{n}</b></div>
            ))}
          </div>
        </section>
      </div>
      <div className="al3-cards">{items.map((r, i) => renderCard(r, i, false))}</div>
    </div>
  );
}

// ───────────────────────── 4 · Mock sitting ─────────────────────────
// Ek mock/sectional mein jo screenshot aaye wo paas-paas ke waqt ke hote hain.
// Do question ke beech 3 ghante se zyada ka farak = nayi baithak.
function Sittings({ list, renderCard, doneMap, bucketOf }) {
  const sits = useMemo(() => {
    const sorted = [...list].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const out = [];
    for (const r of sorted) {
      const last = out[out.length - 1];
      const t = new Date(r.at).getTime();
      if (last && t - last.end <= 3 * 3600e3) { last.items.push(r); last.end = t; }
      else out.push({ start: t, end: t, items: [r] });
    }
    return out.reverse();
  }, [list]);
  const [open, setOpen] = useState(() => new Set([0]));
  let idx = 0;
  return (
    <div className="al4">
      {sits.map((s, si) => {
        const isOpen = open.has(si);
        const st = new Date(s.start).toISOString();
        const d = doneN(s.items, doneMap);
        const start = idx; idx += s.items.length;
        return (
          <section key={si} className={`al4-sit${isOpen ? " is-open" : ""}`}>
            <button type="button" className="al4-hd" onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(si)) n.delete(si); else n.add(si); return n; })}>
              <span className="al4-ic">📝</span>
              <span className="al4-t">
                <b>Baithak · {dayName(dayKey(st))}</b>
                <small>{hm(st)} – {hm(new Date(s.end).toISOString())} · {s.items.length} galat question</small>
              </span>
              <Counts items={s.items} bucketOf={bucketOf} />
              <span className="al4-prog"><i style={{ width: `${(d / s.items.length) * 100}%` }} /><em>{d}/{s.items.length}</em></span>
              <span className="al1-hd__c">{isOpen ? "▴" : "▾"}</span>
            </button>
            {isOpen && <div className="al4-cards">{s.items.map((r, i) => renderCard(r, start + i, false))}</div>}
          </section>
        );
      })}
    </div>
  );
}

// ───────────────────────── 5 · Revision table ─────────────────────────
// Ghani table. "Dohrao" column: jis din aaya uske D+1, D+3, D+7 — aaj inme se
// koi din ho aur revise nahi hua to laal.
const GAPS = [1, 3, 7, 14];
function RevTable({ list, renderCard, doneMap, bucketOf, chapterOf }) {
  const [openId, setOpenId] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const rows = useMemo(() => {
    const out = [...list].sort((a, b) => String(b.at).localeCompare(String(a.at))).map((r) => {
      const n = ago(dayKey(r.at));
      const due = GAPS.includes(n) && !(doneMap[r.id] && dayKey(doneMap[r.id]) === TODAY());
      const next = GAPS.find((g) => g > n);
      return { r, n, due, next };
    });
    return onlyDue ? out.filter((x) => x.due) : out;
  }, [list, doneMap, onlyDue]);
  const dueCount = useMemo(() => list.filter((r) => GAPS.includes(ago(dayKey(r.at)))).length, [list]);
  return (
    <div className="al5">
      <div className="al-bar">
        <span>{rows.length} question · <b className="al5-red">{dueCount}</b> aaj dohrane hain (D+1 / 3 / 7 / 14)</span>
        <button className="ansp__btn" onClick={() => setOnlyDue((v) => !v)}>{onlyDue ? "📚 Sab dikhao" : "🔁 Sirf aaj ke"}</button>
      </div>
      <div className="al5-table">
        <div className="al5-row al5-head">
          <span>Tareekh</span><span>Subject</span><span>Chapter</span><span>Question / jawab</span><span>Dohrao</span>
        </div>
        {rows.map(({ r, n, due, next }, i) => (
          <div key={r.uid}>
            <button type="button" className={`al5-row${due ? " is-due" : ""}${doneMap[r.id] ? " is-rev" : ""}${openId === r.uid ? " is-open" : ""}`} onClick={() => setOpenId(openId === r.uid ? "" : r.uid)}>
              <span className="al5-date">{new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}<small>{n === 0 ? "aaj" : `${n}d`}</small></span>
              <span className="al5-sub" style={{ "--sc": subOf(bucketOf(r)).c }}>{subOf(bucketOf(r)).icon} {subOf(bucketOf(r)).label}</span>
              <span className="al5-ch">{chapterOf(r).ch ? chapterOf(r).ch.replace(/-/g, " ") : "—"}</span>
              <span className="al5-q"><b>{snip(r) || `Question ${r.qid || i + 1}`}</b><small>{ansSnip(r).slice(0, 110)}</small></span>
              <span className="al5-due">{due ? `🔴 D+${n} aaj` : doneMap[r.id] ? "✓ hua" : next ? `D+${next}` : "—"}</span>
            </button>
            {openId === r.uid && <div className="al5-open">{renderCard(r, i, false)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ANS_LAYOUTS = [
  { id: "1", name: "Din-wise", C: DayWise },
  { id: "2", name: "Din + subject", C: DaySubjects },
  { id: "3", name: "Calendar", C: CalendarView },
  { id: "4", name: "Mock baithak", C: Sittings },
  { id: "5", name: "Revision table", C: RevTable },
];

export default function AnswersLayouts({ lay, ...props }) {
  const L = ANS_LAYOUTS.find((l) => l.id === lay);
  if (!L) return null;
  const C = L.C;
  return <C {...props} />;
}
