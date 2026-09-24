"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMocks, mockTotals, percentileOf } from "@/lib/mockmarks";
import { BUCKETS, ANALYSIS_STEPS, getAnalyses, getAnalysis, saveAnalysis } from "@/lib/mission";

// /mission/analysis — mock ke baad ka 30 minute (sectional: 10).
//
// Purana 7-bucket system (W1–W4 / S1 / S2 / T1) HATA diya gaya hai — wo bhara
// hi nahi jaata tha. Ab sirf TEEN bucket, aur wo bhi sirf Maths aur English
// mein:
//
//   🟢 aata tha, ho gaya                     → kuch nahi karna
//   🟡 aata tha par time laga / chhoot gaya  → SHORT METHOD likho (yahi sona hai)
//   🔴 nahi aata tha                         → skip list
//
// GS mein bucket nahi hota: har galat/unsure Q ka seedha CLUSTER banta hai aur
// fact log mein jaata hai. 🟡 wale Q 3 din baad revision mein khud aa jaate
// hain (timed, target <40 sec).

const fmtDate = (d) => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); } catch { return d; } };
const ZERO = { g: 0, y: 0, r: 0 };

// Ek subject ke teen bucket — ginti +/− se.
function BucketRow({ title, val, set, note }) {
  return (
    <div className="glass-card" style={{ padding: 14, marginBottom: 10 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
        <strong>{title}</strong>
        <span className="hint">{(val.g || 0) + (val.y || 0) + (val.r || 0)} Q</span>
      </div>
      <p className="hint" style={{ margin: "2px 0 8px" }}>{note}</p>
      <div className="ms-types">
        {BUCKETS.map((b) => (
          <div key={b.k} className="glass-card ms-type">
            <div className="row between" style={{ flexWrap: "nowrap" }}>
              <strong>{b.icon} {b.t}</strong>
              <span className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                <button className="btn btn--ghost btn--sm" onClick={() => set({ ...val, [b.k[0]]: Math.max(0, (val[b.k[0]] || 0) - 1) })}>−</button>
                <strong style={{ minWidth: 22, textAlign: "center" }}>{val[b.k[0]] || 0}</strong>
                <button className="btn btn--ghost btn--sm" onClick={() => set({ ...val, [b.k[0]]: (val[b.k[0]] || 0) + 1 })}>+</button>
              </span>
            </div>
            <p className="hint" style={{ margin: "4px 0 0" }}>{b.tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisInner() {
  const sp = useSearchParams();
  const [mocks, setMocks] = useState([]);
  const [sel, setSel] = useState("");
  const [steps, setSteps] = useState({});
  const [actions, setActions] = useState(["", "", ""]);
  const [note, setNote] = useState("");
  const [buckets, setBuckets] = useState(ZERO);   // Maths
  const [ebuckets, setEbuckets] = useState(ZERO); // English
  const [clusters, setClusters] = useState("");   // GS — kitne naye cluster bane
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
    setSteps(a?.steps || {});
    setActions(a?.actions?.length ? [...a.actions, "", "", ""].slice(0, 3) : ["", "", ""]);
    setNote(a?.note || "");
    setBuckets(a?.buckets || ZERO);
    setEbuckets(a?.ebuckets || ZERO);
    setClusters(a?.clusters ?? "");
    setYellow((a?.yellow || []).join("\n"));
    setSaved("");
  }, [sel]);

  const mock = mocks.find((x) => x.id === sel);
  const tot = mock ? mockTotals(mock) : null;
  const pc = mock ? percentileOf(mock.rank, mock.outOf) : null;
  const yTotal = (buckets.y || 0) + (ebuckets.y || 0);
  const gTotal = (buckets.g || 0) + (ebuckets.g || 0);

  // Ab tak ke saare analysis milake — 🟡 ka dher hi asli kaam ki list hai.
  const agg = useMemo(() => {
    const out = { g: 0, y: 0, r: 0, cl: 0 };
    for (const a of all) {
      for (const k of ["g", "y", "r"]) out[k] += (Number((a.buckets || {})[k]) || 0) + (Number((a.ebuckets || {})[k]) || 0);
      out.cl += Number(a.clusters) || 0;
    }
    return out;
  }, [all]);

  const save = () => {
    if (!mock) return;
    const yl = yellow.split("\n").map((s) => s.trim()).filter(Boolean);
    const next = saveAnalysis({
      id: mock.id, name: mock.name, date: mock.date, steps, buckets, ebuckets,
      clusters: clusters === "" ? null : Number(clusters),
      yellow: yl, actions: actions.map((s) => s.trim()).filter(Boolean), note,
    });
    setAll(next);
    setSaved(`✓ Save ho gaya — action items agle 2 din Home par${yl.length ? `, aur ${yl.length} yellow Q 3 din baad revision mein (timed)` : ""}.`);
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🔍 Mock Analysis</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Sirf <span className="grad">3 bucket</span> — 30 minute, bas
        </h1>
        <p className="hero__sub">
          Full mock = 30 min, sectional = 10 min. Pehle marks + <strong>rank</strong> <Link href="/mock-marks?cat=full">/mock-marks</Link> mein
          daalo (percentile wahi se banta hai — asli metric wahi hai), fir yahan.
        </p>
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
                {pc != null
                  ? <span className="chip">📈 <strong>{pc}</strong> %ile</span>
                  : <span className="chip" style={{ color: "var(--danger)" }}>📈 percentile nahi — rank daalo</span>}
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
              <p className="hint" style={{ margin: "8px 0 0" }}>
                ⚠️ <strong>Solution dekhne se PEHLE</strong> re-solve karo — answer pata ho to time jhootha (kam) aata hai. Solution pehle dekh
                liya? To jo Q sirf isliye jaldi hua kyunki answer yaad tha, use 🟡 hi maano, 🟢 nahi.
              </p>
            </div>
          </section>

          <section className="section">
            <h2 className="ms-h2">2. Teen bucket — sirf Maths aur English</h2>
            <BucketRow
              title="🧮 Maths"
              val={buckets}
              set={setBuckets}
              note="Section 900 sec ka hai: 21 attempt = 43 sec/Q. '90 sec mein ho gaya' ka exam mein matlab 'nahi hua'. 18.5 → 22 attempt ka raasta naye sawaal seekhna nahi — YELLOW ko GREEN banana hai."
            />
            <BucketRow
              title="📘 English"
              val={ebuckets}
              set={setEbuckets}
              note="Attempt 23 (25 nahi). Har galat Q par RULE KA NUMBER log karo, chapter ka naam nahi — 12 rule ki list /notes/goldenrules par hai."
            />
            <div className="glass-card ms-alert ms-alert--info">
              <strong>🌍 GS mein bucket nahi hota.</strong> Har galat ya shak wale Q ka seedha <strong>CLUSTER</strong> banao — poora group ek
              line mein (6–12 fact), aur wo <Link href="/mission/facts">fact log</Link> mein. Sirf us ek fact ko likhna bekaar hai.
              <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <label className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <span style={{ fontSize: "0.88rem" }}>Is mock se naye cluster:</span>
                  <input className="input" type="number" min="0" style={{ width: 90, padding: "6px 10px" }}
                    value={clusters} onChange={(e) => setClusters(e.target.value)} />
                </label>
                <Link href="/mission/facts" className="btn btn--sm">🧠 Fact log kholo</Link>
              </div>
            </div>
            <div className="glass-card ms-form" style={{ padding: 14 }}>
              <strong>🟡 Yellow ka SHORT METHOD — yahi is poore kaam ka sona hai</strong>
              <textarea className="textarea input" rows={5} value={yellow} onChange={(e) => setYellow(e.target.value)}
                placeholder={"Har YELLOW Q ek line mein — Q# · chapter/rule · kitne sec · short method\ne.g. Q7 · P&L · 62s · MP:CP = (100+p):(100−d)\ne.g. Q14 · Rule 4 (fixed preposition) · deprived OF"} />
              {yTotal > 0 && (
                <p className="hint" style={{ margin: "6px 0 0" }}>
                  Kaam: {yTotal} yellow mein se ~{Math.ceil(yTotal * 0.66)} ko green banana. Green abhi {gTotal} → exam-ready attempt
                  ~{gTotal + Math.ceil(yTotal * 0.66)}. Ye list 3 din baad revision mein khud aayegi — timed, target &lt;40 sec.
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
          <h2 className="ms-h2">Ab tak ke {all.length} analysis</h2>
          <div className="row" style={{ gap: 6 }}>
            <span className="chip">🟢 {agg.g}</span>
            <span className="chip">🟡 {agg.y}</span>
            <span className="chip">🔴 {agg.r}</span>
            <span className="chip">🧩 {agg.cl} cluster</span>
          </div>
          <p className="hint">
            🟡 ka dher hi asli kaam ki list hai: wahi Q hain jo aate to hain par marks nahi de rahe. 🔴 badhe to ghabrao mat — wo skip list
            hai; phase 2 mein us chapter ka din aayega tab dekhna.
          </p>
        </section>
      )}

      <section className="section">
        <h2 className="ms-h2">Error log ka format (notebook ya Mistakes ke note mein)</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>Date</th><th>Mock</th><th>Sec</th><th>Q#</th><th>Chapter / Rule #</th><th>Bucket</th><th>Time (s)</th><th>Short method / cluster</th><th>Revisit</th></tr></thead>
            <tbody>
              <tr><td>28-09</td><td>FM2</td><td>Q</td><td>17</td><td>P&amp;L</td><td>🟡</td><td>62</td><td>MP:CP = (100+p):(100−d), 20 sec</td><td>D+3 timed</td></tr>
              <tr><td>28-09</td><td>FM2</td><td>E</td><td>4</td><td>Rule 4 · fixed preposition</td><td>🟡</td><td>–</td><td>deprived OF, devoid OF</td><td>D+3</td></tr>
              <tr><td>28-09</td><td>FM2</td><td>GS</td><td>9</td><td>—</td><td>🧩 cluster</td><td>–</td><td>Bharat Ratna: Lata 2001 · Sachin 2014 · Pranab 2019</td><td>fact log</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">GS ki line mein bucket nahi hai — wahan sirf cluster hai. <Link href="/answers?subject=all&amp;src=mock">Galat Q ka screenshot → Answers &amp; Mistakes</Link>.</p>
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
