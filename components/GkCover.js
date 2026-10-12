"use client";

// 📋 Cover method — Vocab jaisa (owner try kar raha hai, GKTricks Medieval):
// baayen sawaal, daayen sirf sahi jawab (options nahi), jawab dhaka hua.
// Row dabao to khule; "Chhupao" se sawaal bhi dhak sakte ho.

import { useState } from "react";
import Markdown from "./Markdown";
import "./gkcover.css";

const ansOf = (q) => {
  if (Number.isInteger(q.answer) && Array.isArray(q.options) && q.options[q.answer] != null) return String(q.options[q.answer]);
  return String(q.answerText || q.correct || "");
};

export default function GkCover({ qs }) {
  const [hide, setHide] = useState("a");   // "a" = jawab dhako, "q" = sawaal dhako
  const [open, setOpen] = useState({});
  const [n, setN] = useState(30);
  const rows = qs.slice(0, n);
  return (
    <div className="gkc">
      <div className="gkc-bar">
        <span>Chhupao:</span>
        {[["a", "Jawab"], ["q", "Sawaal"]].map(([k, l]) => (
          <button key={k} type="button" className={hide === k ? "is-on" : ""} onClick={() => { setHide(k); setOpen({}); }}>{l}</button>
        ))}
        <button type="button" onClick={() => setOpen({})}>↺ Sab dhako</button>
        <span className="gkc-n">{qs.length} sawaal</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>Sawaal</th><th>Jawab</th></tr></thead>
        <tbody>
          {rows.map((q, i) => {
            const o = open[q.id ?? i];
            return (
              <tr key={q.id ?? i} onClick={() => setOpen((x) => ({ ...x, [q.id ?? i]: !x[q.id ?? i] }))}>
                <td>{i + 1}</td>
                <td className={hide === "q" && !o ? "is-cov" : ""}><Markdown inline>{q.question}</Markdown></td>
                <td className={hide === "a" && !o ? "is-cov" : ""}><b>{ansOf(q) || "—"}</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {n < qs.length && <button type="button" className="gkc-more" onClick={() => setN((x) => x + 30)}>Aur 30 dikhao ({qs.length - n} bache)</button>}
    </div>
  );
}
