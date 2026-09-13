"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MissionDay, { BlockActions } from "./MissionDay";
import {
  getMission, startMission, saveMission, getDone, toggleDone, currentDayNum, buildTimeline, nowBlock,
  dayStats, mustComplete, streak, recentActions, pendingRules, RULES, TOTAL_DAYS, DEFAULT_START, SHIFTS,
  planFor, dateOfDay, fmtDay,
} from "@/lib/mission";
import { dueCount } from "@/lib/missionfacts";
import { getMocks } from "@/lib/mockmarks";
import { daysLeft, setTargets, setOrder, DEFAULT_TARGETS, DEFAULT_ORDER } from "@/lib/daily";

// 🚀 Home ka dil — "abhi kya karna hai".
//
// Ek hi sawaal ka jawab sabse upar: ABHI kaunsa kaam hai, aur uska button. Uske
// neeche din ki poori timeline (tick karte jao), pichhle analysis ke action
// items, aaj ke due facts, aur agar koi checkpoint rule lag gaya ho to uski
// ghanti. Kal chhoot gaya? Peeche mat jao — bas aaj.

function Setup({ onDone, initial }) {
  const [date, setDate] = useState(initial?.startDate || DEFAULT_START);
  const [shift, setShift] = useState(initial?.shift || "09:00");
  return (
    <div className="glass-card ms-form" style={{ padding: 18 }}>
      <div className="card-hd">🚀 CGL Mission — 18 din, exam tak</div>
      <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 10px" }}>
        Tumhare mock marks se bana plan: <strong>GS</strong> (sabse bada gap) → <strong>Maths speed</strong> (7–8 sawaal chhoot rahe) →
        <strong> English accuracy</strong> (6+ galat) → Reasoning sirf maintain. Din tumhare routine par: 08–10, 11–20:30, 22:30–23:30.
      </p>
      <div className="form-grid">
        <label className="field">
          <span>Day 1 kaunsa din hai?</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Exam shift (admit card se; na pata ho to 9:00)</span>
          <select className="select input" value={shift} onChange={(e) => setShift(e.target.value)}>
            {SHIFTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {!initial?.startDate && (
        <p className="hint">
          Shuru karte hi Home ke roz ke question-target bhi naye plan par aa jayenge (GS 100, Maths 60, English 50,
          Vocab 100, CA 30, Reasoning 15). ⚙️ Target se kabhi bhi badal sakte ho.
        </p>
      )}
      <button
        className="btn btn--primary btn--block mt-16"
        onClick={() => {
          if (!date) return;
          if (initial?.startDate) saveMission({ startDate: date, shift });
          else {
            startMission(date, shift);
            // Home ke roz ke question-target naye ROI par (lib/daily ke defaults) —
            // ek baar; ⚙️ Target se baad mein badal sakte ho.
            try { setTargets(DEFAULT_TARGETS); setOrder(DEFAULT_ORDER); } catch { /* ignore */ }
          }
          onDone();
        }}
      >
        {initial?.startDate ? "Save" : "Shuru karo →"}
      </button>
    </div>
  );
}

export default function MissionToday({ showSetupLink = true }) {
  const [m, setM] = useState(null);
  const [done, setDone] = useState({});
  const [now, setNow] = useState(() => new Date());
  const [extra, setExtra] = useState({ actions: [], rules: [], due: 0 });
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(() => {
    const mm = getMission();
    setM(mm);
    setDone(getDone());
    let rules = [];
    try { rules = pendingRules(getMocks(), mm); } catch { /* ignore */ }
    setExtra({ actions: recentActions(), rules, due: dueCount() });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => setNow(new Date()), 30000);
    const on = () => refresh();
    window.addEventListener("cgl:mission-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    window.addEventListener("storage", on);
    return () => {
      clearInterval(t);
      window.removeEventListener("cgl:mission-changed", on);
      window.removeEventListener("cgl:sync-applied", on);
      window.removeEventListener("storage", on);
    };
  }, [refresh]);

  if (!m) return <div className="placeholder">…</div>;
  if (!m.startDate || editing) {
    return (
      <section className="section" style={{ marginTop: 0 }}>
        <Setup initial={editing ? m : null} onDone={() => { setEditing(false); refresh(); }} />
      </section>
    );
  }

  const day = currentDayNum(m);
  const left = daysLeft();

  if (day < 1) {
    return (
      <section className="section" style={{ marginTop: 0 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="card-hd">🚀 CGL Mission</div>
          <p className="muted" style={{ margin: 0 }}>Day 1: <strong>{fmtDay(m.startDate)}</strong>. Tab tak <Link href="/mission/plan">poora plan</Link> dekh lo.</p>
        </div>
      </section>
    );
  }
  if (day > TOTAL_DAYS) {
    return (
      <section className="section" style={{ marginTop: 0 }}>
        <div className="glass-card ms-now" style={{ padding: 16 }}>
          <div className="card-hd">🎯 Exam ka din / plan poora</div>
          <p style={{ margin: "0 0 8px" }}>18 din khatam. Aaj sirf <Link href="/mission/exam">exam-day rules</Link> — naya kuch nahi.</p>
          <p className="hint" style={{ margin: 0 }}>Guessing rule: kam se kam 1 option kaat sako to tukka, warna chhodo. Maths: kisi Q pe 60 sec se zyada nahi (round 1).</p>
        </div>
      </section>
    );
  }

  const p = planFor(day);
  const tl = buildTimeline(day, m);
  const { cur, next, t } = nowBlock(tl, now);
  const stats = dayStats(day, done, m);
  const pct = stats.mustTotal ? Math.round((stats.mustDone / stats.mustTotal) * 100) : 0;
  const dayOK = mustComplete(day, done, m);
  const st = streak(done, m);
  const yesterdayMissed = day > 1 && !mustComplete(day - 1, done, m);
  const onToggle = (id) => { setDone(toggleDone(day, id)); };
  const curDone = cur && (done[day] || {})[cur.id];

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <div className="row between">
          <span className="hero__eyebrow">🚀 CGL Mission · {fmtDay(dateOfDay(m.startDate, day))}</span>
          <span className="row" style={{ gap: 6 }}>
            {st > 1 && <span className="badge">🔥 {st} din</span>}
            {left != null && <span className="badge">🎯 Exam: {left} din</span>}
          </span>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          Day <span className="grad">{day} / {TOTAL_DAYS}</span>
          <span className="muted" style={{ fontSize: "0.9rem", fontWeight: 500, marginLeft: 10 }}>
            {p.type === "A" ? `Full mock ${p.fm}/10` : p.type === "B" ? "Build din" : "Taper — halka"}
            {p.checkpoint ? ` · Checkpoint ${p.checkpoint}` : ""}
          </span>
        </h1>
      </section>

      {/* ---- ABHI ---- */}
      <section className="section" style={{ marginTop: 8 }}>
        <div className="glass-card ms-now">
          <div className="ms-now__label">ABHI · {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}</div>
          {cur ? (
            <>
              <div className="ms-now__title">
                {cur.t}
                <span className="ms-now__time">{cur.start}{cur.id !== "sleep" ? `–${cur.end}` : ""}</span>
              </div>
              {cur.how && <p className="ms-how" style={{ marginTop: 4 }}>{cur.how}</p>}
              {!cur.life && !cur.brk && (
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <BlockActions b={cur} compact />
                  <button className={"btn btn--sm " + (curDone ? "btn--ghost" : "btn--primary")} onClick={() => onToggle(cur.id)}>
                    {curDone ? "↩ Undo" : "✓ Ho gaya"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="ms-now__title">{t < 300 ? "So jao 😴 — subah 5:15" : "Free time"}</div>
          )}
          {next && (
            <p className="hint" style={{ margin: "10px 0 0" }}>
              Agla: <strong>{next.start}</strong> — {next.t}
            </p>
          )}
        </div>
      </section>

      {/* ---- ghantiyan ---- */}
      <section className="section" style={{ marginTop: 10 }}>
        {extra.rules.length > 0 && (
          <div className="glass-card ms-alert ms-alert--bad">
            <strong>⚠️ Checkpoint rule lag gaya:</strong>{" "}
            {extra.rules.map((id) => RULES[id].title).join(" · ")}.{" "}
            <Link href="/mission/progress">Dekho aur lagao →</Link>
          </div>
        )}
        {yesterdayMissed && (
          <div className="glass-card ms-alert">
            Kal (Day {day - 1}) poora nahi hua. <strong>Chhod do</strong> — koi backlog nahi. Bas aaj ka din.
          </div>
        )}
        {extra.actions.length > 0 && (
          <div className="glass-card ms-alert ms-alert--info">
            <strong>🔍 Pichhle analysis ke action items:</strong>
            <ul className="ms-rev">{extra.actions.map((a, i) => <li key={i}>{a.t}</li>)}</ul>
          </div>
        )}
        {extra.due > 0 && (
          <div className="glass-card ms-alert ms-alert--info">
            🧠 Aaj <strong>{extra.due}</strong> fact revise karne hain. <Link href="/mission/facts">Fact log →</Link>
          </div>
        )}
      </section>

      {/* ---- aaj ki timeline ---- */}
      <section className="section" style={{ marginTop: 10 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: dayOK ? "var(--ok)" : "var(--accent)" }}>
            Zaroori: {stats.mustDone}/{stats.mustTotal} · ~{Math.round(stats.mustMin / 60)} ghante
          </span>
          <span className="row" style={{ gap: 6 }}>
            <Link href="/mission/plan" className="btn btn--ghost btn--sm">📅 18 din</Link>
            {showSetupLink && <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>⚙️ Shift / date</button>}
          </span>
        </div>
        <div className="progress" style={{ marginTop: 0, marginBottom: 12 }}>
          <div className="progress__bar" style={{ width: pct + "%" }} />
        </div>
        {dayOK && (
          <div className="glass-card ms-alert ms-alert--ok">✓ Aaj ka din COUNT ho gaya. Bonus karo ya aaram — dono theek.</div>
        )}
        <MissionDay day={day} mission={m} done={done} onToggle={onToggle} nowMin={t} />
      </section>
    </>
  );
}
