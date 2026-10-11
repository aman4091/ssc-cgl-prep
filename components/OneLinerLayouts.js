"use client";

// 📝 Mere one-liner ke 15 padhne wale roop (layout). Page ke upar dropdown se
// chunte hain (app/notes/paste). "Purana" roop wahi ka wahi page par hai —
// edit / 🐋 Bold / delete wahin hote hain; ye sab roop sirf PADHNE ke liye.
//
// Data: har note (lib/pastednotes) → parseOneLiner → topic ke khane, har
// khane mein numbered point (⭐ = SSC wala), aur ⚠️ Confusion.
//
//   1  Reel         — ek point poori screen par bada, upar-neeche scroll (snap)
//   2  Cards        — har point ek card, deewar (masonry)
//   3  Copy         — lakeeron wala panna, haath ki likhawat
//   4  Table        — Topic | # | Point | ⭐
//   5  Flashcard    — ek point, ← → se aage-peeche (keyboard bhi)
//   6  Accordion    — topic band; kholo to point
//   7  Do column    — baayen topic chipka, daayen point
//   8  Timeline     — khadi lakeer par bindu
//   9  Sticky notes — rangeen parchiyan
//  10  ⭐ Pehle     — SSC wale point sabse upar, phir baaki
//  11  Kitab        — bade serif akshar, patla column, aaram se padhna
//  12  Chat         — har point ek bubble
//  13  Mind map     — topic ke dabbe, point chips
//  14  Slides       — har topic ek slide, side mein scroll
//  15  Khud yaad karo — bold shabd chhupe; dabao to dikhe

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "./Markdown";
import { parseOneLiner } from "@/lib/onelinerfmt";

export const OL_LAYOUTS = [
  { id: "1", name: "Reel — ek line bade mein" },
  { id: "2", name: "Cards" },
  { id: "3", name: "Copy (likhawat)" },
  { id: "4", name: "Table" },
  { id: "5", name: "Flashcard" },
  { id: "6", name: "Accordion" },
  { id: "7", name: "Do column" },
  { id: "8", name: "Timeline" },
  { id: "9", name: "Sticky notes" },
  { id: "10", name: "⭐ SSC pehle" },
  { id: "11", name: "Kitab (bade akshar)" },
  { id: "12", name: "Chat" },
  { id: "13", name: "Mind map" },
  { id: "14", name: "Slides" },
  { id: "15", name: "Khud yaad karo" },
];

const M = ({ t }) => <Markdown inline>{t}</Markdown>;
const COLORS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe", "#fed7aa"];

// Saare note → khane (section) aur seedhe point ki list.
function useModel(groups) {
  return useMemo(() => {
    const secs = [];
    const pts = [];
    for (const g of groups) {
      for (const n of g.items) {
        for (const s of parseOneLiner(n.text)) {
          const sec = {
            key: `${n.k}|${secs.length}`, note: n, book: g.eyebrow || g.title,
            title: s.title || n.topic || "—", kind: s.kind, points: s.points,
          };
          secs.push(sec);
          s.points.forEach((p, i) => pts.push({ ...p, key: `${sec.key}|${i}`, sec, i }));
        }
      }
    }
    return { secs, pts };
  }, [groups]);
}

const Meta = ({ sec }) => <span className="olx-meta">{sec.book} · p.{sec.note.page}</span>;

