"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { geminiActive } from "@/lib/storage";
import { SUBJECTS } from "@/lib/grammar";
import { dayKey } from "@/lib/daytime";
import { generateStudyPlan } from "@/lib/client-ai";
import {
  getRoadmap, saveRoadmap, isOnboarded, startOnboarding, applyGeneratedDays,
  buildCatalog, materializeToday, setTaskDone, logMockScore, dedupeTasks,
  taskHref, daysToExam, totalPlanDays, dayIndex,
} from "@/lib/roadmap";

const KIND_EMOJI = { mock: "📝", sectional: "🎯", topic: "🧩", vocab: "🔤", theory: "📚", ca: "📰", calc: "🧮", revision: "♻️", custom: "✍️" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function plus45() {
  const d = new Date(); d.setDate(d.getDate() + 45);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export default function RoadmapPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rm, setRm] = useState(null);
  const [bankIndex, setBankIndex] = useState(null);
  const [busy, setBusy] = useState("");   // "" | "gen" | "replan"
  const [err, setErr] = useState("");
  const [scoreFor, setScoreFor] = useState(null); // task awaiting a mock score
  const [flash, setFlash] = useState("");         // transient success note
  const [showTimeline, setShowTimeline] = useState(false);
  const rolled = useRef(false);
  const refresh = () => setRm(getRoadmap());
  const hasGemini = typeof window !== "undefined" && geminiActive();

  // Load the quiz-bank index once (needed to resolve mock/sectional tasks).
  useEffect(() => {
    let live = true;
    fetch("/quizbank/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => { if (live) setBankIndex(Array.isArray(j) ? j : []); })
      .catch(() => { if (live) setBankIndex([]); });
    return () => { live = false; };
  }, []);

  // On first mount (with the index): if it's a new day OR today has no plan, let
  // the AI rebuild today (folding in whatever was missed) — one call per day, not
  // a mechanical dump of yesterday's tasks. Otherwise just materialize.
  useEffect(() => {
    if (bankIndex === null || rolled.current) { if (bankIndex !== null && !rm) refresh(); return; }
    rolled.current = true;
    (async () => {
      if (isOnboarded()) {
        const today = dayKey();
        const r = getRoadmap();
        const hasToday = !!r.days?.[today]?.tasks?.length;
        const newDay = !!r.lastActiveDay && r.lastActiveDay !== today;
        if (!hasToday || newDay) {
          await autoReplan(newDay ? "✅ Naya din — jo reh gaya tha use bhi plan me daal diya." : null);
        } else {
          materializeToday(bankIndex);
        }
        const r2 = getRoadmap();
        r2.lastActiveDay = today; saveRoadmap(r2);
      }
      setReady(true); refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankIndex]);

  // ---------- generation ----------
  async function generateFull(profile, examDate) {
    setErr(""); setBusy("gen");
    try {
      const seeded = startOnboarding(profile, examDate);
      const total = totalPlanDays(seeded);
      const res = await generateStudyPlan({
        mode: "full", examDate, daysLeft: daysToExam(seeded), totalPlanDays: total,
        fromDayIndex: 1, numDays: Math.min(5, total),
        profile: seeded.profile, catalog: buildCatalog(bankIndex, seeded),
      });
      const r = getRoadmap();
      r.macro = res.macro || [];
      applyGeneratedDays(r, res.days);
      r.lastActiveDay = dayKey();
      r.metrics = { ...(r.metrics || {}), lastReplanAt: new Date().toISOString(), coachNote: res.coachNote || "" };
      saveRoadmap(r);
      materializeToday(bankIndex);
      setReady(true); refresh();
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(""); }
  }

  function recentHistory(r) {
    const today = dayKey();
    return Object.keys(r.days || {})
      .filter((k) => k <= today).sort().slice(-7)
      .map((k) => {
        const day = r.days[k];
        return {
          dayNumber: Math.max(1, Math.round((new Date(k) - new Date(r.startKey)) / 86400000) + 1),
          done: (day.tasks || []).filter((t) => t.done).map((t) => t.title),
          missed: (day.tasks || []).filter((t) => !t.done).map((t) => t.title),
        };
      });
  }

  async function autoReplan(note) {
    setErr(""); setFlash(""); setBusy("replan");
    try {
      const r = getRoadmap();
      const idx = dayIndex(r);
      const total = totalPlanDays(r);
      const numDays = Math.min(5, Math.max(1, total - idx + 1));
      const res = await generateStudyPlan({
        mode: "replan", examDate: r.examDate, daysLeft: daysToExam(r), totalPlanDays: total,
        fromDayIndex: idx, numDays, profile: r.profile, catalog: buildCatalog(bankIndex, r),
        history: recentHistory(r), metrics: r.metrics || {},
      });
      const r2 = getRoadmap();
      if (res.macro && res.macro.length) r2.macro = res.macro;
      applyGeneratedDays(r2, res.days);
      r2.metrics = { ...(r2.metrics || {}), lastReplanAt: new Date().toISOString(), coachNote: res.coachNote || r2.metrics?.coachNote || "" };
      saveRoadmap(r2);
      materializeToday(bankIndex);
      setReady(true); refresh();
      setFlash(note || "✅ Plan update ho gaya.");
      setTimeout(() => setFlash(""), 4000);
    } catch (e) { setErr(e.message || String(e)); setReady(true); refresh(); }
    finally { setBusy(""); }
  }

  // ---------- task actions ----------
  const today = dayKey();
  function launch(task) { const href = taskHref(task, bankIndex, getRoadmap()); if (href) router.push(href); }
  function toggle(task) {
    const nowDone = !task.done;
    setTaskDone(today, task.tid, nowDone);
    materializeToday(bankIndex);
    refresh();
    if (nowDone && (task.kind === "mock" || task.kind === "sectional")) setScoreFor(task);
  }
  function saveScore(task, vals) {
    logMockScore({
      mockId: task.ref?.bankId || "", title: task.ref?.bankTitle || task.title,
      score: Number(vals.score) || 0, max: Number(vals.max) || 200,
      sections: { reasoning: num(vals.reasoning), ga: num(vals.ga), quant: num(vals.quant), english: num(vals.english) },
    });
    setScoreFor(null);
    refresh();
    autoReplan("✅ Score save ho gaya — plan tere naye marks ke hisaab se update kar diya."); // visible re-plan
  }

  if (bankIndex === null || (!rm && !ready)) {
    return <section className="hero"><p className="hero__sub">Loading roadmap…</p></section>;
  }
  const onboarded = isOnboarded();

  return (
    <>
      {!hasGemini && (
        <div className="glass-card" style={{ marginBottom: 12, borderColor: "rgba(251,191,36,.4)" }}>
          ⚠️ AI Roadmap ke liye <strong>Gemini API key</strong> chahiye. <Link href="/settings" className="link">Settings</Link> mein add karo (free: aistudio.google.com/apikey).
        </div>
      )}
      {err && <div className="glass-card" style={{ marginBottom: 12, borderColor: "rgba(251,113,133,.5)" }}>❌ {err}</div>}
      {flash && <div className="glass-card" style={{ marginBottom: 12, borderColor: "rgba(52,211,153,.5)" }}>{flash}</div>}

      {!onboarded
        ? <Intake busy={busy} hasGemini={hasGemini} onGenerate={generateFull} />
        : <Dashboard rm={rm} today={today} busy={busy} launch={launch} toggle={toggle}
            onReplan={() => autoReplan("✅ Naya plan ready.")} showTimeline={showTimeline} setShowTimeline={setShowTimeline}
            onEditProfile={() => { const r = getRoadmap(); r.onboarded = false; saveRoadmap(r); refresh(); }} />}

      {scoreFor && <ScorePrompt task={scoreFor} onSave={saveScore} onCancel={() => setScoreFor(null)} />}
    </>
  );
}

function num(v) { const n = Number(v); return Number.isFinite(n) && v !== "" ? n : null; }

// ---------------- Intake form ----------------
function Intake({ busy, hasGemini, onGenerate }) {
  const [examDate, setExamDate] = useState(plus45());
  const [hoursWeekday, setHwd] = useState(4);
  const [hoursWeekend, setHwe] = useState(6);
  const [studyWindowsText, setWin] = useState("");
  const [offDays, setOff] = useState([]);
  const [weak, setWeak] = useState([]);
  const [strong, setStrong] = useState([]);
  const [vocabDay, setVocabDay] = useState(1);
  const [notes, setNotes] = useState("");

  const toggleIn = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const submit = () => onGenerate({
    hoursWeekday: Number(hoursWeekday) || 0, hoursWeekend: Number(hoursWeekend) || 0,
    studyWindowsText, offDays, weakSubjects: weak, strongSubjects: strong,
    startVocabDay: Number(vocabDay) || 1, notes,
  }, examDate);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">🧠 AI Roadmap</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Tera <span className="grad">45-din ka strict plan</span> banayein?
        </h1>
        <p className="hero__sub">Do-teen cheezein bata — hours aur weak areas. Gemini tera din-ba-din plan banayega aur roz khud adjust karega. Bilkul ek personal teacher ki tarah.</p>
      </section>

      <section className="glass-card">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          <div className="field"><label>📅 Exam date</label>
            <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
          <div className="field"><label>⏱️ Weekday hours</label>
            <input type="number" min="1" max="16" className="input" value={hoursWeekday} onChange={(e) => setHwd(e.target.value)} /></div>
          <div className="field"><label>⏱️ Weekend hours</label>
            <input type="number" min="1" max="16" className="input" value={hoursWeekend} onChange={(e) => setHwe(e.target.value)} /></div>
          <div className="field"><label>🔤 Vocab shuru Day</label>
            <input type="number" min="1" className="input" value={vocabDay} onChange={(e) => setVocabDay(e.target.value)} /></div>
        </div>

        <div className="field"><label>🕒 Kab padh sakte ho? (free text)</label>
          <input className="input" placeholder="e.g. subah 6-9, raat 9-12; office 10-6" value={studyWindowsText} onChange={(e) => setWin(e.target.value)} /></div>

        <div className="field"><label>🚫 Off days (jab nahi padh paoge)</label>
          <div className="chips">{WEEKDAYS.map((d) => (
            <button key={d} type="button" className={`chip chip--btn ${offDays.includes(d) ? "is-active" : ""}`} onClick={() => toggleIn(offDays, setOff, d)}>{d}</button>))}</div></div>

        <div className="field"><label>🔴 Weak subjects (yahan zyada mehnat hogi)</label>
          <div className="chips">{Object.entries(SUBJECTS).map(([k, s]) => (
            <button key={k} type="button" className={`chip chip--btn ${weak.includes(k) ? "is-active" : ""}`} onClick={() => toggleIn(weak, setWeak, k)}>{s.icon} {s.short}</button>))}</div></div>

        <div className="field"><label>🟢 Strong subjects</label>
          <div className="chips">{Object.entries(SUBJECTS).map(([k, s]) => (
            <button key={k} type="button" className={`chip chip--btn ${strong.includes(k) ? "is-active" : ""}`} onClick={() => toggleIn(strong, setStrong, k)}>{s.icon} {s.short}</button>))}</div></div>

        <div className="field"><label>📌 Aur kuch batana hai? (optional)</label>
          <textarea className="textarea" rows={2} placeholder="e.g. Maths me geometry weak hai, English reading slow…" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <button className="btn btn--primary" disabled={!hasGemini || busy === "gen"} onClick={submit}>
          {busy === "gen" ? "🧠 Plan ban raha hai…" : "🚀 Mera 45-din ka plan banao"}
        </button>
      </section>
    </>
  );
}

// ---------------- Coach dashboard ----------------
function Dashboard({ rm, today, busy, launch, toggle, onReplan, onEditProfile, showTimeline, setShowTimeline }) {
  const idx = dayIndex(rm);
  const total = totalPlanDays(rm);
  const left = daysToExam(rm);
  const day = rm.days?.[today];
  const tasks = dedupeTasks(day?.tasks || []);
  const pending = tasks.filter((t) => !t.done);
  const doneToday = tasks.length - pending.length;

  const metrics = useMemo(() => computeMetrics(rm), [rm]);
  const topTid = pending[0]?.tid;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="hero__eyebrow">🧠 AI Roadmap · Day {idx}/{total}</span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn--ghost btn--sm" disabled={busy === "replan"} onClick={onReplan}>{busy === "replan" ? "🔄 Adjusting…" : "🔄 Re-plan"}</button>
            <button className="btn btn--ghost btn--sm" onClick={onEditProfile}>✏️ Profile</button>
            <Link href="/today" className="btn btn--ghost btn--sm">📅 Today</Link>
          </div>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)" }}>
          <span className="grad">{left} din</span> baaki · {day?.theme || "Aaj ka plan"}
        </h1>
        {(day?.coachNote || rm.metrics?.coachNote) && (
          <p className="hero__sub" style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 12 }}>
            👨‍🏫 {day?.coachNote || rm.metrics?.coachNote}
          </p>)}
      </section>

      {/* progress strip */}
      <section className="glass-card" style={{ marginBottom: 12 }}>
        <div className="rm-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
          <Stat label="🔥 Streak" value={`${metrics.streak} din`} />
          <Stat label="📝 Mocks diye" value={`${metrics.mocksDone}`} />
          <Stat label="📊 Avg mock" value={metrics.avgMock != null ? `${metrics.avgMock}%` : "—"} />
          <Stat label="🔤 Vocab day" value={metrics.vocabDay} />
          <Stat label="⏳ Missed" value={`${metrics.missed}`} />
        </div>
        {metrics.avgMock != null && (
          <div style={{ marginTop: 10 }}>
            <div className="row" style={{ gap: 4, alignItems: "flex-end", height: 46 }}>
              {metrics.trend.map((p, i) => (
                <div key={i} title={`${p}%`} style={{ flex: 1, background: "var(--accent)", opacity: 0.35 + 0.65 * (i / Math.max(1, metrics.trend.length - 1)), height: `${Math.max(6, p)}%`, borderRadius: 4 }} />
              ))}
            </div>
            <p className="hint" style={{ marginTop: 4 }}>Mock score trend (recent {metrics.trend.length})</p>
          </div>)}
      </section>

      {/* today's tasks */}
      <section className="section">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>✅ Aaj ka plan <span className="hint">({doneToday}/{tasks.length})</span></h3>
        </div>
        {tasks.length === 0
          ? <div className="glass-card placeholder">Aaj ke liye koi task nahi. <button className="btn btn--sm btn--primary" onClick={onReplan}>Plan banao</button></div>
          : tasks.map((t) => (
            <TaskRow key={t.tid} task={t} isTop={t.tid === topTid} onLaunch={() => launch(t)} onToggle={() => toggle(t)} />))}
      </section>

      {/* macro timeline */}
      {rm.macro?.length > 0 && (
        <section className="section">
          <button className="btn btn--ghost btn--sm" onClick={() => setShowTimeline((v) => !v)}>{showTimeline ? "▲ Chhupao" : "📅 Poora 45-din timeline"}</button>
          {showTimeline && (
            <div className="rm-grid" style={{ marginTop: 10 }}>
              {rm.macro.map((w, i) => (
                <div key={i} className="rm-phase">
                  <h4>{w.weekLabel} · {w.phase}</h4>
                  <p className="hint">{w.focus}{w.targetScore ? ` · 🎯 ${w.targetScore}` : ""}</p>
                </div>))}
            </div>)}
        </section>)}
    </>
  );
}

