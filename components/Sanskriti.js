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
import { readPairs, updatePair, removePair, readEdits, saveEdit } from "@/lib/culturepairs";

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
  { k: "mine", l: "✍️ Mere jode" },
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

// Har set ki jodiyan: { id, l (baayen), r (daayen), note } — owner ke
// badlaav (`cgl.culture.edits`) upar se; "mine" = select menu se bani.
function pairsOf(k) {
  if (k === "mine") return readPairs().map((p) => ({ ...p, id: `my:${p.id}`, mine: p.id }));
  const e = readEdits();
  return basePairs(k).map((p) => (e[p.id] ? { ...p, ...e[p.id], edited: true } : p)).filter((p) => !p.del);
}
function basePairs(k) {
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
// `extra` = owner ki apni jodiyan (✍️) — baaki sets mein beech
// beech mein 1-2 aa jaati hain (galti wali ho to zaroor).
function pickSet(all, extra = []) {
  const g = readGalti();
  // Apni jodi kabhi-kabhi hi beech mein — har set mein nahi (owner: "randomly
  // daalna tha"). Lagbhag 3 mein se 1 set mein ek; galti wali ho to thoda
  // zyada (lagbhag 2 mein se 1).
  const ownSorted = shuffle(extra).sort((a, b) => (g[b.id] ? 1 : 0) - (g[a.id] ? 1 : 0));
  const k = !extra.length ? 0 : Math.random() < (g[ownSorted[0].id] ? 0.45 : 0.3) ? 1 : 0;
  const own = ownSorted.slice(0, k);
  const pool = [...own, ...shuffle(all.filter((x) => g[x.id])), ...shuffle(all.filter((x) => !g[x.id]))];
  const out = []; const usedR = new Set(); const usedL = new Set();
  for (const x of pool) {
    if (usedR.has(norm(x.r)) || usedL.has(norm(x.l))) continue;
    out.push(x); usedR.add(norm(x.r)); usedL.add(norm(x.l));
    if (out.length === 5) break;
  }
  return shuffle(out);
}
// ✏️ Jodi milne ke baad — dono taraf ka text aur explanation badlo.
function EditPair({ x, onDone }) {
  const [f, setF] = useState({ l: x.l, r: x.r, note: x.note || "" });
  const save = () => {
    if (!f.l.trim() || !f.r.trim()) return;
    const patch = { l: f.l.trim(), r: f.r.trim(), note: f.note.trim() };
    if (x.mine) updatePair(x.mine, patch); else saveEdit(x.id, patch);
    onDone(patch);
  };
  const del = () => {
    if (!confirm("Ye jodi hata dein?")) return;
    if (x.mine) removePair(x.mine); else saveEdit(x.id, { del: true });
    onDone(null);
  };
  return (
    <div className="sk-edit" onClick={(e) => e.stopPropagation()}>
      <input value={f.l} onChange={(e) => setF({ ...f, l: e.target.value })} placeholder="Baayen" />
      <input value={f.r} onChange={(e) => setF({ ...f, r: e.target.value })} placeholder="Daayen (jodi-daar)" />
      <textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Explanation" />
      <div><button type="button" className="sk-save" onClick={save}>💾 Save</button><button type="button" onClick={() => onDone(undefined)}>Radd</button><button type="button" className="sk-del" onClick={del}>🗑️ Hatao</button></div>
    </div>
  );
}

// ✍️ Apni saari jodiyan — khelne se pehle bhi dekhna / badalna.
function MineList() {
  const [list, setList] = useState(readPairs);
  const [edit, setEdit] = useState(null);
  if (!list.length) return null;
  return (
    <details className="sk-mine">
      <summary>✍️ Meri saari jodiyan ({list.length}) — dekho / badlo</summary>
      <ul className="sk-notes">
        {list.map((p) => {
          const x = { ...p, id: `my:${p.id}`, mine: p.id };
          return (
            <li key={p.id}><b>{p.l}</b> = <b>{p.r}</b>{p.note ? <span> — {p.note}</span> : null}
              {edit === p.id ? <EditPair x={x} onDone={() => { setEdit(null); setList(readPairs()); }} /> : <button type="button" className="sk-edbtn" onClick={() => setEdit(p.id)}>✏️ Edit</button>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function Match({ setK }) {
  const all = useMemo(() => pairsOf(setK), [setK]);
  const extra = useMemo(() => (setK === "mine" ? [] : pairsOf("mine")), [setK]);
  const [round, setRound] = useState(0);
  const set = useMemo(() => pickSet(all, extra), [all, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(set), [set]);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  const [missed, setMissed] = useState(new Set());
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const [edit, setEdit] = useState(null);
  const [patched, setPatched] = useState({});
  useEffect(() => { setDone([]); setSel(null); setMissed(new Set()); setEdit(null); setPatched({}); }, [set]);
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
  if (setK === "mine" && !all.length) return <div className="sk-done">Abhi koi apni jodi nahi. Kisi bhi page par shabd select karo → 📝 One-liner → 🪔 Statics — jodi-daar likho ya select karo.</div>;
  if (set.length < 2) return <div className="sk-done">Is set mein kam se kam 2 jodi chahiye (abhi {all.length}).</div>;
  return (
    <div className="sk-match">
      <p className="sk-dim">Baayen se chuno, phir daayen uska jodi-daar. {done.length}/{set.length} · ✓ {sc.y} · ✗ {sc.n}</p>
      <div className="sk-cols">
        <div>{set.map((m) => <button key={m.id} type="button" className={done.includes(m.id) ? "is-ok" : sel === m.id ? "is-sel" : ""} onClick={() => !done.includes(m.id) && setSel(m.id)}>{m.l}</button>)}</div>
        <div>{right.map((m) => <button key={m.id} type="button" className={done.includes(m.id) ? "is-ok" : bad === m.id ? "is-bad" : ""} onClick={() => tryR(m)}>{m.r}</button>)}</div>
      </div>
      {done.length > 0 && (
        <ul className="sk-notes">
          {set.filter((x) => done.includes(x.id)).map((x0) => {
            if (patched[x0.id] === null) return null;
            const x = { ...x0, ...(patched[x0.id] || {}) };
            return (
              <li key={x.id} className={missed.has(x.id) ? "is-miss" : ""}>
                {x.mine ? <em className="sk-own" title="Tumhari apni jodi">✍️</em> : null}<b>{x.l}</b> = <b>{x.r}</b>{x.note ? <span> — {x.note}</span> : null}
                {edit === x.id
                  ? <EditPair x={x} onDone={(p) => { if (p !== undefined) setPatched((o) => ({ ...o, [x.id]: p })); setEdit(null); }} />
                  : <button type="button" className="sk-edbtn" onClick={() => setEdit(x.id)}>✏️ Edit</button>}
              </li>
            );
          })}
        </ul>
      )}
      {done.length === set.length && <button type="button" className="sk-go" onClick={() => setRound((r) => r + 1)}>🎉 Agla set →</button>}
    </div>
  );
}

export default function Sanskriti() {
  const [k, setK] = useState("fd");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Select menu se "Kholo →" → /culture?set=mine; apni jodi ho to wahi pehle.
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("set");
    if (q && SETS.some((x) => x.k === q)) setK(q);
    else if (readPairs().length) setK("mine");
    const on = () => setTick((t) => t + 1);
    window.addEventListener("cgl:culture-pairs", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:culture-pairs", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const counts = useMemo(() => Object.fromEntries(SETS.map((s) => [s.k, pairsOf(s.k).length])), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="section sk">
      <h1 className="sk-h">🪔 Bharat Sanskriti · Jodi milao</h1>
      <div className="sk-cats">{SETS.map((s) => <button key={s.k} type="button" className={k === s.k ? "is-on" : ""} onClick={() => setK(s.k)}>{s.l} <small>{counts[s.k]}</small></button>)}</div>
      <Match key={k} setK={k} />
      {k === "mine" && <MineList key={tick} />}
    </section>
  );
}
