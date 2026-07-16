import Link from "next/link";

export const metadata = { title: "PYQ — SSC CGL Pre" };

const SUBS = [
  // The WAR book ships with the app (lib/warbank) — 3,152 real SSC PYQs the
  // user never has to upload. First, because it is the only card with questions
  // already in it.
  { icon: "🎯", name: "WAR", desc: "3,152 ready-made SSC PYQs — 12 subjects, exam ke saath. Kuch upload karne ki zaroorat nahi.", href: "/pyq/war" },
  { icon: "📚", name: "Pinnacle English", desc: "7,585 ready-made English questions — 15 chapters, solutions ke saath.", href: "/pyq/pinnacle" },
  { icon: "🧮", name: "Maths", desc: "Previous year quant questions — one subject-wise bank.", href: "/pyq/math" },
  { icon: "🧠", name: "Reasoning", desc: "PYQ reasoning — analogy, series, coding, puzzles.", href: "/pyq/reasoning" },
  { icon: "📚", name: "English", desc: "PYQ English — grammar, vocabulary, comprehension.", href: "/pyq/english" },
  { icon: "🌍", name: "General Awareness", desc: "PYQ GS — history, polity, science, current affairs.", href: "/pyq/gs" },
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
          Subject-wise question bank — upload question images/PDF, AI turns them into MCQs. Solve them, and
          mark any question into a subject chapter (it shows there with a PYQ tag).
        </p>
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link href="/mistakes" className="btn btn--ghost btn--sm">🔴 Mistake Notebook</Link>
          <Link href="/bookmarks" className="btn btn--ghost btn--sm">⭐ Bookmarked</Link>
        </div>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <div className="grid grid--2">
          {SUBS.map((s) => (
            <Link key={s.name} href={s.href} className="glass-card subject" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="subject__icon">{s.icon}</div>
              <h3>{s.name}</h3>
              <p className="mt-8">{s.desc}</p>
              <span className="badge badge--ok" style={{ marginTop: 12 }}>Open PYQ bank →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
