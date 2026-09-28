"use client";

// 🔤 Vocab — JODI MILAO. Baayen 5 sawaal, daayen unke jawab (ulte kram mein);
// baayen se chuno, phir daayen uska jodi-daar. Sahi jodi halki ho kar hat
// jaati hai, galat par jhatka. 5 poori to "Agla set".
//
// Owner ne 15 tareekon mein se yahi (6) chuna — baaki, dropdown aur purana
// Aata/Nahi drill hata diye.
//
// Thaili lib/vocabpool wali: OWS + Idiom/Phrase + Vocab + khud pakde New
// words, sab mix; upar type ki chhaanti. Sawaal-jawab type ke hisaab se:
//   OWS             — definition ↔ word
//   Idiom/Vocab/New — word/phrase ↔ matlab

import { useEffect, useMemo, useState } from "react";

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

export default function VocabMatch({ pool, type }) {
  const ms = useMemo(() => {
    const all = pool.map(toM).filter((m) => m.brief);
    return type === "all" ? all : all.filter((m) => m.type === type);
  }, [pool, type]);
  if (ms.length < 2) return <div className="placeholder">Is chhaanti mein matlab wale word kam hain — koi aur type chuno.</div>;
  return <div className="vlx vlx--6"><Match key={`${type}|${ms.length}`} ms={ms} /></div>;
}
