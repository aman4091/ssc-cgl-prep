"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  todayPlan, planDone, nextSubject, getTargets, setTargets,
  getExamDate, setExamDate, daysLeft, SUBJECT_META,
  getOrder, setOrder, moveSubject, DEFAULT_ORDER,
  lastMock,
} from "@/lib/daily";
import { buildTodaySet, buildAutoPractice } from "@/lib/todayset";
import { getReviewBucket, getWeakAreas } from "@/lib/qreview";
import ExtMock from "@/components/ExtMock";

// 🎯 Aaj ka kaam — homepage.
//
// Yahan se hatta nahi. Jaan-boojh kar: exam sar par hai aur sabse bada risaav
// padhai mein nahi, TAALNE mein hai — homepage kholo, notes khol kar baith
// jao, aur jo subject sabse kamzor hai wahi sabse zyada tala jaye.
//
// 2026-09-08: shakl "Fieldnotes" (arena 9) jaisi — page-head, phir ek
// hero-grid: baayen ek gehra-hara "daily-card" (aaj ka overall target +
// subject-wise progress rows), daayen exam-countdown + "quick snapshot"
// (turant asli aankde), phir neeche routine + quick-links panel. Kaam wahi
// hai jo pehle tha, bas ab isi card/grid bhasha mein.

const TIPS = {
  reasoning: "45 min. Sabse sasta faayda — yahan mehnat seedha marks banti hai.",
  vocab: "30 min. Ek din ka quiz poora karo, ring bhar jayegi.",
  english: "45 min. Error spotting, improvement, cloze.",
  ca: "20 min. Sirf pichhle 6 mahine.",
  math: "15 min timer par, phir 45 min review. ⚡ Skip 10s on rakho.",
  gs: "45 min. Pehle PYQ, phir SIRF galat wale ka note.",
};

