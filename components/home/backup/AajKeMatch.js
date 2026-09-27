/* ═══════════════════════════════════════════════════════════════════
   🗄️ BACKUP — "🏟️ Aaj ke match" wala box (Scoreboard ka purana neechla
   hissa). Ye kahin se IMPORT NAHI hota; sirf sambhal kar rakha hai.

   Owner: "e vala jo pehle vala box hai usko kahin par backup rakh de,
   wo abhi nahi chahiye — baad mein kabhi dekhenge."

   Uski jagah ab Subject Hub wale chaar khaane hain
   (components/home/parts.js -> SubjectBoxes).

   Wapas lagana ho to: neeche wala JSX HomeScore ke andar <SubjectBoxes>
   ki jagah rakh do, aur sabse neeche wali CSS home2.css mein daal do.
   Isko `secOf`, `splitTitle` aur `Tick` chahiye — teeno ./parts se.
   ═══════════════════════════════════════════════════════════════════ */

// ── JSX ────────────────────────────────────────────────────────────
/*
      <section className="hE-fix">
        <h3>🏟️ Aaj ke match</h3>
        {d.work.map((b) => {
          const now = d.cur && d.cur.id === b.id;
          return (
            <div key={b.id} className={`hE-row${now ? " is-now" : ""}${isDone(d, b) ? " is-ok" : ""}`} style={{ "--sc": secOf(b).c }}>
              <span className="hE-row__t">{b.start}</span>
              <span className="hE-row__n">{splitTitle(b)[0]}</span>
              <span className="hE-row__s">{isDone(d, b) ? "JEETA ✓" : now ? "LIVE ●" : b.e <= d.nowMin ? "CHHOOTA" : "AAGE"}</span>
              <Tick ok={isDone(d, b)} onClick={() => d.toggle(b.id)} />
            </div>
          );
        })}
      </section>
*/

// ── CSS (home2.css mein thi) ───────────────────────────────────────
/*
.hE-fix { padding: 14px 16px; border-radius: 16px; background: var(--tb-page); border: 1px solid var(--tb-line); }
.hE-fix h3 { margin: 0 0 8px; font-size: 0.95rem; }
.hE-row { display: grid; grid-template-columns: 56px minmax(0, 1fr) 90px 26px; gap: 10px; align-items: center; padding: 8px 6px; border-top: 1px solid var(--tb-line-soft); border-left: 3px solid var(--sc); }
.hE-row__t { font-family: ui-monospace, Consolas, monospace; font-size: 0.82rem; color: var(--tb-dim); }
.hE-row__n { font-weight: 600; font-size: 0.9rem; }
.hE-row__s { font-size: 0.66rem; font-weight: 900; letter-spacing: 0.1em; color: var(--tb-dim); text-align: right; }
.hE-row.is-now { background: color-mix(in srgb, var(--sc) 14%, transparent); }
.hE-row.is-now .hE-row__s { color: #e5484d; }
.hE-row.is-ok .hE-row__s { color: var(--tb-green); }
*/
