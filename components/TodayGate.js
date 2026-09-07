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
import { buildTodaySet } from "@/lib/todayset";
import { getReviewBucket } from "@/lib/qreview";
import { getTodaySeconds, fmtDuration } from "@/lib/pomodoro";
import { getDaysOverview } from "@/lib/vocab";
import ExtMock from "@/components/ExtMock";

// 🎯 Aaj ka kaam — homepage.
//
// Yahan se hatta nahi. Jaan-boojh kar: exam sar par hai aur sabse bada risaav
// padhai mein nahi, TAALNE mein hai — homepage kholo, notes khol kar baith
// jao, aur jo subject sabse kamzor hai wahi sabse zyada tala jaye.
//
// Isliye do cheezein:
//   • Har subject ka target aur aaj ki ginti, saamne. Ginti kahin nayi nahi
//     banti — quiz submit karte hi lib/qcounter khud badhata hai.
//   • "Aaj ka set" — ek click, aur us subject ka test saamne, chapter khud
//     chune hue aur kamzor chapter ko zyada mauka (lib/todayset). "Kya karun"
//     wala bees minute yahin bach jata hai.
//
// 2026-09-07: shakl "CGL HQ" reference build jaisi — greeting, subject % ke
// card, ek badi "aaj kya karein" hero + quick-stats panel, phir shortcuts.
// Kaam wahi hai jo pehle tha, bas patti-aur-ring ki jagah ab yehi tarteeb.

const TIPS = {
  reasoning: "45 min. Sabse sasta faayda — yahan mehnat seedha marks banti hai.",
  vocab: "30 min. Ek din ka quiz poora karo, ring bhar jayegi.",
  english: "45 min. Error spotting, improvement, cloze.",
  ca: "20 min. Sirf pichhle 6 mahine.",
  math: "15 min timer par, phir 45 min review. ⚡ Skip 10s on rakho.",
  gs: "45 min. Pehle PYQ, phir SIRF galat wale ka note.",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Raat ki mehnat";
  if (h < 12) return "Suprabhat";
  if (h < 17) return "Dopahar ka josh";
  if (h < 21) return "Shaam ki tayyari";
  return "Raat ka session";
}

