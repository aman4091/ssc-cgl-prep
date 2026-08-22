"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getReview, removeReview, fixReviewAnswer } from "@/lib/qreview";
import { getDoneSet, toggleDone, pruneDone } from "@/lib/mistakesdone";
import { findCAEntryForQuestion, fixCAAnswer } from "@/lib/feed";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import MathQuestionCard from "@/components/MathQuestionCard";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";
import FixAnswer from "@/components/FixAnswer";

// 🔴 Mistake Notebook — jo galat hua aur jo chhoot gaya, sab yahan.
//
// Shakl ab Answers page wali hai (.ansp): kinare NUMBERED rail, upar stats ki
// patti, subject ke chips, phir ek-ek card. Owner uss page ka aadi hai — teen
// jagah teen alag shakl rakhne se har jagah nayi aadat banani padti hai. Rang
// aur layout app/exam.css ke .ansp rules se aate hain, isliye yahan apna koi
// CSS nahi.
//
// ✅ "Ho gaya" — tick lagate hi question sabse NEECHE chala jata hai aur agla
// bina-tick wala upar aa jata hai (bilkul Answers jaisa). Ye mark site ke apne
// "ho gaya" se ALAG store mein hai (lib/mistakesdone) — wajah wahin likhi hai.
//
// Page ka baaki hissa jaan-boojh kar khaali hai. Pehle yahan bucket ke tabs,
// "Re-attempt all wrong", weak-area tracker, hafte wali strip aur har question
// par Silly/Concept/Time-Laga/Guess ke tag — sab the. Owner ne sab hataane ko
// kaha: notebook padhne ki jagah hai, dashboard nahi.
//
// Data waisa ka waisa hai (lib/qreview): mastered/attempted bucket aur errorType
// ab bhi bharte rehte hain, bas yahan dikhte nahi.

// Subject ka naam wahi rakha jo poore app mein chalta hai (qcounter ke
// COUNTER_SUBJECTS) — question card, counter aur ye page sab ek hi shabd
// samajhte hain. Jinka subject darj hi nahi hua (purane record, ya bina subject
// wala quiz) wo "Other" mein aa jaate hain.
const SUBJECTS = [
  { key: "", label: "📚 Sab" },
  { key: "math", label: "🧮 Maths" },
  { key: "reasoning", label: "🧠 Reasoning" },
  { key: "english", label: "📚 English" },
  { key: "gs", label: "🌍 GS" },
];
const KNOWN = new Set(["math", "reasoning", "english", "gs"]);
const bucketOf = (r) => (KNOWN.has(r.subject) ? r.subject : "other");
const subjectLabel = (k) => SUBJECTS.find((s) => s.key === k)?.label || "📝 Other";

