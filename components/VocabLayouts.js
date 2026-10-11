"use client";

// 🔤 Vocab yaad karne ke 15 tareeke — owner /vocab par 🎨 dropdown se dekh
// kar ek chunega. Thaili wahi lib/vocabpool wali: OWS + Idiom/Phrase + Vocab
// + khud pakde New words, sab mix. Upar type ki chhaanti (Sab / OWS / …).
//
// Har word ka sawaal-jawab uske TYPE ke hisaab se:
//   OWS          — definition dikhe, WORD yaad karo ("One who … = ?")
//   Idiom/Vocab/New — word/phrase dikhe, MATLAB yaad karo
// Spelling wale khel (Type karo, Akshar jodo, Hangman) har type par word hi
// likhwate hain, matlab/definition hint banta hai.
//
// Leitner ke dabbe `cgl.vocab.leitner` mein bachte hain (sync hote hain);
// baaki tareeke ek baithak ke — ginti page band karne par nayi.

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { storeGet, storeSet } from "@/lib/bigstore";

export const VL_LAYOUTS = [
  { id: "1", name: "Flip card — palto aur batao" },
  { id: "2", name: "Ulta card — jawab se sawaal" },
  { id: "3", name: "MCQ — 4 mein se chuno" },
  { id: "4", name: "Type karo — khud likho" },
  { id: "5", name: "Leitner ke 5 dabbe" },
  { id: "6", name: "Jodi milao" },
  { id: "7", name: "Memory tiles" },
  { id: "8", name: "Akshar jodo (jumble)" },
  { id: "9", name: "Speed round — 5 sec" },
  { id: "10", name: "Sach ya Jhooth" },
  { id: "11", name: "Cover method (table)" },
  { id: "12", name: "7 ka jhund — padho phir test" },
  { id: "13", name: "Hangman" },
  { id: "14", name: "A–Z shabdkosh" },
  { id: "15", name: "Reel — ek word, poori screen" },
];

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

// ─── 1 · Flip ───
function Flip({ ms }) {
  const { cur, left, rate, score, reset } = useQueue(ms);
  const [f, setF] = useState(false);
  useEffect(() => setF(false), [cur?.id, left]);
  if (!cur) return <Done score={score} reset={reset} />;
  return (
    <div className="vl1">
      <Score score={score} left={left} />
      <div className={`vl1-card${f ? " is-f" : ""}`} onClick={() => setF(!f)}>
        <div className="vl1-in">
          <div className="vl1-front"><Badge m={cur} /><h2>{cur.q}</h2><small><Ask m={cur} /> · tap karke palto</small></div>
          <div className="vl1-back"><Badge m={cur} /><h3>{cur.word}</h3><div className="vl1-full"><Markdown>{cur.full || cur.brief}</Markdown></div></div>
        </div>
      </div>
      <div className="vlx-rate"><button type="button" className="is-n" onClick={() => rate(false)}>✗ Nahi aata</button><button type="button" className="is-y" onClick={() => rate(true)}>✓ Aata hai</button></div>
    </div>
  );
}

// ─── 2 · Ulta card ───
function Reverse({ ms }) {
  const { cur, left, rate, score, reset } = useQueue(ms);
  const [show, setShow] = useState(false);
  useEffect(() => setShow(false), [cur?.id, left]);
  if (!cur) return <Done score={score} reset={reset} />;
  return (
    <div className="vl2">
      <Score score={score} left={left} />
      <div className="vl2-bubble"><Badge m={cur} /><p>{cur.a}</p></div>
      <div className="vl2-q">?</div>
      <p className="vlx-dim">{cur.qWord ? "Ye kis word/phrase ka matlab hai?" : "Is shabd ki definition kya hai?"}</p>
      {show
        ? <div className="vl2-ans"><b>{cur.q}</b></div>
        : <button type="button" className="vlx-big" onClick={() => setShow(true)}>👁 Jawab dikhao</button>}
      {show && <div className="vlx-rate"><button type="button" className="is-n" onClick={() => rate(false)}>✗ Nahi aaya</button><button type="button" className="is-y" onClick={() => rate(true)}>✓ Aa gaya</button></div>}
    </div>
  );
}

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

