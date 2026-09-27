/* ═══════════════════════════════════════════════════════════════════
   🗄️ BACKUP — "chaar subject ke khaane" (GS · Maths · English ·
   Mock+Revision). Ye kahin se IMPORT NAHI hota; sirf sambhal kar rakha hai.

   Kuch der ke liye ye Scoreboard ke neeche lage the, "🏟️ Aaj ke match"
   ki jagah. Owner ne wapas purana box maang liya, isliye ye yahan aa gaye
   — aur AajKeMatch.js wapas HomeScore mein chala gaya.

   Wapas lagana ho to:
     1. neeche wala component parts.js mein daal do (use `Link`, `Tick`,
        `Go`, `splitTitle` aur `subjectsOf` chahiye — sab wahin hain),
     2. sabse neeche wali CSS home.css mein daal do,
     3. HomeScore.js mein <section className="hE-fix">…</section> ki jagah
        <SubjectBoxes d={d} /> likh do.
   ═══════════════════════════════════════════════════════════════════ */

// ── Component ──────────────────────────────────────────────────────
/*
// 🗂️ Chaar subject ke khaane — GS, Maths, English, Mock+Revision. Har
// khaane mein aaj ka topic, us subject ke aaj ke saare block (tick ke saath),
// aur do kaam ke link.
//
// Ye pehle sirf "Subject Hub" (roop I) ke andar tha. Owner ne kaha ki roop E
// mein neeche "Aaj ke match" ki jagah yahi chaar box chahiye, isliye yahan
// nikaal liya — ek hi jagah, dono roop wahi dikhate hain.
const SUBJECT_BOXES = [
  { k: "gs", icon: "🌍", t: "GS", c: "#2f9e6e", secs: ["gs"], links: [["/pyq/war", "🎯 PYQ"], ["/mission/facts", "🧠 Fact log"]] },
  { k: "maths", icon: "🧮", t: "Maths", c: "#3b6cff", secs: ["maths"], links: [["/notes/brahmastra", "📐 Formula"], ["/pyq/sprint", "⚡ Sprint"]] },
  { k: "english", icon: "📘", t: "English", c: "#a855f7", secs: ["english", "reasoning"], links: [["/notes/goldenrules", "🏅 Rules"], ["/vocab", "🔤 Vocab"]] },
  { k: "mock", icon: "📝", t: "Mock + Revision", c: "#e5484d", secs: ["mock", "rev"], links: [["/mock-marks", "📊 Marks"], ["/mission/analysis", "🔍 Analysis"]] },
];

export function SubjectBoxes({ d }) {
  const subs = subjectsOf(d);
  const topic = {
    gs: subs.find((s) => s.k === "gs"),
    maths: subs.find((s) => s.k === "maths"),
    english: subs.find((s) => s.k === "english"),
  };
  const isDone = (b) => !!(b && d.doneToday[b.id]);
  return (
    <div className="hI-grid">
      {SUBJECT_BOXES.map((q) => {
        const bl = d.work.filter((b) => q.secs.includes(b.sec));
        const tp = topic[q.k];
        return (
          <section key={q.k} className="hI-q" style={{ "--sc": q.c }}>
            <header>
              <span className="hI-q__ic">{q.icon}</span>
              <h2>{q.t}</h2>
              <span className="hI-q__n">{bl.filter(isDone).length}/{bl.length}</span>
            </header>
            {tp ? <p className="hI-q__tp">{tp.t}</p> : null}
            <ul>
              {bl.map((b) => (
                <li key={b.id} className={`${isDone(b) ? "is-ok" : ""}${d.cur && d.cur.id === b.id ? " is-now" : ""}`}>
                  <Tick ok={isDone(b)} onClick={() => d.toggle(b.id)} />
                  <span className="hI-time">{b.start}</span>
                  <span className="hI-t">{splitTitle(b)[0]}</span>
                  {d.cur && d.cur.id === b.id ? <Go b={b} /> : null}
                </li>
              ))}
            </ul>
            <div className="hI-links">{q.links.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}</div>
          </section>
        );
      })}
    </div>
  );
}
*/

// ── CSS (home.css mein thi) ────────────────────────────────────────
/*
/* ═════ Chaar subject ke khaane (SubjectBoxes) ═════ */
.hI-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.hI-q {
  padding: 16px 18px; border-radius: 20px; display: flex; flex-direction: column; gap: 8px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--sc) 16%, var(--tb-page)), var(--tb-page) 60%); border: 1px solid color-mix(in srgb, var(--sc) 35%, var(--tb-line));
}
.hI-q header { display: flex; align-items: center; gap: 10px; }
.hI-q__ic { font-size: 1.8rem; }
.hI-q h2 { margin: 0; flex: 1; font-size: 1.2rem; color: var(--sc); }
.hI-q__n { font-weight: 900; font-size: 0.9rem; padding: 2px 10px; border-radius: 999px; background: var(--tb-page); }
.hI-q__tp { margin: 0; font-weight: 700; font-size: 1rem; color: var(--tb-q); }
.hI-q ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.hI-q li { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 8px; font-size: 0.86rem; }
.hI-q li.is-now { background: color-mix(in srgb, var(--sc) 20%, transparent); }
.hI-q li.is-ok .hI-t { text-decoration: line-through; color: var(--tb-dim); }
.hI-time { font-size: 0.72rem; color: var(--tb-dim); width: 38px; }
.hI-t { flex: 1; }
.hI-links { margin-top: auto; display: flex; gap: 12px; font-size: 0.82rem; font-weight: 700; }
@media (max-width: 800px) { .hI-grid { grid-template-columns: 1fr; } }
*/