export default function MistakesPage() {
  const [all, setAll] = useState([]);
  const [done, setDone] = useState(() => new Set());
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState("");   // "" = sab

  // Notebook ek GHOOMTA hua katar hai, ghatti hui list nahi.
  //
  // Sabse upar wo question jise sabse zyada der se haath nahi lagaya. Jo abhi
  // kiya (sahi ya galat) uska `at` abhi ka ho jata hai, to wo sabse neeche
  // chala jata hai — aur baaki sab ek-ek khisak kar upar aa jaate hain, isliye
  // wahi question kuch din baad dobara saamne aa jata hai. Naya galat question
  // bhi `at` ke hisaab se sabse neeche hi lagta hai.
  //
  // Sahi kar diya = notebook se HAT gaya. Notebook galtiyon ki hai; jo question
  // ab sahi ho raha hai wo yahan bekaar mein jagah gherta hai. Record mitta
  // nahi — stats aur "mastered" ka hisaab uspar tika hai — bas yahan nahi
  // dikhta. Dobara galat hua to apne aap wapas aa jayega.
  //
  // Kram sirf page khulne par banta hai. Jawab dete hi list dobara chhantti to
  // jo card aap padh rahe ho wahi aankhon ke saamne se khisak jata.
  const refresh = useCallback(() => {
    const rows = getReview()
      .filter((r) => r.everWrong && !r.correct)
      .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
    setAll(rows);
    // Delete ho chuke (ya sahi karke nikal chuke) record ke mark saaf.
    setDone(pruneDone(new Set(rows.map((r) => r.key))));
    setReady(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const counts = useMemo(() => {
    const c = {};
    for (const r of all) c[bucketOf(r)] = (c[bucketOf(r)] || 0) + 1;
    return c;
  }, [all]);

  // Chuna hua subject, aur uske ANDAR: pehle bina-tick wale, phir tick wale.
  // Dono hisson ka apna kram wahi rehta hai jo upar bana tha.
  const items = useMemo(() => {
    const pick = subject ? all.filter((r) => bucketOf(r) === subject) : all;
    return [...pick.filter((r) => !done.has(r.key)), ...pick.filter((r) => done.has(r.key))];
  }, [all, subject, done]);

  const doneCount = items.filter((r) => done.has(r.key)).length;

  // Tick lagate hi card apni jagah se hat kar neeche chala jata hai. List yahin
  // dobara banti hai (useMemo ka `done`), isliye kuch aur karne ki zaroorat
  // nahi.
  const mark = (key) => {
    toggleDone(key);
    setDone(getDoneSet());
  };

  const remove = (key) => {
    if (!confirm("Ye question notebook se hata du?")) return;
    removeReview(key);
    refresh();
  };
  // Galat sanjoya hua answer theek karo: notebook ka record AUR jahan se aaya
  // (Current Affairs entry) dono.
  const fixAnswer = (r, oi) => { fixReviewAnswer(r.key, oi); fixCAAnswer(r.q, oi); refresh(); };
  const isCA = (r) => r.category === "Current Affairs" || /ca|current/i.test(String(r.source || ""));

  return (
    <div className="ansp">
      {items.length > 0 && (
        <nav className="ansp__side">
          {items.map((r, i) => (
            <a key={r.key} href={`#mq-${i + 1}`} className={done.has(r.key) ? "is-done" : ""}>
              {i + 1}
            </a>
          ))}
        </nav>
      )}

      <div className="ansp__main">
        <div className="ansp__stats">
          <span className="tot">📊 Total: {items.length}</span>
          <span className="did">✅ Ho gaye: {doneCount}</span>
          <span className="left">⏳ Baaki: {items.length - doneCount}</span>
        </div>

        <h1>🔴 Galat questions</h1>

        <p className="ansp__hint" style={{ display: "block", marginBottom: 10 }}>
          Galat aur chhoda hua question apne aap yahan aata hai. Sahi kar do to nikal
          jata hai. ✅ Ho gaya lagate hi wo sabse neeche chala jata hai.
        </p>

        <div className="ansp__chips">
          {SUBJECTS.map((s) => (
            <a
              key={s.key || "all"}
              href="#"
              onClick={(e) => { e.preventDefault(); setSubject(s.key); }}
              className={s.key === subject ? "is-active" : ""}
            >
              {s.label}{s.key ? ` (${counts[s.key] || 0})` : ` (${all.length})`}
            </a>
          ))}
          {counts.other > 0 && (
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setSubject("other"); }}
              className={subject === "other" ? "is-active" : ""}
            >
              📝 Other ({counts.other})
            </a>
          )}
        </div>

        <div className="ansp__acts ansp__acts--top">
          <span className="ansp__hint">Notebook ghoomta hai — jise sabse der se haath nahi lagaya wo sabse upar.</span>
          <Link href="/answers" className="ansp__btn">📖 Answers</Link>
          <Link href="/slow" className="ansp__btn">⏱️ Slow Questions</Link>
          <Link href="/gemini" className="ansp__btn">✨ Gemini Answers</Link>
        </div>

        {!ready ? (
          <p className="ansp__empty">Khul raha hai…</p>
        ) : items.length === 0 ? (
          <p className="ansp__empty">
            {all.length
              ? "Is chhaanti mein kuch nahi."
              : "Abhi koi galti nahi — bahut badhiya. Koi test do, galat ya chhoda hua question apne aap yahan aa jayega."}
          </p>
        ) : (
          items.map((r, i) => {
            const caEntry = isCA(r) ? findCAEntryForQuestion(r.q) : null;
            const on = done.has(r.key);
            return (
              <div key={r.key} id={`mq-${i + 1}`} className={`ansp__card${on ? " is-done" : ""}`}>
                <h2>
                  {on ? "✅ " : ""}Question {i + 1}
                  <span className="ansp__qid">
                    {" · "}{subjectLabel(bucketOf(r))}{r.category ? ` · ${r.category}` : ""}
                    {r.sec > 0 ? ` · ⏱ ${r.sec}s` : ""}
                  </span>
                </h2>

                <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 14px 8px" }}>
                  {caEntry && (
                    <Link href={`/current-affairs/${caEntry.id}`} className="link">📅 {caEntry.date}</Link>
                  )}
                  {isCA(r) && !caEntry && (
                    <span className="ansp__hint" title="Ye question ab kisi date entry mein nahi mila">📅 date not found</span>
                  )}
                  {/* Book ki key hi galat ho to yahin se theek — ye tag nahi,
                      marammat ka auzaar hai, isliye bacha hua hai. */}
                  <FixAnswer q={r.q} onFix={(oi) => fixAnswer(r, oi)} />
                </div>

                {/* Question apne ASLI card mein. Maths/Reasoning ka sawaal
                    tasveer mein hota hai; use aam text card mein kholne se sirf
                    "[id] qText" dikhta aur asli sawaal gayab reh jata hai.
                    archiveOnAnswer se yahan diya hua jawab notebook mein wapas
                    darj hota hai — usi se `at` naya hota hai aur question agli
                    baar sabse neeche milta hai. */}
                {r.q?.qImg && Array.isArray(r.q?.optImgs) ? (
                  bucketOf(r) === "reasoning" ? (
                    <ReasonQuestionCard q={r.q} index={0} subject="reasoning" chapterName={r.category} />
                  ) : (
                    <MathQuestionCard q={r.q} index={0} subject="math" chapterName={r.category} />
                  )
                ) : (
                  <PyqQuestionCard
                    q={r.q}
                    index={0}
                    subject={r.subject}
                    chapterName={r.category}
                    archiveOnAnswer
                  />
                )}

                <div className="ansp__acts">
                  <label className="ansp__mark">
                    <input type="checkbox" checked={on} onChange={() => mark(r.key)} />
                    Ho gaya
                  </label>
                  <button className="ansp__btn" onClick={() => remove(r.key)}>🗑️ Hatao</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
