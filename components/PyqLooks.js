"use client";

// 📚 PYQ ka roop — GS / English ke saare PYQ pages (WAR, Pinnacle English,
// Error Pro, All, GKTricks + Medieval) par 33 · Do pane FINAL (owner).
// Dropdown hata diya; baaki tareeke code mein hain (MedLayouts / MedFacts,
// backup/README.md). Maths / Reasoning (on=false) par page ka purana roop.

// 📝 Ab SIRF Sets (components/PyqSets) — owner: "padho hta de jaha pr sets
// hai". 33 · Do pane (MedFacts) code mein pada hai. Card / title andar wale
// PyqReels (children) se. on=false par PyqReels khud yahi karta hai.

import PyqSets from "./PyqSets";

export default function PyqLooks({ qs, ns = "", on = true, children }) {
  if (!on) return children;
  const cp = (children && children.props) || {};
  return (
    <PyqSets
      list={qs}
      subject={cp.subject}
      resumeKey={ns || cp.resumeKey}
      title={cp.title || "PYQ"}
      renderCard={cp.renderCard}
    />
  );
}
