"use client";

// 📋 Cover method — Vocab jaisa (owner try kar raha hai, GKTricks Medieval):
// baayen sawaal, daayen sirf sahi jawab (options nahi), jawab dhaka hua.
// Row dabao to khule; "Chhupao" se sawaal bhi dhak sakte ho.
//
// Chautha khaana "⚡ Fact" — DeepSeek chat wale jawab ki sirf ⚡ line (poora
// jawab nahi), row kholne par. Wo jawab PYQ ki tarah apne aap
// banta hai: jo row kholi + uske agle 5 (components/SelectAsk prefetch,
// `cgl:sprint-q`). Fact log mein bhejna khud — 🧩 button se.

import { useEffect, useState } from "react";
import Markdown from "./Markdown";
import { addClustersToFacts } from "./ClusterButton";
import { getAns } from "@/lib/sprint";
import { clustersOf } from "@/lib/clusterparse";
import "./gkcover.css";

const ansOf = (q) => {
  if (Number.isInteger(q.answer) && Array.isArray(q.options) && q.options[q.answer] != null) return String(q.options[q.answer]);
  return String(q.answerText || q.correct || "");
};

// Jawab se sirf ⚡ wali line(ein) — poora jawab / prose nahi.
function zapsOf(md) {
  const out = [];
  for (const c of clustersOf(md, { prose: false })) if (c.zap) out.push(c.zap);
  if (!out.length) {
    for (const l of String(md || "").split("\n")) {
      const m = /^\s*(?:[-*]\s*)?(?:\*\*)?⚡(?:\*\*)?\s*(.+)$/.exec(l);
      if (m) out.push(m[1].replace(/\*\*/g, "").trim());
    }
  }
  return [...new Set(out)];
}

function Fact({ q }) {
  const md = getAns(q);
  if (!md) return <span className="gkc-wait">…</span>;
  const zaps = zapsOf(md);
  if (!zaps.length) return <span className="gkc-wait">—</span>;
  const send = (e) => {
    e.stopPropagation();
    const n = addClustersToFacts(md, "gs", q);
    e.currentTarget.textContent = n ? "✓ Fact log" : "✓ pehle se";
    e.currentTarget.disabled = true;
  };
  return (
    <div className="gkc-fact">
      {zaps.map((z, i) => <p key={i}>⚡ {z}</p>)}
      <button type="button" className="gkc-send" onClick={send} title="Ye fact, fact log mein bhejo">＋ Fact log</button>
    </div>
  );
}

export default function GkCover({ qs }) {
  const [hide, setHide] = useState("a");   // "a" = jawab dhako, "q" = sawaal dhako
  const [open, setOpen] = useState({});
  const [n, setN] = useState(30);
  const [cur, setCur] = useState(0);       // jo row abhi kholi — uske agle 5 ka fact peechhe
  const [, setTick] = useState(0);
  const rows = qs.slice(0, n);

  // Saamne wala + agle 5 → SelectAsk apne aap DeepSeek se banata hai.
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: qs[cur] || null, next: qs.slice(cur + 1, cur + 6) } })); } catch { /* ignore */ }
  }, [cur, qs]);
  useEffect(() => () => {
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: null } })); } catch { /* ignore */ }
  }, []);
  // Jawab aaya → fact dikhao.
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("cgl:sprint-ans", on);
    window.addEventListener("cgl:ds-saved", on);
    return () => { window.removeEventListener("cgl:sprint-ans", on); window.removeEventListener("cgl:ds-saved", on); };
  }, []);

  const toggle = (q, i) => {
    const k = q.id ?? i;
    setOpen((x) => ({ ...x, [k]: !x[k] }));
    setCur(i);
  };

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
        <thead><tr><th>#</th><th>Sawaal</th><th>Jawab</th><th>⚡ Fact</th></tr></thead>
        <tbody>
          {rows.map((q, i) => {
            const o = open[q.id ?? i];
            return (
              <tr key={q.id ?? i} onClick={() => toggle(q, i)}>
                <td>{i + 1}</td>
                <td className={hide === "q" && !o ? "is-cov" : ""}><Markdown inline>{q.question}</Markdown></td>
                <td className={hide === "a" && !o ? "is-cov" : ""}><b>{ansOf(q) || "—"}</b></td>
                <td className={!o ? "is-cov" : ""}>{o ? <Fact q={q} /> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {n < qs.length && <button type="button" className="gkc-more" onClick={() => setN((x) => x + 30)}>Aur 30 dikhao ({qs.length - n} bache)</button>}
    </div>
  );
}
