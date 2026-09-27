"use client";

// 📖 Answers ke naye layout (1–5) — sab TAREEKH ke hisaab se.
//
// Card wahi purana (AnswersBoard ka renderCard: ✅ ✍️ Gemini 🎯20 🔴 🗑️) —
// yahan sirf ye tay hota hai ki card KAHAN aur kis JATTHE mein dikhe:
//   1 Din-wise      — har din ka ek khand, upar chipka sar, daayen dino ki soochi
//   2 Din + subject — upar dino ki patti, chune din ke 4 subject ke khane
//   3 Calendar      — mahine ka calendar (ginti ke rang), din dabao → wahi din
//   4 Mock sitting  — ek baithak (3 ghante ke andar) ke saare Q ek jatthe mein
//   5 Revision table — ghani table, har row kholo to poora card; D+1/3/7/14
//   6–15            — components/AnswersLayouts2.js
//
// Har card ke upar 🔁 revision patti: D0 → D+1 → D+3 → D+7 → D+14 (lib/ansrev),
// har padaav ki tareekh aur haal, aur \"Aaj revise kiya\" ka button.
//
// Record ki tareekh `at` hai (overlay/paste ka waqt). Ghoomti katar (touchAt)
// yahan nahi chalti — yahan kram tareekh ka hai.

import { useEffect, useMemo, useState } from "react";
import { dayKey } from "@/lib/wrongbook";
import { getRevMap, markRevised, unmarkToday, revPlan, addDaysKey } from "@/lib/ansrev";
import { MoreLayouts } from "./AnswersLayouts2";

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
// Kitne question aaj dohrane hain (ya chhoote hue) — lib/ansrev ka hisaab.
const dueN = (items, plan) => items.filter((r) => { const p = plan(r); return p.due || p.overdue; }).length;

