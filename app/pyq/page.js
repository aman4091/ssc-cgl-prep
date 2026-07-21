import Link from "next/link";

export const metadata = { title: "PYQ — SSC CGL Pre" };

// Every shelf here now has questions already in it. The four subject cards that
// used to sit at the bottom (Maths / Reasoning / English / General Awareness)
// were empty upload banks; the only real content inside two of them was the
// crazygktrick bank, which now has its own two shelves below.
const SUBS = [
  { icon: "🎯", name: "WAR", count: "3,152", desc: "12 subjects, exam ke saath.", href: "/pyq/war" },
  { icon: "📚", name: "Pinnacle English", count: "7,585", desc: "15 chapters, solutions ke saath.", href: "/pyq/pinnacle" },
  { icon: "🧮", name: "Pinnacle Maths", count: "6,420", desc: "27 chapters, poore solution ke saath.", href: "/pyq/mathbank" },
  { icon: "🧮", name: "Maths 2025", count: "5,600", desc: "29 chapters — har question pe exam, date aur shift.", href: "/pyq/maths2025" },
  { icon: "🧠", name: "Pinnacle Reasoning", count: "3,543", desc: "32 chapters, verbal aur non-verbal.", href: "/pyq/reasonbank" },
  { icon: "🧠", name: "GKTricks", count: "1,677", desc: "GS — Polity aur Ancient History.", href: "/pyq/gktricks" },
  { icon: "🪞", name: "Mirror of Common Errors", count: "51", desc: "Error spotting — Noun.", href: "/pyq/mirror" },
];

export default function PyqPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📚 Previous Year Questions</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          PYQ <span className="grad">Bank</span>
        </h1>
        {/* The upload banks are gone, so this no longer describes uploading. */}
        <p className="hero__sub">
          <b>28,028</b> ready-made questions — chapter-wise, poore solution ke saath. Kuch upload nahi karna.
          Galat answer seedha Mistake Notebook mein chala jaata hai.
        </p>
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link href="/mistakes" className="btn btn--ghost btn--sm">🔴 Mistake Notebook</Link>
          <Link href="/bookmarks" className="btn btn--ghost btn--sm">⭐ Bookmarked</Link>
        </div>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <div className="pyq-list">
          {SUBS.map((s) => (
            <Link key={s.name} href={s.href} className="pyq-row">
              <span className="pyq-row__ico">{s.icon}</span>
              <span className="pyq-row__name">
                {s.name}
                <span className="pyq-row__sub">{s.desc}</span>
              </span>
              <span className="pyq-row__meta">{s.count} Q</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
