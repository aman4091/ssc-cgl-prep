"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChapters } from "@/lib/grammar";
import { buildChapterQuiz } from "@/lib/chapterquiz";

const SUBJECTS = [
  { key: "math", name: "Maths", icon: "🧮" },
  { key: "reasoning", name: "Reasoning", icon: "🧠" },
  { key: "english", name: "English", icon: "📚" },
  { key: "gs", name: "General Studies", icon: "🌍" },
];

const EXTRA = [
  {
    key: "pyq", name: "PYQ Bank", icon: "🎯",
    topics: [
      { name: "Maths PYQs", href: "/pyq/math" },
      { name: "Reasoning PYQs", href: "/pyq/reasoning" },
      { name: "English PYQs", href: "/pyq/english" },
      { name: "General Awareness PYQs", href: "/pyq/gs" },
    ],
  },
  {
    key: "vocab", name: "Vocabulary", icon: "🔤",
    topics: [
      { name: "One Word Substitution (daily)", href: "/vocab" },
      { name: "Bookmarked words", href: "/vocab/bookmarks" },
    ],
  },
  {
    key: "ca", name: "Current Affairs & GK", icon: "📰",
    topics: [
      { name: "Current Affairs (daily / weekly / monthly / yearly)", href: "/current-affairs" },
      { name: "Static GK", href: "/static-gk" },
    ],
  },
  {
    key: "practice", name: "Practice & Tests", icon: "📝",
    topics: [
      { name: "Full Papers (1-hour timer)", href: "/papers" },
      { name: "Calculation (speed maths)", href: "/calculation" },
      { name: "My Quizzes", href: "/quizzes" },
      { name: "External / Mock tests", href: "/external-tests" },
    ],
  },
  {
    key: "track", name: "Track & Revise", icon: "📊",
    topics: [
      { name: "Today's Targets", href: "/today" },
      { name: "Checklist", href: "/checklist" },
      { name: "Mistake Notebook", href: "/mistakes" },
      { name: "Bookmarked Questions", href: "/bookmarks" },
      { name: "Saved Answers", href: "/saved-answers" },
      { name: "Settings", href: "/settings" },
    ],
  },
];

export default function Home() {
  const router = useRouter();
  const [open, setOpen] = useState(null);
  const [chapters, setChapters] = useState({});

  useEffect(() => {
    const map = {};
    for (const s of SUBJECTS) map[s.key] = getChapters(s.key);
    setChapters(map);
  }, []);

  const startChapterQuiz = (chapterId, name) => {
    const quiz = buildChapterQuiz(chapterId, name);
    if (quiz) router.push(`/quizzes/${quiz.id}`);
  };

  const sections = [
    ...SUBJECTS.map((s) => ({
      key: s.key, name: s.name, icon: s.icon,
      topics: (chapters[s.key] || []).map((c) => ({ name: c.name, href: `/study/${s.key}/${c.id}`, chapterId: c.id })),
      manage: { name: "＋ Add / manage chapters", href: `/study/${s.key}` },
    })),
    ...EXTRA,
  ];

  return (
    <section className="section home-acc-wrap">
      <div className="home-head">
        <div className="row between" style={{ flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
          <div>
            <h1>SSC CGL <span className="grad">Prep Hub</span></h1>
            <p className="muted">Pick a subject, choose a topic — start right away.</p>
          </div>
          <Link href="/mistakes" className="btn btn--primary btn--sm">🔴 Mistake Notebook</Link>
        </div>
      </div>

      <div className="home-acc">
        {sections.map((s) => {
          const isOpen = open === s.key;
          return (
            <div key={s.key} className={`home-acc__item ${isOpen ? "is-open" : ""}`}>
              <button className="home-acc__row" onClick={() => setOpen(isOpen ? null : s.key)}>
                <span className="home-acc__name">
                  <span className="home-acc__ico">{s.icon}</span>{s.name}
                </span>
                <span className="home-acc__meta">
                  {s.topics.length > 0 && <span className="home-acc__count">{s.topics.length}</span>}
                  <span className="home-acc__chev">{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>

              {isOpen && (
                <div className="home-acc__panel">
                  {s.topics.length === 0 ? (
                    <p className="home-acc__empty muted">No topics yet — add one below.</p>
                  ) : (
                    s.topics.map((t) => (
                      t.chapterId ? (
                        <div key={t.href} className="home-acc__link home-acc__chrow">
                          <Link href={t.href} className="home-acc__chname">{t.name}</Link>
                          <button className="btn btn--ghost btn--sm home-acc__quiz" onClick={() => startChapterQuiz(t.chapterId, t.name)}>
                            🎯 Quiz
                          </button>
                        </div>
                      ) : (
                        <Link key={t.href} href={t.href} className="home-acc__link">
                          <span>{t.name}</span>
                          <span className="home-acc__go">→</span>
                        </Link>
                      )
                    ))
                  )}
                  {s.manage && (
                    <Link href={s.manage.href} className="home-acc__link home-acc__link--manage">
                      <span>{s.manage.name}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
