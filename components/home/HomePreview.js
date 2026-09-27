"use client";

// 🧪 Homepage ke naye roop — owner compare kar raha hai, isliye sab ek saath.
// Upar ek chhoti patti se roop chuno (is device par yaad rehta hai), ya URL
// mein ?home=a…; "Old" = purana Home (children) jaisa tha.

import { useEffect, useState } from "react";
import "./home.css";
import useMissionHome from "./useMissionHome";
import { HOMES } from "./registry";

const KEY = "cgl.home";

export default function HomePreview({ children }) {
  const [v, setV] = useState("");
  useEffect(() => {
    let x = "";
    try { x = new URLSearchParams(window.location.search).get("home") || localStorage.getItem(KEY) || ""; } catch { /* ignore */ }
    setV(x);
  }, []);
  const pick = (x) => {
    setV(x);
    try { if (x) localStorage.setItem(KEY, x); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  };
  const d = useMissionHome();
  const H = HOMES.find((h) => h.id === v);
  const Comp = H && H.C;

  return (
    <>
      <nav className="hx-pick" aria-label="Home ka roop">
        <span className="hx-pick__l">🏠 Home roop</span>
        <button type="button" className={!Comp ? "is-on" : ""} onClick={() => pick("")}>Old</button>
        {HOMES.map((h) => (
          <button key={h.id} type="button" className={v === h.id ? "is-on" : ""} onClick={() => pick(h.id)} title={h.name}>
            {h.id.toUpperCase()}
          </button>
        ))}
        {H ? <span className="hx-pick__n">{H.name}</span> : null}
      </nav>
      {!Comp || !d || d.setup ? children : <Comp d={d} />}
    </>
  );
}
