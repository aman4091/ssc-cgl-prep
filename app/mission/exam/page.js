import Link from "next/link";

// /mission/exam — exam ke din ka poora protocol. Mock mein bhi yahi follow karo,
// taaki 1 Oct ko kuch naya na lage.

export const metadata = { title: "Exam-day rules · CGL Mission" };

export default function MissionExamPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🎯 Exam-day rules</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Har mock mein <span className="grad">yahi</span> — exam mein bhi yahi
        </h1>
        <p className="hero__sub">Section lock 15 min, order Reasoning → GS → Maths → English. +2 sahi, −0.5 galat.</p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="ms-h2">1. Tukka kab maarna hai (EXACT rule)</h2>
        <div className="glass-card ms-alert ms-alert--info" style={{ fontSize: "1rem" }}>
          <strong>Kam se kam 1 option kaat sako → tukka maaro. Ek bhi nahi kata → chhodo.</strong>
        </div>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Haalat</th><th>Sahi ka chance</th><th>Expected marks</th><th>Kya karo</th></tr></thead>
            <tbody>
              <tr><td>Pakka / 80%+</td><td>0.8+</td><td>+1.5</td><td className="ms-ok">✅ Mark</td></tr>
              <tr><td>2 option bache (50-50)</td><td>0.5</td><td>+0.75</td><td className="ms-ok">✅ Hamesha mark</td></tr>
              <tr><td>1 option kata (3 bache)</td><td>0.33</td><td>+0.33</td><td className="ms-ok">✅ Mark</td></tr>
              <tr><td>Ek bhi nahi kata (blind)</td><td>~0.25, trap option mein &lt;0.2</td><td>~0</td><td className="ms-bad">❌ Chhodo</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Hisaab: 2p − 0.5(1−p). Break-even p = 20%. Blind tukke ka ~+0.1 fayda SSC ke trap options kha jaate hain — aur time bhi jaata hai.</p>
      </section>

      <section className="section">
        <h2 className="ms-h2">2. Har section ka minute plan (15 min)</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Section</th><th>Round 1</th><th>Round 2</th><th>Aakhri 90 sec</th><th>Attempt</th><th>Checkpoint</th></tr></thead>
            <tbody>
              <tr><td><strong>🧠 Reasoning</strong></td><td>0–10 min: seating/puzzle/figure-counting chhod ke sab (~20 Q)</td><td>10–13.5: marked Q</td><td>Protocol</td><td>24–25</td><td>10 min pe ≥20</td></tr>
              <tr><td><strong>🌍 GS</strong></td><td>0–6 min: 5-sec wale (15–17 Q)</td><td>6–13.5: 50-50 / statement wale — har statement alag check</td><td>Protocol</td><td>22–25</td><td>6 min pe ≥15</td></tr>
              <tr><td><strong>🧮 Maths</strong></td><td>0–9 min: sirf 1-liner. <strong>Kisi Q pe 60 sec se zyada nahi</strong></td><td>9–13.5: marked medium, max 75 sec</td><td>Option-elimination (approx / unit digit / value daalo) se hi</td><td>21–23</td><td><strong>5 min ≥8 · 9 min ≥14 · 13.5 min ≥20</strong></td></tr>
              <tr><td><strong>📘 English</strong></td><td>0–4 min: vocab + FIB (~10 Q)</td><td>4–9: cloze + RC · 9–13: error / SI / voice / jumble (checklist)</td><td>Protocol</td><td>23–24 (≤2 galat)</td><td>9 min pe ≥18</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Maths kyun aise: 7–8 sawaal isliye chhootte hain kyunki 2–3 lambe Q pe 2–3 min chale jaate hain. Round-1 ka 60-sec cap yahi rokta hai.</p>
        <p className="hint"><strong>Error-spotting checklist:</strong> SVA → tense → article → preposition → pronoun → comparison → parallelism → redundancy.</p>
      </section>

      <section className="section">
        <h2 className="ms-h2">3. Aakhri 2 minute ka protocol (har section)</h2>
        <div className="glass-card" style={{ padding: 14 }}>
          <ol className="ms-list">
            <li>Question palette dekho — kitne unanswered / marked.</li>
            <li><strong>Koi naya lamba Q shuru mat karo.</strong></li>
            <li>Har marked Q ko 20 sec: option kaato → 1+ kata to best mark, warna chhodo.</li>
            <li>"Answered &amp; Marked for Review" gina jaata hai — par check karo option sach mein select hai.</li>
            <li>Aakhri 10 sec koi jawab mat badlo.</li>
          </ol>
          <p className="hint" style={{ margin: 0 }}>Agar exam mein section lock NAHI nikla (60 min combined): GS 10 → Reasoning 13 → English 13 → Maths 22 + 2 min buffer.</p>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">4. Aakhri 7 din — kya NAHI karna</h2>
        <div className="glass-card" style={{ padding: 14 }}>
          <ul className="ms-list">
            <li>❌ 25 Sep ke baad koi naya chapter/topic — ghabrahat badhti hai, yaad nahi rehta.</li>
            <li>❌ Koi naya book / channel / source.</li>
            <li>❌ Din mein 1 se zyada mock. 30 Sep ko koi mock nahi.</li>
            <li>❌ Super-hard mock series — confidence girta hai, fayda nahi.</li>
            <li>❌ Telegram / "expected cutoff" ki behas, rank ka obsession.</li>
            <li>❌ Neend ka time badalna, raat bhar padhna. 30 Sep: dinner ke baad seedha so jao.</li>
            <li>❌ Exam mein skip list todna ("bas ye geometry wala kar leta hoon").</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">5. Exam ki subah</h2>
        <div className="glass-card" style={{ padding: 14 }}>
          <ul className="ms-list">
            <li>Shift ke hisaab se utho (5:15 wali aadat kaam aayegi).</li>
            <li>20 min halki revision — sirf fact log / CA. Naye Maths Q nahi.</li>
            <li>10 min calc warm-up (haath garam).</li>
            <li>Bag: admit card + photo ID + jo admit card mein likha ho. Centre jaldi pahuncho.</li>
          </ul>
        </div>
        <p className="hint"><Link href="/mission/topics">Topics &amp; skip list →</Link> · <Link href="/mission">Aaj ka din →</Link></p>
      </section>
    </>
  );
}
