"use client";

// 🏰 GKTricks Medieval — yaad karne ke 20 tareeke (owner dekh kar ek chunega).
// "0" = Cover table (components/GkCover) hi default. Sab sirf sawaal, options
// aur sahi jawab se chalte hain — DeepSeek / fact nahi (Medieval par band).
//
// Galti ki ginti `cgl.medmiss` ({ id: { miss, seen } }) — 12 · Galti diary
// usi se. Leitner ke dabbe `cgl.medleitner`.

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "./Markdown";
import "./medlayouts.css";

export const MED_LAYOUTS = [
  { id: "1", name: "Flashcard — palto" },
  { id: "2", name: "Reel — swipe karo" },
  { id: "3", name: "MCQ fatafat" },
  { id: "4", name: "Ulta card — jawab se sawaal" },
  { id: "5", name: "Type karo" },
  { id: "6", name: "Pehle akshar ka hint" },
  { id: "7", name: "Jodi milao" },
  { id: "8", name: "Sach ya Jhooth" },
  { id: "9", name: "Speed — 5 second" },
  { id: "10", name: "Leitner ke 5 dabbe" },
  { id: "11", name: "10 ka test" },
  { id: "12", name: "Galti diary" },
  { id: "13", name: "Topic jhund (Sultanate, Mughal…)" },
  { id: "14", name: "Timeline — saal ke kram mein" },
  { id: "15", name: "Galat hatao (3 galat option)" },
  { id: "16", name: "Ek line padho — sawaal → jawab" },
  { id: "17", name: "Memory tiles" },
  { id: "18", name: "🔊 Suno" },
  { id: "19", name: "7 ka jhund — padho phir test" },
  { id: "20", name: "Survival — 3 jaan" },
];

