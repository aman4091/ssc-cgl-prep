"use client";

// 📝 Paste kiye hue one-liner ka roop — TIMELINE.
//
// Yahan pehle saadi numbered list thi. Padhne ke pandrah roop banwa kar ek
// saath dekhe gaye (dropdown se) aur owner ne roop 8 "Timeline" final kiya —
// isliye ab wahi shakl seedha yahan hai, na dropdown na doosra roop. Naya
// note paste karte hi isi shakl mein aata hai (paste-box ki jhalak bhi).
//
// Shakl: topic ka naam, uske neeche ek khadi lakeer, aur us lakeer par har
// point ka apna BINDU. Numbers hata diye — bindu hi kram dikha deta hai.
// ⭐ point (jo SSC mein aa chuke ya aane layak hain) ka bindu SONE ka hai,
// isliye poori list mein wahi pehle nazar aata hai.
//
// ⚠️ Confusion aur 🧠 trick ke khaane apne rang ke dabbe mein rehte hain.

import Markdown from "./Markdown";
import { parseOneLiner } from "@/lib/onelinerfmt";

export default function OneLinerNotes({ text }) {
  const secs = parseOneLiner(text);
  if (!secs.length) return null;
  return (
    <div className="ol">
      {secs.map((s, i) => (
        <section key={i} className={`ol-sec${s.kind === "warn" ? " ol-sec--warn" : s.kind === "tip" ? " ol-sec--tip" : ""}`}>
          {s.title ? (
            <h4 className="ol-t">
              {s.kind === "warn" ? "⚠️ " : s.kind === "tip" ? "🧠 " : ""}{s.title}
            </h4>
          ) : null}
          <div className="ol-line">
            {s.points.map((p, j) => (
              <div key={j} className={`ol-p${p.star ? " is-star" : ""}`}>
                <i className="ol-dot" aria-hidden="true" />
                <span className="ol-x"><Markdown inline>{p.text}</Markdown></span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
