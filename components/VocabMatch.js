"use client";

// 🔤 Vocab — JODI MILAO. Baayen 5 sawaal, daayen unke jawab (ulte kram mein);
// baayen se chuno, phir daayen uska jodi-daar. Sahi jodi halki ho kar hat
// jaati hai, galat par jhatka. 5 poori to "Agla set".
//
// Owner ne 15 tareekon mein se yahi (6) chuna — baaki, dropdown aur purana
// Aata/Nahi drill hata diye.
//
// Ab ismein YAAD RAKHNE ka hisaab bhi hai (lib/vocabscore):
//   • jo galat hua wo teen set baad phir aata hai — jab tak sahi na ho jaye
//   • har word 4 baar sahi karna hai; ek baar sahi hone par kuch set ki chhutti
//   • 4 baar ho gaya to wo "✅ 4 ho gaye" khaane mein chala jata hai, aur wahan
//     bhi yahi jodi milao chalta hai (kabhi-kabhi wo bhi wapas aa jata hai)
//
// Thaili lib/vocabpool wali: OWS + Idiom/Phrase + Vocab + khud pakde New
// words, sab mix; upar type ki chhaanti. Sawaal-jawab type ke hisaab se:
//   OWS             — definition ↔ word
//   Idiom/Vocab/New — word/phrase ↔ matlab

import { useEffect, useMemo, useState } from "react";
import { pickSet, commitSet, getScores, statOf, GOAL } from "@/lib/vocabscore";

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


function Match({ ms, onlyDone }) {
  const [round, setRound] = useState(0);
  // Set ab "koi paanch" nahi — lib/vocabscore chunta hai: galat wale pehle,
  // phir jo aaye hi nahi, phir jinka dobara dekhne ka waqt aa gaya.
  const set = useMemo(() => pickSet(ms.filter((m) => m.a), 5, { onlyDone }), [ms, onlyDone, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(set), [set]);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  // Is set mein jinme galti hui — inki ginti aage nahi badhti aur ye jaldi
  // wapas aate hain.
  const [wrong, setWrong] = useState([]);
  useEffect(() => { setDone([]); setSel(null); setWrong([]); }, [set]);

  const tryR = (m) => {
    if (!sel || done.includes(m.id)) return;
    if (m.id === sel) { setDone((d) => [...d, m.id]); setSel(null); }
    else {
      setBad(m.id);
      setWrong((w) => (w.includes(sel) ? w : [...w, sel]));   // jise jodne ki koshish thi
      setTimeout(() => setBad(null), 450);
    }
  };

  const next = () => {
    commitSet(set.map((m) => m.id), wrong);
    setRound((r) => r + 1);
  };

  const sc = getScores();
  return (
    <div className="vl6">
      <p className="vlx-dim">Baayen se chuno, phir daayen uska jodi-daar. {done.length}/{set.length}</p>
      <div className="vl6-cols">
        <div>{set.map((m) => {
          const st = statOf(sc, m.id);
          return (
            <button key={m.id} type="button"
              className={done.includes(m.id) ? "is-ok" : sel === m.id ? "is-sel" : ""}
              onClick={() => !done.includes(m.id) && setSel(m.id)}>
              {m.q}
              {/* Kitni baar sahi ho chuka — chaar bindu, bhare hue jitni baar. */}
              <i className="vl6-dots" aria-hidden="true">{"●".repeat(Math.min(GOAL, st.ok))}{"○".repeat(Math.max(0, GOAL - st.ok))}</i>
            </button>
          );
        })}</div>
        <div>{right.map((m) => <button key={m.id} type="button" className={done.includes(m.id) ? "is-ok" : bad === m.id ? "is-bad" : ""} onClick={() => tryR(m)}>{m.a}</button>)}</div>
      </div>
      {done.length === set.length && set.length > 0 && (
        <button type="button" className="vlx-big" onClick={next}>
          {wrong.length ? `↻ ${wrong.length} galat — teen set baad phir aayenge · Agla set →` : "🎉 Agla set →"}
        </button>
      )}
    </div>
  );
}

export default function VocabMatch({ pool, type }) {
  // "done4" apna khaana hai: wahi word jinki chaar baar ho chuki. Baaki chipon
  // ki tarah ye bhi type se nahi, haalat se chhanta hai.
  const onlyDone = type === "done4";
  const ms = useMemo(() => {
    const all = pool.map(toM).filter((m) => m.brief);
    if (onlyDone || type === "all") return all;
    return all.filter((m) => m.type === type);
  }, [pool, type, onlyDone]);
  if (ms.length < 2) return <div className="placeholder">Is chhaanti mein matlab wale word kam hain — koi aur type chuno.</div>;
  const set = pickSet(ms.filter((m) => m.a), 5, { onlyDone });
  if (!set.length) {
    return (
      <div className="placeholder">
        {onlyDone
          ? "Abhi koi word chaar baar sahi nahi hua. Upar wale khaane se shuru karo."
          : "Sab word chaar-chaar baar ho chuke — ✅ 4 ho gaye wala khaana dekho."}
      </div>
    );
  }
  return <div className="vlx vlx--6"><Match key={`${type}|${ms.length}`} ms={ms} onlyDone={onlyDone} /></div>;
}
