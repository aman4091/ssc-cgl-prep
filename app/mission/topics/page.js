import Link from "next/link";

// /mission/topics — kya padhna hai aur kya BINA GUILT chhodna hai.
// Skip list utni hi zaroori hai jitni study list: 32 din mein sab nahi hota,
// aur jo slow + kam aane wala hai wo time bhi khaata hai aur negative bhi deta hai.

export const metadata = { title: "Topics & Skip list · CGL Mission" };

const L = ({ href, children }) => <Link href={href} className="chip chip--btn chip--sm">{children}</Link>;

export default function MissionTopicsPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">📋 Topics &amp; Skip list</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Kya padhna hai, kya <span className="grad">chhodna</span> hai
        </h1>
        <p className="hero__sub">Q/paper wale numbers CGL 2023–25 PYQ ka approx trend hain. Priority: GS → Maths → English → Reasoning (maintain).</p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="ms-h2">🧮 Maths — floor 34 (20–21 attempt) · stretch 39</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Tier</th><th>Topics</th><th>~Q</th><th>Kyun</th></tr></thead>
            <tbody>
              <tr><td><strong>A — Round 1</strong></td><td>Percentage, P&amp;L + Discount, SI/CI, Ratio/Partnership, Average, Simplification, Number System (divisibility, unit digit), Trigonometry (values, identities, θ=45° put, max/min), Algebra identities, DI</td><td>14–16</td><td>Formula pata ho to 20–40 sec — speed yahin se</td></tr>
              <tr><td><strong>B — Round 2</strong></td><td>Time &amp; Work, TSD/trains, Mixture/Alligation, Mensuration 2D, Mensuration 3D (sirf direct formula), Geometry (sirf triangle centres, similarity/BPT, circle theorems, polygon), Mean/Median/Mode</td><td>7–9</td><td>Aate hain, par 45–75 sec</td></tr>
            </tbody>
          </table>
        </div>
        <div className="glass-card ms-alert ms-alert--bad">
          <strong>SKIP — padhai se:</strong> Coordinate geometry · Height &amp; Distance (2 observer / ajeeb angle) · Mensuration 3D frustum / pighla-ke-dhaalo / irregular prism · Geometry 2+ circles / tangent-chain · Statistics variance/SD · Pipes 3-pipe + leak · Boats multi-stage.<br />
          <strong>SKIP — exam mein dekhte hi:</strong> figure mein 2+ circle · DI jisme 5+ calculation · degree ≥3 expansion bina pattern · badi power ka remainder bina cyclicity · 3-stage TSD.
          <div className="hint" style={{ marginTop: 4 }}>Kyun: tumhari mistake-book mein Mensuration-3D 53 aur Geometry 53 galtiyan — ye time bhi khaate hain, negative bhi dete hain.</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <L href="/pyq/maths2025">Maths 2025 bank</L><L href="/notes/brahmastra">📐 Brahmastra formulas</L><L href="/mission/diagnose">🩺 Speed ya concept?</L>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">🌍 GS — baseline 10 · floor 22 · stretch 28. PYQ → CLUSTER → REPEAT (notes band)</h2>
        <div className="glass-card ms-alert ms-alert--info">
          <strong>Method:</strong> (1) PYQ solve — har Q max 10 sec, nahi pata → agla. (2) Har galat/unsure ka <strong>CLUSTER</strong> — sirf answer nahi,
          poora group EK line mein (8–15 facts), jaise <em>"AP: Kuchipudi · TN: Bharatanatyam · Kerala: Kathakali, Mohiniyattam · Odisha: Odissi · UP: Kathak · Manipur: Manipuri · Assam: Sattriya"</em>.
          DeepSeek answer ka 🧩 CLUSTER section seedha copy. (3) Fact log D+1 / D+3 / D+7. Roz 100 PYQ, 25–30 naye cluster, 40–50 purane revise.
        </div>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>#</th><th>Area (is kram mein — list pehle, samajh baad mein)</th><th>~Q</th><th>Cluster kya banana hai</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><strong>Static GK</strong></td><td>4–6</td><td>8 classical dances + folk → state, festivals → state, instruments → artists, awards, sports cups + terms, books → authors, important days, first-in-India, HQ, stadiums</td></tr>
              <tr><td>2</td><td><strong>Polity</strong> <em>(21 galtiyan)</em></td><td>3–4</td><td>Articles 14, 19, 21, 21A, 32, 44, 51A, 72, 112, 123, 280, 324, 352/356/360, 368 · 12 Schedules · Parts · Amendments 42, 44, 52, 61, 73, 74, 86, 101, 103 · FR/DPSP/FD · bodies</td></tr>
              <tr><td>3</td><td><strong>Science facts</strong></td><td>5–6</td><td>Bio: vitamins, diseases + pathogen, body, blood, cell · Chem: formulas, common names, alloys, pH, gases · Physics: SI units, instruments, inventors (numerical nahi)</td></tr>
              <tr><td>4</td><td><strong>Geography India</strong></td><td>2–3</td><td>Rivers + tributaries, dams, passes, national parks, soils, crops, Census 2011</td></tr>
              <tr><td>5</td><td><strong>Modern History</strong></td><td>2</td><td>1857→1947 timeline, Congress sessions, Viceroys, movements + years</td></tr>
              <tr><td>6</td><td><strong>Current Affairs</strong> (roz 30 min)</td><td>2–4</td><td>Mar–Sep 2026: schemes, appointments, awards, sports, summits, books, reports</td></tr>
              <tr><td>7</td><td><strong>Economy + Ancient/Medieval</strong></td><td>2–3</td><td>SIRF PYQ — padhna nahi</td></tr>
            </tbody>
          </table>
        </div>
        <div className="glass-card ms-alert ms-alert--bad">
          <strong>SKIP:</strong> World history · Sangam / post-Maurya vanshavali · Vijayanagara/Bahmani detail · world physical geography detail · economy theory (elasticity, national income calc) · physics numericals · organic chemistry (common names chhod ke) · Computer (Tier-2 ka) · 12 mahine se purana CA · Lucent poori · Parmar ke saare 121 chapter.
        </div>
        <p className="hint">15 min ka fayda: 25 Q ~9 min mein ho jaate hain — bache 6 min statement/match wale Q pe har statement alag check karke options kaato. Jawab sirf concrete wajah ho tabhi badlo.</p>
        <div className="row" style={{ gap: 6 }}>
          <L href="/pyq/war/static-gk">WAR: Static GK</L><L href="/pyq/war/polity">WAR: Polity</L><L href="/pyq/war">WAR bank (sab)</L><L href="/current-affairs">📰 CA</L><L href="/mission/facts">🧠 Fact log</L>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">📘 English — floor 38 (23 attempt, ≤3 galat) · stretch 41. Time nahi, ACCURACY</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Area</th><th>~Q</th><th>Invest?</th></tr></thead>
            <tbody>
              <tr><td>Error spotting, Sentence improvement, FIB</td><td>5–6</td><td>✅✅ Tumhara leak (tagged galtiyon ka ~60%) — top 12 rules</td></tr>
              <tr><td>Vocab: Syn, Ant, OWS, Idioms, Spelling</td><td>7–8</td><td>✅ PYQ list — SSC words repeat karta hai</td></tr>
              <tr><td>Cloze (5) + RC (5)</td><td>~10</td><td>Sirf method + mocks mein practice</td></tr>
              <tr><td>Voice / Narration / Para-jumble</td><td>2–3</td><td>Sirf basic tense-change rules</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint"><strong>Top 12 rules:</strong> SVA · tense (since/for, perfect, If+had) · articles · uncountable/collective nouns · pronoun case · degree of comparison · fixed prepositions · "one of the + plural" · no sooner–than / hardly–when / lest–should · parallelism · redundancy · question tags.</p>
        <div className="glass-card ms-alert ms-alert--bad"><strong>SKIP:</strong> Wren &amp; Martin poori · Norman Lewis / editorial ke naye words · word-root etymology · complex narration/voice exceptions · non-PYQ idiom lists.</div>
        <div className="row" style={{ gap: 6 }}>
          <L href="/pyq/errorpro">Error Pro</L><L href="/pyq/pinnacle">Pinnacle English</L><L href="/vocab">🔤 Vocab</L><L href="/notes/goldenrules">🏅 Golden rules</L>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">🧠 Reasoning — sirf maintain (floor 41 · stretch 45; full mock mein 31.5 aaya tha)</h2>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Rakho: analogy, classification, series, coding-decoding, maths operations, blood relation, direction, ranking, syllogism, Venn,
          mirror/water, paper cut/fold, embedded figure, dice, missing number. Exam mein 2nd round: 6+ log ka seating/puzzle, complex figure
          counting. <strong>Kuch naya mat padho</strong> — 23 sectional ho chuke hain, ab aage ka har mark mehnga hai.
        </p>
        <div className="row" style={{ gap: 6 }}><L href="/pyq/reasonbank">Pinnacle Reasoning</L><L href="/mock-marks?cat=reasoning">Marks</L></div>
      </section>

      <section className="section">
        <h2 className="ms-h2">Saaf baat — is time mein kya possible NAHI</h2>
        <div className="glass-card" style={{ padding: 14 }}>
          <ul className="ms-list">
            <li>160+ guarantee — plan ka FLOOR 142 hai, TARGET 152 (percentile 85). Usse upar paper aasan hone par hi jaata hai.</li>
            <li>GS 40+ — abhi 16.7 hai; 32 din mein floor 27, target 30. Yahi sabse bada +13 hai.</li>
            <li>Parmar ke 121 chapter / 6-pass — 32 din mein nahi hoga. GS ab PYQ + cluster se chalega, notes se nahi.</li>
            <li>Maths ka poora syllabus — phase 2 mein sirf wo chapter FULL honge jo mistake book mein sabse zyada hain (geometry, 3D, CI, H&amp;D, coordinate).</li>
            <li>Poore saal ka CA gehrai se.</li>
            <li>Reasoning mein consistent 50/50 — koshish ke laayak bhi nahi.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
