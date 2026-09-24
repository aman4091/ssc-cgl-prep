import Link from "next/link";

// /mission/exam — exam ke din ka poora protocol (27 Oct 2026). Mock mein bhi
// yahi follow karo, taaki us din kuch naya na lage.

export const metadata = { title: "Exam-day rules · CGL Mission" };

export default function MissionExamPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🎯 Exam-day rules</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Har mock mein <span className="grad">yahi</span> — exam mein bhi yahi
        </h1>
        <p className="hero__sub">
          Exam <strong>27 Oct 2026</strong>. Order <strong>Reasoning → GS → Maths → English</strong>, har section lock 15 min. +2 sahi, −0.5 galat.
          Hall mein FLOOR <strong>142</strong> le ke jao (target 152 apne aap aayega).
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="ms-h2">1. Tukka kab maarna hai (EXACT rule)</h2>
        <div className="glass-card ms-alert ms-alert--info" style={{ fontSize: "1rem" }}>
          <strong>Soch ke tukka: kam se kam 1 option kaat sako tabhi. Har section ke aakhri 40 sec: bache saare blank EK HI letter (jaise C) se bhar do.</strong>
        </div>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Haalat</th><th>Sahi ka chance</th><th>Expected marks</th><th>Kya karo</th></tr></thead>
            <tbody>
              <tr><td>Pakka / 80%+</td><td>0.8+</td><td>+1.5</td><td className="ms-ok">✅ Mark</td></tr>
              <tr><td>2 option bache (50-50)</td><td>0.5</td><td>+0.75</td><td className="ms-ok">✅ Hamesha mark</td></tr>
              <tr><td>1 option kata (3 bache)</td><td>0.33</td><td>+0.33</td><td className="ms-ok">✅ Mark</td></tr>
              <tr><td>English / Reasoning: ek bhi nahi kata — "lagta hai ye" wala</td><td>trap option ki wajah se ~0.2 ya kam</td><td>~0</td><td className="ms-bad">❌ Soch ke mat maaro — time jaata hai</td></tr>
              <tr><td><strong>🌍 GS</strong>: pata nahi, par gut feeling hai</td><td>tumhara GS gut abhi 55% par hai (target 62%)</td><td>+0.85 har Q</td><td className="ms-ok">✅ GS mein SAARE 25 attempt karo</td></tr>
              <tr><td><strong>📘 English</strong>: 2 unknown vocab Q</td><td>—</td><td>25 att @74% = 32 · <strong>23 att @88% = 38.5</strong></td><td className="ms-bad">❌ Chhodo — 23 attempt par ruko</td></tr>
              <tr><td>Aakhri 40 sec ke bache blank (random, ek hi letter)</td><td>0.25</td><td>+0.125 har Q</td><td className="ms-ok">✅ Bhar do (8 blank ≈ +1 mark muft)</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Hisaab: 2p − 0.5(1−p). Break-even p = 20%. Random letter mein trap ka asar nahi (p = 0.25 pakka) — isliye blind fill plus hai. English/Reasoning mein "lagta hai ye" wala tukka trap mein phasta hai — wo mat karo.</p>
        <p className="hint"><strong>GS alag kyun:</strong> tumhara GS abhi 25 attempt par 55% accuracy deta hai — break-even (20%) se bahut upar. Isliye GS mein 25/25 hi bharo, bas pehle pakke wale. <strong>English ulta hai:</strong> wahan 25 attempt accuracy 74% par le aata hai (32 marks), jabki 23 attempt 88% par 38.5 deta hai — 2 Q chhodna +6.5 marks hai.</p>
        <p className="hint"><strong>40 sec kyun, 15 nahi:</strong> CBT mein har blank = navigate + click + next ≈ 5–6 sec. Reasoning/GS mein 2–4 blank, Maths mein 4–5. Pehle full mock mein ek section mein jaan-boojh ke 6 blank chhodo aur time karo kitne sec lage. Ek hi letter isliye ki soch-vichar ka kaam na bane (answer key mein options lagbhag barabar baante hote hain — koi bhi letter chalega).</p>
      </section>

      <section className="section">
        <h2 className="ms-h2">2. Har section ka minute plan (15 min)</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Section</th><th>Round 1</th><th>Round 2</th><th>Aakhri 90 sec</th><th>Attempt</th><th>Checkpoint</th></tr></thead>
            <tbody>
              <tr><td><strong>🧠 Reasoning</strong> (pehle — sabse strong, confidence set hota hai)</td><td>0–10 min: seating/puzzle/figure-counting chhod ke sab (~20 Q)</td><td>10–13.5: marked Q</td><td>Protocol</td><td>23–24 (floor 42, target 44)</td><td>10 min pe ≥20</td></tr>
              <tr><td><strong>🌍 GS</strong> (doosra — 15 min se zyada kabhi nahi)</td><td>0–6 min: 5-sec wale (15–17 Q)</td><td>6–13.5: 50-50 / statement wale — har statement alag check</td><td>Protocol · GS mein saare 25 bharo</td><td>25 (floor 27, target 30)</td><td>6 min pe ≥15</td></tr>
              <tr><td><strong>🧮 Maths</strong></td><td><strong>0:00–0:40 sirf SCAN</strong> (25 Q scroll, mentally GREEN / YELLOW / RED — solve nahi). 0:40–9:00 sirf GREEN. <strong>Kisi Q pe 60 sec se zyada nahi</strong></td><td>9–13.5: YELLOW, max 75 sec. RED ko haath nahi</td><td>13.5–14:20 option-elimination (approx / unit digit / value daalo) · 14:20–15:00 blind fill</td><td>21–22 (floor 35, target 38)</td><td><strong>5 min ≥8 · 9 min ≥15 · 13.5 min ≥20</strong></td></tr>
              <tr><td><strong>📘 English</strong></td><td>0:00–3:30 vocab (Syn/Ant/OWS/Idiom/Spelling) + FIB — 5–10 sec/Q. <strong>3:30–8:00 error spotting + sentence improvement + voice/narration</strong> (8-step checklist, fresh dimaag — 60% galtiyan yahin)</td><td>8:00–11:30 cloze · 11:30–14:00 RC (tough passage ho to 2 Q chhodo)</td><td>14:00–15:00 marked review + blank fill</td><td><strong>23 — 25 NAHI</strong>, ≤3 galat (floor 37, target 40)</td><td>8 min pe ≥16</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Maths kyun aise: 7–8 sawaal isliye chhootte hain kyunki Q1 se seedhe chalte hue Q3 jaise lambe sawaal pe 2–3 min chale jaate hain. 40 sec ka scan 2 min bachata hai, aur round-1 ka 60-sec cap baaki rokta hai.</p>
        <div className="glass-card ms-alert ms-alert--bad"><strong>Exam hall mein FLOOR le ke jao (142), 152 nahi.</strong> "Maths mein 38 chahiye" wala dimaag 13:00 pe 18 attempt dekh ke panic mein 4 jaldi-jaldi marwata hai — 3 galat. Floor mile to target paper aasan hone par apne aap aa jaata hai.</div>
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
            <li><strong>Aakhri 40 sec:</strong> jo blank bache hain unhe ek hi letter (jaise C) se bhar do — soch mat, bas bharo.</li>
            <li>Uske baad koi jawab mat badlo.</li>
          </ol>
          <p className="hint" style={{ margin: 0 }}>Agar exam mein section lock NAHI nikla (60 min combined): GS 10 → Reasoning 13 → English 13 → Maths 22 + 2 min buffer.</p>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">4. Aakhri 7 din — kya NAHI karna</h2>
        <div className="glass-card" style={{ padding: 14 }}>
          <ul className="ms-list">
            <li>❌ Exam se 6 din pehle ke baad koi naya chapter/topic — ghabrahat badhti hai, yaad nahi rehta.</li>
            <li>❌ Koi naya book / channel / source.</li>
            <li>❌ Din mein 1 se zyada mock. Exam se ek din pehle koi mock nahi.</li>
            <li>❌ Taper sirf aakhri 2 din (25–26 Oct) — usse pehle halka mat karo.</li>
            <li>❌ Super-hard mock series — confidence girta hai, fayda nahi.</li>
            <li>❌ Telegram / "expected cutoff" ki behas, rank ka obsession.</li>
            <li>❌ Neend ka time badalna, raat bhar padhna. Exam se pehli raat: dinner ke baad seedha so jao.</li>
            <li>❌ Site mein naye feature jodne baithna — wo "productive dikhne wali" taalne ki aadat hai. Plan bana hua hai, bas chalao.</li>
            <li>❌ Exam mein skip list todna ("bas ye geometry wala kar leta hoon").</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">5. Shift aur admit card</h2>
        <div className="glass-card" style={{ padding: 14 }}>
          <ul className="ms-list">
            <li>Abhi plan <strong>9:00 wali shift</strong> (Shift 1) par chal raha hai — full mock bhi 9:00 par lagte hain, taaki dimaag usi waqt peak kare.</li>
            <li><strong>10 Oct ke baad</strong> admit card roz check karo (ssc.gov.in / regional site). Shift aate hi <Link href="/mission">Home → ⚙️ Exam date / shift</Link> mein badal do —
              poori timeline (calc drill, mock ka waqt, lunch) usi shift ke hisaab se khisak jaayegi.</li>
            <li>Shift 2 (12:30) mila to: utho wahi 5:30, par mock 12:30 par lagao. Shift 3 (16:00) mila to mock 16:00 par.</li>
            <li>Bag: admit card + photo ID + jo admit card mein likha ho. Centre ka raasta ek din pehle dekh lo.</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">6. Exam ki subah</h2>
        <div className="glass-card" style={{ padding: 14 }}>
          <ul className="ms-list">
            <li>Shift ke hisaab se utho (5:30 wali aadat kaam aayegi).</li>
            <li>20 min halki revision — sirf fact log / CA. Naye Maths Q nahi.</li>
            <li>10 min calc warm-up (haath garam).</li>
            <li>Centre jaldi pahuncho — jaldbaazi se accuracy girti hai.</li>
          </ul>
        </div>
        <p className="hint"><Link href="/mission/topics">Topics &amp; skip list →</Link> · <Link href="/mission">Aaj ka din →</Link></p>
      </section>
    </>
  );
}
