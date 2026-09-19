"use client";

import PyqQuestionCard from "@/components/PyqQuestionCard";
import MathQuestionCard from "@/components/MathQuestionCard";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";

// 📝 Quiz/PYQ mein jo galat hua — uska card.
//
// Pehle ye app/mistakes ke andar hi likha tha. Ab Answers page dono shelf
// dikhata hai (screenshot wale mock, aur quiz ke galat question), isliye card
// yahan alag nikal aaya — wahan ka AnsCard tasveer + Gemini answer dikhata hai,
// ye sawaal ko uske ASLI card mein kholta hai.
//
// Yahan apna sar, date-link aur "answer theek karo" wala auzaar hua karta
// tha. Owner ne card par ek hi patti maangi, isliye sab hat gaya — sirf
// sawaal, aur uske apne header mein ✅ / 🗑️.

export default function NotebookCard({ rec, n, bucket, onDone, onDelete }) {

  // Owner ka niyam: card par ek hi patti. Isliye apna sar (Question N),
  // date-link aur neeche wale button hata diye — ✅ Ho gaya aur 🗑️ seedha
  // question ke apne header mein chale jate hain (extraActions), ✨ Gemini
  // aur baaki wahin pehle se hain.
  const acts = (
    <>
      <button className="btn btn--sm q-act--keep" onClick={onDone} title="Ho gaya — ye question sabse neeche">✅</button>
      <button className="btn btn--sm q-act--keep" onClick={onDelete} title="Hatao">🗑️</button>
    </>
  );

  return (
    <div id={`mq-${n}`} className="ansp__card ansp__card--nb">
      {rec.q?.qImg && Array.isArray(rec.q?.optImgs) ? (
        bucket === "reasoning" ? (
          <ReasonQuestionCard q={rec.q} index={0} subject="reasoning" chapterName={rec.category} extraActions={acts} />
        ) : (
          <MathQuestionCard q={rec.q} index={0} subject="math" chapterName={rec.category} extraActions={acts} />
        )
      ) : (
        <PyqQuestionCard
          q={rec.q}
          index={0}
          subject={rec.subject}
          chapterName={rec.category}
          archiveOnAnswer
          extraActions={acts}
        />
      )}
    </div>
  );
}
