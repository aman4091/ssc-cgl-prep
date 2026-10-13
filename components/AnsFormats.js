"use client";

// 🧩 33 · Do pane — beech wale dabbe ke JAWAB (DeepSeek cluster) ke 20 roop.
// Sirf jawab ka dikhna badalta hai; sawaal, options, list waise hi.
// cs = clustersOf(...) → [{ title, prose, zap }]. Choice `cgl.ansfmt`.

import { useState } from "react";
import Markdown from "./Markdown";
import "./ansfmt.css";

export const ANS_FORMATS = [
  { id: "1", name: "Dabbe (abhi wala)" },
  { id: "2", name: "Saada lekh" },
  { id: "3", name: "Bullet points" },
  { id: "4", name: "⚡ pehle, phir baat" },
  { id: "5", name: "Table" },
  { id: "6", name: "Timeline patti" },
  { id: "7", name: "Index card (line wala kagaz)" },
  { id: "8", name: "Highlighter" },
  { id: "9", name: "Sawaal-jawab" },
  { id: "10", name: "Khulne wale (accordion)" },
  { id: "11", name: "Do khaane — baat | ⚡" },
  { id: "12", name: "Bade number wale step" },
  { id: "13", name: "Rangeen parchi" },
  { id: "14", name: "Chat bubble" },
  { id: "15", name: "Akhbaar kalam" },
  { id: "16", name: "Keyword chips" },
  { id: "17", name: "Bada akshar (padhne wala)" },
  { id: "18", name: "Ek line mein" },
  { id: "19", name: "Mind map" },
  { id: "20", name: "Tab (ek-ek cluster)" },
];