// ─── 4 · Type karo ───
function TypeIt({ ms }) {
  const pool = useMemo(() => ms.filter((m) => norm(m.word).length >= 2 && m.brief), [ms]);
  const { cur, left, rate, score, reset } = useQueue(pool);
  const [v, setV] = useState("");
  const [res, setRes] = useState(null);
  const [hint, setHint] = useState(0);
  useEffect(() => { setV(""); setRes(null); setHint(0); }, [cur?.id, left]);
  if (!cur) return <Done score={score} reset={reset} />;
  const target = norm(cur.word);
  const check = () => { if (!res) setRes(norm(v) === target ? "y" : "n"); };
  return (
    <div className="vl4">
      <Score score={score} left={left} />
      <div className="vl4-hint"><Badge m={cur} /><p>{cur.brief}</p></div>
      <div className="vl4-slots">{[...target].map((c, i) => <i key={i} className={c === " " ? "is-sp" : ""}>{c === " " ? "" : i < hint || res ? c : ""}</i>)}</div>
      <input className="vl4-in" value={v} autoFocus placeholder="Word / phrase likho…" onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { if (res) rate(res === "y"); else check(); } }} disabled={!!res} />
      {!res ? (
        <div className="vl4-acts">
          <button type="button" onClick={() => setHint((h) => Math.min(target.length, h + 1))}>💡 Ek akshar</button>
          <button type="button" className="is-go" onClick={check}>✔ Jaancho</button>
        </div>
      ) : (
        <div className={`vl4-res is-${res}`}>
          {res === "y" ? "✓ Sahi!" : <>✗ Sahi jawab: <b>{cur.word}</b></>}
          <button type="button" onClick={() => rate(res === "y")}>Agla →</button>
        </div>
      )}
    </div>
  );
}

