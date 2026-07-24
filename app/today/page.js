"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanPractice from "@/components/PlanPractice";
import {
  PLAN, MOCK_DAYS, BASELINE, TARGETS, SEC_META, QA_TYPE_LIST,
  getPlanner, setStartDate, toggleBlock, setQaRating, currentDayNum, dayCompletion, planStreak,
} from "@/lib/planner";

const RATINGS = [
  { val: "a", label: "Aata hai", color: "var(--ok, #6bd39a)" },
  { val: "r", label: "Rusty", color: "#fbbf24" },
  { val: "n", label: "Nahi aata", color: "var(--bad, #ff8a7a)" },
];

// /today — the 40-Day Mission 150 planner.
//
// A FIXED, pre-authored 40-day plan (lib/planner.js) rendered as: today's blocks
// with tick-boxes, deep links into this site's own banks/notes, and a 40-day
// board. This route also un-breaks FocusEnforcer, which has always pushed to
// /today after "Start now".

function fmtDate(startDate, n) {
  const [y, m, d] = startDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + (n - 1));
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

function SecBadge({ sec }) {
  const meta = SEC_META[sec] || SEC_META.REV;
  return (
    <span className="badge" style={{
      color: meta.color, borderColor: "transparent",
      background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
      fontSize: "0.68rem", fontWeight: 700,
    }}>
      {meta.name}
    </span>
  );
}