// ───────────────────────── 1 · Din-wise ─────────────────────────
function DayWise({ list, renderCard, plan, bucketOf }) {
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
                  <span className="al1-hd__n">🔁 {dueN(d.items, plan)} dohrane</span>
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
function DaySubjects({ list, renderCard, plan, bucketOf }) {
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
          <h2 className="al2-h">{dayName(day.k)} <span>· {day.items.length} question · 🔁 {dueN(day.items, plan)} aaj dohrane</span></h2>
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
function CalendarView({ list, renderCard, plan, bucketOf }) {
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
              const allDone = n && dueN(its, plan) === 0;
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
          <p className="al3-leg">Gehra laal = zyada galat · hara = us din ka kuch dohrana baaki nahi</p>
        </section>
        <section className="al3-sum">
          <h2>{dayName(sel)}</h2>
          <p>{items.length} question · 🔁 {dueN(items, plan)} aaj dohrane</p>
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
function Sittings({ list, renderCard, plan, bucketOf }) {
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
        const d = s.items.filter((r) => plan(r).revisedToday || plan(r).level > 0).length;
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
function RevTable({ list, renderCard, bucketOf, chapterOf, plan }) {
  const [openId, setOpenId] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const rows = useMemo(() => {
    const out = [...list].sort((a, b) => String(b.at).localeCompare(String(a.at))).map((r) => ({ r, p: plan(r) }));
    return onlyDue ? out.filter((x) => x.p.due || x.p.overdue) : out;
  }, [list, onlyDue, plan]);
  return (
    <div className="al5">
      <div className="al-bar">
        <span>{rows.length} question</span>
        <button className="ansp__btn" onClick={() => setOnlyDue((v) => !v)}>{onlyDue ? "📚 Sab dikhao" : "🔁 Sirf aaj + chhoote"}</button>
      </div>
      <div className="al5-table">
        <div className="al5-row al5-head">
          <span>Tareekh</span><span>Subject</span><span>Chapter</span><span>Question / jawab</span><span>D+1 · 3 · 7 · 14</span>
        </div>
        {rows.map(({ r, p }, i) => (
          <div key={r.uid}>
            <button type="button" className={`al5-row${p.due ? " is-due" : ""}${p.overdue ? " is-miss" : ""}${openId === r.uid ? " is-open" : ""}`} onClick={() => setOpenId(openId === r.uid ? "" : r.uid)}>
              <span className="al5-date">{new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}<small>{p.age === 0 ? "D0 · aaj" : `D+${p.age}`}</small></span>
              <span className="al5-sub" style={{ "--sc": subOf(bucketOf(r)).c }}>{subOf(bucketOf(r)).icon} {subOf(bucketOf(r)).label}</span>
              <span className="al5-ch">{chapterOf(r).ch ? chapterOf(r).ch.replace(/-/g, " ") : "—"}</span>
              <span className="al5-q"><b>{snip(r) || `Question ${r.qid || i + 1}`}</b><small>{ansSnip(r).slice(0, 110)}</small></span>
              <span className="al5-dots">{p.stages.map((s) => <i key={s.gap} className={`rv-dot is-${s.state}`} title={`D+${s.gap} · ${s.date}`} />)}</span>
            </button>
            {openId === r.uid && <div className="al5-open">{renderCard(r, i, false)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// 🔁 Revision patti — D0 → D+1 → D+3 → D+7 → D+14, tareekh aur haal ke saath.
const shortD = (dk) => new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export function RevStrip({ r, p, onRev, onUnrev, compact }) {
  return (
    <div className={`rv${compact ? " rv--c" : ""}${p.due ? " is-due" : ""}${p.overdue ? " is-miss" : ""}`}>
      <span className="rv-st is-ok" title={p.base}><b>D0</b>{!compact && <small>{shortD(p.base)}</small>}</span>
      {p.stages.map((s) => (
        <span key={s.gap} className={`rv-st is-${s.state}`} title={`D+${s.gap} · ${s.date}${s.on ? ` · revise ${s.on}` : ""}`}>
          <b>D+{s.gap}</b>{!compact && <small>{s.state === "today" ? "AAJ" : shortD(s.date)}</small>}
        </span>
      ))}
      <span className="rv-info">
        {p.done ? "🏁 Pakka ho gaya" : p.due ? "🔴 Aaj dohrana hai" : p.overdue ? `⚠️ ${p.overdue} chhoota` : p.next ? `Agla ${shortD(p.next.date)}` : ""}
      </span>
      {p.revisedToday ? (
        <button type="button" className="rv-btn is-on" onClick={() => onUnrev(r.id)}>✓ Aaj revise hua</button>
      ) : (
        <button type="button" className="rv-btn" onClick={() => onRev(r.id)}>🔁 Revise kiya</button>
      )}
    </div>
  );
}

// Upar ki patti — poori list ka revision haal.
function RevSummary({ list, plan }) {
  const today = dayKey(new Date().toISOString());
  const st = useMemo(() => {
    let due = 0, miss = 0, did = 0, done = 0;
    const next7 = Array.from({ length: 7 }, (_, i) => ({ k: addDaysKey(today, i), n: 0 }));
    for (const r of list) {
      const p = plan(r);
      if (p.due) due++; if (p.overdue) miss++; if (p.revisedToday) did++; if (p.done) done++;
      for (const s of p.stages) { const d = next7.find((x) => x.k === s.date); if (d && s.state !== "ok") d.n++; }
    }
    return { due, miss, did, done, next7 };
  }, [list, plan, today]);
  const max = Math.max(1, ...st.next7.map((x) => x.n));
  return (
    <div className="rv-sum">
      <div className="rv-sum__n"><b className="c-due">{st.due}</b><span>aaj dohrane</span></div>
      <div className="rv-sum__n"><b className="c-miss">{st.miss}</b><span>chhoote hue</span></div>
      <div className="rv-sum__n"><b className="c-ok">{st.did}</b><span>aaj revise kiye</span></div>
      <div className="rv-sum__n"><b>{st.done}</b><span>🏁 pakke</span></div>
      <div className="rv-sum__week" title="Agle 7 din kitne dohrane padenge">
        {st.next7.map((d, i) => (
          <span key={d.k}><i style={{ height: `${Math.round((d.n / max) * 38)}px` }} /><b>{d.n}</b><small>{i === 0 ? "Aaj" : new Date(d.k + "T00:00:00").toLocaleDateString("en-IN", { weekday: "narrow" })}</small></span>
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
  ...MoreLayouts,
];

export default function AnswersLayouts({ lay, renderCard, list, ...props }) {
  const [rev, setRev] = useState({});
  useEffect(() => {
    setRev(getRevMap());
    const on = () => setRev(getRevMap());
    window.addEventListener("cgl:ansrev", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:ansrev", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const today = dayKey(new Date().toISOString());
  const cache = useMemo(() => new Map(), [rev, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (r) => {
    if (!cache.has(r.id)) cache.set(r.id, revPlan(r, rev, today));
    return cache.get(r.id);
  }, [cache, rev, today]);
  const onRev = (id) => setRev(markRevised(id));
  const onUnrev = (id) => setRev(unmarkToday(id));
  // Har card ke upar uski revision patti.
  const card = (r, i, pop) => (
    <div key={r.uid} className="al-item">
      <RevStrip r={r} p={plan(r)} onRev={onRev} onUnrev={onUnrev} />
      {renderCard(r, i, pop)}
    </div>
  );
  const L = ANS_LAYOUTS.find((l) => l.id === lay);
  if (!L) return null;
  const C = L.C;
  return (
    <>
      <RevSummary list={list} plan={plan} />
      <C {...props} list={list} renderCard={card} rawCard={renderCard} plan={plan} onRev={onRev} onUnrev={onUnrev} />
    </>
  );
}
