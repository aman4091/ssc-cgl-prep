"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MissionDay, { BlockActions } from "./MissionDay";
import {
  getMission, startMission, saveMission, getDone, toggleDone, currentDayNum, buildTimeline, nowBlock,
  dayStats, mustComplete, streak, recentActions, pendingRules, RULES, DEFAULT_START, SHIFTS,
  planFor, dateOfDay, fmtDay, totalDays, totalMocks, getExam, setExam, examBranch, daysBetween,
  getMetrics, setMetric, hasGsSectional, FLOOR, STRETCH,
} from "@/lib/mission";
import { dueCount, getFacts } from "@/lib/missionfacts";
import { getMocks } from "@/lib/mockmarks";
import { dayKey } from "@/lib/daytime";
import { daysLeft, setTargets, setOrder, DEFAULT_TARGETS, DEFAULT_ORDER } from "@/lib/daily";

// 🚀 Home ka dil — "abhi kya karna hai".
//
// Ek hi sawaal ka jawab sabse upar: ABHI kaunsa kaam hai, aur uska button. Uske
// neeche din ki poori timeline (tick karte jao), pichhle analysis ke action
// items, aaj ke due facts, aur agar koi checkpoint rule lag gaya ho to uski
// ghanti. Sabse neeche roz raat ka EK metric: Maths attempt + GS chhua ya nahi.
// Kal chhoot gaya? Peeche mat jao — bas aaj.

function Setup({ onDone, initial }) {
  const [date, setDate] = useState(initial?.startDate || DEFAULT_START);
  const [shift, setShift] = useState(initial?.shift || "09:00");
  const [exam, setExamIn] = useState(getExam());
  const [conf, setConf] = useState(!!initial?.examConfirmed);
  const br = examBranch(exam);
  return (
    <div className="glass-card ms-form" style={{ padding: 18 }}>
      <div className="card-hd">🚀 CGL Mission — aaj se exam tak</div>
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
          <span>Exam date (window 30 Sep – 30 Oct)</span>
          <input type="date" className="input" value={exam} onChange={(e) => setExamIn(e.target.value)} />
        </label>
        <label className="field">
          <span>Exam shift (admit card se; na pata ho to 9:00)</span>
          <select className="select input" value={shift} onChange={(e) => setShift(e.target.value)}>
            {SHIFTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <label className="row" style={{ gap: 8, marginTop: 10, flexWrap: "nowrap", alignItems: "flex-start", cursor: "pointer" }}>
        <input type="checkbox" checked={conf} onChange={(e) => setConf(e.target.checked)} style={{ marginTop: 5 }} />
        <span style={{ fontSize: "0.88rem" }}>
          <strong>Admit card aa gaya — ye date PAKKI hai.</strong>{" "}
          <span className="muted">Jab tak tick nahi, aakhri 2 taper din build din rahenge (plan ke beech taper = momentum khatam).</span>
        </span>
      </label>
      <div className="glass-card ms-alert ms-alert--info" style={{ marginTop: 10 }}>{br.t}</div>
      {!initial?.startDate && (
        <p className="hint">
          Shuru karte hi Home ke roz ke question-target bhi naye plan par aa jayenge (GS 100, Maths 60, English 50,
          Vocab 100, CA 30, Reasoning 15). ⚙️ Target se kabhi bhi badal sakte ho.
        </p>
      )}
      <button
        className="btn btn--primary btn--block mt-16"
        onClick={() => {
          if (!date || !exam) return;
          if (initial?.startDate) saveMission({ startDate: date, shift });
          else {
            startMission(date, shift);
            // Home ke roz ke question-target naye ROI par (lib/daily ke defaults) —
            // ek baar; ⚙️ Target se baad mein badal sakte ho.
            try { setTargets(DEFAULT_TARGETS); setOrder(DEFAULT_ORDER); } catch { /* ignore */ }
          }
          setExam(exam, conf);
          onDone();
        }}
      >
        {initial?.startDate ? "Save" : "Shuru karo →"}
      </button>
    </div>
  );
}

// 🌙 Roz raat ka ek hi metric — baaki sab iske aas-paas chalta hai.
function MetricCard({ day, done, m }) {
  const dk = dayKey();
  const [all, setAll] = useState(() => getMetrics());
  const today = all[dk] || {};
  const d = (done && done[day]) || {};
  const gsAuto = !!(d.gs || d.gspyq || d.gsx || d.gsrev || d.ca);
  const gsTouched = today.gs != null ? today.gs : gsAuto;
  // Naye cluster = aaj fact log mein jude GS/CA facts (apne aap ginti).
  let clusters = 0;
  try { clusters = getFacts().filter((f) => f.day === dk && (f.sec === "gs" || f.sec === "ca")).length; } catch { /* ignore */ }
  const last = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { k, v: all[k] };
  });
  return (
    <div className="glass-card ms-metric">
      <div className="card-hd">🌙 Roz raat ke 3 number</div>
      <p className="hint" style={{ margin: "0 0 8px" }}>Maths attempt count (sprint/sectional/mock ka) · aaj ke naye GS cluster · GS chhua ya nahi. Baaki sab iske aas-paas chalta hai.</p>
      <div className="row" style={{ gap: 10 }}>
        <label className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
          <span style={{ fontSize: "0.88rem" }}>🧮 Maths attempt (25 mein):</span>
          <input className="input" type="number" min="0" max="25" style={{ width: 80, padding: "6px 10px" }}
            value={today.m ?? ""} onChange={(e) => setAll(setMetric(dk, { m: e.target.value === "" ? null : Number(e.target.value) }))} />
        </label>
        <Link href="/mission/facts" className={"btn btn--sm " + (clusters >= 25 ? "btn--primary" : "btn--ghost")}>
          🧩 Naye cluster: <strong style={{ marginLeft: 4 }}>{clusters}</strong>/25
        </Link>
        <button className={"btn btn--sm " + (gsTouched ? "btn--primary" : "btn--ghost")} onClick={() => setAll(setMetric(dk, { gs: !gsTouched }))}>
          🌍 GS chhua: {gsTouched ? "✓ haan" : "✗ nahi"}
        </button>
      </div>
      <div className="ms-metric__week">
        {last.map(({ k, v }) => (
          <span key={k} className="ms-metric__d" title={k}>
            <span className="hint">{k.slice(8)}/{k.slice(5, 7)}</span>
            <strong className={v && v.m != null ? (v.m >= 19 ? "ms-ok" : "ms-bad") : "muted"}>{v && v.m != null ? v.m : "–"}</strong>
            <span>{v && v.gs ? "🌍" : "·"}</span>
          </span>
        ))}
      </div>
      <p className="hint" style={{ margin: "6px 0 0" }}>Hara = 19+ attempt (Checkpoint 1 ka target). {m && totalMocks(m)} full mock is plan mein.</p>
    </div>
  );
}

