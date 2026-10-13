"use client";

// 📚 PYQ ke yaad karne ke tareeke — GKTricks Medieval wale hi, ab GS / English
// ke baaki PYQ pages par bhi (WAR, Pinnacle English, Error Pro, All, GKTricks).
// Maths / Reasoning par nahi (owner: DeepSeek wala system wahan abhi nahi).
//
// "0" = us page ka apna purana roop (children). Default 33 · Do pane.
// `ns` = page ki apni pehchaan — kahan tak padha wo har page ka alag.

import { useEffect, useState } from "react";
import MedLayouts, { MED_LAYOUTS } from "./MedLayouts";
import MedFacts, { MED_FACT_LAYOUTS } from "./MedFacts";

// Owner ne ye rakhe; baaki tareeke code mein hain (backup/README.md).
export const LOOK_KEEP = new Set(["0", "7", "16", "19", "21", "25", "31", "33", "34", "36"]);

// on=false (Maths / Reasoning) → bas purana roop, koi dropdown nahi.
export default function PyqLooks({ qs, storeKey = "cgl.pyqlook", zeroLabel = "Abhi wala", ns = "", on = true, children }) {
  const [lay, setLay] = useState("33");
  useEffect(() => { try { const v = localStorage.getItem(storeKey); if (v && LOOK_KEEP.has(v)) setLay(v); } catch { /* ignore */ } }, [storeKey]);
  const pick = (v) => { setLay(v); try { localStorage.setItem(storeKey, v); } catch { /* quota */ } };
  if (!on) return children;
  return (
    <>
      <div className="row" style={{ maxWidth: 980, margin: "0 auto 12px" }}>
        <select className="select" style={{ width: "auto", maxWidth: "100%", padding: "8px 12px" }} value={lay} onChange={(e) => pick(e.target.value)} aria-label="Yaad karne ka tareeka">
          <option value="0">0 · {zeroLabel}</option>
          <optgroup label="Bina facts">
            {MED_LAYOUTS.filter((l) => LOOK_KEEP.has(l.id)).map((l) => <option key={l.id} value={l.id}>{l.id} · {l.name}</option>)}
          </optgroup>
          <optgroup label="Facts ke saath (DeepSeek ⚡)">
            {MED_FACT_LAYOUTS.filter((l) => LOOK_KEEP.has(l.id)).map((l) => <option key={l.id} value={l.id}>{l.id} · {l.name}</option>)}
          </optgroup>
        </select>
      </div>
      {lay === "0" ? children : Number(lay) > 20 ? <MedFacts lay={lay} qs={qs} ns={ns} /> : <MedLayouts lay={lay} qs={qs} />}
    </>
  );
}
