"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanPractice from "@/components/PlanPractice";
import { getMission, setDiag } from "@/lib/mission";

// /mission/diagnose — Maths ki dikkat SPEED hai ya CONCEPT? 45 min ka self-test.
//
// Data pehle se ishaara deta hai (accuracy ~88%, par 7–8 chhoote = speed), par
// ek baar khud napna zaroori hai — verdict ke hisaab se Maths ke har block ka
// tareeka badalta hai (lib/mission.js → blocksFor).

const MIX = [
  ["sscmaths", "percentage"], ["sscmaths", "profit-and-loss"], ["sscmaths", "average"], ["sscmaths", "time-and-work"],
  ["sscmaths", "algebra"], ["sscmaths", "trigonometry"], ["sscmaths", "geometry"], ["sscmaths", "mensuration-2d"],
  ["sscmaths", "simplification-and-approximation"], ["sscmaths", "ratio-and-proportion"],
];

function verdictOf({ x, y, z, calcOk }) {
  const X = Number(x) || 0, Y = Number(y) || 0, Z = Number(z) || 0;
  if (Z >= 4 && X + Y >= 5) return "both";
  if (Z >= 4) return "concept";
  if (X + Y >= 5 || calcOk === false) return "speed";
  return "speed";
}
const VERDICT = {
  speed: { t: "SPEED", d: "Concept theek hai — sawaal time ki wajah se chhoot rahe hain. Roz calc drill + 1-liner sprint, 45-sec cap, option-first tricks. Maths blocks isi hisaab se chalenge." },
  concept: { t: "CONCEPT", d: "Kuch chapter bina time limit bhi nahi bane. Sirf wahi chapter (agar Tier A/B mein hain) — 30 min formula → 30 PYQ bina timer → 20 timed. Skip list wale chhodo." },
  both: { t: "DONO", d: "Pehle speed plan (drill + sprint), aur Z wale chapter sirf agar Tier A/B mein hain. Exam se ek hafta pehle ke baad koi naya chapter nahi." },
};

export default function MissionDiagnosePage() {
  const [d, setD] = useState({ x: "", y: "", z: "", zch: "", calc: "", calcMin: "" });
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    const m = getMission();
    if (m.diag) { setD((o) => ({ ...o, ...m.diag })); setSaved(m.diag.verdict || null); }
  }, []);

  const calcOk = d.calc === "" ? null : Number(d.calc) >= 16 && (d.calcMin === "" || Number(d.calcMin) <= 5);
  const v = verdictOf({ ...d, calcOk });
  const save = () => { setDiag({ ...d, verdict: v === "both" ? "speed" : v, raw: v, at: new Date().toISOString() }); setSaved(v === "both" ? "speed" : v); };
  const set = (k) => (e) => setD((o) => ({ ...o, [k]: e.target.value }));

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🩺 Maths self-test</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Speed ya <span className="grad">concept</span>?
        </h1>
        <p className="hero__sub">
          Tumhare data ka pehla ishaara: accuracy ~88%, par har mock mein 7–8 sawaal chhoot rahe hain → <strong>SPEED</strong>.
          45 min ka ye test use pakka karta hai.
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <ol className="ms-list">
            <li><strong>Round A — 15 min, normal:</strong> ek unseen CGL 2025 Maths shift (Testbook), ya site ka 25 Q mix:{" "}
              <span style={{ display: "inline-block", marginTop: 4 }}><PlanPractice auto={{ n: 25, specs: MIX, secs: 36 }} title="Maths self-test — Round A (15 min)" /></span>
              <div className="hint">Kaunse Q kis order mein kiye, note karte jao.</div>
            </li>
            <li><strong>Round B — turant, bina time limit:</strong> jo chhoote the unhe solve karo, stopwatch se har Q ka time likho.</li>
            <li><strong>Gino:</strong> X = chhoote jo ≤90 sec mein sahi bane (speed loss) · Y = sahi bane par &gt;90 sec (method lamba) · Z = bina limit bhi nahi bane (concept gap).</li>
            <li><strong>Calc sub-test — 5 min, 20 calculation</strong> (<Link href="/calculation">/calculation</Link>): 2-digit × 2-digit, 30 tak squares, fraction ↔ %, 3-digit ÷ 1-digit, approx %.</li>
          </ol>
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">Result daalo</h2>
        <div className="glass-card ms-form" style={{ padding: 16 }}>
          <div className="form-grid">
            <label className="field"><span>X (≤90 sec mein bane)</span><input className="input" type="number" min="0" value={d.x} onChange={set("x")} /></label>
            <label className="field"><span>Y (bane par &gt;90 sec)</span><input className="input" type="number" min="0" value={d.y} onChange={set("y")} /></label>
            <label className="field"><span>Z (nahi bane)</span><input className="input" type="number" min="0" value={d.z} onChange={set("z")} /></label>
            <label className="field"><span>Z wale chapter</span><input className="input" value={d.zch} onChange={set("zch")} placeholder="e.g. geometry, mensuration-3d" /></label>
            <label className="field"><span>Calc: 20 mein sahi</span><input className="input" type="number" min="0" max="20" value={d.calc} onChange={set("calc")} /></label>
            <label className="field"><span>Calc: kitne min lage</span><input className="input" type="number" min="0" value={d.calcMin} onChange={set("calcMin")} /></label>
          </div>
          <div className="glass-card ms-alert ms-alert--info" style={{ marginTop: 12 }}>
            <strong>{d.x === "" && d.y === "" && d.z === "" ? "Abhi sirf data ka andaza" : "Verdict"}: {VERDICT[v].t}</strong> — {VERDICT[v].d}
            {calcOk === false && <div className="hint" style={{ marginTop: 4 }}>Calc test 16 se kam / 5 min se zyada → calculation hi bottleneck hai. Roz 15 min calc drill non-negotiable.</div>}
          </div>
          <button className="btn btn--primary mt-12" onClick={save}>💾 Verdict save karo</button>
          {saved && <p style={{ color: "var(--ok)", fontSize: "0.85rem", margin: "8px 0 0" }}>✓ Saved: {VERDICT[saved].t} — aaj se Maths ke blocks isi hisaab se.</p>}
        </div>
      </section>

      <section className="section">
        <h2 className="ms-h2">Dono case ka plan</h2>
        <div className="ms-tablewrap">
          <table className="ms-table">
            <thead><tr><th>SPEED</th><th>CONCEPT (sirf Z wale chapter)</th></tr></thead>
            <tbody>
              <tr>
                <td>
                  <ul className="ms-list">
                    <li>Roz 15 min calc drill: <strong>tables 12–25 (pehle 3 din top priority)</strong>, 1–30 squares, 1–12 cubes, 1/2–1/20 ka %.</li>
                    <li>Roz 1-liner sprint: 15 Tier-A Q / 9 min.</li>
                    <li>Option-first: value daalo (θ=45°, a=b=1), approx, unit digit, divisibility.</li>
                    <li>15-sec rule: tareeka nahi aaya → mark &amp; next.</li>
                    <li>Attempt target: 19 (checkpoint 1) → 20 (checkpoint 2) → 20–21 floor (22–23 stretch).</li>
                  </ul>
                </td>
                <td>
                  <ul className="ms-list">
                    <li>Tier A/B mein hai → 30 min formula (Brahmastra) → 30 PYQ bina timer → 20 timed.</li>
                    <li>Skip list mein hai → drop, bina guilt.</li>
                    <li>Exam se ek hafta pehle ke baad koi naya chapter nahi.</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
