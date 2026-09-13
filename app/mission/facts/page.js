"use client";

import { useEffect, useMemo, useState } from "react";
import { FACT_SECS, GAPS, getFacts, addFact, removeFact, dueFacts, reviewFact, topicsInUse } from "@/lib/missionfacts";
import { getMission, currentDayNum, planFor } from "@/lib/mission";

// /mission/facts — GS / CA / English / Maths ka ek-line fact log.
//
// Upar: aaj ke due (1/3/7/14 din wale) — padho, "yaad tha" ya "bhool gaya".
// Beech mein: naya fact jodo (mock analysis ya PYQ ke baad turant).
// Neeche: topic-wise poori list.

export default function MissionFactsPage() {
  const [facts, setFacts] = useState([]);
  const [due, setDue] = useState([]);
  const [open, setOpen] = useState({});
  const [sec, setSec] = useState("gs");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState([]);

  const load = () => { setFacts(getFacts()); setDue(dueFacts()); };
  useEffect(() => {
    load();
    // Aaj ka GS topic sabse pehla sujhaav — usi ke facts sabse zyada banenge.
    const m = getMission();
    const p = planFor(currentDayNum(m));
    const s = [p && p.g ? p.g.t.split(":")[0] : null, ...topicsInUse()].filter(Boolean);
    setSuggest([...new Set(s)].slice(0, 10));
    const on = () => load();
    window.addEventListener("cgl:mission-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:mission-changed", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);

  const add = () => {
    if (!text.trim()) return;
    addFact({ sec, topic, text });
    setText("");
    load();
  };

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const g = {};
    for (const f of facts) {
      if (term && !(`${f.topic} ${f.text}`.toLowerCase().includes(term))) continue;
      const k = f.topic || "(bina topic)";
      (g[k] = g[k] || []).push(f);
    }
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  }, [facts, q]);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🧠 Fact log</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Ek line, <span className="grad">cluster ke saath</span>
        </h1>
        <p className="hero__sub">
          Har galat/unsure GS ya CA sawaal → 1 line. Kerala ka dance pucha? Kerala ke saare dance ek line mein — SSC agli baar
          usi cluster ka doosra fact poochta hai. Har fact {GAPS.join(", ")} din baad khud wapas aata hai.
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="ms-h2">Aaj revise karo ({due.length})</h2>
        {due.length === 0 ? (
          <div className="placeholder">Aaj ke liye kuch due nahi. 👍</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {due.map((f) => (
              <div key={f.id} className="glass-card ms-fact">
                <div className="row between" style={{ flexWrap: "nowrap", gap: 8 }}>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    {FACT_SECS.find((s) => s.k === f.sec)?.icon} {f.topic || "—"} · padaav {f.step + 1}/{GAPS.length}
                  </span>
                  {!open[f.id] && <button className="btn btn--sm" onClick={() => setOpen((o) => ({ ...o, [f.id]: true }))}>👁 Dikhao</button>}
                </div>
                {open[f.id] ? (
                  <>
                    <p style={{ margin: "6px 0 8px", fontSize: "0.95rem" }}>{f.text}</p>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn--primary btn--sm" onClick={() => { reviewFact(f.id, true); load(); }}>✓ Yaad tha</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => { reviewFact(f.id, false); load(); }}>✗ Bhool gaya (kal phir)</button>
                    </div>
                  </>
                ) : (
                  <p className="hint" style={{ margin: "6px 0 0" }}>Pehle khud yaad karo — fir "Dikhao".</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="ms-h2">Naya fact jodo</h2>
        <div className="glass-card ms-form" style={{ padding: 14 }}>
          <div className="row" style={{ gap: 6, marginBottom: 8 }}>
            {FACT_SECS.map((s) => (
              <button key={s.k} className={"chip chip--btn" + (sec === s.k ? " is-active" : "")} onClick={() => setSec(s.k)}>{s.icon} {s.label}</button>
            ))}
          </div>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Polity, Dance, Sep 2026 CA)" />
          {suggest.length > 0 && (
            <div className="row" style={{ gap: 6, margin: "6px 0 8px" }}>
              {suggest.map((s) => <button key={s} className="chip chip--btn chip--sm" onClick={() => setTopic(s)}>{s}</button>)}
            </div>
          )}
          <textarea className="textarea input" rows={3} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Fact, cluster ke saath. e.g. Kerala dance: Kathakali, Mohiniyattam, Theyyam, Ottan Thullal" />
          <button className="btn btn--primary mt-12" onClick={add} disabled={!text.trim()}>➕ Jodo</button>
        </div>
      </section>

      <section className="section">
        <div className="row between ms-form" style={{ marginBottom: 8 }}>
          <h2 className="ms-h2" style={{ margin: 0 }}>Saare facts ({facts.length})</h2>
          <input className="input" style={{ maxWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 dhoondo" />
        </div>
        {groups.length === 0 ? (
          <div className="placeholder">Abhi koi fact nahi. Aaj ke GS PYQ ke baad pehla fact yahin likho.</div>
        ) : groups.map(([t, list]) => (
          <details key={t} className="glass-card ms-group" open={groups.length <= 3}>
            <summary><strong>{t}</strong> <span className="muted">· {list.length}</span></summary>
            {list.map((f) => (
              <div key={f.id} className="ms-factrow">
                <span>{FACT_SECS.find((s) => s.k === f.sec)?.icon} {f.text}</span>
                <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <span className="hint">{f.due ? `agla ${f.due.slice(8)}/${f.due.slice(5, 7)}` : "pakka ✓"}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Ye fact hata dein?")) { removeFact(f.id); load(); } }}>🗑️</button>
                </span>
              </div>
            ))}
          </details>
        ))}
      </section>
    </>
  );
}