function BlockCard({ block, done, onToggle }) {
  return (
    <div className="glass-card target-card" style={done ? { opacity: 0.55 } : undefined}>
      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
        <button
          className={"chk__box" + (done ? " is-on" : "")}
          style={{ marginTop: 2, flexShrink: 0 }}
          onClick={onToggle}
          aria-label={done ? "Mark not done" : "Mark done"}
        >
          {done ? "✓" : ""}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row between" style={{ gap: 8 }}>
            <SecBadge sec={block.sec} />
            <span className="muted" style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>{block.min} min</span>
          </div>
          <div style={{ fontWeight: 700, margin: "4px 0 2px", textDecoration: done ? "line-through" : "none" }}>
            {block.t}
          </div>
          <p className="muted" style={{ fontSize: "0.84rem", lineHeight: 1.5, margin: 0 }}>{block.task}</p>
          {(block.links.length > 0 || block.auto) && (
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {block.auto && <PlanPractice auto={block.auto} title={block.t} />}
              {block.links.map((l, i) => (
                <Link key={i} href={l.href} className="btn btn--ghost btn--sm">{l.label} →</Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const [st, setSt] = useState(null);      // planner state
  const [viewDay, setViewDay] = useState(null); // which day the board opened (null = today)
  const [dateIn, setDateIn] = useState("");
  const [showTypes, setShowTypes] = useState(false); // the 19-type inventory list

  useEffect(() => {
    const s = getPlanner();
    setSt(s);
    const today = new Date();
    setDateIn(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  }, []);

  if (st === null) return <div className="placeholder">…</div>;

  // ---- first run: pick Day 1 ----
  if (!st.startDate) {
    return (
      <>
        <section className="hero">
          <span className="hero__eyebrow">📅 40-Day Plan</span>
          <h1 className="hero__title">Mission <span className="grad">150</span></h1>
          <p className="hero__sub">
            40 din ka FIXED plan — roz kholo, kaam dikhega, karo, tick karo. Har block seedha
            tumhari apni books pe khulta hai. Koi AI nahi, koi decision nahi — sirf mehnat.
          </p>
        </section>
        <section className="section">
          <div className="glass-card" style={{ padding: 18 }}>
            <div className="card-hd">Pehle ek sach</div>
            <p className="muted" style={{ fontSize: "0.88rem" }}>
              Chapter-complete karne mein ~200 din lagte — tumhare paas 40 hain. Isliye yeh plan
              QUESTION TYPES aur SPEED pe chalta hai: naye pattern mein har section 15 min locked
              hai, wahan yehi kaam aata hai. Baseline (tumhare mocks): Maths {BASELINE.QA} ·
              Reasoning {BASELINE.GI} · English {BASELINE.EN} · GS {BASELINE.GA} · Full {BASELINE.full}.
              Target: Maths {TARGETS.QA} · Reasoning {TARGETS.GI} · English {TARGETS.EN} · GS {TARGETS.GA} = <strong>~130-150</strong>.
            </p>
            <div className="form-grid mt-16">
              <label className="field">
                <span>Day 1 kaunsa din hai?</span>
                <input type="date" className="input" value={dateIn} onChange={(e) => setDateIn(e.target.value)} />
              </label>
            </div>
            <button
              className="btn btn--primary btn--block mt-16"
              onClick={() => { if (dateIn) setSt({ ...setStartDate(dateIn) }); }}
            >
              Shuru karo →
            </button>
          </div>
        </section>
      </>
    );
  }

  const today = currentDayNum(st);
  const n = viewDay || Math.min(Math.max(today, 1), 40);
  const p = PLAN[n];
  const isToday = n === today;
  const done = st.done[n] || {};
  const doneCount = p.blocks.reduce((a, _, i) => a + (done[i] ? 1 : 0), 0);
  const minTotal = p.blocks.reduce((a, b) => a + b.min, 0);
  const minDone = p.blocks.reduce((a, b, i) => a + (done[i] ? b.min : 0), 0);
  const streak = planStreak(st);
  const pct = Math.round((doneCount / p.blocks.length) * 100);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📅 40-Day Plan</span>
          {streak > 1 && <span className="badge">🔥 {streak} din</span>}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {today > 40
            ? <>40 din <span className="grad">poore</span> 🎯</>
            : today < 1
              ? <>Day 1: <span className="grad">{fmtDate(st.startDate, 1)}</span></>
              : <>Day <span className="grad">{n} / 40</span></>}
        </h1>
        <p className="hero__sub">
          {p.phase} · {fmtDate(st.startDate, n)}{!isToday && today >= 1 && today <= 40 ? " · (aaj Day " + today + " hai)" : ""}
        </p>
      </section>

      <section className="section">
        {today > 40 && (
          <div className="glass-card mt-16" style={{ padding: 16 }}>
            <p className="muted" style={{ margin: 0 }}>
              Ab bas exam bacha hai. Warning list padho (Notebook), sheets dekho, aur shanti se
              paper do. All the best. 💪
            </p>
          </div>
        )}

        {p.isMock && (
          <div className="glass-card" style={{ padding: "10px 14px", borderColor: SEC_META.MOCK.color, marginBottom: 12 }}>
            <span style={{ color: SEC_META.MOCK.color, fontWeight: 700, fontSize: "0.85rem" }}>
              🟣 MOCK DAY — mock + 90 min analysis sabse pehle.
            </span>
          </div>
        )}

        {isToday && today > 1 && today <= 40 && dayCompletion(st, today - 1) < 0.5 && (
          <div className="glass-card" style={{ padding: "10px 14px", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.84rem" }}>
              Kal (Day {today - 1}) adhoora reh gaya. Peeche MAT jao — aaj Day {today} ka hi kaam karo.
            </span>
          </div>
        )}

        <div className="row between" style={{ marginBottom: 6 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>{doneCount}/{p.blocks.length} blocks · {(minDone / 60).toFixed(1)}h / {(minTotal / 60).toFixed(1)}h</span>
          <span className="muted" style={{ fontSize: "0.8rem" }}>{pct}%</span>
        </div>
        <div className="progress" style={{ marginBottom: 10 }}>
          <div className="progress__bar" style={{ width: pct + "%" }} />
        </div>
        <p className="hint" style={{ marginBottom: 14 }}>{p.why}</p>

        {p.blocks.map((b, i) => (
          <BlockCard
            key={i}
            block={b}
            done={!!done[i]}
            onToggle={() => setSt({ ...toggleBlock(n, i) })}
          />
        ))}

        {doneCount === p.blocks.length && (
          <div className="glass-card center" style={{ padding: 18, borderColor: "var(--ok)" }}>
            <div style={{ fontSize: "1.8rem" }}>💪</div>
            <div style={{ fontWeight: 700 }}>Day {n} POORA{today <= 40 ? ` — aise hi ${40 - n} din aur` : ""}.</div>
            <p className="muted" style={{ fontSize: "0.84rem", margin: "4px 0 0" }}>Ab so ja — neend bhi tayari hai.</p>
          </div>
        )}
      </section>

      <section className="section">
        <div className="row between">
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Poora naksha</h2>
          {viewDay && (
            <button className="btn btn--ghost btn--sm" onClick={() => setViewDay(null)}>Aaj pe wapas</button>
          )}
        </div>
        <p className="hint" style={{ margin: "4px 0 10px" }}>
          Setup 1 · Foundation 2-10 · Build 11-24 · Integrate 25-34 · Taper 35-40. 🟣 = mock day.
          Kisi din pe tap karke uska kaam dekho.
        </p>
        <div className="days-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}>
          {Array.from({ length: 40 }, (_, i) => i + 1).map((d) => {
            const comp = dayCompletion(st, d);
            const cls = "day-cell" + (comp >= 0.7 ? " is-done" : comp > 0 ? " is-part" : "");
            return (
              <button
                key={d}
                className={cls}
                onClick={() => setViewDay(d === today ? null : d)}
                style={{
                  cursor: "pointer",
                  outline: d === n ? "2px solid var(--accent-2, #8ab4f8)" : "none",
                  borderColor: MOCK_DAYS.includes(d) ? SEC_META.MOCK.color : undefined,
                }}
              >
                <span className="day-cell__n">{d}</span>
                <span className="day-cell__c">{PLAN[d].phase.slice(0, 5)}</span>
                {comp >= 0.7 && <span className="day-cell__tick">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="row between">
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Maths ke 19 types</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowTypes((v) => !v)}>
            {showTypes ? "Band karo" : "List kholo"}
          </button>
        </div>
        <p className="hint" style={{ margin: "4px 0 10px" }}>
          Day 1 ka inventory isi list pe hota hai — har type pe imaandari se tap karo: Aata / Rusty / Nahi aata.
          Save apne aap hota hai. Rusty + Nahi-aata wale types pe hi asli mehnat lagegi.
        </p>
        {showTypes && QA_TYPE_LIST.map((u, i) => {
          const cur = st.qaRating?.[u.key] || null;
          return (
            <div key={u.key} className="glass-card" style={{ padding: "12px 14px", marginBottom: 8 }}>
              <div className="row between" style={{ gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{i + 1}. {u.name}</div>
                <div className="row" style={{ gap: 4, flexShrink: 0 }}>
                  {RATINGS.map((r) => (
                    <button
                      key={r.val}
                      className="btn btn--ghost btn--sm"
                      style={cur === r.val
                        ? { color: r.color, borderColor: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, fontWeight: 700 }
                        : { opacity: 0.75 }}
                      onClick={() => setSt({ ...setQaRating(u.key, r.val) })}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="muted" style={{ fontSize: "0.82rem", lineHeight: 1.5, margin: "4px 0 0" }}>{u.tip}</p>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {u.auto && <PlanPractice auto={{ n: 15, specs: u.auto }} title={u.name} />}
                {u.links.map((l, j) => (
                  <Link key={j} href={l.href} className="btn btn--ghost btn--sm">{l.label} →</Link>
                ))}
              </div>
            </div>
          );
        })}
        {showTypes && (() => {
          const vals = Object.values(st.qaRating || {});
          const c = { a: 0, r: 0, n: 0 };
          vals.forEach((v) => { if (c[v] != null) c[v]++; });
          return vals.length > 0 ? (
            <p className="hint" style={{ marginTop: 4 }}>
              {vals.length}/19 marked — 🟢 {c.a} aata · 🟡 {c.r} rusty · 🔴 {c.n} nahi aata.
              {c.r + c.n > 0 ? " Day 2 se inhi pe zor lagega." : ""}
            </p>
          ) : null;
        })()}
      </section>

      <section className="section">
        <div className="glass-card" style={{ padding: 14 }}>
          <div className="card-hd">Baseline → Target</div>
          <p className="muted" style={{ fontSize: "0.84rem", margin: 0 }}>
            Maths {BASELINE.QA} → <strong>{TARGETS.QA}</strong> · Reasoning {BASELINE.GI} → <strong>{TARGETS.GI}</strong> ·
            English {BASELINE.EN} → <strong>{TARGETS.EN}</strong> · GS {BASELINE.GA} → <strong>{TARGETS.GA}</strong> ·
            Full {BASELINE.full} → <strong>~130-150</strong>. Progress <Link href="/mock-marks?cat=full" style={{ color: "var(--accent-2, #8ab4f8)" }}>Mock Marks</Link> mein
            track hota hai — har mock ke baad entry zaroor.
          </p>
        </div>
      </section>
    </>
  );
}