function SubjectRow({ row, busy, onStart, onExt }) {
  const done = row.left === 0;
  return (
    <div className="subject-row">
      <div className="subject-icon">{row.icon}</div>
      <div className="subject-row-body">
        <strong>{row.label}</strong>
        <span>{row.done}/{row.target} done{done ? " · ✅" : ` · ${row.left} baaki`}</span>
      </div>
      <div className="subject-row-acts">
        {row.task ? (
          <Link href={row.href} className="btn btn--sm">▶ Kholo</Link>
        ) : (
          <>
            <button className="btn btn--sm btn--primary" disabled={!!busy} onClick={() => onStart(row.key)}>
              {busy === row.key ? "⏳…" : "🎯 Set"}
            </button>
            <Link href={row.href} className="btn btn--sm">Bank</Link>
            <button className="btn btn--sm" onClick={() => onExt(row.key)}>🌐</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TodayGate({ onStateChange }) {
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState("");
  const [autoBusy, setAutoBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [exam, setExam] = useState("");
  const [mock, setMock] = useState({ days: null, score: null, n: 0 });
  const [routine, setRoutine] = useState(false);
  const [ext, setExt] = useState("");   // kis subject ka bahar-wala form khula hai
  const [order, setOrderState] = useState(DEFAULT_ORDER);

  const refresh = useCallback(() => {
    const p = todayPlan();
    setPlan(p);
    setMock(lastMock());
    onStateChange?.(planDone(p));
  }, [onStateChange]);

  useEffect(() => {
    refresh();
    setDraft(getTargets());
    setExam(getExamDate());
    setOrderState(getOrder());
    const id = setInterval(refresh, 4000);
    window.addEventListener("cgl:daily-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("cgl:daily-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const start = async (subject) => {
    setErr(""); setBusy(subject);
    try {
      const row = (plan || []).find((r) => r.key === subject);
      const n = Math.min(25, Math.max(10, row?.left || 25));
      const made = await buildTodaySet(subject, n);
      if (!made) { setErr("Is subject ka bank nahi mila."); return; }
      router.push(`/quizzes/${made.id}`);
    } catch (e) {
      setErr(e.message || "Set nahi ban paya.");
    } finally {
      setBusy("");
    }
  };

  const runAutoPractice = async () => {
    setErr(""); setAutoBusy(true);
    try {
      const made = await buildAutoPractice(10);
      if (!made) { setErr("Mixed set nahi ban paya."); return; }
      router.push(`/quizzes/${made.id}`);
    } catch (e) {
      setErr(e.message || "Set nahi ban paya.");
    } finally {
      setAutoBusy(false);
    }
  };

  if (!plan) return null;
  const done = planDone(plan);
  const next = nextSubject(plan);
  const left = daysLeft();
  const total = plan.reduce((n, r) => n + r.done, 0);
  const need = plan.reduce((n, r) => n + r.target, 0);
  const pct = need ? Math.min(100, Math.round((total / need) * 100)) : 0;
  const mockDue = mock.days == null || mock.days >= 2;
  const pendingMistakes = getReviewBucket("wrong").length;
  const weakest = getWeakAreas()[0];
  const dateStr = new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="hpage">
      <div className="page-head">
        <div>
          <p className="eyebrow">{dateStr}</p>
          <h1>{done ? "Aaj ka poora kaam ho gaya." : `Agla banta hai: ${next.icon} ${next.label}`}</h1>
          <p>SSC CGL Tier-1 ki taiyari, ek hi jagah.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn--ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Band karo" : "⚙️ Target"}
          </button>
          <button className="btn btn--primary" disabled={autoBusy} onClick={runAutoPractice}>
            {autoBusy ? "⏳ ban raha hai…" : "⚡ Mixed set banao"}
          </button>
        </div>
      </div>

      {mockDue && (
        <div className="priority-strip mock-banner">
          <span>📊</span>
          <div>
            <small>Mock check</small>
            <strong>
              {mock.n === 0
                ? "Abhi tak koi full mock darj nahi — aaj ek do."
                : `Aakhri full mock ${mock.days === 0 ? "aaj" : `${mock.days} din pehle`} — aaj ek aur banta hai.`}
            </strong>
          </div>
          <Link href="/mock-tests" className="btn btn--sm">▶ Mock do</Link>
        </div>
      )}

      {editing && (
        <div className="panel">
          <div className="card-title-row">
            <div><span className="section-kicker">Target aur kram</span><h2>Roz ka target set karo</h2></div>
          </div>
          <div className="hedit" style={{ marginTop: 16 }}>
            {order.map((k, i) => (
              <div className="hedit__row" key={k}>
                <span style={{ minWidth: 18 }}>{i + 1}.</span>
                <span style={{ minWidth: 130 }}>{SUBJECT_META[k]?.icon} {SUBJECT_META[k]?.label}</span>
                <input
                  className="input" type="number" min="0" max="500"
                  value={draft[k] ?? 0}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                />
                <button className="btn btn--ghost btn--sm" disabled={i === 0}
                  onClick={() => setOrderState(moveSubject(k, -1))} title="Upar">▲</button>
                <button className="btn btn--ghost btn--sm" disabled={i === order.length - 1}
                  onClick={() => setOrderState(moveSubject(k, +1))} title="Neeche">▼</button>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start" }}
              onClick={() => setOrderState(setOrder(DEFAULT_ORDER))}>
              ↺ Sujhaya hua kram wapas
            </button>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--tb-dim)" }}>
              Exam ki tareekh
              <input className="input" type="date" value={exam} onChange={(e) => setExam(e.target.value)} style={{ maxWidth: 200 }} />
            </label>
            <button className="btn btn--sm btn--primary" style={{ alignSelf: "flex-start" }}
              onClick={() => { setTargets(draft); setExamDate(exam); setEditing(false); refresh(); }}>
              💾 Save
            </button>
          </div>
        </div>
      )}

      {err && <p className="ansp__err">{err}</p>}

      <section className="hero-grid">
        <article className="daily-card">
          <div className="daily-top">
            <div>
              <span className="section-kicker">Aaj ka target</span>
              <div className="target-number"><strong>{total}</strong><span>/ {need} questions</span></div>
            </div>
            <div className="ring" style={{ borderTopColor: pct >= 100 ? "#eeb964" : undefined }}><span>{pct}%</span></div>
          </div>
          <div className="daily-progress"><i style={{ width: `${pct}%` }} /></div>
          <div className="subject-progress">
            {plan.map((row) => (
              <SubjectRow key={row.key} row={row} busy={busy} onStart={start} onExt={setExt} />
            ))}
          </div>
          <p className="card-footnote">🎯 Kamzor chapter ko zyada mauka milta hai.</p>
        </article>

        <div className="dashboard-stack">
          <article className="streak-card">
            <div className="streak-icon">⏳</div>
            <div>
              <span>Exam tak</span>
              <strong>{left != null ? `${left} din bache` : "Tareekh set nahi"}</strong>
              <small>{left != null ? "Roz ka target isi hisaab se hai" : "⚙️ Target mein exam date daalo"}</small>
            </div>
          </article>
          <article className="summary-card">
            <div className="card-title-row">
              <div><span className="section-kicker">Turant jhalak</span><h2>Tumhari taiyari</h2></div>
              <Link href="/mock-marks?cat=full">Sab dekho →</Link>
            </div>
            <div className="summary-stats">
              <div>
                <span>Pending galtiyan</span>
                <strong>{pendingMistakes}</strong>
                <Link href="/answers?subject=all&src=all">Review karo</Link>
              </div>
              <div>
                <span>Aakhri mock</span>
                <strong>{mock.score != null ? mock.score : "—"}</strong>
                <Link href="/mock-marks?cat=full">{mock.n === 0 ? "Pehla darj karo" : "Vishleshan dekho"}</Link>
              </div>
              <div>
                <span>Sabse kamzor</span>
                <strong style={{ fontSize: "1rem" }}>{weakest?.category || "—"}</strong>
                <Link href="/answers?subject=all&src=all">Dekho</Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      {ext && (
        <ExtMock
          subject={ext}
          label={SUBJECT_META[ext]?.label || ext}
          icon={SUBJECT_META[ext]?.icon || "🌐"}
          onClose={() => setExt("")}
          onSaved={() => { setExt(""); refresh(); }}
        />
      )}

      <section className="lower-grid">
        <article className="panel">
          <div className="card-title-row">
            <div><span className="section-kicker">Daily habit</span><h2>Roz ka routine</h2></div>
            <button className="hmore" onClick={() => setRoutine((v) => !v)}>{routine ? "▲ Chhupao" : "▼ Dikhao"}</button>
          </div>
          {routine && (
            <ol className="hroutine" style={{ marginTop: 14 }}>
              {order.map((k) => {
                const row = plan.find((r) => r.key === k);
                return (
                  <li key={k}><b>{row?.label} {row?.target}</b> — {TIPS[k]}</li>
                );
              })}
              <li><b>Galat questions</b> — 60 min. Asli padhai yahi hai.</li>
              <li><b>Har doosre din full mock</b> — 60 min + 30 min analysis.</li>
            </ol>
          )}
        </article>
        <article className="panel compact">
          <div className="card-title-row">
            <div><span className="section-kicker">Turant links</span><h2>Kahin bhi jao</h2></div>
          </div>
          <div className="quick-links" style={{ marginTop: 14 }}>
            <Link href="/make-test" className="btn btn--ghost btn--sm">🧪 Apna test banao</Link>
            <Link href="/answers?subject=all&src=all" className="btn btn--ghost btn--sm">📖 Galat questions</Link>
            <Link href="/slow" className="btn btn--ghost btn--sm">⏱️ Slow (skip list)</Link>
            <Link href="/mock-marks?cat=full" className="btn btn--ghost btn--sm">📊 Mock marks</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
