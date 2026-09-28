"use client";

// 🪔 Bharat Sanskriti — har rajya / UT ki janjati, CLASSICAL aur FOLK nritya,
// tyohar (kyun manate, kis devta ke liye, kis mahine). SSC CGL ke hisaab se.
//
// Data lib/culture (28 rajya + 8 UT, 9 classical nritya ki poori jaankari)
// + owner ke khud jode hue ("15 · Apna jodo", `cgl.culture.mine`).
// Upar 🎨 dropdown mein yaad karne ke 15 tareeke (components/CultureLayouts);
// owner dekh kar ek chunega. Chunaav is device par `cgl.culturelayout`.
//
// /states wala purana page alag hai — owner use hatayega; ye usse juda nahi.

import { useEffect, useMemo, useState } from "react";
import { STATES, flatten, readMine } from "@/lib/culture";
import CultureLayouts, { CU_LAYOUTS } from "@/components/CultureLayouts";
import "./culture.css";

const LAY_KEY = "cgl.culturelayout";

export default function CulturePage() {
  const [lay, setLay] = useState("1");
  const [mine, setMine] = useState([]);
  useEffect(() => {
    try { const v = localStorage.getItem(LAY_KEY); if (v && CU_LAYOUTS.some((l) => l.id === v)) setLay(v); } catch { /* private */ }
    const load = () => setMine(readMine());
    load();
    window.addEventListener("cgl:culture-mine", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { window.removeEventListener("cgl:culture-mine", load); window.removeEventListener("cgl:sync-applied", load); };
  }, []);
  const pickLay = (v) => { setLay(v); try { localStorage.setItem(LAY_KEY, v); } catch { /* private */ } };
  const items = useMemo(() => flatten(STATES, mine), [mine]);
  const n = (t) => items.filter((x) => x.t === t).length;

  return (
    <section className="section cu">
      <header className="cu-head">
        <div>
          <h1>🪔 Bharat Sanskriti</h1>
          <p>28 rajya + 8 UT · 💃 {n("cd")} classical · 🥁 {n("fd")} folk · 🪔 {n("fs")} tyohar · 🏹 {n("tr")} janjati{mine.length ? ` · ✍️ ${mine.length} apne` : ""}</p>
        </div>
        <select value={lay} onChange={(e) => pickLay(e.target.value)} aria-label="Yaad karne ka tareeka">
          {CU_LAYOUTS.map((l) => <option key={l.id} value={l.id}>🎨 {l.id} · {l.name}</option>)}
        </select>
      </header>
      <CultureLayouts lay={lay} items={items} />
    </section>
  );
}
