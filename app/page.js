import Link from "next/link";

const GROUPS = [
  {
    head: "📖 Learn",
    sub: "Study and understand — chapter by chapter.",
    items: [
      { icon: "📚", name: "Subjects", desc: "Maths, Reasoning, English, GS — chapters, rules, theory & video.", href: "/subjects" },
      { icon: "🔤", name: "Vocab · OWS", desc: "50 words a day — meaning, trick, synonyms, daily quiz.", href: "/vocab" },
      { icon: "📰", name: "Current Affairs", desc: "Daily / weekly / yearly — quiz & video, date-wise.", href: "/current-affairs" },
      { icon: "📗", name: "Static GK", desc: "Topic-wise static GK — quiz & video from PDFs.", href: "/static-gk" },
    ],
  },
  {
    head: "📝 Practice",
    sub: "Take tests, build speed.",
    items: [
      { icon: "🎯", name: "PYQ Bank", desc: "Previous year questions — subject & chapter-wise.", href: "/pyq" },
      { icon: "📄", name: "Full Papers", desc: "Year-wise full CGL papers — 1 hour timer.", href: "/papers" },
      { icon: "🧮", name: "Calculation", desc: "Speed maths — additions, ×, squares, fractions.", href: "/calculation" },
      { icon: "🗂️", name: "Quizzes", desc: "All the quizzes you built from PDFs.", href: "/quizzes" },
    ],
  },
  {
    head: "📊 Track & Revise",
    sub: "Find weak spots, track progress.",
    items: [
      { icon: "🔁", name: "Smart Revision", desc: "Wrong / low-practice / new — target your weak spots.", href: "/revision" },
      { icon: "🌐", name: "External Tests", desc: "Track score, time and links of tests on other sites.", href: "/external-tests" },
      { icon: "📅", name: "Today's Targets", desc: "Your daily targets, start in one click.", href: "/today" },
      { icon: "⚙️", name: "Settings", desc: "DeepSeek API key and preferences.", href: "/settings" },
    ],
  },
];

export default function Home() {
  return (
    <>
      <section className="hero home-hero">
        <span className="hero__eyebrow">✦ Tier 1 · Preliminary Exam</span>
        <h1 className="hero__title">
          Crack SSC CGL Prelims,
          <br />
          <span className="grad">one focused day at a time.</span>
        </h1>
        <p className="hero__sub">
          Everything in one place — daily targets, chapters, PYQ, full papers, current affairs, speed maths and revision.
          Upload a PDF/image, auto-generate quizzes with AI. A little every day, with consistency. 🚀
        </p>
        <div className="hero__cta">
          <Link href="/today" className="btn btn--primary">📅 Today's plan</Link>
          <Link href="/pyq" className="btn btn--ghost">🎯 PYQ practice</Link>
        </div>
      </section>

      {GROUPS.map((g) => (
        <section className="section" key={g.head}>
          <div className="section__head">
            <h2>{g.head}</h2>
            <p>{g.sub}</p>
          </div>
          <div className="grid grid--4">
            {g.items.map((s) => (
              <Link key={s.name} href={s.href} className="glass-card subject home-card" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="subject__icon">{s.icon}</div>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
