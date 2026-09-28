"use client";

// 🔤 Vocab yaad karne ke tareeke — /vocab par 🎨 dropdown. 15 mein se owner
// ne 4 rakhe (3 MCQ, 6 Jodi milao, 7 Memory tiles, 11 Cover method); baaki
// hata diye. Number wahi purane rakhe hain taaki pehchaan na badle.
// Thaili wahi lib/vocabpool wali: OWS + Idiom/Phrase + Vocab + khud pakde
// New words, sab mix. Upar type ki chhaanti (Sab / OWS / …).
//
// Har word ka sawaal-jawab uske TYPE ke hisaab se:
//   OWS          — definition dikhe, WORD yaad karo ("One who … = ?")
//   Idiom/Vocab/New — word/phrase dikhe, MATLAB yaad karo
// Sab tareeke ek baithak ke — ginti page band karne par nayi.

import { useEffect, useMemo, useState } from "react";

export const VL_LAYOUTS = [
  { id: "3", name: "MCQ — 4 mein se chuno" },
  { id: "6", name: "Jodi milao" },
  { id: "7", name: "Memory tiles" },
  { id: "11", name: "Cover method (table)" },
]

export const VL_TYPES = [
  { k: "all", l: "Sab" },
  { k: "ows", l: "🔤 OWS" },
  { k: "idiom", l: "💬 Idiom / Phrase" },
  { k: "vocab", l: "📖 Vocab" },
  { k: "new", l: "📋 New" },
];

