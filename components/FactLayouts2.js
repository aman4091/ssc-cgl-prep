"use client";

// 🧠 Fact log ke 15 NAYE roop — sab "yaad karne" ke liye (pehle wale 15 se
// alag; wo backup mein — backup/README.md). /mission/facts ke 🎨 dropdown
// se chunte hain; "0" abhi wala (Revise + folders) hi default.
//
//  1 Likh ke yaad karo   — pehle khud likho, phir asli se milao
//  2 Ek-ek point         — har point dhundhla, dabao to khule
//  3 Memory palace       — har point ghar ke ek kamre mein
//  4 Pehla akshar        — points ke pehle akshar ka mnemonic
//  5 Kahani chain        — ek topic ke facts ek ke baad ek, judte hue
//  6 Pehchano            — baat padho, 4 mein se kiska fact hai
//  7 Ulta pehchano       — naam se, 4 mein se sahi baat
//  8 Focus — sirf aaj ke — due wale ek-ek karke, 1/3/7/14 ka padaav
//  9 Mind map            — topic beech mein, facts chaaron taraf
// 10 Jodi milao          — naam ↔ baat, 5-5 ke set
// 11 Suno (audio)        — fact bol kar sunata hai
// 12 Slideshow           — apne aap chalta hai: naam, phir baat
// 13 Highlighter         — number, saal, naam peele; sirf highlight bhi
// 14 10 ka test          — 10 fact, aakhir mein score + galat wale
// 15 Kamzor facts        — jo sabse zyada bhoole, wo sabse upar
//
// ✓ / ✗ jahan bhi hai: 1 aur 8 asli 1/3/7/14 schedule (reviewFact) badalte
// hain; quiz wale sirf bhoolne ki ginti (cgl.factmiss) rakhte hain — 15
// usi se banta hai.

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { GAPS, reviewFact } from "@/lib/missionfacts";
import { dayKey } from "@/lib/daytime";
import { toModel } from "@/components/FactFolders";

export const FL2_LAYOUTS = [
  { id: "1", name: "Likh ke yaad karo" },
  { id: "2", name: "Ek-ek point kholo" },
  { id: "3", name: "Memory palace (ghar ke kamre)" },
  { id: "4", name: "Pehla akshar — mnemonic" },
  { id: "5", name: "Kahani chain (topic-wise)" },
  { id: "6", name: "Pehchano — 4 mein se naam" },
  { id: "7", name: "Ulta pehchano — 4 mein se baat" },
  { id: "8", name: "Focus — sirf aaj ke" },
  { id: "9", name: "Mind map" },
  { id: "10", name: "Jodi milao" },
  { id: "11", name: "🔊 Suno (audio)" },
  { id: "12", name: "Slideshow — apne aap" },
  { id: "13", name: "Highlighter" },
  { id: "14", name: "10 ka test" },
  { id: "15", name: "Kamzor facts pehle" },
];

