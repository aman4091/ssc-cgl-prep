"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PlanPractice from "./PlanPractice";
import {
  getMission, startMission, saveMission, getDone, toggleDone, currentDayNum, buildTimeline, nowBlock,
  dayStats, mustComplete, streak, recentActions, pendingRules, RULES, DEFAULT_START, SHIFTS,
  planFor, fmtDay, totalDays, totalMocks, getExam, setExam, daysBetween,
  getMetrics, setMetric, hasGsSectional, FLOOR, TARGET, PCT_NOW, PCT_TARGET,
  CLUSTER_TARGET, mathGate, MATH_GATE_DAY, MATH_GATE_ATT, MATH_GATE_DAYS,
} from "@/lib/mission";
import { dueCount, dueTotal, getFacts, DAILY_CAP } from "@/lib/missionfacts";
import { getMocks } from "@/lib/mockmarks";
import { dayKey } from "@/lib/daytime";
import { daysLeft, setTargets, setOrder, DEFAULT_TARGETS, DEFAULT_ORDER } from "@/lib/daily";

// 🚀 Home = EK SCREEN, EK KAAM.
//
// Pehle yahan sab kuch tha: fact log ki patti, zaroori baatein, phase ka
// paragraph, target/percentile/floor, "kal poora nahi hua", due facts ki
// ginti, CORE ka hisaab, aur neeche din ki poori timeline. Subah kholte hi
// pehle ye tay karna padta tha ki dekhna kya hai — aur wahi ek kadam roz ka
// kaam taal deta tha.
//
// Ab sirf teen cheezein:
//   1. Upar ek PATLI line   — Day X/32 · CORE n/5 · Exam N din
//   2. Beech mein ABHI ka block, poori screen gherta hua, do bade button
//   3. Neeche "⌄ Aaj ka din" — band; kholne par CORE 5, raat ke 3 number
//
// Alert ek waqt mein sirf EK, aur wo bhi ABHI card ke neeche patli line mein.
// Baaki sab (target, percentile, floor, phase, checkpoint) /mission/progress
// par. Fact log ki ginti sirf 08:00 wale revision block ke andar.