function SubjectCard({ row, n, busy, onStart, onExt }) {
  const done = row.left === 0;
  return (
    <div className={`glass hcard${done ? " is-done" : ""}`}>
      <div className="hcard__top">
        <span className="hcard__label"><span className="tgate__n">{n}</span> {row.icon} {row.label}</span>
        <span className="hcard__frac">{row.done}/{row.target}</span>
      </div>
      <div className="hcard__pct">{Math.round(row.pct)}<small>%</small></div>
      <div className="hbar"><i style={{ width: `${Math.min(100, row.pct)}%` }} /></div>
      <div className="hcard__acts">
        {/* Vocab aur CA ka koi "set" nahi banta — unke apne page hain, aur
            ginti wahin se apne aap chadhti hai. */}
        {row.task ? (
          <Link href={row.href} className="btn btn--sm btn--primary">▶ Kholo</Link>
        ) : (
          <>
            <button
              className="btn btn--sm btn--primary"
              disabled={!!busy}
              onClick={() => onStart(row.key)}
            >
              {busy === row.key ? "⏳…" : "🎯 Set"}
            </button>
            <Link href={row.href} className="btn btn--ghost btn--sm">Bank</Link>
            {/* Bahar (Testbook/RBE) diya hua test bhi isi ring mein ginta hai —
                warna asli kaam karke bhi darwaza band rehta tha. */}
            <button className="btn btn--ghost btn--sm" onClick={() => onExt(row.key)}>🌐</button>
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
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [exam, setExam] = useState("");
  const [mock, setMock] = useState({ days: null, score: null, n: 0 });
  const [routine, setRoutine] = useState(false);
  const [ext, setExt] = useState("");   // kis subject ka bahar-wala form khula hai
  const [order, setOrderState] = useState(DEFAULT_ORDER);
  const [pending, setPending] = useState(0);
  const [focusSec, setFocusSec] = useState(0);
  const [vocab, setVocab] = useState({ done: 0, total: 0 });

  const refresh = useCallback(() => {
    const p = todayPlan();
    setPlan(p);
    setMock(lastMock());
    setPending(getReviewBucket("wrong").length);
    setFocusSec(getTodaySeconds());
    const days = getDaysOverview();
    setVocab({ done: days.filter((d) => d.done).length, total: days.length });
    onStateChange?.(planDone(p));
  }, [onStateChange]);

  useEffect(() => {
    refresh();
    setDraft(getTargets());
    setExam(getExamDate());
    setOrderState(getOrder());
    // Quiz submit hote hi ginti badalti hai — us page se lautne par turant
    // dikhe, isliye poll bhi aur event bhi.
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
      // Jitna baaki hai utna hi — aadha ho chuka ho to poora 50 dobara dene ka
      // matlab nahi. 25 se zyada ek baithak mein nahi.
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

  if (!plan) return null;
  const done = planDone(plan);
  const next = nextSubject(plan);
  const left = daysLeft();
  const total = plan.reduce((n, r) => n + r.done, 0);
  const need = plan.reduce((n, r) => n + r.target, 0);
  const dateStr = new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long" });
  const mockDue = mock.days == null || mock.days >= 2;

  return (
    <div className="hpage">
      <div className="hgreet">
        <p className="hgreet__kicker">{dateStr}</p>
        <h1 className="hgreet__title">{greeting()}, <em>chalo shuru karein.</em></h1>
        <p className="hgreet__sub">Aaj ka plan, kamzor chapter, aur sab tools — ek hi jagah.</p>
      </div>

      <div className="hstats">
        {plan.map((row, i) => (
          <SubjectCard key={row.key} n={i + 1} row={row} busy={busy} onStart={start} onExt={setExt} />
        ))}
      </div>

      <div className="hhero">
        <div className="glass hhero__main">
          <div className="hhero__glow" />
          <p className="hhero__eyebrow">Aaj kya karein?</p>
          <p className="hhero__head">
            {done
              ? "Aaj ka poora kaam ho gaya. Ab jo mann kare — notes, revision, ya ek full mock."
              : <>Agla banta hai: {next.icon} {next.label} — {next.left} baaki.</>}
          </p>
          <p className="hhero__note">
            Total <b>{total}/{need}</b>{left != null && <> · <b>{left} din</b> bache</>}
          </p>
          <div className="hhero__acts">
            {!done && (
              <button className="btn" disabled={!!busy} onClick={() => start(next.key)}>
                {busy === next.key ? "⏳ ban raha hai…" : `🎯 Aaj ka set — ${next.label}`}
              </button>
            )}
            <Link href="/make-test" className="btn btn--ghost">🧪 Apna test banao</Link>
            <button className="btn btn--ghost" onClick={() => setEditing((v) => !v)}>
              {editing ? "Band karo" : "⚙️ Target"}
            </button>
          </div>
        </div>

        <div className="glass">
          <div className="hquick__top"><span className="hquick__label">📊 Quick stats</span></div>
          <div className="hquick">
            <Link href="/answers?subject=all&src=all" className="htile htile--rose">
              <p className="htile__n">{pending}</p>
              <p className="htile__l">Mistakes pending</p>
            </Link>
            <div className="htile htile--mint">
              <p className="htile__n">{fmtDuration(focusSec)}</p>
              <p className="htile__l">Focus aaj</p>
            </div>
            <Link href="/mock-marks?cat=full" className="htile htile--sky">
              <p className="htile__n">{mock.n}</p>
              <p className="htile__l">Full mocks</p>
            </Link>
            <Link href="/vocab" className="htile htile--violet">
              <p className="htile__n">{vocab.done}/{vocab.total || 0}</p>
              <p className="htile__l">Vocab days</p>
            </Link>
          </div>
        </div>
      </div>

      {editing && (
        <div className="glass hedit">
          {/* Kram aur target ek hi jagah — dono ek hi sawaal ke jawab hain:
              "aaj karna kya hai, aur kitna". ▲▼ sirf DIKHNE ka kram badalta
              hai; koi ring band nahi hoti, kabhi nahi. */}
          <b>Dikhne ka kram (sab hamesha khule hain)</b>
          {order.map((k, i) => (
            <div className="hedit__row" key={k}>
              <span className="tgate__n">{i + 1}</span>
              <span style={{ flex: 1 }}>{SUBJECT_META[k]?.icon} {SUBJECT_META[k]?.label}</span>
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
          <label className="hedit__row">
            Exam ki tareekh
            <input className="input" type="date" value={exam}
              onChange={(e) => setExam(e.target.value)} />
          </label>
          <button
            className="btn btn--sm btn--primary" style={{ alignSelf: "flex-start" }}
            onClick={() => { setTargets(draft); setExamDate(exam); setEditing(false); refresh(); }}
          >
            💾 Save
          </button>
        </div>
      )}

      {ext && (
        <ExtMock
          subject={ext}
          label={SUBJECT_META[ext]?.label || ext}
          icon={SUBJECT_META[ext]?.icon || "🌐"}
          onClose={() => setExt("")}
          onSaved={() => { setExt(""); refresh(); }}
        />
      )}

      {err && <p className="ansp__err">{err}</p>}

      {/* 📊 Mock hi batata hai ki padhai marks mein badal rahi hai ya nahi.
          Do din se zyada ho gaye to ye patti laal ho jati hai. */}
      <div className={`glass hmockbar${mockDue ? " is-due" : ""}`}>
        {mock.n === 0 ? (
          <span>📊 Abhi tak koi full mock darj nahi. Aaj ek do — bina mock ke pata hi nahi chalega ki kya badla.</span>
        ) : (
          <span>
            📊 Aakhri full mock <b>{mock.days === 0 ? "aaj" : `${mock.days} din pehle`}</b>
            {mock.score != null && <> · {mock.score} marks</>}
            {mockDue && <> — <b>aaj ek aur banta hai.</b></>}
          </span>
        )}
        <Link href="/mock-tests" className="btn btn--ghost btn--sm">▶ Mock do</Link>
        <Link href="/mock-marks?cat=full" className="btn btn--ghost btn--sm">✍️ Marks likho</Link>
      </div>

      <div>
        <button className="btn btn--ghost btn--sm" onClick={() => setRoutine((v) => !v)}>
          {routine ? "▲ Routine chhupao" : "▼ Roz ka routine"}
        </button>
        {routine && (
          <ol className="glass hroutine" style={{ marginTop: 10 }}>
            {/* Kram wahi jo upar ki card ka hai — kram badlo to routine bhi
                badal jati hai, warna neeche likha hua upar wale se ulta padha
                jata aur dono par se bharosa uth jata. */}
            {order.map((k) => {
              const row = plan.find((r) => r.key === k);
              return (
                <li key={k}>
                  <b>{row?.label} {row?.target}</b> — {TIPS[k]}
                </li>
              );
            })}
            <li><b>Galat questions</b> — 60 min. Asli padhai yahi hai.</li>
            <li><b>Har doosre din full mock</b> — 60 min + 30 min analysis.</li>
          </ol>
        )}
      </div>

      <div>
        <div className="hsection__head">
          <span className="hsection__title">🧭 Shortcuts</span>
        </div>
        <div className="hshort">
          <Link href="/current-affairs?tab=daily" className="glass hshort__card">
            <span className="hshort__ico" style={{ background: "rgba(16,185,129,.12)", color: "var(--tb-green-dark)" }}>📰</span>
            <p className="hshort__t">Current Affairs</p>
            <p className="hshort__s">Daily dose + quiz</p>
          </Link>
          <Link href="/pyq" className="glass hshort__card">
            <span className="hshort__ico" style={{ background: "rgba(255,178,36,.12)", color: "var(--tb-blue)" }}>🎯</span>
            <p className="hshort__t">PYQ Bank</p>
            <p className="hshort__s">Sab banks ek jagah</p>
          </Link>
          <Link href="/notes/quiz" className="glass hshort__card">
            <span className="hshort__ico" style={{ background: "rgba(125,211,252,.12)", color: "#7dd3fc" }}>📔</span>
            <p className="hshort__t">Notes Library</p>
            <p className="hshort__s">15 books ek jagah</p>
          </Link>
          <Link href="/vocab" className="glass hshort__card">
            <span className="hshort__ico" style={{ background: "rgba(167,139,250,.12)", color: "var(--tb-code)" }}>🔤</span>
            <p className="hshort__t">Vocab Builder</p>
            <p className="hshort__s">Day-wise batches</p>
          </Link>
        </div>
      </div>

      <div className="tgate__links">
        <Link href="/answers?subject=all&src=all" className="btn btn--ghost btn--sm">📖 Galat questions</Link>
        <Link href="/slow" className="btn btn--ghost btn--sm">⏱️ Slow (skip list)</Link>
        <Link href="/mock-marks?cat=full" className="btn btn--ghost btn--sm">📊 Mock marks</Link>
      </div>
    </div>
  );
}
