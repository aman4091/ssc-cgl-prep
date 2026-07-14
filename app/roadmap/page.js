"use client";

import Link from "next/link";

const CARD = { marginTop: 12 };

export default function RoadmapPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🗺️ Strategy</span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Link href="/today" className="btn btn--primary btn--sm">📅 Today</Link>
            <Link href="/mistakes" className="btn btn--ghost btn--sm">🔴 Mistakes</Link>
          </div>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          SSC CGL 2026 — <span className="grad">Clear Karne Ka Strict Plan</span>
        </h1>
        <p className="hero__sub">
          Ye plan follow karo, excuses band. Har din yahan ke <strong>non-negotiables</strong> karo, mistakes analyse karo,
          aur Strict Focus Mode ON rakho. Simple funda: <strong>consistency &gt; motivation</strong>.
        </p>
      </section>

      {/* Reality / cutoff math */}
      <section className="section" style={CARD}>
        <div className="glass-card">
          <h3>🎯 Target saaf rakho (Tier-1 = 200 marks)</h3>
          <ul className="rm-list">
            <li>4 sections × 25 Q = <strong>100 Q · 200 marks</strong> · 60 min · marking <strong>+2 / −0.5</strong>.</li>
            <li>Sections: <strong>General Intelligence &amp; Reasoning</strong>, <strong>General Awareness (GK/CA)</strong>, <strong>Quantitative Aptitude</strong>, <strong>English</strong>.</li>
            <li>Safe Tier-1 target: <strong>170+ / 200</strong> (≈ 88–90 accurate). Reasoning + English mein <strong>full marks</strong> lao, Quant strong karo, GA se free marks utha lo.</li>
            <li>Negative marking se bachne ke liye <strong>random guess mat</strong> karo — jahan 50-50 ho tabhi calculated guess.</li>
          </ul>
        </div>
      </section>

      {/* Daily non-negotiables */}
      <section className="section" style={CARD}>
        <div className="glass-card">
          <h3>🔒 Daily Non-Negotiables (roz, bina naaga)</h3>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>Inhe <Link href="/today" className="link">Today</Link> ke targets bana ke Strict Mode se force karo:</p>
          <ul className="rm-list">
            <li><strong>50 naye vocab words</strong> + purane ka revision — <Link href="/vocab" className="link">Vocab</Link> + ⚡ Vocab Rush ON.</li>
            <li><strong>1 Calculation drill</strong> (tables/squares/cubes/roots, 10 min) — <Link href="/calculation" className="link">Calculation</Link>. Speed = Quant ka half kaam.</li>
            <li><strong>2 topics ki practice</strong> (1 Quant + 1 Reasoning) — <Link href="/quiz-bank" className="link">Quiz Bank</Link> se topic-wise.</li>
            <li><strong>Current Affairs</strong> daily entry padho + quiz — <Link href="/current-affairs" className="link">Current Affairs</Link> + 📰 Rush ON.</li>
            <li><strong>1 English set</strong> (grammar/error-spot/vocab) — Quiz Bank → English.</li>
            <li><strong>Mistake Notebook</strong> ka poora review — jo galat hua use dobara solve karo (<Link href="/mistakes" className="link">🔴 Mistakes</Link>).</li>
          </ul>
          <p className="hint" style={{ marginTop: 10 }}>Rule: <strong>"mock dena 30%, analyse karna 70%."</strong> Har galti ka reason samjho, tab hi wo galti dobara nahi hogi.</p>
        </div>
      </section>

      {/* Phased plan */}
      <section className="section" style={CARD}>
        <div className="glass-card">
          <h3>📆 3 Phase Plan (exam tak)</h3>
          <div className="rm-grid">
            <div className="rm-phase">
              <h4>Phase 1 · Foundation (Week 1–4)</h4>
              <ul className="rm-list">
                <li>Har subject ke <strong>saare concepts + chapters</strong> ek baar cover — <Link href="/subjects" className="link">Subjects</Link>.</li>
                <li>Roz vocab + calculation pakka.</li>
                <li>Har chapter ke baad uska <strong>topic quiz</strong>.</li>
              </ul>
            </div>
            <div className="rm-phase">
              <h4>Phase 2 · Practice (Week 5–8)</h4>
              <ul className="rm-list">
                <li>Topic-wise se <strong>sectional</strong> pe shift — <Link href="/mock-tests" className="link">Mock Tests</Link>.</li>
                <li><strong>PYQ</strong> pakka karo — <Link href="/pyq" className="link">PYQ Bank</Link>.</li>
                <li>Weak areas pe double time (Weak Area Tracker dekho).</li>
              </ul>
            </div>
            <div className="rm-phase">
              <h4>Phase 3 · Mock-heavy (last 3–4 week)</h4>
              <ul className="rm-list">
                <li><strong>Roz 1 full mock</strong> — <Link href="/mock-tests" className="link">Mock Tests</Link> · timer ON.</li>
                <li>Har mock ka <strong>deep analysis</strong> — Mistake Notebook mein sab.</li>
                <li>Sirf revision + speed + accuracy. Naya kuch nahi.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Weak area loop */}
      <section className="section" style={CARD}>
        <div className="glass-card">
          <h3>♻️ Weak-Area Attack Loop</h3>
          <ol className="rm-list">
            <li>Quiz/mock do → galtiyaan apne aap <Link href="/mistakes" className="link">Mistake Notebook</Link> mein.</li>
            <li>Har galti pe error-type tag lagao (Silly / Concept / Time / Guess).</li>
            <li><strong>Weak Area Tracker</strong> se sabse kamzor topic pakdo.</li>
            <li>Us topic ke concept dobara padho → "🎯 Re-attempt wrong" quiz.</li>
            <li>Wrong → sahi hone par wo <strong>Mastered</strong> mein — tab tak chhodo mat.</li>
          </ol>
        </div>
      </section>

      {/* Feature map */}
      <section className="section" style={CARD}>
        <div className="glass-card">
          <h3>🧰 Kaunsa Feature, Kab</h3>
          <div className="rm-grid">
            <FeatureRow icon="📅" name="Today + Strict Focus" use="Din ke targets set karo, priority #1 pe rakho. Strict Mode har 2 min force karega jab tak start na karo." />
            <FeatureRow icon="🗓️" name="Daily Quiz" use="Din bhar jo extra/sectional questions milen unhe daalo, raat ko dobara karo." />
            <FeatureRow icon="🔤" name="Vocab + Rush" use="Roz naye words + Rush se revision. English + GA dono strong." />
            <FeatureRow icon="🧮" name="Calculation" use="Tables/squares/cubes/roots speed — roz 10 min. Quant timer beat karne ke liye." />
            <FeatureRow icon="🗃️" name="Quiz Bank" use="Topic-wise practice — jahan kamzor ho wahan zyada." />
            <FeatureRow icon="🧪" name="Mock Tests" use="Phase 2–3 mein sectional + full mocks, timer ON." />
            <FeatureRow icon="📰" name="Current Affairs" use="Roz ki entry + quiz + important facts. GA ke free marks." />
            <FeatureRow icon="🔴" name="Mistake Notebook" use="Sabse important. Roz review + re-attempt. Yahi score badhata hai." />
          </div>
        </div>
      </section>

      {/* Strict rules */}
      <section className="section" style={CARD}>
        <div className="glass-card" style={{ borderColor: "rgba(251,113,133,0.4)" }}>
          <h3>⛔ Strict Rules — koi bahana nahi</h3>
          <ul className="rm-list">
            <li><strong>Phone side.</strong> Study time mein Strict Focus popup ke alawa kuch nahi.</li>
            <li><strong>#1 target pehle.</strong> Jab tak wo start/khatam na ho, doosra kaam nahi.</li>
            <li><strong>Zero-day allowed nahi.</strong> Thak gaye ho? Minimum: vocab + 1 calc drill + mistake review.</li>
            <li><strong>Har galti analyse.</strong> Bina reason samjhe agla question nahi.</li>
            <li><strong>Roz sync.</strong> Cloud sync ON rakho — progress kabhi loss na ho.</li>
            <li><strong>Weekly review.</strong> Har Sunday: Weak Area Tracker dekho, agle hafte ka plan banao.</li>
          </ul>
        </div>
      </section>

      {/* Exam day */}
      <section className="section" style={CARD}>
        <div className="glass-card">
          <h3>🧠 Exam-Day Strategy</h3>
          <ul className="rm-list">
            <li>Order: <strong>English → Reasoning → GA → Quant</strong> (strong pehle, confidence + time bachao).</li>
            <li>Quant sabse aakhir — jitna hoga utna, baaki accuracy pe focus.</li>
            <li>Pehle round mein sirf <strong>sure questions</strong>, doubtful ko mark karke aage badho.</li>
            <li>Time: GA ~7 min, English ~12, Reasoning ~13, Quant ~25, 3 min buffer.</li>
            <li>Random guess = negative. 50-50 pe hi calculated guess.</li>
          </ul>
          <p className="hint" style={{ marginTop: 10 }}>Aaj se roz thoda-thoda, exam tak. <strong>Discipline hi cutoff clear karayega.</strong> 🚀</p>
        </div>
      </section>
    </>
  );
}

function FeatureRow({ icon, name, use }) {
  return (
    <div className="rm-phase">
      <h4>{icon} {name}</h4>
      <p className="muted" style={{ fontSize: "0.86rem", lineHeight: 1.55 }}>{use}</p>
    </div>
  );
}
