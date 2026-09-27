"use client";

// 📥 One-liners ka INBOX roop — baayen sabki chhoti list (subject ka rang,
// din, pehli do line), daayen chuni hui one-liner poori, trick alag khane
// mein. ↑/↓ (ya ←/→) se agli-pichli, 🗑️ se wahin hatao.
//
// Owner ne dropdown ke 10 roop mein se yahi chuna; baaki hata diye.

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { olLines, olTitle, isTrickLine, subOf } from "@/lib/oneliners";

const COL = { gs: "#10b981", english: "#a855f7", math: "#3b82f6", reasoning: "#f59e0b" };
const M = ({ t }) => <Markdown inline>{t}</Markdown>;
const pad = (n) => String(n).padStart(2, "0");
const dmy = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? "" : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };

export default function OneLinersInbox({ items, onDelete }) {
  const rows = useMemo(() => items.map((o, i) => {
    const all = olLines(o.text);
    return {
      o, i, s: subOf(o.subject), c: COL[o.subject] || "#94a3b8", title: olTitle(o),
      lines: all.filter((l) => !isTrickLine(l)).map((l) => l.replace(/^\d+[.)]\s*/, "")),
      trick: all.filter(isTrickLine),
    };
  }), [items]);

  const [k, setK] = useState(0);
  const n = rows.length;
  const cur = Math.min(k, Math.max(0, n - 1));
  const go = (d) => setK(Math.min(n - 1, Math.max(0, cur + d)));
  useEffect(() => {
    const on = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  // Chuni hui line list mein dikhti rahe.
  useEffect(() => { document.getElementById(`olx-${cur}`)?.scrollIntoView({ block: "nearest" }); }, [cur]);

  const r = rows[cur];
  return (
    <div className="olx">
      <nav className="olx-list">
        {rows.map((x) => (
          <button key={x.o.id} id={`olx-${x.i}`} type="button" className={x.i === cur ? "is-on" : ""} onClick={() => setK(x.i)}>
            <i style={{ background: x.c }} />
            <span><b>{x.s.label}</b><small>{dmy(x.o.at)}</small></span>
            <em><M t={x.title} /></em>
          </button>
        ))}
      </nav>
      {r && (
        <article className="olx-read" style={{ "--c": r.c }}>
          <header>
            <span className="olx-tag">{r.s.icon} {r.s.label}</span>
            <span className="olx-dim">{dmy(r.o.at)} · {cur + 1} / {n}</span>
            <span className="olx-nav">
              <button type="button" onClick={() => go(-1)} disabled={cur === 0} title="Pichli (↑)">↑</button>
              <button type="button" onClick={() => go(1)} disabled={cur === n - 1} title="Agli (↓)">↓</button>
              <button type="button" onClick={() => onDelete(r.o.id)} title="Hata do">🗑️</button>
            </span>
          </header>
          <ol className="olx-lines">{r.lines.map((l, j) => <li key={j}><M t={l} /></li>)}</ol>
          {r.trick.map((l, j) => <div key={j} className="olx-trick"><M t={l} /></div>)}
        </article>
      )}
    </div>
  );
}
