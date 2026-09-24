"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMocks } from "@/lib/mockmarks";
import {
  getMission, evaluateCheckpoints, TARGETS, CP_KEYS, SECTIONS, RULES, setAdapt, sectionStatsIn, checkpointWindows,
  FLOOR, TARGET, FLOOR_NOTE, PCT_NOW, PCT_TARGET, fmtDay, gsTrack,
} from "@/lib/mission";

// /mission/progress — checkpoints, seedha /mock-marks ke data se.
//
// MASTER METRIC = PERCENTILE. Score paper ki mushkil se hilta hai (ek hi
// tayari par 138 bhi aaya aur 112 bhi), par percentile sabke saath naapta hai.
// Isliye sabse upar percentile ka graph, uske baad hi score ki table.
//
// Har section ka avg score, attempt aur galat — "mission se pehle", CP1, CP2,
// CP3, aakhri — aur har checkpoint ka target saath mein. Target se kam raha to
// "agar nahi badha to kya badlo" wala rule yahan dikhta hai, aur "Ye badlav
// lagao" dabate hi aage ke din ki timeline us hisaab se badal jaati hai.

const f1 = (x) => (x == null || !Number.isFinite(x) ? "–" : String(Math.round(x * 10) / 10));

// 📈 Percentile ka safar — har full mock ek bindu, upar target ki lakeer.
function PctGraph({ list }) {
  const pts = list.filter((x) => x.pct != null).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (pts.length < 2) {
    return (
      <div className="placeholder">
        Percentile ka graph 2 mock ke baad banega. Har full mock ke saath <strong>rank</strong> aur <strong>kitne mein se</strong> zaroor daalo —{" "}
        <Link href="/mock-marks?cat=full">/mock-marks</Link>. Score se percentile nahi banta.
      </div>
    );
  }
  const W = 640, H = 220, L = 34, R = 12, T = 12, B = 26;
  const x = (i) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v) => T + ((100 - v) * (H - T - B)) / 100;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <div className="ms-graphwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ms-graph" role="img" aria-label="Percentile trend">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth="1" />
            <text x={4} y={y(g) + 4} fontSize="10" fill="var(--muted)">{g}</text>
          </g>
        ))}
        {/* target ki lakeer */}
        <line x1={L} x2={W - R} y1={y(PCT_TARGET)} y2={y(PCT_TARGET)} stroke="var(--ok, #40a02b)" strokeWidth="2" strokeDasharray="6 4" />
        <text x={W - R} y={y(PCT_TARGET) - 5} fontSize="10" textAnchor="end" fill="var(--ok, #40a02b)">target {PCT_TARGET}</text>
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.pct)} r="4" fill="var(--accent)" stroke="var(--card)" strokeWidth="2">
              <title>{`${p.name || "mock"} · ${p.date} · ${Math.round(p.pct * 10) / 10} %ile · score ${Math.round(p.score * 10) / 10}`}</title>
            </circle>
            {(i === 0 || i === pts.length - 1) && (
              <text x={x(i)} y={y(p.pct) - 10} fontSize="11" textAnchor={i ? "end" : "start"} fill="var(--text)" fontWeight="700">
                {Math.round(p.pct * 10) / 10}
              </text>
            )}
            <text x={x(i)} y={H - 8} fontSize="9" textAnchor="middle" fill="var(--muted)">{String(p.date || "").slice(5).replace("-", "/")}</text>
          </g>
        ))}
      </svg>
      <p className="hint">
        Aakhri: <strong>{Math.round(last.pct * 10) / 10}</strong> %ile (score {Math.round(last.score * 10) / 10}) · target <strong>{PCT_TARGET}</strong>.
        Score badhe par percentile na badhe = tum aasan shift chun rahe ho. Ek easy, ek tough — alternate karo.
      </p>
    </div>
  );
}

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