// ── chhota matlab (card / option ke liye) ──
const plain = (t) => String(t || "")
  .replace(/\*\*|__|`/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-*•]\s+/gm, "")
  .replace(/\$([^$]*)\$/g, "$1").trim();
const clip = (s, n = 150) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);
function brief(it) {
  const d = plain(it.def);
  if (d) return clip(d.split("\n")[0]);
  const lines = plain(it.mine || it.meaning).split("\n").map((x) => x.trim()).filter(Boolean);
  const l = (lines.find((x) => !/^(meaning|matlab|arth)\s*[:：]?\s*$/i.test(x)) || "")
    .replace(/^(meaning|matlab|arth|hindi)\s*[:：-]\s*/i, "");
  return clip(l);
}
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const pickN = (arr, n, not) => shuffle(arr.filter((x) => x.id !== not)).slice(0, n);

// Ek item → sawaal / jawab.
function toM(it) {
  const b = brief(it);
  const ows = it.type === "ows";
  return {
    id: it.id, word: it.word, type: it.type, label: it.label, icon: it.icon, brief: b, full: it.meaning || it.def || "",
    q: ows ? b : it.word, a: ows ? it.word : b, qWord: !ows,
  };
}

const Badge = ({ m }) => <span className={`vlx-badge is-${m.type}`}>{m.icon} {m.label}</span>;
const Ask = ({ m }) => (m.qWord ? "Iska matlab?" : "Kis ek shabd ka matlab?");

// Galti wala word 3 aage phir aata hai, sahi wala qataar se bahar.
function useQueue(ms) {
  const [q, setQ] = useState(() => shuffle(ms.map((m) => m.id)));
  const [score, setScore] = useState({ y: 0, n: 0 });
  const byId = useMemo(() => new Map(ms.map((m) => [m.id, m])), [ms]);
  const cur = byId.get(q[0]);
  const rate = (ok) => {
    setScore((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 }));
    setQ((x) => { const [h, ...rest] = x; if (ok) return rest; const r = [...rest]; r.splice(Math.min(3, r.length), 0, h); return r; });
  };
  const reset = () => { setQ(shuffle(ms.map((m) => m.id))); setScore({ y: 0, n: 0 }); };
  return { cur, left: q.length, rate, score, reset };
}
const Done = ({ score, reset, text }) => (
  <div className="vlx-done"><b>🏁 {text || "Sab ho gaye!"}</b><span>✓ {score.y} · ✗ {score.n}</span><button type="button" onClick={reset}>↺ Phir se</button></div>
);
const Score = ({ score, left }) => <div className="vlx-score"><span>✓ {score.y}</span><span>✗ {score.n}</span>{left != null && <span>bache {left}</span>}</div>;

// ─── 3 · MCQ ───
function Mcq({ ms }) {
  const { cur, left, rate, score, reset } = useQueue(ms);
  const [pick, setPick] = useState(null);
  const opts = useMemo(() => {
    if (!cur) return [];
    const same = ms.filter((x) => x.qWord === cur.qWord && x.a && norm(x.a) !== norm(cur.a));
    return shuffle([cur, ...pickN(same, 3, cur.id)]);
  }, [cur?.id, left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPick(null), [cur?.id, left]);
  if (!cur) return <Done score={score} reset={reset} />;
  const choose = (o) => {
    if (pick) return;
    setPick(o.id);
    setTimeout(() => rate(o.id === cur.id), 900);
  };
  return (
    <div className="vl3">
      <Score score={score} left={left} />
      <div className="vl3-q"><Badge m={cur} /><h2>{cur.q}</h2><small><Ask m={cur} /></small></div>
      <div className="vl3-opts">
        {opts.map((o, i) => (
          <button key={o.id} type="button" onClick={() => choose(o)}
            className={pick ? (o.id === cur.id ? "is-y" : o.id === pick ? "is-n" : "is-dim") : ""}>
            <b>{"ABCD"[i]}</b><span>{o.a}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 6 · Jodi milao ───
function Match({ ms }) {
  const [round, setRound] = useState(0);
  const set = useMemo(() => pickN(ms.filter((m) => m.a), 5), [ms, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(set), [set]);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  useEffect(() => { setDone([]); setSel(null); }, [set]);
  const tryR = (m) => {
    if (!sel || done.includes(m.id)) return;
    if (m.id === sel) { setDone((d) => [...d, m.id]); setSel(null); }
    else { setBad(m.id); setTimeout(() => setBad(null), 450); }
  };
  return (
    <div className="vl6">
      <p className="vlx-dim">Baayen se chuno, phir daayen uska jodi-daar. {done.length}/{set.length}</p>
      <div className="vl6-cols">
        <div>{set.map((m) => <button key={m.id} type="button" className={done.includes(m.id) ? "is-ok" : sel === m.id ? "is-sel" : ""} onClick={() => !done.includes(m.id) && setSel(m.id)}>{m.q}</button>)}</div>
        <div>{right.map((m) => <button key={m.id} type="button" className={done.includes(m.id) ? "is-ok" : bad === m.id ? "is-bad" : ""} onClick={() => tryR(m)}>{m.a}</button>)}</div>
      </div>
      {done.length === set.length && set.length > 0 && <button type="button" className="vlx-big" onClick={() => setRound((r) => r + 1)}>🎉 Agla set →</button>}
    </div>
  );
}

// ─── 7 · Memory tiles ───
function Memory({ ms }) {
  const [round, setRound] = useState(0);
  const tiles = useMemo(() => shuffle(pickN(ms.filter((m) => m.a), 6).flatMap((m) => [
    { k: `${m.id}|q`, id: m.id, t: m.qWord ? m.word : clip(m.q, 70), s: "q" },
    { k: `${m.id}|a`, id: m.id, t: clip(m.qWord ? m.a : m.word, 70), s: "a" },
  ])), [ms, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [up, setUp] = useState([]);
  const [got, setGot] = useState([]);
  const [moves, setMoves] = useState(0);
  useEffect(() => { setUp([]); setGot([]); setMoves(0); }, [tiles]);
  const flip = (t) => {
    if (up.length === 2 || up.includes(t.k) || got.includes(t.id)) return;
    const nu = [...up, t.k];
    setUp(nu);
    if (nu.length === 2) {
      setMoves((x) => x + 1);
      const [a, b] = nu.map((k) => tiles.find((x) => x.k === k));
      setTimeout(() => { if (a.id === b.id) setGot((g) => [...g, a.id]); setUp([]); }, a.id === b.id ? 350 : 950);
    }
  };
  return (
    <div className="vl7">
      <p className="vlx-dim">Do tile palto — word aur uska matlab mile to jodi. Chaal: {moves} · Jodi: {got.length}/6</p>
      <div className="vl7-grid">
        {tiles.map((t) => {
          const open = up.includes(t.k) || got.includes(t.id);
          return <button key={t.k} type="button" className={`vl7-t${open ? " is-open" : ""}${got.includes(t.id) ? " is-got" : ""} is-${t.s}`} onClick={() => flip(t)}><span>{open ? t.t : "?"}</span></button>;
        })}
      </div>
      {got.length === 6 && <button type="button" className="vlx-big" onClick={() => setRound((r) => r + 1)}>🎉 {moves} chaal mein! Naya khel →</button>}
    </div>
  );
}

// ─── 11 · Cover method ───
function Cover({ ms }) {
  const [hide, setHide] = useState("a");
  const [open, setOpen] = useState({});
  const [n, setN] = useState(30);
  const rows = ms.slice(0, n);
  return (
    <div className="vl11">
      <div className="vl11-bar">
        <span>Chhupao:</span>
        {[["a", "Matlab"], ["w", "Word"]].map(([k, l]) => <button key={k} type="button" className={hide === k ? "is-on" : ""} onClick={() => { setHide(k); setOpen({}); }}>{l}</button>)}
        <button type="button" onClick={() => setOpen({})}>↺ Sab dhako</button>
      </div>
      <table>
        <thead><tr><th>#</th><th>Word / phrase</th><th>Matlab</th></tr></thead>
        <tbody>
          {rows.map((m, i) => {
            const o = open[m.id];
            return (
              <tr key={m.id} onClick={() => setOpen((x) => ({ ...x, [m.id]: !x[m.id] }))}>
                <td>{i + 1}</td>
                <td className={hide === "w" && !o ? "is-cov" : ""}><b>{m.word}</b> <Badge m={m} /></td>
                <td className={hide === "a" && !o ? "is-cov" : ""}>{m.brief || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {n < ms.length && <button type="button" className="vlx-ghost" onClick={() => setN((x) => x + 30)}>Aur 30 dikhao ({ms.length - n} bache)</button>}
    </div>
  );
}

const COMP = { 3: Mcq, 6: Match, 7: Memory, 11: Cover };
// In tareekon ko matlab chahiye hi — bina matlab wale word bahar.
const NEEDS_MEANING = new Set(["3", "6", "7"]);

export default function VocabLayouts({ lay, pool, type }) {
  const ms = useMemo(() => {
    const all = pool.map(toM);
    const t = type === "all" ? all : all.filter((m) => m.type === type);
    return NEEDS_MEANING.has(lay) ? t.filter((m) => m.brief) : t;
  }, [pool, type, lay]);
  const C = COMP[lay];
  if (!C) return null;
  if (!ms.length) return <div className="placeholder">Is chhaanti mein matlab wale word nahi.</div>;
  return <div className={`vlx vlx--${lay}`}><C key={`${lay}|${type}|${ms.length}`} ms={ms} /></div>;
}
