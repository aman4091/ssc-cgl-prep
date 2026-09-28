"use client";

// 🪔 Bharat Sanskriti — sirf JODI MILAO (Vocab wala tareeka): baayen 5,
// daayen unke jawab ulte kram mein; baayen tap, phir daayen jodi-daar.
// Sahi jodi halki ho kar hat jaati hai (neeche Parmar ka note), galat par
// jhatka. 5 poori to "Agla set".
//
// Saari jodiyan Parmar Static se (lib/sanskriti): folk dance → rajya,
// festival → rajya, classical ki chhoti baatein → nritya, guru → nritya,
// milte-julte naam, martial nritya, naya saal, desh-bhar ke tyohar.
// Galat jodi `cgl.culture.galti` mein — agle set mein pehle wahi.

import { useEffect, useMemo, useState } from "react";
import { STATE_NAME, CLASSICAL, EXTRA, allItems, norm, readGalti, markGalti } from "@/lib/sanskriti";

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const sn = (k) => STATE_NAME[k] || k;

// Desh-bhar ke tyohar — Parmar ke note ka chhota saar (daayen dikhne layak).
const IMP = {
  "Makar Sankranti": "Surya Makar mein (Uttarayan)",
  Paryushana: "Jain — Bhadrapad, upvaas",
  "Shahidi Divas": "Guru Arjan Dev (5ve Guru) ki shahadat — Jahangir",
  "Buddha Purnima": "'Thrice Blessed' — janm, gyan, nirvana",
  "Kumbh Mela": "Prayagraj, Haridwar, Nasik, Ujjain — amrit ki boondein",
  "Maha Shivaratri": "Phalgun krishna chaturdashi — Shiva",
  "Karva Chauth": "Kartik — patni pati ke liye upvaas",
  "Bandi Chhor Divas": "Guru Hargobind ki 52 rajaon ke saath rihai",
  "Navroz festival": "Parsi — Balban ne Bharat mein shuru kiya",
  "Tulip Festival": "Asia ka sabse bada — Srinagar",
  Diwali: "Kartik Amavasya — Ram ki Ayodhya vaapsi",
  Holi: "Phalgun Purnima — rangon ka tyohar",
  Navreh: "Kashmiri Pandit ka naya saal (Chaitra)",
  Lohri: "Uttar Bharat — ganne ki fasal",
  Muharram: "Islamic calendar ka pehla mahina",
  "Eid-ul-Fitr": "Ramzan ka ant",
  "Barawafat (Eid-e-Milad-un-Nabi)": "Paigambar Muhammad ka janm (Rabi-ul-Awwal)",
  "Zakat al-Fitr": "Daan (charity)",
};

export const SETS = [
  { k: "fd", l: "🥁 Folk dance → Rajya" },
  { k: "fs", l: "🪔 Festival → Rajya" },
  { k: "cf", l: "💃 Classical — baatein" },
  { k: "cg", l: "🎓 Classical — guru" },
  { k: "cs", l: "💃 Classical → Rajya" },
  { k: "sim", l: "🔀 Milte-julte naam" },
  { k: "mar", l: "⚔️ Martial nritya" },
  { k: "ny", l: "🎆 Naya saal" },
  { k: "imp", l: "🪔 Desh-bhar ke tyohar" },
];

// Har set ki jodiyan: { id, l (baayen), r (daayen), note }
function pairsOf(k) {
  if (k === "fd" || k === "fs") return allItems().filter((x) => x.t === k).map((x) => ({ id: x.id, l: x.n, r: sn(x.st), note: x.note }));
  if (k === "cf") return CLASSICAL.flatMap((c) => c.facts.map((f) => ({ id: `cf:${c.n}:${f}`, l: f, r: c.n, note: "" })));
  if (k === "cg") return CLASSICAL.flatMap((c) => c.guru.map((g) => ({ id: `cg:${c.n}:${g}`, l: g, r: c.n, note: "" })));
  if (k === "cs") return CLASSICAL.map((c) => ({ id: `cd:${c.n}`, l: c.n, r: sn(c.st), note: c.facts.slice(0, 2).join(" · ") }));
  if (k === "sim") return EXTRA.similar.map((s) => { const [a, b] = s.split(":"); return { id: `sim:${a}`, l: a.trim(), r: (b || "").trim(), note: "" }; });
  if (k === "mar") return EXTRA.martial.map((r) => ({ id: `mar:${r[0]}`, l: r[0], r: r[1], note: "" }));
  if (k === "ny") return EXTRA.newyear.map((r) => ({ id: `ny:${r[0]}`, l: r[1], r: r[0], note: r[2] }));
  if (k === "imp") return EXTRA.important.map((r) => ({ id: `imp:${r[0]}`, l: r[0], r: IMP[r[0]] || r[1].slice(0, 70), note: r[1] }));
  return [];
}