// ── chhote kaam ──────────────────────────────────────────────────────────
function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const plain = (s) => String(s || "").replace(/\*\*|__|`/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-*•]\s+/gm, "").trim();
const clip = (s, n) => { const t = plain(s).replace(/\s+/g, " "); return t.length > n ? `${t.slice(0, n - 1).trim()}…` : t; };
function pointsOf(m) {
  if (m.pts && m.pts.length) return m.pts.map((p) => (p.head ? `${p.head}: ${p.rest}` : p.rest));
  const s = plain(m.body).split(/(?<=[.।;])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
  return s.length ? s : [plain(m.body)];
}
const firstLetter = (s) => { const w = plain(s).match(/[A-Za-zऀ-ॿ0-9]/); return w ? w[0].toUpperCase() : "•"; };

// Bhoolne ki ginti (quiz wale roop) — { id: { miss, seen } }.
const MISS = "cgl.factmiss";
function readMiss() { try { const v = JSON.parse(localStorage.getItem(MISS) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
function markMiss(id, ok) {
  const all = readMiss();
  const e = all[id] || { miss: 0, seen: 0 };
  all[id] = { miss: e.miss + (ok ? 0 : 1), seen: e.seen + 1, at: Date.now() };
  try { localStorage.setItem(MISS, JSON.stringify(all)); } catch { /* quota */ }
}

const Tag = ({ m }) => <span className="fn-tag" style={{ "--c": m.c }}>{m.topic}</span>;
const Empty = ({ children }) => <div className="placeholder">{children}</div>;
function Nav({ i, n, set, extra = null }) {
  return (
    <div className="fn-nav">
      <button type="button" disabled={i <= 0} onClick={() => set(i - 1)}>← pichhla</button>
      <span>{i + 1} / {n}</span>
      {extra}
      <button type="button" disabled={i >= n - 1} onClick={() => set(i + 1)}>agla →</button>
    </div>
  );
}
function Rate({ onRate, labels = ["✗ Bhool gaya", "✓ Yaad tha"] }) {
  return (
    <div className="fn-rate">
      <button type="button" className="is-n" onClick={() => onRate(false)}>{labels[0]}</button>
      <button type="button" className="is-y" onClick={() => onRate(true)}>{labels[1]}</button>
    </div>
  );
}

// ─── 1 · Likh ke yaad karo ───
function WriteRecall({ ms, onChange }) {
  const [order] = useState(() => shuffle(ms.map((m) => m.id)));
  const by = useMemo(() => new Map(ms.map((m) => [m.id, m])), [ms]);
  const [i, setI] = useState(0);
  const [txt, setTxt] = useState("");
  const [show, setShow] = useState(false);
  const [score, setScore] = useState({ y: 0, n: 0 });
  const m = by.get(order[i]);
  if (!m) return <Empty>Sab ho gaye 🎉 — ✓ {score.y} · ✗ {score.n}</Empty>;
  const rate = (ok) => { reviewFact(m.id, ok); markMiss(m.id, ok); onChange(); setScore((s) => ({ y: s.y + (ok ? 1 : 0), n: s.n + (ok ? 0 : 1) })); setI(i + 1); setTxt(""); setShow(false); };
  return (
    <div className="fn1">
      <div className="fn-score">✓ {score.y} · ✗ {score.n} · {i + 1}/{order.length}</div>
      <div className="fn1-q"><Tag m={m} /><h2>{m.head}</h2><p>Is baare mein jo yaad hai, neeche likho — phir milao.</p></div>
      <div className={`fn1-cols${show ? " is-show" : ""}`}>
        <div className="fn1-mine">
          <b>✍️ Tumne likha</b>
          <textarea value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Jo yaad hai…" rows={6} autoFocus />
        </div>
        {show && <div className="fn1-real"><b>📖 Asli</b><Markdown>{m.body}</Markdown></div>}
      </div>
      {!show ? <button type="button" className="fn-big" onClick={() => setShow(true)}>👁️ Asli dikhao</button> : <Rate onRate={rate} />}
    </div>
  );
}

// ─── 2 · Ek-ek point ───
function PointReveal({ ms }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState({});
  const m = ms[i];
  const pts = pointsOf(m);
  const n = pts.filter((_, k) => open[k]).length;
  const go = (x) => { setI(x); setOpen({}); };
  return (
    <div className="fn2">
      <div className="fn2-card">
        <Tag m={m} />
        <h2>{m.head}</h2>
        <p className="fn-dim">Har point pehle mann mein bolo, phir dabao. {n}/{pts.length} khule</p>
        <ol>
          {pts.map((p, k) => (
            <li key={k} className={open[k] ? "is-open" : ""} onClick={() => setOpen((o) => ({ ...o, [k]: true }))}>
              <span>{p}</span>
            </li>
          ))}
        </ol>
        <div className="fn-row">
          <button type="button" onClick={() => setOpen(Object.fromEntries(pts.map((_, k) => [k, true])))}>Sab kholo</button>
          <button type="button" onClick={() => setOpen({})}>Sab dhako</button>
        </div>
      </div>
      <Nav i={i} n={ms.length} set={go} />
    </div>
  );
}

// ─── 3 · Memory palace ───
const ROOMS = [["🚪", "Darwaza"], ["👟", "Joote"], ["🛋️", "Sofa"], ["📺", "TV"], ["🍳", "Rasoi"], ["🧊", "Fridge"], ["🛏️", "Bistar"], ["🪟", "Khidki"], ["🛁", "Bathroom"], ["🪴", "Balcony"], ["🌳", "Aangan"], ["🚗", "Gaadi"]];
function Palace({ ms }) {
  const [i, setI] = useState(0);
  const [mode, setMode] = useState("walk");
  const [open, setOpen] = useState({});
  const m = ms[i];
  const pts = pointsOf(m).slice(0, ROOMS.length);
  const go = (x) => { setI(x); setOpen({}); };
  return (
    <div className="fn3">
      <div className="fn3-hd">
        <div><Tag m={m} /><h2>{m.head}</h2></div>
        <div className="fn-seg">
          <button type="button" className={mode === "walk" ? "is-on" : ""} onClick={() => { setMode("walk"); setOpen({}); }}>🚶 Ghoomo</button>
          <button type="button" className={mode === "test" ? "is-on" : ""} onClick={() => { setMode("test"); setOpen({}); }}>🧠 Yaad karo</button>
        </div>
      </div>
      <p className="fn-dim">{mode === "walk" ? "Ghar mein ghoomte hue har kamre mein ek baat rakh do — tasveer bana kar socho." : "Kamra dekho, wahan kya rakha tha? Dabao to dikhe."}</p>
      <div className="fn3-path">
        {pts.map((p, k) => {
          const shown = mode === "walk" || open[k];
          return (
            <div key={k} className={`fn3-room${shown ? " is-open" : ""}`} onClick={() => setOpen((o) => ({ ...o, [k]: true }))}>
              <div className="fn3-ic">{ROOMS[k][0]}<small>{ROOMS[k][1]}</small></div>
              <div className="fn3-txt">{shown ? p : "❓"}</div>
            </div>
          );
        })}
      </div>
      <Nav i={i} n={ms.length} set={go} />
    </div>
  );
}

// ─── 4 · Pehla akshar ───
function Mnemonic({ ms }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState({});
  const m = ms[i];
  const pts = pointsOf(m);
  const code = pts.map(firstLetter);
  const go = (x) => { setI(x); setOpen({}); };
  return (
    <div className="fn4">
      <Tag m={m} />
      <h2>{m.head}</h2>
      <div className="fn4-code">{code.map((c, k) => <span key={k} className={open[k] ? "is-open" : ""} onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}>{c}</span>)}</div>
      <p className="fn-dim">Har akshar se ek baat — bolo, phir akshar dabao.</p>
      <ul className="fn4-list">
        {pts.map((p, k) => (
          <li key={k} className={open[k] ? "is-open" : ""} onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}>
            <b>{code[k]}</b><span>{open[k] ? p : "…"}</span>
          </li>
        ))}
      </ul>
      <div className="fn-row"><button type="button" onClick={() => setOpen(Object.fromEntries(pts.map((_, k) => [k, true])))}>Sab kholo</button></div>
      <Nav i={i} n={ms.length} set={go} />
    </div>
  );
}

// Topic chunne ki patti (5, 9).
function useTopic(ms) {
  const topics = useMemo(() => {
    const c = new Map();
    for (const m of ms) c.set(m.topic, (c.get(m.topic) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [ms]);
  const [t, setT] = useState(() => (topics[0] ? topics[0][0] : ""));
  const pick = (
    <select className="fn-topic" value={t} onChange={(e) => setT(e.target.value)}>
      {topics.map(([k, n]) => <option key={k} value={k}>{k} ({n})</option>)}
    </select>
  );
  return [ms.filter((m) => m.topic === t), pick];
}

// ─── 5 · Kahani chain ───
function Chain({ ms }) {
  const [list, pick] = useTopic(ms);
  const [hide, setHide] = useState(false);
  const [open, setOpen] = useState({});
  return (
    <div className="fn5">
      <div className="fn-row">{pick}<button type="button" className={hide ? "is-on" : ""} onClick={() => { setHide(!hide); setOpen({}); }}>{hide ? "👁️ Baat dikhao" : "🙈 Baat chhupao"}</button></div>
      <p className="fn-dim">Ek ke baad ek — pichhle se agla jodkar kahani ki tarah padho.</p>
      <div className="fn5-chain">
        {list.map((m, k) => (
          <div key={m.id} className="fn5-step">
            <div className="fn5-no">{k + 1}</div>
            <div className="fn5-card" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}>
              <h3>{m.head}</h3>
              {(!hide || open[m.id]) ? <Markdown>{m.body}</Markdown> : <p className="fn-dim">dabao to khule…</p>}
            </div>
            {k < list.length - 1 && <div className="fn5-link">↓ phir</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 6 / 7 · Pehchano ───
function Pick({ ms, reverse = false }) {
  const pool = useMemo(() => ms.filter((m) => plain(m.body)), [ms]);
  const [order] = useState(() => shuffle(pool.map((m) => m.id)));
  const by = useMemo(() => new Map(pool.map((m) => [m.id, m])), [pool]);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState(null);
  const [score, setScore] = useState({ y: 0, n: 0 });
  const m = by.get(order[i]);
  const opts = useMemo(() => {
    if (!m) return [];
    const others = shuffle(pool.filter((x) => x.id !== m.id && x.head !== m.head)).slice(0, 3);
    return shuffle([m, ...others]);
  }, [m, pool]);
  if (pool.length < 4) return <Empty>Kam se kam 4 fact chahiye.</Empty>;
  if (!m) return <Empty>Ho gaya 🎉 — ✓ {score.y} · ✗ {score.n}</Empty>;
  const choose = (o) => {
    if (ans) return;
    const ok = o.id === m.id;
    setAns(o.id); markMiss(m.id, ok);
    setScore((s) => ({ y: s.y + (ok ? 1 : 0), n: s.n + (ok ? 0 : 1) }));
  };
  return (
    <div className="fn6">
      <div className="fn-score">✓ {score.y} · ✗ {score.n} · {i + 1}/{order.length}</div>
      <div className="fn6-q">
        <Tag m={m} />
        {reverse ? <h2>{m.head}</h2> : <p>{clip(m.body, 260)}</p>}
        <small>{reverse ? "Iske baare mein sahi baat kaunsi?" : "Ye kiske baare mein hai?"}</small>
      </div>
      <div className="fn6-opts">
        {opts.map((o, k) => {
          const st = ans ? (o.id === m.id ? " is-y" : o.id === ans ? " is-n" : " is-dim") : "";
          return <button key={o.id} type="button" className={st} onClick={() => choose(o)}><b>{String.fromCharCode(65 + k)}</b><span>{reverse ? clip(o.body, 140) : o.head}</span></button>;
        })}
      </div>
      {ans && (
        <div className="fn6-after">
          <Markdown>{m.body}</Markdown>
          <button type="button" className="fn-big" onClick={() => { setI(i + 1); setAns(null); }}>Agla →</button>
        </div>
      )}
    </div>
  );
}

// ─── 8 · Focus — sirf aaj ke ───
function Focus({ ms, raw, onChange }) {
  const today = dayKey();
  const [all, setAll] = useState(false);
  const stepOf = useMemo(() => new Map(raw.map((f) => [f.id, f.step || 0])), [raw]);
  const [order] = useState(() => shuffle(ms.filter((m) => m.isDue).map((m) => m.id)));
  const [allOrder] = useState(() => shuffle(ms.map((m) => m.id)));
  const list = all ? allOrder : order;
  const by = useMemo(() => new Map(ms.map((m) => [m.id, m])), [ms]);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const m = by.get(list[i]);
  if (!m) {
    return (
      <div className="fn8-done">
        <b>{list.length ? "Aaj ke sab ho gaye 🎉" : `Aaj (${today}) koi fact due nahi 🎉`}</b>
        {!all && <button type="button" className="fn-big" onClick={() => { setAll(true); setI(0); setShow(false); }}>Phir bhi saare dekho</button>}
      </div>
    );
  }
  const st = stepOf.get(m.id) || 0;
  const rate = (ok) => { reviewFact(m.id, ok); markMiss(m.id, ok); onChange(); setI(i + 1); setShow(false); };
  return (
    <div className="fn8">
      <div className="fn8-steps">
        {GAPS.map((g, k) => <span key={g} className={k < st ? "is-done" : k === st ? "is-now" : ""}>D+{g}</span>)}
        <span className={st >= GAPS.length ? "is-now" : ""}>🏁</span>
      </div>
      <div className="fn8-card">
        <Tag m={m} />
        <h2>{m.head}</h2>
        {show ? <div className="fn8-body"><Markdown>{m.body}</Markdown></div> : <p className="fn-dim">Pehle mann mein poora bolo…</p>}
      </div>
      {!show ? <button type="button" className="fn-big" onClick={() => setShow(true)}>👁️ Dikhao</button> : <Rate onRate={rate} />}
      <div className="fn-score">{i + 1} / {list.length}{all ? " · saare" : " · aaj ke"}</div>
    </div>
  );
}

// ─── 9 · Mind map ───
function MindMap({ ms }) {
  const [list, pick] = useTopic(ms);
  const [sel, setSel] = useState(null);
  const n = list.length;
  const cur = list.find((m) => m.id === sel);
  return (
    <div className="fn9">
      <div className="fn-row">{pick}</div>
      <div className="fn9-map">
        <div className="fn9-center">{list[0] ? list[0].topic : ""}<small>{n} fact</small></div>
        {list.map((m, k) => {
          const ring = n > 10 && k % 2 ? 46 : 36;
          const a = (k / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
          return (
            <button key={m.id} type="button" className={`fn9-node${sel === m.id ? " is-on" : ""}`}
              style={{ left: `${50 + ring * Math.cos(a)}%`, top: `${50 + ring * Math.sin(a)}%`, "--c": m.c }}
              onClick={() => setSel(sel === m.id ? null : m.id)}>
              {clip(m.head, 30)}
            </button>
          );
        })}
      </div>
      {cur && <div className="fn9-pan"><h3>{cur.head}</h3><Markdown>{cur.body}</Markdown></div>}
    </div>
  );
}

// ─── 10 · Jodi milao ───
function Match({ ms }) {
  const pool = useMemo(() => shuffle(ms.filter((m) => plain(m.body))), [ms]);
  const [set, setSet] = useState(0);
  const group = pool.slice(set * 5, set * 5 + 5);
  const rightOrder = useMemo(() => shuffle(group.map((m) => m.id)), [set]); // eslint-disable-line react-hooks/exhaustive-deps
  const [a, setA] = useState(null);
  const [got, setGot] = useState({});
  const [bad, setBad] = useState(null);
  if (!group.length) return <Empty>Saare set ho gaye 🎉</Empty>;
  const by = new Map(group.map((m) => [m.id, m]));
  const tryB = (id) => {
    if (!a || got[id]) return;
    if (a === id) { setGot((g) => ({ ...g, [id]: true })); markMiss(id, true); setA(null); }
    else { markMiss(a, false); setBad(id); setTimeout(() => setBad(null), 400); setA(null); }
  };
  const done = group.every((m) => got[m.id]);
  return (
    <div className="fn10">
      <div className="fn-score">Set {set + 1} / {Math.ceil(pool.length / 5)}</div>
      <div className="fn10-cols">
        <div>{group.map((m) => <button key={m.id} type="button" className={`${a === m.id ? "is-sel" : ""}${got[m.id] ? " is-ok" : ""}`} onClick={() => !got[m.id] && setA(m.id)}>{m.head}</button>)}</div>
        <div>{rightOrder.map((id) => by.get(id) && <button key={id} type="button" className={`${got[id] ? "is-ok" : ""}${bad === id ? " is-bad" : ""}`} onClick={() => tryB(id)}>{clip(by.get(id).body, 120)}</button>)}</div>
      </div>
      {done && <button type="button" className="fn-big" onClick={() => { setSet(set + 1); setGot({}); }}>Agla set →</button>}
    </div>
  );
}

// ─── 11 · Suno ───
function Listen({ ms }) {
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);
  const [rate, setRate] = useState(1);
  const ok = typeof window !== "undefined" && "speechSynthesis" in window;
  const iRef = useRef(i); iRef.current = i;
  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (!ok) return undefined;
    window.speechSynthesis.cancel();
    if (!play) return undefined;
    const m = ms[i];
    if (!m) { setPlay(false); return undefined; }
    let alive = true;
    const say = (t, then) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = /[ऀ-ॿ]/.test(t) ? "hi-IN" : "en-IN";
      u.rate = rate;
      u.onend = () => { if (alive) then(); };
      window.speechSynthesis.speak(u);
    };
    say(plain(m.head), () => setTimeout(() => alive && say(clip(m.body, 900), () => setTimeout(() => alive && setI((x) => x + 1), 900)), 700));
    return () => { alive = false; window.speechSynthesis.cancel(); };
  }, [i, play, rate, ok, ms]);
  if (!ok) return <Empty>Is browser mein bolne wali awaaz nahi hai.</Empty>;
  const m = ms[Math.min(i, ms.length - 1)];
  return (
    <div className="fn11">
      <div className="fn11-card"><Tag m={m} /><h2>{m.head}</h2><Markdown>{m.body}</Markdown></div>
      <div className="fn-row fn11-ctl">
        <button type="button" onClick={() => setI(Math.max(0, i - 1))}>⏮</button>
        <button type="button" className="fn-big" onClick={() => { if (i >= ms.length) setI(0); setPlay(!play); }}>{play ? "⏸ Roko" : "▶ Suno"}</button>
        <button type="button" onClick={() => setI(Math.min(ms.length - 1, i + 1))}>⏭</button>
        {[0.85, 1, 1.25].map((r) => <button key={r} type="button" className={rate === r ? "is-on" : ""} onClick={() => setRate(r)}>{r}×</button>)}
      </div>
      <div className="fn-score">{Math.min(i + 1, ms.length)} / {ms.length} — aankh band karke suno, phir khud bolo.</div>
    </div>
  );
}

// ─── 12 · Slideshow ───
function Slides({ ms }) {
  const [order] = useState(() => shuffle(ms.map((m) => m.id)));
  const by = useMemo(() => new Map(ms.map((m) => [m.id, m])), [ms]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState(0);   // 0 = sirf naam, 1 = baat bhi
  const [play, setPlay] = useState(true);
  const [sec, setSec] = useState(5);
  useEffect(() => {
    if (!play) return undefined;
    const t = setTimeout(() => {
      if (phase === 0) setPhase(1);
      else { setPhase(0); setI((x) => (x + 1) % order.length); }
    }, (phase === 0 ? sec * 0.6 : sec) * 1000);
    return () => clearTimeout(t);
  }, [play, phase, i, sec, order.length]);
  const m = by.get(order[i]);
  if (!m) return null;
  return (
    <div className="fn12">
      <div className="fn12-stage" onClick={() => setPlay(!play)}>
        <Tag m={m} />
        <h2>{m.head}</h2>
        <div className={`fn12-body${phase ? " is-in" : ""}`}><Markdown>{m.body}</Markdown></div>
        {!play && <div className="fn12-pause">⏸</div>}
      </div>
      <div className="fn-row fn11-ctl">
        <button type="button" onClick={() => { setI((i - 1 + order.length) % order.length); setPhase(0); }}>⏮</button>
        <button type="button" className="fn-big" onClick={() => setPlay(!play)}>{play ? "⏸" : "▶"}</button>
        <button type="button" onClick={() => { setI((i + 1) % order.length); setPhase(0); }}>⏭</button>
        {[3, 5, 8].map((s) => <button key={s} type="button" className={sec === s ? "is-on" : ""} onClick={() => setSec(s)}>{s}s</button>)}
      </div>
      <div className="fn-score">{i + 1} / {order.length}</div>
    </div>
  );
}

// ─── 13 · Highlighter ───
const HL = /(\b\d[\d,./:-]*\s*(?:km|kg|%|AD|BC|ई\.?)?|\b(?:[A-Z][a-zA-Z]+)(?:\s+[A-Z][a-zA-Z]+)*)/g;
function Marked({ text }) {
  const t = plain(text);
  const out = [];
  let last = 0;
  t.replace(HL, (mt, _g, off) => { if (off > last) out.push(t.slice(last, off)); out.push(<mark key={off}>{mt}</mark>); last = off + mt.length; return mt; });
  if (last < t.length) out.push(t.slice(last));
  return <p className="fn13-p">{out}</p>;
}
function Highlighter({ ms }) {
  const [only, setOnly] = useState(false);
  const [n, setN] = useState(25);
  return (
    <div className="fn13">
      <div className="fn-row">
        <button type="button" className={!only ? "is-on" : ""} onClick={() => setOnly(false)}>📄 Poora + highlight</button>
        <button type="button" className={only ? "is-on" : ""} onClick={() => setOnly(true)}>🖍️ Sirf highlight</button>
      </div>
      {ms.slice(0, n).map((m) => (
        <div key={m.id} className="fn13-card" style={{ "--c": m.c }}>
          <h3>{m.head}</h3>
          {only
            ? <p className="fn13-only">{(plain(m.body).match(HL) || []).map((x, k) => <mark key={k}>{x}</mark>)}</p>
            : <Marked text={m.body} />}
        </div>
      ))}
      {n < ms.length && <button type="button" className="fn-big" onClick={() => setN(n + 25)}>Aur 25 ({ms.length - n} bache)</button>}
    </div>
  );
}

// ─── 14 · 10 ka test ───
function Test10({ ms }) {
  const make = () => {
    const miss = readMiss();
    const w = (m) => (m.isDue ? 2 : 0) + ((miss[m.id] && miss[m.id].miss) || 0) + Math.random() * 2;
    return [...ms].sort((a, b) => w(b) - w(a)).slice(0, 10).map((m) => m.id);
  };
  const [ids, setIds] = useState(make);
  const by = useMemo(() => new Map(ms.map((m) => [m.id, m])), [ms]);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [res, setRes] = useState({});
  const m = by.get(ids[i]);
  if (!m) {
    const wrong = ids.filter((id) => res[id] === false).map((id) => by.get(id)).filter(Boolean);
    const right = ids.length - wrong.length;
    return (
      <div className="fn14-end">
        <div className="fn14-score"><b>{right}</b>/{ids.length}</div>
        {wrong.length ? <h3>Ye dobara padho:</h3> : <h3>Sab sahi 🎉</h3>}
        {wrong.map((w) => <div key={w.id} className="fn14-wrong"><b>{w.head}</b><Markdown>{w.body}</Markdown></div>)}
        <button type="button" className="fn-big" onClick={() => { setIds(make()); setI(0); setRes({}); setShow(false); }}>Naya test</button>
      </div>
    );
  }
  const rate = (ok) => { markMiss(m.id, ok); setRes((r) => ({ ...r, [m.id]: ok })); setI(i + 1); setShow(false); };
  return (
    <div className="fn14">
      <div className="fn14-bar">{ids.map((id, k) => <i key={id} className={res[id] === true ? "is-y" : res[id] === false ? "is-n" : k === i ? "is-now" : ""} />)}</div>
      <div className="fn8-card"><Tag m={m} /><h2>{m.head}</h2>{show ? <div className="fn8-body"><Markdown>{m.body}</Markdown></div> : <p className="fn-dim">Sawaal {i + 1} — jawab mann mein…</p>}</div>
      {!show ? <button type="button" className="fn-big" onClick={() => setShow(true)}>👁️ Dikhao</button> : <Rate onRate={rate} labels={["✗ Galat", "✓ Sahi"]} />}
    </div>
  );
}

// ─── 15 · Kamzor facts ───
function Weak({ ms }) {
  const [miss, setMiss] = useState(readMiss);
  const [open, setOpen] = useState({});
  const list = ms.filter((m) => miss[m.id] && miss[m.id].miss > 0).sort((a, b) => miss[b.id].miss - miss[a.id].miss);
  const rate = (id, ok) => { markMiss(id, ok); setMiss(readMiss()); };
  if (!list.length) return <Empty>Abhi tak koi fact bhoola nahi gaya — 1, 6, 7, 8, 10, 14 wale roop mein ✗ hote hi yahan aayega.</Empty>;
  const max = miss[list[0].id].miss;
  return (
    <div className="fn15">
      <p className="fn-dim">Sabse zyada bhoole hue sabse upar. Laal = zyada baar.</p>
      {list.map((m) => {
        const e = miss[m.id];
        return (
          <div key={m.id} className="fn15-card" style={{ "--h": e.miss / max }}>
            <div className="fn15-hd" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}>
              <span className="fn15-n">✗ {e.miss}</span>
              <b>{m.head}</b>
              <small>{e.seen} baar dekha</small>
            </div>
            {open[m.id] && (
              <div className="fn15-body">
                <Markdown>{m.body}</Markdown>
                <Rate onRate={(ok) => rate(m.id, ok)} labels={["✗ Abhi bhi nahi", "✓ Ab yaad hai"]} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const COMP = {
  1: WriteRecall, 2: PointReveal, 3: Palace, 4: Mnemonic, 5: Chain, 6: Pick, 7: (p) => <Pick {...p} reverse />,
  8: Focus, 9: MindMap, 10: Match, 11: Listen, 12: Slides, 13: Highlighter, 14: Test10, 15: Weak,
};

export default function FactLayouts2({ lay, facts, onChange }) {
  const today = dayKey();
  const ms = useMemo(() => facts.map((f) => toModel(f, today)).filter((m) => plain(m.head) || plain(m.body)), [facts, today]);
  const C = COMP[lay];
  if (!C) return null;
  if (!ms.length) return <Empty>Abhi koi fact nahi.</Empty>;
  return <div className={`fn fn--${lay}`}><C key={lay} ms={ms} raw={facts} onChange={onChange} /></div>;
}