// ── saajha ───────────────────────────────────────────────────────────────
export const plain = (s) => String(s || "").replace(/\*\*|__|`|\$/g, "").replace(/\s+/g, " ").trim();
export function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
export const norm = (s) => plain(s).toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]/g, "").replace(/\s+/g, " ").trim();

const MISS = "cgl.medmiss";
export const readJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } };
export const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };
export function mark(id, ok) {
  const all = readJ(MISS, {});
  const e = all[id] || { miss: 0, seen: 0 };
  all[id] = { miss: Math.max(0, e.miss + (ok ? 0 : 1)), seen: e.seen + 1, at: Date.now() };
  writeJ(MISS, all);
}

export const Q = ({ m }) => <Markdown inline>{m.q}</Markdown>;
export const Empty = ({ children }) => <div className="placeholder">{children}</div>;
export function Score({ y, n, extra }) { return <div className="ml-score">✓ {y} · ✗ {n}{extra ? ` · ${extra}` : ""}</div>; }
export function Rate({ onRate, labels = ["✗ Nahi aaya", "✓ Aaya"] }) {
  return (
    <div className="ml-rate">
      <button type="button" className="is-n" onClick={() => onRate(false)}>{labels[0]}</button>
      <button type="button" className="is-y" onClick={() => onRate(true)}>{labels[1]}</button>
    </div>
  );
}
// Galti wala 3 aage phir; sahi wala bahar.
function useQueue(ms) {
  const [q, setQ] = useState(() => shuffle(ms.map((m) => m.id)));
  const [s, setS] = useState({ y: 0, n: 0 });
  const by = useMemo(() => new Map(ms.map((m) => [m.id, m])), [ms]);
  const rate = (ok) => {
    const id = q[0];
    mark(id, ok);
    setS((x) => ({ y: x.y + (ok ? 1 : 0), n: x.n + (ok ? 0 : 1) }));
    setQ((x) => { const r = x.slice(1); if (!ok) r.splice(Math.min(3, r.length), 0, id); return r; });
  };
  return { cur: by.get(q[0]), left: q.length, s, rate, reset: () => { setQ(shuffle(ms.map((m) => m.id))); setS({ y: 0, n: 0 }); } };
}
function Done({ s, reset }) {
  return <div className="ml-done"><b>Sab ho gaye 🎉</b><Score {...s} /><button type="button" className="ml-big" onClick={reset}>Phir se</button></div>;
}
// Galat option (sahi ke alawa) — bank ke apne option, na hon to doosre sawaalon ke jawab.
export function wrongsOf(m, ms, n = 3) {
  const w = (m.opts || []).filter((o, i) => i !== m.ai && plain(o));
  const extra = shuffle(ms.filter((x) => x.id !== m.id && norm(x.a) !== norm(m.a)).map((x) => x.a));
  return [...w, ...extra].slice(0, n);
}

// ─── 1 · Flashcard ───
function Flash({ ms }) {
  const Qu = useQueue(ms);
  const [f, setF] = useState(false);
  if (!Qu.cur) return <Done {...Qu} />;
  const m = Qu.cur;
  return (
    <div className="ml1">
      <Score {...Qu.s} extra={`${Qu.left} bache`} />
      <div className={`ml1-card${f ? " is-f" : ""}`} onClick={() => setF(!f)}>
        <div className="ml1-in">
          <div className="ml1-front"><Q m={m} /><small>dabao → jawab</small></div>
          <div className="ml1-back"><small>Jawab</small><h2>{m.a}</h2></div>
        </div>
      </div>
      {f ? <Rate onRate={(ok) => { Qu.rate(ok); setF(false); }} /> : null}
    </div>
  );
}

// ─── 2 · Reel ───
function Reel({ ms }) {
  const [order] = useState(() => shuffle(ms));
  const [open, setOpen] = useState({});
  return (
    <div className="ml2">
      {order.map((m, i) => (
        <section key={m.id} className="ml2-slide" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}>
          <small>{i + 1} / {order.length}</small>
          <div className="ml2-q"><Q m={m} /></div>
          <div className={`ml2-a${open[m.id] ? " is-open" : ""}`}>{open[m.id] ? m.a : "dabao → jawab"}</div>
        </section>
      ))}
    </div>
  );
}

// ─── 3 · MCQ fatafat ───
function Mcq({ ms }) {
  const Qu = useQueue(ms);
  const [pick, setPick] = useState(null);
  const m = Qu.cur;
  const opts = useMemo(() => (m ? shuffle([m.a, ...wrongsOf(m, ms)]) : []), [m, ms]);
  if (!m) return <Done {...Qu} />;
  const choose = (o) => { if (pick) return; setPick(o); };
  const next = () => { Qu.rate(norm(pick) === norm(m.a)); setPick(null); };
  return (
    <div className="ml3">
      <Score {...Qu.s} extra={`${Qu.left} bache`} />
      <div className="ml-q"><Q m={m} /></div>
      <div className="ml3-opts">
        {opts.map((o, k) => {
          const st = pick ? (norm(o) === norm(m.a) ? " is-y" : o === pick ? " is-n" : " is-dim") : "";
          return <button key={k} type="button" className={st} onClick={() => choose(o)}><b>{String.fromCharCode(65 + k)}</b>{o}</button>;
        })}
      </div>
      {pick ? <button type="button" className="ml-big" onClick={next}>Agla →</button> : null}
    </div>
  );
}

// ─── 4 · Ulta card ───
function Reverse({ ms }) {
  const Qu = useQueue(ms);
  const [f, setF] = useState(false);
  if (!Qu.cur) return <Done {...Qu} />;
  const m = Qu.cur;
  return (
    <div className="ml4">
      <Score {...Qu.s} extra={`${Qu.left} bache`} />
      <div className="ml4-a"><small>Jawab</small><h2>{m.a}</h2><p>Iska sawaal kya tha? Mann mein bolo…</p></div>
      {f ? <><div className="ml-q"><Q m={m} /></div><Rate onRate={(ok) => { Qu.rate(ok); setF(false); }} /></> : <button type="button" className="ml-big" onClick={() => setF(true)}>👁️ Sawaal dikhao</button>}
    </div>
  );
}

// ─── 5 · Type karo ───
function TypeIt({ ms }) {
  const Qu = useQueue(ms);
  const [t, setT] = useState("");
  const [res, setRes] = useState(null);
  if (!Qu.cur) return <Done {...Qu} />;
  const m = Qu.cur;
  const check = () => {
    const a = norm(m.a), g = norm(t);
    const ok = !!g && (a === g || a.includes(g) && g.length >= Math.min(4, a.length) || g.includes(a));
    setRes(ok);
  };
  return (
    <div className="ml5">
      <Score {...Qu.s} extra={`${Qu.left} bache`} />
      <div className="ml-q"><Q m={m} /></div>
      <input className="ml5-in" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (res === null ? check() : (Qu.rate(res), setT(""), setRes(null))); }} placeholder="Jawab likho… (Enter)" autoFocus disabled={res !== null} />
      {res === null
        ? <button type="button" className="ml-big" onClick={check}>Jaancho</button>
        : <div className={`ml5-res ${res ? "is-y" : "is-n"}`}>{res ? "✓ Sahi" : "✗ Sahi jawab:"} <b>{m.a}</b><button type="button" onClick={() => { Qu.rate(res); setT(""); setRes(null); }}>Agla →</button></div>}
    </div>
  );
}

// ─── 6 · Pehle akshar ka hint ───
const hint = (a) => String(a).split(/\s+/).map((w) => (w.length <= 1 ? w : w[0] + "_".repeat(Math.min(w.length - 1, 8)))).join("  ");
function Hint({ ms }) {
  const Qu = useQueue(ms);
  const [f, setF] = useState(false);
  if (!Qu.cur) return <Done {...Qu} />;
  const m = Qu.cur;
  return (
    <div className="ml6">
      <Score {...Qu.s} extra={`${Qu.left} bache`} />
      <div className="ml-q"><Q m={m} /></div>
      <div className="ml6-hint">{f ? m.a : hint(m.a)}</div>
      {f ? <Rate onRate={(ok) => { Qu.rate(ok); setF(false); }} /> : <button type="button" className="ml-big" onClick={() => setF(true)}>👁️ Poora jawab</button>}
    </div>
  );
}

// ─── 7 · Jodi milao ───
function Match({ ms }) {
  const pool = useMemo(() => shuffle(ms), [ms]);
  const [set, setSet] = useState(0);
  const grp = pool.slice(set * 5, set * 5 + 5);
  const right = useMemo(() => shuffle(grp.map((m) => m.id)), [set]); // eslint-disable-line react-hooks/exhaustive-deps
  const [a, setA] = useState(null);
  const [gotL, setGotL] = useState({});
  const [gotR, setGotR] = useState({});
  const [bad, setBad] = useState(null);
  if (!grp.length) return <Empty>Saare set ho gaye 🎉</Empty>;
  const by = new Map(grp.map((m) => [m.id, m]));
  // Do sawaalon ka jawab ek jaisa ho (jaise "Akbar") to koi bhi wala chalega.
  const tryB = (id) => {
    if (!a || gotR[id]) return;
    if (norm(by.get(a).a) === norm(by.get(id).a)) { setGotL((g) => ({ ...g, [a]: true })); setGotR((g) => ({ ...g, [id]: true })); mark(a, true); }
    else { mark(a, false); setBad(id); setTimeout(() => setBad(null), 400); }
    setA(null);
  };
  return (
    <div className="ml7">
      <div className="ml-score">Set {set + 1} / {Math.ceil(pool.length / 5)}</div>
      <div className="ml7-cols">
        <div>{grp.map((m) => <button key={m.id} type="button" className={`${a === m.id ? "is-sel" : ""}${gotL[m.id] ? " is-ok" : ""}`} onClick={() => !gotL[m.id] && setA(m.id)}><Q m={m} /></button>)}</div>
        <div>{right.map((id) => by.get(id) && <button key={id} type="button" className={`${gotR[id] ? "is-ok" : ""}${bad === id ? " is-bad" : ""}`} onClick={() => tryB(id)}>{by.get(id).a}</button>)}</div>
      </div>
      {grp.every((m) => gotL[m.id]) && <button type="button" className="ml-big" onClick={() => { setSet(set + 1); setGotL({}); setGotR({}); }}>Agla set →</button>}
    </div>
  );
}

// ─── 8 · Sach ya Jhooth ───
function TrueFalse({ ms }) {
  const [order] = useState(() => shuffle(ms).map((m) => ({ m, truth: Math.random() < 0.5 })));
  const [i, setI] = useState(0);
  const [res, setRes] = useState(null);
  const [s, setS] = useState({ y: 0, n: 0 });
  const it = order[i];
  const shown = useMemo(() => (it ? (it.truth ? it.m.a : (wrongsOf(it.m, ms, 1)[0] || it.m.a)) : ""), [it, ms]);
  if (!it) return <Done s={s} reset={() => { setI(0); setS({ y: 0, n: 0 }); }} />;
  const truth = norm(shown) === norm(it.m.a);
  const answer = (v) => { if (res) return; const ok = v === truth; mark(it.m.id, ok); setRes(ok ? "y" : "n"); setS((x) => ({ y: x.y + (ok ? 1 : 0), n: x.n + (ok ? 0 : 1) })); setTimeout(() => { setRes(null); setI((k) => k + 1); }, ok ? 700 : 1800); };
  return (
    <div className="ml8">
      <Score {...s} extra={`${i + 1}/${order.length}`} />
      <div className={`ml8-card${res ? ` is-${res}` : ""}`}>
        <div className="ml-q"><Q m={it.m} /></div>
        <div className="ml8-eq">=</div>
        <h2>{shown}</h2>
        {res === "n" ? <p>Sahi jawab: <b>{it.m.a}</b></p> : null}
      </div>
      <div className="ml8-btns">
        <button type="button" className="is-n" onClick={() => answer(false)}>✗ Jhooth</button>
        <button type="button" className="is-y" onClick={() => answer(true)}>✓ Sach</button>
      </div>
    </div>
  );
}

// ─── 9 · Speed ───
function Speed({ ms }) {
  const [order] = useState(() => shuffle(ms));
  const [i, setI] = useState(0);
  const [t, setT] = useState(5);
  const [run, setRun] = useState(true);
  useEffect(() => {
    if (!run) return undefined;
    const id = setTimeout(() => { if (t > -2) setT(t - 1); else { setT(5); setI((k) => (k + 1) % order.length); } }, 1000);
    return () => clearTimeout(id);
  }, [t, run, order.length]);
  const m = order[i];
  return (
    <div className="ml9">
      <div className="ml9-bar"><i style={{ width: `${Math.max(0, t) * 20}%` }} /></div>
      <div className="ml9-clock">{t > 0 ? t : "⏰"}</div>
      <div className="ml-q"><Q m={m} /></div>
      <h2 className={t > 0 ? "is-hid" : ""}>{t > 0 ? "…" : m.a}</h2>
      <div className="ml-row">
        <button type="button" onClick={() => setRun(!run)}>{run ? "⏸ Roko" : "▶ Chalao"}</button>
        <button type="button" onClick={() => { setT(5); setI((k) => (k + 1) % order.length); }}>Agla ⏭</button>
        <span className="ml-dim">{i + 1} / {order.length}</span>
      </div>
    </div>
  );
}

// ─── 10 · Leitner ───
const LB = "cgl.medleitner";
function Leitner({ ms }) {
  const [box, setBox] = useState(() => readJ(LB, {}));
  const [f, setF] = useState(false);
  const [seed] = useState(() => Math.random());
  const bx = (m) => box[m.id] || 1;
  const counts = [1, 2, 3, 4, 5].map((b) => ms.filter((m) => bx(m) === b).length);
  const low = counts.findIndex((c) => c > 0) + 1;
  const pool = ms.filter((m) => bx(m) === low);
  const m = pool.length ? pool[Math.floor(seed * 9973 + Object.keys(box).length) % pool.length] : null;
  const rate = (ok) => {
    const nb = { ...box, [m.id]: ok ? Math.min(5, bx(m) + 1) : 1 };
    setBox(nb); writeJ(LB, nb); mark(m.id, ok); setF(false);
  };
  return (
    <div className="ml10">
      <div className="ml10-boxes">{counts.map((c, k) => <div key={k} className={`ml10-b${low === k + 1 ? " is-cur" : ""}`}><b>{c}</b><small>Dabba {k + 1}</small></div>)}</div>
      {m ? (
        <div className="ml10-card">
          <div className="ml-q"><Q m={m} /></div>
          {f ? <><h2>{m.a}</h2><Rate onRate={rate} /></> : <button type="button" className="ml-big" onClick={() => setF(true)}>👁️ Jawab</button>}
        </div>
      ) : <Empty>Sab dabba 5 mein 🎉</Empty>}
      <p className="ml-dim">✓ = agla dabba · ✗ = wapas dabba 1 · sabse neeche wale dabbe se pehle</p>
    </div>
  );
}

// ─── 11 · 10 ka test ───
function Test10({ ms }) {
  const make = () => shuffle(ms).slice(0, 10);
  const [set, setSet] = useState(make);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [res, setRes] = useState({});
  const m = set[i];
  const opts = useMemo(() => (m ? shuffle([m.a, ...wrongsOf(m, ms)]) : []), [m, ms]);
  if (!m) {
    const wrong = set.filter((x) => res[x.id] === false);
    return (
      <div className="ml11-end">
        <div className="ml11-score"><b>{set.length - wrong.length}</b> / {set.length}</div>
        {wrong.length ? <h3>Ye dobara dekho:</h3> : <h3>Sab sahi 🎉</h3>}
        {wrong.map((w) => <div key={w.id} className="ml11-wrong"><Q m={w} /><b>→ {w.a}</b></div>)}
        <button type="button" className="ml-big" onClick={() => { setSet(make()); setI(0); setRes({}); }}>Naya test</button>
      </div>
    );
  }
  return (
    <div className="ml3">
      <div className="ml11-bar">{set.map((x, k) => <i key={x.id} className={res[x.id] === true ? "is-y" : res[x.id] === false ? "is-n" : k === i ? "is-now" : ""} />)}</div>
      <div className="ml-q"><Q m={m} /></div>
      <div className="ml3-opts">
        {opts.map((o, k) => {
          const st = pick ? (norm(o) === norm(m.a) ? " is-y" : o === pick ? " is-n" : " is-dim") : "";
          return <button key={k} type="button" className={st} onClick={() => { if (pick) return; setPick(o); const ok = norm(o) === norm(m.a); mark(m.id, ok); setRes((r) => ({ ...r, [m.id]: ok })); }}><b>{String.fromCharCode(65 + k)}</b>{o}</button>;
        })}
      </div>
      {pick ? <button type="button" className="ml-big" onClick={() => { setPick(null); setI(i + 1); }}>Agla →</button> : null}
    </div>
  );
}

// ─── 12 · Galti diary ───
function Diary({ ms }) {
  const [miss, setMiss] = useState(() => readJ(MISS, {}));
  const [open, setOpen] = useState({});
  const list = ms.filter((m) => miss[m.id] && miss[m.id].miss > 0).sort((a, b) => miss[b.id].miss - miss[a.id].miss);
  if (!list.length) return <Empty>Abhi koi galti nahi — kisi bhi tareeke mein ✗ hote hi sawaal yahan aayega.</Empty>;
  const fixed = (id) => { const all = readJ(MISS, {}); if (all[id]) all[id].miss = Math.max(0, all[id].miss - 1); writeJ(MISS, all); setMiss(all); };
  return (
    <div className="ml12">
      {list.map((m) => (
        <div key={m.id} className="ml12-row" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}>
          <span className="ml12-n">✗ {miss[m.id].miss}</span>
          <div className="ml12-q"><Q m={m} />{open[m.id] ? <div className="ml12-a"><b>{m.a}</b><button type="button" onClick={(e) => { e.stopPropagation(); fixed(m.id); }}>✓ Ab yaad hai</button></div> : null}</div>
        </div>
      ))}
    </div>
  );
}

// ─── 13 · Topic jhund ───
export const GROUPS = [
  ["🗡️ Delhi Sultanate", /sultan|slave dynasty|ghulam|mamluk|khal?ji|tughl?aq|lodi|sayyid|aibak|iltutmish|balban|alauddin|ala-ud-din|razia|firoz|muhammad bin|qutb/],
  ["👑 Mughal", /mughal|babur|humayun|akbar|jahangir|shah ?jahan|aurangzeb|nur ?jahan|dara|sher shah|suri|bairam|todar|birbal/],
  ["🏯 Vijayanagar / Bahmani / Dakshin", /vijayanagar|krishna ?deva|hampi|bahmani|deccan|golconda|bijapur|ahmadnagar|chola|chalukya|rashtrakuta|pallava|hoysala|kakatiya|yadava/],
  ["🙏 Bhakti / Sufi", /bhakti|sufi|kabir|nanak|guru|mira ?bai|chishti|nizamuddin|tulsi|surdas|chaitanya|ramanand|vallabh|namdev|tukaram|dadu|ravidas|saint|sant|annamacharya|silsila/],
  ["⚔️ Maratha / Rajput", /shivaji|maratha|peshwa|rajput|rana|pratap|prithviraj|mewar|marwar|sikh|ranjit/],
  ["🏛️ Imarat / Kala", /built|construct|fort|minar|mosque|masjid|tomb|maqbara|darwaza|mahal|temple|mandir|architecture|painting|music|raga|book|wrote|author|biography|nama\b|nama /],
  ["🛡️ Yudh", /battle|war|yudh|panipat|tarain|haldighati|khanwa|talikota|chausa|kannauj|invasion|invaded/],
  ["🧭 Videshi yatri / Prashasan", /traveller|traveler|ibn|marco|bernier|nikitin|abdur|tax|jizya|iqta|mansab|zabt|currency|coin|administration|revenue/],
];
function Groups({ ms }) {
  const groups = useMemo(() => {
    const g = GROUPS.map(([l]) => ({ l, items: [] }));
    const rest = { l: "📦 Baaki", items: [] };
    for (const m of ms) {
      const t = `${plain(m.q)} ${plain(m.a)}`.toLowerCase();
      const k = GROUPS.findIndex(([, re]) => re.test(t));
      (k >= 0 ? g[k] : rest).items.push(m);
    }
    return [...g, rest].filter((x) => x.items.length);
  }, [ms]);
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState({});
  const g = groups[Math.min(cur, groups.length - 1)];
  return (
    <div className="ml13">
      <div className="ml-chips">{groups.map((x, k) => <button key={x.l} type="button" className={k === cur ? "is-on" : ""} onClick={() => { setCur(k); setOpen({}); }}>{x.l} · {x.items.length}</button>)}</div>
      {g.items.map((m, i) => (
        <div key={m.id} className="ml13-row" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}>
          <span className="ml-dim">{i + 1}</span>
          <div><Q m={m} /></div>
          <b className={open[m.id] ? "" : "is-cov"}>{m.a}</b>
        </div>
      ))}
    </div>
  );
}

// ─── 14 · Timeline ───
const YEAR = /\b(5\d\d|6\d\d|7\d\d|8\d\d|9\d\d|1[0-8]\d\d)\b(?!\s*(?:km|kg|%))/;
function Timeline({ ms }) {
  const list = useMemo(() => ms.map((m) => {
    const y = YEAR.exec(plain(m.q)) || YEAR.exec(plain(m.a));
    return y ? { m, y: Number(y[1]) } : null;
  }).filter(Boolean).sort((a, b) => a.y - b.y), [ms]);
  const [open, setOpen] = useState({});
  if (!list.length) return <Empty>Sawaalon mein saal nahi mile.</Empty>;
  return (
    <div className="ml14">
      <p className="ml-dim">{list.length} sawaal jisme saal hai — purane se naye.</p>
      {list.map(({ m, y }) => (
        <div key={m.id} className="ml14-it" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}>
          <span className="ml14-y">{y}</span>
          <div className="ml14-c"><Q m={m} /><b className={open[m.id] ? "" : "is-cov"}>{m.a}</b></div>
        </div>
      ))}
    </div>
  );
}

// ─── 15 · Galat hatao ───
function Eliminate({ ms }) {
  const Qu = useQueue(ms);
  const m = Qu.cur;
  const opts = useMemo(() => (m ? shuffle([m.a, ...wrongsOf(m, ms)]) : []), [m, ms]);
  const [gone, setGone] = useState({});
  const [oops, setOops] = useState(false);
  if (!m) return <Done {...Qu} />;
  const wrongLeft = opts.filter((o) => norm(o) !== norm(m.a) && !gone[o]).length;
  const tap = (o) => {
    if (gone[o]) return;
    if (norm(o) === norm(m.a)) { setOops(true); return; }
    setGone((g) => ({ ...g, [o]: true }));
  };
  const next = () => { Qu.rate(!oops); setGone({}); setOops(false); };
  return (
    <div className="ml15">
      <Score {...Qu.s} extra={`${Qu.left} bache`} />
      <div className="ml-q"><Q m={m} /></div>
      <p className="ml-dim">Teeno <b>galat</b> option dabao — sahi wala bach jaye.</p>
      <div className="ml3-opts">
        {opts.map((o, k) => {
          const isA = norm(o) === norm(m.a);
          const st = gone[o] ? " is-gone" : (oops && isA) ? " is-n" : (!wrongLeft && isA) ? " is-y" : "";
          return <button key={k} type="button" className={st} onClick={() => tap(o)}><b>{String.fromCharCode(65 + k)}</b>{o}</button>;
        })}
      </div>
      {oops ? <p className="ml15-oops">Arre, ye to sahi jawab tha!</p> : null}
      {(!wrongLeft || oops) ? <button type="button" className="ml-big" onClick={next}>Agla →</button> : null}
    </div>
  );
}

// ─── 16 · Ek line padho ───
function Lines({ ms }) {
  const [n, setN] = useState(50);
  return (
    <div className="ml16">
      <ol>{ms.slice(0, n).map((m) => <li key={m.id}><Q m={m} /> <span>→</span> <b>{m.a}</b></li>)}</ol>
      {n < ms.length && <button type="button" className="ml-big" onClick={() => setN(n + 50)}>Aur 50 ({ms.length - n} bache)</button>}
    </div>
  );
}

// ─── 17 · Memory tiles ───
function Tiles({ ms }) {
  const make = () => shuffle(shuffle(ms).slice(0, 6).flatMap((m) => [{ k: `${m.id}q`, id: m.id, t: plain(m.q).slice(0, 90), q: true }, { k: `${m.id}a`, id: m.id, t: m.a }]));
  const [tiles, setTiles] = useState(make);
  const [up, setUp] = useState([]);
  const [got, setGot] = useState({});
  const [tries, setTries] = useState(0);
  const flip = (t) => {
    if (got[t.id] || up.includes(t.k) || up.length === 2) return;
    const nu = [...up, t.k];
    setUp(nu);
    if (nu.length === 2) {
      setTries((x) => x + 1);
      const [a, b] = nu.map((k) => tiles.find((x) => x.k === k));
      setTimeout(() => { if (a.id === b.id) setGot((g) => ({ ...g, [a.id]: true })); setUp([]); }, a.id === b.id ? 300 : 1100);
    }
  };
  const done = Object.keys(got).length === tiles.length / 2;
  return (
    <div className="ml17">
      <div className="ml-score">Koshish {tries} · Jodi {Object.keys(got).length} / {tiles.length / 2}</div>
      <div className="ml17-grid">
        {tiles.map((t) => {
          const on = up.includes(t.k) || got[t.id];
          return <button key={t.k} type="button" className={`ml17-t${on ? " is-on" : ""}${got[t.id] ? " is-got" : ""}${t.q ? " is-q" : " is-a"}`} onClick={() => flip(t)}>{on ? t.t : (t.q ? "❓" : "✅")}</button>;
        })}
      </div>
      {done && <button type="button" className="ml-big" onClick={() => { setTiles(make()); setGot({}); setTries(0); }}>Naya khel</button>}
    </div>
  );
}

// ─── 18 · Suno ───
function Listen({ ms }) {
  const [order] = useState(() => shuffle(ms));
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);
  const [phase, setPhase] = useState(0);
  const ok = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (!ok || !play) { if (ok) window.speechSynthesis.cancel(); return undefined; }
    let alive = true;
    const m = order[i];
    const say = (t, then) => { const u = new SpeechSynthesisUtterance(t); u.lang = "en-IN"; u.onend = () => alive && then(); window.speechSynthesis.speak(u); };
    setPhase(0);
    say(plain(m.q), () => setTimeout(() => { if (!alive) return; setPhase(1); say(plain(m.a), () => setTimeout(() => alive && setI((k) => (k + 1) % order.length), 1500)); }, 3000));
    return () => { alive = false; window.speechSynthesis.cancel(); };
  }, [i, play, ok, order]);
  if (!ok) return <Empty>Is browser mein bolne wali awaaz nahi hai.</Empty>;
  const m = order[i];
  return (
    <div className="ml18">
      <div className="ml-q"><Q m={m} /></div>
      <h2 className={phase ? "" : "is-hid"}>{phase ? m.a : "3 second mein khud bolo…"}</h2>
      <div className="ml-row">
        <button type="button" onClick={() => setI((i - 1 + order.length) % order.length)}>⏮</button>
        <button type="button" className="ml-big" onClick={() => setPlay(!play)}>{play ? "⏸ Roko" : "▶ Suno"}</button>
        <button type="button" onClick={() => setI((i + 1) % order.length)}>⏭</button>
      </div>
      <p className="ml-dim">Sawaal bolega → 3 second ruk kar jawab. {i + 1} / {order.length}</p>
    </div>
  );
}

// ─── 19 · 7 ka jhund ───
function Chunk({ ms }) {
  const order = useMemo(() => shuffle(ms), [ms]);
  const [ci, setCi] = useState(0);
  const [phase, setPhase] = useState("read");
  const [ti, setTi] = useState(0);
  const [f, setF] = useState(false);
  const [res, setRes] = useState({});
  const set = order.slice(ci * 7, ci * 7 + 7);
  const total = Math.ceil(order.length / 7);
  if (!set.length) return <Empty>Saare jhund ho gaye 🎉</Empty>;
  if (phase === "read") {
    return (
      <div className="ml19">
        <div className="ml-score">Jhund {ci + 1} / {total} — pehle dhyan se padho</div>
        <ol className="ml16-ol">{set.map((m) => <li key={m.id}><Q m={m} /> <span>→</span> <b>{m.a}</b></li>)}</ol>
        <button type="button" className="ml-big" onClick={() => { setPhase("test"); setTi(0); setRes({}); }}>Padh liya → Test</button>
      </div>
    );
  }
  const m = set[ti];
  if (!m) {
    const y = set.filter((x) => res[x.id]).length;
    return (
      <div className="ml-done"><b>Jhund {ci + 1}: {y} / {set.length}</b>
        <div className="ml-row">
          <button type="button" onClick={() => setPhase("read")}>↺ Phir padho</button>
          <button type="button" className="ml-big" onClick={() => { setCi(ci + 1); setPhase("read"); }}>Agla jhund →</button>
        </div>
      </div>
    );
  }
  return (
    <div className="ml19">
      <div className="ml-score">Jhund {ci + 1} · test {ti + 1} / {set.length}</div>
      <div className="ml-q"><Q m={m} /></div>
      {f ? <><h2 className="ml19-a">{m.a}</h2><Rate onRate={(ok) => { mark(m.id, ok); setRes((r) => ({ ...r, [m.id]: ok })); setF(false); setTi(ti + 1); }} /></> : <button type="button" className="ml-big" onClick={() => setF(true)}>👁️ Jawab</button>}
    </div>
  );
}

// ─── 20 · Survival ───
function Survival({ ms }) {
  const [order, setOrder] = useState(() => shuffle(ms));
  const [i, setI] = useState(0);
  const [lives, setLives] = useState(3);
  const [pick, setPick] = useState(null);
  const best = useRef(readJ("cgl.medbest", 0));
  const m = order[i];
  const opts = useMemo(() => (m ? shuffle([m.a, ...wrongsOf(m, ms)]) : []), [m, ms]);
  if (lives <= 0 || !m) {
    if (i > best.current) { best.current = i; writeJ("cgl.medbest", i); }
    return <div className="ml-done"><b>{lives <= 0 ? "💔 Khel khatam" : "🏆 Sab sahi!"}</b><p>{i} sawaal tak · sabse accha {best.current}</p><button type="button" className="ml-big" onClick={() => { setOrder(shuffle(ms)); setI(0); setLives(3); setPick(null); }}>Phir se</button></div>;
  }
  return (
    <div className="ml3">
      <div className="ml20-top"><span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span><span>🔥 {i}</span></div>
      <div className="ml-q"><Q m={m} /></div>
      <div className="ml3-opts">
        {opts.map((o, k) => {
          const st = pick ? (norm(o) === norm(m.a) ? " is-y" : o === pick ? " is-n" : " is-dim") : "";
          return <button key={k} type="button" className={st} onClick={() => { if (pick) return; setPick(o); const ok = norm(o) === norm(m.a); mark(m.id, ok); if (!ok) setLives((l) => l - 1); }}><b>{String.fromCharCode(65 + k)}</b>{o}</button>;
        })}
      </div>
      {pick ? <button type="button" className="ml-big" onClick={() => { setPick(null); setI(i + 1); }}>Agla →</button> : null}
    </div>
  );
}

const COMP = { 1: Flash, 2: Reel, 3: Mcq, 4: Reverse, 5: TypeIt, 6: Hint, 7: Match, 8: TrueFalse, 9: Speed, 10: Leitner, 11: Test10, 12: Diary, 13: Groups, 14: Timeline, 15: Eliminate, 16: Lines, 17: Tiles, 18: Listen, 19: Chunk, 20: Survival };

// Bank ke sawaal → { id, no, raw (asli sawaal), q, a, opts, ai } — sirf jinka jawab pata hai.
export function toMs(qs) {
  return qs.map((q, i) => {
    const n = q.answer === "" || q.answer == null ? NaN : Number(q.answer);
    const ai = Number.isInteger(n) && Array.isArray(q.options) && q.options[n] != null ? n : -1;
    const a = ai >= 0 && Array.isArray(q.options) ? plain(q.options[ai]) : plain(q.answerText || "");
    // no = bank mein asli number (1 se) — chhante ke baad bhi wahi rehta hai.
    return { id: String(q._uid ?? q.id ?? i), no: i + 1, raw: q, q: q.question, a, opts: Array.isArray(q.options) ? q.options.map(plain) : [], ai };
  }).filter((m) => m.q && m.a);
}

export default function MedLayouts({ lay, qs }) {
  const ms = useMemo(() => toMs(qs), [qs]);
  const C = COMP[lay];
  if (!C) return null;
  if (!ms.length) return <Empty>Jawab wale sawaal nahi mile.</Empty>;
  return <div className={`ml ml--${lay}`}><C key={lay} ms={ms} /></div>;
}
