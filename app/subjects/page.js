import Link from "next/link";

export const metadata = { title: "Subjects — SSC CGL Pre" };

const SUBJECTS = [
  { icon: "🧮", name: "Quantitative Aptitude", topics: "Number System, Algebra, Geometry, Trigonometry, DI", href: "/study/math" },
  { icon: "🧠", name: "General Intelligence & Reasoning", topics: "Analogy, Classification, Series, Coding-Decoding, Puzzles", href: "/study/reasoning" },
  { icon: "📚", name: "English Comprehension", topics: "Grammar, Vocabulary, Synonyms, Comprehension, Cloze", href: "/english" },
  { icon: "🌍", name: "General Awareness", topics: "History, Polity, Geography, Economics, Science, Current Affairs", href: "/study/gs" },
];

export default function SubjectsPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📖 Syllabus</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
          <span className="grad">Subjects</span> & Topics
        </h1>
        <p className="hero__sub">All four Prelims sections. Add your content inside each subject.</p>
      </section>

      <section className="section" style={{ marginTop: 24 }}>
        <div className="grid grid--2">
          {SUBJECTS.map((s) => (
            <Link key={s.name} href={s.href} className="glass-card subject" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="subject__icon">{s.icon}</div>
              <h3>{s.name}</h3>
              <p className="mt-8">{s.topics}</p>
              <span className="badge badge--ok" style={{ marginTop: 12 }}>Open chapters →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
