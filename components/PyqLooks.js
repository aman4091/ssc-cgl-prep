"use client";

// 📚 PYQ ka roop — GS / English ke saare PYQ pages (WAR, Pinnacle English,
// Error Pro, All, GKTricks + Medieval) par 33 · Do pane FINAL (owner).
// Dropdown hata diya; baaki tareeke code mein hain (MedLayouts / MedFacts,
// backup/README.md). Maths / Reasoning (on=false) par page ka purana roop.

// 📝 Upar "📖 Padho | 📝 Sets · Test" (components/PyqSets): Padho = 33 jaisa
// tha; Sets = 25-25 ke 15 minute wale test. Card / title andar wale PyqDrill
// (children) se. on=false par PyqDrill khud ye kaam karta hai.

import MedFacts from "./MedFacts";
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
      padho={<MedFacts lay="33" qs={qs} ns={ns} />}
    />
  );
}
