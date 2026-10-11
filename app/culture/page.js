"use client";

// 🪔 Bharat Sanskriti — rajya-wise folk dance, festival, classical dance.
// Data Parmar Static notes se (lib/sanskriti); "0" = Jodi milao (Vocab
// jaisa, abhi wala — components/Sanskriti).
//
// 🎨 Upar dropdown se yaad karne ke purane 15 tareeke bhi (components/
// CultureLayouts, apne purane data lib/culture ke saath). Chunaav is device
// par `cgl.culturelayout2`.

import { useEffect, useMemo, useState } from "react";
import Sanskriti from "@/components/Sanskriti";
import { STATES, flatten, readMine } from "@/lib/culture";
import CultureLayouts, { CU_LAYOUTS } from "@/components/CultureLayouts";
import "./sanskriti.css";
import "./culture.css";

const LAY_KEY = "cgl.culturelayout2";

export default function CulturePage() {
  const [lay, setLay] = useState("0");
  const [mine, setMine] = useState([]);
  useEffect(() => {
    try { const v = localStorage.getItem(LAY_KEY); if (v && (v === "0" || CU_LAYOUTS.some((l) => l.id === v))) setLay(v); } catch { /* private */ }
    const load = () => setMine(readMine());
    load();
    window.addEventListener("cgl:culture-mine", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { window.removeEventListener("cgl:culture-mine", load); window.removeEventListener("cgl:sync-applied", load); };
  }, []);
  const pickLay = (v) => { setLay(v); try { localStorage.setItem(LAY_KEY, v); } catch { /* private */ } };
  const items = useMemo(() => flatten(STATES, mine), [mine]);
  const n = (t) => items.filter((x) => x.t === t).length;

  const pick = (
    <select className="cu-pick" value={lay} onChange={(e) => pickLay(e.target.value)} aria-label="Yaad karne ka tareeka">
      <option value="0">🎨 0 · Jodi milao (abhi wala)</option>
      {CU_LAYOUTS.map((l) => <option key={l.id} value={l.id}>🎨 {l.id} · {l.name}</option>)}
    </select>
  );

  if (lay === "0") {
    return (
      <>
        <div className="cu-bar">{pick}</div>
        <Sanskriti />
      </>
    );
  }

  return (
    <section className="section cu">
      <header className="cu-head">
        <div>
          <h1>🪔 Bharat Sanskriti</h1>
          <p>28 rajya + 8 UT · 💃 {n("cd")} classical · 🥁 {n("fd")} folk · 🪔 {n("fs")} tyohar · 🏹 {n("tr")} janjati{mine.length ? ` · ✍️ ${mine.length} apne` : ""}</p>
        </div>
        {pick}
      </header>
      <CultureLayouts lay={lay} items={items} />
    </section>
  );
}
