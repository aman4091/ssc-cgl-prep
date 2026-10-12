"use client";

// 📐 Formula Revision — Brahmastra (Aditya Ranjan) ke chapter, har chapter ke
// zaroori formula, trick (💡) aur chhote example (🎯). Data lib/formulas/.
//
// Padhne ki shakl (owner: "ghich-pich nahi chahiye"):
//   • ek waqt mein EK topic — baayen (phone par upar) topic ki list
//   • har formula apni alag line par: baayen naam, daayen formula
//     (data ki ek line mein " · " se jude kai formula yahan alag-alag ho jaate)
//   • 💡 trick aur 🎯 example formulon se alag, neeche apne dabbe mein

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { FORMULA_CHAPTERS } from "@/lib/formulas";
import "./formulas.css";

const KEY = "cgl.formulas.ch";
const TKEY = "cgl.formulas.topic";

// " · " sirf formula ke BAHAR alag karta hai ($…$ ke andar nahi).
function splitDots(s) {
  const out = [];
  let cur = "";
  let inMath = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "$") inMath = !inMath;
    if (!inMath && c === "·" && s[i - 1] === " " && s[i + 1] === " ") {
      out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
// "Square: $d=a\sqrt2$" → { k: "Square", v: "$d=a\sqrt2$" }
function row(s) {
  const m = /^([^$:]{0,41}[^\s$:]):\s+([\s\S]+)$/.exec(s);
  return m ? { k: m[1].trim(), v: m[2].trim() } : { k: "", v: s };
}
function shape(sec) {
  const rows = [], tricks = [], ex = [];
  for (const it of sec.items) {
    if (it.startsWith("💡")) tricks.push(it.replace(/^💡\s*/, ""));
    else if (it.startsWith("🎯")) ex.push(...splitDots(it.replace(/^🎯\s*/, "")));
    else {
      // Line ke andar "(🎯 …)" — wo bhi Example ke dabbe mein.
      const inEx = [];
      const clean = it.replace(/\s*\(🎯\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, x) => { inEx.push(x.trim()); return ""; });
      rows.push(splitDots(clean).map(row));
      ex.push(...inEx);
    }
  }
  return { rows, tricks, ex };
}

export default function FormulasPage() {
  const [id, setId] = useState(FORMULA_CHAPTERS[0].id);
  const [ti, setTi] = useState(0);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v && FORMULA_CHAPTERS.some((c) => c.id === v)) setId(v);
      const t = Number(localStorage.getItem(TKEY));
      if (Number.isFinite(t) && t > 0) setTi(t);
    } catch { /* ignore */ }
  }, []);
  const ch = FORMULA_CHAPTERS.find((c) => c.id === id) || FORMULA_CHAPTERS[0];
  const at = Math.min(ti, ch.sections.length - 1);
  const go = (i) => {
    const j = Math.max(0, Math.min(ch.sections.length - 1, i));
    setTi(j);
    try { localStorage.setItem(TKEY, String(j)); } catch { /* ignore */ }
    window.scrollTo({ top: 0 });
  };
  const pick = (v) => { setId(v); go(0); try { localStorage.setItem(KEY, v); } catch { /* ignore */ } };
  const sec = ch.sections[at];
  const { rows, tricks, ex } = useMemo(() => shape(sec), [sec]);

  useEffect(() => {
    const k = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") go(at + 1);
      else if (e.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  return (
    <section className="section fx">
      <header className="fx-head">
        <span className="fx-eyebrow">📐 Brahmastra · Formula Revision</span>
        <div className="fx-title">
          <h1>{ch.title}</h1>
          {FORMULA_CHAPTERS.length > 1 && (
            <select className="fx-pick" value={ch.id} onChange={(e) => pick(e.target.value)} aria-label="Chapter">
              {FORMULA_CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        </div>
      </header>

      <div className="fx-wrap">
        <nav className="fx-topics" aria-label="Topic">
          {ch.sections.map((s, i) => (
            <button key={s.t} type="button" className={i === at ? "is-on" : ""} onClick={() => go(i)}>
              <span className="fx-topics__n">{i + 1}</span>
              <span>{s.t}</span>
            </button>
          ))}
        </nav>

        <article className="fx-main">
          <div className="fx-main__hd">
            <small>Topic {at + 1} / {ch.sections.length}</small>
            <h2>{sec.t}</h2>
          </div>

          <div className="fx-rows">
            {rows.map((grp, gi) => (
              <div key={gi} className="fx-grp">
                {grp.map((r, ri) => (
                  <div key={ri} className={`fx-row${r.k ? "" : " fx-row--full"}`}>
                    {r.k ? <div className="fx-k">{r.k}</div> : null}
                    <div className="fx-v"><Markdown inline>{r.v}</Markdown></div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {tricks.length > 0 && (
            <div className="fx-box fx-box--trick">
              <h3>💡 Trick</h3>
              {tricks.map((t, i) => <p key={i}><Markdown inline>{t}</Markdown></p>)}
            </div>
          )}
          {ex.length > 0 && (
            <div className="fx-box fx-box--ex">
              <h3>🎯 Example</h3>
              {ex.map((t, i) => <p key={i}><Markdown inline>{t}</Markdown></p>)}
            </div>
          )}

          <div className="fx-nav">
            <button type="button" disabled={at === 0} onClick={() => go(at - 1)}>← {at > 0 ? ch.sections[at - 1].t : "pehla"}</button>
            <button type="button" disabled={at >= ch.sections.length - 1} onClick={() => go(at + 1)}>{at < ch.sections.length - 1 ? ch.sections[at + 1].t : "aakhri"} →</button>
          </div>
        </article>
      </div>
    </section>
  );
}
