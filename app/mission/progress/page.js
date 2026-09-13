"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMocks } from "@/lib/mockmarks";
import {
  getMission, evaluateCheckpoints, TARGETS, SECTIONS, RULES, setAdapt, sectionStatsIn, checkpointWindows,
  FLOOR, STRETCH, FLOOR_NOTE, fmtDay,
} from "@/lib/mission";

// /mission/progress — hafte-wise checkpoint, seedha /mock-marks ke data se.
//
// Har section ka avg score, attempt aur galat — "mission se pehle", hafta 1,
// hafta 2, aakhri — aur har checkpoint ka target saath mein. Target se kam
// raha to "agar nahi badha to kya badlo" wala rule yahan dikhta hai, aur
// "Ye badlav lagao" dabate hi aage ke din ki timeline us hisaab se badal jaati hai.

const f1 = (x) => (x == null || !Number.isFinite(x) ? "–" : String(Math.round(x * 10) / 10));

function Cell({ st, tgt, k }) {
  if (!st || !st.n) return <td className="muted">–</td>;
  const scoreOk = tgt ? st.score >= tgt.score : null;
  const attOk = tgt && tgt.att ? st.att >= tgt.att : null;
  const wrongOk = tgt && tgt.wrongMax != null ? st.wrong <= tgt.wrongMax : null;
  const cls = (ok) => (ok == null ? "" : ok ? "ms-ok" : "ms-bad");
  return (
    <td>
      <strong className={cls(scoreOk)}>{f1(st.score)}</strong>
      <span className="muted"> · </span>
      {k === "E"
        ? <span className={cls(wrongOk)}>{f1(st.wrong)} galat</span>
        : <span className={cls(attOk)}>{f1(st.att)} att</span>}
      <div className="hint">{st.n} mock{st.n === 1 ? "" : "s"}{st.acc != null ? ` · acc ${Math.round(st.acc)}%` : ""}</div>
    </td>
  );
}

const tgtText = (t, k) => (k === "E" ? `${t.score} / ≤${t.wrongMax} galat` : `${t.score} / ${t.att} att`);

