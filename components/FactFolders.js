"use client";

// 📂 Fact log ka TOPIC FOLDERS roop — baayen har topic ka folder (kitne
// fact, laal gola = aaj kitne due), daayen chune hue topic ke saare facts.
// Due fact par wahin "✓ Aata tha / ✗ Nahi" — wahi 1/3/7/14 ka schedule
// (lib/missionfacts reviewFact). 🗑️ se fact hatao.
//
// Owner ne dropdown ke 15 roop mein se yahi chuna; baaki hata diye.
// Fact ka "sar" aur "points" usi tarah bante hain jaise revise card mein.

import { useMemo, useState } from "react";
import { FACT_SECS, GAPS, factView, reviewFact, removeFact } from "@/lib/missionfacts";
import FactSrcBtn from "./FactSrcBtn";
import { dayKey } from "@/lib/daytime";
import { answerPoints } from "@/components/carevision/Recall";

const SPLIT = /^(.{3,90}?)\s*(?::|—|–|=|→|\s-\s)\s*([\s\S]{2,})$/;
const SEC_C = { gs: "#10b981", ca: "#f59e0b", english: "#a855f7", maths: "#3b82f6" };

// Ek fact → padhne ki shakl. Ek line: "Naam: baaki" → sar + jawab. Kai
// line (🧹 saaf ki hui): pehli line sar, baaki points.
function toModel(f, today) {
  const v = factView(f);
  const s = FACT_SECS.find((x) => x.k === f.sec) || FACT_SECS[0];
  const main = String(v.main || "").trim();
  const nl = main.indexOf("\n");
  const m = nl < 0 ? SPLIT.exec(main) : [null, main.slice(0, nl).trim(), main.slice(nl + 1).trim()];
  const done = !(f.step < GAPS.length);
  const body = m ? m[2] : main;
  return {
    id: f.id, c: SEC_C[f.sec] || "#94a3b8",
    topic: f.topic || "(bina topic)",
    head: m ? m[1] : (f.topic || `${s.label} fact`),
    body, pts: answerPoints(body),
    stage: done ? "Pakka 🏁" : `D+${GAPS[f.step]}`,
    isDue: !done && !!f.due && f.due <= today,
    src: f.src || null,
  };
}

export default function FactFolders({ facts, onChange }) {
  const today = dayKey();
  const topics = useMemo(() => {
    const g = new Map();
    for (const f of facts) {
      const m = toModel(f, today);
      if (!g.has(m.topic)) g.set(m.topic, []);
      g.get(m.topic).push(m);
    }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [facts, today]);
  const [t, setT] = useState("");
  const cur = topics.find(([k]) => k === t) || topics[0];

  const rate = (id, ok) => { reviewFact(id, ok); onChange(); };
  const del = (id) => { if (confirm("Ye fact hata dein?")) { removeFact(id); onChange(); } };

  if (!topics.length) return <div className="placeholder">Abhi koi fact nahi.</div>;
  return (
    <div className="ffd">
      <nav>
        {topics.map(([k, list]) => {
          const due = list.filter((m) => m.isDue).length;
          const on = cur && cur[0] === k;
          return (
            <button key={k} type="button" className={on ? "is-on" : ""} onClick={() => setT(k)}>
              <span>{on ? "📂" : "📁"} {k}</span>
              <em>{due ? <i>{due}</i> : null}{list.length}</em>
            </button>
          );
        })}
      </nav>
      {cur && (
        <section>
          <h3>📂 {cur[0]} <small>{cur[1].length} fact</small></h3>
          {cur[1].map((m) => (
            <article key={m.id} className="ffd-f" style={{ "--c": m.c }}>
              <header>
                <b>{m.head}</b>
                <span>{m.isDue ? "🔴 aaj" : m.stage}</span>
                <button type="button" className="ffd-del" title="Hata do" onClick={() => del(m.id)}>🗑️</button>
              </header>
              {m.pts
                ? <ul className="ffd-pts">{m.pts.map((p, i) => <li key={i}>{p.head ? <><b>{p.head}</b> — </> : null}{p.rest}</li>)}</ul>
                : <p className="ffd-txt">{m.body}</p>}
              {/* ❓ Ye fact jis question se aaya — yahin khulta hai. */}
              <FactSrcBtn src={m.src} />
              {m.isDue && (
                <span className="ffd-rate">
                  <button type="button" className="is-y" onClick={() => rate(m.id, true)}>✓ Aata tha</button>
                  <button type="button" className="is-n" onClick={() => rate(m.id, false)}>✗ Nahi</button>
                </span>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
