import Link from "next/link";

export const metadata = { title: "PYQ — SSC CGL Pre" };

const SUBS = [
  { icon: "🧮", name: "Maths", desc: "Previous year quant questions — chapter-wise.", href: "/study/pyq-math" },
  { icon: "🧠", name: "Reasoning", desc: "PYQ reasoning — analogy, series, coding, puzzles.", href: "/study/pyq-reasoning" },
  { icon: "📚", name: "English", desc: "PYQ English — grammar, vocabulary, comprehension.", href: "/study/pyq-english" },
  { icon: "🌍", name: "General Awareness", desc: "PYQ GS — history, polity, science, current affairs.", href: "/study/pyq-gs" },
];

export default function PyqPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📚 Previous Year Questions</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          PYQ <span className="grad">Bank</span>
        </h1>
        <p className="hero__sub">
          Create chapters inside each subject, then upload question images from books — AI turns them into quizzes.
          Practice chapter by chapter.
        </p>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <div className="grid grid--2">
          {SUBS.map((s) => (
            <Link key={s.name} href={s.href} className="glass-card subject" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="subject__icon">{s.icon}</div>
              <h3>{s.name}</h3>
              <p className="mt-8">{s.desc}</p>
              <span className="badge badge--ok" style={{ marginTop: 12 }}>Open chapters →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