// ─── 5 · Leitner ───
const LKEY = "cgl.vocab.leitner";
const readL = () => { try { return JSON.parse(storeGet(LKEY) || "{}") || {}; } catch { return {}; } };
function Leitner({ ms }) {
  const [box, setBox] = useState(readL);
  const [cur, setCur] = useState(null);
  const [show, setShow] = useState(false);
  const bOf = (m) => box[m.id] || 1;
  const counts = [1, 2, 3, 4, 5].map((n) => ms.filter((m) => bOf(m) === n).length);
  const next = (b = box) => {
    const low = [1, 2, 3, 4, 5].find((n) => ms.some((m) => (b[m.id] || 1) === n));
    const list = ms.filter((m) => (b[m.id] || 1) === low);
    setCur(list.length ? list[Math.floor(Math.random() * list.length)] : null);
    setShow(false);
  };
  useEffect(() => { next(); }, [ms]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (ok) => {
    const nb = { ...box, [cur.id]: ok ? Math.min(5, bOf(cur) + 1) : 1 };
    setBox(nb);
    try { storeSet(LKEY, JSON.stringify(nb)); } catch { /* quota */ }
    next(nb);
  };
  return (
    <div className="vl5">
      <div className="vl5-boxes">
        {counts.map((c, i) => (
          <div key={i} className={`vl5-b${cur && bOf(cur) === i + 1 ? " is-cur" : ""}`} style={{ "--h": `${Math.min(100, 8 + (c / Math.max(1, ms.length)) * 92)}%` }}>
            <i /><b>{c}</b><small>Dabba {i + 1}</small><em>{["roz", "2 din", "4 din", "hafta", "pakka"][i]}</em>
          </div>
        ))}
      </div>
      <p className="vlx-dim">Sabse neeche wale dabbe se word aata hai. ✓ = agle dabbe mein, ✗ = wapas Dabba 1.</p>
      {cur && (
        <div className="vl5-card">
          <Badge m={cur} /><h2>{cur.q}</h2>
          {show ? <p className="vl5-a">{cur.a}</p> : <button type="button" className="vlx-big" onClick={() => setShow(true)}>👁 Dikhao</button>}
          {show && <div className="vlx-rate"><button type="button" className="is-n" onClick={() => move(false)}>✗ Dabba 1</button><button type="button" className="is-y" onClick={() => move(true)}>✓ Dabba {Math.min(5, bOf(cur) + 1)}</button></div>}
        </div>
      )}
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

// ─── 8 · Akshar jodo ───
function Jumble({ ms }) {
  const pool = useMemo(() => ms.filter((m) => { const n = norm(m.word).replace(/ /g, ""); return n.length >= 3 && n.length <= 18 && m.brief; }), [ms]);
  const { cur, left, rate, score, reset } = useQueue(pool);
  const letters = useMemo(() => (cur ? shuffle([...norm(cur.word).replace(/ /g, "")].map((c, i) => ({ c, i }))) : []), [cur?.id, left]); // eslint-disable-line react-hooks/exhaustive-deps
  const [used, setUsed] = useState([]);
  const [res, setRes] = useState(null);
  useEffect(() => { setUsed([]); setRes(null); }, [cur?.id, left]);
  if (!cur) return <Done score={score} reset={reset} />;
  const target = norm(cur.word).replace(/ /g, "");
  const built = used.map((i) => letters.find((l) => l.i === i).c).join("");
  const add = (l) => {
    if (res || used.includes(l.i)) return;
    const nu = [...used, l.i];
    setUsed(nu);
    if (nu.length === target.length) setRes(nu.map((i) => letters.find((x) => x.i === i).c).join("") === target ? "y" : "n");
  };
  return (
    <div className="vl8">
      <Score score={score} left={left} />
      <div className="vl4-hint"><Badge m={cur} /><p>{cur.brief}</p></div>
      <div className="vl8-built">{[...target].map((_, i) => <i key={i} className={res ? `is-${res}` : ""}>{built[i] || ""}</i>)}</div>
      <div className="vl8-tiles">{letters.map((l) => <button key={l.i} type="button" disabled={used.includes(l.i)} onClick={() => add(l)}>{l.c.toUpperCase()}</button>)}</div>
      {!res
        ? <div className="vl4-acts"><button type="button" onClick={() => setUsed((u) => u.slice(0, -1))}>⌫ Mitao</button><button type="button" onClick={() => setUsed([])}>↺ Saaf</button></div>
        : <div className={`vl4-res is-${res}`}>{res === "y" ? "✓ Sahi!" : <>✗ Sahi: <b>{cur.word}</b></>}<button type="button" onClick={() => rate(res === "y")}>Agla →</button></div>}
    </div>
  );
}

// ─── 9 · Speed round ───
const SP = 5;
function Speed({ ms }) {
  const { cur, left, rate, score, reset } = useQueue(ms);
  const [run, setRun] = useState(false);
  const [t, setT] = useState(SP);
  useEffect(() => setT(SP), [cur?.id, left]);
  useEffect(() => {
    if (!run || !cur || t <= 0) return undefined;
    const x = setTimeout(() => setT((v) => v - 1), 1000);
    return () => clearTimeout(x);
  }, [run, t, cur]);
  if (!run) return <div className="vl9 vl9-start"><h2>⚡ Speed round</h2><p>Har word par {SP} second. Samay khatam hote hi jawab khulega — phir ✓ ya ✗.</p><button type="button" className="vlx-big" onClick={() => setRun(true)}>▶ Shuru</button></div>;
  if (!cur) return <Done score={score} reset={() => { reset(); setRun(false); }} />;
  return (
    <div className="vl9">
      <Score score={score} left={left} />
      <div className="vl9-bar"><i style={{ width: `${(t / SP) * 100}%` }} /></div>
      <div className="vl9-clock">{t > 0 ? t : "⏰"}</div>
      <Badge m={cur} /><h2>{cur.q}</h2>
      {t > 0 ? <button type="button" className="vlx-ghost" onClick={() => setT(0)}>Abhi dikhao</button> : (
        <>
          <p className="vl9-a">{cur.a}</p>
          <div className="vlx-rate"><button type="button" className="is-n" onClick={() => rate(false)}>✗</button><button type="button" className="is-y" onClick={() => rate(true)}>✓</button></div>
        </>
      )}
    </div>
  );
}

// ─── 10 · Sach ya Jhooth ───
function TrueFalse({ ms }) {
  const pool = useMemo(() => ms.filter((m) => m.brief), [ms]);
  const make = () => {
    const m = pool[Math.floor(Math.random() * pool.length)];
    if (!m) return null;
    const truth = Math.random() < 0.5;
    const other = pickN(pool.filter((x) => norm(x.brief) !== norm(m.brief)), 1, m.id)[0];
    return { m, truth: truth || !other, shown: truth || !other ? m.brief : other.brief };
  };
  const [c, setC] = useState(make);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [fb, setFb] = useState(null);
  if (!c) return <p className="vlx-dim">Matlab wale word nahi.</p>;
  const ans = (say) => {
    const ok = say === c.truth;
    setFb({ ok, real: c.m.brief });
    const s = ok ? streak + 1 : 0;
    setStreak(s); setBest((b) => Math.max(b, s));
    setTimeout(() => { setFb(null); setC(make()); }, ok ? 700 : 1800);
  };
  return (
    <div className="vl10">
      <div className="vl10-top"><span>🔥 Lagataar {streak}</span><span>🏆 Sabse zyada {best}</span></div>
      <div className={`vl10-card${fb ? (fb.ok ? " is-y" : " is-n") : ""}`}>
        <Badge m={c.m} />
        <h2>{c.m.word}</h2>
        <span className="vl10-eq">=</span>
        <p>{c.shown}</p>
        {fb && !fb.ok && <small>Asli matlab: {fb.real}</small>}
      </div>
      <div className="vl10-btns"><button type="button" className="is-n" disabled={!!fb} onClick={() => ans(false)}>✗ Jhooth</button><button type="button" className="is-y" disabled={!!fb} onClick={() => ans(true)}>✓ Sach</button></div>
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

// ─── 12 · 7 ka jhund ───
function Chunk({ ms }) {
  const order = useMemo(() => shuffle(ms), [ms]);
  const [ci, setCi] = useState(0);
  const [phase, setPhase] = useState("read");
  const [open, setOpen] = useState({});
  const [mark, setMark] = useState({});
  const set = order.slice(ci * 7, ci * 7 + 7);
  const total = Math.ceil(order.length / 7);
  const next = () => { setCi((c) => (c + 1) % Math.max(1, total)); setPhase("read"); setOpen({}); setMark({}); };
  const y = Object.values(mark).filter((v) => v).length;
  return (
    <div className="vl12">
      <div className="vl12-top"><b>Jhund {ci + 1} / {total}</b><span>{phase === "read" ? "① Dhyan se padho (7 word)" : "② Ab yaad karke batao"}</span></div>
      <ol className="vl12-list">
        {set.map((m) => (
          <li key={m.id} className={mark[m.id] === true ? "is-y" : mark[m.id] === false ? "is-n" : ""}>
            <div><b>{m.q}</b> <Badge m={m} /></div>
            {phase === "read" || open[m.id]
              ? <p>{m.a}</p>
              : <button type="button" onClick={() => setOpen((o) => ({ ...o, [m.id]: true }))}>👁 {m.qWord ? "Matlab" : "Word"} dikhao</button>}
            {phase === "test" && open[m.id] && mark[m.id] === undefined && (
              <span className="vl12-m"><button type="button" className="is-y" onClick={() => setMark((x) => ({ ...x, [m.id]: true }))}>✓</button><button type="button" className="is-n" onClick={() => setMark((x) => ({ ...x, [m.id]: false }))}>✗</button></span>
            )}
          </li>
        ))}
      </ol>
      {phase === "read"
        ? <button type="button" className="vlx-big" onClick={() => setPhase("test")}>Yaad ho gaye → Test karo</button>
        : Object.keys(mark).length === set.length
          ? <div className="vlx-done"><b>{y}/{set.length} yaad the</b><button type="button" onClick={() => { setPhase("read"); setOpen({}); setMark({}); }}>↺ Yahi jhund dobara</button><button type="button" onClick={next}>Agla jhund →</button></div>
          : null}
    </div>
  );
}

// ─── 13 · Hangman ───
const ABC = "abcdefghijklmnopqrstuvwxyz".split("");
function Hangman({ ms }) {
  const pool = useMemo(() => ms.filter((m) => { const n = norm(m.word); return n.replace(/ /g, "").length >= 3 && n.length <= 24 && m.brief; }), [ms]);
  const { cur, left, rate, score, reset } = useQueue(pool);
  const [g, setG] = useState([]);
  useEffect(() => setG([]), [cur?.id, left]);
  if (!cur) return <Done score={score} reset={reset} />;
  const w = norm(cur.word);
  const wrong = g.filter((c) => !w.includes(c)).length;
  const win = [...w].every((c) => c === " " || g.includes(c));
  const lose = wrong >= 6;
  return (
    <div className="vl13">
      <Score score={score} left={left} />
      <div className="vl13-top">
        <div className="vl13-life">{Array.from({ length: 6 }, (_, i) => <i key={i} className={i < wrong ? "is-gone" : ""}>❤️</i>)}</div>
        <div className="vl4-hint"><Badge m={cur} /><p>{cur.brief}</p></div>
      </div>
      <div className="vl13-word">{[...w].map((c, i) => <i key={i} className={c === " " ? "is-sp" : ""}>{c === " " ? "" : g.includes(c) || lose ? c : ""}</i>)}</div>
      {!win && !lose ? (
        <div className="vl13-keys">{ABC.map((c) => <button key={c} type="button" disabled={g.includes(c)} className={g.includes(c) ? (w.includes(c) ? "is-y" : "is-n") : ""} onClick={() => setG((x) => [...x, c])}>{c}</button>)}</div>
      ) : (
        <div className={`vl4-res is-${win ? "y" : "n"}`}>{win ? "🎉 Bach gaye!" : <>💀 Word tha: <b>{cur.word}</b></>}<button type="button" onClick={() => rate(win)}>Agla →</button></div>
      )}
    </div>
  );
}

// ─── 14 · A–Z shabdkosh ───
function Dict({ ms }) {
  const groups = useMemo(() => {
    const g = new Map();
    for (const m of [...ms].sort((a, b) => a.word.localeCompare(b.word))) {
      const k = (m.word[0] || "#").toUpperCase().replace(/[^A-Z]/, "#");
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(m);
    }
    return [...g.entries()];
  }, [ms]);
  const [open, setOpen] = useState("");
  return (
    <div className="vl14">
      <nav className="vl14-az">{groups.map(([k]) => <a key={k} href={`#vl14-${k}`}>{k}</a>)}</nav>
      {groups.map(([k, list]) => (
        <section key={k} id={`vl14-${k}`}>
          <h3>{k} <small>{list.length}</small></h3>
          {list.map((m) => (
            <div key={m.id} className={`vl14-e${open === m.id ? " is-open" : ""}`} onClick={() => setOpen(open === m.id ? "" : m.id)}>
              <div><b>{m.word}</b> <Badge m={m} /></div>
              <p>{m.brief || <i>matlab nahi</i>}</p>
              {open === m.id && m.full && plain(m.full) !== m.brief && <div className="vl14-full" onClick={(e) => e.stopPropagation()}><Markdown>{m.full}</Markdown></div>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// ─── 15 · Reel ───
function Reel({ ms }) {
  const order = useMemo(() => shuffle(ms).slice(0, 200), [ms]);
  return (
    <div className="vl15">
      {order.map((m, i) => (
        <section key={m.id} className={`vl15-s is-${m.type}`}>
          <small>{i + 1} / {order.length}</small>
          <Badge m={m} />
          <h2>{m.word}</h2>
          <div className="vl15-m"><Markdown>{m.full || m.brief || "—"}</Markdown></div>
          <em>↓ agla</em>
        </section>
      ))}
    </div>
  );
}

const COMP = { 1: Flip, 2: Reverse, 3: Mcq, 4: TypeIt, 5: Leitner, 6: Match, 7: Memory, 8: Jumble, 9: Speed, 10: TrueFalse, 11: Cover, 12: Chunk, 13: Hangman, 14: Dict, 15: Reel };
// In tareekon ko matlab chahiye hi — bina matlab wale word bahar.
const NEEDS_MEANING = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12", "13"]);

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