export default function MissionToday({ showSetupLink = true }) {
  const [m, setM] = useState(null);
  const [done, setDone] = useState({});
  const [now, setNow] = useState(() => new Date());
  const [extra, setExtra] = useState({ actions: [], rules: [], due: 0, gsBase: true });
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(() => {
    const mm = getMission();
    setM(mm);
    setDone(getDone());
    let rules = [], gsBase = true;
    try { const mocks = getMocks(); rules = pendingRules(mocks, mm); gsBase = hasGsSectional(mocks); } catch { /* ignore */ }
    setExtra({ actions: recentActions(), rules, due: dueCount(), gsBase });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => setNow(new Date()), 30000);
    const on = () => refresh();
    window.addEventListener("cgl:mission-changed", on);
    window.addEventListener("cgl:daily-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    window.addEventListener("storage", on);
    return () => {
      clearInterval(t);
      window.removeEventListener("cgl:mission-changed", on);
      window.removeEventListener("cgl:daily-changed", on);
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

  const N = totalDays(m);
  const day = currentDayNum(m);
  const left = daysLeft();

  // Mission abhi shuru nahi hua (jaise aaj ka din chhod ke kal se shuru kiya) —
  // Day 1 ki poori timeline yahin, taaki raat ko hi pata rahe kal kya karna hai.
  if (day < 1) {
    return (
      <>
        <section className="section" style={{ marginTop: 0 }}>
          <div className="glass-card ms-now">
            <div className="ms-now__label">🚀 CGL MISSION · DAY 1 = {fmtDay(m.startDate).toUpperCase()}</div>
            <div className="ms-now__title">Kal subah 8 baje se Day 1 — par "kal se" ki aadat AAJ todni hai.</div>
            <p className="ms-how" style={{ marginTop: 4 }}>
              Poora din nahi — sirf ye kaam, kul ~75 min. Sabse zaroori: GS cluster. {N} din, {totalMocks(m)} full mock, exam {fmtDay(getExam())}{m.examConfirmed ? "" : " (date pakki nahi)"}.
            </p>
            {[
              { id: "pre-gs", t: "GS BASELINE sectional + marks /mock-marks → GK/GS mein (hua: 9 sahi / 16 galat = 10)", href: "/mock-marks?cat=gk", label: "📊 GS marks" },
              { id: "pre-cluster", t: "GS mock ke 16 galat Q ka CLUSTER → Fact log (~120 facts) — pehla cluster session (40 min)", href: "/mission/facts", label: "🧠 Fact log" },
              { id: "pre-buckets", t: "Maths mock ke 24 solvable Q stopwatch se 🟢/🟡/🔴 + yellow ka short method (20 min)", href: "/mission/analysis", label: "🔍 Analysis" },
              { id: "pre-tables", t: "Tables 12–25 ka pehla pass — bol ke, 20 random (15 min)", href: "/calculation", label: "🧮 Calculation" },
            ].map((x) => {
              const ok = !!((done[0] || {})[x.id]);
              return (
                <div key={x.id} className="row" style={{ gap: 8, marginTop: 8, flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <button className={"chk__box" + (ok ? " is-on" : "")} onClick={() => setDone(toggleDone(0, x.id))} aria-label="tick">{ok ? "✓" : ""}</button>
                  <span style={{ flex: 1, fontSize: "0.9rem", textDecoration: ok ? "line-through" : "none" }}>{x.t}</span>
                  <Link href={x.href} className="btn btn--sm">{x.label}</Link>
                </div>
              );
            })}
            <p className="hint" style={{ margin: "6px 0 0" }}>
              🎯 Exam hall mein FLOOR: R {FLOOR.R} · GS {FLOOR.GS} · Q {FLOOR.Q} · E {FLOOR.E} = {FLOOR.total} · stretch {STRETCH.total}
            </p>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              <Link href="/mission/plan" className="btn btn--sm">📅 Poora plan</Link>
              {showSetupLink && <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>⚙️ Exam date / shift</button>}
            </div>
          </div>
        </section>
        <section className="section" style={{ marginTop: 10 }}>
          <h2 className="ms-h2">Kal — Day 1 ({fmtDay(m.startDate)})</h2>
          <MissionDay day={1} mission={m} done={done} onToggle={(id) => setDone(toggleDone(1, id))} nowMin={null} />
        </section>
      </>
    );
  }
  if (day > N) {
    return (
      <section className="section" style={{ marginTop: 0 }}>
        <div className="glass-card ms-now" style={{ padding: 16 }}>
          <div className="card-hd">🎯 Exam ka din / plan poora</div>
          <p style={{ margin: "0 0 8px" }}>Aaj sirf <Link href="/mission/exam">exam-day rules</Link> — naya kuch nahi. Exam hall mein FLOOR le ke jao: {FLOOR.total}.</p>
          <p className="hint" style={{ margin: 0 }}>Soch ke tukka: 1+ option kata ho tabhi. Har section ke aakhri 40 sec: bache blank ek hi letter se bhar do. English: error/SI 2nd number par. Maths: pehle 40 sec scan, round 1 mein kisi Q pe 60 sec se zyada nahi.</p>
        </div>
      </section>
    );
  }

  const p = planFor(day, m);
  const tl = buildTimeline(day, m);
  const { cur, next, t } = nowBlock(tl, now);
  const stats = dayStats(day, done, m);
  const pct = stats.mustTotal ? Math.round((stats.mustDone / stats.mustTotal) * 100) : 0;
  const dayOK = mustComplete(day, done, m);
  const st = streak(done, m);
  const yesterdayMissed = day > 1 && !mustComplete(day - 1, done, m);
  const onToggle = (id) => { setDone(toggleDone(day, id)); };
  const curDone = cur && (done[day] || {})[cur.id];
  const toExam = daysBetween(dayKey(), getExam());
  const isSunday = now.getDay() === 0;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <div className="row between">
          <span className="hero__eyebrow">🚀 CGL Mission · {fmtDay(dateOfDay(m.startDate, day))}</span>
          <span className="row" style={{ gap: 6 }}>
            {st > 1 && <span className="badge">🔥 {st} din</span>}
            {left != null && <span className="badge">🎯 Exam: {left} din{m.examConfirmed ? "" : " (?)"}</span>}
          </span>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          Day <span className="grad">{day} / {N}</span>
          <span className="muted" style={{ fontSize: "0.9rem", fontWeight: 500, marginLeft: 10 }}>
            {p.type === "A" ? `Full mock ${p.fm}/${totalMocks(m)}` : p.type === "B" ? "Build din" : "Taper — halka"}
            {p.checkpoint ? ` · Checkpoint ${p.checkpoint}` : ""}{p.ext ? " · Extension" : ""}
          </span>
        </h1>
        <p className="hint" style={{ margin: "4px 0 0" }}>
          🎯 Exam hall mein <strong>FLOOR</strong>: R {FLOOR.R} · GS {FLOOR.GS} · Q {FLOOR.Q} · E {FLOOR.E} = <strong>{FLOOR.total}</strong>
          {" "}· stretch {STRETCH.total} (paper aasan ho to apne aap)
        </p>
        <p className="hint" style={{ margin: "2px 0 0" }}>
          ⚖️ Maths roz 2.5 ghante se <strong>zyada nahi</strong>, GS ~4 ghante (PYQ + cluster) — Maths +7 deta hai, GS 10 → 22 = +12. Comfortable subject ke peeche mat bhaago.
        </p>
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
        {!extra.gsBase && (
          <div className="glass-card ms-alert ms-alert--bad">
            <strong>🌍 GS ka asli baseline nahi hai.</strong> Ab tak ek bhi GS sectional nahi diya (full mock mein GS 9.5 aaya tha).
            Aaj ek GS sectional do (Testbook, CGL 2024) — score jo bhi aaye, /mock-marks → GK/GS mein likho. Bina baseline Checkpoint 1 bekaar.
          </div>
        )}
        {!m.examConfirmed && ((toExam != null && toExam <= 7) || day >= 7) && (
          <div className="glass-card ms-alert ms-alert--bad">
            📋 Admit card check (2 min, 8 baje se pehle): SSC / regional site par status dekho. Date + shift aate hi yahan daalo — aakhri din ka poora plan usi pe khada hai.{" "}
            <a href="https://ssc.gov.in" target="_blank" rel="noreferrer" className="btn btn--sm">ssc.gov.in ↗</a>{" "}
            <button className="btn btn--sm btn--primary" onClick={() => setEditing(true)}>⚙️ Date confirm</button>
          </div>
        )}
        {isSunday && (
          <div className="glass-card ms-alert ms-alert--info">
            📄 Sunday backup: <Link href="/mock-marks?cat=full">/mock-marks → 📄 Text report</Link> download karke kahin save karo. (Cloud sync bhi chal raha hai — ye extra copy hai.)
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
            Zaroori: {stats.mustDone}/{stats.mustTotal} · realistic ~9–9.5 ghante productive
          </span>
          <span className="row" style={{ gap: 6 }}>
            <Link href="/mission/plan" className="btn btn--ghost btn--sm">📅 {N} din</Link>
            {showSetupLink && <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>⚙️ Exam date / shift</button>}
          </span>
        </div>
        <div className="progress" style={{ marginTop: 0, marginBottom: 12 }}>
          <div className="progress__bar" style={{ width: pct + "%" }} />
        </div>
        <p className="hint" style={{ margin: "0 0 8px" }}>Block ka ✓ MASTER hai. Neeche wali question ginti (Aaj ka kaam) sirf guide — dono takrayein to block jeetega.</p>
        {dayOK && (
          <div className="glass-card ms-alert ms-alert--ok">✓ Aaj ka din COUNT ho gaya. Bonus karo ya aaram — dono theek.</div>
        )}
        <MissionDay day={day} mission={m} done={done} onToggle={onToggle} nowMin={t} />
      </section>

      <section className="section" style={{ marginTop: 14 }}>
        <MetricCard day={day} done={done} m={m} />
      </section>
    </>
  );
}
