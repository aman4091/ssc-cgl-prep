"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChapters, getChapterQuestions } from "@/lib/grammar";
import { getAllEntries } from "@/lib/feed";
import { getQuizzes, saveQuiz, makeId } from "@/lib/storage";
import { getOws, buildMcq } from "@/lib/vocab";
import { keyFor, getStat, getStatByParts } from "@/lib/qstats";

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

export default function RevisionPage() {
  const router = useRouter();
  const [wrong, setWrong] = useState([]);      // kabhi galat hua
  const [once, setOnce] = useState([]);        // sirf 1 baar kiya (kam practice)
  const [never, setNever] = useState([]);      // stored but never attempted
  const [vocabNew, setVocabNew] = useState([]); // vocab words 0 baar

  useEffect(() => {
    // 1) gather every stored question object (chapters + feed + saved quizzes)
    const all = [];
    for (const c of getChapters()) all.push(...getChapterQuestions(c.id));
    for (const e of getAllEntries()) all.push(...(e.questions || []));
    for (const q of getQuizzes()) all.push(...(q.questions || []));

    // dedup by stable key, classify by attempt stats
    const seen = new Set();
    const w = [], o = [], n = [];
    for (const q of all) {
      if (!q || !q.question || !Array.isArray(q.options)) continue;
      const k = keyFor(q);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const st = getStat(q);
      if (!st || !st.attempts) n.push(q);
      else if (st.correct < st.attempts) w.push(q);
      else if (st.attempts <= 1) o.push(q);
    }
    setWrong(w); setOnce(o); setNever(n);

    // 2) vocab words attempted 0 times
    const pool = getOws();
    const fresh = pool.filter((it) => {
      const qText = it.def || `One word for: ${it.word}`;
      const s = getStatByParts(qText, it.word);
      return !s || !s.attempts;
    });
    setVocabNew(fresh);
  }, []);

  const startQuiz = (title, questions) => {
    if (!questions.length) return;
    const quiz = {
      id: makeId(), title, source: "revision",
      createdAt: new Date().toISOString(),
      questions: shuffle(questions).slice(0, 25),
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const startVocab = () => {
    const pool = getOws();
    const items = shuffle(vocabNew).slice(0, 25);
    const questions = items.map((it) => buildMcq(it, pool));
    startQuiz("Revision · New vocab words", questions);
  };

  const Card = ({ icon, title, desc, list, onStart, color }) => (
    <article className="glass-card">
      <div className="subject__icon" style={{ color }}>{icon}</div>
      <h3 style={{ marginTop: 6 }}>{title}</h3>
      <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>{desc}</p>
      <p className="mt-16" style={{ fontSize: "1.8rem", fontWeight: 800, color }}>{list.length}</p>
      <button className="btn btn--primary btn--block mt-8" onClick={onStart} disabled={list.length === 0}>
        {list.length ? `🎯 Practice (${Math.min(25, list.length)})` : "Nothing yet"}
      </button>
    </article>
  );

  const total = wrong.length + once.length + never.length + vocabNew.length;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">🔁 Revision</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Smart <span className="grad">Revision</span>
        </h1>
        <p className="hero__sub">
          Focus on questions you've practised less, got wrong, or never attempted. Fix your weak spots. 💪
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {total === 0 ? (
          <div className="placeholder">
            No tracking data yet. Take a few quizzes first (PYQ / papers / vocab) — then your weak-spot questions will show up here. 🚀
          </div>
        ) : (
          <div className="grid grid--4">
            <Card icon="❌" color="var(--danger)" title="Got wrong before" desc="Questions you answered incorrectly — lock them in."
              list={wrong} onStart={() => startQuiz("Revision · Got wrong before", wrong)} />
            <Card icon="🟡" color="var(--warning)" title="Low practice" desc="Attempted only once — revise a bit more."
              list={once} onStart={() => startQuiz("Revision · Low practice", once)} />
            <Card icon="⚪" color="var(--text-2)" title="Never attempted" desc="Saved in your banks but never tried."
              list={never} onStart={() => startQuiz("Revision · New questions", never)} />
            <Card icon="📖" color="var(--accent-2)" title="New vocab words" desc="Vocab words that never appeared in a quiz."
              list={vocabNew} onStart={startVocab} />
          </div>
        )}
      </section>
    </>
  );
}