function Stat({ label, value }) {
  return (<div className="rm-phase" style={{ textAlign: "center" }}>
    <div className="hint" style={{ marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{value}</div>
  </div>);
}

function TaskRow({ task, isTop, onLaunch, onToggle }) {
  return (
    <div className="glass-card" style={{ marginBottom: 8, opacity: task.done ? 0.6 : 1 }}>
      <div className="q-head">
        <div className="q-head__actions">
          <button className={`btn btn--sm ${task.done ? "btn--ghost" : "btn--primary"}`} onClick={onLaunch}>▶ Start</button>
          <button className="btn btn--ghost btn--sm" onClick={onToggle}>{task.done ? "↩ Undo" : "✓ Done"}</button>
        </div>
        <div>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {isTop && <span className="chip chip--sm" style={{ background: "var(--accent)", color: "#fff" }}>#1 abhi</span>}
            <strong style={{ textDecoration: task.done ? "line-through" : "none" }}>{KIND_EMOJI[task.kind] || "•"} {task.title}</strong>
            {task.durationMin ? <span className="hint">· {task.durationMin}m</span> : null}
          </div>
          {task.detail && <p className="hint" style={{ marginTop: 4 }}>{task.detail}</p>}
        </div>
      </div>
    </div>);
}

function ScorePrompt({ task, onSave, onCancel }) {
  const [v, setV] = useState({ score: "", max: 200, reasoning: "", ga: "", quant: "", english: "" });
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()}>
        <h3>📊 {task.ref?.bankTitle || task.title} — score</h3>
        <p className="hint">Kitne marks aaye? (section-wise optional) — AI isse weak sections pe zyada dega.</p>
        <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field"><label>Total score</label><input className="input" type="number" value={v.score} onChange={set("score")} autoFocus /></div>
          <div className="field"><label>Out of</label><input className="input" type="number" value={v.max} onChange={set("max")} /></div>
          <div className="field"><label>Reasoning</label><input className="input" type="number" value={v.reasoning} onChange={set("reasoning")} /></div>
          <div className="field"><label>GA/GK</label><input className="input" type="number" value={v.ga} onChange={set("ga")} /></div>
          <div className="field"><label>Quant</label><input className="input" type="number" value={v.quant} onChange={set("quant")} /></div>
          <div className="field"><label>English</label><input className="input" type="number" value={v.english} onChange={set("english")} /></div>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn btn--primary" onClick={() => onSave(task, v)} disabled={v.score === ""}>💾 Save & adjust plan</button>
          <button className="btn btn--ghost" onClick={onCancel}>Baad me</button>
        </div>
      </div>
    </div>);
}

// ---------------- metrics ----------------
function computeMetrics(rm) {
  const scores = rm.metrics?.mockScores || [];
  const pct = scores.map((s) => Math.round(((Number(s.score) || 0) / (Number(s.max) || 200)) * 100));
  const trend = pct.slice(-8);
  const recent = pct.slice(-3);
  const avgMock = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : null;

  const today = dayKey();
  let missed = 0, vocabDay = rm.profile?.startVocabDay || 1;
  for (const [k, day] of Object.entries(rm.days || {})) {
    for (const t of day.tasks || []) {
      if (k < today && !t.done) missed++;
      if (t.kind === "vocab" && t.done && t.ref?.day) vocabDay = Math.max(vocabDay, t.ref.day);
    }
  }
  // streak: consecutive days up to today where a plan existed and all tasks done
  let streak = 0;
  const keys = Object.keys(rm.days || {}).filter((k) => k <= today).sort().reverse();
  for (const k of keys) {
    const ts = rm.days[k].tasks || [];
    if (ts.length && ts.every((t) => t.done)) streak++;
    else if (k === today) continue; // today still in progress — don't break the streak
    else break;
  }
  return { mocksDone: scores.length, avgMock, trend, missed, vocabDay, streak };
}
