"use client";

// 🎨 One-liners page (/oneliners) ke 10 roop — owner dekh kar ek chunega.
// Har roop wahi `shown` list leta hai jo purani list ko milti hai; kisi bhi
// line par click karo to wahi purana popup (onOpen) khulta hai.
//
//  1 Inbox · 2 Feed · 3 Kanban · 4 Diary · 5 Card deck · 6 Terminal ·
//  7 Bento · 8 Akhbaar · 9 Quiz · 10 Stories

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { olLines, olTitle, isTrickLine, subOf, OL_SUBS } from "@/lib/oneliners";

export const OLR_LAYOUTS = [
  { id: "1", name: "Inbox — list + padhne ka pane" },
  { id: "2", name: "Feed — post jaisa" },
  { id: "3", name: "Kanban — subject ke khane" },
  { id: "4", name: "Diary — din ke hisaab se" },
  { id: "5", name: "Card deck — ek card" },
  { id: "6", name: "Terminal" },
  { id: "7", name: "Bento grid" },
  { id: "8", name: "Akhbaar" },
  { id: "9", name: "Quiz — bold chhupe" },
  { id: "10", name: "Stories" },
];

const COL = { gs: "#10b981", english: "#a855f7", math: "#3b82f6", reasoning: "#f59e0b" };
const colOf = (k) => COL[k] || "#94a3b8";
const M = ({ t }) => <Markdown inline>{t}</Markdown>;
const pad = (n) => String(n).padStart(2, "0");
const dmy = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? "" : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const dkey = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? "—" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// Har record ka taiyaar roop: saaf lines (ginti hata ke) + trick alag.
function useRows(items) {
  return useMemo(() => items.map((o, i) => {
    const all = olLines(o.text);
    return {
      o, i, s: subOf(o.subject), c: colOf(o.subject), title: olTitle(o),
      lines: all.filter((l) => !isTrickLine(l)).map((l) => l.replace(/^\d+[.)]\s*/, "")),
      trick: all.filter(isTrickLine),
    };
  }), [items]);
}