function Setup({ onDone, initial }) {
  const [date, setDate] = useState(initial?.startDate || DEFAULT_START);
  const [shift, setShift] = useState(initial?.shift || "09:00");
  const [exam, setExamIn] = useState(getExam());
  const [conf, setConf] = useState(initial?.examConfirmed !== false);
  return (
    <div className="glass-card ms-form" style={{ padding: 18 }}>
      <div className="card-hd">🚀 CGL Mission — 32 din, exam 27 Oct</div>
      <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 10px" }}>
        Teen phase: <strong>D1–14 GS BLITZ</strong> (GS roz ~4.5 ghante) → <strong>D15–26 GAP FILL</strong> (Maths ke bache chapter full) →
        <strong> D27–32 PEAK + TAPER</strong> (sirf mock + revision). Master metric <strong>percentile</strong> hai, score nahi:
        abhi {PCT_NOW} → target {PCT_TARGET}. Din tumhare routine par: 08–10, 11–20:30, 22:30–23:00.
      </p>
      <div className="form-grid">
        <label className="field">
          <span>Day 1 kaunsa din hai?</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Exam date (confirm: 27 Oct 2026)</span>
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
          <strong>Ye date PAKKI hai (27 Oct 2026).</strong>{" "}
          <span className="muted">Admit card 10 Oct ke baad aayega — shift aate hi upar wali setting badal lena, poora plan usi shift par chalta hai.</span>
        </span>
      </label>
      <button
        className="btn btn--primary btn--block mt-16"
        onClick={() => {
          if (!date || !exam) return;
          if (initial?.startDate) saveMission({ startDate: date, shift });
          else {
            startMission(date, shift);
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

// Aaj ke naye cluster (fact log mein jude GS/CA card) — metric aur alert dono isi se.
function clustersToday() {
  try { return getFacts().filter((f) => f.day === dayKey() && (f.sec === "gs" || f.sec === "ca")).length; }
  catch { return 0; }
}
// 3 din se 20 se kam cluster? To ginti ki nahi, TAREEKE ki dikkat hai.
function clusterLow(all) {
  let n = clustersToday() < 20 ? 1 : 0;
  for (let i = 1; i <= 3; i++) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const v = all[k];
    if (v && v.c != null && v.c < 20) n++;
  }
  return n >= 3;
}

// 🌙 Raat ke 3 number — ab fold ke andar. Ye roz subah nahi chahiye, raat ko
// chahiye, isliye raat wale block par fold khud khul jaata hai.
function MetricCard({ gate }) {
  const dk = dayKey();
  const [all, setAll] = useState(() => getMetrics());
  const today = all[dk] || {};
  const gsAuto = !!(gate && gate.total > 0 && gate.doneCount >= gate.total);
  const gsTouched = today.gs != null ? today.gs : gsAuto;
  const clusters = clustersToday();
  const last = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { k, v: all[k] };
  });
  return (
    <div className="glass-card ms-metric">
      <div className="card-hd">🌙 Roz raat ke 3 number</div>
      <div className="row" style={{ gap: 10 }}>
        <label className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
          <span style={{ fontSize: "0.88rem" }}>🧮 Maths attempt (25 mein):</span>
          <input className="input" type="number" min="0" max="25" style={{ width: 80, padding: "6px 10px" }}
            value={today.m ?? ""} onChange={(e) => setAll(setMetric(dk, { m: e.target.value === "" ? null : Number(e.target.value) }))} />
        </label>
        <Link href="/mission/facts" className={"btn btn--sm " + (clusters >= CLUSTER_TARGET ? "btn--primary" : "btn--ghost")}>
          🧩 Naye cluster: <strong style={{ marginLeft: 4 }}>{clusters}</strong>/{CLUSTER_TARGET}
        </Link>
        <button className={"btn btn--sm " + (gsTouched ? "btn--primary" : "btn--ghost")} onClick={() => setAll(setMetric(dk, { gs: !gsTouched }))}>
          🌍 GS core block: {gsTouched ? "✓ hue" : "✗ nahi"}
        </button>
      </div>
      <div className="ms-metric__week">
        {last.map(({ k, v }) => (
          <span key={k} className="ms-metric__d" title={k}>
            <span className="hint">{k.slice(8)}/{k.slice(5, 7)}</span>
            <strong className={v && v.m != null ? (v.m >= 21 ? "ms-ok" : "ms-bad") : "muted"}>{v && v.m != null ? v.m : "–"}</strong>
            <span>{v && v.gs ? "🌍" : "·"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Naam aur topic alag-alag — "Maths: SI + CI" → "Maths" + "SI + CI".
function splitTitle(b) {
  if (!b) return ["", ""];
  const i = b.t.indexOf(": ");
  if (b.nm) return [b.nm, i > 0 ? b.t.slice(i + 2) : ""];
  return i > 0 ? [b.t.slice(0, i), b.t.slice(i + 2)] : [b.t, ""];
}
const hhmm = (min) => (min >= 60 ? `${Math.floor(min / 60)} gh ${min % 60 || ""}${min % 60 ? " min" : ""}`.trim() : `${min} min`);

// 🎯 ABHI — poori screen ka ek hi kaam.
function NowCard({ b, next, nowMin, ok, onToggle, due }) {
  if (!b) {
    return (
      <div className="fc fc--idle">
        <div className="fc__title">{nowMin < 300 ? "So jao 😴" : "Khaali waqt"}</div>
        {next && <p className="fc__next">Agla: <strong>{next.start}</strong> — {splitTitle(next)[0]}</p>}
      </div>
    );
  }
  const [name, topic] = splitTitle(b);
  const life = !!(b.life || b.brk);
  const left = Math.max(0, b.e - nowMin);
  return (
    <div className={"fc" + (life ? " fc--life" : "") + (ok ? " fc--done" : "")}>
      <div className="fc__top">
        <span className="fc__time">{b.start}{b.id !== "sleep" ? `–${b.end}` : ""}</span>
        {!life && <span className="fc__left">⏳ {hhmm(left)} bacha</span>}
      </div>
      <div className="fc__title">{name}</div>
      {topic && <p className="fc__topic">{topic}</p>}
      {b.tg && <p className="fc__target">🎯 {b.tg}</p>}
      {b.kind === "revision" && (
        <p className="fc__target">
          🧠 Aaj <strong>{due.n}</strong> cluster due
          {due.total > due.n ? ` — kul ${due.total}, par roz ki hadd ${DAILY_CAP}. Baaki kal khud aayenge, koi backlog nahi.` : ""}
        </p>
      )}
      {!life && (
        <div className="fc__btns">
          {b.auto && b.auto.n
            ? <PlanPractice auto={b.auto} title={b.t} big />
            : b.href
              ? <Link href={b.href} className="fc__btn fc__btn--go">▶ SHURU</Link>
              : null}
          <button className={"fc__btn " + (ok ? "fc__btn--undo" : "fc__btn--ok")} onClick={() => onToggle(b.id)}>
            {ok ? "↩ UNDO" : "✓ HO GAYA"}
          </button>
        </div>
      )}
      {next && <p className="fc__next">Agla: <strong>{next.start}</strong> — {splitTitle(next)[0]}</p>}
    </div>
  );
}

// ⌄ Aaj ka din — band rehta hai. Kholne par CORE 5, action item aur raat ke
// 3 number. Raat wale block par khud khul jaata hai (tab wahi kaam hai).
function DayFold({ tl, done, day, onToggle, gate, actions, openNow }) {
  const [open, setOpen] = useState(false);
  const auto = useRef(false);
  useEffect(() => {
    if (openNow && !auto.current) { auto.current = true; setOpen(true); }
  }, [openNow]);
  const core = tl.filter((b) => b.core);
  const d = (done && done[day]) || {};
  const n = core.filter((b) => d[b.id]).length;
  return (
    <div className="fold">
      <button className="fold__hd" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "▴" : "▾"}  Aaj ka din ({n}/{core.length})
      </button>
      {open && (
        <div className="fold__body">
          {core.map((b) => {
            const okb = !!d[b.id];
            return (
              <div key={b.id} className="row" style={{ gap: 8, marginTop: 6, flexWrap: "nowrap", alignItems: "flex-start" }}>
                <button className={"chk__box" + (okb ? " is-on" : "")} onClick={() => onToggle(b.id)} aria-label="tick">{okb ? "✓" : ""}</button>
                <span style={{ flex: 1, fontSize: "0.9rem", textDecoration: okb ? "line-through" : "none" }}>
                  <span className="muted">{b.start}</span> {splitTitle(b)[0]}{b.gate ? " 🔒" : ""}
                </span>
              </div>
            );
          })}
          <p className="hint" style={{ margin: "8px 0 0" }}>
            🔒 wale GS block chhoote to din count nahi hota. <Link href={`/mission/plan?day=${day}`}>Poori timeline →</Link>
          </p>
          {actions.length > 0 && <ul className="ms-rev" style={{ marginTop: 8 }}>{actions.map((a, i) => <li key={i}>{a.t}</li>)}</ul>}
          <div style={{ marginTop: 10 }}><MetricCard gate={gate} /></div>
        </div>
      )}
    </div>
  );
}

export default function MissionToday({ showSetupLink = true }) {
  const [m, setM] = useState(null);
  const [done, setDone] = useState({});
  const [now, setNow] = useState(() => new Date());
  const [extra, setExtra] = useState({ actions: [], rules: [], due: { n: 0, total: 0 }, gsBase: true, gate: null, low: false });
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(() => {
    const mm = getMission();
    setM(mm);
    setDone(getDone());
    let rules = [], gsBase = true, gate = null;
    try {
      const mocks = getMocks();
      rules = pendingRules(mocks, mm);
      gsBase = hasGsSectional(mocks);
      gate = mathGate(mocks);
    } catch { /* ignore */ }
    setExtra({
      actions: recentActions(), rules, gsBase, gate,
      due: { n: dueCount(), total: dueTotal() },
      low: clusterLow(getMetrics()),
    });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => setNow(new Date()), 15000);
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

  // ---- Day 0 · Setup — mission kal se. Aaj koi core block nahi.
  if (day < 1) {
    const d0 = done[0] || {};
    return (
      <>
        <p className="fcline">
          <strong>Day 0 · Setup</strong>
          <span className="fcline__sep">·</span> Day 1 = {fmtDay(m.startDate)}
          {left != null && <><span className="fcline__sep">·</span> Exam <strong>{left}</strong> din</>}
        </p>
        <section className="section" style={{ marginTop: 6 }}>
          <div className="fc">
            <div className="fc__title">Aaj kuch zaroori nahi</div>
            <p className="fc__topic">Kal subah 8 baje se Day 1 — Static GK-1 aur Percentage. Aaj sirf agar mann ho:</p>
            {[
              { id: "pre-gs", t: "Ek GS sectional (Testbook = PYQ) — score jo bhi aaye, /mock-marks → GK/GS mein likho", href: "/mock-marks?cat=gk", label: "📊 GS marks" },
              { id: "pre-cluster", t: "Usi sectional ke galat/unsure Q ka CLUSTER → fact log", href: "/mission/facts", label: "🧠 Fact log" },
            ].map((x) => {
              const okx = !!d0[x.id];
              return (
                <div key={x.id} className="row" style={{ gap: 8, marginTop: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <button className={"chk__box" + (okx ? " is-on" : "")} onClick={() => setDone(toggleDone(0, x.id))} aria-label="tick">{okx ? "✓" : ""}</button>
                  <span style={{ flex: 1, fontSize: "0.95rem", textDecoration: okx ? "line-through" : "none" }}>{x.t}</span>
                  <Link href={x.href} className="btn btn--sm">{x.label}</Link>
                </div>
              );
            })}
            <p className="fc__next">
              32 din · {totalMocks(m)} full mock · exam {fmtDay(getExam())} ·{" "}
              <Link href="/mission/plan">Poora plan →</Link>
              {showSetupLink && <> · <button className="linklike" onClick={() => setEditing(true)}>⚙️ Date / shift</button></>}
            </p>
          </div>
        </section>
      </>
    );
  }

  // ---- Plan khatam / exam ka din.
  if (day > N) {
    return (
      <>
        <p className="fcline"><strong>Exam ka din</strong> 🎯</p>
        <section className="section" style={{ marginTop: 6 }}>
          <div className="fc">
            <div className="fc__title">Aaj sirf exam-day rules</div>
            <p className="fc__topic">Naya kuch nahi. Hall mein FLOOR {FLOOR.total} le ke jao (target {TARGET.total}).</p>
            <div className="fc__btns"><Link href="/mission/exam" className="fc__btn fc__btn--go">▶ RULES</Link></div>
          </div>
        </section>
      </>
    );
  }

  const p = planFor(day, m);
  const tl = buildTimeline(day, m);
  const { cur, next, t } = nowBlock(tl, now);
  const stats = dayStats(day, done, m);
  const gateBlocks = tl.filter((b) => b.gate);
  const gate = { total: gateBlocks.length, doneCount: gateBlocks.filter((b) => (done[day] || {})[b.id]).length };
  const onToggle = (id) => setDone(toggleDone(day, id));
  const curDone = !!(cur && (done[day] || {})[cur.id]);
  const toExam = daysBetween(dayKey(), getExam());
  const st = streak(done, m);
  const dayOK = mustComplete(day, done, m);

  // ---- Ek waqt mein EK alert, wo bhi patli line. Kram: D14 ka gate faisla
  // (wo us din ka asli faisla hai) → checkpoint rule → GS cluster kam →
  // GS baseline → admit card. Baaki sab /mission/progress par.
  let alert = null;
  const g = extra.gate;
  if (day === MATH_GATE_DAY && g) {
    alert = {
      t: `🚪 Maths attempt ${g.att == null ? "—" : Math.round(g.att * 10) / 10} (chahiye ${MATH_GATE_ATT}) → Phase 2 ke naye chapter ${g.open ? "KHUL GAYE" : "BAND, sirf sprint"}.`,
      href: "/mission/progress", cta: "Dekho →",
    };
  } else if (day > MATH_GATE_DAY && day <= MATH_GATE_DAYS[1] && g && !g.open) {
    alert = { t: "🚪 Naye Maths chapter band hain (attempt 20 se kam) — ek achha Maths sectional do, gate khul jayega.", href: "/mock-marks?cat=maths", cta: "Marks →" };
  } else if (extra.rules.length > 0) {
    alert = { t: `⚠️ ${RULES[extra.rules[0]].title}`, href: "/mission/progress", cta: "Lagao →" };
  } else if (extra.low) {
    alert = { t: "🧩 3 din se 20 se kam cluster. Ginti nahi, TAREEKA — entry ek fact ki hai ya poore group ki?", href: "/mission/facts", cta: "Fact log →" };
  } else if (!extra.gsBase) {
    alert = { t: "🌍 Ek bhi GS sectional nahi diya — bina baseline CP1 bekaar.", href: "/mock-marks?cat=gk", cta: "Marks →" };
  } else if (!m.examConfirmed && ((toExam != null && toExam <= 17) || day >= 16)) {
    alert = { t: "📋 Admit card check karo — shift aate hi setting mein daal do.", href: "/mission/exam", cta: "Dekho →" };
  }

  return (
    <>
      <p className="fcline">
        Day <strong>{day}/{N}</strong>
        <span className="fcline__sep">·</span> CORE <strong>{stats.coreDone}/{stats.coreTotal}</strong>
        {left != null && <><span className="fcline__sep">·</span> Exam <strong>{left}</strong> din</>}
        {p.type === "A" && <><span className="fcline__sep">·</span> FM {p.fm}</>}
      </p>

      <section className="section" style={{ marginTop: 6 }}>
        <NowCard b={cur} next={next} nowMin={t} ok={curDone} onToggle={onToggle} due={extra.due} />
        {alert && <p className="fc__alert">{alert.t} <Link href={alert.href}>{alert.cta}</Link></p>}
      </section>

      <section className="section" style={{ marginTop: 10 }}>
        <DayFold
          tl={tl} done={done} day={day} onToggle={onToggle} gate={gate}
          actions={extra.actions} openNow={!!(cur && cur.id === "night")}
        />
        <p className="hint" style={{ margin: "8px 0 0", textAlign: "center" }}>
          <Link href="/mission/plan">📅 {N} din</Link> · <Link href="/mission/progress">🚩 Checkpoints</Link>
          {showSetupLink && <> · <button className="linklike" onClick={() => setEditing(true)}>⚙️ Date / shift</button></>}
          {st > 1 ? ` · 🔥 ${st} din` : ""}
          {dayOK ? " · ✓ aaj ka din count ho gaya" : ""}
        </p>
      </section>
    </>
  );
}