export default function MissionProgressPage() {
  const [m, setM] = useState(null);
  const [mocks, setMocks] = useState([]);

  useEffect(() => {
    const load = () => { setM(getMission()); setMocks(getMocks()); };
    load();
    window.addEventListener("cgl:mission-changed", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { window.removeEventListener("cgl:mission-changed", load); window.removeEventListener("cgl:sync-applied", load); };
  }, []);

  if (!m) return <div className="placeholder">…</div>;
  const ev = evaluateCheckpoints(mocks, m);
  const W = checkpointWindows(m);
  const cols = [["before", null], ["w1", TARGETS.cp1], ["w2", TARGETS.cp2], ["w3", TARGETS.exam]];
  const mathTrend = sectionStatsIn(mocks, W.w1.from, null).Q.list.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🚩 Checkpoints</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Floor <span className="grad">{FLOOR.total}</span> · stretch {STRETCH.total}
        </h1>
        <p className="hero__sub">
          Sab /mock-marks ke data se, apne aap. Hara = target mila, laal = nahi. Score / 50 per section; full mock / 200.
          Abhi: <strong>{ev.current === "w1" ? "Hafta 1" : ev.current === "w2" ? "Hafta 2" : "Aakhri"}</strong> (Day {ev.day}).
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Section</th><th>FLOOR (plan ka base — exam hall mein yahi)</th><th>Stretch (ceiling)</th></tr></thead>
            <tbody>
              {SECTIONS.map((S) => (
                <tr key={S.k}><td><strong>{S.icon} {S.label}</strong></td><td><strong>{FLOOR[S.k]}</strong> <span className="hint">· {FLOOR_NOTE[S.k]}</span></td><td>{STRETCH[S.k]}</td></tr>
              ))}
              <tr><td><strong>Total</strong></td><td><strong>{FLOOR.total}</strong></td><td>{STRETCH.total}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Target hi over-attempt karwata hai: "Maths mein 39 chahiye" leke ghuse to 13:00 pe 18 attempt dekh ke panic mein 4 jaldi-jaldi maaroge, 3 galat. Floor le ke jao — stretch paper aasan ho to apne aap.</p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead>
              <tr>
                <th>Section</th>
                {cols.map(([k, t]) => (
                  <th key={k}>{W[k].label}{t ? <div className="hint">target {k === "w3" ? "exam floor" : `checkpoint ${W[k].date ? fmtDay(W[k].date) : t.label}`}</div> : null}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((S) => (
                <tr key={S.k}>
                  <td><strong>{S.icon} {S.label}</strong></td>
                  {cols.map(([k, t]) => (
                    <Cell key={k} st={ev.stats[k][S.k]} tgt={t ? t[S.k] : null} k={S.k} />
                  ))}
                </tr>
              ))}
              <tr>
                <td><strong>🎯 Full mock</strong></td>
                {cols.map(([k, t]) => {
                  const st = ev.stats[k].full;
                  return (
                    <td key={k}>
                      {st.n ? <strong className={t ? (st.score >= t.full ? "ms-ok" : "ms-bad") : ""}>{f1(st.score)}</strong> : <span className="muted">–</span>}
                      {st.n ? <div className="hint">{st.n} mock{st.n === 1 ? "" : "s"}</div> : null}
                    </td>
                  );
                })}
              </tr>
              <tr className="ms-tgt">
                <td>Target</td>
                <td className="muted">—</td>
                {[TARGETS.cp1, TARGETS.cp2, TARGETS.exam].map((t, i) => (
                  <td key={i} className="hint">
                    R {tgtText(t.R, "R")}<br />GS {tgtText(t.GS, "GS")}<br />Q {tgtText(t.Q, "Q")}<br />E {tgtText(t.E, "E")}<br />Full {t.full}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">Agar nahi badha to — ye badlo</h2>
        {Object.entries(RULES).map(([id, r]) => {
          const on = ev.triggered.includes(id);
          const applied = !!(m.adapt || {})[id];
          return (
            <div key={id} className={"glass-card ms-rule" + (on ? " is-on" : "") + (applied ? " is-applied" : "")}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
                <span>
                  {on ? "⚠️ " : applied ? "✅ " : "○ "}
                  <strong>{r.title}</strong>
                </span>
                {r.adapt && (on || applied) && (
                  <button className={"btn btn--sm " + (applied ? "btn--ghost" : "btn--primary")} onClick={() => setAdapt(id, !applied)}>
                    {applied ? "Hata do" : "Ye badlav lagao"}
                  </button>
                )}
              </div>
              <p className="hint" style={{ margin: "4px 0 0" }}>{r.detail}{!r.adapt && on ? " (Ye aadat ka badlav hai — timeline mein nahi, tumhe khud karna hai.)" : ""}</p>
            </div>
          );
        })}
        <p className="hint">
          <strong>Ek mock kabhi plan nahi badalta.</strong> Score = skill + paper ki mushkil + luck (tumhare Maths mein ±9 ka jhool), isliye score wale
          rule tabhi jab <strong>pichhle 3 mein se 2</strong> mock target se neeche hon. Attempt count sirf tumhara behaviour hai — uspe ek reading kaafi.
          Attempt roz dekho, score sirf 3-mock trend mein. GS/Maths ke checkpoint rule 🚩 din ke baad hi jaagte hain.
        </p>
      </section>

      <section className="section">
        <h2 className="ms-h2">🧮 Maths speed — attempt har mock mein (mission ke dauraan)</h2>
        {mathTrend.length === 0 ? (
          <div className="placeholder">Abhi mission ke dauraan koi Maths mock nahi. Target: attempt 19 (checkpoint 1) → 20 (checkpoint 2) → 20–21 floor (22 stretch).</div>
        ) : (
          <div className="ms-bars">
            {mathTrend.map((x, i) => (
              <div key={i} className="ms-bar" title={`${x.name} · ${x.c}C ${x.w}W`}>
                <div className="ms-bar__fill" style={{ height: `${Math.round(((x.c + x.w) / 25) * 100)}%` }} data-ok={x.c + x.w >= 19 ? "1" : "0"} />
                <span className="ms-bar__v">{x.c + x.w}</span>
                <span className="ms-bar__d">{x.date.slice(8)}/{x.date.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="hint">Bar = attempt (25 mein). Hara = 19+. <Link href="/mock-marks?cat=maths">Maths marks →</Link></p>
      </section>
    </>
  );
}