// ←/→ se chalne wale roop (deck, stories, inbox).
function useStepper(n) {
  const [k, setK] = useState(0);
  useEffect(() => { if (k > n - 1) setK(Math.max(0, n - 1)); }, [n, k]);
  const go = (d) => setK((x) => Math.min(n - 1, Math.max(0, x + d)));
  useEffect(() => {
    const on = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || document.querySelector(".modal-overlay")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { go(1); e.preventDefault(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { go(-1); e.preventDefault(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  return [Math.min(k, Math.max(0, n - 1)), setK, go];
}

const Lines = ({ r, ol = false }) => {
  const T = ol ? "ol" : "ul";
  return <T className="olr-lines">{r.lines.map((l, j) => <li key={j}><M t={l} /></li>)}</T>;
};
const Trick = ({ r }) => r.trick.map((l, j) => <div key={j} className="olr-trick"><M t={l} /></div>);

// 1 — Inbox: baayen list, daayen poori line.
function Inbox({ rows }) {
  const [k, setK, go] = useStepper(rows.length);
  const r = rows[k];
  return (
    <div className="olr1">
      <nav className="olr1-list">
        {rows.map((x) => (
          <button key={x.o.id} type="button" className={x.i === k ? "is-on" : ""} onClick={() => setK(x.i)}>
            <i style={{ background: x.c }} />
            <span><b>{x.s.label}</b><small>{dmy(x.o.at)}</small></span>
            <em><M t={x.title} /></em>
          </button>
        ))}
      </nav>
      {r && (
        <article className="olr1-read" style={{ "--c": r.c }}>
          <header>
            <span className="olr1-tag">{r.s.icon} {r.s.label}</span>
            <span className="olr-dim">{dmy(r.o.at)} · {k + 1} / {rows.length}</span>
            <span className="olr1-nav">
              <button type="button" onClick={() => go(-1)} disabled={k === 0}>↑</button>
              <button type="button" onClick={() => go(1)} disabled={k === rows.length - 1}>↓</button>
            </span>
          </header>
          <Lines r={r} ol />
          <Trick r={r} />
        </article>
      )}
    </div>
  );
}

// 2 — Feed: social post jaisa, sab kuch khula.
function Feed({ rows, onOpen, onDelete }) {
  return (
    <div className="olr2">
      {rows.map((r) => (
        <article key={r.o.id} className="olr2-post" style={{ "--c": r.c }}>
          <div className="olr2-av">{r.s.icon}</div>
          <div className="olr2-body">
            <header><b>{r.s.label}</b> <span className="olr-dim">· {dmy(r.o.at)} · #{r.i + 1}</span></header>
            {r.lines.map((l, j) => <p key={j}><M t={l} /></p>)}
            {r.trick.map((l, j) => <blockquote key={j}><M t={l} /></blockquote>)}
            <footer>
              <button type="button" onClick={() => onOpen(r.i)}>🔍 Kholo</button>
              <button type="button" onClick={() => onDelete(r.o.id)}>🗑️ Hatao</button>
            </footer>
          </div>
        </article>
      ))}
    </div>
  );
}

// 3 — Kanban: har subject ka apna khana.
function Kanban({ rows, onOpen }) {
  const cols = OL_SUBS.map((s) => ({ s, list: rows.filter((r) => r.o.subject === s.k) })).filter((c) => c.list.length);
  const other = rows.filter((r) => !OL_SUBS.some((s) => s.k === r.o.subject));
  if (other.length) cols.push({ s: { k: "other", label: "Baaki", icon: "📝" }, list: other });
  return (
    <div className="olr3">
      {cols.map(({ s, list }) => (
        <section key={s.k} className="olr3-col" style={{ "--c": colOf(s.k) }}>
          <h3>{s.icon} {s.label} <span>{list.length}</span></h3>
          {list.map((r) => (
            <button key={r.o.id} type="button" className="olr3-card" onClick={() => onOpen(r.i)}>
              <M t={r.title} />
              <small>{dmy(r.o.at)}{r.lines.length > 1 ? ` · ${r.lines.length} line` : ""}{r.trick.length ? " · 🧠" : ""}</small>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

// 4 — Diary: din ka bada ank baayen, us din ki lines daayen.
function Diary({ rows, onOpen }) {
  const days = [];
  for (const r of rows) {
    const k = dkey(r.o.at);
    if (!days.length || days[days.length - 1].k !== k) days.push({ k, at: r.o.at, list: [] });
    days[days.length - 1].list.push(r);
  }
  return (
    <div className="olr4">
      {days.map((d) => {
        const dt = new Date(d.at);
        const ok = !Number.isNaN(dt.getTime());
        return (
          <section key={d.k} className="olr4-day">
            <div className="olr4-date">
              <b>{ok ? dt.getDate() : "?"}</b>
              <span>{ok ? dt.toLocaleDateString("en-IN", { month: "short" }) : ""}</span>
              <small>{ok ? dt.toLocaleDateString("en-IN", { weekday: "long" }) : ""}</small>
            </div>
            <div className="olr4-entries">
              {d.list.map((r) => (
                <button key={r.o.id} type="button" className="olr4-e" style={{ "--c": r.c }} onClick={() => onOpen(r.i)}>
                  <span className="olr4-sub">{r.s.icon} {r.s.label}</span>
                  {r.lines.map((l, j) => <span key={j} className="olr4-l"><M t={l} /></span>)}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// 5 — Card deck: ek card saamne, peeche gaddi; trick button ke peeche.
function Deck({ rows }) {
  const [k, , go] = useStepper(rows.length);
  const [trick, setTrick] = useState(false);
  useEffect(() => setTrick(false), [k]);
  const r = rows[k];
  if (!r) return null;
  return (
    <div className="olr5">
      <div className="olr5-stack" style={{ "--c": r.c }}>
        <article className="olr5-card" key={r.o.id}>
          <header><span>{r.s.icon} {r.s.label}</span><span>{k + 1} / {rows.length}</span></header>
          <Lines r={r} />
          {r.trick.length > 0 && (trick
            ? <Trick r={r} />
            : <button type="button" className="olr5-tb" onClick={() => setTrick(true)}>🧠 Trick dikhao</button>)}
        </article>
      </div>
      <div className="olr5-nav">
        <button type="button" onClick={() => go(-1)} disabled={k === 0}>← Pichla</button>
        <span className="olr5-dots">{rows.slice(Math.max(0, k - 4), k + 5).map((x) => <i key={x.o.id} className={x.i === k ? "is-on" : ""} />)}</span>
        <button type="button" onClick={() => go(1)} disabled={k === rows.length - 1}>Agla →</button>
      </div>
    </div>
  );
}

// 6 — Terminal: har one-liner ek `cat` command ka output.
function Terminal({ rows, onOpen }) {
  return (
    <div className="olr6">
      <div className="olr6-bar"><i /><i /><i /><span>cgl@oneliners: ~</span></div>
      <div className="olr6-body">
        {rows.map((r) => (
          <button key={r.o.id} type="button" className="olr6-blk" onClick={() => onOpen(r.i)}>
            <div className="olr6-cmd"><span>cgl@oneliners</span>:<em>~/{r.s.k}</em>$ cat {pad(r.i + 1)}.txt <small># {dmy(r.o.at)}</small></div>
            {r.lines.map((l, j) => <div key={j} className="olr6-out"><span>{j + 1}</span><M t={l} /></div>)}
            {r.trick.map((l, j) => <div key={j} className="olr6-tr"># <M t={l} /></div>)}
          </button>
        ))}
        <div className="olr6-cmd"><span>cgl@oneliners</span>:<em>~</em>$ <b className="olr6-cur" /></div>
      </div>
    </div>
  );
}

// 7 — Bento: lambi one-liner bada dabba, chhoti chhota.
function Bento({ rows, onOpen }) {
  return (
    <div className="olr7">
      {rows.map((r) => {
        const len = r.lines.join(" ").length + r.trick.join(" ").length;
        const sz = len > 320 ? "is-xl" : len > 160 ? "is-w" : len > 90 ? "is-t" : "";
        return (
          <button key={r.o.id} type="button" className={`olr7-t ${sz}`} style={{ "--c": r.c }} onClick={() => onOpen(r.i)}>
            <span className="olr7-ic">{r.s.icon}</span>
            <Lines r={r} />
            <Trick r={r} />
            <small>{r.s.label} · {dmy(r.o.at)}</small>
          </button>
        );
      })}
    </div>
  );
}

// 8 — Akhbaar: pehli line headline, baaki khabar; kaagaz aur serif.
function Akhbaar({ rows, onOpen }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="olr8">
      <header className="olr8-mast">
        <small>{today}</small>
        <h2>Ek Line Samachar</h2>
        <small>{rows.length} khabrein · SSC CGL edition</small>
      </header>
      <div className="olr8-cols">
        {rows.map((r) => (
          <article key={r.o.id} className="olr8-a" onClick={() => onOpen(r.i)}>
            <span className="olr8-sec">{r.s.label}</span>
            <h3><M t={r.lines[0] || r.title} /></h3>
            {r.lines.slice(1).map((l, j) => <p key={j}><M t={l} /></p>)}
            {r.trick.map((l, j) => <p key={j} className="olr8-box"><M t={l} /></p>)}
          </article>
        ))}
      </div>
    </div>
  );
}

// 9 — Quiz: bold shabd chhupe; tap karke kholo, phir ✓ / ✗.
function Quiz({ rows }) {
  const [open, setOpen] = useState(() => new Set());
  const [mark, setMark] = useState({});
  const flip = (id) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const yes = Object.values(mark).filter((v) => v === 1).length;
  const no = Object.values(mark).filter((v) => v === -1).length;
  return (
    <div className="olr9">
      <div className="olr9-score">
        <span>Bold shabd chhupe hain — socho, phir card dabao.</span>
        <b className="is-y">✓ {yes}</b><b className="is-n">✗ {no}</b>
        <button type="button" onClick={() => { setOpen(new Set()); setMark({}); }}>↺ Phir se</button>
      </div>
      {rows.map((r) => {
        const sh = open.has(r.o.id);
        return (
          <div key={r.o.id} className={`olr9-q${sh ? " is-open" : ""}${mark[r.o.id] === 1 ? " is-y" : mark[r.o.id] === -1 ? " is-n" : ""}`} style={{ "--c": r.c }}>
            <button type="button" className="olr9-body" onClick={() => flip(r.o.id)}>
              <span className="olr9-n">Q{r.i + 1} · {r.s.icon} {r.s.label}</span>
              <Lines r={r} />
              {sh && <Trick r={r} />}
            </button>
            {sh && (
              <div className="olr9-act">
                <button type="button" onClick={() => setMark((m) => ({ ...m, [r.o.id]: 1 }))}>✓ Yaad tha</button>
                <button type="button" onClick={() => setMark((m) => ({ ...m, [r.o.id]: -1 }))}>✗ Bhool gaya</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 10 — Stories: phone jaisa lamba card, upar patti; baayen/daayen tap.
const STORY_MS = 12000;
function Stories({ rows }) {
  const [k, setK, go] = useStepper(rows.length);
  const [play, setPlay] = useState(true);
  useEffect(() => {
    if (!play || k >= rows.length - 1) return undefined;
    const t = setTimeout(() => setK(k + 1), STORY_MS);
    return () => clearTimeout(t);
  }, [k, play, rows.length, setK]);
  const r = rows[k];
  if (!r) return null;
  const from = Math.max(0, Math.min(k - 5, rows.length - 12));
  const seg = rows.slice(from, from + 12);
  return (
    <div className="olr10">
      <div className="olr10-ph" style={{ "--c": r.c }}>
        <div className="olr10-bars">
          {seg.map((x) => (
            <i key={x.o.id}><b className={x.i < k ? "is-done" : x.i === k ? (play ? "is-run" : "is-hold") : ""} key={`${x.i}-${k}-${play}`} /></i>
          ))}
        </div>
        <header>
          <span className="olr10-av">{r.s.icon}</span>
          <b>{r.s.label}</b><span>{dmy(r.o.at)} · {k + 1}/{rows.length}</span>
          <button type="button" onClick={() => setPlay((p) => !p)} aria-label={play ? "Roko" : "Chalao"}>{play ? "⏸" : "▶"}</button>
        </header>
        <div className="olr10-txt">
          {r.lines.map((l, j) => <p key={j}><M t={l} /></p>)}
          {r.trick.map((l, j) => <p key={j} className="olr10-tr"><M t={l} /></p>)}
        </div>
        <button type="button" className="olr10-tap is-l" onClick={() => go(-1)} aria-label="Pichla" />
        <button type="button" className="olr10-tap is-r" onClick={() => go(1)} aria-label="Agla" />
      </div>
    </div>
  );
}

const COMP = { 1: Inbox, 2: Feed, 3: Kanban, 4: Diary, 5: Deck, 6: Terminal, 7: Bento, 8: Akhbaar, 9: Quiz, 10: Stories };

export default function OneLinersRoop({ lay, items, onOpen, onDelete }) {
  const rows = useRows(items);
  const C = COMP[lay];
  if (!C) return null;
  return <div className={`olr olr--${lay}`}><C rows={rows} onOpen={onOpen} onDelete={onDelete} /></div>;
}
