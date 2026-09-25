"use client";

// Sprint ke bayein taraf ka hissa — sirf sawaal aur options.
//
// Do shakl ke question aate hain: text wale (English/GS/Maths 2025) aur
// TASVEER wale (Pinnacle Maths/Reasoning, jahan sawaal ek .webp hai). Dono
// yahi card dikhata hai — bank ke apne card yahan nahi chalte, kyunki unke
// saath poori patti (Gemini/paste/cluster/edit) aati hai jiska sprint mein
// koi kaam nahi.

import Markdown from "./Markdown";
import { qText, qOpts } from "@/lib/sprint";

const LETTER = ["A", "B", "C", "D", "E"];

export default function SprintCard({ q, n, total, picked, onPick }) {
  const opts = qOpts(q);
  const imgs = Array.isArray(q.optImgs) ? q.optImgs : null;
  const count = imgs ? imgs.length : opts.length;

  return (
    <>
      <div className="sp-meta">
        Q {n}/{total}
        {q._srcLabel ? ` · ${q._srcLabel}` : ""}
        {q._chapter ? ` · ${q._chapter}` : ""}
        {q.source || q.paper ? ` · ${q.source || q.paper}` : ""}
      </div>

      <div className="sp-q">
        {q.qImg
          ? <img src={q.qImg} alt={qText(q) || "question"} className="sp-img" />
          : <Markdown>{qText(q)}</Markdown>}
      </div>

      <div className="sp-opts">
        {Array.from({ length: count }, (_, i) => {
          // Jawab chun lene ke baad hi rang aata hai: sahi hamesha hara,
          // aur galat sirf wahi jo tumne daba diya.
          const state = picked == null ? ""
            : i === q.answer ? " is-right"
            : i === picked ? " is-wrong"
            : "";
          return (
            <button key={i} type="button" className={`sp-opt${state}`} onClick={() => onPick(i)}>
              <span className="sp-opt__k">{LETTER[i] || i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {imgs
                  ? <img src={imgs[i]} alt={opts[i] || LETTER[i]} />
                  : <Markdown inline>{opts[i] || ""}</Markdown>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
