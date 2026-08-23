"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  todayPlan, planDone, nextSubject, getTargets, setTargets,
  getExamDate, setExamDate, daysLeft, SUBJECT_ORDER,
} from "@/lib/daily";
import { buildTodaySet } from "@/lib/todayset";

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

function Ring({ row, busy, onStart }) {
  const done = row.left === 0;
  return (
    <div className={`tgate__card${done ? " is-done" : ""}`}>
      <div className="tgate__ring" style={{ "--pct": row.pct }}>
        <span>{row.icon}</span>
      </div>
      <div className="tgate__meta">
        <b>{row.label}</b>
        <span className="tgate__num">
          {row.done} / {row.target}
          {done ? " ✅" : ` · ${row.left} baaki`}
        </span>
      </div>
      <div className="tgate__acts">
        <button
          className="btn btn--sm btn--primary"
          disabled={!!busy}
          onClick={() => onStart(row.key)}
        >
          {busy === row.key ? "⏳ ban raha hai…" : "🎯 Aaj ka set"}
        </button>
        <Link href={row.href} className="btn btn--ghost btn--sm">Bank</Link>
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

  const refresh = useCallback(() => {
    const p = todayPlan();
    setPlan(p);
    onStateChange?.(planDone(p));
  }, [onStateChange]);

  useEffect(() => {
    refresh();
    setDraft(getTargets());
    setExam(getExamDate());
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
          Abhi shuru karo: <b>{next.icon} {next.label}</b> — {next.left} question baaki.
        </p>
      )}

      {editing && (
        <div className="tgate__edit">
          {SUBJECT_ORDER.map((k) => (
            <label key={k}>
              {plan.find((r) => r.key === k)?.label}
              <input
                className="input" type="number" min="0" max="500"
                value={draft[k] ?? 0}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </label>
          ))}
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
        {plan.map((row) => (
          <Ring key={row.key} row={row} busy={busy} onStart={start} />
        ))}
      </div>

      {err && <p className="ansp__err">{err}</p>}

      <div className="tgate__links">
        <Link href="/answers?subject=all&src=all" className="btn btn--ghost btn--sm">📖 Galat questions</Link>
        <Link href="/slow" className="btn btn--ghost btn--sm">⏱️ Slow (skip list)</Link>
        <Link href="/mock-marks?cat=full" className="btn btn--ghost btn--sm">📊 Mock marks</Link>
      </div>
    </section>
  );
}