// ─── 1 · Reel ───
function Reel({ pts }) {
  const box = useRef(null);
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const on = () => setCur(Math.round(el.scrollTop / el.clientHeight));
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  const go = (d) => { const el = box.current; if (el) el.scrollBy({ top: d * el.clientHeight, behavior: "smooth" }); };
  useEffect(() => {
    const k = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="ol1">
      <div className="ol1-box" ref={box}>
        {pts.map((p, i) => (
          <section key={p.key} className={`ol1-s${p.star ? " is-star" : ""}${p.sec.kind === "warn" ? " is-warn" : ""}`}>
            <span className="ol1-top">{p.sec.kind === "warn" ? "⚠️ " : ""}{p.sec.title}</span>
            <div className="ol1-line">
              {p.star ? <span className="ol1-ssc">⭐ SSC</span> : null}
              <M t={p.text} />
            </div>
            <span className="ol1-foot"><Meta sec={p.sec} /> · {i + 1} / {pts.length}</span>
          </section>
        ))}
      </div>
      <div className="ol1-nav">
        <button type="button" onClick={() => go(-1)} aria-label="Upar">▲</button>
        <b>{Math.min(cur + 1, pts.length)}/{pts.length}</b>
        <button type="button" onClick={() => go(1)} aria-label="Neeche">▼</button>
      </div>
    </div>
  );
}

// ─── 2 · Cards ───
function Cards({ pts }) {
  return (
    <div className="ol2">
      {pts.map((p) => (
        <article key={p.key} className={`ol2-c${p.star ? " is-star" : ""}${p.sec.kind === "warn" ? " is-warn" : ""}`}>
          <span className="ol2-t">{p.sec.kind === "warn" ? "⚠️ " : ""}{p.sec.title}</span>
          <p><M t={p.text} /></p>
          <span className="ol2-f">{p.star ? "⭐ SSC · " : ""}<Meta sec={p.sec} /></span>
        </article>
      ))}
    </div>
  );
}

// ─── 3 · Copy ───
function Copy({ secs }) {
  return (
    <div className="ol3">
      {secs.map((s) => (
        <section key={s.key} className={`ol3-s${s.kind === "warn" ? " is-warn" : ""}`}>
          <h3>{s.kind === "warn" ? "⚠️ " : ""}{s.title}</h3>
          <ol>{s.points.map((p, i) => <li key={i} className={p.star ? "is-star" : ""}><M t={p.text} /></li>)}</ol>
        </section>
      ))}
    </div>
  );
}

// ─── 4 · Table ───
function Table({ pts }) {
  return (
    <div className="ol4">
      <table>
        <thead><tr><th>Topic</th><th>#</th><th>Point</th><th>⭐</th></tr></thead>
        <tbody>
          {pts.map((p, i) => {
            const first = i === 0 || pts[i - 1].sec !== p.sec;
            return (
              <tr key={p.key} className={`${first ? "is-first" : ""}${p.sec.kind === "warn" ? " is-warn" : ""}${p.star ? " is-star" : ""}`}>
                <td className="ol4-t">{first ? <>{p.sec.kind === "warn" ? "⚠️ " : ""}{p.sec.title}<small><Meta sec={p.sec} /></small></> : ""}</td>
                <td className="ol4-n">{p.n || p.i + 1}</td>
                <td><M t={p.text} /></td>
                <td>{p.star ? "⭐" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── 5 · Flashcard ───
function Flash({ pts }) {
  const [i, setI] = useState(0);
  const p = pts[Math.min(i, pts.length - 1)];
  useEffect(() => {
    const k = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, pts.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [pts.length]);
  if (!p) return null;
  return (
    <div className="ol5">
      <div className="ol5-prog"><i style={{ width: `${((i + 1) / pts.length) * 100}%` }} /></div>
      <article className={`ol5-card${p.star ? " is-star" : ""}${p.sec.kind === "warn" ? " is-warn" : ""}`}>
        <span className="ol5-t">{p.sec.kind === "warn" ? "⚠️ " : ""}{p.sec.title}</span>
        <p><M t={p.text} /></p>
        <span className="ol5-f">{p.star ? "⭐ SSC · " : ""}<Meta sec={p.sec} /></span>
      </article>
      <div className="ol5-btns">
        <button type="button" onClick={() => setI(Math.max(i - 1, 0))} disabled={i === 0}>← Pichla</button>
        <b>{i + 1} / {pts.length}</b>
        <button type="button" onClick={() => setI(Math.min(i + 1, pts.length - 1))} disabled={i >= pts.length - 1}>Agla →</button>
      </div>
    </div>
  );
}

// ─── 6 · Accordion ───
function Accordion({ secs }) {
  const [open, setOpen] = useState(() => new Set(secs.slice(0, 1).map((s) => s.key)));
  const t = (k) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className="ol6">
      <div className="ol6-bar">
        <button type="button" onClick={() => setOpen(new Set(secs.map((s) => s.key)))}>Sab kholo</button>
        <button type="button" onClick={() => setOpen(new Set())}>Sab band</button>
      </div>
      {secs.map((s) => (
        <section key={s.key} className={`ol6-s${open.has(s.key) ? " is-open" : ""}${s.kind === "warn" ? " is-warn" : ""}`}>
          <button type="button" className="ol6-h" onClick={() => t(s.key)}>
            <span>{s.kind === "warn" ? "⚠️ " : ""}{s.title}</span>
            <small>{s.points.length} point{s.points.some((p) => p.star) ? ` · ⭐ ${s.points.filter((p) => p.star).length}` : ""}</small>
            <em>{open.has(s.key) ? "−" : "+"}</em>
          </button>
          {open.has(s.key) && <ul>{s.points.map((p, i) => <li key={i} className={p.star ? "is-star" : ""}><M t={p.text} /></li>)}</ul>}
        </section>
      ))}
    </div>
  );
}

// ─── 7 · Do column ───
function TwoCol({ secs }) {
  return (
    <div className="ol7">
      {secs.map((s) => (
        <section key={s.key} className={`ol7-s${s.kind === "warn" ? " is-warn" : ""}`}>
          <aside><h3>{s.kind === "warn" ? "⚠️ " : ""}{s.title}</h3><Meta sec={s} /></aside>
          <ul>{s.points.map((p, i) => <li key={i} className={p.star ? "is-star" : ""}><M t={p.text} /></li>)}</ul>
        </section>
      ))}
    </div>
  );
}

// ─── 8 · Timeline ───
function Timeline({ secs }) {
  return (
    <div className="ol8">
      {secs.map((s) => (
        <section key={s.key} className={`ol8-s${s.kind === "warn" ? " is-warn" : ""}`}>
          <h3>{s.kind === "warn" ? "⚠️ " : ""}{s.title}</h3>
          {s.points.map((p, i) => (
            <div key={i} className={`ol8-p${p.star ? " is-star" : ""}`}><i /><div><M t={p.text} /></div></div>
          ))}
        </section>
      ))}
    </div>
  );
}

// ─── 9 · Sticky notes ───
function Sticky({ pts }) {
  return (
    <div className="ol9">
      {pts.map((p, i) => (
        <div key={p.key} className="ol9-n" style={{ "--bg": p.sec.kind === "warn" ? "#fecaca" : COLORS[i % COLORS.length], "--r": `${((i * 37) % 7) - 3}deg` }}>
          <b>{p.star ? "⭐ " : ""}{p.sec.title}</b>
          <p><M t={p.text} /></p>
        </div>
      ))}
    </div>
  );
}

// ─── 10 · ⭐ pehle ───
function StarFirst({ pts }) {
  const star = pts.filter((p) => p.star);
  const warn = pts.filter((p) => p.sec.kind === "warn");
  const rest = pts.filter((p) => !p.star && p.sec.kind !== "warn");
  const L = ({ list }) => <ul>{list.map((p) => <li key={p.key}><span className="ol10-t">{p.sec.title}</span><M t={p.text} /></li>)}</ul>;
  return (
    <div className="ol10">
      <section className="ol10-star"><h3>⭐ SSC mein aaye / aane layak — {star.length}</h3><L list={star} /></section>
      {warn.length > 0 && <section className="ol10-warn"><h3>⚠️ Confusion — {warn.length}</h3><L list={warn} /></section>}
      <section className="ol10-rest"><h3>Baaki point — {rest.length}</h3><L list={rest} /></section>
    </div>
  );
}

// ─── 11 · Kitab ───
function Book({ secs }) {
  return (
    <article className="ol11">
      {secs.map((s) => (
        <section key={s.key} className={s.kind === "warn" ? "is-warn" : ""}>
          <h3>{s.kind === "warn" ? "⚠️ " : ""}{s.title}</h3>
          {s.points.map((p, i) => <p key={i} className={p.star ? "is-star" : ""}><M t={p.text} /></p>)}
        </section>
      ))}
    </article>
  );
}

// ─── 12 · Chat ───
function Chat({ secs }) {
  return (
    <div className="ol12">
      {secs.map((s) => (
        <section key={s.key}>
          <div className="ol12-q">{s.kind === "warn" ? "⚠️ Kahan confusion hota hai?" : `${s.title} — kya yaad rakhna hai?`}</div>
          {s.points.map((p, i) => <div key={i} className={`ol12-a${p.star ? " is-star" : ""}`}><M t={p.text} /></div>)}
        </section>
      ))}
    </div>
  );
}

// ─── 13 · Mind map ───
function MindMap({ secs }) {
  return (
    <div className="ol13">
      {secs.map((s, k) => (
        <section key={s.key} className={`ol13-s${s.kind === "warn" ? " is-warn" : ""}`} style={{ "--c": ["#3b82f6", "#10b981", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"][k % 6] }}>
          <h3>{s.kind === "warn" ? "⚠️ " : ""}{s.title}</h3>
          <div className="ol13-chips">{s.points.map((p, i) => <span key={i} className={p.star ? "is-star" : ""}><M t={p.text} /></span>)}</div>
        </section>
      ))}
    </div>
  );
}

// ─── 14 · Slides ───
function Slides({ secs }) {
  return (
    <div className="ol14">
      {secs.map((s, k) => (
        <section key={s.key} className={`ol14-s${s.kind === "warn" ? " is-warn" : ""}`}>
          <span className="ol14-n">{k + 1} / {secs.length}</span>
          <h3>{s.kind === "warn" ? "⚠️ " : ""}{s.title}</h3>
          <ul>{s.points.map((p, i) => <li key={i} className={p.star ? "is-star" : ""}><M t={p.text} /></li>)}</ul>
          <Meta sec={s} />
        </section>
      ))}
    </div>
  );
}

// ─── 15 · Khud yaad karo ───
function Recall({ pts }) {
  const [shown, setShown] = useState(() => new Set());
  const t = (k) => setShown((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className="ol15">
      <div className="ol6-bar">
        <span>Bold shabd chhupe hain — pehle khud socho, phir line par tap karo.</span>
        <button type="button" onClick={() => setShown(new Set(pts.map((p) => p.key)))}>Sab dikhao</button>
        <button type="button" onClick={() => setShown(new Set())}>Sab chhupao</button>
      </div>
      {pts.map((p, i) => {
        const first = i === 0 || pts[i - 1].sec !== p.sec;
        return (
          <div key={p.key}>
            {first && <h3 className="ol15-h">{p.sec.kind === "warn" ? "⚠️ " : ""}{p.sec.title}</h3>}
            <button type="button" className={`ol15-p${shown.has(p.key) ? " is-shown" : ""}${p.star ? " is-star" : ""}`} onClick={() => t(p.key)}>
              <M t={p.text} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const MAP = {
  1: "pts:Reel", 2: "pts:Cards", 3: "secs:Copy", 4: "pts:Table", 5: "pts:Flash", 6: "secs:Accordion", 7: "secs:TwoCol",
  8: "secs:Timeline", 9: "pts:Sticky", 10: "pts:StarFirst", 11: "secs:Book", 12: "secs:Chat", 13: "secs:MindMap", 14: "secs:Slides", 15: "pts:Recall",
};
const COMP = { Reel, Cards, Copy, Table, Flash, Accordion, TwoCol, Timeline, Sticky, StarFirst, Book, Chat, MindMap, Slides, Recall };

export default function OneLinerLayouts({ lay, groups }) {
  const { secs, pts } = useModel(groups);
  const [kind, name] = (MAP[lay] || "").split(":");
  const C = COMP[name];
  if (!C) return null;
  if (!pts.length) return <p className="hint">Is chhaanti mein koi point nahi.</p>;
  return <div className={`olx olx--${lay}`}><C {...(kind === "pts" ? { pts } : { secs })} /></div>;
}
