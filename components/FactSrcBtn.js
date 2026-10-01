"use client";

// ❓ Fact log par — ye fact jis question se aaya, wahi question yahin khul
// jaata hai (fact.src, lib/missionfacts srcOf). Option chuno to hara/laal.

import { useState } from "react";
import Markdown from "./Markdown";

export default function FactSrcBtn({ src }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(null);
  if (!src) return null;
  const opts = Array.isArray(src.options) ? src.options : [];
  const has = Number.isInteger(src.answer);
  return (
    <>
      <button
        type="button"
        className="fsq-btn"
        title="Ye fact jis question se aaya, wo kholo"
        onClick={() => { setOpen((v) => !v); setPick(null); }}
      >
        {open ? "✕ Sawaal" : "❓ Sawaal"}
      </button>
      {open && (
        <div className="fsq">
          {src.img ? <img src={src.img} alt="Question" className="fsq-img" loading="lazy" /> : null}
          {src.question ? <div className="fsq-q"><Markdown inline>{src.question}</Markdown></div> : null}
          {opts.length > 0 && (
            <div className="fsq-opts">
              {opts.map((o, i) => {
                const right = pick !== null && has && i === src.answer;
                const wrong = pick === i && has && i !== src.answer;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`fsq-opt${right ? " is-right" : ""}${wrong ? " is-wrong" : ""}${pick === i ? " is-picked" : ""}`}
                    onClick={() => setPick(i)}
                  >
                    <b>{String.fromCharCode(65 + i)}</b> {o}{right ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
