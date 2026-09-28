"use client";

// 🇮🇳 States GK — tribe, dance, festival (kyun aur kis devta ka).
//
// Ek hi maal, PANDRAH tarike. Upar dropdown se ek-ek karke dekho — saat
// tarike dekhne ke (list, table, devta-wise, region-wise, trick sheet) aur
// aath yaad-jaanchne ke (flashcard, MCQ, rapid fire, type, jodi, alag kaun,
// sahi/galat, rozana revision). Baad mein jo jache wahi rakh lena.
//
// Chuna hua tarika is device par yaad rehta hai, to page kholte hi wahi
// khulta hai.

import { useEffect, useState } from "react";
import "./states.css";
import StatesMode, { MODES } from "@/components/StatesModes";

const KEY = "cgl.states.mode";

export default function StatesPage() {
  const [m, setM] = useState("state");
  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (v && MODES.some((x) => x.k === v)) setM(v); } catch { /* ignore */ }
  }, []);
  const pick = (v) => { setM(v); try { localStorage.setItem(KEY, v); } catch { /* ignore */ } };
  const cur = MODES.find((x) => x.k === m) || MODES[0];

  return (
    <section className="section stg">
      <div className="stg-top">
        <h1 className="stg-h1">🇮🇳 States GK</h1>
        <label className="stg-pick">
          <span>Tareeka</span>
          <select value={m} onChange={(e) => pick(e.target.value)} aria-label="Yaad karne ka tareeka">
            <optgroup label="📖 Dekhne ke">
              {MODES.filter((x) => x.t === "dekho").map((x) => <option key={x.k} value={x.k}>{x.n}</option>)}
            </optgroup>
            <optgroup label="🎯 Test ke">
              {MODES.filter((x) => x.t === "test").map((x) => <option key={x.k} value={x.k}>{x.n}</option>)}
            </optgroup>
          </select>
        </label>
      </div>
      <p className="stg-sub">{cur.d}</p>

      <StatesMode key={m} mode={m} />
    </section>
  );
}
