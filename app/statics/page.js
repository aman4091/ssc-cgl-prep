"use client";

// 🪔 Festival / Statics — upar menu ke 🪔 ka apna page (owner). Jo bhi
// festival / tribe / dance … select karke 🪔 se save kiya (components/StaticsInfo),
// sab yahan — yaad karne ke 20 roop ke saath (components/StaticsLayouts).

import { useEffect, useMemo, useState } from "react";
import { readInfo } from "@/components/StaticsInfo";
import StaticsLayouts, { ST_LAYOUTS } from "@/components/StaticsLayouts";
import { parseStatic, stateOf, monthOf, typeOf } from "@/lib/staticsparse";

export default function StaticsPage() {
  const [raw, setRaw] = useState(null);
  const [lay, setLay] = useState("1");
  useEffect(() => {
    const load = () => setRaw(readInfo());
    load();
    try { const v = localStorage.getItem("cgl.staticslay"); if (v && ST_LAYOUTS.some((l) => l.id === v)) setLay(v); } catch { /* ignore */ }
    window.addEventListener("cgl:statics-info", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { window.removeEventListener("cgl:statics-info", load); window.removeEventListener("cgl:sync-applied", load); };
  }, []);
  const pick = (v) => { setLay(v); try { localStorage.setItem("cgl.staticslay", v); } catch { /* ignore */ } };
  const items = useMemo(() => (raw || []).map((x) => {
    const f = parseStatic(x.text);
    return { ...x, f, state: stateOf(f), month: monthOf(f), type: typeOf(f, x.term) };
  }), [raw]);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">🪔 Art &amp; Culture · Statics</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>Festival, Tribe, Dance <span className="grad">· {items.length}</span></h1>
        {items.length ? (
          <div className="row mt-16">
            <select className="select" style={{ width: "auto", maxWidth: "100%", padding: "8px 12px" }} value={lay} onChange={(e) => pick(e.target.value)} aria-label="Yaad karne ka tareeka">
              {ST_LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.id} · {l.name}</option>)}
            </select>
          </div>
        ) : null}
      </section>
      <section className="section">
        {raw === null ? <div className="placeholder">Khul raha hai…</div>
          : !items.length ? <div className="placeholder">Abhi kuch save nahi. Kahin bhi kisi festival / tribe / dance ka naam select karo → patti ka 🪔 Festival → Gemini ka jawab paste karke 💾 Save.</div>
            : <StaticsLayouts key={lay} lay={lay} items={items} />}
      </section>
    </>
  );
}