// 5 jodiyan — galti wali pehle; daayen ke jawab alag-alag hone chahiye.
function pickSet(all) {
  const g = readGalti();
  const pool = [...shuffle(all.filter((x) => g[x.id])), ...shuffle(all.filter((x) => !g[x.id]))];
  const out = []; const usedR = new Set(); const usedL = new Set();
  for (const x of pool) {
    if (usedR.has(norm(x.r)) || usedL.has(norm(x.l))) continue;
    out.push(x); usedR.add(norm(x.r)); usedL.add(norm(x.l));
    if (out.length === 5) break;
  }
  return out;
}

function Match({ setK }) {
  const all = useMemo(() => pairsOf(setK), [setK]);
  const [round, setRound] = useState(0);
  const set = useMemo(() => pickSet(all), [all, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(set), [set]);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  const [missed, setMissed] = useState(new Set());
  const [sc, setSc] = useState({ y: 0, n: 0 });
  useEffect(() => { setDone([]); setSel(null); setMissed(new Set()); }, [set]);
  const tryR = (m) => {
    if (!sel || done.includes(m.id)) return;
    if (norm(m.r) === norm(set.find((x) => x.id === sel).r)) {
      markGalti(sel, !missed.has(sel));
      setDone((d) => [...d, sel]); setSel(null); setSc((s) => ({ ...s, y: s.y + 1 }));
    } else {
      markGalti(sel, false);
      setMissed((s) => new Set(s).add(sel));
      setBad(m.id); setSc((s) => ({ ...s, n: s.n + 1 }));
      setTimeout(() => setBad(null), 450);
    }
  };
  if (set.length < 2) return <div className="sk-done">Is set mein jodiyan kam hain.</div>;
  return (
    <div className="sk-match">
      <p className="sk-dim">Baayen se chuno, phir daayen uska jodi-daar. {done.length}/{set.length} · ✓ {sc.y} · ✗ {sc.n}</p>
      <div className="sk-cols">
        <div>{set.map((m) => <button key={m.id} type="button" className={done.includes(m.id) ? "is-ok" : sel === m.id ? "is-sel" : ""} onClick={() => !done.includes(m.id) && setSel(m.id)}>{m.l}</button>)}</div>
        <div>{right.map((m) => <button key={m.id} type="button" className={done.includes(m.id) ? "is-ok" : bad === m.id ? "is-bad" : ""} onClick={() => tryR(m)}>{m.r}</button>)}</div>
      </div>
      {done.length > 0 && (
        <ul className="sk-notes">
          {set.filter((x) => done.includes(x.id)).map((x) => <li key={x.id} className={missed.has(x.id) ? "is-miss" : ""}><b>{x.l}</b> = <b>{x.r}</b>{x.note ? <span> — {x.note}</span> : null}</li>)}
        </ul>
      )}
      {done.length === set.length && <button type="button" className="sk-go" onClick={() => setRound((r) => r + 1)}>🎉 Agla set →</button>}
    </div>
  );
}

export default function Sanskriti() {
  const [k, setK] = useState("fd");
  const counts = useMemo(() => Object.fromEntries(SETS.map((s) => [s.k, pairsOf(s.k).length])), []);
  return (
    <section className="section sk">
      <h1 className="sk-h">🪔 Bharat Sanskriti · Jodi milao</h1>
      <div className="sk-cats">{SETS.map((s) => <button key={s.k} type="button" className={k === s.k ? "is-on" : ""} onClick={() => setK(s.k)}>{s.l} <small>{counts[s.k]}</small></button>)}</div>
      <Match key={k} setK={k} />
    </section>
  );
}
