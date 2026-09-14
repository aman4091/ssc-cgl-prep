"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMocks, mockTotals } from "@/lib/mockmarks";
import { ERR_TYPES, ANALYSIS_STEPS, getAnalyses, getAnalysis, saveAnalysis } from "@/lib/mission";

// /mission/analysis — mock ke baad ka 60 minute (sectional: 20).
//
// Mock dena aadha kaam hai; marks ANALYSIS se badhte hain. Yahan wahi 6 step,
// galtiyon ki ginti type-wise (W1–W4 / S1 / S2 / T1), aur 3 action item — jo
// agle 2 din Home par khud dikhte hain. Galat question ka screenshot/answer
// pehle ki tarah Answers & Mistakes → External Mock mein jaata hai.

const fmtDate = (d) => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); } catch { return d; } };

function AnalysisInner() {
  const sp = useSearchParams();
  const [mocks, setMocks] = useState([]);
  const [sel, setSel] = useState("");
  const [types, setTypes] = useState({});
  const [steps, setSteps] = useState({});
  const [actions, setActions] = useState(["", "", ""]);
  const [note, setNote] = useState("");
  const [buckets, setBuckets] = useState({ g: 0, y: 0, r: 0 });
  const [yellow, setYellow] = useState("");
  const [saved, setSaved] = useState("");
  const [all, setAll] = useState([]);

  useEffect(() => {
    const ms = getMocks();
    setMocks(ms);
    setAll(getAnalyses());
    const q = sp.get("mock");
    setSel(q && ms.some((x) => x.id === q) ? q : (ms[0] && ms[0].id) || "");
  }, [sp]);

  useEffect(() => {
    if (!sel) return;
    const a = getAnalysis(sel);
    setTypes(a?.types || {});
    setSteps(a?.steps || {});
    setActions(a?.actions?.length ? [...a.actions, "", "", ""].slice(0, 3) : ["", "", ""]);
    setNote(a?.note || "");
    setBuckets(a?.buckets || { g: 0, y: 0, r: 0 });
    setYellow((a?.yellow || []).join("\n"));
    setSaved("");
  }, [sel]);

  const mock = mocks.find((x) => x.id === sel);
  const tot = mock ? mockTotals(mock) : null;
  const typeSum = Object.values(types).reduce((a, b) => a + (Number(b) || 0), 0);

  // Saare analysis milake — kaunsi galti sabse zyada (rule: 3 baar → alag slot).
  const agg = useMemo(() => {
    const out = {};
    for (const a of all) for (const [k, v] of Object.entries(a.types || {})) out[k] = (out[k] || 0) + (Number(v) || 0);
    return out;
  }, [all]);

  const bump = (k, d) => setTypes((t) => ({ ...t, [k]: Math.max(0, (Number(t[k]) || 0) + d) }));

  const save = () => {
    if (!mock) return;
    const yl = yellow.split("\n").map((s) => s.trim()).filter(Boolean);
    const next = saveAnalysis({ id: mock.id, name: mock.name, date: mock.date, types, steps, buckets, yellow: yl, actions: actions.map((s) => s.trim()).filter(Boolean), note });
    setAll(next);
    setSaved(`✓ Save ho gaya — action items agle 2 din Home par${yl.length ? `, aur ${yl.length} yellow Q 3 din baad revision mein (timed)` : ""}.`);
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🔍 Mock Analysis</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Marks <span className="grad">analysis</span> se badhte hain
        </h1>
        <p className="hero__sub">Full mock = 60 min, sectional = 20 min. Pehle marks <Link href="/mock-marks?cat=full">/mock-marks</Link> mein daalo, fir yahan.</p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        {mocks.length === 0 ? (
          <div className="placeholder">Abhi koi mock record nahi. <Link href="/mock-marks?cat=full">Pehle marks daalo →</Link></div>
        ) : (
          <div className="glass-card ms-form" style={{ padding: 16 }}>
            <label className="field" style={{ marginBottom: 8 }}>
              <span>Kaunsa mock?</span>
              <select className="select input" value={sel} onChange={(e) => setSel(e.target.value)}>
                {mocks.slice(0, 40).map((x) => (
                  <option key={x.id} value={x.id}>
                    {fmtDate(x.date)} · {x.name} · {mockTotals(x).score}{getAnalysis(x.id) ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </label>
            {tot && (
              <div className="row" style={{ gap: 6 }}>
                {tot.sections.map((s) => (
                  <span key={s.name} className="chip">{s.name}: <strong>{s.score}</strong> · ✅{s.correct} ❌{s.wrong} ⭕{s.unattempted}</span>
                ))}
                <span className="chip">Kul <strong>{tot.score}</strong></span>
              </div>
            )}
          </div>
        )}
      </section>

      {mock && (
        <>
          <section className="section">
            <h2 className="ms-h2">1. Step-by-step (tick karte jao)</h2>
            <div className="glass-card" style={{ padding: 14 }}>
              {ANALYSIS_STEPS.map((s, i) => (
                <div key={i} className="row" style={{ gap: 10, padding: "5px 0", flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <button className={"chk__box" + (steps[i] ? " is-on" : "")} onClick={() => setSteps((x) => ({ ...x, [i]: !x[i] }))} aria-label="tick">{steps[i] ? "✓" : ""}</button>
                  <span style={{ fontSize: "0.9rem" }}><strong>{i + 1}.</strong> {s}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <h2 className="ms-h2">2. Galtiyon ki ginti type-wise {typeSum > 0 && <span className="muted" style={{ fontWeight: 400 }}>· {typeSum}</span>}</h2>
            <div className="ms-types">
              {ERR_TYPES.map((e) => (
                <div key={e.k} className="glass-card ms-type">
                  <div className="row between" style={{ flexWrap: "nowrap" }}>
                    <span><strong>{e.k}</strong> · {e.t}</span>
                    <span className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => bump(e.k, -1)}>−</button>
                      <strong style={{ minWidth: 22, textAlign: "center" }}>{Number(types[e.k]) || 0}</strong>
                      <button className="btn btn--ghost btn--sm" onClick={() => bump(e.k, 1)}>+</button>
                    </span>
                  </div>
                  <p className="hint" style={{ margin: "4px 0 0" }}>{e.tip}</p>
                </div>
              ))}
            </div>
            <p className="hint">Galat question ka screenshot + answer: <Link href="/answers?subject=all&src=mock">Answers & Mistakes → External Mock</Link>. Wahan chapter tag lagta hai, aur chapter-wise report banti hai.</p>
          </section>

          <section className="section">
            <h2 className="ms-h2">🧮 Maths re-solve — stopwatch ke saath</h2>
            <div className="glass-card ms-form" style={{ padding: 14 }}>
              <p className="hint" style={{ margin: "0 0 8px" }}>
                Section 900 sec ka hai: 20 attempt = <strong>45 sec/Q</strong>. "90 sec mein ho gaya" ka exam mein matlab "nahi hua".
                16 → 20 attempt ka raasta naye sawaal seekhna nahi — <strong>YELLOW ko GREEN banana</strong> hai.
              </p>
              <p className="hint" style={{ margin: "0 0 8px" }}>
                ⚠️ <strong>Solution dekhne se PEHLE</strong> re-solve karo — answer pata ho to time jhootha (kam) aata hai.
                Attempt kiye Q ka time Testbook analysis mein har Q ka dikhta hai (wo asli hai). Solution pehle dekh liya? To jo Q
                sirf isliye jaldi hua kyunki answer yaad tha, use 🟡 hi maano, 🟢 nahi.
              </p>
              <div className="ms-types">
                {[
                  ["g", "🟢 GREEN · <40 sec", "Exam-ready — yahi asli attempts hain. Kuch nahi karna."],
                  ["y", "🟡 YELLOW · 40–75 sec", "Aata hai, method lamba. SHORT METHOD likho (neeche) — 3 din baad timed."],
                  ["r", "🔴 RED · >75 sec", "Sahi ho gaya ho tab bhi exam mein SKIP. Ispe 1 min bhi mat kharcho."],
                ].map(([k, t, tip]) => (
                  <div key={k} className="glass-card ms-type">
                    <div className="row between" style={{ flexWrap: "nowrap" }}>
                      <strong>{t}</strong>
                      <span className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => setBuckets((b) => ({ ...b, [k]: Math.max(0, (b[k] || 0) - 1) }))}>−</button>
                        <strong style={{ minWidth: 22, textAlign: "center" }}>{buckets[k] || 0}</strong>
                        <button className="btn btn--ghost btn--sm" onClick={() => setBuckets((b) => ({ ...b, [k]: (b[k] || 0) + 1 }))}>+</button>
                      </span>
                    </div>
                    <p className="hint" style={{ margin: "4px 0 0" }}>{tip}</p>
                  </div>
                ))}
              </div>
              <textarea className="textarea input" rows={4} value={yellow} onChange={(e) => setYellow(e.target.value)}
                placeholder={"Har YELLOW Q ek line mein — Q# · chapter · kitne sec · short method\ne.g. Q7 · P&L · 62s · MP:CP = (100+p):(100−d)"} />
              {buckets.y > 0 && (
                <p className="hint" style={{ margin: "6px 0 0" }}>
                  Kaam: {buckets.y} yellow mein se ~{Math.ceil(buckets.y * 0.66)} ko green banana. Green abhi {buckets.g} → exam-ready attempt ~{buckets.g + Math.ceil(buckets.y * 0.66)}.
                </p>
              )}
            </div>
          </section>

          <section className="section">
            <h2 className="ms-h2">3. Agle 2 din ke 3 action item</h2>
            <div className="glass-card ms-form" style={{ padding: 14 }}>
              {actions.map((a, i) => (
                <input key={i} className="input" style={{ marginBottom: 8 }} value={a}
                  placeholder={["e.g. P&L: MP:CP ratio method se 20 Q", "e.g. 2-circle geometry dekhte hi skip", "e.g. English: 1 bhi option nahi kata to chhodo"][i]}
                  onChange={(e) => setActions((x) => x.map((v, j) => (j === i ? e.target.value : v)))} />
              ))}
              <textarea className="textarea input" rows={3} placeholder="Time audit / koi aur note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn--primary mt-12" onClick={save}>💾 Save analysis</button>
              {saved && <p style={{ color: "var(--ok)", fontSize: "0.85rem", margin: "8px 0 0" }}>{saved}</p>}
            </div>
          </section>
        </>
      )}

      {all.length > 0 && (
        <section className="section">
          <h2 className="ms-h2">Ab tak ke analysis ({all.length}) — sabse zyada kaunsi galti?</h2>
          <div className="row" style={{ gap: 6 }}>
            {ERR_TYPES.filter((e) => agg[e.k]).sort((a, b) => agg[b.k] - agg[a.k]).map((e) => (
              <span key={e.k} className="chip"><strong>{e.k}</strong> {e.t}: {agg[e.k]}</span>
            ))}
          </div>
          <p className="hint">Rule: ek hi chapter/rule mein 3 baar galti → agle din uske liye 30 min ka alag slot. S1 sabse mehnga hai — wo aasaan marks the jo chhoot gaye.</p>
        </section>
      )}

      <section className="section">
        <h2 className="ms-h2">Error log ka format (notebook ya Mistakes ke note mein)</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Date</th><th>Mock</th><th>Sec</th><th>Q#</th><th>Chapter</th><th>Type</th><th>Time (s)</th><th>Kyun galat</th><th>Fix / rule / fact</th><th>Revisit</th></tr></thead>
            <tbody><tr><td>14-09</td><td>FM1</td><td>Q</td><td>17</td><td>P&L</td><td>T1</td><td>140</td><td>CP-SP equation banaya</td><td>MP:CP = (100+p):(100−d), 20 sec</td><td>15, 17, 21</td></tr></tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function MissionAnalysisPage() {
  return (
    <Suspense fallback={<div className="placeholder">…</div>}>
      <AnalysisInner />
    </Suspense>
  );
}
