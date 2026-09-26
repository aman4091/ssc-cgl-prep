"use client";

// 📝 Paste kiye hue one-liner ka roop — topic ka naam, uske neeche numbered
// point, aur aakhir mein ⚠️ Confusion ka apna khaana.
//
// ⭐ wale point wahi hain jo SSC mein aa chuke ya aane layak hain — unhe saaf
// dikhna chahiye, isliye unki apni patti aur halka rang.

import Markdown from "./Markdown";
import { parseOneLiner } from "@/lib/onelinerfmt";

export default function OneLinerNotes({ text }) {
  const secs = parseOneLiner(text);
  if (!secs.length) return null;
  return (
    <div className="ol">
      {secs.map((s, i) => (
        <section key={i} className={`ol-sec${s.kind === "warn" ? " ol-sec--warn" : ""}`}>
          {s.title ? (
            <h4 className="ol-t">{s.kind === "warn" ? "⚠️ " : ""}{s.title}</h4>
          ) : null}
          <ol className="ol-list">
            {s.points.map((p, j) => (
              <li key={j} className={`ol-p${p.star ? " is-star" : ""}`}>
                {p.n ? <span className="ol-n">{p.n}</span> : null}
                <span className="ol-x"><Markdown inline>{p.text}</Markdown></span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
