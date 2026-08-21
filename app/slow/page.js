"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSlow, removeSlow, SLOW_SEC } from "@/lib/qslow";
import { saveQuiz, makeId } from "@/lib/storage";
import PyqQuestionCard from "@/components/PyqQuestionCard";

// ⏱️ Time khaane wale questions — Maths + Reasoning.
//
// Ek hi shart se list banti hai: is question par 60 second se ZYADA laga.
// Sahi kiya, galat kiya, ya dekh kar chhod diya — teeno yahin aate hain,
// kyunki nuksaan teeno mein ek jaisa hua. Mistake Notebook galtiyon ka hai;
// ye page raftaar ka.
//
// Shakl jaan-boojh kar Answers page wali hai (.ansp): kinare numbered rail,
// upar stats ki patti, phir chips, phir ek-ek card. Owner uss page ka aadi
// hai — nayi jagah par nayi aadat banwana bekaar ka kharch hai. Rang aur
// layout dono app/exam.css ke .ansp rules se aate hain, isliye yahan apna
// koi CSS nahi.
//
// Data lib/qslow se. Jab wahi question dobara 60 ke ANDAR ho jata hai to
// record mitta nahi — `fixed` lag jata hai aur wo "✅ Tez ho gaye" mein chala
// jata hai. Wahi is page ka asli nateeja hai: list ka ghatna.

const SUBJECTS = [
  { key: "", label: "📚 Dono" },
  { key: "math", label: "🧮 Maths" },
  { key: "reasoning", label: "🧠 Reasoning" },
];
const subjectLabel = (k) => (k === "reasoning" ? "🧠 Reasoning" : "🧮 Maths");

// Sahi/galat/chhoda — ek nazar mein. Rang .ansp ke apne hain (tally wale
// class dobara istemaal ho rahe hain), isliye dark/light dono mein chalte hain.
const OUTCOME = {
  right: { label: "✅ Sahi kiya", cls: "tally tally--ans" },
  wrong: { label: "❌ Galat", cls: "tally tally--bad" },
  skip: { label: "⏭️ Chhoda", cls: "tally tally--not" },
};

const mmss = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

// Practice quiz sirf usi question ka ban sakta hai jiski key hai aur jiske
// paas asli options hain — tasveer wale bank ka "a/b/c/d" wala roop quiz mein
// bekaar hai (wahan option tasveer hote hain).
const practiceable = (r) =>
  typeof r?.q?.answer === "number" && Array.isArray(r?.q?.options) && r.q.options.length >= 2;

