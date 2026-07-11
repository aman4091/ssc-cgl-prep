import Link from "next/link";

export const metadata = { title: "English — SSC CGL Pre" };

export default function EnglishPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📚 English</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          English <span className="grad">Section</span>
        </h1>
        <p className="hero__sub">Vocabulary, grammar aur comprehension — ek jagah.</p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        <div className="grid grid--3">
          <Link href="/vocab" className="glass-card subject" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="subject__icon">🔤</div>
            <h3>Vocab · OWS</h3>
            <p>One Word Substitution — PDF se 40-day plan, trick, synonyms, quiz.</p>
            <span className="badge badge--ok" style={{ marginTop: 12 }}>Ready</span>
          </Link>
          <Link href="/study/english" className="glass-card subject" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="subject__icon">✍️</div>
            <h3>Grammar</h3>
            <p>Topic-wise chapters — PDF/image/text se rules, full detail, examples, video timestamps aur quiz.</p>
            <span className="badge badge--ok" style={{ marginTop: 12 }}>Ready</span>
          </Link>
          <div className="glass-card subject">
            <div className="subject__icon">💬</div>
            <h3>Idioms & Phrases</h3>
            <p>Common idioms with meaning aur daily quiz.</p>
            <span className="badge badge--soon" style={{ marginTop: 12 }}>Coming soon</span>
          </div>
        </div>
      </section>
    </>
  );
}
