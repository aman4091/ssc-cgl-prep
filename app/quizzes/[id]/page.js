"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getQuiz, deleteQuiz } from "@/lib/storage";
import { setSyncPaused } from "@/lib/sync";
import { markDayDone, markDayTypeDone } from "@/lib/vocab";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import QBoard from "@/components/QBoard";

// 📝 Ek quiz khelne ka page — generated "20 similar", notes ke page ka quiz,
// vocab ka din, Quiz Bank ka paper: sab yahin khulte hain.
//
// Ab iska apna koi test-engine nahi hai. Wahi QBoard chalta hai jo PYQ chapter
// par chalta hai — 15 minute ka clock, ek waqt par ek question, daayin numbered
// palette, Mark for Review, aur Submit ke baad Right/Wrong/Marks/Accuracy ke
// saath saare answer. `single` iska matlab hai ki poora quiz EK hi test hai,
// 25-25 ke set nahi (quiz apne aap mein ek paper hota hai).
//
// Purana engine yahin apna alag Prev/Next, apna timer, apni result screen aur
// error-tagging rakhta tha — do jagah do alag test, dono ko alag-alag sudharna
// padta tha. Ab ek hi jagah hai.
export default function QuizPlayer() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(undefined);

  // Quiz khula ho to sync ko storage chhoone hi nahi dena. Jawab React state
  // mein hain, isliye beech mein jhatka seedha nuksaan hai. Screen band hote
  // hi sync wapas chalu (jo bhi bana wo tab chala jayega).
  useEffect(() => { setSyncPaused(true); return () => setSyncPaused(false); }, []);

  useEffect(() => {
    let cancelled = false;
    const apply = (qz) => { if (!cancelled) setQuiz(qz && qz.questions?.length ? qz : null); };
    const local = getQuiz(id);
    if (local) { apply(local); return undefined; }
    // Imported Quiz Bank / Mock Test — /public se maanga jata hai, taaki
    // localStorage halka rahe.
    if (typeof id === "string" && id.startsWith("bank_")) {
      setQuiz(undefined);
      fetch(`/quizbank/${encodeURIComponent(id)}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then(apply)
        .catch(() => apply(null));
      return () => { cancelled = true; };
    }
    apply(null);
    return () => { cancelled = true; };
  }, [id]);

  // "Similar practice" set dhire-dhire bharta hai: generator pehle kuch save
  // karke yahan bhej deta hai aur baaki peeche se jodta rehta hai. Naye
  // question list ke ANT mein aate hain, isliye chuna hua jawab (jo number se
  // ginta hai) hilta nahi.
  useEffect(() => {
    const onAppend = (e) => {
      if (!e?.detail || e.detail.id !== id) return;
      const fresh = getQuiz(id);
      if (fresh) setQuiz((prev) => (prev ? fresh : prev));
    };
    window.addEventListener("cgl:quiz-appended", onAppend);
    return () => window.removeEventListener("cgl:quiz-appended", onAppend);
  }, [id]);

  if (quiz === undefined)
    return <section className="section"><p className="muted">Loading…</p></section>;

  if (quiz === null)
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <div className="glass-card center">
          <h2>Quiz not found</h2>
          <p className="muted mt-8">Ya to delete ho gaya, ya link galat hai.</p>
          <Link href="/answers" className="btn btn--primary mt-16">← Answers</Link>
        </div>
      </section>
    );

  const onSubmit = () => {
    // Vocab ka din yahin tick hota hai — submit par, kholne par nahi, taaki
    // khola-aur-chhoda quiz "ho gaya" na gine.
    if (quiz.vocabDay) {
      if (quiz.vocabType) markDayTypeDone(quiz.vocabDay, quiz.vocabType);
      else markDayDone(quiz.vocabDay);
    }
    // Quiz ab bekaar hai — galat/chhode question Mistake Notebook mein ja chuke
    // aur stats bhi darj ho gaye. Rakhne se sirf localStorage bharta hai. Result
    // screen memory-copy se banti hai, isliye delete ke baad bhi poori dikhti.
    if (!String(id).startsWith("bank_")) deleteQuiz(quiz.id);
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📝 Quiz</span>
          <Link href="/answers" className="btn btn--ghost btn--sm">Exit</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.3rem, 3vw, 1.9rem)" }}>
          {quiz.title}
        </h1>
        {quiz.streaming && (
          <p className="mt-8" style={{ fontSize: "0.82rem", color: "var(--accent-2)", fontWeight: 600 }}>
            ⏳ Aur questions peeche se aa rahe hain…
          </p>
        )}
      </section>

      <section className="section">
        <QBoard
          single
          list={quiz.questions}
          subject={quiz.subject || ""}
          resumeKey={`quiz:${quiz.id}`}
          title={quiz.title}
          onSubmit={onSubmit}
          renderCard={(q, i) => (
            <PyqQuestionCard
              key={q.id ?? i}
              q={q}
              index={i}
              subject={quiz.subject || ""}
              chapterName={quiz.title}
            />
          )}
        />
      </section>
    </>
  );
}
