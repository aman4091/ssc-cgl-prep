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
import ExtMock from "@/components/ExtMock";

// 🎯 Aaj ka kaam — homepage ki sabse upar wali patti.
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
// Roz ka kaam poora hone tak neeche ka feed band rehta hai (HomeFeed dekhta
// hai). Band = padhai band nahi: har ring se seedha us subject ka kaam khulta
// hai, aur menu bhi waise ka waisa hai. Sirf "bina soche browse karna" band
// hota hai.

// Har subject ka ek line ka mashwara — routine mein isi kram se lagta hai
// jis kram mein ring hain.
const TIPS = {
  reasoning: "45 min. Sabse sasta faayda — yahan mehnat seedha marks banti hai.",
  vocab: "30 min. Ek din ka quiz poora karo, ring bhar jayegi.",
  english: "45 min. Error spotting, improvement, cloze.",
  ca: "20 min. Sirf pichhle 6 mahine.",
  math: "15 min timer par, phir 45 min review. ⚡ Skip 10s on rakho.",
  gs: "45 min. Pehle PYQ, phir SIRF galat wale ka note.",
};

function Ring({ row, n, busy, onStart, onExt }) {
  const done = row.left === 0;
  return (
    <div className={`tgate__card${done ? " is-done" : ""}`}>
      <div className="tgate__ring" style={{ "--pct": row.pct }}>
        <span>{row.icon}</span>
      </div>
      <div className="tgate__meta">
        <b><span className="tgate__n">{n}</span> {row.label}</b>
        <span className="tgate__num">
          {row.done} / {row.target}
          {done ? " ✅" : ` · ${row.left} baaki`}
        </span>
      </div>
      <div className="tgate__acts">
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
              {busy === row.key ? "⏳ ban raha hai…" : "🎯 Aaj ka set"}
            </button>
            <Link href={row.href} className="btn btn--ghost btn--sm">Bank</Link>
            {/* Bahar (Testbook/RBE) diya hua test bhi isi ring mein ginta hai —
                warna asli kaam karke bhi darwaza band rehta tha. */}
            <button className="btn btn--ghost btn--sm" onClick={() => onExt(row.key)}>🌐 Bahar</button>
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

  return (
    <section className="tgate">
      <div className="tgate__top">
        <h2>🎯 Aaj ka kaam</h2>
        <span className="tgate__sum">
          {total}/{need}
          {left != null && <> · <b>{left} din</b> bache</>}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={() => setEditing((v) => !v)}>
          {editing ? "Band karo" : "⚙️ Target"}
        </button>
      </div>

      {done ? (
        <p className="tgate__msg tgate__msg--ok">
          ✅ Aaj ka poora kaam ho gaya. Ab jo mann kare — notes, revision, ya ek full mock.
        </p>
      ) : (
        <p className="tgate__msg">
          Agla banta hai: <b>{next.icon} {next.label}</b> — {next.left} baaki.
          {" "}Par jo aaj karna ho wahi karo — sab khule hain.
        </p>
      )}

      {editing && (
        <div className="tgate__edit">
          {/* Kram aur target ek hi jagah — dono ek hi sawaal ke jawab hain:
              "aaj karna kya hai, aur kitna". ▲▼ sirf DIKHNE ka kram badalta
              hai; koi ring band nahi hoti, kabhi nahi. */}
          <div className="tgate__ord">
            <b>Dikhne ka kram (sab hamesha khule hain)</b>
            {order.map((k, i) => (
              <div className="tgate__ordrow" key={k}>
                <span className="tgate__n">{i + 1}</span>
                <span className="tgate__ordname">
                  {SUBJECT_META[k]?.icon} {SUBJECT_META[k]?.label}
                </span>
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
            <button className="btn btn--ghost btn--sm"
              onClick={() => setOrderState(setOrder(DEFAULT_ORDER))}>
              ↺ Sujhaya hua kram wapas
            </button>
          </div>
          <label>
            Exam ki tareekh
            <input className="input" type="date" value={exam}
              onChange={(e) => setExam(e.target.value)} />
          </label>
          <button
            className="btn btn--sm btn--primary"
            onClick={() => { setTargets(draft); setExamDate(exam); setEditing(false); refresh(); }}
          >
            💾 Save
          </button>
        </div>
      )}

      <div className="tgate__grid">
        {plan.map((row, i) => (
          <Ring key={row.key} n={i + 1} row={row} busy={busy}
            onStart={start} onExt={setExt} />
        ))}
      </div>

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
      <div className={`tgate__mock${mock.days == null || mock.days >= 2 ? " is-due" : ""}`}>
        {mock.n === 0 ? (
          <span>📊 Abhi tak koi full mock darj nahi. Aaj ek do — bina mock ke pata hi nahi chalega ki kya badla.</span>
        ) : (
          <span>
            📊 Aakhri full mock <b>{mock.days === 0 ? "aaj" : `${mock.days} din pehle`}</b>
            {mock.score != null && <> · {mock.score} marks</>}
            {mock.days >= 2 && <> — <b>aaj ek aur banta hai.</b></>}
          </span>
        )}
        <Link href="/mock-tests" className="btn btn--ghost btn--sm">▶ Mock do</Link>
        <Link href="/mock-marks?cat=full" className="btn btn--ghost btn--sm">✍️ Marks likho</Link>
      </div>

      <button className="tgate__more" onClick={() => setRoutine((v) => !v)}>
        {routine ? "▲ Routine chhupao" : "▼ Roz ka routine"}
      </button>
      {routine && (
        <ol className="tgate__routine">
          {/* Kram wahi jo upar ki ring ka hai — kram badlo to routine bhi
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

      <div className="tgate__links">
        {/* Ring wala "Aaj ka set" chapter khud chunta hai. Jab aaj ka padha hua
            pata HO (Trigonometry + Biology), tab ye — chapter aur ginti dono
            apni marzi ke. */}
        <Link href="/make-test" className="btn btn--ghost btn--sm">🧪 Apna test banao</Link>
        <Link href="/answers?subject=all&src=all" className="btn btn--ghost btn--sm">📖 Galat questions</Link>
        <Link href="/slow" className="btn btn--ghost btn--sm">⏱️ Slow (skip list)</Link>
        <Link href="/mock-marks?cat=full" className="btn btn--ghost btn--sm">📊 Mock marks</Link>
      </div>
    </section>
  );
}