const sents = (p) => String(p || "").split(/(?<=[.!?।])\s+/).map((x) => x.trim()).filter(Boolean);
const KEY = /(\b\d[\d,.]*\b|\b[A-Z][a-zA-Z'-]{2,}(?:\s+[A-Z][a-zA-Z'-]+)*)/g;
function hl(text) {
  const s = String(text || "");
  const out = [];
  let last = 0, m, k = 0;
  KEY.lastIndex = 0;
  while ((m = KEY.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(<mark key={k++} className={/^\d/.test(m[0]) ? "is-n" : "is-w"}>{m[0]}</mark>);
    last = m.index + m[0].length;
  }
  out.push(s.slice(last));
  return out;
}
// ⚡ line ke tukde — "1347 – Zafar Khan · Gulbarga → Bidar" → ["1347 – Zafar Khan", "Gulbarga → Bidar"].
const zapParts = (z) => String(z || "").split(/\s*[·|;•]\s*/).map((x) => x.trim()).filter(Boolean);
const keysOf = (c) => [...new Set(`${c.prose} ${c.zap}`.match(KEY) || [])].slice(0, 10);
const P = ({ t }) => <Markdown inline>{t}</Markdown>;

function Accordion({ cs }) {
  const [open, setOpen] = useState(0);
  return cs.map((c, i) => (
    <section key={i} className={`af10-it${open === i ? " is-open" : ""}`}>
      <button type="button" onClick={() => setOpen(open === i ? -1 : i)}><span>{open === i ? "▾" : "▸"}</span> 🧩 {c.title || `Cluster ${i + 1}`}</button>
      {c.zap ? <p className="af-z">⚡ {c.zap}</p> : null}
      {open === i && c.prose ? <div className="af10-p"><P t={c.prose} /></div> : null}
    </section>
  ));
}
function Tabs({ cs }) {
  const [t, setT] = useState(0);
  const c = cs[Math.min(t, cs.length - 1)];
  return (
    <>
      <div className="af20-tabs">{cs.map((x, i) => <button key={i} type="button" className={i === t ? "is-on" : ""} onClick={() => setT(i)}>{x.title || `Cluster ${i + 1}`}</button>)}</div>
      <div className="af20-body">
        {c.prose ? <p><P t={c.prose} /></p> : null}
        {c.zap ? <p className="af-z">⚡ {c.zap}</p> : null}
      </div>
    </>
  );
}

export default function AnsView({ cs, fmt }) {
  const f = String(fmt || "1");
  switch (f) {
    case "2": return (
      <article className="af2">{cs.map((c, i) => (
        <div key={i}>{c.title ? <h3>{c.title}</h3> : null}{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af2-z">⚡ {c.zap}</p> : null}</div>
      ))}</article>
    );
    case "3": return (
      <div className="af3">{cs.map((c, i) => (
        <div key={i}>{c.title ? <h3>🧩 {c.title}</h3> : null}<ul>{sents(c.prose).map((s, k) => <li key={k}><P t={s} /></li>)}{c.zap ? <li className="af-zl">⚡ {c.zap}</li> : null}</ul></div>
      ))}</div>
    );
    case "4": return (
      <div className="af4">{cs.map((c, i) => (
        <section key={i}>{c.zap ? <p className="af4-z">⚡ {c.zap}</p> : null}{c.title ? <small>🧩 {c.title}</small> : null}{c.prose ? <p className="af4-p"><P t={c.prose} /></p> : null}</section>
      ))}</div>
    );
    case "5": return (
      <div className="af5"><table><thead><tr><th>🧩</th><th>Baat</th><th>⚡</th></tr></thead><tbody>
        {cs.map((c, i) => <tr key={i}><td><b>{c.title}</b></td><td><P t={c.prose} /></td><td className="af5-z">{c.zap}</td></tr>)}
      </tbody></table></div>
    );
    case "6": return (
      <ol className="af6">{cs.map((c, i) => (
        <li key={i}><span className="af6-dot" /><b>{c.title || `Cluster ${i + 1}`}</b>{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af-z">⚡ {c.zap}</p> : null}</li>
      ))}</ol>
    );
    case "7": return (
      <div className="af7">{cs.map((c, i) => (
        <section key={i}>{c.title ? <h3>{c.title}</h3> : null}{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af7-z">⚡ {c.zap}</p> : null}</section>
      ))}</div>
    );
    case "8": return (
      <div className="af8">{cs.map((c, i) => (
        <section key={i}>{c.title ? <h3>🧩 {c.title}</h3> : null}{c.prose ? <p>{hl(c.prose)}</p> : null}{c.zap ? <p className="af-z">⚡ {hl(c.zap)}</p> : null}</section>
      ))}</div>
    );
    case "9": return (
      <div className="af9">{cs.map((c, i) => (
        <section key={i}><p className="af9-q">❓ {c.title ? `${c.title} — kya yaad rakhna hai?` : "Kya yaad rakhna hai?"}</p>{c.prose ? <p className="af9-a"><b>Jawab:</b> <P t={c.prose} /></p> : null}{c.zap ? <p className="af-z">⚡ {c.zap}</p> : null}</section>
      ))}</div>
    );
    case "10": return <div className="af10"><Accordion cs={cs} /></div>;
    case "11": return (
      <div className="af11">{cs.map((c, i) => (
        <section key={i}><div>{c.title ? <h3>🧩 {c.title}</h3> : null}{c.prose ? <p><P t={c.prose} /></p> : null}</div><div className="af11-z">{c.zap ? `⚡ ${c.zap}` : ""}</div></section>
      ))}</div>
    );
    case "12": return (
      <div className="af12">{cs.map((c, i) => (
        <section key={i}><span className="af12-n">{i + 1}</span><div>{c.title ? <h3>{c.title}</h3> : null}{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af-z">⚡ {c.zap}</p> : null}</div></section>
      ))}</div>
    );
    case "13": return (
      <div className="af13">{cs.map((c, i) => (
        <section key={i} className={`c${i % 4}`}>{c.title ? <h3>{c.title}</h3> : null}{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af13-z">⚡ {c.zap}</p> : null}</section>
      ))}</div>
    );
    case "14": return (
      <div className="af14">{cs.map((c, i) => (
        <div key={i} className="af14-g">{c.title ? <div className="af14-h">🧩 {c.title}</div> : null}{sents(c.prose).map((s, k) => <div key={k} className="af14-b"><P t={s} /></div>)}{c.zap ? <div className="af14-b is-z">⚡ {c.zap}</div> : null}</div>
      ))}</div>
    );
    case "15": return (
      <div className="af15">{cs.map((c, i) => (
        <section key={i}>{c.title ? <h3>{c.title}</h3> : null}{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af15-z">⚡ {c.zap}</p> : null}</section>
      ))}</div>
    );
    case "16": return (
      <div className="af16">{cs.map((c, i) => (
        <section key={i}>{c.title ? <h3>🧩 {c.title}</h3> : null}<div className="af16-chips">{keysOf(c).map((k) => <span key={k}>{k}</span>)}</div>{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af-z">⚡ {c.zap}</p> : null}</section>
      ))}</div>
    );
    case "17": return (
      <div className="af17">{cs.map((c, i) => (
        <section key={i}>{c.title ? <h3>{c.title}</h3> : null}{c.prose ? <p><P t={c.prose} /></p> : null}{c.zap ? <p className="af17-z">⚡ {c.zap}</p> : null}</section>
      ))}</div>
    );
    case "18": return (
      <div className="af18">{cs.map((c, i) => (
        <p key={i}><b>🧩 {c.title}</b> — <P t={c.prose} />{c.zap ? <span className="af18-z"> ⚡ {c.zap}</span> : null}</p>
      ))}</div>
    );
    // FINAL (owner): upar ⚡ line keyword chips ki tarah tukdon mein, neeche mind map.
    case "19": return (
      <div className="af19">{cs.map((c, i) => (
        <section key={i}>
          {c.zap ? <div className="af19-zap"><b>⚡</b>{zapParts(c.zap).map((z, k) => <span key={k}>{z}</span>)}</div> : null}
          <div className="af19-c">{c.title || `Cluster ${i + 1}`}</div>
          <div className="af19-br">{sents(c.prose).map((s, k) => <span key={k}><P t={s} /></span>)}</div>
        </section>
      ))}</div>
    );
    case "20": return <div className="af20"><Tabs cs={cs} /></div>;
    default: return (
      <>{cs.map((c, i) => (
        <section key={i} className="mf-cl-it">
          {c.title ? <h3>🧩 {c.title}</h3> : null}
          {c.prose ? <div className="mf-cl-p"><Markdown>{c.prose}</Markdown></div> : null}
          {c.zap ? <p className="mf-cl-z">⚡ {c.zap}</p> : null}
        </section>
      ))}</>
    );
  }
}
