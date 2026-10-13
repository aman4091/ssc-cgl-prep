"use client";

// 📚 PYQ ka roop — GS / English ke saare PYQ pages (WAR, Pinnacle English,
// Error Pro, All, GKTricks + Medieval) par 33 · Do pane FINAL (owner).
// Dropdown hata diya; baaki tareeke code mein hain (MedLayouts / MedFacts,
// backup/README.md). Maths / Reasoning (on=false) par page ka purana roop.

import MedFacts from "./MedFacts";

export default function PyqLooks({ qs, ns = "", on = true, children }) {
  if (!on) return children;
  return <MedFacts lay="33" qs={qs} ns={ns} />;
}