export default function SlowPage() {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState("");
  const [showFixed, setShowFixed] = useState(false);

  // Kram sirf page khulne par banta hai — sabse zyada waqt khaane wala sabse
  // upar. Wahi is list ka matlab hai: pehle wo theek karo jo sabse mehnga hai.
  const refresh = () => {
    setAll([...getSlow()].sort((a, b) => (b.sec || 0) - (a.sec || 0)));
    setReady(true);
  };
  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("cgl:qslow-changed", h);
    return () => window.removeEventListener("cgl:qslow-changed", h);
  }, []);

  const slow = useMemo(() => all.filter((r) => !r.fixed), [all]);
  const fixed = useMemo(() => all.filter((r) => r.fixed), [all]);
  const pool = showFixed ? fixed : slow;
  const list = useMemo(
    () => (subject ? pool.filter((r) => r.subject === subject) : pool),
    [pool, subject],
  );

  const counts = useMemo(() => {
    const c = { math: 0, reasoning: 0 };
    for (const r of pool) if (c[r.subject] !== undefined) c[r.subject] += 1;
    return c;
  }, [pool]);

  const worst = list.reduce((m, r) => Math.max(m, r.sec || 0), 0);
  // Kitna waqt in questions ne kul milakar khaya — "12 question" se zyada baat
  // "18 minute" karta hai.
  const totalSec = list.reduce((s, r) => s + (r.sec || 0), 0);

  const remove = (key) => { removeSlow(key); refresh(); };

  const practice = () => {
    const qs = list.filter(practiceable).map((r) => r.q);
    if (!qs.length) return;
    const quiz = {
      id: makeId(),
      title: `⏱️ Slow · ${subject ? subjectLabel(subject) : "Maths + Reasoning"}`,
      subject: subject || "math",
      // "review" = dobara-attempt. Isse Mistake Notebook mein naya record nahi
      // banta (lib/qreview ka onlyExisting) — ye set galtiyon ka nahi, raftaar
      // ka hai, aur ise dena notebook bharne ki wajah nahi honi chahiye.
      source: "review",
      createdAt: new Date().toISOString(),
      questions: qs,
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  return (
    <div className="ansp">
      {list.length > 0 && (
        <nav className="ansp__side">
          {list.map((r, i) => (
            <a key={r.key} href={`#slow-${i + 1}`} className={r.fixed ? "is-done" : ""}>
              {i + 1}
            </a>
          ))}
        </nav>
      )}

      <div className="ansp__main">
        <div className="ansp__stats">
          <span className="tot">📊 Total: {list.length}</span>
          <span className="left">⏱ Sabse zyada: {worst ? mmss(worst) : "—"}</span>
          <span className="did">✅ Tez ho gaye: {fixed.length}</span>
        </div>

        <h1>⏱️ Time khaane wale questions</h1>

        <p className="ansp__hint" style={{ display: "block", marginBottom: 10 }}>
          Maths aur Reasoning ka jo bhi question <b>{SLOW_SEC} second se zyada</b> le gaya — sahi,
          galat ya chhoda hua — wo apne aap yahan aa jata hai. Dobara {SLOW_SEC}s ke andar kar do,
          to wo &quot;Tez ho gaye&quot; mein chala jata hai.
        </p>

        <div className="ansp__chips">
          {SUBJECTS.map((s) => (
            <a
              key={s.key || "both"}
              href="#"
              onClick={(e) => { e.preventDefault(); setSubject(s.key); }}
              className={s.key === subject ? "is-active" : ""}
            >
              {s.label}
              {s.key ? ` (${counts[s.key] || 0})` : ` (${pool.length})`}
            </a>
          ))}
        </div>

        <div className="ansp__acts ansp__acts--top">
          <span className="ansp__hint">
            {totalSec > 0
              ? `⌛ Inhone milakar ${mmss(totalSec)} khaye`
              : "Koi test do — slow question apne aap yahan aa jayega"}
          </span>
          <button
            className="ansp__btn"
            onClick={() => setShowFixed((v) => !v)}
            title="Wo question jo ab 60s ke andar ho jate hain"
          >
            {showFixed ? `⏱️ Abhi bhi slow (${slow.length})` : `✅ Tez ho gaye (${fixed.length})`}
          </button>
          {list.filter(practiceable).length > 0 && (
            <button className="ansp__btn ansp__btn--go" onClick={practice}>
              🎯 Practice ({list.filter(practiceable).length})
            </button>
          )}
          <Link href="/mistakes" className="ansp__btn">🔴 Mistake Notebook</Link>
        </div>

        {!ready ? (
          <p className="ansp__empty">Khul raha hai…</p>
        ) : list.length === 0 ? (
          <p className="ansp__empty">
            {showFixed
              ? "Abhi tak koi slow question tez nahi hua."
              : `Yahan abhi kuch nahi — matlab Maths/Reasoning ka koi question ${SLOW_SEC}s se upar nahi gaya. 👏`}
          </p>
        ) : (
          list.map((r, i) => (
            <div key={r.key} id={`slow-${i + 1}`} className="ansp__card">
              <h2>
                #{i + 1} · ⏱ {mmss(r.sec || 0)}
                <span className="ansp__qid">
                  {" "}· {subjectLabel(r.subject)}
                  {r.category ? ` · ${r.category}` : ""}
                </span>
              </h2>

              <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center", margin: "0 14px 8px" }}>
                <span className={(OUTCOME[r.outcome] || OUTCOME.skip).cls}>
                  {(OUTCOME[r.outcome] || OUTCOME.skip).label}
                </span>
                {/* Ek hi question baar-baar 60 paar kare to wo "thoda dheela"
                    nahi hai — wahan concept hi nahi baitha. Isliye ginti. */}
                {r.hits > 1 && (
                  <span className="tally tally--rev" title="Itni baar 60s se upar gaya">
                    🔁 {r.hits} baar
                  </span>
                )}
                {r.fixed && (
                  <span className="tally tally--ans" title="Ab 60s ke andar ho jata hai">
                    ✅ Ab {mmss(r.sec || 0)}
                  </span>
                )}
                {r.worstSec > (r.sec || 0) && (
                  <span className="ansp__hint" title="Sabse bura kitna tha">
                    pehle {mmss(r.worstSec)} laga tha
                  </span>
                )}
              </div>

              <PyqQuestionCard
                q={r.q}
                index={0}
                subject={r.subject}
                chapterName={r.category}
                onDelete={() => remove(r.key)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