const tgtText = (t, k) => (k === "E" ? `${t.score} / ≤${t.wrongMax} galat` : k === "GS" ? `${t.score} / ${t.acc}% acc` : `${t.score} / ${t.att} att`);

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
  const cols = [["before", null], ["w1", TARGETS.cp1], ["w2", TARGETS.cp2], ["w3", TARGETS.cp3], ["w4", TARGETS.exam]];
  const allFull = sectionStatsIn(mocks, null, null).full.list;
  const mathTrend = sectionStatsIn(mocks, W.w1.from, null).Q.list.sort((a, b) => a.date.localeCompare(b.date));
  const curLabel = { w1: "CP1 tak", w2: "CP2 tak", w3: "CP3 tak", w4: "Aakhri daur" }[ev.current] || "";

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🚩 Checkpoints</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Percentile <span className="grad">{PCT_NOW} → {PCT_TARGET}</span>
        </h1>
        <p className="hero__sub">
          Master metric <strong>percentile</strong> hai, score nahi. Score sirf ye batata hai ki aaj ka paper kaisa tha; percentile batata hai
          ki baaki sab ke saamne kahan khade ho. Target {TARGET.total} · floor {FLOOR.total}.
          Abhi: <strong>{curLabel}</strong> (Day {ev.day}).
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="ms-h2">📈 Percentile — asli metric</h2>
        <PctGraph list={allFull} />
        <div className="ms-tablewrap" style={{ marginTop: 10 }}>
          <table className="ms-table">
            <thead><tr><th>Checkpoint</th><th>Din</th><th>Percentile target</th><th>Score target</th></tr></thead>
            <tbody>
              {CP_KEYS.map((k) => {
                const t = TARGETS[k];
                // Sirf mission ke andar ke mock — mission se pehle wale har
                // checkpoint mein ghus jaate the aur teeno mein ek hi number dikhta tha.
                const win = W[{ cp1: "w1", cp2: "w2", cp3: "w3" }[k]];
                const got = allFull.filter((f) => f.pct != null && win && f.date >= W.w1.from && f.date <= win.to);
                const last = got[got.length - 1];
                return (
                  <tr key={k}>
                    <td><strong>{t.label}</strong></td>
                    <td>D{t.day}</td>
                    <td>
                      <strong>{t.pct}</strong>
                      {last ? <span className={last.pct >= t.pct ? " ms-ok" : " ms-bad"}> · aaya {Math.round(last.pct * 10) / 10}</span> : <span className="muted"> · –</span>}
                    </td>
                    <td>{t.full}</td>
                  </tr>
                );
              })}
              <tr><td><strong>{TARGETS.exam.label}</strong></td><td>—</td><td><strong>{TARGETS.exam.pct}</strong></td><td><strong>{TARGETS.exam.full}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Section</th><th>TARGET (jahan pahunchna hai)</th><th>FLOOR (isse neeche nahi)</th></tr></thead>
            <tbody>
              {SECTIONS.map((S) => (
                <tr key={S.k}>
                  <td><strong>{S.icon} {S.label}</strong></td>
                  <td><strong>{TARGET[S.k]}</strong></td>
                  <td>{FLOOR[S.k]} <span className="hint">· {FLOOR_NOTE[S.k]}</span></td>
                </tr>
              ))}
              <tr><td><strong>Total</strong></td><td><strong>{TARGET.total}</strong></td><td>{FLOOR.total}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Exam hall mein FLOOR le ke ghuso, TARGET nahi. "Maths mein 38 chahiye" leke baithoge to 13:00 pe 18 attempt dekh ke panic mein 4 jaldi-jaldi maaroge, 3 galat. Floor mile to target paper aasan hone par apne aap aa jaata hai.</p>
      </section>

      {(() => {
        const g = gsTrack(mocks, m);
        return (
          <section className="section">
            <h2 className="ms-h2">🌍 GS track — baseline {g.base ? `${Math.round(g.base.score * 10) / 10} (${fmtDay(g.base.date)})` : "abhi nahi"}</h2>
            <div className="ms-tablewrap">
              <table className="ms-table">
                <thead><tr><th>Din</th><th>Target (GS sectional)</th><th>Aaya</th><th>Nahi mila to</th></tr></thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.day}>
                      <td>{fmtDay(r.date)} (D{r.day})</td>
                      <td><strong>{r.score}</strong></td>
                      <td>{r.got ? <strong className={r.got.score >= r.score ? "ms-ok" : "ms-bad"}>{Math.round(r.got.score * 10) / 10}</strong> : <span className="muted">{r.reached ? "GS sectional do!" : "–"}</span>}</td>
                      <td className="hint">{r.miss}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">GS mein effort aur marks ka rishta seedha hai: roz 100–125 PYQ + 28–35 naye cluster + purane revise. Har ~3 din ek GS sectional (Testbook = PYQ) /mock-marks → GK/GS mein. 21.9 → 30 = +8 marks, poore plan ka sabse bada hissa.</p>
          </section>
        );
      })()}

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="ms-h2">Section-wise — checkpoint ke hisaab se</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead>
              <tr>
                <th>Section</th>
                {cols.map(([k, t]) => (
                  <th key={k}>{W[k].label}{t ? <div className="hint">target {W[k].date ? fmtDay(W[k].date) : t.label}</div> : null}</th>
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
              <tr>
                <td><strong>📈 Percentile</strong></td>
                {cols.map(([k, t]) => {
                  const st = ev.stats[k].full;
                  return (
                    <td key={k}>
                      {st.pct != null ? <strong className={t ? (st.pct >= t.pct ? "ms-ok" : "ms-bad") : ""}>{f1(st.pct)}</strong> : <span className="muted">–</span>}
                      {t ? <div className="hint">target {t.pct}</div> : null}
                    </td>
                  );
                })}
              </tr>
              <tr className="ms-tgt">
                <td>Target</td>
                <td className="muted">—</td>
                {[TARGETS.cp1, TARGETS.cp2, TARGETS.cp3, TARGETS.exam].map((t, i) => (
                  <td key={i} className="hint">
                    R {tgtText(t.R, "R")}<br />GS {tgtText(t.GS, "GS")}<br />Q {tgtText(t.Q, "Q")}<br />E {tgtText(t.E, "E")}<br />Full {t.full} · %ile {t.pct}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">Ye badlav lagao — agar nahi badha to</h2>
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
          <strong>Ek mock kabhi plan nahi badalta.</strong> Score = skill + paper ki mushkil + luck (tumhare full mock mein 93 se 138.5 tak ka
          jhool), isliye rule tabhi jab <strong>pichhle 3 mein se 2</strong> mock target se neeche hon. Attempt count sirf tumhara behaviour hai —
          uspe ek reading kaafi. Checkpoint rule 🚩 din ke baad hi jaagte hain.
        </p>
      </section>

      <section className="section">
        <h2 className="ms-h2">🧮 Maths speed — attempt har mock mein (mission ke dauraan)</h2>
        {mathTrend.length === 0 ? (
          <div className="placeholder">Abhi mission ke dauraan koi Maths mock nahi. Target: attempt 19 (CP1) → 20 (CP2) → 21 (CP3) → 22 exam.</div>
        ) : (
          <div className="ms-bars">
            {mathTrend.map((x, i) => (
              <div key={i} className="ms-bar" title={`${x.name} · ${x.c}C ${x.w}W`}>
                <div className="ms-bar__fill" style={{ height: `${Math.round(((x.c + x.w) / 25) * 100)}%` }} data-ok={x.c + x.w >= 21 ? "1" : "0"} />
                <span className="ms-bar__v">{x.c + x.w}</span>
                <span className="ms-bar__d">{x.date.slice(8)}/{x.date.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="hint">Bar = attempt (25 mein). Hara = 21+. <Link href="/mock-marks?cat=maths">Maths marks →</Link></p>
      </section>
    </>
  );
}
