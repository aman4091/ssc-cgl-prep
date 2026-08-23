"use client";

import Link from "next/link";
import { findCAEntryForQuestion } from "@/lib/feed";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import MathQuestionCard from "@/components/MathQuestionCard";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";
import FixAnswer from "@/components/FixAnswer";

// 📝 Quiz/PYQ mein jo galat hua — uska card.
//
// Pehle ye app/mistakes ke andar hi likha tha. Ab Answers page dono shelf
// dikhata hai (screenshot wale mock, aur quiz ke galat question), isliye card
// yahan alag nikal aaya — wahan ka AnsCard tasveer + Gemini answer dikhata hai,
// ye sawaal ko uske ASLI card mein kholta hai.
//
// Shakl wahi .ansp wali (app/exam.css) — isliye yahan apna koi CSS nahi.

const isCA = (r) =>
  r.category === "Current Affairs" || /ca|current/i.test(String(r.source || ""));

export default function NotebookCard({ rec, n, bucket, subjectLabel, onDone, onDelete, onFix }) {
  const caEntry = isCA(rec) ? findCAEntryForQuestion(rec.q) : null;

  return (
    <div id={`mq-${n}`} className="ansp__card">
      <h2>
        Question {n}
        <span className="ansp__qid">
          {" · "}📝 {subjectLabel}
          {rec.category ? ` · ${rec.category}` : ""}
          {rec.sec > 0 ? ` · ⏱ ${rec.sec}s` : ""}
        </span>
      </h2>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 14px 8px" }}>
        {caEntry && (
          <Link href={`/current-affairs/${caEntry.id}`} className="link">📅 {caEntry.date}</Link>
        )}
        {isCA(rec) && !caEntry && (
          <span className="ansp__hint" title="Ye question ab kisi date entry mein nahi mila">📅 date not found</span>
        )}
        {/* Book ki key hi galat ho to yahin se theek — ye tag nahi, marammat
            ka auzaar hai, isliye bacha hua hai. */}
        <FixAnswer q={rec.q} onFix={onFix} />
      </div>

      {/* Question apne ASLI card mein. Maths/Reasoning ka sawaal tasveer mein
          hota hai; use aam text card mein kholne se sirf "[id] qText" dikhta
          aur asli sawaal gayab reh jata hai. archiveOnAnswer se yahan diya hua
          jawab notebook mein wapas darj hota hai — usi se `at` naya hota hai
          aur question agli baar sabse neeche milta hai. */}
      {rec.q?.qImg && Array.isArray(rec.q?.optImgs) ? (
        bucket === "reasoning" ? (
          <ReasonQuestionCard q={rec.q} index={0} subject="reasoning" chapterName={rec.category} />
        ) : (
          <MathQuestionCard q={rec.q} index={0} subject="math" chapterName={rec.category} />
        )
      ) : (
        <PyqQuestionCard
          q={rec.q}
          index={0}
          subject={rec.subject}
          chapterName={rec.category}
          archiveOnAnswer
        />
      )}

      <div className="ansp__acts">
        {/* Nishaan nahi, kaam — dabate hi question sabse neeche. */}
        <button className="ansp__btn ansp__btn--go" onClick={onDone}>✅ Ho gaya</button>
        <button className="ansp__btn" onClick={onDelete}>🗑️ Hatao</button>
      </div>
    </div>
  );
}
